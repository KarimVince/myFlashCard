/**
 * iPhone web app (/app), matching Android 2.0: header + account screen, Create tab for everyone
 * (AI when offered, manual guide, Load from file), AI history actions.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppShell from "@/components/app/AppShell";
import { AuthProvider } from "@/lib/auth";
import { FeaturesProvider } from "@/lib/features";
import { parseDeckFile } from "@/lib/loadDeckFile";
import * as api from "@/lib/api";
import { User } from "@/lib/types";

jest.mock("next/navigation", () => ({
  usePathname: () => "/app",
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock("@/lib/deckStorage", () => ({
  saveDeck: jest.fn(() => Promise.resolve()),
  loadAllDecks: jest.fn(() => Promise.resolve([])),
  removeDeck: jest.fn(),
  hasDeck: jest.fn(() => Promise.resolve(false)),
}));
jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  getSettings: jest.fn(),
  getMe: jest.fn(),
  getCategories: jest.fn(() => Promise.resolve([])),
  getAIOptions: jest.fn(() => new Promise(() => {})),
  listGenerations: jest.fn(),
  getGeneration: jest.fn(),
  deleteGeneration: jest.fn(() => Promise.resolve()),
}));

const ADMIN: User = {
  id: 2, alias: "Boss", email: "b@example.com", role: "admin", tier: "none", email_verified: true,
  created_at: "2026-09-01T00:00:00Z",
};
const OFF = { premium_enabled: false, accounts_enabled: false, ai_enabled: false };

function renderApp() {
  return render(<FeaturesProvider><AuthProvider><AppShell initialTab="create" /></AuthProvider></FeaturesProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  (api.getSettings as jest.Mock).mockResolvedValue(OFF);
  (api.listGenerations as jest.Mock).mockResolvedValue([]);
});

// ── Load from file ──────────────────────────────────────────────────────────

test("parseDeckFile reads a deck and rejects files that aren't decks", () => {
  const { deck, json } = parseDeckFile(
    JSON.stringify({ deckTitle: "Pasta", cards: [{ title: "Carbonara", blocks: [] }, { nope: 1 }] }), "pasta.json", 1000,
  );
  expect(deck.id).toBe(-1000);
  expect(deck.title).toBe("Pasta");
  expect(json.cards).toHaveLength(1);
  expect(() => parseDeckFile("{oops", "x.json")).toThrow("isn't valid JSON");
  expect(() => parseDeckFile('{"title":"x"}', "x.json")).toThrow("needs deckTitle and cards");
  expect(() => parseDeckFile('{"deckTitle":"x","cards":[]}', "x.json")).toThrow("No cards");
});

test("visitors get the Create tab with the manual guide and Load from file, but no AI", async () => {
  renderApp();
  expect(await screen.findByText("How to get started")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Load from file" })).toBeInTheDocument();
  expect(screen.queryByText(/Your AI decks/)).not.toBeInTheDocument();
  expect(api.getAIOptions).not.toHaveBeenCalled();
});

test("loading a deck file opens it in the viewer", async () => {
  renderApp();
  await screen.findByText("How to get started");
  const file = new File([JSON.stringify({ deckTitle: "Pasta", cards: [{ title: "Carbonara", blocks: [] }] })], "pasta.json");
  await userEvent.upload(screen.getByLabelText("Deck file"), file);
  expect(await screen.findByText("Carbonara")).toBeInTheDocument();
});

test("a bad deck file shows why", async () => {
  renderApp();
  await screen.findByText("How to get started");
  await userEvent.upload(screen.getByLabelText("Deck file"), new File(["not json"], "x.json"));
  expect(await screen.findByText("This file isn't valid JSON.")).toBeInTheDocument();
});

// ── Header and account ──────────────────────────────────────────────────────

test("header shows Log in for visitors and opens the account screen", async () => {
  renderApp();
  const account = await screen.findByRole("button", { name: "Account" });
  await waitFor(() => expect(account).toHaveTextContent("Log in"));
  await userEvent.click(account);
  const login = screen.getByRole("link", { name: "Log in" });
  expect(login).toHaveAttribute("href", "/account/login?next=/app");
  await userEvent.click(login);
  expect(sessionStorage.getItem("mfc_from_app")).toBe("1");
});

test("logged-in admin sees their alias, AI settings and Admin in the account screen", async () => {
  localStorage.setItem("mfc_user_token", "tok");
  (api.getMe as jest.Mock).mockResolvedValue(ADMIN);
  renderApp();
  const account = await screen.findByRole("button", { name: "Account" });
  await waitFor(() => expect(account).toHaveTextContent("Boss"));
  await userEvent.click(account);
  expect(screen.getByRole("link", { name: /AI settings/ })).toHaveAttribute("href", "/account/ai");
  expect(screen.getByRole("link", { name: /Admin/ })).toHaveAttribute("href", "/admin");
  expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
});

// ── AI history ──────────────────────────────────────────────────────────────

test("admins can remove an AI deck and add one to the library from the history", async () => {
  localStorage.setItem("mfc_user_token", "tok");
  window.confirm = jest.fn(() => true);
  (api.getMe as jest.Mock).mockResolvedValue(ADMIN);
  (api.listGenerations as jest.Mock).mockResolvedValue([
    { id: 7, title: "Carbonara", category_slug: "recipe", category_label: "Recipe", provider: "groq",
      key_source: "shared", card_count: 2, tokens_spent: 0, created_at: "2026-10-19T00:00:00Z" },
    { id: 8, title: "Lisbon", category_slug: "travel", category_label: "Travel", provider: "groq",
      key_source: "shared", card_count: 3, tokens_spent: 0, published_deck_id: 4, created_at: "2026-10-19T00:00:00Z" },
  ]);
  (api.getGeneration as jest.Mock).mockResolvedValue({
    id: 7, title: "Carbonara", category_slug: "recipe", category_label: "Recipe", provider: "groq", key_source: "shared",
    card_count: 2, tokens_spent: 0, created_at: "2026-10-19T00:00:00Z", description: "x", deck: { deckTitle: "Carbonara", cards: [] },
  });
  renderApp();
  expect(await screen.findByText("Your AI decks")).toBeInTheDocument();
  expect(screen.getByText(/Travel · 3 cards · ✓ in library/)).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "＋ Library" })).toHaveLength(1); // not for the published one

  await userEvent.click(screen.getByRole("button", { name: "＋ Library" }));
  expect(await screen.findByLabelText("Title")).toHaveValue("Carbonara");

  await userEvent.click(screen.getAllByRole("button", { name: "Remove" })[1]);
  await waitFor(() => expect(api.deleteGeneration).toHaveBeenCalledWith("tok", 8));
  expect(screen.queryByText("Lisbon")).not.toBeInTheDocument();
});
