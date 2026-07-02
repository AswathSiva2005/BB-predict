from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from backend.database.base import Base


class PredictionHistory(Base):
    __tablename__ = 'prediction_history'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    sample_index = Column(Integer, nullable=False)
    model_name = Column(String(120), nullable=False)
    predicted_label = Column(String(20), nullable=False)
    predicted_probability = Column(Float, nullable=False)
    probabilities = Column(JSON, nullable=False, default=list)
    explanation_type = Column(String(20), nullable=True)
    input_context = Column(JSON, nullable=True)
    explanation_payload = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship('User', back_populates='prediction_histories')


class TrainingHistory(Base):
    __tablename__ = 'training_history'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True, index=True)
    status = Column(String(20), nullable=False, default='running')
    model_name = Column(String(120), nullable=True)
    best_model_path = Column(String(500), nullable=True)
    comparison_table_path = Column(String(500), nullable=True)
    comparison_plot_path = Column(String(500), nullable=True)
    metrics = Column(JSON, nullable=True)
    symbols = Column(JSON, nullable=True)
    row_count = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    finished_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship('User', back_populates='training_histories')
