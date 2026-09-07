import unittest

from backend.ml.pipeline import MODEL_NAMES, create_models
from backend.services.insight_service import get_explore_insights


class ModelRegistryTests(unittest.TestCase):
    def test_registry_matches_base_paper_plus_xgboost(self):
        self.assertEqual(tuple(create_models().keys()), MODEL_NAMES)
        self.assertIn('XGBoost', MODEL_NAMES)
        self.assertNotIn('Long Short-Term Memory', MODEL_NAMES)
        self.assertNotIn('LightGBM', MODEL_NAMES)
        self.assertNotIn('Gradient Boosting', MODEL_NAMES)

    def test_every_model_supports_probabilistic_classification(self):
        for name, model in create_models().items():
            with self.subTest(model=name):
                self.assertTrue(hasattr(model, 'fit'))
                self.assertTrue(hasattr(model, 'predict'))
                self.assertTrue(hasattr(model, 'predict_proba'))

    def test_explore_insights_include_all_models_and_follow_symbol(self):
        aapl = get_explore_insights('AAPL')
        msft = get_explore_insights('MSFT')

        self.assertEqual(
            {result['model'] for result in aapl['model_results']},
            set(MODEL_NAMES),
        )
        self.assertEqual(aapl['decision_insight']['symbol'], 'AAPL')
        self.assertEqual(msft['decision_insight']['symbol'], 'MSFT')
        self.assertTrue(aapl['decision_insight']['reasons'])
        self.assertIn(aapl['decision_insight']['decision'], {'BUY', 'HOLD', 'SELL'})


if __name__ == '__main__':
    unittest.main()
