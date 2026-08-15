"""
Evaluates the trained XGBoost lead-scoring model on the held-out test
split: regression metrics (MAE/RMSE/R^2) on the continuous score, plus
tier-classification metrics (derived from the predicted score via
score_to_tier, so tier and score always agree with each other).

Also computes SHAP values on the test set for feature-importance
reporting -- meaningful regardless of the label source, since it
explains what the model actually learned, not whether the labels
reflect real lead quality (see LIMITATIONS.md).

Usage:
    python app/lead_scoring/evaluate_lead_score.py
"""

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import shap
import xgboost as xgb
from sklearn.metrics import classification_report, mean_absolute_error, mean_squared_error, r2_score

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from app.lead_scoring.heuristic import score_to_tier
from app.lead_scoring.train_lead_score import FEATURE_COLUMNS, load_split


def main(data_dir="data/lead_scoring", model_dir="models_artifacts/lead_scoring", split="test"):
    model_dir = Path(model_dir)
    model = xgb.XGBRegressor()
    model.load_model(str(model_dir / "model.json"))

    df = load_split(Path(data_dir) / f"{split}.csv")
    X = df[FEATURE_COLUMNS]
    y_true_score = df["score"]
    y_true_tier = df["tier"]

    y_pred_score = model.predict(X)
    y_pred_tier = [score_to_tier(s) for s in y_pred_score]

    mae = mean_absolute_error(y_true_score, y_pred_score)
    rmse = mean_squared_error(y_true_score, y_pred_score) ** 0.5
    r2 = r2_score(y_true_score, y_pred_score)

    print(f"\n=== {split} set ({len(df)} examples) — regression on score (0-100) ===")
    print(f"MAE={mae:.3f}  RMSE={rmse:.3f}  R^2={r2:.5f}")
    print("(Near-perfect fit is expected: the target is a deterministic function of these")
    print(" same inputs (the heuristic formula), so this measures distillation accuracy,")
    print(" not real-world predictive skill -- see LIMITATIONS.md.)")

    print(f"\n=== tier classification (derived from predicted score) ===")
    report = classification_report(y_true_tier, y_pred_tier, output_dict=True, zero_division=0)
    print(classification_report(y_true_tier, y_pred_tier, zero_division=0))

    # SHAP feature importance
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X)
    mean_abs_shap = {col: float(np.abs(shap_values[:, i]).mean()) for i, col in enumerate(FEATURE_COLUMNS)}
    mean_abs_shap = dict(sorted(mean_abs_shap.items(), key=lambda kv: -kv[1]))

    print("\n=== SHAP mean |value| per feature (higher = more influence on score) ===")
    for feat, val in mean_abs_shap.items():
        print(f"  {feat:25s} {val:.4f}")

    result = {
        "regression": {"mae": float(mae), "rmse": float(rmse), "r2": float(r2)},
        "tier_classification_report": report,
        "shap_mean_abs": mean_abs_shap,
        "num_examples": len(df),
    }
    out_path = model_dir / f"{split}_report.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    print(f"\nFull report written to {out_path}")


if __name__ == "__main__":
    main()
