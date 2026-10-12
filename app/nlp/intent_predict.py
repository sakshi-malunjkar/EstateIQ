"""
Load the fine-tuned DistilBERT intent classifier from
models_artifacts/intent and predict the intent of a transcript.
Independent of sentiment_predict.py -- separate model, separate weights,
loaded and cached separately.

Usage:
    python app/nlp/intent_predict.py "Can we schedule a site visit this Saturday?"
"""

import argparse
import json
import re
from pathlib import Path

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

DEFAULT_MODEL_DIR = Path(__file__).parent.parent.parent / "models_artifacts" / "intent"

# Same reliability-flag convention as sentiment_confidence /
# sentiment_reliability in predict_lead_score.py.
LOW_CONFIDENCE_THRESHOLD = 0.50

_tokenizer = None
_model = None

# --- Rule-based override: an explicit "buy" from the customer beats the model ---------------
# The classifier sometimes answers "Rent" for a caller who plainly says they want to buy. The
# override looks only at the CLIENT's lines (an agent asking "are you looking to buy or rent?"
# is not the customer's intent) and ignores negated mentions ("not buying", "rent, not buy").
# If the customer positively mentions renting as well ("buy or rent"), it is genuinely
# ambiguous, so the model's answer stands.
_BUY_RE = re.compile(r"\b(?:buy|buying|purchase|purchasing|kharid\w*)\b", re.IGNORECASE)
_RENT_RE = re.compile(r"\b(?:rent|renting|rental|lease|leasing|kiraye|kiraya)\b", re.IGNORECASE)
# What, just before a mention, cancels it. "than"/"instead of" handle "buy rather than rent".
_NEGATION_RE = re.compile(r"(?:\bnot\b|n't\b|\bnever\b|\bno\b|\bthan\b|\binstead of\b|\bwithout\b)", re.IGNORECASE)
_NEGATION_WINDOW = 30  # characters before the mention to inspect
_CLIENT_PREFIXES = ("client:", "customer:", "user:")


def _client_text(text):
    """The customer's own words: lines starting "Client:" (or Customer:/User:). Plain text with no
    such structure is treated as all customer speech, like the rest of the pipeline."""
    lines = [ln.split(":", 1)[1].strip() for ln in text.splitlines() if ln.strip().lower().startswith(_CLIENT_PREFIXES)]
    return " ".join(lines) if lines else text


def _has_positive_mention(pattern, text):
    for m in pattern.finditer(text):
        before = text[max(0, m.start() - _NEGATION_WINDOW):m.start()]
        # only the current clause counts: "not looking to rent. I want to buy" must not cancel "buy"
        before = re.split(r"[.!?;]", before)[-1]
        if not _NEGATION_RE.search(before):
            return True
    return False


def rule_override_intent(text):
    """Return "Buy" when the customer clearly says they want to buy, else None."""
    client = _client_text(text)
    if _has_positive_mention(_BUY_RE, client) and not _has_positive_mention(_RENT_RE, client):
        return "Buy"
    return None


def _load(model_dir=DEFAULT_MODEL_DIR):
    global _tokenizer, _model
    if _model is None:
        _tokenizer = AutoTokenizer.from_pretrained(str(model_dir))
        _model = AutoModelForSequenceClassification.from_pretrained(str(model_dir))
        _model.eval()
    return _tokenizer, _model


@torch.no_grad()
def predict_intent(text, model_dir=DEFAULT_MODEL_DIR, max_length=256):
    """Return {"intent": <predicted label>, "confidence": <float 0-1>,
    "intent_reliability": "ok" or "low", "scores": {label: probability, ...}}
    for `text`."""
    tokenizer, model = _load(model_dir)
    id2label = model.config.id2label

    enc = tokenizer(text, truncation=True, max_length=max_length, return_tensors="pt")
    logits = model(**enc).logits[0]
    probs = torch.softmax(logits, dim=-1)

    pred_id = int(torch.argmax(probs).item())
    scores = {id2label[i]: float(probs[i]) for i in range(len(probs))}
    confidence = scores[id2label[pred_id]]

    result = {
        "intent": id2label[pred_id],
        "confidence": confidence,
        "intent_reliability": "low" if confidence < LOW_CONFIDENCE_THRESHOLD else "ok",
        "scores": scores,
        "intent_source": "model",
    }

    forced = rule_override_intent(text)
    if forced and forced in scores and forced != result["intent"]:
        # The model's own probabilities stay in `scores`; `model_intent` records what it said.
        # Confidence is the model's own probability for the forced label, so a rule that
        # contradicts a confident model still shows up as low-reliability instead of looking certain.
        result.update({
            "model_intent": result["intent"],
            "intent": forced,
            "confidence": scores[forced],
            "intent_reliability": "low" if scores[forced] < LOW_CONFIDENCE_THRESHOLD else "ok",
            "intent_source": "rule",
        })
    return result


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("text", nargs="?", default=(
        "Agent: Hello, welcome to our real estate assistant. How can I help you today?\n"
        "Client: I want to buy a 3BHK in Wakad, budget around 65 lakhs\n"
        "Agent: Sure, let me check that for you."
    ))
    ap.add_argument("--model-dir", default=str(DEFAULT_MODEL_DIR))
    args = ap.parse_args()

    print(json.dumps(predict_intent(args.text, model_dir=args.model_dir), indent=2, ensure_ascii=False))
