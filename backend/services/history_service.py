from datetime import datetime
from typing import Any

import numpy as np
import pandas as pd
from pymongo.database import Database


def _value(value: Any) -> Any:
    if isinstance(value, (pd.Timestamp, datetime)): return value.isoformat()
    if isinstance(value, np.generic): return value.item()
    return value


def _record(document: dict) -> dict:
    document = dict(document); document['id'] = str(document.pop('_id'))
    return {key: _value(value) for key, value in document.items()}


def get_history(db: Database, user: dict) -> dict[str, list[dict]]:
    predictions = db.prediction_history.find({'user_id': user['id']}).sort('created_at', -1)
    trainings = db.training_history.find({'$or': [{'user_id': user['id']}, {'user_id': None}]}).sort('created_at', -1)
    return {'predictions': [_record(item) for item in predictions], 'trainings': [_record(item) for item in trainings]}
