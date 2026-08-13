"""
Load the fine-tuned DistilBERT sentiment classifier from
models_artifacts/sentiment and predict the sentiment of a transcript.

Usage:
    python app/nlp/sentiment_predict.py "Client: Hmm, let me think about it."
"""

import argparse
import json
from pathlib import Path

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

DEFAULT_MODEL_DIR = Path(__file__).parent.parent.parent / "models_artifacts" / "sentiment"

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
def predict_sentiment(text, model_dir=DEFAULT_MODEL_DIR, max_length=256):
    """Return {"sentiment": <predicted label>, "confidence": <float 0-1>,
    "scores": {label: probability, ...}} for `text`."""
    tokenizer, model = _load(model_dir)
    id2label = model.config.id2label

    enc = tokenizer(text, truncation=True, max_length=max_length, return_tensors="pt")
    logits = model(**enc).logits[0]
    probs = torch.softmax(logits, dim=-1)

    pred_id = int(torch.argmax(probs).item())
    scores = {id2label[i]: float(probs[i]) for i in range(len(probs))}

    return {
        "sentiment": id2label[pred_id],
        "confidence": scores[id2label[pred_id]],
        "scores": scores,
    }


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("text", nargs="?", default=(
        "Agent: Hello, welcome to our real estate assistant. How can I help you today?\n"
        "Client: I want to buy a 3BHK, budget around 65 lakhs\n"
        "Agent: Sure, let me check 3BHK options in Wagholi with Clubhouse, Garden, Lift.\n"
        "Client: This sounds great!"
    ))
    ap.add_argument("--model-dir", default=str(DEFAULT_MODEL_DIR))
    args = ap.parse_args()

    print(json.dumps(predict_sentiment(args.text, model_dir=args.model_dir), indent=2, ensure_ascii=False))
