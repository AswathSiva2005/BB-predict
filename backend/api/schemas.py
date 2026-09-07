from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class DashboardStockSummary(BaseModel):
    symbol: str
    company_name: str
    logo_url: str | None = None
    website_url: str | None = None
    latest_date: date
    latest_close: float
    latest_target: str
    row_count: int
    min_close: float
    max_close: float
    average_close: float


class DashboardResponse(BaseModel):
    total_users: int
    total_predictions: int
    total_trainings: int
    best_model_name: str | None = None
    best_model_path: str | None = None
    latest_prediction: dict[str, Any] | None = None
    latest_training: dict[str, Any] | None = None
    stocks: list[DashboardStockSummary]


class StockSummary(BaseModel):
    symbol: str
    company_name: str
    logo_url: str | None = None
    website_url: str | None = None
    latest_date: date
    latest_close: float
    latest_target: str
    row_count: int
    min_close: float
    max_close: float
    average_close: float


class StocksResponse(BaseModel):
    stocks: list[StockSummary]


class CandleRead(BaseModel):
    date: date
    open: float
    high: float
    low: float
    close: float
    volume: float
    rsi: float | None = None
    macd: float | None = None


class CandlesResponse(BaseModel):
    symbol: str
    period: str
    candles: list[CandleRead]


class ModelResultRead(BaseModel):
    model: str
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    roc_auc: float


class DecisionInsightRead(BaseModel):
    symbol: str
    company_name: str
    decision: Literal['BUY', 'HOLD', 'SELL']
    confidence: float
    model_name: str
    headline: str
    summary: str
    reasons: list[str]
    cautions: list[str]
    probabilities: dict[str, float]
    generated_from_sample: int


class ExploreInsightsResponse(BaseModel):
    model_results: list[ModelResultRead]
    decision_insight: DecisionInsightRead


class PredictionRequest(BaseModel):
    symbol: str | None = Field(default=None, min_length=1, max_length=20)
    sample_index: int = Field(default=-1, ge=-1)


class PredictRequest(PredictionRequest):
    pass


class ExplainRequest(PredictionRequest):
    explanation_type: Literal['shap', 'lime', 'both'] = 'both'
    sample_size: int = Field(default=200, ge=1)
    max_display: int = Field(default=15, ge=1)
    num_features: int = Field(default=10, ge=1)


class TrainRequest(BaseModel):
    symbols: list[str] | None = None


class PredictionResponse(BaseModel):
    model_name: str
    model_path: str
    symbol: str
    sample_index: int
    predicted_label: str
    predicted_probability: float
    probabilities: list[float]
    actual_label: str | None = None
    context: dict[str, Any]
    history_id: str | None = None


class ExplainResponse(BaseModel):
    explanation_type: Literal['shap', 'lime', 'both']
    shap: dict[str, Any] | None = None
    lime: dict[str, Any] | None = None
    history_id: str | None = None


class TrainResponse(BaseModel):
    status: str
    best_model_name: str
    best_model_path: str
    comparison_table_path: str
    comparison_plot_path: str
    row_count: int
    history_id: str


class PredictionHistoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    symbol: str
    sample_index: int
    model_name: str
    predicted_label: str
    predicted_probability: float
    probabilities: list[float]
    explanation_type: str | None = None
    input_context: dict[str, Any] | None = None
    explanation_payload: dict[str, Any] | None = None
    created_at: datetime


class TrainingHistoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str | None = None
    status: str
    model_name: str | None = None
    best_model_path: str | None = None
    comparison_table_path: str | None = None
    metrics: dict[str, Any] | None = None
    symbols: list[str] | None = None
    row_count: int | None = None
    notes: str | None = None
    started_at: datetime
    finished_at: datetime | None = None
    created_at: datetime


class HistoryResponse(BaseModel):
    predictions: list[PredictionHistoryRead]
    trainings: list[TrainingHistoryRead]
