/**
 * Seed projects + properties for the mock catalog (no network calls).
 * Replaced by the real API at integration time (see API-CONTRACT.md).
 */
import type { Project, Property } from "./types";

export const PROJECTS: Project[] = [
  { id: "p1", name: "Skyline Heights", city: "Nashik", locality: "Gangapur Road", status: "Under construction", unitTypes: "2–3 BHK", priceRange: "₹ 65 L – 1.4 Cr", features: ["Clubhouse", "Gym", "Covered parking", "Kids' play area"], totalUnits: 48, availableUnits: 12 },
  { id: "p2", name: "Lake Vista", city: "Nashik", locality: "Indira Nagar", status: "Ready to move", unitTypes: "1–2 BHK", priceRange: "₹ 42 L – 78 L", features: ["Lake view", "Gym", "Power backup"], totalUnits: 60, availableUnits: 8 },
  { id: "p5", name: "Riverside Park", city: "Nashik", locality: "Panchavati", status: "Under construction", unitTypes: "2–4 BHK", priceRange: "₹ 60 L – 1.8 Cr", features: ["Riverfront", "Clubhouse", "Swimming pool"], totalUnits: 90, availableUnits: 40 },
  { id: "p6", name: "Hill Crest", city: "Nashik", locality: "Deolali Camp", status: "Ready to move", unitTypes: "1–2 BHK", priceRange: "₹ 38 L – 65 L", features: ["Hill view", "Power backup"], totalUnits: 44, availableUnits: 3 },
  { id: "p10", name: "Baner Greens", city: "Pune", locality: "Baner", status: "Under construction", unitTypes: "2–3 BHK", priceRange: "₹ 85 L – 1.6 Cr", features: ["Clubhouse", "Gym", "Co-working lounge"], totalUnits: 80, availableUnits: 22 },
  { id: "p14", name: "Kharadi Vista", city: "Pune", locality: "Kharadi", status: "Ready to move", unitTypes: "2–3 BHK", priceRange: "₹ 78 L – 1.4 Cr", features: ["Riverside", "Clubhouse", "Kids' play area"], totalUnits: 64, availableUnits: 9 },
];

export const PROPERTIES: Property[] = [
  { id: "r1", projectId: "p1", project: "Skyline Heights", city: "Nashik", type: "2 BHK", price: "₹ 65 L", beds: 2, baths: 2, tags: ["Covered parking", "Gym"] },
  { id: "r2", projectId: "p1", project: "Skyline Heights", city: "Nashik", type: "3 BHK", price: "₹ 1.1 Cr", beds: 3, baths: 3, tags: ["Clubhouse", "Corner unit"] },
  { id: "r3", projectId: "p10", project: "Baner Greens", city: "Pune", type: "2 BHK", price: "₹ 92 L", beds: 2, baths: 2, tags: ["Co-working lounge", "East-facing"] },
  { id: "r4", projectId: "p2", project: "Lake Vista", city: "Nashik", type: "2 BHK", price: "₹ 72 L", beds: 2, baths: 2, tags: ["Lake view", "Semi-furnished"] },
  { id: "r5", projectId: "p14", project: "Kharadi Vista", city: "Pune", type: "3 BHK", price: "₹ 1.3 Cr", beds: 3, baths: 3, tags: ["Riverside", "Kids' play area"] },
  { id: "r6", projectId: "p5", project: "Riverside Park", city: "Nashik", type: "2 BHK", price: "₹ 60 L", beds: 2, baths: 2, tags: ["Riverfront", "Pool access"] },
];
