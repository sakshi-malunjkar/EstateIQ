/**
 * Real admin auth via Supabase. The session lives in supabase-js (localStorage, auto-refreshed);
 * this module mirrors it into a tiny store so components can subscribe with useAdminSession().
 * The backend verifies the same access token (api/auth.py), sent by api/http.ts.
 */
import { useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "@/lib/supabase";

export interface AdminSession { email: string; name: string; at: number }

const toSession = (s: Session | null): AdminSession | null => {
  if (!s?.user) return null;
  const email = s.user.email ?? "";
  const meta = s.user.user_metadata as { name?: string; full_name?: string } | undefined;
  return { email, name: meta?.name ?? meta?.full_name ?? (email.split("@")[0] || "Admin"), at: Date.now() };
};

let session: AdminSession | null = null;
let ready = !supabaseConfigured; // false until the stored session has been read
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());
const subscribe = (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); };

if (supabaseConfigured) {
  supabase.auth.getSession().then(({ data }) => { session = toSession(data.session); ready = true; emit(); });
  supabase.auth.onAuthStateChange((_event, s) => {
    const next = toSession(s);
    // token refreshes fire this too — only publish when who is signed in actually changes
    if (next?.email === session?.email && next?.name === session?.name) { ready = true; return; }
    session = next; ready = true; emit();
  });
}

export function useAdminSession(): AdminSession | null {
  return useSyncExternalStore(subscribe, () => session);
}
/** False while the stored session is still being restored — guards must wait, not redirect. */
export function useAuthReady(): boolean {
  return useSyncExternalStore(subscribe, () => ready);
}

/** Sign in with email + password. Returns an error message, or null on success. */
export async function login(email: string, password: string): Promise<string | null> {
  if (!supabaseConfigured) return "Supabase isn't configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in admin-new/.env.";
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) {
    return /invalid login/i.test(error.message) ? "That email and password don't match an admin account." : error.message;
  }
  session = toSession(data.session); ready = true; emit();
  return null;
}

export async function logout() {
  await supabase.auth.signOut();
  session = null; emit();
  try { localStorage.removeItem("eq-admin-sidebar-collapsed"); } catch { /* ignore */ }
}

/** Update display name (user metadata) and email. Returns an error message, or null. */
export async function updateProfile(name: string, email: string): Promise<string | null> {
  const newEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.updateUser({
    data: { name: name.trim() },
    ...(newEmail !== session?.email.toLowerCase() ? { email: newEmail } : {}),
  });
  if (error) return error.message;
  // an email change is pending until the user confirms it, so the session email stays as-is
  session = session && { ...session, name: (data.user.user_metadata as { name?: string }).name ?? session.name };
  emit();
  return null;
}

/** Verify the current password, then set the new one. Returns an error message, or null. */
export async function changePassword(current: string, next: string): Promise<string | null> {
  if (!session) return "You're signed out. Sign in again.";
  const check = await supabase.auth.signInWithPassword({ email: session.email, password: current });
  if (check.error) return "Your current password isn't right.";
  const { error } = await supabase.auth.updateUser({ password: next });
  return error ? error.message : null;
}
