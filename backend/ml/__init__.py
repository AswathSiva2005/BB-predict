from backend.ml.data_collection import (
	DEFAULT_END_DATE,
	DEFAULT_START_DATE,
	DEFAULT_SYMBOLS,
	StockDatasetArtifacts,
	collect_and_prepare_stock_dataset,
	collect_default_stock_datasets,
	download_historical_stock_data,
	walk_forward_validation_split,
)
from backend.ml.preprocessing import (
	clean_stock_data,
	ensure_date_column,
	normalize_numeric_features,
	remove_duplicates,
	sort_by_date,
	split_train_test_by_time,
)
from backend.ml.features import (
	FeatureEngineeringArtifacts,
	LABEL_BUY,
	LABEL_HOLD,
	LABEL_SELL,
	build_feature_set,
	engineer_features_for_all_symbols,
	engineer_features_for_symbol,
	generate_visualizations,
	save_final_dataset,
)
from backend.ml.splitting import time_series_split_frames, walk_forward_validation_frames

def __getattr__(name: str):
	if name == 'TrainingArtifacts':
		from backend.ml.pipeline import TrainingArtifacts
		return TrainingArtifacts
	if name == 'train_model':
		from backend.ml.pipeline import train_model
		return train_model
	if name == 'run_training_pipeline':
		from backend.ml.pipeline import run_training_pipeline
		return run_training_pipeline
	raise AttributeError(f'module {__name__!r} has no attribute {name!r}')

__all__ = [
	'DEFAULT_END_DATE',
	'DEFAULT_START_DATE',
	'DEFAULT_SYMBOLS',
	'StockDatasetArtifacts',
	'clean_stock_data',
	'collect_and_prepare_stock_dataset',
	'collect_default_stock_datasets',
	'download_historical_stock_data',
	'ensure_date_column',
	'FeatureEngineeringArtifacts',
	'LABEL_BUY',
	'LABEL_HOLD',
	'LABEL_SELL',
	'build_feature_set',
	'engineer_features_for_all_symbols',
	'engineer_features_for_symbol',
	'generate_visualizations',
	'normalize_numeric_features',
	'remove_duplicates',
	'save_final_dataset',
	'sort_by_date',
	'split_train_test_by_time',
	'time_series_split_frames',
	'walk_forward_validation_frames',
	'walk_forward_validation_split',
	'TrainingArtifacts',
	'train_model',
	'run_training_pipeline',
]
