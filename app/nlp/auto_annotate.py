import json
import re

def find_span(text, value):
    """Find the start/end character position of `value` inside `text`."""
    if not value:
        return None
    idx = text.find(value)
    if idx == -1:
        return None
    return {"start": idx, "end": idx + len(value), "text": value}

def is_bhk(value):
    """1RK, 1BHK, 2BHK, 3BHK, 4BHK -> BHK label. Others -> PROPERTY_TYPE."""
    return bool(re.match(r'^\d+(RK|BHK)$', value, re.IGNORECASE))

def make_result(span, label):
    return {
        "value": {
            "start": span["start"],
            "end": span["end"],
            "text": span["text"],
            "labels": [label]
        },
        "from_name": "label",
        "to_name": "text",
        "type": "labels"
    }

def annotate_transcript(item):
    text = item["transcript"]
    results = []

    # Location
    loc_span = find_span(text, item.get("location"))
    if loc_span:
        results.append(make_result(loc_span, "LOCATION"))

    # Property type / BHK
    ptype = item.get("property_type")
    if ptype:
        ptype_span = find_span(text, ptype)
        if ptype_span:
            label = "BHK" if is_bhk(ptype) else "PROPERTY_TYPE"
            results.append(make_result(ptype_span, label))

    # Budget
    budget_span = find_span(text, item.get("budget"))
    if budget_span:
        results.append(make_result(budget_span, "BUDGET"))

    # Amenities (multiple)
    for amenity in item.get("amenities", []):
        am_span = find_span(text, amenity)
        if am_span:
            results.append(make_result(am_span, "AMENITY"))

    return {
        "data": {"text": text},
        "annotations": [{"result": results}]
    }

def main():
    with open("data/synthetic/transcripts_full.json", encoding="utf-8") as f:
        data = json.load(f)

    annotated = [annotate_transcript(item) for item in data]

    with open("data/synthetic/transcripts_auto_annotated.json", "w", encoding="utf-8") as f:
        json.dump(annotated, f, indent=2, ensure_ascii=False)

    # Quick stats
    total_entities = sum(len(a["annotations"][0]["result"]) for a in annotated)
    missed = sum(1 for a in annotated if len(a["annotations"][0]["result"]) == 0)
    print(f"Auto-annotated {len(annotated)} transcripts")
    print(f"Total entity spans found: {total_entities}")
    print(f"Transcripts with ZERO matches (needs review): {missed}")

if __name__ == "__main__":
    main()