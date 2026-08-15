"""
Trains an XGBoost regressor to predict lead_scores.score (0-100) from
the 7 heuristic-mirroring features, using data/lead_scoring/{train,val}.csv
(label_source already filtered to valid training labels upstream, in
prepare_training_data.py). Tier is derived from the predicted score
using the same score_to_tier thresholds as the heuristic, so there's a
single source of truth for what "hot/warm/cold" means.

Usage:
    python app/lead_scoring/train_lead_score.py
"""

import json
import sys
from pathlib import Path

import pandas as pd
import xgboost as xgb

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from app.lead_scoring.heuristic import score_to_tier

FEATURE_COLUMNS = [
    "sentiment", "sentiment_confidence", "entity_completeness",
    "amenities_count", "budget_amount", "turn_count", "message_length",
]
CATEGORICAL_COLUMNS = ["sentiment"]
# Fixed category set shared across train/val/test/inference -- if each
# dataframe's categorical dtype were built independently (plain
# .astype("category")), the category codes could differ across splits
# and XGBoost's categorical handling relies on that dtype metadata.
SENTIMENT_DTYPE = pd.CategoricalDtype(categories=["enthusiastic", "frustrated", "hesitant"])


def load_split(path):
    df = pd.read_csv(path)
    df["sentiment"] = df["sentiment"].astype(SENTIMENT_DTYPE)
    return df


def main(data_dir="data/lead_scoring", out_dir="models_artifacts/lead_scoring",
         n_estimators=200, max_depth=4, learning_rate=0.05, seed=42):
    data_dir = Path(data_dir)
    train_df = load_split(data_dir / "train.csv")
    val_df = load_split(data_dir / "val.csv")
    print(f"train={len(train_df)} val={len(val_df)}")

    X_train, y_train = train_df[FEATURE_COLUMNS], train_df["score"]
    X_val, y_val = val_df[FEATURE_COLUMNS], val_df["score"]

    model = xgb.XGBRegressor(
        n_estimators=n_estimators,
        max_depth=max_depth,
        learning_rate=learning_rate,
        enable_categorical=True,
        missing=float("nan"),
        early_stopping_rounds=20,
        eval_metric="mae",
        random_state=seed,
    )
    model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)

    print(f"Best iteration: {model.best_iteration} (of {n_estimators})")

    val_pred = model.predict(X_val)
    val_mae = (val_pred - y_val).abs().mean()
    print(f"Val MAE: {val_mae:.3f}")

    out_path = Path(out_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    model.save_model(str(out_path / "model.json"))
    with open(out_path / "feature_columns.json", "w", encoding="utf-8") as f:
        json.dump({"features": FEATURE_COLUMNS, "categorical": CATEGORICAL_COLUMNS}, f, indent=2)
    with open(out_path / "val_metrics.json", "w", encoding="utf-8") as f:
        json.dump({"val_mae": float(val_mae), "best_iteration": int(model.best_iteration)}, f, indent=2)

    print(f"Model saved to {out_path}")


if __name__ == "__main__":
    main()
