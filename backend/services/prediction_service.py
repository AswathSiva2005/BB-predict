from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from backend.api.schemas import PredictRequest
from backend.ml.features import DEFAULT_SYMBOLS
from backend.ml.pipeline import load_final_datasets, prepare_feature_matrix
from backend.models.history import PredictionHistory
from backend.models.user import User
from backend.services.explanation_service import load_best_model


def _serialize_value(value: Any) -> Any:
    if isinstance(value, (pd.Timestamp, datetime)):
        return value.isoformat()
    if isinstance(value, np.generic):
        return value.item()
    if pd.isna(value):
        return None
    return value


def _serialize_context(row: pd.Series) -> dict[str, Any]:
    return {key: _serialize_value(value) for key, value in row.to_dict().items()}


def _normalize_symbol(symbol: str | None) -> str:
    if symbol is None:
        return DEFAULT_SYMBOLS[0]
    normalized = symbol.upper().strip()
    if normalized not in DEFAULT_SYMBOLS:
        raise ValueError(f'Unknown symbol {symbol!r}. Expected one of: {", ".join(DEFAULT_SYMBOLS)}')
    return normalized


def _select_row_index(length: int, sample_index: int) -> int:
    if length <= 0:
        raise ValueError('No rows are available for prediction.')
    row_index = sample_index if sample_index >= 0 else length + sample_index
    if row_index < 0 or row_index >= length:
        raise ValueError(f'sample_index {sample_index} is out of range for {length} rows.')
    return row_index


def _load_symbol_frame(symbol: str) -> pd.DataFrame:
    combined = load_final_datasets(DEFAULT_SYMBOLS)
    if 'Symbol' not in combined.columns:
        raise ValueError('Symbol column is required for predictions.')
    symbol_frame = combined[combined['Symbol'].astype(str).str.upper() == symbol].copy()
    if symbol_frame.empty:
        raise ValueError(f'No prediction rows were found for symbol {symbol}.')
    return symbol_frame.reset_index(drop=True)


def build_prediction(symbol: str | None = None, sample_index: int = -1) -> dict[str, Any]:
    normalized_symbol = _normalize_symbol(symbol)
    source_frame = _load_symbol_frame(normalized_symbol)
    features, target, _, target_encoder = prepare_feature_matrix(source_frame)
    row_index = _select_row_index(len(features), sample_index)

    model_name, model, model_path = load_best_model()
    feature_row = features.iloc[[row_index]]
    if hasattr(model, 'predict_proba'):
        probabilities = model.predict_proba(feature_row)[0].astype(float)
        predicted_class_index = int(np.argmax(probabilities))
    else:
        predicted_class_index = int(model.predict(feature_row)[0])
        class_count = len(target_encoder.classes_)
        probabilities = np.zeros(class_count, dtype=float)
        probabilities[predicted_class_index] = 1.0

    predicted_label = target_encoder.inverse_transform([predicted_class_index])[0]
    actual_label = target_encoder.inverse_transform([int(target.iloc[row_index])])[0] if len(target) > row_index else None
    context = _serialize_context(source_frame.iloc[row_index])

    return {
        'model_name': model_name,
        'model_path': str(model_path),
        'symbol': normalized_symbol,
        'sample_index': row_index,
        'predicted_label': predicted_label,
        'predicted_probability': float(probabilities[predicted_class_index]),
        'probabilities': probabilities.tolist(),
        'actual_label': actual_label,
        'context': context,
        'feature_row': feature_row,
    }


def record_prediction(db: Session, user: User, payload: dict[str, Any], explanation_type: str | None = None, explanation_payload: dict[str, Any] | None = None) -> PredictionHistory:
    record = PredictionHistory(
        user_id=user.id,
        symbol=payload['symbol'],
        sample_index=payload['sample_index'],
        model_name=payload['model_name'],
        predicted_label=payload['predicted_label'],
        predicted_probability=payload['predicted_probability'],
        probabilities=payload['probabilities'],
        explanation_type=explanation_type,
        input_context=payload.get('context'),
        explanation_payload=explanation_payload,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def predict(db: Session | None = None, user: User | None = None, request: PredictRequest | None = None, persist: bool = False, explanation_type: str | None = None, explanation_payload: dict[str, Any] | None = None) -> dict[str, Any]:
    payload = build_prediction(symbol=request.symbol if request else None, sample_index=request.sample_index if request else -1)
    history_id: int | None = None

    if persist:
        if db is None or user is None:
            raise ValueError('db and user are required when persist is True.')
        record = record_prediction(db, user, payload, explanation_type=explanation_type, explanation_payload=explanation_payload)
        history_id = record.id

    payload['history_id'] = history_id
    return payload
