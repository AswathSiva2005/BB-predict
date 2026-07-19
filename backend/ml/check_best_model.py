"""Print weighted-F1 scores and identify the strongest trained classifier."""

import csv
from pathlib import Path


COMPARISON_FILE = Path(__file__).resolve().parents[1] / "trained_models" / "model_comparison.csv"


def main() -> None:
    if not COMPARISON_FILE.exists():
        raise SystemExit(
            "No model comparison results were found.\n"
            "Train the models first with: python -m backend.ml.pipeline"
        )

    with COMPARISON_FILE.open(newline="", encoding="utf-8-sig") as comparison_file:
        reader = csv.DictReader(comparison_file)
        required_columns = {"model", "accuracy", "f1_score"}
        missing_columns = required_columns.difference(reader.fieldnames or [])
        if missing_columns:
            missing = ", ".join(sorted(missing_columns))
            raise SystemExit(f"Comparison file is missing required columns: {missing}")
        try:
            ranked = sorted(
                (
                    {
                        "model": row["model"],
                        "accuracy": float(row["accuracy"]),
                        "f1_score": float(row["f1_score"]),
                    }
                    for row in reader
                ),
                key=lambda row: row["f1_score"],
                reverse=True,
            )
        except (TypeError, ValueError) as error:
            raise SystemExit(f"Comparison file contains an invalid metric: {error}") from error

    if not ranked:
        raise SystemExit("The model comparison file contains no results.")

    print("\nModel weighted-F1 ranking")
    print("=" * 60)
    model_width = max(len("Algorithm"), *(len(row["model"]) for row in ranked))
    print(f"{'Algorithm':<{model_width}}  Weighted F1  Accuracy")
    print(f"{'-' * model_width}  -----------  --------")
    for row in ranked:
        print(
            f"{row['model']:<{model_width}}  "
            f"{row['f1_score'] * 100:>10.4f}%  "
            f"{row['accuracy'] * 100:>8.4f}%"
        )

    best = ranked[0]
    print("\nBest algorithm by weighted F1")
    print("=" * 60)
    print(f"{best['model']}: {best['f1_score'] * 100:.4f}%")


if __name__ == "__main__":
    main()
