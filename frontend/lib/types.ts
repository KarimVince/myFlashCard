/** Premium level. Bronze: own AI key. Silver: + a few shared AI decks. Gold: + shared AI decks every month. */
export type Tier = "none" | "bronze" | "silver" | "gold";

export interface User {
  id: number;
  alias: string;
  email: string;
  role: "user" | "admin";
  tier: Tier;
  email_verified: boolean;
  created_at: string;
  // admin list only
  last_login_at?: string | null;
  tokens_used_month?: number;
  own_key_provider?: string | null;
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

/** Shared-AI allowance. period "month" (Gold) renews on resets_on; "total" (Silver) never renews. */
export interface Balance {
  allowance: number;
  used: number;
  left: number;
  extra: number;
  total: number;
  period: "month" | "total" | null;
  resets_on: string | null;
  unlimited: boolean;
}

export interface ProviderOption {
  id: string;
  label: string;
  token_cost: number;
  is_default: boolean;
  available: boolean;
  reason: string | null;
}

export interface KeyProvider {
  id: string;
  label: string;
  model: string;
}

export interface OwnKey {
  provider: string;
  provider_label: string;
  model: string;
  key_hint: string | null;
  last_test_ok: boolean | null;
  last_tested_at: string | null;
}

export interface AIOptions {
  email_verified: boolean;
  tier: Tier;
  is_admin: boolean;
  can_generate: boolean;
  reason: string | null;
  /** Plan includes the site's AI (Silver, Gold, admin). */
  shared: boolean;
  own_key_allowed: boolean;
  own_key: OwnKey | null;
  balance: Balance;
  /** The site's AIs (only when shared). */
  providers: ProviderOption[];
  /** AIs a member can add their own key for. */
  key_providers: KeyProvider[];
  max_description: number;
}

export type KeySource = "shared" | "own";

export interface GenerationSummary {
  id: number;
  title: string | null;
  category_slug: string | null;
  category_label: string | null;
  provider: string;
  key_source: KeySource;
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
  base_url: string | null;
  has_key: boolean;
  key_hint: string | null;
}

export interface AdminAI {
  providers: AdminProvider[];
  silver_total: number;
  gold_monthly: number;
  secrets_key_configured: boolean;
}

export interface AdminGeneration {
  id: number;
  user_alias: string;
  user_email: string;
  category_label: string | null;
  provider: string;
  model: string;
  key_source: KeySource;
  description: string;
  status: string;
  title: string | null;
  error: string | null;
  tokens_spent: number;
  duration_ms: number | null;
  created_at: string;
}
