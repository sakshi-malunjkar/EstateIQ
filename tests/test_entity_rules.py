import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "app" / "nlp"))
from entity_rules import extract_city, normalize_amenities, parse_budget, city_from_locality


def test_city_variants():
    for text, city in [("In Nasik please", "Nashik"), ("Puna mein", "Pune"), ("पुणे", "Pune"), ("नाशिक में", "Nashik")]:
        assert extract_city("Client: " + text) == city


def test_customer_city_beats_agent_city():
    t = ("Property assistant: 2 BHK apartment in Pune?\n"
         "Rahul: No, in Nashik.\n"
         "Property assistant: Pune has many options, Pune is great.")
    assert extract_city(t) == "Nashik"


def test_agent_city_used_when_customer_silent():
    assert extract_city("Agent: Options in Pune.\nClient: Okay sounds good") == "Pune"


def test_locality_fallback():
    assert extract_city("Client: looking in Baner", locality=["Baner"]) == "Pune"
    assert extract_city("Client: flat near College Road", locality="College Road") == "Nashik"
    assert city_from_locality("Kalyani Nagar") == "Pune"
    assert extract_city("Client: hello") is None


def test_amenities():
    assert normalize_amenities("gym and parking") == ["gym", "parking"]
    assert normalize_amenities("swimming pool") == ["swimming pool"]
    assert normalize_amenities("24/7 security") == ["security"]
    assert normalize_amenities("gym, security") == ["gym", "security"]


def test_budget():
    assert parse_budget("80 lakhs")[1] == 8_000_000
    assert parse_budget("80 lakh")[1] == 8_000_000
    assert parse_budget("1 crore")[1] == 10_000_000
    assert parse_budget("1.5 crore")[1] == 15_000_000
    assert parse_budget("50 se 80 lakh") == (5_000_000, 8_000_000)
    assert parse_budget("nothing") == (None, None)


def test_canonical_locality():
    from entity_rules import canonical_locality as c
    assert c("Bane") == "Baner"
    assert c("  gangapur road ") == "Gangapur Road"
    assert c("Gangapur Road area") == "Gangapur Road"
    assert c("Nagar") == "Nagar"  # ambiguous, left alone
