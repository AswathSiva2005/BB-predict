# Machine-learning validity audit

## Finding

The imported dataset's `Target` column describes the current trading session.
The earlier pipeline trained with same-session price and return fields, so the
reported accuracy near 99.8% measured target leakage rather than next-session
forecasting ability.

## Corrections

- `Target` is shifted one row forward independently for each symbol.
- The final row for each symbol is removed because its future label is unknown.
- Rows remain ordered by trading date and symbol.
- The chronological holdout boundary is aligned to a complete trading date, so
  no date appears partially in training and partially in testing.
- Scaling remains inside scikit-learn pipelines and is fitted only on training
  data.

## Interpretation

Previously generated model scores and artifacts are invalid after this change.
Retraining is required before reporting performance. Accuracy, weighted
precision, recall, F1, ROC-AUC, and the confusion matrix should be emphasized.
MSE, MAE, RMSE, and R² on encoded class identifiers are retained only for
backward-compatible research output and should not be interpreted as financial
regression metrics.

## Remaining limitations

- This is an observational historical backtest, not evidence of future profit.
- Transaction costs, slippage, liquidity, and survivorship bias are not modeled.
- Hyperparameters are fixed rather than selected through nested time-series
  validation.
- Any future sentiment feature must be timestamped and available before the
  prediction cutoff.
