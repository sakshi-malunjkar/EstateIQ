"""
Convert a Label Studio NER export into BIO-tagged token sequences suitable
for HuggingFace `transformers` token-classification training, and split
into train/val/test JSONL files.

Input:  Label Studio JSON export (list of "tasks"), each with
        data.text and annotations[0].result[*].value = {start, end, text, labels}

Output: data/ner_bio/{train,val,test}.jsonl, one example per line:
        {"tokens": [...], "ner_tags": ["O", "B-LOCATION", ...]}
        data/ner_bio/label_list.json — sorted list of all BIO tags seen in the data.
"""

import argparse
import json
import random
import re
from collections import Counter
from pathlib import Path

# Simple word/punctuation tokenizer that keeps char offsets, so entity
# spans (which are tight around word boundaries in this export) line up
# cleanly with token boundaries. \w+ keeps alnum runs (handles "1RK",
# "3BHK", devanagari/latin words) together; everything else is split
# character-by-character as its own token.
TOKEN_RE = re.compile(r"\w+|[^\w\s]", re.UNICODE)


def tokenize_with_offsets(text):
    tokens, offsets = [], []
    for m in TOKEN_RE.finditer(text):
        tokens.append(m.group())
        offsets.append((m.start(), m.end()))
    return tokens, offsets


def spans_to_bio(text, entities):
    """entities: list of (start, end, label), possibly unsorted/non-overlapping."""
    tokens, offsets = tokenize_with_offsets(text)
    tags = ["O"] * len(tokens)

    entities = sorted(entities, key=lambda e: e[0])
    misaligned = 0
    for start, end, label in entities:
        first = True
        matched_any = False
        for i, (tok_s, tok_e) in enumerate(offsets):
            if tok_e <= start or tok_s >= end:
                continue
            # token overlaps the entity span
            if tok_s < start or tok_e > end:
                misaligned += 1
            matched_any = True
            tags[i] = f"B-{label}" if first else f"I-{label}"
            first = False
        if not matched_any:
            misaligned += 1
    return tokens, tags, misaligned


def load_label_studio_export(path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    examples = []
    skipped = 0
    for task in data:
        anns = task.get("annotations", [])
        if not anns or anns[0].get("was_cancelled"):
            skipped += 1
            continue
        text = task.get("data", {}).get("text", "")
        if not text.strip():
            skipped += 1
            continue
        entities = []
        for r in anns[0].get("result", []):
            v = r.get("value", {})
            labels = v.get("labels") or []
            if not labels:
                continue
            entities.append((v["start"], v["end"], labels[0]))
        examples.append({"text": text, "entities": entities})
    return examples, skipped


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default="data/annotated/project-1-at-2026-08-12-00-10-ee06d985.json")
    ap.add_argument("--out-dir", default="data/ner_bio")
    ap.add_argument("--train-frac", type=float, default=0.8)
    ap.add_argument("--val-frac", type=float, default=0.1)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    examples, skipped = load_label_studio_export(args.input)
    print(f"Loaded {len(examples)} annotated tasks ({skipped} skipped: cancelled/empty).")

    bio_examples = []
    total_misaligned = 0
    for ex in examples:
        tokens, tags, misaligned = spans_to_bio(ex["text"], ex["entities"])
        total_misaligned += misaligned
        bio_examples.append({"tokens": tokens, "ner_tags": tags})
    print(f"Token/entity-boundary misalignments: {total_misaligned} (0 expected for clean exports).")

    label_counter = Counter(tag for ex in bio_examples for tag in ex["ner_tags"])
    label_list = sorted(label_counter, key=lambda t: (t != "O", t))
    print("BIO tag distribution:", dict(label_counter))

    random.seed(args.seed)
    indices = list(range(len(bio_examples)))
    random.shuffle(indices)

    n = len(indices)
    n_train = int(n * args.train_frac)
    n_val = int(n * args.val_frac)
    train_idx = indices[:n_train]
    val_idx = indices[n_train:n_train + n_val]
    test_idx = indices[n_train + n_val:]

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    def write_split(name, idxs):
        path = out_dir / f"{name}.jsonl"
        with open(path, "w", encoding="utf-8") as f:
            for i in idxs:
                f.write(json.dumps(bio_examples[i], ensure_ascii=False) + "\n")
        print(f"  {name}: {len(idxs)} examples -> {path}")

    print(f"Splitting {n} examples: train/val/test = {len(train_idx)}/{len(val_idx)}/{len(test_idx)}")
    write_split("train", train_idx)
    write_split("val", val_idx)
    write_split("test", test_idx)

    with open(out_dir / "label_list.json", "w", encoding="utf-8") as f:
        json.dump(label_list, f, indent=2)
    print(f"Label list ({len(label_list)} tags) -> {out_dir / 'label_list.json'}")


if __name__ == "__main__":
    main()
