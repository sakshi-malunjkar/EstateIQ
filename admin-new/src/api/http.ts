import { supabase } from "@/lib/supabase";

export const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** fetch against the backend with the current Supabase access token as a Bearer header. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession(); // refreshes an expired token automatically
  const headers = new Headers(init.headers);
  if (data.session) headers.set("Authorization", `Bearer ${data.session.access_token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  headers.set("ngrok-skip-browser-warning", "1"); // harmless locally; needed behind the ngrok tunnel

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (res.status === 401) await supabase.auth.signOut(); // token rejected → back to login
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") detail = body.detail;
      else if (Array.isArray(body.detail) && body.detail.length) {
        // FastAPI validation errors: [{ loc: ["body", "image"], msg: "Value error, ..." }]
        detail = body.detail.map((d: { loc?: unknown[]; msg?: string }) => `${String(d.loc?.[d.loc.length - 1] ?? "")}: ${(d.msg ?? "").replace(/^Value error, /, "")}`).join("; ");
      } else detail = JSON.stringify(body.detail ?? body);
    } catch { /* non-JSON body */ }
    throw new ApiError(res.status, detail);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}
