"""
Fine-tune a token-classification (NER) model on the BIO-tagged EstateIQ
transcript data produced by prepare_ner_data.py.

Usage:
    python app/nlp/train_ner.py \
        --model google/muril-base-cased \
        --data-dir data/ner_bio \
        --out-dir models_artifacts/muril_ner \
        --epochs 8
"""

import argparse
import copy
import json
import math
from collections import Counter
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from datasets import Dataset
from seqeval.metrics import classification_report, f1_score, precision_score, recall_score
from transformers import (
    AutoModelForTokenClassification,
    AutoTokenizer,
    DataCollatorForTokenClassification,
    Trainer,
    TrainerCallback,
    TrainingArguments,
    set_seed,
)


class BestModelInMemoryCallback(TrainerCallback):
    """Keeps the best-eval-F1 model weights in RAM instead of writing a
    checkpoint to disk after every epoch (disk on this machine is tight;
    a full MuRIL copy is ~1.8GB). Restore with `restore_best(trainer)`
    after training finishes."""

    def __init__(self):
        self.best_f1 = -1.0
        self.best_state_dict = None
        self.best_epoch = None

    def on_evaluate(self, args, state, control, metrics=None, model=None, **kwargs):
        f1 = (metrics or {}).get("eval_f1")
        if f1 is not None and f1 > self.best_f1:
            self.best_f1 = f1
            self.best_epoch = metrics.get("epoch")
            self.best_state_dict = copy.deepcopy({k: v.cpu() for k, v in model.state_dict().items()})

    def restore_best(self, model):
        if self.best_state_dict is not None:
            model.load_state_dict(self.best_state_dict)
            print(f"Restored best checkpoint: epoch={self.best_epoch} eval_f1={self.best_f1:.4f}")
        return model


def compute_class_weights(train_rows, label2id):
    """Inverse-frequency class weights (sklearn 'balanced' style) so the
    ~92%-'O' imbalance in this BIO data doesn't drown out the rare entity
    classes during training."""
    counts = Counter(tag for r in train_rows for tag in r["ner_tags"])
    n_labels = len(label2id)
    n_samples = sum(counts.values())
    weights = torch.ones(n_labels, dtype=torch.float32)
    for label, idx in label2id.items():
        c = counts.get(label, 0)
        if c > 0:
            weights[idx] = n_samples / (n_labels * c)
    print("Class weights:", {l: round(weights[i].item(), 3) for l, i in label2id.items()})
    return weights


class WeightedLossTrainer(Trainer):
    """Trainer that applies class-weighted cross-entropy instead of the
    model's default unweighted loss, to counter the O-tag imbalance."""

    def __init__(self, *args, class_weights=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.class_weights = class_weights

    def compute_loss(self, model, inputs, return_outputs=False, **kwargs):
        labels = inputs.pop("labels")
        outputs = model(**inputs)
        logits = outputs.logits
        loss_fct = nn.CrossEntropyLoss(weight=self.class_weights.to(logits.device), ignore_index=-100)
        loss = loss_fct(logits.view(-1, logits.shape[-1]), labels.view(-1))
        return (loss, outputs) if return_outputs else loss


def load_jsonl(path):
    rows = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def build_tokenize_fn(tokenizer, label2id, max_length):
    def tokenize_and_align(batch):
        tokenized = tokenizer(
            batch["tokens"],
            is_split_into_words=True,
            truncation=True,
            max_length=max_length,
        )
        all_labels = []
        for i, tags in enumerate(batch["ner_tags"]):
            word_ids = tokenized.word_ids(batch_index=i)
            label_ids = []
            prev_word_id = None
            for word_id in word_ids:
                if word_id is None:
                    label_ids.append(-100)
                elif word_id != prev_word_id:
                    label_ids.append(label2id[tags[word_id]])
                else:
                    # subsequent subword of the same word: keep it out of
                    # the loss (avoids double-counting B-/I- boundaries)
                    label_ids.append(-100)
                prev_word_id = word_id
            all_labels.append(label_ids)
        tokenized["labels"] = all_labels
        return tokenized

    return tokenize_and_align


def build_compute_metrics(id2label):
    def compute_metrics(eval_pred):
        predictions, labels = eval_pred
        predictions = np.argmax(predictions, axis=2)

        true_predictions = [
            [id2label[p] for p, l in zip(pred_row, label_row) if l != -100]
            for pred_row, label_row in zip(predictions, labels)
        ]
        true_labels = [
            [id2label[l] for p, l in zip(pred_row, label_row) if l != -100]
            for pred_row, label_row in zip(predictions, labels)
        ]

        return {
            "precision": precision_score(true_labels, true_predictions),
            "recall": recall_score(true_labels, true_predictions),
            "f1": f1_score(true_labels, true_predictions),
        }

    return compute_metrics


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="google/muril-base-cased")
    ap.add_argument("--data-dir", default="data/ner_bio")
    ap.add_argument("--out-dir", default="models_artifacts/muril_ner")
    ap.add_argument("--epochs", type=float, default=12)
    ap.add_argument("--batch-size", type=int, default=8)
    ap.add_argument("--lr", type=float, default=5e-5)
    ap.add_argument("--max-length", type=int, default=192)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--no-class-weights", action="store_true",
                     help="disable class-weighted loss (default: on, to counter the ~92%% O-tag imbalance)")
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

    model = AutoModelForTokenClassification.from_pretrained(
        args.model,
        num_labels=len(label_list),
        id2label=id2label,
        label2id=label2id,
    )

    data_collator = DataCollatorForTokenClassification(tokenizer=tokenizer)

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # TrainingArguments in this transformers version dropped warmup_ratio
    # (only warmup_steps remains), so compute the equivalent 10%-of-training
    # step count by hand.
    steps_per_epoch = math.ceil(len(train_rows) / args.batch_size)
    total_steps = int(steps_per_epoch * args.epochs)
    warmup_steps = int(0.1 * total_steps)

    training_args = TrainingArguments(
        output_dir=str(out_dir / "checkpoints"),
        eval_strategy="epoch",
        # Disk is tight on this machine and a full MuRIL copy is ~1.8GB;
        # saving a checkpoint every epoch (plus the final save) risks
        # running out of space mid-write. We still get per-epoch eval
        # metrics for progress tracking, just no on-disk checkpoints
        # until the single explicit save at the end of this script.
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

    class_weights = None if args.no_class_weights else compute_class_weights(train_rows, label2id)
    trainer_cls = Trainer if args.no_class_weights else WeightedLossTrainer
    trainer_kwargs = {} if args.no_class_weights else {"class_weights": class_weights}

    best_model_cb = BestModelInMemoryCallback()
    trainer = trainer_cls(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        data_collator=data_collator,
        processing_class=tokenizer,
        compute_metrics=build_compute_metrics(id2label),
        callbacks=[best_model_cb],
        **trainer_kwargs,
    )

    trainer.train()

    best_model_cb.restore_best(trainer.model)
    val_metrics = trainer.evaluate()
    print("Final validation metrics (best epoch, restored from memory):", val_metrics)

    # Save the best model + tokenizer as the final artifact (not the raw
    # checkpoints dir, which is just for resuming/model-selection).
    trainer.save_model(str(out_dir))
    tokenizer.save_pretrained(str(out_dir))
    with open(out_dir / "label_list.json", "w", encoding="utf-8") as f:
        json.dump(label_list, f, indent=2)
    with open(out_dir / "val_metrics.json", "w", encoding="utf-8") as f:
        json.dump(val_metrics, f, indent=2)

    print(f"Model saved to {out_dir}")


if __name__ == "__main__":
    main()
