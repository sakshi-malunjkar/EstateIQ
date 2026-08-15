"""
Loads the trained XGBoost lead-scoring model and scores a transcript
end-to-end: runs NER + sentiment extraction, builds the 7-feature
input, predicts score/tier, and computes a per-prediction SHAP
explanation.

This is the "model_predicted" path -- see models.py's LabelSource
docstring. Scores produced here must never be written back into the DB
as training labels; they're operational output only.

Usage:
    python app/lead_scoring/predict_lead_score.py "Namaste, mujhe ek 2BHK chahiye Baner mein, budget 50 lakhs, swimming pool chahiye. This sounds great!"
"""

import argparse
import json
import sys
from pathlib import Path

import pandas as pd
import shap
import xgboost as xgb

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from app.lead_scoring.extract_features import extract_lead_features
from app.lead_scoring.heuristic import score_to_tier
from app.lead_scoring.train_lead_score import FEATURE_COLUMNS, SENTIMENT_DTYPE

DEFAULT_MODEL_DIR = Path(__file__).parent.parent.parent / "models_artifacts" / "lead_scoring"

_model = None
_explainer = None


def _load(model_dir=DEFAULT_MODEL_DIR):
    global _model, _explainer
    if _model is None:
        # enable_categorical must be passed to the constructor again --
        # load_model() restores the booster's raw config but not every
        # sklearn-wrapper-level convenience flag, and predict() fails
        # without it once the frame has a real categorical column.
        _model = xgb.XGBRegressor(enable_categorical=True)
        _model.load_model(str(Path(model_dir) / "model.json"))
        _explainer = shap.TreeExplainer(_model)
    return _model, _explainer


NUMERIC_COLUMNS = [c for c in FEATURE_COLUMNS if c not in ("sentiment",)]


def predict_lead_score(text, model_dir=DEFAULT_MODEL_DIR):
    """Runs the full pipeline (NER + sentiment extraction -> features ->
    XGBoost score) on a raw transcript string and returns
    {score, tier, features, shap_values, label_source}."""
    model, explainer = _load(model_dir)

    feats = extract_lead_features(text)
    row = {col: feats.get(col) for col in FEATURE_COLUMNS}
    df = pd.DataFrame([row])
    df["sentiment"] = df["sentiment"].astype(SENTIMENT_DTYPE)
    # A single-row frame built from a dict infers 'object' dtype for a
    # None value (e.g. budget_amount when none was extracted) instead of
    # float64/NaN like pd.read_csv gives the training data -- cast
    # explicitly so inference sees the same dtypes training did.
    for col in NUMERIC_COLUMNS:
        df[col] = df[col].astype(float)

    score = float(model.predict(df)[0])
    tier = score_to_tier(score)

    shap_values = explainer.shap_values(df)[0]
    shap_dict = {col: float(shap_values[i]) for i, col in enumerate(FEATURE_COLUMNS)}

    return {
        "score": round(score, 2),
        "tier": tier,
        "features": row,
        "shap_values": shap_dict,
        "label_source": "model_predicted",
    }


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("text", nargs="?", default=(
        "Agent: Hello, welcome to our real estate assistant. How can I help you today?\n"
        "Client: Namaste, mujhe ek 2BHK chahiye Baner mein, budget 50 lakhs, swimming pool chahiye\n"
        "Agent: Sure, let me check 2BHK options in Baner with Swimming Pool.\n"
        "Client: This sounds great!"
    ))
    ap.add_argument("--model-dir", default=str(DEFAULT_MODEL_DIR))
    args = ap.parse_args()

    print(json.dumps(predict_lead_score(args.text, model_dir=args.model_dir), indent=2, ensure_ascii=False))
