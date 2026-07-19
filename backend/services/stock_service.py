from __future__ import annotations

from datetime import date, datetime
from typing import Any

import numpy as np
import pandas as pd

from backend.ml.data_collection import DEFAULT_SYMBOLS
from backend.ml.datasets import load_final_datasets


COMPANY_METADATA = {
    'RELIANCE': ('Reliance Industries', 'ril.com'),
    'TCS': ('Tata Consultancy Services', 'tcs.com'),
    'INFY': ('Infosys', 'infosys.com'),
    'HDFCBANK': ('HDFC Bank', 'hdfcbank.com'),
    'ICICIBANK': ('ICICI Bank', 'icicibank.com'),
    'SBIN': ('State Bank of India', 'sbi.co.in'),
    'TATAMOTORS': ('Tata Motors', 'tatamotors.com'),
    'WIPRO': ('Wipro', 'wipro.com'),
    'HCLTECH': ('HCLTech', 'hcltech.com'),
    'LT': ('Larsen & Toubro', 'larsentoubro.com'),
    'ASIANPAINT': ('Asian Paints', 'asianpaints.com'),
    'SUNPHARMA': ('Sun Pharmaceutical Industries', 'sunpharma.com'),
    'ITC': ('ITC Limited', 'itcportal.com'),
    'BAJFINANCE': ('Bajaj Finance', 'bajajfinserv.in'),
    'BHARTIARTL': ('Bharti Airtel', 'airtel.in'),
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
