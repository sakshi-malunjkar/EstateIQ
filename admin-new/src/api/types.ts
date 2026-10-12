/**
 * EstateIQ API contract (frontend view).
 *
 * These types mirror DESIGN.md §13 (Data -> Screen mapping). They are the shapes your
 * teammate's FastAPI backend should return. Build the UI against these; when the real API
 * is ready, keep the types and swap the mock functions in `mock.ts` for real fetches.

 */

export type City = "Nashik" | "Pune";

/** rev 3 vocabulary — labels/colours live in src/api/status.ts. "not_contacted" replaces the old "new". */
export type LeadStatus = "not_contacted" | "contacted" | "call_back" | "visit_scheduled" | "converted" | "lost";
export type ScoreBand = "Hot" | "Warm" | "Cold";
export type SentimentLabel = "Positive" | "Neutral" | "Negative"; // INTERNAL — UI labels, mapped from the model's 3 classes
export type IntentLabel =
  | "Buy" | "Rent" | "Invest" | "Schedule visit" | "Info" | "Other"; // INTERNAL — confirm the 6 labels with the intent model

export interface Project {
  id: string;
  name: string;
  city: City;
  locality: string;
  status: "Ready to move" | "Under construction" | "New launch";
  unitTypes: string;
  priceRange: string;
  features: string[];
  totalUnits?: number;
  availableUnits?: number;
  description?: string;
  /** cover image: a /images/... path, or (mock only) a data URL from an upload */
  image?: string;
}

export interface Property {
  id: string;
  projectId: string;
  project: string;
  city: City;
  type: string; // "2 BHK", "Villa", ...
  price: string; // display, e.g. "₹ 65 L"
  beds: number;
  baths: number;
  tags: string[]; // from properties.features JSONB (amenities)
  status?: "available" | "sold" | "hold";
  propertyType?: PropertyType;
  bhk?: number;
  /** price in lakh — the source of truth; `price` is its ₹ display string */
  priceLakh?: number;
  areaSqft?: number;
  furnishing?: Furnishing;
  /** a /images/... path, or (mock only) a data URL from an upload */
  image?: string;
}

export type PropertyType = "Apartment" | "Villa" | "Row house" | "Penthouse" | "Plot";
export type Furnishing = "Unfurnished" | "Semi-furnished" | "Fully furnished";

/** The structured NER output (DESIGN.md §27.3). A null field renders as "Not mentioned" — never a guess. */
export interface EnquiryDetails {
  bhk: string | null;
  budget: string | null;
  city: string | null;
  locality: string | null;
  propertyType: string | null;
  amenities: string | null;
  furnishing: string | null;
}

export interface TranscriptTurn {
  who: "client" | "agent";
  text: string;
  lang?: string; // BCP-47, for correct Devanagari pronunciation (§15)
}

export interface ShapContribution {
  label: string; // humanized feature name
  value: number; // + raises the score, - lowers it
}
