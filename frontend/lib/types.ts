export interface User {
  id: number;
  alias: string;
  email: string;
  role: "user" | "admin";
  email_verified: boolean;
  services: string[];
  created_at: string;
  // admin list only
  last_login_at?: string | null;
}

export interface Category {
  id: number;
  slug: string;
  label: string;
  description: string | null;
  ai_prompt: string | null;
  schema_json: Record<string, unknown> | null;
  icon?: string | null;
  deck_count?: number;
}

export interface Deck {
  id: number;
  title: string;
  description: string | null;
  author: string | null;
  language: string;
  card_count: number | null;
  public_url: string;
  is_free: boolean;
  downloads: number;
  category: Category;
  created_at: string;
  // admin only
  is_public?: boolean;
  storage_path?: string;
  updated_at?: string;
}
