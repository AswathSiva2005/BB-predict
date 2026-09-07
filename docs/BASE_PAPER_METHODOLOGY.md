# Base-paper algorithm implementation

The model comparison follows Ayyildiz and Iskenderoglu, “How effective is
machine learning in stock market predictions?”, Heliyon 10 (2024), e24123,
<https://doi.org/10.1016/j.heliyon.2024.e24123>.

## Implemented paper algorithms

- Decision Tree
- Random Forest
- K-Nearest Neighbors
- Naive Bayes
- Logistic Regression
- Support Vector Machine
- Artificial Neural Network

The project additionally evaluates XGBoost, as required by this
implementation. Gradient Boosting and LightGBM are not part of the comparison.

The paper predicts next-day rise/fall directions for developed-market indices.
This project preserves its existing product contract of next-session
BUY/HOLD/SELL prediction for 15 Indian equities, while adopting the paper’s
algorithm comparison. All models receive the same leakage-controlled,
chronological 80/20 holdout and are ranked by weighted F1, with accuracy,
precision, recall, ROC-AUC, and confusion matrices retained for comparison.

The ANN uses two fully connected hidden layers. XGBoost is a gradient-boosted
tree ensemble trained directly on the engineered feature matrix. Scaling is
fitted only from the training partition for models that require it.
