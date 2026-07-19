import unittest

from backend.ml.data_collection import DEFAULT_SYMBOLS
from backend.ml.datasets import DATE_COLUMN, SYMBOL_COLUMN, TARGET_COLUMN, load_final_datasets


class DatasetTests(unittest.TestCase):
    def test_combined_dataset_contains_every_supported_symbol(self):
        frame = load_final_datasets()
        self.assertEqual(set(frame[SYMBOL_COLUMN].unique()), set(DEFAULT_SYMBOLS))
        self.assertEqual(frame.groupby(SYMBOL_COLUMN).size().nunique(), 1)
        self.assertFalse(frame[[DATE_COLUMN, SYMBOL_COLUMN, TARGET_COLUMN, 'Close']].isna().any().any())

    def test_target_is_shifted_to_the_next_session(self):
        frame = load_final_datasets(['RELIANCE'])
        self.assertEqual(len(frame), 2129)
        self.assertTrue(frame[DATE_COLUMN].is_monotonic_increasing)

    def test_every_date_contains_all_symbols(self):
        frame = load_final_datasets()
        counts = frame.groupby(DATE_COLUMN)[SYMBOL_COLUMN].nunique()
        self.assertTrue((counts == len(DEFAULT_SYMBOLS)).all())


if __name__ == '__main__':
    unittest.main()
