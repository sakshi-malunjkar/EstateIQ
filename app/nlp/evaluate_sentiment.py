"""
Evaluate a fine-tuned sentiment classifier (saved by train_sentiment.py) on
the held-out test split. Reports overall (macro) precision/recall/F1 plus
a per-class breakdown.

Usage:
    python app/nlp/evaluate_sentiment.py \
        --model-dir models_artifacts/sentiment \
        --data-dir data/sentiment
"""

import argparse
import json
from pathlib import Path

import torch
from sklearn.metrics import precision_recall_fscore_support
from transformers import AutoModelForSequenceClassification, AutoTokenizer


def load_jsonl(path):
    rows = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


@torch.no_grad()
def predict_labels(model, tokenizer, texts, max_length=256, batch_size=16):
    model.eval()
    id2label = model.config.id2label
    preds = []
    for start in range(0, len(texts), batch_size):
        batch = texts[start:start + batch_size]
        enc = tokenizer(batch, truncation=True, max_length=max_length, padding=True, return_tensors="pt")
        logits = model(**enc).logits
        pred_ids = torch.argmax(logits, dim=-1).tolist()
        preds.extend(id2label[i] for i in pred_ids)
    return preds


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model-dir", default="models_artifacts/sentiment")
    ap.add_argument("--data-dir", default="data/sentiment")
    ap.add_argument("--split", default="test")
    args = ap.parse_args()

    model_dir = Path(args.model_dir)
    tokenizer = AutoTokenizer.from_pretrained(str(model_dir))
    model = AutoModelForSequenceClassification.from_pretrained(str(model_dir))
    label_list = json.loads((Path(args.data_dir) / "label_list.json").read_text(encoding="utf-8"))

    rows = load_jsonl(Path(args.data_dir) / f"{args.split}.jsonl")
    texts = [r["text"] for r in rows]
    gold = [r["label"] for r in rows]

    pred = predict_labels(model, tokenizer, texts)

    overall_p, overall_r, overall_f1, _ = precision_recall_fscore_support(
        gold, pred, average="macro", zero_division=0, labels=label_list
    )
    overall = {"precision": float(overall_p), "recall": float(overall_r), "f1": float(overall_f1),
               "num_examples": len(rows)}

    per_class_p, per_class_r, per_class_f1, per_class_support = precision_recall_fscore_support(
        gold, pred, labels=label_list, zero_division=0
    )
    per_class = {
        label: {"precision": float(per_class_p[i]), "recall": float(per_class_r[i]),
                "f1": float(per_class_f1[i]), "support": int(per_class_support[i])}
        for i, label in enumerate(label_list)
    }

    result = {"overall": overall, "per_class": per_class}

    print(f"\n=== {args.split} set ({len(rows)} examples) ===")
    print(f"Overall (macro)  P={overall['precision']:.4f}  R={overall['recall']:.4f}  F1={overall['f1']:.4f}\n")
    print(f"{'Class':15s} {'Precision':>10s} {'Recall':>10s} {'F1':>10s} {'Support':>8s}")
    for label, m in per_class.items():
        print(f"{label:15s} {m['precision']:>10.4f} {m['recall']:>10.4f} {m['f1']:>10.4f} {m['support']:>8d}")

    out_path = model_dir / f"{args.split}_report.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    print(f"\nFull report written to {out_path}")


if __name__ == "__main__":
    main()
