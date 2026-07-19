import unittest

from backend.ml.pipeline import MODEL_NAMES, create_models


class ModelRegistryTests(unittest.TestCase):
    def test_registry_matches_base_paper_plus_lstm(self):
        self.assertEqual(tuple(create_models().keys()), MODEL_NAMES)
        self.assertNotIn('XGBoost', MODEL_NAMES)
        self.assertNotIn('LightGBM', MODEL_NAMES)
        self.assertNotIn('Gradient Boosting', MODEL_NAMES)

    def test_every_model_supports_probabilistic_classification(self):
        for name, model in create_models().items():
            with self.subTest(model=name):
                self.assertTrue(hasattr(model, 'fit'))
                self.assertTrue(hasattr(model, 'predict'))
                self.assertTrue(hasattr(model, 'predict_proba'))


if __name__ == '__main__':
    unittest.main()
