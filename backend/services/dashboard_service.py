from datetime import datetime
from typing import Any

import numpy as np
import pandas as pd
from pymongo.database import Database

from backend.services.explanation_service import load_best_model
from backend.services.stock_service import get_stocks_overview


def _record(document: dict | None) -> dict | None:
    if not document: return None
    result = dict(document); result['id'] = str(result.pop('_id'))
    for key, value in result.items():
        if isinstance(value, (datetime, pd.Timestamp)): result[key] = value.isoformat()
        elif isinstance(value, np.generic): result[key] = value.item()
    return result


def build_dashboard(db: Database, user: dict | None = None) -> dict[str, Any]:
    query = {'user_id': user['id']} if user else {}
    latest_training = db.training_history.find_one(query, sort=[('created_at', -1)])
    try: best_model_name, _, best_model_file = load_best_model(); best_model_path = str(best_model_file)
    except FileNotFoundError: best_model_name = latest_training.get('model_name') if latest_training else None; best_model_path = latest_training.get('best_model_path') if latest_training else None
    return {'total_users': db.users.count_documents({}), 'total_predictions': db.prediction_history.count_documents(query), 'total_trainings': db.training_history.count_documents(query), 'best_model_name': best_model_name, 'best_model_path': best_model_path, 'latest_prediction': _record(db.prediction_history.find_one(query, sort=[('created_at', -1)])), 'latest_training': _record(latest_training), 'stocks': get_stocks_overview()['stocks']}
