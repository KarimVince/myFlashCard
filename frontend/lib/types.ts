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
  tokens_used_month?: number;
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

// ── AI generation ──────────────────────────────────────────────────────────

export interface Balance {
  monthly_allowance: number;
  monthly_used: number;
  monthly_left: number;
  extra: number;
  total: number;
  resets_on: string;
}

export interface ProviderOption {
  id: string;
  label: string;
  token_cost: number;
  is_default: boolean;
  available: boolean;
  reason: string | null;
}

export interface AIOptions {
  email_verified: boolean;
  balance: Balance;
  providers: ProviderOption[];
  max_description: number;
}

export interface GenerationSummary {
  id: number;
  title: string | null;
  category_slug: string | null;
  category_label: string | null;
  provider: string;
  card_count: number | null;
  tokens_spent: number;
  created_at: string;
}

export interface Generation extends GenerationSummary {
  description: string;
  // Deck JSON in the app format ({ deckTitle, cards })
  deck: { deckTitle: string; accentColor?: string; cards: unknown[] };
}

export interface AdminProvider {
  id: string;
  label: string;
  enabled: boolean;
  is_default: boolean;
  model: string;
  token_cost: number;
  requires_service: string | null;
  base_url: string | null;
  has_key: boolean;
  key_hint: string | null;
}

export interface AdminAI {
  providers: AdminProvider[];
  free_monthly: number;
  premium_monthly: number;
  secrets_key_configured: boolean;
}

export interface AdminGeneration {
  id: number;
  user_alias: string;
  user_email: string;
  category_label: string | null;
  provider: string;
  model: string;
  description: string;
  status: string;
  title: string | null;
  error: string | null;
  tokens_spent: number;
  duration_ms: number | null;
  created_at: string;
}
