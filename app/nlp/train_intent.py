"""
Fine-tune a sequence-classification model on the EstateIQ intent data
produced by prepare_intent_data.py. Structurally identical to
train_sentiment.py (same base model, same in-memory best-checkpoint
callback to avoid disk pressure) -- kept as a fully separate script/model
rather than folding intent into the sentiment model, so the two stay
independently trainable and swappable.

Usage:
    python app/nlp/train_intent.py \
        --model distilbert-base-multilingual-cased \
        --data-dir data/intent \
        --out-dir models_artifacts/intent \
        --epochs 6
"""

import argparse
import json
import math
from pathlib import Path

import numpy as np
from datasets import Dataset
from sklearn.metrics import precision_recall_fscore_support
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    DataCollatorWithPadding,
    Trainer,
    TrainingArguments,
    set_seed,
)

from train_ner import BestModelInMemoryCallback


def load_jsonl(path):
    rows = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def build_tokenize_fn(tokenizer, label2id, max_length):
    def tokenize(batch):
        out = tokenizer(batch["text"], truncation=True, max_length=max_length)
        out["labels"] = [label2id[l] for l in batch["label"]]
        return out

    return tokenize


def build_compute_metrics(label_list):
    def compute_metrics(eval_pred):
        logits, labels = eval_pred
        preds = np.argmax(logits, axis=1)

        overall_p, overall_r, overall_f1, _ = precision_recall_fscore_support(
            labels, preds, average="macro", zero_division=0
        )
        metrics = {"precision": overall_p, "recall": overall_r, "f1": overall_f1}

        per_class_p, per_class_r, per_class_f1, per_class_support = precision_recall_fscore_support(
            labels, preds, labels=list(range(len(label_list))), zero_division=0
        )
        for i, label in enumerate(label_list):
            metrics[f"f1_{label}"] = per_class_f1[i]
        return metrics

    return compute_metrics


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="distilbert-base-multilingual-cased")
    ap.add_argument("--data-dir", default="data/intent")
    ap.add_argument("--out-dir", default="models_artifacts/intent")
    ap.add_argument("--epochs", type=float, default=6)
    ap.add_argument("--batch-size", type=int, default=16)
    ap.add_argument("--lr", type=float, default=2e-5)
    ap.add_argument("--max-length", type=int, default=256)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    set_seed(args.seed)
    data_dir = Path(args.data_dir)

    label_list = json.loads((data_dir / "label_list.json").read_text(encoding="utf-8"))
    label2id = {l: i for i, l in enumerate(label_list)}
    id2label = {i: l for i, l in enumerate(label_list)}

    train_rows = load_jsonl(data_dir / "train.jsonl")
    val_rows = load_jsonl(data_dir / "val.jsonl")
    print(f"train={len(train_rows)} val={len(val_rows)} labels={label_list}")

    train_ds = Dataset.from_list(train_rows)
    val_ds = Dataset.from_list(val_rows)

    tokenizer = AutoTokenizer.from_pretrained(args.model)
    tokenize_fn = build_tokenize_fn(tokenizer, label2id, args.max_length)

    train_ds = train_ds.map(tokenize_fn, batched=True, remove_columns=train_ds.column_names)
    val_ds = val_ds.map(tokenize_fn, batched=True, remove_columns=val_ds.column_names)

    model = AutoModelForSequenceClassification.from_pretrained(
        args.model,
        num_labels=len(label_list),
        id2label=id2label,
        label2id=label2id,
    )

    data_collator = DataCollatorWithPadding(tokenizer=tokenizer)

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    steps_per_epoch = math.ceil(len(train_rows) / args.batch_size)
    total_steps = int(steps_per_epoch * args.epochs)
    warmup_steps = int(0.1 * total_steps)

    training_args = TrainingArguments(
        output_dir=str(out_dir / "checkpoints"),
        eval_strategy="epoch",
        save_strategy="no",
        learning_rate=args.lr,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        num_train_epochs=args.epochs,
        weight_decay=0.01,
        warmup_steps=warmup_steps,
        logging_steps=20,
        report_to=[],
        seed=args.seed,
    )

    best_model_cb = BestModelInMemoryCallback()
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        data_collator=data_collator,
        processing_class=tokenizer,
        compute_metrics=build_compute_metrics(label_list),
        callbacks=[best_model_cb],
    )

    trainer.train()

    best_model_cb.restore_best(trainer.model)
    val_metrics = trainer.evaluate()
    print("Final validation metrics (best epoch, restored from memory):", val_metrics)

    trainer.save_model(str(out_dir))
    tokenizer.save_pretrained(str(out_dir))
    with open(out_dir / "label_list.json", "w", encoding="utf-8") as f:
        json.dump(label_list, f, indent=2)
    with open(out_dir / "val_metrics.json", "w", encoding="utf-8") as f:
        json.dump(val_metrics, f, indent=2)

    print(f"Model saved to {out_dir}")


if __name__ == "__main__":
    main()
