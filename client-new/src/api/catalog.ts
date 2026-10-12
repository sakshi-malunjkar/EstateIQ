/**
 * Public project + property catalog, read from the API (GET /projects, GET /properties — no auth).
 * The API derives `unitTypes`, `priceRange`, `type` and `price`, so its JSON is used as-is.
 * One shared fetch per page load, however many components ask for it.
 */
import { useEffect, useSyncExternalStore } from "react";
import type { Project, Property } from "./types";

const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000").replace(/\/$/, "");

export interface Catalog { projects: Project[]; properties: Property[] }
interface State extends Catalog { loading: boolean; loaded: boolean; error: string | null }

let state: State = { projects: [], properties: [], loading: false, loaded: false, error: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => { state = { ...state, ...patch }; listeners.forEach((fn) => fn()); };
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

async function get<T>(path: string): Promise<T> {
  // the header lets the ngrok tunnel skip its browser interstitial; harmless elsewhere
  const res = await fetch(`${API_URL}${path}`, { headers: { "ngrok-skip-browser-warning": "1" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

let inflight: Promise<void> | null = null;
/** Fetch (or re-fetch) the catalog. Concurrent calls share one request. */
export function loadCatalog(): Promise<void> {
  if (inflight) return inflight;
  set({ loading: true, error: null });
  inflight = Promise.all([get<Project[]>("/projects"), get<Property[]>("/properties")])
    .then(([projects, properties]) => set({ projects, properties, loading: false, loaded: true }))
    .catch((e) => set({ loading: false, error: e instanceof Error ? e.message : "Could not load projects." }))
    .finally(() => { inflight = null; });
  return inflight;
}

/** The catalog. `loading` is true until the first response (success or failure) arrives. */
export function useCatalog(): Catalog & { loading: boolean; error: string | null; reload: () => Promise<void> } {
  const s = useSyncExternalStore(subscribe, () => state);
  useEffect(() => { if (!state.loaded && !inflight) void loadCatalog(); }, []);
  // Before the effect has run (first render) nothing is loading yet, but nothing has loaded either.
  const loading = s.loading || (!s.loaded && !s.error);
  return { projects: s.projects, properties: s.properties, loading, error: s.error, reload: loadCatalog };
}

/** The API returns the price range and BHK list already derived from the project's properties. */
export const projectView = (p: Project, _properties?: Property[]): Project => p;

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
export const projectImage = (p: Project) => p.image || `/images/${slug(p.name)}.jpg`;
