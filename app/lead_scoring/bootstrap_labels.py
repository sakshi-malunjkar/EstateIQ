"""
Runs the documented heuristic formula (app/lead_scoring/heuristic.py)
over every LeadFeatures row and writes the result as a LeadScore with
label_source="heuristic_bootstrap" -- these are the training labels for
the XGBoost model, used only because no real conversion outcomes exist
yet for this project (see LIMITATIONS.md).

Usage:
    python app/lead_scoring/bootstrap_labels.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from app.lead_scoring.db import get_session
from app.lead_scoring.heuristic import compute_heuristic_score_from_features
from app.lead_scoring.models import LabelSource, Lead, LeadFeatures, LeadScore


def run(session=None):
    owns_session = session is None
    if owns_session:
        session = get_session()

    features_rows = session.query(LeadFeatures).all()
    n_created = 0
    for feats in features_rows:
        result = compute_heuristic_score_from_features(feats)
        score_row = LeadScore(
            lead_features_id=feats.id,
            score=result["score"],
            tier=result["tier"],
            label_source=LabelSource.HEURISTIC_BOOTSTRAP,
            heuristic_version=result["heuristic_version"],
        )
        session.add(score_row)
        session.flush()

        # point the lead's current_score at this bootstrap score
        transcript = feats.transcript
        lead = session.get(Lead, transcript.lead_id) if transcript.lead_id else None
        if lead is not None:
            lead.current_score_id = score_row.id
            session.add(lead)

        n_created += 1
        if n_created % 100 == 0:
            session.commit()
            print(f"  {n_created}/{len(features_rows)} scored...")

    session.commit()
    print(f"Done: {n_created} heuristic_bootstrap scores created.")
    if owns_session:
        session.close()


if __name__ == "__main__":
    run()
