from __future__ import annotations

from datetime import datetime
from typing import Any

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from backend.models.history import PredictionHistory, TrainingHistory
from backend.models.user import User


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


def _serialize_record(record: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    for column in record.__table__.columns.keys():
        payload[column] = _serialize_value(getattr(record, column))
    return payload


def get_history(db: Session, user: User) -> dict[str, list[dict[str, Any]]]:
    prediction_records = (
        db.query(PredictionHistory)
        .filter(PredictionHistory.user_id == user.id)
        .order_by(PredictionHistory.created_at.desc())
        .all()
    )
    training_records = (
        db.query(TrainingHistory)
        .filter((TrainingHistory.user_id == user.id) | (TrainingHistory.user_id.is_(None)))
        .order_by(TrainingHistory.created_at.desc())
        .all()
    )

    return {
        'predictions': [_serialize_record(record) for record in prediction_records],
        'trainings': [_serialize_record(record) for record in training_records],
    }
