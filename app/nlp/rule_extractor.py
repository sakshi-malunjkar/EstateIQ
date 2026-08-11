import csv
import re
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"

def load_csv_values(filename, column):
    values = []
    with open(DATA_DIR / filename, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            values.append(row[column])
    return values

LOCATIONS = load_csv_values("locations.csv", "area")
PROPERTY_TYPES = load_csv_values("property_type.csv", "property_type")
AMENITIES = load_csv_values("amenities.csv", "amenity")

def extract_location(text):
    found = []
    for area in LOCATIONS:
        if area.lower() in text.lower():
            found.append(area)
    return found

def extract_property_type(text):
    found = []
    for ptype in PROPERTY_TYPES:
        if ptype.lower() in text.lower():
            found.append(ptype)
    return found

def extract_amenities(text):
    found = []
    for amenity in AMENITIES:
        if amenity.lower() in text.lower():
            found.append(amenity)
    return found

def extract_budget(text):
    # matches patterns like "50 lakhs", "50L", "1 crore"
    match = re.search(r'(\d+\.?\d*)\s*(lakh|lakhs|l|crore|cr)', text, re.IGNORECASE)
    if match:
        return match.group(0)
    return None

def extract_all(text):
    return {
        "location": extract_location(text),
        "property_type": extract_property_type(text),
        "amenities": extract_amenities(text),
        "budget": extract_budget(text),
    }

if __name__ == "__main__":
    sample = "I'm looking for a 2BHK in Baner with a swimming pool and gym, budget around 50 lakhs"
    print(extract_all(sample))