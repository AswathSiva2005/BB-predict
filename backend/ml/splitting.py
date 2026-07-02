from __future__ import annotations

from collections.abc import Iterator

import pandas as pd
from sklearn.model_selection import TimeSeriesSplit


def time_series_split_frames(
    data_frame: pd.DataFrame,
    n_splits: int = 5,
) -> Iterator[tuple[int, pd.DataFrame, pd.DataFrame]]:
    if n_splits < 2:
        raise ValueError('n_splits must be at least 2.')

    splitter = TimeSeriesSplit(n_splits=n_splits)

    for fold_number, (train_indices, test_indices) in enumerate(splitter.split(data_frame), start=1):
        yield fold_number, data_frame.iloc[train_indices].copy().reset_index(drop=True), data_frame.iloc[test_indices].copy().reset_index(drop=True)


def walk_forward_validation_frames(
    data_frame: pd.DataFrame,
    initial_train_size: int | None = None,
    test_size: int = 1,
    step_size: int = 1,
) -> Iterator[tuple[int, pd.DataFrame, pd.DataFrame]]:
    if len(data_frame) < 3:
        raise ValueError('At least three rows are required for walk-forward validation.')

    if test_size < 1:
        raise ValueError('test_size must be at least 1.')

    if step_size < 1:
        raise ValueError('step_size must be at least 1.')

    start_index = initial_train_size or max(int(len(data_frame) * 0.6), test_size)
    start_index = min(start_index, len(data_frame) - 1)

    fold_number = 1
    while start_index < len(data_frame):
        end_index = min(start_index + test_size, len(data_frame))
        train_frame = data_frame.iloc[:start_index].copy().reset_index(drop=True)
        test_frame = data_frame.iloc[start_index:end_index].copy().reset_index(drop=True)

        if test_frame.empty:
            break

        yield fold_number, train_frame, test_frame

        fold_number += 1
        start_index += step_size