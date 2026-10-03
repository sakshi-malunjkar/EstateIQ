"""
Load the fine-tuned MuRIL NER model from models_artifacts/muril_ner and
extract entities from a raw transcript string.

Returns the same shape as rule_extractor.extract_all() — {location,
property_type, amenities, budget} — so it's a drop-in replacement. BHK
spans (e.g. "2BHK", "3BHK") are merged into property_type alongside
PROPERTY_TYPE spans (e.g. "Villa"), since BHK is effectively a
property-type detail and rule_extractor's PROPERTY_TYPE list already
mixes configuration with type. FURNISHING would appear here too if the
training data had had any labeled examples for it; use
predict_raw_entities() if you want the untouched per-label breakdown.

Usage:
    python app/nlp/predict.py "Namaste, mujhe ek 2BHK chahiye Baner mein, budget 50 lakhs, swimming pool chahiye"
"""

import argparse
import json
import re
import sys
from pathlib import Path

import torch
from transformers import AutoModelForTokenClassification, AutoTokenizer

sys.path.insert(0, str(Path(__file__).parent))
from prepare_ner_data import tokenize_with_offsets  # same word tokenizer used for training

DEFAULT_MODEL_DIR = Path(__file__).parent.parent.parent / "models_artifacts" / "muril_ner"

_tokenizer = None
_model = None

# Speech-to-text (e.g. Vapi) spells out "2BHK" as "2 B H K" / "2 b h k", and
# sometimes mishears the K as G ("2 BHG"). The NER model only ever saw the
# compact "2BHK" form in training, so collapse these before it runs.
_BHK_SPACED = re.compile(r"\b(\d)\s*B\s*\.?\s*H\s*\.?\s*[KG]\b", re.IGNORECASE)

# Trailing city names the model tends to glue onto a locality span
# ("College Road Nashik"); stripped so only the locality remains.
_CITY_SUFFIXES = ("Nashik", "Pune")


def normalize_transcript(text):
    """Collapse spelled-out BHK variants ("2 B H K", "2 b h k", "2 BHG",
    "2 BHK") to "2BHK". Entity offsets from predict_raw_entities() refer
    to this normalized text, not the caller's original string."""
    return _BHK_SPACED.sub(lambda m: f"{m.group(1)}BHK", text)


_TURN_PREFIX = re.compile(r"^\s*(agent|client)\s*:\s*", re.IGNORECASE)


def client_only_text(text):
    """Keep only what the client said. Agents list example areas and
    amenities that the client never asked for, so those must not be
    extracted as the client's requirements.

    A line starting "Client:" opens a client turn and "Agent:" closes it;
    unprefixed lines continue whichever turn is open. Text with no
    Agent:/Client: markers (a bare freeform string) is returned unchanged,
    as is a transcript with no Client: turns at all."""
    kept = []
    speaker = None
    saw_marker = False
    for line in text.splitlines():
        m = _TURN_PREFIX.match(line)
        if m:
            saw_marker = True
            speaker = m.group(1).lower()
            line = line[m.end():]
        if speaker == "client" or speaker is None:
            kept.append(line)
    if not saw_marker or not any(l.strip() for l in kept):
        return text
    return " ".join(kept)


def _dedupe(items):
    """Order-preserving, case-insensitive de-duplication."""
    seen = set()
    out = []
    for item in items:
        key = item.strip().lower()
        if key and key not in seen:
            seen.add(key)
            out.append(item)
    return out


def _strip_city_suffix(location):
    for city in _CITY_SUFFIXES:
        m = re.fullmatch(rf"(.+?)\s+{city}", location, re.IGNORECASE)
        if m:
            return m.group(1)
    return location


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

    text = normalize_transcript(text)
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
    entities = predict_raw_entities(client_only_text(text), model_dir=model_dir)

    locations = [_strip_city_suffix(e["text"]) for e in entities if e["label"] == "LOCATION"]
    # Several areas usually means the agent listed examples; the client's
    # actual preference is most likely the last one mentioned.
    location = locations[-1:]
    property_type = _dedupe(e["text"] for e in entities if e["label"] in ("PROPERTY_TYPE", "BHK"))
    amenities = _dedupe(e["text"] for e in entities if e["label"] == "AMENITY")
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
