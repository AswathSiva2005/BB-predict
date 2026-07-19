import unittest

from backend.ml.pipeline import MODEL_NAMES, create_models
from backend.services.insight_service import get_explore_insights


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

    def test_explore_insights_include_all_models_and_follow_symbol(self):
        reliance = get_explore_insights('RELIANCE')
        tcs = get_explore_insights('TCS')

        self.assertEqual(
            {result['model'] for result in reliance['model_results']},
            set(MODEL_NAMES),
        )
        self.assertEqual(reliance['decision_insight']['symbol'], 'RELIANCE')
        self.assertEqual(tcs['decision_insight']['symbol'], 'TCS')
        self.assertTrue(reliance['decision_insight']['reasons'])
        self.assertIn(reliance['decision_insight']['decision'], {'BUY', 'HOLD', 'SELL'})


if __name__ == '__main__':
    unittest.main()
