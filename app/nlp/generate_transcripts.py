import random
import csv
import json
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

# Opening lines - mix of English and Hindi/Marathi code-mixed
OPENINGS_EN = [
    "Hi, I'm looking for a {ptype} in {loc}",
    "I want to buy a {ptype}, budget around {budget}",
    "Can you tell me about properties in {loc}?",
]
OPENINGS_MIX = [
    "Namaste, mujhe ek {ptype} chahiye {loc} mein",
    "Hello, {loc} mein koi acha {ptype} hai kya, budget {budget} tak",
    "Mala {loc} madhe {ptype} baghaycha ahe",
]

TONE_ADDONS = {
    "enthusiastic": ["This sounds great!", "Perfect, I'm very interested!", "Ekdum zakas, mala avadla!"],
    "hesitant": ["Hmm, let me think about it.", "Not sure, budget is tight.", "Thoda vichar karto."],
    "frustrated": ["This is too expensive.", "Nothing matches what I need.", "Kahich thik nahi ahe."],
}

def generate_transcript(idx):
    city = random.choices(["Nashik", "Pune"], weights=[0.6, 0.4])[0]
    loc = random.choice(LOCATIONS_NASHIK if city == "Nashik" else LOCATIONS_PUNE)
    ptype = random.choice(PROPERTY_TYPES)
    budget = random.choice(BUDGETS)
    amenities = random.sample(AMENITIES, k=random.randint(1, 3))
    tone = random.choice(list(TONE_ADDONS.keys()))

    use_mix = random.random() < 0.4  # 40% code-mixed opening
    opening_template = random.choice(OPENINGS_MIX if use_mix else OPENINGS_EN)
    opening = opening_template.format(ptype=ptype, loc=loc, budget=budget)

    agent_reply = f"Sure, let me check {ptype} options in {loc} with {', '.join(amenities)}."
    client_followup = random.choice(TONE_ADDONS[tone])

    transcript = f"Agent: Hello, welcome to our real estate assistant. How can I help you today?\nClient: {opening}\nAgent: {agent_reply}\nClient: {client_followup}"

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

def generate_dataset(n=700, nashik_ratio=0.6):
    dataset = [generate_transcript(i) for i in range(n)]
    return dataset

if __name__ == "__main__":
    data = generate_dataset(n=700)
    with open("data/synthetic/transcripts_full.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Generated {len(data)} transcripts.")