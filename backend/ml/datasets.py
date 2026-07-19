from pathlib import Path
from typing import Iterable

import pandas as pd

from backend.ml.data_collection import DEFAULT_SYMBOLS

PROJECT_ROOT = Path(__file__).resolve().parents[1]
FINAL_DIR = PROJECT_ROOT / 'datasets' / 'final'
TARGET_COLUMN = 'TARGET'
DATE_COLUMN = 'Date'
SYMBOL_COLUMN = 'Symbol'
STOCK_DATASET_PATH = FINAL_DIR / 'indian_stocks.csv'
LEGACY_STOCK_DATASET_PATH = FINAL_DIR / 'indian stocks.csv'


def load_final_datasets(symbols: Iterable[str] = DEFAULT_SYMBOLS) -> pd.DataFrame:
    dataset_path = STOCK_DATASET_PATH if STOCK_DATASET_PATH.exists() else LEGACY_STOCK_DATASET_PATH
    if not dataset_path.exists():
        raise FileNotFoundError(f'Indian stocks dataset not found: {STOCK_DATASET_PATH}')

    combined = pd.read_csv(dataset_path).rename(columns={'Target': TARGET_COLUMN})
    required_columns = {DATE_COLUMN, SYMBOL_COLUMN, TARGET_COLUMN, 'Close'}
    missing = required_columns - set(combined.columns)
    if missing:
        raise ValueError(f'Indian stocks dataset is missing columns: {", ".join(sorted(missing))}')

    requested_symbols = {str(symbol).upper().strip() for symbol in symbols}
    combined[SYMBOL_COLUMN] = combined[SYMBOL_COLUMN].astype(str).str.upper().str.strip()
    combined = combined[combined[SYMBOL_COLUMN].isin(requested_symbols)].copy()
    missing_symbols = requested_symbols - set(combined[SYMBOL_COLUMN].unique())
    if missing_symbols:
        raise ValueError(f'Indian stocks dataset is missing symbols: {", ".join(sorted(missing_symbols))}')

    combined[DATE_COLUMN] = pd.to_datetime(combined[DATE_COLUMN], errors='coerce')
    combined = combined.dropna(subset=[DATE_COLUMN]).sort_values([SYMBOL_COLUMN, DATE_COLUMN]).reset_index(drop=True)
    combined[TARGET_COLUMN] = combined.groupby(SYMBOL_COLUMN, sort=False)[TARGET_COLUMN].shift(-1)
    return (
        combined.dropna(subset=[TARGET_COLUMN])
        .sort_values([DATE_COLUMN, SYMBOL_COLUMN])
        .reset_index(drop=True)
    )
