from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from pymongo.database import Database

from backend.api.schemas import TrainRequest
from backend.ml.data_collection import DEFAULT_SYMBOLS
from backend.ml.pipeline import train_model
from backend.services.explanation_service import load_best_model


def _symbols(symbols: list[str] | None) -> list[str]:
    values = [item.upper().strip() for item in (symbols or DEFAULT_SYMBOLS)]
    unknown = set(values) - set(DEFAULT_SYMBOLS)
    if unknown: raise ValueError(f'Unknown symbol(s): {", ".join(sorted(unknown))}')
    return values


def train(db: Database, user: dict, request: TrainRequest | None = None) -> dict:
    symbols = _symbols(request.symbols if request else None)
    now = datetime.now(timezone.utc)
    history = {'user_id': user['id'], 'status': 'running', 'symbols': symbols, 'started_at': now, 'created_at': now}
    history_id = db.training_history.insert_one(history).inserted_id
    try:
        artifacts = train_model(symbols=symbols)
        table = pd.read_csv(artifacts.comparison_table_path)
        metrics = table[table['model'] == artifacts.best_model_name].iloc[0].to_dict()
        update = {'status': 'completed', 'model_name': artifacts.best_model_name, 'best_model_path': str(artifacts.best_model_path), 'comparison_table_path': str(artifacts.comparison_table_path), 'comparison_plot_path': str(artifacts.comparison_plot_path), 'metrics': metrics, 'row_count': artifacts.row_count, 'notes': f'Training completed successfully with {len(artifacts.model_paths)} models.', 'finished_at': datetime.now(timezone.utc)}
        db.training_history.update_one({'_id': history_id}, {'$set': update})
        load_best_model.cache_clear()
        return {**{key: update[key] for key in ('status', 'best_model_path', 'comparison_table_path', 'comparison_plot_path', 'row_count')}, 'best_model_name': artifacts.best_model_name, 'history_id': str(history_id)}
    except Exception as exc:
        db.training_history.update_one({'_id': history_id}, {'$set': {'status': 'failed', 'notes': str(exc), 'finished_at': datetime.now(timezone.utc)}})
        raise
