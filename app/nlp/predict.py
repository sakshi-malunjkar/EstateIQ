"""
Load the fine-tuned MuRIL NER model from models_artifacts/muril_ner and
extract entities from a raw transcript string.

Returns the same shape as rule_extractor.extract_all() — {location,
property_type, amenities, budget} — so it's a drop-in replacement. The
model also recognizes BHK (and would recognize FURNISHING if the training
data had any), but those aren't part of rule_extractor's output shape, so
they're left out of the returned dict; use predict_raw_entities() if you
want everything the model found, BHK included.

Usage:
    python app/nlp/predict.py "Namaste, mujhe ek 2BHK chahiye Baner mein, budget 50 lakhs, swimming pool chahiye"
"""

import argparse
import json
import sys
from pathlib import Path

import torch
from transformers import AutoModelForTokenClassification, AutoTokenizer

sys.path.insert(0, str(Path(__file__).parent))
from prepare_ner_data import tokenize_with_offsets  # same word tokenizer used for training

DEFAULT_MODEL_DIR = Path(__file__).parent.parent.parent / "models_artifacts" / "muril_ner"

_tokenizer = None
_model = None


def _load(model_dir=DEFAULT_MODEL_DIR):
    global _tokenizer, _model
    if _model is None:
        _tokenizer = AutoTokenizer.from_pretrained(str(model_dir))
        _model = AutoModelForTokenClassification.from_pretrained(str(model_dir))
        _model.eval()
    return _tokenizer, _model


@torch.no_grad()
def predict_raw_entities(text, model_dir=DEFAULT_MODEL_DIR, max_length=192):
    """Run the NER model on `text` and return every detected entity as a
    list of {text, label, start, end} spans (char offsets into `text`).

    Mirrors training exactly: text is split into words with the same
    tokenizer used to build the BIO training data, and only the *first*
    subword of each word is read for its predicted label (continuation
    subwords were never supervised during training, so their own
    predictions are meaningless and must be ignored here too) — then
    adjacent words are merged on B-/I- boundaries into whole entities.
    """
    tokenizer, model = _load(model_dir)
    id2label = model.config.id2label

    words, word_offsets = tokenize_with_offsets(text)
    if not words:
        return []

    enc = tokenizer(
        words,
        is_split_into_words=True,
        truncation=True,
        max_length=max_length,
        return_tensors="pt",
    )
    word_ids = enc.word_ids(batch_index=0)
    logits = model(**enc).logits
    pred_ids = torch.argmax(logits, dim=-1)[0].tolist()

    # one predicted tag per word, taken from that word's first subword
    word_tags = [None] * len(words)
    seen = set()
    for tok_idx, word_id in enumerate(word_ids):
        if word_id is None or word_id in seen:
            continue
        seen.add(word_id)
        word_tags[word_id] = id2label[pred_ids[tok_idx]]

    entities = []
    current = None
    for word_idx, tag in enumerate(word_tags):
        start, end = word_offsets[word_idx]
        if tag is None or tag == "O":
            if current:
                entities.append(current)
                current = None
            continue

        prefix, label = tag.split("-", 1)
        if prefix == "B" or current is None or current["label"] != label:
            if current:
                entities.append(current)
            current = {"text": text[start:end], "label": label, "start": start, "end": end}
        else:  # "I-" continuing the same entity
            current["text"] = text[current["start"]:end]
            current["end"] = end

    if current:
        entities.append(current)
    return entities


def extract_all(text, model_dir=DEFAULT_MODEL_DIR):
    """Same shape as rule_extractor.extract_all():
    {"location": [...], "property_type": [...], "amenities": [...], "budget": str|None}
    """
    entities = predict_raw_entities(text, model_dir=model_dir)

    location = [e["text"] for e in entities if e["label"] == "LOCATION"]
    property_type = [e["text"] for e in entities if e["label"] == "PROPERTY_TYPE"]
    amenities = [e["text"] for e in entities if e["label"] == "AMENITY"]
    budgets = [e["text"] for e in entities if e["label"] == "BUDGET"]

    return {
        "location": location,
        "property_type": property_type,
        "amenities": amenities,
        "budget": budgets[0] if budgets else None,
    }


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("text", nargs="?",
                     default="Namaste, mujhe ek 2BHK chahiye Baner mein, budget 50 lakhs, swimming pool chahiye")
    ap.add_argument("--model-dir", default=str(DEFAULT_MODEL_DIR))
    ap.add_argument("--raw", action="store_true", help="print all detected entities (incl. BHK) instead")
    args = ap.parse_args()

    if args.raw:
        print(json.dumps(predict_raw_entities(args.text, model_dir=args.model_dir), indent=2, ensure_ascii=False))
    else:
        print(json.dumps(extract_all(args.text, model_dir=args.model_dir), indent=2, ensure_ascii=False))
