# Known Model Limitations

Honest notes on where the trained models fall short, so nobody trusts a
perfect-looking test-set score more than they should. Both models are
trained on synthetic, templated transcript data (`app/nlp/generate_*.py`),
which makes held-out test-set metrics look better than real-world
performance on freeform text.

## Sentiment classifier (`models_artifacts/sentiment`)

**Enthusiastic sentiment expressed in a calm, multi-clause,
comma-joined, non-exclamatory register risks being misclassified as
hesitant**, regardless of the actual words used.

Confirmed across 3 rounds of retraining (see commit history on
`app/nlp/train_sentiment.py` / `generate_sentiment_transcripts.py`),
using a fixed set of 4 freeform test sentences never used in training:

- `"Wow this is perfect, exactly what my family was hoping to find, I
  can't wait to see it in person"` — genuinely enthusiastic — was
  classified as **hesitant** in every version trained so far (v2: 0.52
  confidence, v3: fixed briefly, v4: 0.60 confidence).

**What it's not:** ablation testing ruled out the word "family" as the
cause — replacing it with "we" changed the hesitant/enthusiastic
confidence split by under 1% (0.601→0.597 hesitant, 0.332→0.333
enthusiastic). It's not a lexical shortcut on that specific word.

**What it likely is:** the sentence's *structure* — three comma-joined
clauses, no exclamation mark, moderate length (~18 words) — resembles
the hesitant training bank's dominant register (calm, multi-clause,
non-exclamatory) more closely than most of the enthusiastic bank, even
after that bank was diversified and length-matched to the other two
classes. Not yet isolated further (e.g. whether punctuation, clause
count, or length specifically drives it) — flagged for follow-up rather
than guessed at.

**Practical implication:** don't fully trust this model on enthusiastic
customers who express interest in a measured, understated way (as
opposed to exclamation-heavy phrasing) — it may read as hesitation.

**Iteration history**, for context on what was already tried:
- v1 (original data): 3 fixed phrasings per class. Perfect test F1,
  but the model had just memorized 3 exact strings — freeform test
  confidence was barely above the 33% random baseline (35-44%), 2 of 4
  freeform sentences misclassified.
- v2: replaced with 19 diverse phrasings per class + phrase
  concatenation for structural variety. Real improvement but 2/4
  freeform still wrong, confidence still weak.
- v3: expanded only `enthusiastic` to 34 phrasings. Fixed the targeted
  miss but created a new confound — `enthusiastic`'s bank was now
  longer/more complex than the other two (still 19 phrasings each), so
  sentence length itself became a shortcut. 3/4 freeform sentences got
  pulled toward `enthusiastic` regardless of content.
- v4 (current): symmetrically expanded `frustrated` and `hesitant` to
  34 phrasings each too, matched in word-count distribution
  (avg 8.3-9.0 words across all three classes). Test F1 dropped to a
  more honest 0.984 (from a suspicious flat 1.0), and freeform
  confidence on correct predictions rose to 0.77-0.81 (from 0.35-0.56).
  The remaining issue above is what's left after this fix.

## NER model (`models_artifacts/muril_ner`)

Test-set metrics are a perfect P=R=F1=1.0 on every trained entity type
(LOCATION, PROPERTY_TYPE, BUDGET, AMENITY, BHK) — but the training data
draws entities from small, fixed CSV vocabularies (locations, property
types, amenities) and a narrow set of dialogue templates. This measures
a clean fit to that closed vocabulary and phrasing, not open-domain
generalization to novel entity names or phrasings not in those lists.
Predictions on real transcripts using different locations, property
types, or phrasing than the training templates should be spot-checked
before being trusted.

`FURNISHING` was one of the 6 entity types originally scoped for this
project but has zero labeled examples in the current annotated export —
the model cannot recognize it at all. It would need labeled training
data before it could be added.
