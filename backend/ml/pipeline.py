from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from joblib import dump
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    r2_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import TimeSeriesSplit, learning_curve
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, StandardScaler, label_binarize
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier

from backend.ml.features import DEFAULT_SYMBOLS, FINAL_DIR, FeatureEngineeringArtifacts, engineer_features_for_all_symbols

PROJECT_ROOT = Path(__file__).resolve().parents[1]
TRAINED_MODELS_DIR = PROJECT_ROOT / 'trained_models'
TRAINED_FIGURES_DIR = TRAINED_MODELS_DIR / 'figures'
TRAINED_PREDICTIONS_DIR = TRAINED_MODELS_DIR / 'predictions'

TARGET_COLUMN = 'TARGET'
DATE_COLUMN = 'Date'
SYMBOL_COLUMN = 'Symbol'

CLASS_LABELS = ['BUY', 'HOLD', 'SELL']


@dataclass(slots=True)
class ModelResult:
    name: str
    estimator: Any
    metrics: dict[str, float]
    confusion_matrix: np.ndarray
    y_true: np.ndarray
    y_pred: np.ndarray
    y_proba: np.ndarray | None
    feature_names: list[str]


@dataclass(slots=True)
class TrainingArtifacts:
    best_model_name: str
    best_model_path: Path
    comparison_table_path: Path
    comparison_plot_path: Path
    best_confusion_matrix_path: Path
    best_learning_curve_path: Path
    feature_importance_path: Path
    model_paths: dict[str, Path]
    confusion_matrix_paths: dict[str, Path]
    learning_curve_paths: dict[str, Path]
    feature_importance_paths: dict[str, Path]
    row_count: int


SLOW_MODELS = frozenset({'Support Vector Machine', 'Logistic Regression'})
VIZ_MAX_ROWS = 2500


def _model_slug(model_name: str) -> str:
    return model_name.lower().replace(' ', '_')


def _subsample_for_visualization(
    features: pd.DataFrame,
    target: pd.Series,
    max_rows: int = VIZ_MAX_ROWS,
) -> tuple[pd.DataFrame, pd.Series]:
    if len(features) <= max_rows:
        return features, target
    return (
        features.iloc[-max_rows:].copy().reset_index(drop=True),
        target.iloc[-max_rows:].copy().reset_index(drop=True),
    )


def build_training_directories() -> None:
    TRAINED_MODELS_DIR.mkdir(parents=True, exist_ok=True)
    TRAINED_FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    TRAINED_PREDICTIONS_DIR.mkdir(parents=True, exist_ok=True)


def load_final_datasets(symbols: Iterable[str] = DEFAULT_SYMBOLS) -> pd.DataFrame:
    frames: list[pd.DataFrame] = []
    for symbol in symbols:
        file_path = FINAL_DIR / f'{symbol}_final.csv'
        if not file_path.exists():
            raise FileNotFoundError(f'Final engineered dataset not found for {symbol}: {file_path}')
        frame = pd.read_csv(file_path)
        frame[SYMBOL_COLUMN] = frame.get(SYMBOL_COLUMN, symbol)
        frames.append(frame)

    combined = pd.concat(frames, ignore_index=True)
    if DATE_COLUMN in combined.columns:
        combined[DATE_COLUMN] = pd.to_datetime(combined[DATE_COLUMN], errors='coerce')
        combined = combined.dropna(subset=[DATE_COLUMN]).sort_values([DATE_COLUMN, SYMBOL_COLUMN]).reset_index(drop=True)
    return combined


def prepare_feature_matrix(data_frame: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series, pd.Series, LabelEncoder]:
    working_frame = data_frame.copy()
    if DATE_COLUMN in working_frame.columns:
        working_frame = working_frame.drop(columns=[DATE_COLUMN])

    if TARGET_COLUMN not in working_frame.columns:
        raise ValueError('TARGET column is required for model training.')

    symbol_dummies = pd.get_dummies(working_frame[SYMBOL_COLUMN], prefix='SYMBOL', drop_first=False)
    working_frame = working_frame.drop(columns=[SYMBOL_COLUMN])
    working_frame = pd.concat([working_frame, symbol_dummies], axis=1)

    working_frame = working_frame.replace([np.inf, -np.inf], np.nan).dropna().reset_index(drop=True)

    target_encoder = LabelEncoder()
    y = target_encoder.fit_transform(working_frame[TARGET_COLUMN])
    feature_frame = working_frame.drop(columns=[TARGET_COLUMN])

    numeric_features = feature_frame.select_dtypes(include=[np.number]).copy()
    feature_names = numeric_features.columns.tolist()
    return numeric_features, pd.Series(y, name=TARGET_COLUMN), pd.Series(feature_names, name='feature_names'), target_encoder


def split_time_series(
    features: pd.DataFrame,
    target: pd.Series,
    test_size: float = 0.2,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
    if not 0 < test_size < 1:
        raise ValueError('test_size must be between 0 and 1.')

    split_index = max(int(len(features) * (1 - test_size)), 1)
    if split_index >= len(features):
        split_index = len(features) - 1

    X_train = features.iloc[:split_index].copy().reset_index(drop=True)
    X_test = features.iloc[split_index:].copy().reset_index(drop=True)
    y_train = target.iloc[:split_index].copy().reset_index(drop=True)
    y_test = target.iloc[split_index:].copy().reset_index(drop=True)

    if X_train.empty or X_test.empty:
        raise ValueError('Unable to create train/test splits for model training.')

    return X_train, X_test, y_train, y_test


def create_models(random_state: int = 42) -> dict[str, Any]:
    return {
        'Logistic Regression': Pipeline(
            steps=[
                ('scaler', StandardScaler()),
                ('model', LogisticRegression(max_iter=2000, random_state=random_state)),
            ]
        ),
        'Random Forest': RandomForestClassifier(
            n_estimators=300,
            max_depth=None,
            random_state=random_state,
            n_jobs=-1,
        ),
        'Decision Tree': DecisionTreeClassifier(random_state=random_state),
        'Support Vector Machine': Pipeline(
            steps=[
                ('scaler', StandardScaler()),
                ('model', SVC(kernel='rbf', probability=True, random_state=random_state)),
            ]
        ),
        'Gradient Boosting': GradientBoostingClassifier(random_state=random_state),
        'XGBoost': XGBClassifier(
            objective='multi:softprob',
            num_class=3,
            n_estimators=300,
            max_depth=5,
            learning_rate=0.05,
            subsample=0.9,
            colsample_bytree=0.9,
            reg_lambda=1.0,
            random_state=random_state,
            eval_metric='mlogloss',
        ),
        'LightGBM': LGBMClassifier(
            objective='multiclass',
            num_class=3,
            n_estimators=300,
            learning_rate=0.05,
            max_depth=-1,
            random_state=random_state,
            verbosity=-1,
        ),
    }


def evaluate_model(
    name: str,
    estimator: Any,
    X_test: pd.DataFrame,
    y_test: pd.Series,
    feature_names: list[str],
) -> ModelResult:
    y_pred = estimator.predict(X_test)
    y_proba = estimator.predict_proba(X_test) if hasattr(estimator, 'predict_proba') else None

    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)
    recall = recall_score(y_test, y_pred, average='weighted', zero_division=0)
    f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)

    roc_auc = np.nan
    if y_proba is not None:
        try:
            classes = np.unique(np.concatenate([y_test.to_numpy(), y_pred]))
            y_test_binarized = label_binarize(y_test, classes=classes)
            roc_auc = roc_auc_score(y_test_binarized, y_proba, average='weighted', multi_class='ovr')
        except ValueError:
            roc_auc = np.nan

    y_test_numeric = y_test.to_numpy(dtype=float)
    y_pred_numeric = y_pred.astype(float)
    mse = mean_squared_error(y_test_numeric, y_pred_numeric)
    rmse = float(np.sqrt(mse))
    mae = mean_absolute_error(y_test_numeric, y_pred_numeric)
    r2 = r2_score(y_test_numeric, y_pred_numeric)

    metrics = {
        'accuracy': float(accuracy),
        'precision': float(precision),
        'recall': float(recall),
        'f1_score': float(f1),
        'roc_auc': float(roc_auc) if not np.isnan(roc_auc) else np.nan,
        'mse': float(mse),
        'rmse': float(rmse),
        'mae': float(mae),
        'r2': float(r2),
    }

    return ModelResult(
        name=name,
        estimator=estimator,
        metrics=metrics,
        confusion_matrix=confusion_matrix(y_test, y_pred),
        y_true=y_test.to_numpy(),
        y_pred=y_pred,
        y_proba=y_proba,
        feature_names=feature_names,
    )


def train_and_compare_models(
    X_train: pd.DataFrame,
    X_test: pd.DataFrame,
    y_train: pd.Series,
    y_test: pd.Series,
    feature_names: list[str],
    random_state: int = 42,
) -> dict[str, ModelResult]:
    results: dict[str, ModelResult] = {}
    models = create_models(random_state=random_state)

    for name, estimator in models.items():
        print(f'Training {name}...')
        estimator.fit(X_train, y_train)
        results[name] = evaluate_model(name, estimator, X_test, y_test, feature_names)
        print(f'  F1={results[name].metrics["f1_score"]:.4f}  Accuracy={results[name].metrics["accuracy"]:.4f}')

    return results


def select_best_model(results: dict[str, ModelResult], metric: str = 'f1_score') -> ModelResult:
    return max(results.values(), key=lambda result: result.metrics.get(metric, float('-inf')))


def save_model(estimator: Any, file_path: Path) -> Path:
    file_path.parent.mkdir(parents=True, exist_ok=True)
    dump(estimator, file_path)
    return file_path


def build_comparison_table(results: dict[str, ModelResult]) -> pd.DataFrame:
    rows = []
    for result in results.values():
        row = {'model': result.name}
        row.update(result.metrics)
        rows.append(row)
    return pd.DataFrame(rows).sort_values(by='f1_score', ascending=False).reset_index(drop=True)


def save_comparison_table(comparison_table: pd.DataFrame) -> Path:
    path = TRAINED_MODELS_DIR / 'model_comparison.csv'
    comparison_table.to_csv(path, index=False)
    return path


def plot_model_comparison(comparison_table: pd.DataFrame) -> Path:
    classification_metrics = ['accuracy', 'precision', 'recall', 'f1_score', 'roc_auc']
    chart_data = comparison_table.set_index('model')[classification_metrics]

    fig, ax = plt.subplots(figsize=(14, 7))
    chart_data.plot(kind='bar', ax=ax, rot=30)
    ax.set_title('Model Comparison — Classification Metrics')
    ax.set_ylabel('Score')
    ax.grid(axis='y', alpha=0.2)
    fig.tight_layout()

    path = TRAINED_FIGURES_DIR / 'model_comparison.png'
    fig.savefig(path, bbox_inches='tight', dpi=150)
    plt.close(fig)
    return path


def plot_regression_metrics_comparison(comparison_table: pd.DataFrame) -> Path:
    regression_metrics = ['mse', 'rmse', 'mae', 'r2']
    chart_data = comparison_table.set_index('model')[regression_metrics]

    fig, axes = plt.subplots(1, 2, figsize=(14, 6))

    error_metrics = ['mse', 'rmse', 'mae']
    chart_data[error_metrics].plot(kind='bar', ax=axes[0], rot=30)
    axes[0].set_title('Error Metrics (lower is better)')
    axes[0].set_ylabel('Value')
    axes[0].grid(axis='y', alpha=0.2)

    chart_data[['r2']].plot(kind='bar', ax=axes[1], rot=30, legend=False, color='#2563eb')
    axes[1].set_title('R² Score (higher is better)')
    axes[1].set_ylabel('R²')
    axes[1].grid(axis='y', alpha=0.2)

    fig.suptitle('Model Comparison — Regression-style Metrics on Encoded Labels')
    fig.tight_layout()

    path = TRAINED_FIGURES_DIR / 'model_comparison_regression_metrics.png'
    fig.savefig(path, bbox_inches='tight', dpi=150)
    plt.close(fig)
    return path


def plot_confusion_matrix_matrix(matrix: np.ndarray, title: str, file_name: str, class_labels: list[str] | None = None) -> Path:
    fig, ax = plt.subplots(figsize=(6, 5))
    image = ax.imshow(matrix, interpolation='nearest', cmap='Blues')
    ax.figure.colorbar(image, ax=ax)
    if class_labels is not None:
        ax.set_xticks(np.arange(len(class_labels)))
        ax.set_yticks(np.arange(len(class_labels)))
        ax.set_xticklabels(class_labels)
        ax.set_yticklabels(class_labels)
    ax.set_xlabel('Predicted')
    ax.set_ylabel('Actual')
    ax.set_title(title)

    threshold = matrix.max() / 2.0 if matrix.size else 0.0
    for row_index in range(matrix.shape[0]):
        for col_index in range(matrix.shape[1]):
            ax.text(
                col_index,
                row_index,
                format(matrix[row_index, col_index], 'd'),
                ha='center',
                va='center',
                color='white' if matrix[row_index, col_index] > threshold else 'black',
            )

    fig.tight_layout()
    path = TRAINED_FIGURES_DIR / file_name
    fig.savefig(path, bbox_inches='tight', dpi=150)
    plt.close(fig)
    return path


def plot_learning_curve_for_estimator(
    estimator: Any,
    X_train: pd.DataFrame,
    y_train: pd.Series,
    model_name: str,
) -> Path:
    curve_features, curve_target = _subsample_for_visualization(X_train, y_train)
    if model_name in SLOW_MODELS:
        curve_features, curve_target = _subsample_for_visualization(curve_features, curve_target, max_rows=1500)

    cv_splits = 3 if model_name in SLOW_MODELS else min(5, max(len(curve_features) // 100, 2))
    cv = TimeSeriesSplit(n_splits=cv_splits)
    train_sizes, train_scores, validation_scores = learning_curve(
        estimator,
        curve_features,
        curve_target,
        cv=cv,
        scoring='f1_weighted',
        n_jobs=1 if model_name in SLOW_MODELS else -1,
        train_sizes=np.linspace(0.2, 1.0, 4),
        shuffle=False,
    )

    train_scores_mean = train_scores.mean(axis=1)
    validation_scores_mean = validation_scores.mean(axis=1)

    fig, ax = plt.subplots(figsize=(8, 5))
    ax.plot(train_sizes, train_scores_mean, marker='o', label='Training score')
    ax.plot(train_sizes, validation_scores_mean, marker='o', label='Cross-validation score')
    ax.set_title(f'Learning Curve: {model_name}')
    ax.set_xlabel('Training examples')
    ax.set_ylabel('F1 Score')
    ax.legend()
    ax.grid(alpha=0.2)
    fig.tight_layout()

    path = TRAINED_FIGURES_DIR / f'{_model_slug(model_name)}_learning_curve.png'
    fig.savefig(path, bbox_inches='tight', dpi=150)
    plt.close(fig)
    return path


def plot_feature_importance(
    estimator: Any,
    X_train: pd.DataFrame,
    y_train: pd.Series,
    model_name: str,
    feature_names: list[str],
) -> Path:
    importances: np.ndarray
    top_features: np.ndarray

    if hasattr(estimator, 'feature_importances_'):
        importances = np.asarray(estimator.feature_importances_)
    elif hasattr(estimator, 'named_steps') and 'model' in estimator.named_steps and hasattr(estimator.named_steps['model'], 'coef_'):
        coef = np.asarray(estimator.named_steps['model'].coef_)
        importances = np.abs(coef).mean(axis=0)
    else:
        importance_features, importance_target = _subsample_for_visualization(X_train, y_train, max_rows=1500)
        permutation = permutation_importance(
            estimator,
            importance_features,
            importance_target,
            n_repeats=3,
            random_state=42,
            scoring='f1_weighted',
            n_jobs=1,
        )
        importances = permutation.importances_mean

    top_indices = np.argsort(importances)[-20:]
    top_features = importances[top_indices]
    names = np.asarray(feature_names)[top_indices]

    fig, ax = plt.subplots(figsize=(10, 7))
    ax.barh(names, top_features, color='#2563eb')
    ax.set_title(f'Feature Importance: {model_name}')
    ax.set_xlabel('Importance')
    ax.grid(axis='x', alpha=0.2)
    fig.tight_layout()

    path = TRAINED_FIGURES_DIR / f'{_model_slug(model_name)}_feature_importance.png'
    fig.savefig(path, bbox_inches='tight', dpi=150)
    plt.close(fig)
    return path


def export_predictions(result: ModelResult, X_test: pd.DataFrame, y_test_encoder: LabelEncoder, model_name: str) -> Path:
    predictions = pd.DataFrame(
        {
            'actual': y_test_encoder.inverse_transform(result.y_true.astype(int)),
            'predicted': y_test_encoder.inverse_transform(result.y_pred.astype(int)),
        }
    )
    path = TRAINED_PREDICTIONS_DIR / f'{_model_slug(model_name)}_predictions.csv'
    predictions.to_csv(path, index=False)
    return path


def run_training_pipeline(symbols: Iterable[str] = DEFAULT_SYMBOLS) -> TrainingArtifacts:
    build_training_directories()

    if not any((FINAL_DIR / f'{symbol}_final.csv').exists() for symbol in symbols):
        engineer_features_for_all_symbols(symbols)

    combined = load_final_datasets(symbols)
    features, target, feature_names_series, target_encoder = prepare_feature_matrix(combined)
    feature_names = feature_names_series.tolist()
    X_train, X_test, y_train, y_test = split_time_series(features, target)

    results = train_and_compare_models(X_train, X_test, y_train, y_test, feature_names)
    comparison_table = build_comparison_table(results)
    comparison_table_path = save_comparison_table(comparison_table)
    comparison_plot_path = plot_model_comparison(comparison_table)

    plot_regression_metrics_comparison(comparison_table)

    best_result = select_best_model(results)
    print(f'\nBest model (by F1): {best_result.name}')

    model_paths: dict[str, Path] = {}
    for result in results.values():
        slug = _model_slug(result.name)
        model_paths[result.name] = save_model(result.estimator, TRAINED_MODELS_DIR / f'{slug}.joblib')
        export_predictions(result, X_test, target_encoder, result.name)

    best_model_path = save_model(
        best_result.estimator,
        TRAINED_MODELS_DIR / f'{_model_slug(best_result.name)}_best.joblib',
    )

    confusion_matrix_paths: dict[str, Path] = {}
    learning_curve_paths: dict[str, Path] = {}
    feature_importance_paths: dict[str, Path] = {}

    for result in results.values():
        slug = _model_slug(result.name)
        print(f'Generating plots for {result.name}...')
        confusion_matrix_paths[result.name] = plot_confusion_matrix_matrix(
            result.confusion_matrix,
            f'Confusion Matrix: {result.name}',
            f'{slug}_confusion_matrix.png',
            class_labels=CLASS_LABELS,
        )
        learning_curve_paths[result.name] = plot_learning_curve_for_estimator(
            result.estimator, X_train, y_train, result.name
        )
        feature_importance_paths[result.name] = plot_feature_importance(
            result.estimator, X_train, y_train, result.name, feature_names
        )

    return TrainingArtifacts(
        best_model_name=best_result.name,
        best_model_path=best_model_path,
        comparison_table_path=comparison_table_path,
        comparison_plot_path=comparison_plot_path,
        best_confusion_matrix_path=confusion_matrix_paths[best_result.name],
        best_learning_curve_path=learning_curve_paths[best_result.name],
        feature_importance_path=feature_importance_paths[best_result.name],
        model_paths=model_paths,
        confusion_matrix_paths=confusion_matrix_paths,
        learning_curve_paths=learning_curve_paths,
        feature_importance_paths=feature_importance_paths,
        row_count=len(combined),
    )


def train_model(*args: Any, **kwargs: Any) -> TrainingArtifacts:
    return run_training_pipeline(*args, **kwargs)


if __name__ == '__main__':
    artifacts = train_model()
    print(f'Trained {len(artifacts.model_paths)} models on {artifacts.row_count} rows.')
    print(f'Best model: {artifacts.best_model_name} -> {artifacts.best_model_path}')
    print(f'Comparison table: {artifacts.comparison_table_path}')
    print(f'Comparison plot: {artifacts.comparison_plot_path}')
