from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from threading import Lock
from typing import Any, Callable

import lime.lime_tabular
import matplotlib

matplotlib.use('Agg', force=True)
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap
from joblib import load
from sklearn.preprocessing import LabelEncoder

from backend.ml.features import DEFAULT_SYMBOLS
from backend.ml.datasets import DATE_COLUMN, SYMBOL_COLUMN, TARGET_COLUMN, load_final_datasets
from backend.ml.pipeline import TRAINED_MODELS_DIR

PROJECT_ROOT = Path(__file__).resolve().parents[1]
TRAINED_EXPLANATIONS_DIR = TRAINED_MODELS_DIR / 'explanations'
SHAP_EXPLANATIONS_DIR = TRAINED_EXPLANATIONS_DIR / 'shap'
LIME_EXPLANATIONS_DIR = TRAINED_EXPLANATIONS_DIR / 'lime'
EXPLANATION_GENERATION_LOCK = Lock()


def _serialized_generation(function: Callable[..., dict[str, Any]]) -> Callable[..., dict[str, Any]]:
    """Prevent concurrent SHAP/LIME plotting from corrupting Matplotlib state."""
    def wrapped(*args: Any, **kwargs: Any) -> dict[str, Any]:
        with EXPLANATION_GENERATION_LOCK:
            return function(*args, **kwargs)

    return wrapped


@dataclass(slots=True)
class PreparedExplanationData:
    features: pd.DataFrame
    target: pd.Series
    feature_names: list[str]
    target_encoder: LabelEncoder
    context_frame: pd.DataFrame


def _ensure_training_datasets() -> pd.DataFrame:
    return load_final_datasets(DEFAULT_SYMBOLS)


def _normalise_symbol(symbol: str | None) -> str | None:
    if symbol is None:
        return None
    value = symbol.upper().strip()
    if not value:
        return None
    if value not in DEFAULT_SYMBOLS:
        raise ValueError(f'Unknown symbol {symbol!r}. Expected one of: {", ".join(DEFAULT_SYMBOLS)}')
    return value


def _resolve_best_model_path() -> tuple[str, Path]:
    comparison_path = TRAINED_MODELS_DIR / 'model_comparison.csv'
    if comparison_path.exists():
        comparison_table = pd.read_csv(comparison_path)
        if not comparison_table.empty and 'model' in comparison_table.columns:
            best_model_name = str(comparison_table.sort_values(by='f1_score', ascending=False).iloc[0]['model'])
            best_model_slug = best_model_name.lower().replace(' ', '_')
            for candidate in (
                TRAINED_MODELS_DIR / f'{best_model_slug}_best.joblib',
                TRAINED_MODELS_DIR / f'{best_model_slug}.joblib',
            ):
                if candidate.exists():
                    return best_model_name, candidate

    best_model_candidates = sorted(TRAINED_MODELS_DIR.glob('*_best.joblib'))
    if best_model_candidates:
        best_path = best_model_candidates[0]
        return best_path.stem.replace('_best', '').replace('_', ' ').title(), best_path

    fallback_candidates = sorted(TRAINED_MODELS_DIR.glob('*.joblib'))
    if fallback_candidates:
        best_path = fallback_candidates[0]
        return best_path.stem.replace('_', ' ').title(), best_path

    raise FileNotFoundError(f'No trained model was found in {TRAINED_MODELS_DIR}')


@lru_cache(maxsize=1)
def load_best_model() -> tuple[str, Any, Path]:
    model_name, model_path = _resolve_best_model_path()
    estimator = load(model_path)
    return model_name, estimator, model_path


def _prepare_explanation_data(data_frame: pd.DataFrame) -> PreparedExplanationData:
    working_frame = data_frame.copy()
    context_columns = [column for column in (DATE_COLUMN, SYMBOL_COLUMN, TARGET_COLUMN) if column in working_frame.columns]
    context_frame = working_frame[context_columns].copy() if context_columns else pd.DataFrame(index=working_frame.index)

    if DATE_COLUMN in working_frame.columns:
        working_frame = working_frame.drop(columns=[DATE_COLUMN])

    if TARGET_COLUMN not in working_frame.columns:
        raise ValueError('TARGET column is required for explainability.')

    if SYMBOL_COLUMN not in working_frame.columns:
        raise ValueError('SYMBOL column is required for explainability.')

    symbol_series = pd.Series(
        pd.Categorical(working_frame[SYMBOL_COLUMN].astype(str).str.upper(), categories=DEFAULT_SYMBOLS),
        index=working_frame.index,
        name=SYMBOL_COLUMN,
    )
    symbol_dummies = pd.get_dummies(symbol_series, prefix='SYMBOL', drop_first=False)
    working_frame = working_frame.drop(columns=[SYMBOL_COLUMN])
    working_frame = pd.concat([working_frame, symbol_dummies], axis=1)
    working_frame = working_frame.replace([np.inf, -np.inf], np.nan).dropna()

    context_frame = context_frame.loc[working_frame.index].reset_index(drop=True)
    working_frame = working_frame.reset_index(drop=True)

    target_encoder = LabelEncoder()
    target = pd.Series(target_encoder.fit_transform(working_frame[TARGET_COLUMN]), name=TARGET_COLUMN)
    feature_frame = working_frame.drop(columns=[TARGET_COLUMN])
    numeric_features = feature_frame.select_dtypes(include=[np.number]).copy().astype(float)
    feature_names = numeric_features.columns.tolist()

    return PreparedExplanationData(
        features=numeric_features,
        target=target,
        feature_names=feature_names,
        target_encoder=target_encoder,
        context_frame=context_frame,
    )


def _select_frame_for_symbol(data_frame: pd.DataFrame, symbol: str | None) -> pd.DataFrame:
    normalised_symbol = _normalise_symbol(symbol)
    if normalised_symbol is None:
        return data_frame.reset_index(drop=True)

    filtered = data_frame[data_frame[SYMBOL_COLUMN].astype(str).str.upper() == normalised_symbol].copy()
    if filtered.empty:
        raise ValueError(f'No explanation rows were found for symbol {normalised_symbol}.')
    return filtered.reset_index(drop=True)


def _build_prediction_function(model: Any, feature_names: list[str]) -> Callable[[np.ndarray | pd.DataFrame], np.ndarray]:
    def predict(samples: np.ndarray | pd.DataFrame) -> np.ndarray:
        if isinstance(samples, pd.DataFrame):
            feature_frame = samples[feature_names]
        else:
            feature_frame = pd.DataFrame(np.asarray(samples), columns=feature_names)
        if hasattr(model, 'predict_proba'):
            return model.predict_proba(feature_frame)
        predictions = model.predict(feature_frame)
        return np.asarray(predictions)

    return predict


def _make_explanation(values: np.ndarray, base_values: np.ndarray | float, data: np.ndarray, feature_names: list[str]) -> shap.Explanation:
    return shap.Explanation(
        values=values,
        base_values=base_values,
        data=data,
        feature_names=feature_names,
    )


def _select_class_explanation(explanation: shap.Explanation, class_index: int) -> shap.Explanation:
    values = np.asarray(explanation.values)
    base_values = np.asarray(explanation.base_values)
    data = np.asarray(explanation.data)

    if values.ndim == 3:
        values = values[:, :, class_index]
        if base_values.ndim == 2:
            base_values = base_values[:, class_index]
        elif base_values.ndim == 1 and base_values.shape[0] > 1:
            base_values = base_values[class_index]

    return _make_explanation(values=values, base_values=base_values, data=data, feature_names=list(explanation.feature_names))


def _select_row_explanation(explanation: shap.Explanation, row_index: int) -> shap.Explanation:
    values = np.asarray(explanation.values)
    base_values = np.asarray(explanation.base_values)
    data = np.asarray(explanation.data)

    if values.ndim == 1:
        row_values = values
    else:
        row_values = values[row_index]

    if data.ndim == 1:
        row_data = data
    else:
        row_data = data[row_index]

    if base_values.ndim == 0:
        row_base_values: float | np.ndarray = float(base_values)
    elif base_values.ndim == 1:
        row_base_values = float(base_values[row_index]) if base_values.shape[0] > row_index else float(base_values[0])
    else:
        row_base_values = base_values[row_index]

    return _make_explanation(
        values=row_values,
        base_values=row_base_values,
        data=row_data,
        feature_names=list(explanation.feature_names),
    )


def _normalise_row_index(length: int, sample_index: int) -> int:
    if length <= 0:
        raise ValueError('No rows are available for explanation.')
    index = sample_index if sample_index >= 0 else length + sample_index
    if index < 0 or index >= length:
        raise ValueError(f'sample_index {sample_index} is out of range for {length} rows.')
    return index


def _create_output_dir(base_dir: Path, symbol: str | None) -> Path:
    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    symbol_label = (symbol or 'all').lower()
    output_dir = base_dir / symbol_label / timestamp
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


def _save_current_figure(file_path: Path) -> Path:
    file_path.parent.mkdir(parents=True, exist_ok=True)
    figure = plt.gcf()
    figure.savefig(file_path, bbox_inches='tight', dpi=150)
    plt.close(figure)
    return file_path


def _create_contribution_figure(labels: list[str], values: list[float], title: str, file_path: Path) -> Path:
    file_path.parent.mkdir(parents=True, exist_ok=True)
    fig, ax = plt.subplots(figsize=(10, max(4, len(labels) * 0.35)))
    ordered = sorted(zip(labels, values), key=lambda item: abs(item[1]))
    ordered_labels = [label for label, _ in ordered]
    ordered_values = [value for _, value in ordered]
    colors = ['#16a34a' if value >= 0 else '#dc2626' for value in ordered_values]
    ax.barh(ordered_labels, ordered_values, color=colors)
    ax.axvline(0, color='#0f172a', linewidth=0.8)
    ax.set_title(title)
    ax.set_xlabel('Contribution')
    ax.grid(axis='x', alpha=0.2)
    fig.tight_layout()
    fig.savefig(file_path, bbox_inches='tight', dpi=150)
    plt.close(fig)
    return file_path


def _format_context_row(context_frame: pd.DataFrame, row_index: int) -> dict[str, Any]:
    if context_frame.empty:
        return {}
    row = context_frame.iloc[row_index].to_dict()
    formatted: dict[str, Any] = {}
    for key, value in row.items():
        if isinstance(value, (pd.Timestamp, datetime)):
            formatted[key] = value.isoformat()
        elif isinstance(value, np.generic):
            formatted[key] = value.item()
        elif pd.isna(value):
            formatted[key] = None
        else:
            formatted[key] = value
    return formatted


def _build_sample_frame(features: pd.DataFrame, sample_size: int) -> pd.DataFrame:
    if sample_size <= 0:
        raise ValueError('sample_size must be greater than zero.')
    if len(features) <= sample_size:
        return features.copy()
    return features.sample(n=sample_size, random_state=42).sort_index()


def _build_shap_plot_path(output_dir: Path, name: str) -> Path:
    return output_dir / f'{name}.png'


def _compute_global_shap_summary(
    model: Any,
    explanation_frame: pd.DataFrame,
    feature_names: list[str],
    class_index: int,
    sample_size: int,
    max_display: int,
    output_dir: Path,
) -> dict[str, Path | list[dict[str, Any]] | shap.Explanation]:
    background_frame = _build_sample_frame(explanation_frame, min(sample_size, len(explanation_frame)))
    try:
        # XGBoost has an exact, optimized tree explainer. The generic callable
        # explainer scales poorly with 53 market features and made the UI appear
        # stuck while thousands of model evaluations were performed.
        explainer = shap.TreeExplainer(model)
        explanation = explainer(background_frame)
    except Exception:
        prediction_fn = _build_prediction_function(model, feature_names)
        explainer = shap.Explainer(prediction_fn, background_frame, feature_names=feature_names)
        explanation = explainer(background_frame)
    class_explanation = _select_class_explanation(explanation, class_index)

    shap_values = np.asarray(class_explanation.values)
    top_feature_scores = np.abs(shap_values).mean(axis=0)
    top_indices = np.argsort(top_feature_scores)[::-1][:max_display]
    top_features = [
        {
            'feature': feature_names[index],
            'mean_abs_contribution': float(top_feature_scores[index]),
        }
        for index in top_indices
    ]

    plt.close('all')
    shap.plots.beeswarm(class_explanation, max_display=max_display, show=False)
    summary_path = _save_current_figure(_build_shap_plot_path(output_dir, 'summary_plot'))

    plt.close('all')
    shap.plots.bar(class_explanation, max_display=max_display, show=False)
    bar_path = _save_current_figure(_build_shap_plot_path(output_dir, 'bar_plot'))

    dependence_feature = feature_names[int(top_indices[0])]
    plt.close('all')
    shap.dependence_plot(
        dependence_feature,
        shap_values,
        np.asarray(background_frame),
        feature_names=feature_names,
        show=False,
    )
    dependence_path = _save_current_figure(_build_shap_plot_path(output_dir, 'dependence_plot'))

    decision_rows = min(len(background_frame), 25)
    decision_values = shap_values[:decision_rows]
    decision_data = np.asarray(class_explanation.data)[:decision_rows]
    decision_base_value = float(np.asarray(class_explanation.base_values).reshape(-1)[0])
    plt.close('all')
    shap.decision_plot(
        decision_base_value,
        decision_values,
        decision_data,
        feature_names=feature_names,
        show=False,
    )
    decision_path = _save_current_figure(_build_shap_plot_path(output_dir, 'decision_plot'))

    return {
        'summary_plot': summary_path,
        'bar_plot': bar_path,
        'dependence_plot': dependence_path,
        'decision_plot': decision_path,
        'top_features': top_features,
        'dependence_feature': dependence_feature,
        'class_explanation': class_explanation,
    }


def _compute_local_shap_plots(
    model: Any,
    explanation_frame: pd.DataFrame,
    feature_names: list[str],
    class_index: int,
    row_index: int,
    output_dir: Path,
) -> dict[str, Any]:
    background_frame = _build_sample_frame(explanation_frame, min(50, len(explanation_frame)))
    try:
        explainer = shap.TreeExplainer(model)
        explanation = explainer(explanation_frame.iloc[[row_index]])
    except Exception:
        prediction_fn = _build_prediction_function(model, feature_names)
        explainer = shap.Explainer(prediction_fn, background_frame, feature_names=feature_names)
        explanation = explainer(explanation_frame.iloc[[row_index]])
    class_explanation = _select_class_explanation(explanation, class_index)
    local_explanation = _select_row_explanation(class_explanation, 0)

    plt.close('all')
    shap.plots.waterfall(local_explanation, show=False)
    waterfall_path = _save_current_figure(_build_shap_plot_path(output_dir, 'waterfall_plot'))

    plt.close('all')
    try:
        shap.force_plot(
            float(np.asarray(local_explanation.base_values).reshape(-1)[0]),
            np.asarray(local_explanation.values),
            np.asarray(local_explanation.data),
            feature_names=feature_names,
            matplotlib=True,
            show=False,
        )
        force_path = _save_current_figure(_build_shap_plot_path(output_dir, 'force_plot'))
    except Exception:
        force_path = _create_contribution_figure(
            labels=feature_names,
            values=np.asarray(local_explanation.values).astype(float).tolist(),
            title='Force Plot',
            file_path=_build_shap_plot_path(output_dir, 'force_plot'),
        )

    shap_values = np.asarray(local_explanation.values).astype(float)
    ranked_indices = np.argsort(np.abs(shap_values))[::-1]
    local_top_features = [
        {
            'feature': feature_names[index],
            'shap_value': float(shap_values[index]),
        }
        for index in ranked_indices[: min(len(feature_names), 10)]
    ]

    return {
        'waterfall_plot': waterfall_path,
        'force_plot': force_path,
        'local_top_features': local_top_features,
        'local_explanation': local_explanation,
    }


@_serialized_generation
def generate_shap_explanation(
    symbol: str | None = None,
    sample_index: int = -1,
    sample_size: int = 200,
    max_display: int = 15,
) -> dict[str, Any]:
    model_name, model, model_path = load_best_model()
    source_frame = _select_frame_for_symbol(_ensure_training_datasets(), symbol)
    prepared = _prepare_explanation_data(source_frame)
    row_index = _normalise_row_index(len(prepared.features), sample_index)

    sample_frame = _build_sample_frame(prepared.features, min(sample_size, len(prepared.features)))
    prediction_fn = _build_prediction_function(model, prepared.feature_names)
    predicted_proba = prediction_fn(prepared.features.iloc[[row_index]])
    predicted_class_index = int(np.argmax(predicted_proba[0]))
    predicted_label = prepared.target_encoder.inverse_transform([predicted_class_index])[0]

    output_dir = _create_output_dir(SHAP_EXPLANATIONS_DIR, symbol)
    global_artifacts = _compute_global_shap_summary(
        model=model,
        explanation_frame=sample_frame,
        feature_names=prepared.feature_names,
        class_index=predicted_class_index,
        sample_size=sample_size,
        max_display=max_display,
        output_dir=output_dir,
    )
    local_artifacts = _compute_local_shap_plots(
        model=model,
        explanation_frame=prepared.features,
        feature_names=prepared.feature_names,
        class_index=predicted_class_index,
        row_index=row_index,
        output_dir=output_dir,
    )

    local_explanation = local_artifacts['local_explanation']
    local_values = np.asarray(local_explanation.values).astype(float)
    ranked_indices = np.argsort(np.abs(local_values))[::-1]
    top_shap_features = [
        {
            'feature': prepared.feature_names[index],
            'shap_value': float(local_values[index]),
        }
        for index in ranked_indices[: min(len(prepared.feature_names), 10)]
    ]

    local_context = _format_context_row(prepared.context_frame, row_index)
    explanation_paths = {
        'summary_plot': global_artifacts['summary_plot'],
        'bar_plot': global_artifacts['bar_plot'],
        'waterfall_plot': local_artifacts['waterfall_plot'],
        'force_plot': local_artifacts['force_plot'],
        'dependence_plot': global_artifacts['dependence_plot'],
        'decision_plot': global_artifacts['decision_plot'],
    }

    return {
        'model_name': model_name,
        'model_path': _relative_path(model_path),
        'symbol': _normalise_symbol(symbol) or 'ALL',
        'sample_index': row_index,
        'predicted_label': predicted_label,
        'predicted_class_index': predicted_class_index,
        'predicted_probability': float(predicted_proba[0][predicted_class_index]),
        'context': local_context,
        'top_features': top_shap_features,
        'plot_paths': {name: _relative_path(path) for name, path in explanation_paths.items()},
        'output_directory': _relative_path(output_dir),
    }


def _predict_fn_for_lime(model: Any, feature_names: list[str]) -> Callable[[np.ndarray], np.ndarray]:
    return _build_prediction_function(model, feature_names)


@_serialized_generation
def generate_lime_explanation(
    symbol: str | None = None,
    sample_index: int = -1,
    num_features: int = 10,
) -> dict[str, Any]:
    model_name, model, model_path = load_best_model()
    source_frame = _select_frame_for_symbol(_ensure_training_datasets(), symbol)
    prepared = _prepare_explanation_data(source_frame)
    row_index = _normalise_row_index(len(prepared.features), sample_index)

    prediction_fn = _predict_fn_for_lime(model, prepared.feature_names)
    training_data = prepared.features.to_numpy(dtype=float)
    background_size = min(200, len(training_data))
    background = training_data if background_size == len(training_data) else training_data[-background_size:]

    explainer = lime.lime_tabular.LimeTabularExplainer(
        training_data=background,
        feature_names=prepared.feature_names,
        class_names=list(prepared.target_encoder.classes_),
        mode='classification',
        discretize_continuous=True,
        random_state=42,
    )

    row = prepared.features.iloc[row_index].to_numpy(dtype=float)
    probabilities = prediction_fn(prepared.features.iloc[[row_index]])[0]
    predicted_class_index = int(np.argmax(probabilities))
    predicted_label = prepared.target_encoder.inverse_transform([predicted_class_index])[0]

    explanation = explainer.explain_instance(
        data_row=row,
        predict_fn=prediction_fn,
        num_features=min(num_features, len(prepared.feature_names)),
        top_labels=1,
        num_samples=800,
    )

    explanation_pairs = explanation.as_list(label=predicted_class_index)
    positive_features = [
        {'feature': feature, 'weight': float(weight)}
        for feature, weight in explanation_pairs
        if weight >= 0
    ]
    negative_features = [
        {'feature': feature, 'weight': float(weight)}
        for feature, weight in explanation_pairs
        if weight < 0
    ]
    ranked_pairs = sorted(explanation_pairs, key=lambda item: abs(item[1]), reverse=True)

    output_dir = _create_output_dir(LIME_EXPLANATIONS_DIR, symbol)
    contribution_graph_path = output_dir / 'contribution_graph.png'
    try:
        plt.close('all')
        figure = explanation.as_pyplot_figure(label=predicted_class_index)
        if figure is None:
            raise RuntimeError('lime explanation did not return a matplotlib figure')
        figure.savefig(contribution_graph_path, bbox_inches='tight', dpi=150)
        plt.close(figure)
    except Exception:
        contribution_graph_path = _create_contribution_figure(
            labels=[feature for feature, _ in explanation_pairs],
            values=[float(weight) for _, weight in explanation_pairs],
            title='LIME Contribution Graph',
            file_path=contribution_graph_path,
        )

    local_context = _format_context_row(prepared.context_frame, row_index)

    return {
        'model_name': model_name,
        'model_path': _relative_path(model_path),
        'symbol': _normalise_symbol(symbol) or 'ALL',
        'sample_index': row_index,
        'predicted_label': predicted_label,
        'predicted_class_index': predicted_class_index,
        'predicted_probability': float(probabilities[predicted_class_index]),
        'context': local_context,
        'local_explanation': [
            {'feature': feature, 'weight': float(weight)}
            for feature, weight in ranked_pairs
        ],
        'positive_features': positive_features,
        'negative_features': negative_features,
        'plot_paths': {
            'contribution_graph': _relative_path(contribution_graph_path),
        },
        'output_directory': _relative_path(output_dir),
    }


def _relative_path(path: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(PROJECT_ROOT).as_posix()
    except ValueError:
        return resolved.as_posix()
