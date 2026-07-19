from __future__ import annotations

from typing import Any

import pandas as pd

from backend.ml.pipeline import TRAINED_MODELS_DIR
from backend.services.prediction_service import build_prediction
from backend.services.stock_service import COMPANY_METADATA


def get_model_results() -> list[dict[str, Any]]:
    comparison_path = TRAINED_MODELS_DIR / 'model_comparison.csv'
    if not comparison_path.exists():
        raise FileNotFoundError('Model comparison results are not available. Train the models first.')

    table = pd.read_csv(comparison_path).sort_values('f1_score', ascending=False)
    columns = ('model', 'accuracy', 'precision', 'recall', 'f1_score', 'roc_auc')
    return [
        {
            key: str(row[key]) if key == 'model' else float(row[key])
            for key in columns
        }
        for _, row in table.iterrows()
    ]


def _number(context: dict[str, Any], *keys: str) -> float | None:
    for key in keys:
        value = context.get(key)
        if value is not None:
            try:
                return float(value)
            except (TypeError, ValueError):
                continue
    return None


def build_decision_insight(symbol: str | None = None) -> dict[str, Any]:
    prediction = build_prediction(symbol=symbol)
    context = prediction['context']
    decision = prediction['predicted_label']
    confidence = prediction['predicted_probability']
    company_name = COMPANY_METADATA.get(prediction['symbol'], (prediction['symbol'], ''))[0]

    reasons: list[str] = []
    cautions: list[str] = []

    rsi = _number(context, 'RSI')
    if rsi is not None:
        if rsi <= 30:
            reasons.append(f'RSI is {rsi:.1f}, an oversold reading that can support a rebound.')
        elif rsi >= 70:
            reasons.append(f'RSI is {rsi:.1f}, an overbought reading that can support profit-taking.')
        else:
            reasons.append(f'RSI is {rsi:.1f}, so momentum is neither deeply oversold nor overbought.')

    macd = _number(context, 'MACD')
    if macd is not None:
        direction = 'positive' if macd > 0 else 'negative' if macd < 0 else 'flat'
        reasons.append(f'MACD is {direction} at {macd:.3f}, indicating {"upward" if macd > 0 else "downward" if macd < 0 else "neutral"} momentum.')

    close = _number(context, 'Close')
    average = _number(context, 'EMA_20', 'SMA_20')
    if close is not None and average is not None:
        relation = 'above' if close >= average else 'below'
        reasons.append(f'The close ({close:.2f}) is {relation} its 20-session trend level ({average:.2f}).')

    daily_return = _number(context, 'Daily_Return', 'DAILY_RETURN')
    if daily_return is not None:
        reasons.append(f'The latest session return is {daily_return * 100:+.2f}%, contributing to the current directional signal.')

    probabilities = prediction['probabilities']
    labels = ('BUY', 'HOLD', 'SELL')
    probability_map = {label: float(probabilities[index]) for index, label in enumerate(labels)}
    ordered = sorted(probability_map.items(), key=lambda item: item[1], reverse=True)
    margin = ordered[0][1] - ordered[1][1]
    if confidence < 0.5 or margin < 0.1:
        cautions.append('The class probabilities are close, so this is a weak signal rather than a decisive trade setup.')
    cautions.append('Market news, macroeconomic events, liquidity, and transaction costs are not represented by this model output.')

    action_text = {
        'BUY': 'The model currently leans BUY because the combined technical pattern is more consistent with upward movement than HOLD or SELL.',
        'SELL': 'The model currently leans SELL because the combined technical pattern is more consistent with downward movement than BUY or HOLD.',
        'HOLD': 'The model currently leans HOLD because the technical evidence is mixed and neither BUY nor SELL has a strong enough advantage.',
    }[decision]

    return {
        'symbol': prediction['symbol'],
        'company_name': company_name,
        'decision': decision,
        'confidence': confidence,
        'model_name': prediction['model_name'],
        'headline': f'{company_name}: {decision} signal',
        'summary': action_text,
        'reasons': reasons[:5],
        'cautions': cautions,
        'probabilities': probability_map,
        'generated_from_sample': prediction['sample_index'],
    }


def get_explore_insights(symbol: str | None = None) -> dict[str, Any]:
    return {
        'model_results': get_model_results(),
        'decision_insight': build_decision_insight(symbol),
    }
