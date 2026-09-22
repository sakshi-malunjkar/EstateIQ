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
from pathlib import Path

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

DEFAULT_MODEL_DIR = Path(__file__).parent.parent.parent / "models_artifacts" / "intent"

# Same reliability-flag convention as sentiment_confidence /
# sentiment_reliability in predict_lead_score.py.
LOW_CONFIDENCE_THRESHOLD = 0.50

_tokenizer = None
_model = None


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

    return {
        "intent": id2label[pred_id],
        "confidence": confidence,
        "intent_reliability": "low" if confidence < LOW_CONFIDENCE_THRESHOLD else "ok",
        "scores": scores,
    }


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
