"""
Heuristic lead-scoring formula. HEURISTIC_VERSION = "v2"

This is a standalone, documented formula used ONLY to bootstrap initial
training labels (lead_scores.label_source = "heuristic_bootstrap") for
the XGBoost lead-scoring model -- it is NOT the model itself, and it
must stay separate from model training code so the formula's logic
stays inspectable on its own. See LIMITATIONS.md for why this proxy
exists (no real conversion outcomes yet) and its known gaps.

Deliberately kept as plain, dependency-free functions (no DB/ORM
imports) so it's easy to unit test and to read in isolation.

score_0_100 = 100 * (
    0.25 * sentiment_component
  + 0.30 * entity_component
  + 0.25 * budget_component
  + 0.20 * engagement_component
)

v2 reweight (sentiment 35%->25%, entities 20%->30%, budget/engagement
unchanged): a real test case showed a frustrated lead and a genuinely
hesitant lead score nearly identically (39.23 vs 39.22) because the
sentiment classifier misread both as "hesitant" -- see LIMITATIONS.md's
open sentiment-reliability issues. entity_completeness got the
redistributed weight rather than budget because it's a richer,
continuous NER-derived signal (4-slot completeness + amenity coverage)
vs. budget's single binary flag, so it has more room to discriminate
between leads. This does not fix the sentiment model itself -- it just
reduces how much a known-unreliable input can dominate the score.
"""

HEURISTIC_VERSION = "v2"

WEIGHTS = {
    "sentiment": 0.25,
    "entities": 0.30,
    "budget": 0.25,
    "engagement": 0.20,
}

SENTIMENT_BASE = {
    "enthusiastic": 1.0,
    "hesitant": 0.5,
    "frustrated": 0.0,
}

TIER_THRESHOLDS = {
    "hot": 70,
    "warm": 40,
}


def sentiment_component(sentiment, sentiment_confidence):
    """Mapped to a base value per class, shrunk toward neutral (0.5)
    when the model's confidence is low: effective = 0.5 + conf*(base-0.5).
    Unknown/missing sentiment is treated as fully neutral (confidence 0)."""
    base = SENTIMENT_BASE.get(sentiment, 0.5)
    confidence = sentiment_confidence if sentiment_confidence is not None else 0.0
    return 0.5 + confidence * (base - 0.5)


def entity_component(entity_completeness, amenity_count):
    """0.7 * completeness (0-1) + 0.3 * amenity coverage (capped at 3)."""
    completeness = entity_completeness or 0.0
    amenity_score = min(amenity_count or 0, 3) / 3
    return 0.7 * completeness + 0.3 * amenity_score


def budget_component(budget_amount):
    """Binary: 1.0 if a concrete budget number was extracted, else 0.0.

    On the current synthetic dataset this is 1.0 for ~every lead (see
    LIMITATIONS.md) -- it only starts discriminating once real,
    messier data includes leads who never state a number."""
    return 1.0 if budget_amount is not None else 0.0


def engagement_component(turn_count, message_length):
    """0.5 * turn count (capped at 6) + 0.5 * message length (capped at 150 chars).

    message_length must be the CLIENT's own text only (sum of "Client:"
    line lengths), not the full transcript -- the agent's scripted
    reply length says nothing about the client's engagement. The cap
    was set from the actual client-only length range on the current
    synthetic dataset (53-105 chars, avg 71), with headroom above the
    observed max so it doesn't saturate at 1.0 for every lead; revisit
    once real call data gives a wider range.

    On the current synthetic dataset turn_count is constant (see
    LIMITATIONS.md) -- message_length is the only real signal here for
    now."""
    turn_norm = min(turn_count or 0, 6) / 6
    length_norm = min(message_length or 0, 150) / 150
    return 0.5 * turn_norm + 0.5 * length_norm


def score_to_tier(score):
    if score >= TIER_THRESHOLDS["hot"]:
        return "hot"
    if score >= TIER_THRESHOLDS["warm"]:
        return "warm"
    return "cold"


def compute_heuristic_score(
    *,
    sentiment,
    sentiment_confidence,
    entity_completeness,
    amenity_count,
    budget_amount,
    turn_count,
    message_length,
):
    """Returns {"score": 0-100 float, "tier": hot/warm/cold, "components": {...},
    "heuristic_version": "v1"} -- components are included so a stored
    lead_scores row can show exactly how the final number was built."""
    s = sentiment_component(sentiment, sentiment_confidence)
    e = entity_component(entity_completeness, amenity_count)
    b = budget_component(budget_amount)
    g = engagement_component(turn_count, message_length)

    combined = WEIGHTS["sentiment"] * s + WEIGHTS["entities"] * e + WEIGHTS["budget"] * b + WEIGHTS["engagement"] * g
    score = round(combined * 100, 2)

    return {
        "score": score,
        "tier": score_to_tier(score),
        "components": {"sentiment": round(s, 4), "entities": round(e, 4), "budget": round(b, 4), "engagement": round(g, 4)},
        "heuristic_version": HEURISTIC_VERSION,
    }


def compute_heuristic_score_from_features(lead_features):
    """Convenience wrapper accepting a LeadFeatures ORM row (or any
    object with matching attribute names)."""
    return compute_heuristic_score(
        sentiment=lead_features.sentiment,
        sentiment_confidence=lead_features.sentiment_confidence,
        entity_completeness=lead_features.entity_completeness,
        amenity_count=lead_features.amenities_count,
        budget_amount=lead_features.budget_amount,
        turn_count=lead_features.turn_count,
        message_length=lead_features.message_length,
    )


if __name__ == "__main__":
    import json

    examples = [
        dict(sentiment="enthusiastic", sentiment_confidence=0.95, entity_completeness=1.0,
             amenity_count=3, budget_amount=5000000, turn_count=2, message_length=100),
        dict(sentiment="frustrated", sentiment_confidence=0.9, entity_completeness=0.5,
             amenity_count=1, budget_amount=None, turn_count=1, message_length=55),
        dict(sentiment="hesitant", sentiment_confidence=0.6, entity_completeness=0.75,
             amenity_count=2, budget_amount=3000000, turn_count=2, message_length=75),
    ]
    for ex in examples:
        print(json.dumps(compute_heuristic_score(**ex), indent=2))
        print("---")
