"""
Append enthusiastic examples that match how people actually sound on a
voice call: calm, multi-clause, no exclamation marks, expressing readiness
to buy or satisfaction at finding a property (English + Hinglish).

The sentiment classifier reads calm enthusiasm as "hesitant" (see
LIMITATIONS.md); every earlier training bank leaned on exclamatory or
templated phrasing. Existing rows in data/sentiment/train.jsonl are kept
as-is -- this only adds rows (plus calm hesitant/frustrated
counter-examples, see COUNTER_PHRASES). Each phrase is written out three ways, since
the API passes full "Agent:/Client:" transcripts but ad-hoc callers pass a
bare client line:
    1. full dialogue (agent greeting, client request, agent reply, phrase)
    2. "Client: <phrase>"
    3. bare "<phrase>"

HELD_OUT phrases are never written to training data; they exist so
evaluation can check generalisation to unseen wording (see --eval-only).

Usage:
    python app/nlp/augment_sentiment_voice.py          # append to train.jsonl
    python app/nlp/augment_sentiment_voice.py --dry-run
"""

import argparse
import json
import random
from pathlib import Path

TRAIN_PHRASES = [
    # --- given by the user
    "I finally found what I was looking for, this is perfect",
    "I am ready to finalize, please connect me with your team",
    "This matches exactly what my family wanted",
    "I have been searching for months, this is exactly right",
    "I want to move forward with this property immediately",
    "Please share the best options, I am very interested",
    "I am excited about this, when can we visit the property",
    "Mujhe ye property bahut pasand aayi, main buy karna chahta hun",
    "Ekdum perfect hai, main ready hun finalize karne ke liye",
    "Ye exactly hai jo main dhundh raha tha, lets proceed",
    # --- added: satisfaction
    "This is a great fit for us, the location and the size are both what we hoped for",
    "I really like this place, it ticks everything on our list",
    "That sounds wonderful, it is exactly the kind of home we pictured",
    "I am very happy with these options, they are close to what we wanted",
    # --- added: readiness to buy
    "I am ready to book this, what are the next steps",
    "We have decided on this one, please share the paperwork and the payment details",
    "I would like to schedule a visit this weekend and finalize if everything looks good",
    "Let us go ahead with this property, I am confident it is the right choice",
    "Please send me the agreement, I want to close this deal soon",
    # --- added: Hinglish
    "Mujhe ye ghar bahut pasand aaya, hum isko finalize karna chahte hain",
    "Bilkul sahi hai ye, mere family ko exactly yahi chahiye tha, aage badhte hain",
    "Main ye property lena chahta hun, please booking ka process bataiye",
    "Ye mere budget mein hai aur location bhi perfect hai, main kal visit karna chahunga",
    "Mala ha flat khup avadla, aamhi lavkar lavkar final karnar aahot",
]

# Counter-examples in the same calm, multi-clause, no-exclamation register.
# Enthusiastic-only augmentation made the model read *any* calm sentence as
# enthusiastic (hesitant/frustrated recall collapsed to 0 on calm probes),
# so register must not be a shortcut for the label.
COUNTER_PHRASES = {
    "hesitant": [
        "I like it, but I am not fully sure yet, I will need a few days to decide",
        "It is an option, however I want to compare it with a couple of other places first",
        "Let me talk to my wife and parents, then I will get back to you",
        "I am still deciding, the location is fine but I am unsure about the budget",
        "Maybe, I am not certain this is the right time to buy, I need to think",
        "The flat looks okay, but I am not convinced, can you give me some time",
        "I will have to check my finances before I commit to anything",
        "Abhi main sure nahi hun, thoda sochna padega aur family se baat karni hai",
        "Theek lag raha hai, lekin main decide nahi kar paa raha, kuch din chahiye",
        "Mala ajun nakki nahi, ghari vichar karun sangto",
    ],
    "frustrated": [
        "I have visited so many properties already and none of them fit, this is getting tiring",
        "The prices keep going up beyond what I told you, I am quite annoyed about this",
        "Nobody has called me back and I keep repeating the same requirements, this is frustrating",
        "This is the third time you are showing me something outside my budget, it is a waste of time",
        "I am disappointed with the options so far, they are nothing like what I asked for",
        "Kitni baar bataun mujhe yahi budget hai, aap log sunte hi nahi ho, bahut irritating hai",
        "Itne dino se dhundh raha hun aur kuch sahi nahi mil raha, ab thak gaya hun",
        "Mala khup kantala ala, tumhi sagle mahag flats dakhavta",
    ],
}

HELD_OUT = [
    "I am so happy with this, it is just what we imagined and I would like to see it soon",
    "This looks right for my family, please tell me how to proceed with the purchase",
    "Ye bahut accha laga mujhe, main isko lene ke liye ready hun",
    "I have looked at many places and this is the first one that feels right, let us move ahead",
    "Great, that works well for us, can you arrange a visit and share the booking details",
    "Mujhe yahi chahiye tha, aap please next step batao",
]

# Explicitly frustrated callers on a voice call: a service complaint (waiting,
# no callback, repeated calls), a stated emotion ("very frustrated"), and
# usually a renewed property ask ("I need 3BHK in Wakad"). The ask tail used
# to drag these toward "hesitant" because most asks in training were neutral
# or hesitant. Phrases are composed from the pieces below; HELD_OUT_FRUSTRATED
# are never trained on.
COMPLAINTS = [
    "I have been waiting for a call back for ten days",
    "Nobody has responded to my inquiry since Monday",
    "I called your office three times and no one picked up",
    "Your team promised to send me details last week and I got nothing",
    "I have been following up for two weeks and still no update",
    "The site visit got cancelled twice without any information to me",
    "I keep getting different answers from different people on your team",
    "Aapke team ne bola tha ki kal call karenge, ab ek hafta ho gaya",
    "Main kitne dino se wait kar raha hun, koi reply nahi aaya",
    "Mi aathvadyabhar vaat baghtoy, konihi phone kela nahi",
]
EMOTIONS = [
    "I am very frustrated",
    "very frustrated honestly",
    "I am really disappointed with this service",
    "this is very disappointing",
    "I am quite upset about this",
    "I am extremely annoyed",
    "this is completely unacceptable",
    "main bahut frustrated hun",
    "bahut disappointed hun main",
    "mala khup rag ala aahe",
]
ASKS = [
    "I need a 2BHK in Baner",
    "I am still looking for a 3BHK in Kothrud",
    "I want a 1BHK near Hinjewadi, budget 45 lakhs",
    "please just send me the 2BHK options in Aundh",
    "mujhe Pimple Saudagar mein 2BHK chahiye",
    "Hadapsar madhe 2BHK pahije",
    "",
]
HELD_OUT_FRUSTRATED = [
    "I have been waiting for callback since last week, very frustrated, I need 3BHK in Wakad",
    "Very frustrated with the delay, please call me back about the Hinjewadi flat",
    "I am very disappointed, nobody responded to my inquiry for ten days, I still want a 2BHK in Baner",
]
# Hesitant callers also restate what they want; keep "asks" from signalling frustration.
HESITANT_WITH_ASK = [
    "I need a 3BHK in Wakad but I am not sure about the budget, let me think",
    "I am looking for a 2BHK in Baner, maybe, I have to discuss with my family first",
    "I want a 2BHK in Kothrud, but I am still undecided, give me some time",
    "Mujhe Wakad mein 3BHK chahiye, lekin abhi sure nahi hun, sochna padega",
]


def explicit_frustrated_phrases(rng, n=60):
    out = set()
    while len(out) < n:
        parts = [rng.choice(COMPLAINTS), rng.choice(EMOTIONS), rng.choice(ASKS)]
        if rng.random() < 0.4:
            parts = [parts[1], parts[0], parts[2]]
        phrase = ", ".join(p for p in parts if p)
        if phrase not in HELD_OUT_FRUSTRATED:
            out.add(phrase)
    return sorted(out)


OPENERS = [
    "Hello, welcome to our real estate assistant. How can I help you today?",
]
REQUESTS = [
    "I want to buy a 2BHK in Baner, budget around 70 lakhs",
    "Mujhe ek 3BHK chahiye Kothrud mein, budget 80 lakhs tak",
    "I am looking for a 2BHK near College Road, budget is 60 lakhs",
    "Namaste, Wakad mein 2BHK dekh raha hun, budget 65 lakhs",
    "I need a 1BHK in Hinjewadi, around 45 lakhs",
    "Mala Gangapur Road madhe 2BHK baghaycha ahe",
]
AGENT_REPLIES = [
    "Sure, let me check the options for you.",
    "I have a few properties that match, with a gym and parking.",
    "Here are two good options in that area with a lift and a garden.",
]


def build_rows(phrases, rng, dialogues_per_phrase=1):
    rows = []
    for phrase in phrases:
        for _ in range(dialogues_per_phrase):
            rows.append({
                "text": (f"Agent: {rng.choice(OPENERS)}\nClient: {rng.choice(REQUESTS)}\n"
                         f"Agent: {rng.choice(AGENT_REPLIES)}\nClient: {phrase}"),
                "label": "enthusiastic",
            })
        rows.append({"text": f"Client: {phrase}", "label": "enthusiastic"})
        rows.append({"text": phrase, "label": "enthusiastic"})
    return rows


def build_counter_rows(rng, dialogues_per_phrase=1):
    rows = []
    for label, phrases in COUNTER_PHRASES.items():
        for r in build_rows(phrases, rng, dialogues_per_phrase):
            r["label"] = label
            rows.append(r)
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--train", default="data/sentiment/train.jsonl")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    assert not set(TRAIN_PHRASES) & set(HELD_OUT)
    assert not set(explicit_frustrated_phrases(random.Random(0))) & set(HELD_OUT_FRUSTRATED)
    rng = random.Random(args.seed)
    rows = build_rows(TRAIN_PHRASES, rng, dialogues_per_phrase=2)
    rows += build_counter_rows(rng, dialogues_per_phrase=2)
    for label, phrases in (("frustrated", explicit_frustrated_phrases(rng)), ("hesitant", HESITANT_WITH_ASK)):
        for r in build_rows(phrases, rng, dialogues_per_phrase=1):
            r["label"] = label
            rows.append(r)

    train_path = Path(args.train)
    existing = {json.loads(l)["text"] for l in train_path.read_text(encoding="utf-8").splitlines() if l.strip()}
    new_rows = [r for r in rows if r["text"] not in existing]
    print(f"{len(TRAIN_PHRASES)} enthusiastic + {sum(map(len, COUNTER_PHRASES.values()))} counter phrases -> {len(rows)} rows, {len(new_rows)} new (rest already in {train_path})")
    if args.dry_run:
        return
    with open(train_path, "a", encoding="utf-8") as f:
        for r in new_rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"Appended {len(new_rows)} rows to {train_path}")


if __name__ == "__main__":
    main()
