/**
 * EstateIQ public types (landing page). Contract mirrors API-CONTRACT.md `PublicProject` / `Property`.
 * Never add score / sentiment / intent / lead fields here — the public page must not receive them.
 */

export type City = "Nashik" | "Pune";

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
