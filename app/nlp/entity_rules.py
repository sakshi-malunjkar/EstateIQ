"""
Rule-based post-processing for NER output: city detection (customer lines
first, locality fallback), amenity normalisation and budget parsing.

Pure Python (no torch) so it is cheap to import and easy to test.
"""

import csv
import re
from collections import Counter
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"

# ---------------------------------------------------------------- cities

def _load_city_variants():
    variants = {}
    with open(DATA_DIR / "cities.csv", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            variants[row["variant"].strip().lower()] = row["city"].strip()
    return variants


CITY_VARIANTS = _load_city_variants()

# Longest variants first so e.g. "nashik road" style overlaps resolve sanely.
_CITY_RE = re.compile(
    "|".join(re.escape(v) for v in sorted(CITY_VARIANTS, key=len, reverse=True)),
    re.IGNORECASE,
)

LOCALITY_TO_CITY = {
    **{a.lower(): "Pune" for a in (
        "Baner", "Wakad", "Kothrud", "Hadapsar", "Kalyani Nagar", "Viman Nagar",
        "Aundh", "Hinjewadi", "Kharadi", "Magarpatta", "Koregaon Park",
        "Shivajinagar", "Pimpri", "Chinchwad", "Vishrantwadi", "Undri",
        "Kondhwa", "Wanowrie", "Warje", "Bavdhan", "Wagholi",
    )},
    **{a.lower(): "Nashik" for a in (
        "Gangapur Road", "Cidco", "Satpur", "Ambad", "College Road",
        "Indira Nagar", "Panchavati", "Dwarka", "Trimbak Road", "Mumbai Naka",
        "Ashok Stambh", "Nashik Road", "Deolali",
    )},
}


def _load_known_localities():
    with open(DATA_DIR / "locations.csv", encoding="utf-8") as f:
        return {r["area"].strip().lower(): r["area"].strip() for r in csv.DictReader(f) if r["area"].strip()}


KNOWN_LOCALITIES = _load_known_localities()  # lowercase -> display form
LOCALITY_ALIASES = {"bane": "baner", "gangapur road area": "gangapur road"}


def canonical_locality(raw):
    """Clean an extracted locality to the form in locations.csv: trims,
    ignores case, drops a trailing "area", applies known aliases and snaps
    truncated names ("Bane") to the known locality they are a prefix of.
    Unknown names are returned trimmed and title-cased."""
    v = re.sub(r"\s+", " ", (raw or "").strip().lower())
    v = LOCALITY_ALIASES.get(v, v)
    if v.endswith(" area"):
        v = v[: -len(" area")].strip()
    v = LOCALITY_ALIASES.get(v, v)
    if v in KNOWN_LOCALITIES:
        return KNOWN_LOCALITIES[v]
    if len(v) >= 3:
        # truncated / partial name: the longest known locality that contains it
        hits = sorted((k for k in KNOWN_LOCALITIES if k.startswith(v) or v in k), key=len)
        if len(hits) == 1:
            return KNOWN_LOCALITIES[hits[0]]
    return v.title()


def _is_agent(speaker):
    s = speaker.strip().lower()
    return "agent" in s or "assistant" in s or s in ("ai", "bot", "system")


_SPEAKER_LINE = re.compile(r"^\s*([^:\n]{1,40}?)\s*:\s*(.*)$")


def split_turns(text):
    """-> list of (is_agent, line_text). Unprefixed lines continue the
    previous speaker; text with no speaker labels is all customer."""
    turns = []
    current_agent = False
    for line in text.splitlines():
        m = _SPEAKER_LINE.match(line)
        if m and len(m.group(1).split()) <= 4:
            current_agent = _is_agent(m.group(1))
            line = m.group(2)
        turns.append((current_agent, line))
    return turns


def _count_cities(lines):
    return Counter(CITY_VARIANTS[m.group(0).lower()] for l in lines for m in _CITY_RE.finditer(l))


def extract_city(text, locality=None):
    """City from customer lines first, then agent lines, then the locality
    fallback. Returns None if nothing is found."""
    turns = split_turns(text)
    for want_agent in (False, True):
        counts = _count_cities(l for is_agent, l in turns if is_agent == want_agent)
        if counts:
            return counts.most_common(1)[0][0]
    for loc in ([locality] if isinstance(locality, str) else (locality or [])):
        city = LOCALITY_TO_CITY.get(loc.strip().lower())
        if city:
            return city
    return None


def city_from_locality(locality):
    return LOCALITY_TO_CITY.get((locality or "").strip().lower())


# -------------------------------------------------------------- amenities

_AMENITY_PATTERNS = [
    ("swimming pool", r"swimming\s*pool|\bpool\b"),
    ("gym", r"\bgym(nasium)?\b"),
    ("parking", r"\bparking\b"),
    ("security", r"\bsecurity\b|\bsecurity\s*guards?\b"),
    ("clubhouse", r"club\s*house"),
    ("power backup", r"power\s*back\s*-?\s*up"),
    ("garden", r"\bgarden\b"),
    ("children play area", r"(children|kids?)('s)?\s*play\s*(area|ground)"),
    ("lift", r"\blifts?\b|\belevators?\b"),
    ("cctv", r"\bcctv\b"),
]
_AMENITY_RES = [(name, re.compile(p, re.IGNORECASE)) for name, p in _AMENITY_PATTERNS]


def normalize_amenities(*texts):
    """Canonical lowercase amenity names found in the given strings, in
    order of first appearance. "gym and parking" -> [gym, parking];
    "24/7 security" -> [security]."""
    joined = " ".join(t for t in texts if t)
    hits = []
    for name, rx in _AMENITY_RES:
        m = rx.search(joined)
        if m:
            hits.append((m.start(), name))
    return [name for _, name in sorted(hits)]


# ----------------------------------------------------------------- budget

_UNIT = r"(?:lakhs?|lacs?|crores?|cr|l)"
_NUM = r"\d+(?:\.\d+)?"
_UNIT_MULT = {"l": 100_000, "lakh": 100_000, "lac": 100_000, "cr": 10_000_000, "crore": 10_000_000}
_RANGE_RE = re.compile(
    rf"({_NUM})\s*(?:({_UNIT})\s*)?(?:se|to|-|–|and)\s*({_NUM})\s*({_UNIT})\b", re.IGNORECASE
)
_SINGLE_RE = re.compile(rf"({_NUM})\s*({_UNIT})\b", re.IGNORECASE)


def _mult(unit):
    u = unit.lower()
    if u.endswith("s") and u != "cr":
        u = u[:-1]
    return _UNIT_MULT[u]


def parse_budget(text):
    """-> (budget_min, budget_max) in rupees; (None, None) if unparseable.
    "80 lakhs" -> (8000000, 8000000); "50 se 80 lakh" -> (5000000, 8000000)."""
    if not text:
        return None, None
    m = _RANGE_RE.search(text)
    if m:
        lo, lo_unit, hi, hi_unit = m.groups()
        hi_mult = _mult(hi_unit)
        return float(lo) * (_mult(lo_unit) if lo_unit else hi_mult), float(hi) * hi_mult
    m = _SINGLE_RE.search(text)
    if m:
        v = float(m.group(1)) * _mult(m.group(2))
        return v, v
    return None, None


def find_budget_text(text):
    """Raw budget phrase in free text (range preferred), else None."""
    m = _RANGE_RE.search(text) or _SINGLE_RE.search(text)
    return m.group(0) if m else None
