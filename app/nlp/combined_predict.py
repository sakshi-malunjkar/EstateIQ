"""
Combined NER + sentiment prediction for a transcript string -- wires
predict.py (MuRIL NER) and sentiment_predict.py (DistilBERT sentiment)
together into a single call, since a real caller (dashboard, downstream
pipeline) generally wants both signals from one transcript at once
rather than loading two models separately.

Output shape: rule_extractor's {location, property_type, amenities,
budget} plus sentiment, sentiment_confidence, and sentiment_scores.

See LIMITATIONS.md before trusting either model on real (non-templated)
transcripts -- in particular, the sentiment model can misread calm,
multi-clause enthusiastic phrasing as hesitant.

Usage:
    python app/nlp/combined_predict.py "Namaste, mujhe ek 2BHK chahiye Baner mein, budget 50 lakhs, swimming pool chahiye. This sounds great!"
"""

import argparse
import json

from predict import extract_all
from sentiment_predict import predict_sentiment


def predict_combined(text, ner_model_dir=None, sentiment_model_dir=None):
    """Run both models on `text` and merge their outputs into one dict."""
    ner_kwargs = {"model_dir": ner_model_dir} if ner_model_dir else {}
    sentiment_kwargs = {"model_dir": sentiment_model_dir} if sentiment_model_dir else {}

    entities = extract_all(text, **ner_kwargs)
    sentiment_result = predict_sentiment(text, **sentiment_kwargs)

    return {
        **entities,
        "sentiment": sentiment_result["sentiment"],
        "sentiment_confidence": sentiment_result["confidence"],
        "sentiment_scores": sentiment_result["scores"],
    }


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("text", nargs="?", default=(
        "Agent: Hello, welcome to our real estate assistant. How can I help you today?\n"
        "Client: Namaste, mujhe ek 2BHK chahiye Baner mein, budget 50 lakhs, swimming pool chahiye\n"
        "Agent: Sure, let me check 2BHK options in Baner with Swimming Pool.\n"
        "Client: This sounds great!"
    ))
    ap.add_argument("--ner-model-dir", default=None)
    ap.add_argument("--sentiment-model-dir", default=None)
    args = ap.parse_args()

    result = predict_combined(args.text, ner_model_dir=args.ner_model_dir, sentiment_model_dir=args.sentiment_model_dir)
    print(json.dumps(result, indent=2, ensure_ascii=False))
