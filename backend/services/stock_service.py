from __future__ import annotations

from datetime import date, datetime
from typing import Any

import numpy as np
import pandas as pd

from backend.ml.data_collection import DEFAULT_SYMBOLS
from backend.ml.datasets import load_final_datasets


COMPANY_METADATA = {
    'AAPL': ('Apple Inc.', 'apple.com'),
    'AMZN': ('Amazon.com, Inc.', 'amazon.com'),
    'GOOGL': ('Alphabet Inc.', 'abc.xyz'),
    'MSFT': ('Microsoft Corporation', 'microsoft.com'),
    'NVDA': ('NVIDIA Corporation', 'nvidia.com'),
    'TSLA': ('Tesla, Inc.', 'tesla.com'),
}


def _serialize_value(value: Any) -> Any:
    if isinstance(value, (pd.Timestamp, datetime, date)):
        return value.isoformat()
    if isinstance(value, np.generic):
        return value.item()
    if pd.isna(value):
        return None
    return value


def _load_final_frame() -> pd.DataFrame:
    return load_final_datasets(DEFAULT_SYMBOLS)


def get_stocks_overview() -> dict[str, list[dict[str, Any]]]:
    combined = _load_final_frame()
    if 'Symbol' not in combined.columns:
        raise ValueError('Symbol column is required for the stocks endpoint.')
    if 'Date' not in combined.columns:
        raise ValueError('Date column is required for the stocks endpoint.')

    combined['Date'] = pd.to_datetime(combined['Date'], errors='coerce')
    combined = combined.dropna(subset=['Date'])

    summaries: list[dict[str, Any]] = []
    for symbol, group in combined.groupby('Symbol'):
        ordered = group.sort_values('Date')
        latest_row = ordered.iloc[-1]
        company_name, domain = COMPANY_METADATA.get(str(symbol), (str(symbol), ''))
        summaries.append(
            {
                'symbol': str(symbol),
                'company_name': company_name,
                'logo_url': f'https://www.google.com/s2/favicons?domain_url=https://{domain}&sz=128' if domain else None,
                'website_url': f'https://{domain}' if domain else None,
                'latest_date': _serialize_value(latest_row['Date']),
                'latest_close': float(latest_row['Close']),
                'latest_target': str(latest_row['TARGET']),
                'row_count': int(len(ordered)),
                'min_close': float(ordered['Close'].min()),
                'max_close': float(ordered['Close'].max()),
                'average_close': float(ordered['Close'].mean()),
            }
        )

    summaries.sort(key=lambda item: item['symbol'])
    return {'stocks': summaries}


PERIOD_TRADING_DAYS: dict[str, int | None] = {
    '1W': 5,
    '1M': 22,
    '3M': 66,
    '6M': 132,
    '1Y': 252,
    '5Y': 1260,
    'ALL': None,
}


def get_stock_candles(symbol: str, period: str = '3M') -> dict[str, Any]:
    period_key = (period or '3M').upper()
    if period_key not in PERIOD_TRADING_DAYS:
        raise ValueError(f"Unsupported period '{period}'. Choose one of {', '.join(PERIOD_TRADING_DAYS)}.")

    combined = _load_final_frame()
    if 'Symbol' not in combined.columns or 'Date' not in combined.columns:
        raise ValueError('Symbol and Date columns are required for the candles endpoint.')

    symbol_key = symbol.upper()
    group = combined[combined['Symbol'].astype(str).str.upper() == symbol_key].copy()
    if group.empty:
        raise ValueError(f"No data found for symbol '{symbol}'.")

    group['Date'] = pd.to_datetime(group['Date'], errors='coerce')
    group = group.dropna(subset=['Date']).sort_values('Date')

    window = PERIOD_TRADING_DAYS[period_key]
    if window is not None:
        group = group.tail(window)

    candles = [
        {
            'date': _serialize_value(row['Date']),
            'open': float(row['Open']),
            'high': float(row['High']),
            'low': float(row['Low']),
            'close': float(row['Close']),
            'volume': float(row['Volume']),
            'rsi': _serialize_value(row.get('RSI')),
            'macd': _serialize_value(row.get('MACD')),
        }
        for _, row in group.iterrows()
    ]

    return {'symbol': symbol_key, 'period': period_key, 'candles': candles}


def get_research_overview() -> dict:
    stocks = get_stocks_overview()['stocks']
    return {
        'symbol': 'DEMO',
        'observation_date': date.today().isoformat(),
        'status': 'production-ready',
        'note': 'FastAPI, JWT auth, MongoDB history, prediction, training, SHAP, and LIME are available.',
        'stock_count': len(stocks),
        'available_symbols': [stock['symbol'] for stock in stocks],
    }
