from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd
from sqlalchemy.orm import Session

from backend.api.schemas import TrainRequest
from backend.ml.data_collection import DEFAULT_SYMBOLS
from backend.ml.pipeline import train_model
from backend.models.history import TrainingHistory
from backend.models.user import User
from backend.services.explanation_service import load_best_model


def _normalize_symbols(symbols: list[str] | None) -> list[str]:
    if not symbols:
        return list(DEFAULT_SYMBOLS)

    normalized: list[str] = []
    for symbol in symbols:
        value = symbol.upper().strip()
        if value not in DEFAULT_SYMBOLS:
            raise ValueError(f'Unknown symbol {symbol!r}. Expected one of: {", ".join(DEFAULT_SYMBOLS)}')
        normalized.append(value)
    return normalized


def _read_best_metrics(comparison_table_path: Path, best_model_name: str) -> dict[str, Any]:
    if not comparison_table_path.exists():
        return {}

    comparison_table = pd.read_csv(comparison_table_path)
    if comparison_table.empty or 'model' not in comparison_table.columns:
        return {}

    best_row = comparison_table[comparison_table['model'] == best_model_name]
    if best_row.empty:
        return comparison_table.iloc[0].to_dict()
    return best_row.iloc[0].to_dict()


def train(db: Session, user: User, request: TrainRequest | None = None) -> dict[str, Any]:
    symbols = _normalize_symbols(request.symbols if request else None)
    history = TrainingHistory(
        user_id=user.id,
        status='running',
        symbols=symbols,
        started_at=datetime.now(timezone.utc),
    )
    db.add(history)
    db.commit()
    db.refresh(history)

    try:
        artifacts = train_model(symbols=symbols)
        metrics = _read_best_metrics(artifacts.comparison_table_path, artifacts.best_model_name)

        history.status = 'completed'
        history.model_name = artifacts.best_model_name
        history.best_model_path = str(artifacts.best_model_path)
        history.comparison_table_path = str(artifacts.comparison_table_path)
        history.comparison_plot_path = str(artifacts.comparison_plot_path)
        history.metrics = metrics
        history.row_count = artifacts.row_count
        history.notes = f'Training completed successfully with {len(artifacts.model_paths)} models.'
        history.finished_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(history)
        load_best_model.cache_clear()

        return {
            'status': history.status,
            'best_model_name': artifacts.best_model_name,
            'best_model_path': str(artifacts.best_model_path),
            'comparison_table_path': str(artifacts.comparison_table_path),
            'comparison_plot_path': str(artifacts.comparison_plot_path),
            'row_count': artifacts.row_count,
            'history_id': history.id,
        }
    except Exception as exc:
        history.status = 'failed'
        history.notes = str(exc)
        history.finished_at = datetime.now(timezone.utc)
        db.commit()
        raise
