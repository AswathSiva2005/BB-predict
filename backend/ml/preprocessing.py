from __future__ import annotations

from typing import Sequence

import pandas as pd
from sklearn.preprocessing import MinMaxScaler

DEFAULT_NUMERIC_COLUMNS: tuple[str, ...] = ('Open', 'High', 'Low', 'Close', 'Adj Close', 'Volume')


def ensure_date_column(data_frame: pd.DataFrame, date_column: str = 'Date') -> pd.DataFrame:
    normalized_frame = data_frame.copy()

    if date_column not in normalized_frame.columns:
        normalized_frame = normalized_frame.reset_index()

    if date_column not in normalized_frame.columns:
        raise ValueError(f"Expected a '{date_column}' column in the stock dataset.")

    normalized_frame[date_column] = pd.to_datetime(normalized_frame[date_column], errors='coerce')
    normalized_frame = normalized_frame.dropna(subset=[date_column])
    return normalized_frame


def remove_duplicates(data_frame: pd.DataFrame, subset: Sequence[str] | None = None) -> pd.DataFrame:
    return data_frame.drop_duplicates(subset=list(subset) if subset else None).copy()


def handle_missing_values(data_frame: pd.DataFrame) -> pd.DataFrame:
    return data_frame.ffill().bfill().dropna().copy()


def sort_by_date(data_frame: pd.DataFrame, date_column: str = 'Date') -> pd.DataFrame:
    return data_frame.sort_values(by=date_column).reset_index(drop=True).copy()


def clean_stock_data(data_frame: pd.DataFrame, date_column: str = 'Date') -> pd.DataFrame:
    cleaned_frame = ensure_date_column(data_frame, date_column=date_column)
    cleaned_frame = remove_duplicates(cleaned_frame, subset=[date_column])
    cleaned_frame = sort_by_date(cleaned_frame, date_column=date_column)
    cleaned_frame = handle_missing_values(cleaned_frame)
    cleaned_frame = sort_by_date(cleaned_frame, date_column=date_column)
    return cleaned_frame


def split_train_test_by_time(
    data_frame: pd.DataFrame,
    test_size: float = 0.2,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    if not 0 < test_size < 1:
        raise ValueError('test_size must be between 0 and 1.')

    if len(data_frame) < 2:
        raise ValueError('At least two rows are required to create train and test datasets.')

    split_index = max(int(len(data_frame) * (1 - test_size)), 1)
    if split_index >= len(data_frame):
        split_index = len(data_frame) - 1

    train_data = data_frame.iloc[:split_index].copy().reset_index(drop=True)
    test_data = data_frame.iloc[split_index:].copy().reset_index(drop=True)

    if train_data.empty or test_data.empty:
        raise ValueError('Unable to create non-empty train and test splits from the provided data.')

    return train_data, test_data


def normalize_numeric_features(
    train_data: pd.DataFrame,
    test_data: pd.DataFrame,
    numeric_columns: Sequence[str] = DEFAULT_NUMERIC_COLUMNS,
) -> tuple[pd.DataFrame, pd.DataFrame, MinMaxScaler, list[str]]:
    available_numeric_columns = [column for column in numeric_columns if column in train_data.columns and column in test_data.columns]

    if not available_numeric_columns:
        raise ValueError('No numeric columns were found to normalize.')

    scaler = MinMaxScaler()

    normalized_train = train_data.astype({column: 'float64' for column in available_numeric_columns}, copy=True)
    normalized_test = test_data.astype({column: 'float64' for column in available_numeric_columns}, copy=True)

    normalized_train.loc[:, available_numeric_columns] = scaler.fit_transform(train_data[available_numeric_columns])
    normalized_test.loc[:, available_numeric_columns] = scaler.transform(test_data[available_numeric_columns])

    return normalized_train, normalized_test, scaler, available_numeric_columns