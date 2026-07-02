from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import pandas as pd
import yfinance as yf

from backend.ml.preprocessing import (
    clean_stock_data,
    normalize_numeric_features,
    split_train_test_by_time,
)
from backend.ml.splitting import time_series_split_frames, walk_forward_validation_frames

DEFAULT_SYMBOLS: tuple[str, ...] = ('AAPL', 'MSFT', 'GOOG', 'AMZN', 'META', 'NVDA', 'TSLA', 'NFLX')
DEFAULT_START_DATE = '2018-01-01'
DEFAULT_END_DATE = None
DEFAULT_TEST_SIZE = 0.2
DEFAULT_TIME_SERIES_SPLITS = 5
DATASET_FILENAME_SUFFIX = '.csv'

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATASETS_DIR = PROJECT_ROOT / 'datasets'
RAW_DIR = DATASETS_DIR / 'raw'
CLEAN_DIR = DATASETS_DIR / 'cleaned'
TRAIN_DIR = DATASETS_DIR / 'train'
TEST_DIR = DATASETS_DIR / 'test'
FOLDS_DIR = DATASETS_DIR / 'folds'


@dataclass(slots=True)
class StockDatasetArtifacts:
    symbol: str
    raw_path: Path
    cleaned_path: Path
    train_path: Path
    test_path: Path
    time_series_fold_paths: list[tuple[Path, Path]]


def build_dataset_directories() -> None:
    for directory in (DATASETS_DIR, RAW_DIR, CLEAN_DIR, TRAIN_DIR, TEST_DIR, FOLDS_DIR):
        directory.mkdir(parents=True, exist_ok=True)


def download_historical_stock_data(
    symbol: str,
    start_date: str = DEFAULT_START_DATE,
    end_date: str | None = DEFAULT_END_DATE,
) -> pd.DataFrame:
    stock_frame = yf.download(
        symbol,
        start=start_date,
        end=end_date,
        auto_adjust=False,
        progress=False,
    )

    if stock_frame.empty:
        raise ValueError(f'No historical data returned for {symbol}.')

    stock_frame = stock_frame.reset_index()
    if isinstance(stock_frame.columns, pd.MultiIndex):
        stock_frame.columns = [column[0] if column[0] else column[1] for column in stock_frame.columns]
    stock_frame.insert(0, 'Symbol', symbol)
    return stock_frame


def save_csv(data_frame: pd.DataFrame, file_path: Path) -> Path:
    file_path.parent.mkdir(parents=True, exist_ok=True)
    data_frame.to_csv(file_path, index=False)
    return file_path


def export_time_series_folds(symbol: str, cleaned_frame: pd.DataFrame, folds_dir: Path = FOLDS_DIR) -> list[tuple[Path, Path]]:
    fold_paths: list[tuple[Path, Path]] = []

    for fold_number, train_frame, test_frame in time_series_split_frames(cleaned_frame, n_splits=DEFAULT_TIME_SERIES_SPLITS):
        train_path = folds_dir / symbol / f'fold_{fold_number:02d}_train{DATASET_FILENAME_SUFFIX}'
        test_path = folds_dir / symbol / f'fold_{fold_number:02d}_test{DATASET_FILENAME_SUFFIX}'
        save_csv(train_frame, train_path)
        save_csv(test_frame, test_path)
        fold_paths.append((train_path, test_path))

    return fold_paths


def collect_and_prepare_stock_dataset(
    symbol: str,
    start_date: str = DEFAULT_START_DATE,
    end_date: str | None = DEFAULT_END_DATE,
    test_size: float = DEFAULT_TEST_SIZE,
) -> StockDatasetArtifacts:
    build_dataset_directories()

    raw_frame = download_historical_stock_data(symbol, start_date=start_date, end_date=end_date)
    cleaned_frame = clean_stock_data(raw_frame)
    train_frame, test_frame = split_train_test_by_time(cleaned_frame, test_size=test_size)
    normalized_train_frame, normalized_test_frame, _, _ = normalize_numeric_features(train_frame, test_frame)

    raw_path = save_csv(raw_frame, RAW_DIR / f'{symbol}_raw{DATASET_FILENAME_SUFFIX}')
    cleaned_path = save_csv(cleaned_frame, CLEAN_DIR / f'{symbol}_cleaned{DATASET_FILENAME_SUFFIX}')
    train_path = save_csv(normalized_train_frame, TRAIN_DIR / f'{symbol}_train{DATASET_FILENAME_SUFFIX}')
    test_path = save_csv(normalized_test_frame, TEST_DIR / f'{symbol}_test{DATASET_FILENAME_SUFFIX}')
    fold_paths = export_time_series_folds(symbol, cleaned_frame)

    return StockDatasetArtifacts(
        symbol=symbol,
        raw_path=raw_path,
        cleaned_path=cleaned_path,
        train_path=train_path,
        test_path=test_path,
        time_series_fold_paths=fold_paths,
    )


def collect_default_stock_datasets(
    symbols: Iterable[str] = DEFAULT_SYMBOLS,
    start_date: str = DEFAULT_START_DATE,
    end_date: str | None = DEFAULT_END_DATE,
    test_size: float = DEFAULT_TEST_SIZE,
) -> list[StockDatasetArtifacts]:
    artifacts: list[StockDatasetArtifacts] = []

    for symbol in symbols:
        artifacts.append(
            collect_and_prepare_stock_dataset(
                symbol=symbol,
                start_date=start_date,
                end_date=end_date,
                test_size=test_size,
            )
        )

    return artifacts


def walk_forward_validation_split(
    cleaned_frame: pd.DataFrame,
    initial_train_size: int | None = None,
    test_size: int = 1,
    step_size: int = 1,
) -> list[tuple[int, pd.DataFrame, pd.DataFrame]]:
    return list(
        walk_forward_validation_frames(
            cleaned_frame,
            initial_train_size=initial_train_size,
            test_size=test_size,
            step_size=step_size,
        )
    )


if __name__ == '__main__':
    collect_default_stock_datasets()