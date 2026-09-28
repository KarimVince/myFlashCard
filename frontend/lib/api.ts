import { Category, Deck, User } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Auth ─────────────────────────────────────────────────────────────────

const AUTH_KEY = "mfc_admin_token";
const USER_KEY = "mfc_user_token";

/**
 * Token for admin API calls: the legacy admin password if one was entered,
 * otherwise the logged-in user's session (the backend checks the admin role).
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(AUTH_KEY) ?? getUserToken();
}

export function getUserToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}

export function setUserToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(USER_KEY, token);
    else localStorage.removeItem(USER_KEY);
  } catch {
    // storage unavailable (private mode) — session lasts until reload
  }
}

export function setToken(token: string): void {
  sessionStorage.setItem(AUTH_KEY, token);
}

export function clearToken(): void {
  sessionStorage.removeItem(AUTH_KEY);
}

// ── Helpers ──────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = body?.detail;
    // FastAPI validation errors are a list of {msg}; show them as text.
    const msg = Array.isArray(detail)
      ? detail.map((d: { msg?: string }) => (d.msg ?? "").replace(/^Value error, /, "")).join(". ")
      : detail ?? res.statusText;
    throw new Error(`${res.status}: ${msg}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Public endpoints ──────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  return request<Category[]>("/categories");
}

export async function getDecks(params?: {
  category?: string;
  lang?: string;
}): Promise<Deck[]> {
  const qs = new URLSearchParams();
  if (params?.category) qs.set("category", params.category);
  if (params?.lang) qs.set("lang", params.lang);
  const q = qs.toString();
  return request<Deck[]>(`/decks${q ? `?${q}` : ""}`);
}

export async function getDeck(id: number): Promise<Deck> {
  return request<Deck>(`/decks/${id}`);
}

export function downloadUrl(id: number): string {
  return `${BASE}/decks/${id}/download`;
}

export async function getBuilds(): Promise<{ filename: string; url: string; size_mb: number }[]> {
  return request<{ filename: string; url: string; size_mb: number }[]>("/builds");
}

export interface AppSettings {
  premium_enabled: boolean;
}

export async function getSettings(): Promise<AppSettings> {
  return request<AppSettings>("/settings");
}

// ── Accounts ──────────────────────────────────────────────────────────────

export interface AuthResult {
  token: string;
  user: User;
}

function json(body: unknown): RequestInit {
  return { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export async function register(alias: string, email: string, password: string): Promise<AuthResult> {
  return request<AuthResult>("/auth/register", { method: "POST", ...json({ alias, email, password }) });
}

export async function login(email: string, password: string): Promise<AuthResult> {
  return request<AuthResult>("/auth/login", { method: "POST", ...json({ email, password }) });
}

export async function logout(token: string): Promise<void> {
  return request<void>("/auth/logout", { method: "POST" }, token);
}

export async function getMe(token: string): Promise<User> {
  return request<User>("/me", {}, token);
}

export async function updateAlias(token: string, alias: string): Promise<User> {
  return request<User>("/me", { method: "PATCH", ...json({ alias }) }, token);
}

export async function changePassword(token: string, current_password: string, new_password: string): Promise<void> {
  return request<void>("/me/password", { method: "POST", ...json({ current_password, new_password }) }, token);
}

export async function deleteAccount(token: string, password: string): Promise<void> {
  return request<void>("/me", { method: "DELETE", ...json({ password }) }, token);
}

export async function verifyEmail(token: string): Promise<User> {
  return request<User>("/auth/verify-email", { method: "POST", ...json({ token }) });
}

export async function resendVerification(token: string): Promise<void> {
  return request<void>("/auth/resend-verification", { method: "POST" }, token);
}

export async function forgotPassword(email: string): Promise<void> {
  return request<void>("/auth/forgot-password", { method: "POST", ...json({ email }) });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  return request<void>("/auth/reset-password", { method: "POST", ...json({ token, password }) });
}

/** Strip the "422: " status prefix and pydantic noise for display. */
export function errorMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  const m = raw.match(/^\d{3}: ([\s\S]*)$/);
  return m ? m[1] : raw;
}

// ── Admin endpoints ───────────────────────────────────────────────────────

export async function adminListUsers(token: string, q?: string): Promise<User[]> {
  return request<User[]>(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`, {}, token);
}

export async function adminSetService(token: string, userId: number, service: string, enabled: boolean): Promise<User> {
  return request<User>(`/admin/users/${userId}/services/${service}`, { method: "PUT", ...json({ enabled }) }, token);
}

export async function adminDeleteUser(token: string, userId: number): Promise<void> {
  return request<void>(`/admin/users/${userId}`, { method: "DELETE" }, token);
}

export async function adminGetSettings(token: string): Promise<AppSettings> {
  return request<AppSettings>("/admin/settings", {}, token);
}

export async function adminSetPremium(token: string, enabled: boolean): Promise<AppSettings> {
  return request<AppSettings>(
    "/admin/settings/premium",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    },
    token,
  );
}

export async function adminListDecks(token: string): Promise<Deck[]> {
  return request<Deck[]>("/admin/decks", {}, token);
}

export async function adminUploadDeck(
  token: string,
  file: File,
  meta: {
    category_slug: string;
    title: string;
    description?: string;
    author?: string;
    language?: string;
    is_free?: boolean;
  },
): Promise<Deck> {
  const form = new FormData();
  form.append("json_file", file);
  Object.entries(meta).forEach(([k, v]) => {
    if (v != null) form.append(k, String(v));
  });
  return request<Deck>("/admin/decks", { method: "POST", body: form }, token);
}

export async function adminUpdateDeck(
  token: string,
  id: number,
  file: File | null,
  meta: Partial<{
    category_slug: string;
    title: string;
    description: string;
    author: string;
    language: string;
    is_free: boolean;
  }>,
): Promise<Deck> {
  const form = new FormData();
  if (file) form.append("json_file", file);
  Object.entries(meta).forEach(([k, v]) => {
    if (v != null) form.append(k, String(v));
  });
  return request<Deck>(
    `/admin/decks/${id}`,
    { method: "PUT", body: form },
    token,
  );
}

export async function adminSetVisibility(
  token: string,
  id: number,
  is_public: boolean,
): Promise<Deck> {
  return request<Deck>(
    `/admin/decks/${id}/visibility`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_public }),
    },
    token,
  );
}

export async function adminSetFree(
  token: string,
  id: number,
  is_free: boolean,
): Promise<Deck> {
  return request<Deck>(
    `/admin/decks/${id}/free`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_free }),
    },
    token,
  );
}

export async function adminDeleteDeck(
  token: string,
  id: number,
): Promise<void> {
  return request<void>(
    `/admin/decks/${id}`,
    { method: "DELETE" },
    token,
  );
}

export async function adminListCategories(token: string): Promise<Category[]> {
  return request<Category[]>("/admin/categories", {}, token);
}

export async function adminCreateCategory(
  token: string,
  data: {
    slug: string;
    label: string;
    description?: string;
    icon?: string;
    ai_prompt?: string;
    schema_json?: Record<string, unknown>;
  },
): Promise<Category> {
  return request<Category>(
    "/admin/categories",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
    token,
  );
}

export async function adminUpdateCategory(
  token: string,
  id: number,
  data: Partial<{
    label: string;
    description: string;
    icon: string;
    ai_prompt: string;
    schema_json: Record<string, unknown>;
  }>,
): Promise<Category> {
  return request<Category>(
    `/admin/categories/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
    token,
  );
}

export async function adminListBuilds(
  token: string,
): Promise<{ filename: string; url: string; size_mb: number }[]> {
  return request<{ filename: string; url: string; size_mb: number }[]>("/admin/builds", {}, token);
}

export async function adminDeleteBuild(token: string, filename: string): Promise<void> {
  return request<void>(`/admin/builds/${encodeURIComponent(filename)}`, { method: "DELETE" }, token);
}

export async function adminUploadBuild(
  token: string,
  file: File,
): Promise<{ filename: string; url: string; size_mb: number }> {
  const form = new FormData();
  form.append("file", file);
  return request<{ filename: string; url: string; size_mb: number }>(
    "/admin/upload-build",
    { method: "POST", body: form },
    token,
  );
}
