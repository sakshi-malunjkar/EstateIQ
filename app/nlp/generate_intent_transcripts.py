"""
Generate an intent-classification synthetic transcript dataset, separate
from both the NER data (data/annotated/, data/ner_bio/,
transcripts_full.json) and the sentiment data (transcripts_sentiment_v2.json)
-- none of those are touched by this script.

Six intent classes: Buy, Rent, Inquiry, Schedule Visit, Investment,
Request Callback. Each class has a bank of 15-20 distinct phrasings
(English + romanized Hindi/Marathi code-mixed, varied vocabulary,
formal/casual register, statement/question forms) so the classifier
learns the general shape of each intent rather than memorizing a
handful of templates.

Unlike the sentiment generator (where the label-bearing line is the
client's closing follow-up), here the label-bearing line is the client's
opening message -- intent is what the client is asking for, which is
naturally expressed up front, and it mirrors how the model will actually
be used (single standalone sentences, see intent_predict.py).

Output: data/synthetic/transcripts_intent_v1.json
"""

import csv
import json
import random
from collections import Counter
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"


def load_csv_values(filename, column):
    values = []
    with open(DATA_DIR / filename, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            values.append(row[column])
    return values


LOCATIONS_NASHIK = ["Gangapur Road", "College Road", "Nashik Road", "Indira Nagar", "Panchavati", "Satpur", "Cidco", "Deolali"]
LOCATIONS_PUNE = ["Baner", "Wakad", "Hinjewadi", "Kothrud", "Viman Nagar", "Hadapsar", "Wagholi", "Kharadi"]
PROPERTY_TYPES = load_csv_values("property_type.csv", "property_type")
BUDGETS = ["30 lakhs", "45 lakhs", "50 lakhs", "60 lakhs", "65 lakhs", "80 lakhs", "1 crore", "1.2 crore"]

AGENT_ACKS = [
    "Sure, let me check that for you.",
    "Understood, I'll pull up some options.",
    "Got it, let me see what we have.",
    "Sure, give me a moment to look into this.",
    "Okay, let me find the right options for you.",
]

# 15-20 distinct phrasings per class. Placeholders {ptype}, {loc}, {budget}
# are optional -- a template can use any subset (extra format kwargs are
# simply ignored), which lets short/plain phrasings sit alongside detailed
# ones without special-casing.
INTENT_BANK = {
    "Buy": [
        "I want to buy a {ptype} in {loc}, budget around {budget}",
        "Looking to purchase a {ptype} in {loc}, my budget is {budget}",
        "I'm interested in buying a {ptype} near {loc}",
        "I want to purchase a {ptype} in {loc}, budget {budget}",
        "We are planning to buy a {ptype} in {loc} within {budget}",
        "I'd like to own a {ptype} in {loc}, budget up to {budget}",
        "Can I buy a {ptype} in {loc} right away?",
        "Ready to purchase, show me {ptype} options in {loc} under {budget}",
        "I want to finalize the purchase of a {ptype} in {loc}",
        "Please share {ptype} listings for outright purchase in {loc}",
        "Mujhe {loc} mein ek {ptype} khareedna hai, budget {budget}",
        "Mala {loc} madhe {ptype} kharedi karaycha ahe",
        "Hume {loc} mein {ptype} khareedna hai, budget around {budget}",
        "{loc} mein {ptype} khareedne ke liye dekh rahe hain",
        "Mala {ptype} ghyaycha ahe {loc} madhe, budget {budget} paryant",
        "Ghar kharedaicha ahe, {loc} madhe {ptype}, budget {budget}",
        "Property khareedni hai humein {loc} mein, {ptype} chahiye",
    ],
    "Rent": [
        "Looking for a flat on rent in {loc}",
        "I want to rent a {ptype} in {loc}, budget {budget} per month",
        "Do you have any {ptype} available for rent in {loc}?",
        "Searching for a rental {ptype} near {loc}",
        "I need to rent a {ptype} in {loc} as soon as possible",
        "Is this {ptype} in {loc} available on lease?",
        "I'm looking for rental options, {ptype} in {loc}",
        "Need a {ptype} on rent in {loc}, budget under {budget}",
        "Please show rental listings for {ptype} in {loc}",
        "Mujhe {loc} mein ek {ptype} kirai par chahiye",
        "Mala {loc} madhe {ptype} bhadyane hava ahe",
        "{loc} mein {ptype} rent par milega kya?",
        "Bhade par ghar chahiye humein {loc} mein",
        "Mala bhadyachi {ptype} pahije {loc} madhe",
        "Kiraye par {ptype} dhundh rahe hain {loc} mein, budget {budget}",
        "Rent tattva var {ptype} have ahe amhala {loc} madhe",
    ],
    "Inquiry": [
        "Just checking what options are available in {loc}",
        "Can you tell me more about properties in {loc}?",
        "I'm just browsing, what do you have in {loc}?",
        "What kind of {ptype} options do you have in {loc}?",
        "Just gathering information about {ptype} in {loc} for now",
        "Can you share details about {ptype} availability in {loc}?",
        "I'm curious about the {ptype} market in {loc}",
        "What are the current rates for {ptype} in {loc}?",
        "Just wanted to know more, not deciding anything yet",
        "Tell me about the amenities available with {ptype} in {loc}",
        "Bas jankari chahiye, {loc} mein kya options hain?",
        "Mala {loc} baddal thodi mahiti hava ahe",
        "{loc} mein {ptype} baddal sanga na",
        "Abhi sirf poochtaachh kar raha hoon {ptype} ke baare mein",
        "Kahi mahiti dya {ptype} baddal {loc} madhe",
        "Just enquiring, {loc} madhe kay options ahet?",
    ],
    "Schedule Visit": [
        "Can we schedule a site visit this Saturday?",
        "I'd like to book a visit for the {ptype} in {loc}",
        "Please arrange a site visit for this {ptype}",
        "Can you schedule a visit for {loc} this weekend?",
        "I want to see the {ptype} in person, can we fix a time?",
        "Let's book a visit, I'm free tomorrow",
        "Please set up a site visit for the {ptype} in {loc}",
        "Can we do a walkthrough of the {ptype} this week?",
        "I'd like to visit the property in {loc}, when works for you?",
        "Arrange a viewing for the {ptype} at the earliest",
        "Site visit fix kar sakte hain kya is weekend?",
        "Mala {ptype} baghayla jaycha ahe, visit fix kara",
        "{loc} madhe visit thevuya ka is weekend?",
        "Ghar baghayla yeu shakto ka amhi, visit fix kara",
        "Visit ka number nikaliye, mujhe {ptype} dekhna hai",
        "Kal ya parso visit karuya, time fix kara",
    ],
    "Investment": [
        "I want to invest in a commercial property in {loc}",
        "Looking for good investment options in {ptype} at {loc}",
        "What's the rental yield on this {ptype} in {loc}?",
        "I'm interested in this {ptype} purely as an investment",
        "Which {ptype} in {loc} gives the best ROI?",
        "I want to diversify my portfolio with a {ptype} in {loc}",
        "Is this {ptype} in {loc} a good investment opportunity?",
        "Looking to buy a {ptype} in {loc} for rental income",
        "I'm evaluating {loc} for a long-term property investment",
        "What is the appreciation potential of {ptype} in {loc}?",
        "Mala {loc} madhe investment sathi property baghaychi ahe",
        "Investment ke liye {ptype} dekh rahe hain {loc} mein",
        "{loc} madhe {ptype} investment sathi changla ahe ka?",
        "Humein rental income ke liye {ptype} chahiye {loc} mein",
        "Property investment karaycha ahe, {loc} madhe {ptype} kasa ahe?",
        "Achha return milega kya is {ptype} madhe {loc} mein?",
    ],
    "Request Callback": [
        "Please have your agent call me back tomorrow",
        "Can someone call me back regarding this {ptype}?",
        "I'd prefer a callback instead of chatting here",
        "Please ask your team to call me later today",
        "Can you arrange a callback for the {loc} property?",
        "I'm busy now, please call me back in the evening",
        "Request a callback from your sales team",
        "Please have someone reach out to me by phone",
        "Can I get a call back about {ptype} options?",
        "Kindly schedule a callback at your earliest convenience",
        "Mujhe callback chahiye, koi call kare please",
        "Mala parat call kara please",
        "Agent la sanga mala call karayla",
        "Thoda busy hoon abhi, baad mein call kar dena",
        "Please mujhe shaam ko call back karo",
        "Callback arrange kara na please, mala baat karaychi ahe",
    ],
}


def report_shortcut_words(intent_bank):
    """Same diagnostic as generate_sentiment_transcripts.py: flag any word
    appearing in only one class's phrase bank AND in a large share of that
    class's phrasings."""
    class_word_counts = {}
    for cls, phrases in intent_bank.items():
        words = Counter()
        for p in phrases:
            for w in set(p.lower().strip(".,!?").split()):
                words[w] += 1
        class_word_counts[cls] = words

    print("\nShortcut-word check (words appearing in only one class, in >=40% of its phrasings):")
    found_any = False
    for cls, words in class_word_counts.items():
        n = len(intent_bank[cls])
        others = set()
        for other_cls, other_words in class_word_counts.items():
            if other_cls != cls:
                others |= set(other_words)
        suspicious = [w for w, c in words.items() if w not in others and c / n >= 0.4 and len(w) > 2]
        if suspicious:
            found_any = True
            print(f"  {cls}: {suspicious}")
    if not found_any:
        print("  none found -- no single word dominates any class's phrasing.")


def generate_transcript(idx):
    city = random.choices(["Nashik", "Pune"], weights=[0.6, 0.4])[0]
    loc = random.choice(LOCATIONS_NASHIK if city == "Nashik" else LOCATIONS_PUNE)
    ptype = random.choice(PROPERTY_TYPES)
    budget = random.choice(BUDGETS)
    intent = random.choice(list(INTENT_BANK.keys()))

    bank = INTENT_BANK[intent]
    # ~30% of the time, concatenate two distinct phrasings from the same
    # class's bank for extra length/structure variety.
    if random.random() < 0.3:
        two = random.sample(bank, k=2)
        client_opening = f"{two[0].format(ptype=ptype, loc=loc, budget=budget)} {two[1].format(ptype=ptype, loc=loc, budget=budget)}"
    else:
        client_opening = random.choice(bank).format(ptype=ptype, loc=loc, budget=budget)

    agent_reply = random.choice(AGENT_ACKS)

    transcript = (
        "Agent: Hello, welcome to our real estate assistant. How can I help you today?\n"
        f"Client: {client_opening}\n"
        f"Agent: {agent_reply}"
    )

    return {
        "id": idx,
        "transcript": transcript,
        "city": city,
        "location": loc,
        "property_type": ptype,
        "budget": budget,
        "intent": intent,
    }


def generate_dataset(n=700, seed=42):
    random.seed(seed)
    return [generate_transcript(i) for i in range(n)]


if __name__ == "__main__":
    data = generate_dataset(n=700)

    out_path = Path("data/synthetic/transcripts_intent_v1.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Generated {len(data)} transcripts -> {out_path}")

    dist = Counter(d["intent"] for d in data)
    print("Intent distribution:", dict(dist))
    for cls, phrases in INTENT_BANK.items():
        print(f"  {cls}: {len(phrases)} distinct base phrasings")

    unique_openings = len({d['transcript'].split(chr(10))[1] for d in data})
    print(f"Unique client opening lines across dataset: {unique_openings}")

    report_shortcut_words(INTENT_BANK)
