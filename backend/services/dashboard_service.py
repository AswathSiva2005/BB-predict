from __future__ import annotations

from datetime import datetime
from typing import Any

import numpy as np
import pandas as pd
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.ml.data_collection import DEFAULT_SYMBOLS
from backend.ml.features import engineer_features_for_all_symbols
from backend.ml.pipeline import load_final_datasets
from backend.models.history import PredictionHistory, TrainingHistory
from backend.models.user import User
from backend.services.explanation_service import load_best_model
from backend.services.stock_service import get_stocks_overview


def _serialize_value(value: Any) -> Any:
    if isinstance(value, (pd.Timestamp, datetime)):
        return value.isoformat()
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, (list, dict, tuple)):
        return value
    if pd.isna(value):
        return None
    return value


def _load_final_frame() -> pd.DataFrame:
    try:
        return load_final_datasets(DEFAULT_SYMBOLS)
    except FileNotFoundError:
        engineer_features_for_all_symbols(DEFAULT_SYMBOLS)
        return load_final_datasets(DEFAULT_SYMBOLS)


def build_dashboard(db: Session, user: User | None = None) -> dict[str, Any]:
    prediction_count = db.query(func.count(PredictionHistory.id)).scalar() or 0
    training_count = db.query(func.count(TrainingHistory.id)).scalar() or 0
    user_count = db.query(func.count(User.id)).scalar() or 0

    latest_prediction = db.query(PredictionHistory).order_by(PredictionHistory.created_at.desc()).first()
    latest_training = db.query(TrainingHistory).order_by(TrainingHistory.created_at.desc()).first()

    best_model_name: str | None = None
    best_model_path: str | None = None
    try:
        best_model_name, _, best_model_file = load_best_model()
        best_model_path = str(best_model_file)
    except FileNotFoundError:
        if latest_training and latest_training.model_name:
            best_model_name = latest_training.model_name
            best_model_path = latest_training.best_model_path

    stocks_overview = get_stocks_overview()['stocks']

    return {
        'total_users': user_count,
        'total_predictions': prediction_count,
        'total_trainings': training_count,
        'best_model_name': best_model_name,
        'best_model_path': best_model_path,
        'latest_prediction': _serialize_record(latest_prediction),
        'latest_training': _serialize_record(latest_training),
        'stocks': stocks_overview,
    }


def _serialize_record(record: Any) -> dict[str, Any] | None:
    if record is None:
        return None

    payload: dict[str, Any] = {}
    for column in record.__table__.columns.keys():
        payload[column] = _serialize_value(getattr(record, column))
    return payload
