"""
Pulls (LeadFeatures, LeadScore) pairs from the DB -- filtered to only
valid training labels (label_source in heuristic_bootstrap/
agent_confirmed; model_predicted rows are excluded, see models.py) --
builds the 7-feature model input table, and splits into train/val/test
CSVs, same 80/10/10 seed=42 convention as Phases 1-2.

Output: data/lead_scoring/{train,val,test}.csv
"""

import random
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from app.lead_scoring.db import get_session
from app.lead_scoring.models import LabelSource, LeadFeatures, LeadScore

FEATURE_COLUMNS = [
    "sentiment", "sentiment_confidence", "entity_completeness",
    "amenities_count", "budget_amount", "turn_count", "message_length",
]


def load_training_rows(session):
    """Only label_source values where LabelSource(...).is_valid_training_label
    is True -- this is the one place that filter must be applied, since
    model_predicted rows must never leak into training."""
    query = (
        session.query(LeadFeatures, LeadScore)
        .join(LeadScore, LeadScore.lead_features_id == LeadFeatures.id)
        .filter(LeadScore.label_source.in_(
            [s for s in LabelSource if LabelSource(s).is_valid_training_label]
        ))
    )
    rows = []
    for feats, score in query.all():
        row = {col: getattr(feats, col) for col in FEATURE_COLUMNS}
        row["sentiment"] = row["sentiment"].value if row["sentiment"] is not None else None
        row["score"] = score.score
        row["tier"] = score.tier.value
        row["label_source"] = score.label_source.value
        row["lead_features_id"] = feats.id
        rows.append(row)
    return rows


def main(out_dir="data/lead_scoring", seed=42, train_frac=0.8, val_frac=0.1):
    session = get_session()
    rows = load_training_rows(session)
    session.close()
    print(f"Loaded {len(rows)} labeled rows (label_source filtered to valid training labels).")

    label_source_counts = pd.Series([r["label_source"] for r in rows]).value_counts()
    print("label_source breakdown:", label_source_counts.to_dict())

    random.seed(seed)
    indices = list(range(len(rows)))
    random.shuffle(indices)

    n = len(indices)
    n_train = int(n * train_frac)
    n_val = int(n * val_frac)
    splits = {
        "train": indices[:n_train],
        "val": indices[n_train:n_train + n_val],
        "test": indices[n_train + n_val:],
    }

    out_path = Path(out_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    for name, idxs in splits.items():
        df = pd.DataFrame([rows[i] for i in idxs])
        df.to_csv(out_path / f"{name}.csv", index=False)
        tier_counts = df["tier"].value_counts().to_dict()
        print(f"  {name}: {len(idxs)} rows -> {out_path / f'{name}.csv'}  tiers={tier_counts}")


if __name__ == "__main__":
    main()
