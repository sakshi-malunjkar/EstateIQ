"""
Generate a sentiment-training-only synthetic transcript dataset, separate
from the NER data (data/annotated/, data/ner_bio/, and
data/synthetic/transcripts_full.json are never touched by this script).

The original generator (generate_transcripts.py) used only 3 fixed closing
lines per sentiment class -- easy for a classifier to memorize verbatim
instead of learning general sentiment. This version uses large banks of
~18-20 distinct phrasings per class (varied vocabulary, sentence structure,
length, formal/casual register, English/Hindi/Marathi code-mixing), and
sometimes concatenates two phrasings from the bank for extra variety, so
the effective number of distinct closing utterances is in the hundreds,
not 3.

Output: data/synthetic/transcripts_sentiment_v2.json
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
AMENITIES = load_csv_values("amenities.csv", "amenity")
BUDGETS = ["30 lakhs", "45 lakhs", "50 lakhs", "65 lakhs", "80 lakhs", "1 crore", "1.2 crore"]

OPENINGS_EN = [
    "Hi, I'm looking for a {ptype} in {loc}",
    "I want to buy a {ptype}, budget around {budget}",
    "Can you tell me about properties in {loc}?",
    "I'm searching for a {ptype} near {loc}, budget is {budget}.",
]
OPENINGS_MIX = [
    "Namaste, mujhe ek {ptype} chahiye {loc} mein",
    "Hello, {loc} mein koi acha {ptype} hai kya, budget {budget} tak",
    "Mala {loc} madhe {ptype} baghaycha ahe",
    "Mujhe {loc} ke aas paas {ptype} dhundh rahe hain, budget {budget}.",
]

# 18-20 distinct phrasings per class: mix of short/long, formal/casual,
# statements/questions/exclamations, English + romanized Hindi/Marathi.
# Deliberately varied vocabulary so no single word is a trivial shortcut
# for the whole class (frustration shows up as "too expensive", "waste of
# time", "disappointed", "bekaar", "kantala", "fed up", etc. -- not one
# repeated tell).
TONE_BANK = {
    "enthusiastic": [
        # short, exclamatory (the original register -- kept, but now a
        # minority rather than the whole bank)
        "This sounds great!",
        "Perfect, exactly what I was looking for!",
        "Wow, I love it, let's move forward!",
        "Amazing, when can I schedule a visit?",
        "I'm really excited about this one!",
        "Finally, something that ticks all the boxes!",
        "Ekdum zakas, mala khup avadla!",
        "I can't wait to see it in person!",
        # calmer, non-exclamatory statements (matches the register of
        # positive sentences that don't rely on "!" -- this was the
        # structural gap that caused a real freeform miss)
        "Yes, this works perfectly for my family.",
        "This is exactly what we've been searching for.",
        "Great option, I'm ready to move ahead.",
        "I'm thrilled, this fits everything we need.",
        "This checks every box, let's proceed right away.",
        "I have a really good feeling about this one, let's proceed.",
        "Everything about this feels right, I'm ready to commit.",
        "Really glad I found this, it's better than I imagined.",
        # longer, multi-clause / formal register
        "This is wonderful news, please share the next steps with me.",
        "I couldn't be happier with this, when can we sign the papers?",
        "This has honestly made my day, thank you so much for finding it.",
        # questions expressing eagerness
        "Is it possible to visit this property as soon as possible? I really don't want to miss it.",
        "Sounds fantastic, please book a visit for me.",
        # Hindi/Marathi variety
        "Bahut badhiya hai, main isko lena chahta hoon.",
        "Mala he perfect vatla, chala pudhe jauya.",
        "Yeh toh bilkul sahi hai, aage badhte hain.",
        "Superb choice, let's finalize the details.",
        "Mast ahe, mala khup avadla, chala baghuya.",
        "Mala vatla hech aamhala pahije hota, chala pudhla step karuya.",
        "Yeh dekhkar bahut khushi hui, hum aage badhna chahte hain.",
        # more code-mixed enthusiasm -- targeted fix: testing found the
        # model misreads code-mixed enthusiastic sentences as hesitant
        # (3/3 failures), while code-mixed frustrated/hesitant worked
        # fine, pointing at a representation gap in this bank
        # specifically. Trimmed to 6 (from an earlier 19, which grew
        # this bank to 53 total vs 34 for the other two classes and
        # caused a general enthusiastic-prediction bias -- see commit
        # history). Word counts kept in the same ~6-10 range as the
        # existing code-mixed phrasings and as frustrated/hesitant's
        # code-mixed banks. Two entries below are deliberately
        # paraphrased rather than reused verbatim from earlier drafts,
        # since those exact strings turned out to be identical to two
        # of the freeform test sentences -- keeping them would have
        # made those "fixes" literal memorization, not generalization.
        "Khup avadla mala, ekdum perfect ahe!",
        "Zakas ahe ekdum, chala confirm karuya!",
        "Ekdum best ahe, yaha se aage badhte hain!",
        "Mala ha ghar khup avadla, lagech pudhe jauya.",
        "Yeh ghar bahut pasand aaya, hum turant aage badhenge.",
        "Sahi hai yaar, ekdum pasand aaya mujhe!",
    ],
    "frustrated": [
        # short, direct (original register)
        "This is too expensive.",
        "Nothing matches what I need.",
        "This is such a waste of my time.",
        "Why does nothing match my budget?",
        "I'm fed up, none of these locations work.",
        "This is not worth my time at all.",
        "This is not what I signed up for at all.",
        "Ugh, seriously?",
        # calmer statements
        "I've been calling for days and nobody responds.",
        "None of these options work for me at all.",
        "I'm really disappointed with what you're showing me.",
        "I've seen five properties and none of them fit.",
        "This whole process has been so frustrating.",
        "I expected much better options than this.",
        "Seriously, is this the best you can offer?",
        "Seriously disappointing, I expected more from you.",
        "Everything about this search has been disappointing so far.",
        "I'm honestly fed up with how this whole process has gone.",
        "None of this even remotely matches what we discussed earlier.",
        # longer, multi-clause / formal register (matches the length/
        # structure variety added to enthusiastic and hesitant, so
        # sentence length itself isn't a class shortcut)
        "This is genuinely the worst property search experience I've had.",
        "I can't believe none of these even come close to what I asked for.",
        "Honestly, this has been a complete waste of everyone's time.",
        "My whole family is upset that none of these options worked out.",
        "Is this really the best you can do? I expected so much more.",
        "I've wasted an entire week on properties that don't match anything I need.",
        "This is deeply frustrating, nothing here comes close to our budget.",
        # Hindi/Marathi variety
        "Kahich thik nahi ahe, mala kombhi avadla nahi.",
        "Yeh sab bekaar hai, kuch bhi sahi nahi mila.",
        "Mala kantala ala ata, kahich milat nahi.",
        "Seva ekdum vait ahe, mala pasant nahi.",
        "Seedha bolu, mujhe yeh bilkul pasand nahi aaya.",
        "Mala khup wait zala, tari kahich changla sapadla nahi.",
        "Itni baar call kiya lekin koi bhi sahi jawab nahi mila.",
        "Yeh sunke bahut gussa aa raha hai, kuch bhi sahi nahi hai.",
    ],
    "hesitant": [
        # short, direct (original register)
        "Hmm, let me think about it.",
        "Not sure, budget is tight.",
        "Thoda vichar karto.",
        "I'm on the fence about this one.",
        "Can I take some time to decide?",
        "Hmm.",
        # calmer statements
        "I need to discuss this with my family first.",
        "Maybe, I'm not fully convinced yet.",
        "Let me get back to you on this.",
        "I'm still weighing my options.",
        "I don't know, it's a big decision.",
        "Let me check with my spouse first.",
        "Not completely sure this is right for us.",
        "I need a bit more time to consider.",
        "I'll think it over and let you know.",
        "I'm leaning one way but I'm still not fully certain.",
        "Not entirely sure yet, need to weigh a few things first.",
        "I'd rather not commit until I've spoken with my family.",
        "Let's see, I'm not making any decisions today.",
        # longer, multi-clause / formal register
        "I really can't decide right now, there's a lot to think about.",
        "My family and I need some time before we can commit to anything.",
        "Honestly, I'm torn between a few different options right now.",
        "This could work, but I'd like to see a couple more places first.",
        "Is it possible to get a few more days before deciding?",
        "There's a lot to weigh here, I don't want to rush this decision.",
        "We're considering a couple of other properties too, so let me think.",
        # Hindi/Marathi variety
        "Mala thoda time hava, nakki nahi sangu shakat.",
        "Ek do din vichar karun sangto.",
        "Pahije tar baghuya, abhi kahi sangu shakat nahi.",
        "Kadachit, mala ajun khatri nahi.",
        "Kuch confirm nahi kar sakta abhi, dekhte hain.",
        "Mala ajun kahi ghari baghaychya ahet, mag nakki karto.",
        "Thoda aur soch ke batata hoon, abhi kuch tay nahi hai.",
        "Kadachit changla ahe, pan mala ajun vichar karava lagel.",
    ],
}


def report_shortcut_words(tone_bank):
    """Flag any word appearing in only one class's phrase bank AND in a
    large share of that class's phrasings -- a sign the model could learn
    a trivial keyword shortcut instead of real sentiment. Purely
    diagnostic, printed for the data-stats check-in."""
    class_word_counts = {}
    for cls, phrases in tone_bank.items():
        words = Counter()
        for p in phrases:
            for w in set(p.lower().strip(".,!?").split()):
                words[w] += 1
        class_word_counts[cls] = words

    print("\nShortcut-word check (words appearing in only one class, in >=40% of its phrasings):")
    found_any = False
    for cls, words in class_word_counts.items():
        n = len(tone_bank[cls])
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
    amenities = random.sample(AMENITIES, k=random.randint(1, 3))
    tone = random.choice(list(TONE_BANK.keys()))

    use_mix = random.random() < 0.4
    opening_template = random.choice(OPENINGS_MIX if use_mix else OPENINGS_EN)
    opening = opening_template.format(ptype=ptype, loc=loc, budget=budget)

    agent_reply = f"Sure, let me check {ptype} options in {loc} with {', '.join(amenities)}."

    # ~35% of the time, concatenate two distinct phrasings from the same
    # class's bank for extra length/structure variety (pushes the
    # effective number of distinct closings well past the raw bank size).
    bank = TONE_BANK[tone]
    if random.random() < 0.35:
        two = random.sample(bank, k=2)
        client_followup = f"{two[0]} {two[1]}"
    else:
        client_followup = random.choice(bank)

    transcript = (
        "Agent: Hello, welcome to our real estate assistant. How can I help you today?\n"
        f"Client: {opening}\n"
        f"Agent: {agent_reply}\n"
        f"Client: {client_followup}"
    )

    return {
        "id": idx,
        "transcript": transcript,
        "city": city,
        "location": loc,
        "property_type": ptype,
        "budget": budget,
        "amenities": amenities,
        "sentiment": tone,
    }


def generate_dataset(n=700, seed=42):
    random.seed(seed)
    return [generate_transcript(i) for i in range(n)]


if __name__ == "__main__":
    data = generate_dataset(n=700)

    out_path = Path("data/synthetic/transcripts_sentiment_v2.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Generated {len(data)} transcripts -> {out_path}")

    dist = Counter(d["sentiment"] for d in data)
    print("Sentiment distribution:", dict(dist))
    for cls, phrases in TONE_BANK.items():
        print(f"  {cls}: {len(phrases)} distinct base phrasings")

    unique_closings = len({d['transcript'].split(chr(10))[-1] for d in data})
    print(f"Unique closing utterances across dataset: {unique_closings}")

    report_shortcut_words(TONE_BANK)
