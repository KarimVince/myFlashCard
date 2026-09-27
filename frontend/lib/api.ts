import { Category, Deck } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Auth ─────────────────────────────────────────────────────────────────

const AUTH_KEY = "mfc_admin_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(AUTH_KEY);
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
    const msg = body?.detail ?? res.statusText;
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

// ── Admin endpoints ───────────────────────────────────────────────────────

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
