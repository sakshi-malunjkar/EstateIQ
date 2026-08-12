"""
Evaluate a fine-tuned NER model (saved by train_ner.py) on the held-out
test split. Reports overall precision/recall/F1 plus a per-entity-type
breakdown (seqeval, entity-level).

Usage:
    python app/nlp/evaluate_ner.py \
        --model-dir models_artifacts/muril_ner \
        --data-dir data/ner_bio
"""

import argparse
import json
from pathlib import Path

import numpy as np
import torch
from seqeval.metrics import classification_report, f1_score, precision_score, recall_score
from transformers import AutoModelForTokenClassification, AutoTokenizer

# The 6 entity types the project cares about (per spec). Any of these
# absent from the training data's label list are reported as N/A rather
# than a fabricated 0.00, since the model was never given examples to learn.
TRACKED_ENTITIES = ["LOCATION", "PROPERTY_TYPE", "BUDGET", "AMENITY", "BHK", "FURNISHING"]


def load_jsonl(path):
    rows = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


@torch.no_grad()
def predict_tags(model, tokenizer, tokens_list, max_length=192, batch_size=16):
    model.eval()
    id2label = model.config.id2label
    all_pred_tags = []

    for start in range(0, len(tokens_list), batch_size):
        batch_tokens = tokens_list[start:start + batch_size]
        enc = tokenizer(
            batch_tokens,
            is_split_into_words=True,
            truncation=True,
            max_length=max_length,
            padding=True,
            return_tensors="pt",
        )
        logits = model(**enc).logits
        preds = torch.argmax(logits, dim=-1).cpu().numpy()

        for i, tokens in enumerate(batch_tokens):
            word_ids = enc.word_ids(batch_index=i)
            tags = ["O"] * len(tokens)
            seen = set()
            for j, word_id in enumerate(word_ids):
                if word_id is None or word_id in seen:
                    continue
                seen.add(word_id)
                tags[word_id] = id2label[int(preds[i][j])]
            all_pred_tags.append(tags)

    return all_pred_tags


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model-dir", default="models_artifacts/muril_ner")
    ap.add_argument("--data-dir", default="data/ner_bio")
    ap.add_argument("--split", default="test")
    args = ap.parse_args()

    model_dir = Path(args.model_dir)
    tokenizer = AutoTokenizer.from_pretrained(str(model_dir))
    model = AutoModelForTokenClassification.from_pretrained(str(model_dir))

    rows = load_jsonl(Path(args.data_dir) / f"{args.split}.jsonl")
    tokens_list = [r["tokens"] for r in rows]
    gold_tags = [r["ner_tags"] for r in rows]

    pred_tags = predict_tags(model, tokenizer, tokens_list)

    overall = {
        "precision": precision_score(gold_tags, pred_tags),
        "recall": recall_score(gold_tags, pred_tags),
        "f1": f1_score(gold_tags, pred_tags),
        "num_examples": len(rows),
    }

    report_dict = classification_report(gold_tags, pred_tags, output_dict=True, zero_division=0)

    trained_labels = set(model.config.label2id.keys())
    per_entity = {}
    for ent in TRACKED_ENTITIES:
        has_label = any(t.endswith(ent) for t in trained_labels)
        if not has_label:
            per_entity[ent] = {"precision": None, "recall": None, "f1": None, "support": 0,
                                "note": "no training examples for this entity type"}
        elif ent in report_dict:
            r = report_dict[ent]
            per_entity[ent] = {"precision": float(r["precision"]), "recall": float(r["recall"]),
                                "f1": float(r["f1-score"]), "support": int(r["support"])}
        else:
            per_entity[ent] = {"precision": 0.0, "recall": 0.0, "f1": 0.0, "support": 0,
                                "note": "no occurrences in this split"}

    result = {"overall": overall, "per_entity": per_entity}

    print(f"\n=== {args.split} set ({len(rows)} examples) ===")
    print(f"Overall  P={overall['precision']:.4f}  R={overall['recall']:.4f}  F1={overall['f1']:.4f}\n")
    print(f"{'Entity':15s} {'Precision':>10s} {'Recall':>10s} {'F1':>10s} {'Support':>8s}")
    for ent, m in per_entity.items():
        if m["precision"] is None:
            print(f"{ent:15s} {'N/A':>10s} {'N/A':>10s} {'N/A':>10s} {0:>8d}  ({m['note']})")
        else:
            print(f"{ent:15s} {m['precision']:>10.4f} {m['recall']:>10.4f} {m['f1']:>10.4f} {m['support']:>8d}")

    out_path = model_dir / f"{args.split}_report.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    print(f"\nFull report written to {out_path}")


if __name__ == "__main__":
    main()
