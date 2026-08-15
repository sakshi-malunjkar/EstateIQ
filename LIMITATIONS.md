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

### Second, separate, unresolved issue: code-mixed enthusiastic sentiment

**Enthusiastic sentiment expressed in romanized Hindi/Marathi (code-mixed)
is unreliable — best verified result is 1 correct out of 3 test
sentences, at 0.38 confidence, barely above the 33% random baseline for
3 classes.** Code-mixed frustrated and hesitant sentences work fine;
this is specific to code-mixed enthusiasm.

Test sentences (never used in training):
- `"Ekdum zakas ahe he, amhala khup avadla, lawkar visit karuya"` → hesitant (wrong)
- `"Mala ha flat khup avadla, lagech decide karto"` → hesitant (wrong)
- `"Yeh property bahut acchi lagi, hum jaldi decide karenge"` → enthusiastic (correct, 0.38 confidence)

**⚠️ A note on why this matters, for anyone reading old commits:** an
earlier attempt (referred to as "v5" in commit history) appeared to
fix all 3 of these sentences. It didn't, genuinely — two of the three
"fixes" turned out to be **test-set contamination**: the training data
written for that attempt included those two exact sentences verbatim,
so the model had memorized the literal test input rather than learned
to generalize. Once caught and corrected (paraphrasing those training
examples so they no longer match the test sentences), the real fix
recovered to 1/3. Do not treat v5's reported numbers as a real result —
they're preserved in git history for transparency, not as a target to
match.

Also, v5 (in the process of adding a lot of code-mixed volume to fix
this) introduced a general bias toward predicting `enthusiastic` on
unfamiliar-looking text, breaking 3 previously-correct code-mixed
frustrated/hesitant sentences. The current model ("v6") reverts that
regression — those 3 sentences are correct again — at the cost of
un-fixing 2 of the 3 targeted code-mixed enthusiastic sentences. This
was a deliberate, considered tradeoff (net positive on raw accuracy,
3 fixes vs. 2 regressions across the full 17-sentence check), not an
oversight — see commit history for the full before/after comparison.

**Status: open.** Not yet resolved. Worth investigating: whether
code-mixed enthusiasm needs meaningfully more real (not synthetic)
examples, whether the base multilingual model's Hindi/Marathi
representations are just weaker for positive sentiment specifically, or
whether a different phrasing strategy entirely is needed rather than
more of the same template style.

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
- v4: symmetrically expanded `frustrated` and `hesitant` to 34
  phrasings each too, matched in word-count distribution (avg 8.3-9.0
  words across all three classes). Test F1 dropped to a more honest
  0.984 (from a suspicious flat 1.0), and freeform confidence on
  correct predictions rose to 0.77-0.81 (from 0.35-0.56). This is where
  the calm/comma-joined-vs-hesitant issue above was first isolated.
- v5: expanded `enthusiastic` specifically to 53 phrasings (19 new
  code-mixed ones) to target the code-mixed-enthusiastic gap.
  Apparently fixed 3/3 targeted sentences, but 2 of those were test-set
  contamination (see above) and the volume increase caused a new
  general bias toward predicting `enthusiastic`, breaking 3 previously
  working code-mixed sentences.
- v6 (current baseline): trimmed `enthusiastic` back to 34 phrasings
  (matching the other two classes), keeping vocabulary diversity but
  cutting raw volume, and paraphrased the two contaminated training
  examples. Test F1 back to a clean 1.0. Net effect vs. the pre-v5
  baseline: 11/15 gradable freeform sentences correct (up from 10/15),
  3 fixes vs. 2 regressions relative to v5 -- but the code-mixed
  enthusiastic issue above remains genuinely open.

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

## Lead scoring (`app/lead_scoring`)

**The training labels are a heuristic proxy, not real conversion
outcomes — because this is a new project with no sales history yet,
there is no "did this lead actually convert" data to learn from.**
`lead_scores.label_source = "heuristic_bootstrap"` rows are generated
by the documented formula in `app/lead_scoring/heuristic.py` (sentiment
35%, entity completeness 20%, budget signal 25%, engagement 20%), not
by any real outcome. Understand this model as encoding the same domain
logic a rule-based scoring system would apply, just expressed in a form
(a trained XGBoost model) that **can be retrained on real data later
without a rebuild** — once real outcomes start accumulating as
`label_source = "agent_confirmed"` rows, retraining should prefer or
blend those over the heuristic labels, and eventually phase the
heuristic out entirely. SHAP explainability is real and meaningful
regardless of label source, since it explains the model's actual
learned behavior on whatever labels it was trained on — it just can't
tell you whether those labels reflect real lead quality.

**Two of the four heuristic signal groups show zero variance on the
current synthetic dataset, so they don't discriminate leads yet:**
budget is stated in 700/700 synthetic transcripts (the budget-signal
component is 1.0 for essentially every lead), and client turn count is
constant at exactly 2 across all 700 (the turn-count half of the
engagement component is likewise constant). Only sentiment, entity/
amenity completeness, and message length actually vary on this data.
This is an honest, known limitation of testing against synthetic,
templated data — not a bug in the formula. The formula is deliberately
built for real-world variance (real callers sometimes never state a
budget, some conversations are one line, some go back and forth for
ten turns), so it should start discriminating properly once real,
messier call data replaces or supplements the synthetic set.
