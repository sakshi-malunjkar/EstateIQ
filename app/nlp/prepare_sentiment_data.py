"""
Prepare sentiment classification data from data/synthetic/transcripts_full.json
(each record already has a "sentiment" label) and split into train/val/test
JSONL files, HuggingFace-ready.

Uses the identical seed/shuffle convention as prepare_ner_data.py, and this
file has the same 700 dialogues in the same order as the NER export, so the
train/val/test assignment lines up 1:1 with the NER split -- no dialogue
that's in the NER train set ends up in the sentiment test set, or vice versa.

Output: data/sentiment/{train,val,test}.jsonl, one example per line:
        {"text": "...", "label": "enthusiastic"}
        data/sentiment/label_list.json — sorted list of sentiment labels.
"""

import argparse
import json
import random
from collections import Counter
from pathlib import Path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default="data/synthetic/transcripts_full.json")
    ap.add_argument("--out-dir", default="data/sentiment")
    ap.add_argument("--train-frac", type=float, default=0.8)
    ap.add_argument("--val-frac", type=float, default=0.1)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    with open(args.input, encoding="utf-8") as f:
        records = json.load(f)

    skipped = 0
    examples = []
    for r in records:
        text = r.get("transcript", "")
        label = r.get("sentiment")
        if not text.strip() or not label:
            skipped += 1
            continue
        examples.append({"text": text, "label": label})
    print(f"Loaded {len(examples)} labeled transcripts ({skipped} skipped: missing text/label).")

    label_counter = Counter(ex["label"] for ex in examples)
    label_list = sorted(label_counter)
    print("Sentiment distribution:", dict(label_counter))

    random.seed(args.seed)
    indices = list(range(len(examples)))
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
        counts = Counter(examples[i]["label"] for i in idxs)
        with open(path, "w", encoding="utf-8") as f:
            for i in idxs:
                f.write(json.dumps(examples[i], ensure_ascii=False) + "\n")
        print(f"  {name}: {len(idxs)} examples -> {path}  {dict(counts)}")

    print(f"Splitting {n} examples: train/val/test = {len(train_idx)}/{len(val_idx)}/{len(test_idx)}")
    write_split("train", train_idx)
    write_split("val", val_idx)
    write_split("test", test_idx)

    with open(out_dir / "label_list.json", "w", encoding="utf-8") as f:
        json.dump(label_list, f, indent=2)
    print(f"Label list ({len(label_list)} classes) -> {out_dir / 'label_list.json'}")


if __name__ == "__main__":
    main()
