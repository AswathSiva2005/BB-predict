"""Convert the raw per-company yfinance exports in datasets/final/ into the
combined, feature-engineered dataset the app reads at runtime.

The raw files (``{SYMBOL}_historical_data.csv`` / ``.xlsx``) are yfinance's
default export shape: three header rows (Price/Ticker/Date) followed by the
OHLCV rows. This script normalizes each file, engineers the same technical
indicators and BUY/HOLD/SELL target used elsewhere in the pipeline, combines
every symbol, and writes the result to datasets/final/global_stocks.csv.
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd

from backend.ml.data_collection import DEFAULT_SYMBOLS
from backend.ml.datasets import STOCK_DATASET_PATH
from backend.ml.features import build_feature_set

FINAL_DIR = Path(__file__).resolve().parents[1] / 'datasets' / 'final'

RAW_FILES: dict[str, str] = {
    'AAPL': 'AAPL_historical_data.xlsx',
    'AMZN': 'AMZN_historical_data.csv',
    'GOOGL': 'GOOGL_historical_data.csv',
    'MSFT': 'MSFT_historical_data.csv',
    'NVDA': 'NVDA_historical_data.csv',
    'TSLA': 'TSLA_historical_data.csv',
}


def _load_raw_yfinance_export(file_path: Path) -> pd.DataFrame:
    """Read a yfinance export, dropping its Ticker/Date header rows."""
    if file_path.suffix.lower() == '.xlsx':
        raw = pd.read_excel(file_path, header=None)
    else:
        raw = pd.read_csv(file_path, header=None)

    header = raw.iloc[0].tolist()
    data = raw.iloc[3:].copy()
    data.columns = header
    data = data.rename(columns={'Price': 'Date'})
    return data.reset_index(drop=True)


def build_symbol_frame(symbol: str, file_name: str) -> pd.DataFrame:
    raw = _load_raw_yfinance_export(FINAL_DIR / file_name)
    raw['Date'] = pd.to_datetime(raw['Date'], errors='coerce')
    for column in ('Open', 'High', 'Low', 'Close', 'Adj Close', 'Volume'):
        raw[column] = pd.to_numeric(raw[column], errors='coerce')
    raw.insert(1, 'Symbol', symbol)

    return build_feature_set(raw)


def build_combined_dataset(symbols: dict[str, str] = RAW_FILES) -> pd.DataFrame:
    frames = [build_symbol_frame(symbol, file_name) for symbol, file_name in symbols.items()]
    combined = pd.concat(frames, ignore_index=True)
    return combined.sort_values(['Date', 'Symbol']).reset_index(drop=True)


def main() -> None:
    missing = set(RAW_FILES) - set(DEFAULT_SYMBOLS)
    if missing:
        raise ValueError(f'RAW_FILES has symbols not present in DEFAULT_SYMBOLS: {sorted(missing)}')

    combined = build_combined_dataset()
    STOCK_DATASET_PATH.parent.mkdir(parents=True, exist_ok=True)
    combined.to_csv(STOCK_DATASET_PATH, index=False)
    print(f'Wrote {len(combined)} rows across {combined["Symbol"].nunique()} symbols to {STOCK_DATASET_PATH}')
    print(combined['Symbol'].value_counts())


if __name__ == '__main__':
    main()
