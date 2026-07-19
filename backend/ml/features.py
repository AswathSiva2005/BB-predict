from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence

import matplotlib

matplotlib.use('Agg', force=True)
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from ta.momentum import ROCIndicator, RSIIndicator
from ta.trend import ADXIndicator, CCIIndicator, EMAIndicator, MACD, SMAIndicator
from ta.volatility import AverageTrueRange, BollingerBands
from ta.volume import OnBalanceVolumeIndicator, VolumeWeightedAveragePrice

from backend.ml.data_collection import DEFAULT_SYMBOLS
from backend.ml.preprocessing import clean_stock_data

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATASETS_DIR = PROJECT_ROOT / 'datasets'
CLEAN_DIR = DATASETS_DIR / 'cleaned'
FINAL_DIR = DATASETS_DIR / 'final'
VISUALIZATION_DIR = DATASETS_DIR / 'visualizations'

LABEL_BUY = 'BUY'
LABEL_SELL = 'SELL'
LABEL_HOLD = 'HOLD'


@dataclass(slots=True)
class FeatureEngineeringArtifacts:
    symbol: str
    final_dataset_path: Path
    visualization_paths: list[Path]
    row_count: int


def build_feature_directories() -> None:
    FINAL_DIR.mkdir(parents=True, exist_ok=True)
    VISUALIZATION_DIR.mkdir(parents=True, exist_ok=True)


def load_cleaned_dataset(symbol: str, cleaned_dir: Path = CLEAN_DIR) -> pd.DataFrame:
    file_path = cleaned_dir / f'{symbol}_cleaned.csv'
    if not file_path.exists():
        raise FileNotFoundError(f'Cleaned dataset not found for {symbol}: {file_path}')

    data_frame = pd.read_csv(file_path)
    return clean_stock_data(data_frame)


def add_technical_indicators(data_frame: pd.DataFrame) -> pd.DataFrame:
    features = data_frame.copy()

    close = features['Close'].astype(float)
    high = features['High'].astype(float)
    low = features['Low'].astype(float)
    volume = features['Volume'].astype(float)

    features['RSI'] = RSIIndicator(close=close, window=14).rsi()

    macd_indicator = MACD(close=close, window_fast=12, window_slow=26, window_sign=9)
    features['MACD'] = macd_indicator.macd()
    features['MACD_SIGNAL'] = macd_indicator.macd_signal()
    features['MACD_DIFF'] = macd_indicator.macd_diff()

    features['EMA_12'] = EMAIndicator(close=close, window=12).ema_indicator()
    features['EMA_26'] = EMAIndicator(close=close, window=26).ema_indicator()
    features['SMA_20'] = SMAIndicator(close=close, window=20).sma_indicator()
    features['SMA_50'] = SMAIndicator(close=close, window=50).sma_indicator()

    bollinger = BollingerBands(close=close, window=20, window_dev=2)
    features['BB_UPPER'] = bollinger.bollinger_hband()
    features['BB_MIDDLE'] = bollinger.bollinger_mavg()
    features['BB_LOWER'] = bollinger.bollinger_lband()
    features['BB_WIDTH'] = features['BB_UPPER'] - features['BB_LOWER']

    features['ATR'] = AverageTrueRange(high=high, low=low, close=close, window=14).average_true_range()
    features['ADX'] = ADXIndicator(high=high, low=low, close=close, window=14).adx()
    features['CCI'] = CCIIndicator(high=high, low=low, close=close, window=20).cci()

    features['MOMENTUM_10'] = close - close.shift(10)
    features['ROC'] = ROCIndicator(close=close, window=12).roc()
    features['OBV'] = OnBalanceVolumeIndicator(close=close, volume=volume).on_balance_volume()
    features['VWAP'] = VolumeWeightedAveragePrice(
        high=high,
        low=low,
        close=close,
        volume=volume,
        window=14,
    ).volume_weighted_average_price()

    return features


def add_return_features(data_frame: pd.DataFrame) -> pd.DataFrame:
    features = data_frame.copy()
    features['DAILY_RETURN'] = features['Close'].pct_change()
    features['LOG_RETURN'] = np.log(features['Close'] / features['Close'].shift(1))
    return features


def add_lag_features(data_frame: pd.DataFrame, lag_columns: Sequence[str] | None = None, lags: Sequence[int] = (1, 2, 3, 5, 10)) -> pd.DataFrame:
    features = data_frame.copy()
    columns = list(lag_columns) if lag_columns else ['Close', 'Volume', 'RSI', 'MACD']

    for column in columns:
        if column not in features.columns:
            continue
        for lag in lags:
            features[f'{column}_LAG_{lag}'] = features[column].shift(lag)

    return features


def add_rolling_features(data_frame: pd.DataFrame, windows: Sequence[int] = (5, 10, 20)) -> pd.DataFrame:
    features = data_frame.copy()

    for window in windows:
        features[f'CLOSE_ROLLING_MEAN_{window}'] = features['Close'].rolling(window=window).mean()
        features[f'CLOSE_ROLLING_STD_{window}'] = features['Close'].rolling(window=window).std()

    return features


def create_target_labels(
    data_frame: pd.DataFrame,
    threshold: float = 0.02,
    horizon: int = 1,
    target_column: str = 'TARGET',
) -> pd.DataFrame:
    features = data_frame.copy()
    future_close = features['Close'].shift(-horizon)
    upper_trigger = features['Close'] * (1 + threshold)
    lower_trigger = features['Close'] * (1 - threshold)

    features['FUTURE_CLOSE'] = future_close
    features[target_column] = np.select(
        [future_close > upper_trigger, future_close < lower_trigger],
        [LABEL_BUY, LABEL_SELL],
        default=LABEL_HOLD,
    )

    return features


def finalize_feature_frame(data_frame: pd.DataFrame, drop_columns: Sequence[str] = ('FUTURE_CLOSE',)) -> pd.DataFrame:
    features = data_frame.copy()
    features = features.dropna().reset_index(drop=True)

    removable_columns = [column for column in drop_columns if column in features.columns]
    if removable_columns:
        features = features.drop(columns=removable_columns)

    return features


def build_feature_set(data_frame: pd.DataFrame) -> pd.DataFrame:
    features = clean_stock_data(data_frame)
    features = add_technical_indicators(features)
    features = add_return_features(features)
    features = add_lag_features(features)
    features = add_rolling_features(features)
    features = create_target_labels(features)
    features = finalize_feature_frame(features)
    return features


def save_final_dataset(data_frame: pd.DataFrame, symbol: str, output_dir: Path = FINAL_DIR) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    file_path = output_dir / f'{symbol}_final.csv'
    data_frame.to_csv(file_path, index=False)
    return file_path


def generate_visualizations(data_frame: pd.DataFrame, symbol: str, output_dir: Path = VISUALIZATION_DIR) -> list[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    symbol_dir = output_dir / symbol
    symbol_dir.mkdir(parents=True, exist_ok=True)

    generated_paths: list[Path] = []

    fig1, ax1 = plt.subplots(figsize=(12, 5))
    ax1.plot(data_frame['Date'], data_frame['Close'], label='Close', linewidth=1.2)
    if 'EMA_12' in data_frame.columns:
        ax1.plot(data_frame['Date'], data_frame['EMA_12'], label='EMA 12', linewidth=1)
    if 'SMA_20' in data_frame.columns:
        ax1.plot(data_frame['Date'], data_frame['SMA_20'], label='SMA 20', linewidth=1)
    ax1.set_title(f'{symbol} Price with EMA/SMA')
    ax1.set_xlabel('Date')
    ax1.set_ylabel('Price')
    ax1.legend()
    ax1.grid(alpha=0.2)
    fig1.autofmt_xdate()
    path1 = symbol_dir / f'{symbol}_price_trend.png'
    fig1.savefig(path1, bbox_inches='tight', dpi=150)
    plt.close(fig1)
    generated_paths.append(path1)

    fig2, (ax2, ax3) = plt.subplots(nrows=2, ncols=1, figsize=(12, 7), sharex=True)
    ax2.plot(data_frame['Date'], data_frame['RSI'], color='tab:purple', linewidth=1)
    ax2.axhline(70, color='red', linestyle='--', linewidth=0.8)
    ax2.axhline(30, color='green', linestyle='--', linewidth=0.8)
    ax2.set_title(f'{symbol} RSI')
    ax2.set_ylabel('RSI')
    ax2.grid(alpha=0.2)

    ax3.plot(data_frame['Date'], data_frame['MACD'], label='MACD', linewidth=1)
    ax3.plot(data_frame['Date'], data_frame['MACD_SIGNAL'], label='Signal', linewidth=1)
    ax3.bar(data_frame['Date'], data_frame['MACD_DIFF'], alpha=0.3, label='MACD Diff')
    ax3.set_title(f'{symbol} MACD')
    ax3.set_xlabel('Date')
    ax3.set_ylabel('Value')
    ax3.legend()
    ax3.grid(alpha=0.2)
    fig2.autofmt_xdate()
    path2 = symbol_dir / f'{symbol}_rsi_macd.png'
    fig2.savefig(path2, bbox_inches='tight', dpi=150)
    plt.close(fig2)
    generated_paths.append(path2)

    fig3, ax4 = plt.subplots(figsize=(8, 5))
    label_counts = data_frame['TARGET'].value_counts().reindex([LABEL_BUY, LABEL_HOLD, LABEL_SELL], fill_value=0)
    ax4.bar(label_counts.index, label_counts.values, color=['#16a34a', '#94a3b8', '#dc2626'])
    ax4.set_title(f'{symbol} BUY/SELL/HOLD Distribution')
    ax4.set_xlabel('Class')
    ax4.set_ylabel('Count')
    ax4.grid(axis='y', alpha=0.2)
    path3 = symbol_dir / f'{symbol}_target_distribution.png'
    fig3.savefig(path3, bbox_inches='tight', dpi=150)
    plt.close(fig3)
    generated_paths.append(path3)

    return generated_paths


def engineer_features_for_symbol(symbol: str) -> FeatureEngineeringArtifacts:
    build_feature_directories()
    cleaned_frame = load_cleaned_dataset(symbol)
    feature_frame = build_feature_set(cleaned_frame)
    final_dataset_path = save_final_dataset(feature_frame, symbol)
    visualization_paths = generate_visualizations(feature_frame, symbol)

    return FeatureEngineeringArtifacts(
        symbol=symbol,
        final_dataset_path=final_dataset_path,
        visualization_paths=visualization_paths,
        row_count=len(feature_frame),
    )


def engineer_features_for_all_symbols(symbols: Iterable[str] = DEFAULT_SYMBOLS) -> list[FeatureEngineeringArtifacts]:
    artifacts: list[FeatureEngineeringArtifacts] = []
    for symbol in symbols:
        artifacts.append(engineer_features_for_symbol(symbol))
    return artifacts


if __name__ == '__main__':
    engineer_features_for_all_symbols()
