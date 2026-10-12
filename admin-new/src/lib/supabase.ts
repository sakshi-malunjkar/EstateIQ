import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** True when the Supabase env vars are present; the login screen explains if not. */
export const supabaseConfigured = Boolean(url && anonKey);

// Placeholder values keep the app rendering (login shows a config error) instead of crashing at import.
export const supabase = createClient(url ?? "http://localhost", anonKey ?? "missing", {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: "eq-admin-supabase-auth" },
});
