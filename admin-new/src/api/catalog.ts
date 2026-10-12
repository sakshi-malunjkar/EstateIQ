/**
 * Project + property catalog, backed by the API.
 *   Reads  (GET /projects, GET /properties): public, plain fetch.
 *   Writes (POST / PATCH / DELETE):          admin, apiFetch with the Supabase bearer token.
 * The API already returns camelCase and derives `unitTypes`, `priceRange`, `type` and `price`, so its JSON is
 * used as-is. Every write is followed by a refetch, so what the screens show is what the server saved.
 */
import { useEffect, useSyncExternalStore } from "react";
import type { City, Furnishing, Project, Property, PropertyType } from "./types";
import { API_URL, apiFetch } from "./http";

export interface Catalog { projects: Project[]; properties: Property[] }

/** "₹ 65 L" / "₹ 1.2 Cr" (Indian format, §7). Used for the live price preview in the property form. */
export const fmtLakh = (l: number) => (l >= 100 ? `₹ ${(l / 100).toFixed(2).replace(/\.?0+$/, "")} Cr` : `₹ ${Math.round(l * 10) / 10} L`);
/** "2 BHK" · "3 BHK Villa" · "Plot" */
export const propertyTitle = (p: Pick<Property, "bhk" | "propertyType">) =>
  p.propertyType === "Plot" ? "Plot" : `${p.bhk ?? "—"} BHK${p.propertyType && p.propertyType !== "Apartment" ? ` ${p.propertyType}` : ""}`;

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/* ---- store ---- */

interface State extends Catalog { loading: boolean; loaded: boolean; error: string | null }
let state: State = { projects: [], properties: [], loading: false, loaded: false, error: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => { state = { ...state, ...patch }; listeners.forEach((fn) => fn()); };
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

async function publicGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: { "ngrok-skip-browser-warning": "1" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

/** Re-read both lists from the API. Keeps showing the old data if the request fails. */
export async function refreshCatalog(): Promise<void> {
  set({ loading: true, error: null });
  try {
    const [projects, properties] = await Promise.all([publicGet<Project[]>("/projects"), publicGet<Property[]>("/properties")]);
    set({ projects, properties, loading: false, loaded: true });
  } catch (e) {
    set({ loading: false, error: e instanceof Error ? e.message : "Could not load the catalog." });
  }
}

/** The catalog, fetched when a screen mounts. `loading` is only true before the first successful load. */
export function useCatalog(): Catalog & { loading: boolean; error: string | null; reload: () => Promise<void> } {
  const s = useSyncExternalStore(subscribe, () => state);
  useEffect(() => { void refreshCatalog(); }, []);
  return { projects: s.projects, properties: s.properties, loading: s.loading && !s.loaded, error: s.error, reload: refreshCatalog };
}

/* ---- derived views ---- */

/** The API already derives the price range and BHK list from the project's properties. */
export const projectView = (p: Project, _properties?: Property[]): Project => p;

export const projectImage = (p: Project) => p.image || `/images/${slug(p.name)}.jpg`;

/* ---- mutations (admin; reject with the API's message on failure) ---- */

export type ProjectInput = Pick<Project, "name" | "city" | "locality" | "status" | "totalUnits" | "availableUnits" | "description" | "image" | "features">;
export type PropertyInput = Required<Pick<Property, "propertyType" | "priceLakh" | "beds" | "baths" | "tags" | "status">> &
  Pick<Property, "bhk" | "areaSqft" | "furnishing" | "image">;

/** Create (no id) or update a project. Resolves to its id. */
export async function saveProject(input: ProjectInput, id?: string): Promise<string> {
  const saved = await apiFetch<Project>(id ? `/projects/${id}` : "/projects", { method: id ? "PATCH" : "POST", body: JSON.stringify(input) });
  await refreshCatalog();
  return saved.id;
}

/** Also removes the project's properties (the database cascades). */
export async function deleteProject(id: string): Promise<void> {
  await apiFetch<void>(`/projects/${id}`, { method: "DELETE" });
  await refreshCatalog();
}

/** Create (no id) or update a property. Resolves to its id. */
export async function saveProperty(projectId: string, input: PropertyInput, id?: string): Promise<string> {
  const saved = await apiFetch<Property>(id ? `/properties/${id}` : `/projects/${projectId}/properties`, {
    method: id ? "PATCH" : "POST",
    body: JSON.stringify(input),
  });
  await refreshCatalog();
  return saved.id;
}

export async function deleteProperty(id: string): Promise<void> {
  await apiFetch<void>(`/properties/${id}`, { method: "DELETE" });
  await refreshCatalog();
}

export type { City, Furnishing, PropertyType };
