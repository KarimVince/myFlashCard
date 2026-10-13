/**
 * Tests for the AI Create form.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateForm from "@/components/create/CreateForm";
import { AuthProvider } from "@/lib/auth";
import * as api from "@/lib/api";
import { AIOptions, Balance, Category, Generation, User } from "@/lib/types";

jest.mock("next/navigation", () => ({
  usePathname: () => "/create",
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  getMe: jest.fn(),
  getCategories: jest.fn(),
  getAIOptions: jest.fn(),
  generateDeck: jest.fn(),
}));

const USER: User = {
  id: 1, alias: "Maker", email: "m@example.com", role: "user", tier: "gold", email_verified: true,
  created_at: "2026-09-01T00:00:00Z",
};
const CATS: Category[] = [
  { id: 1, slug: "recipe", label: "Recipe", description: null, ai_prompt: null, schema_json: null, icon: "🍳" },
  { id: 2, slug: "travel", label: "Travel", description: null, ai_prompt: null, schema_json: null, icon: "✈️" },
];
const BALANCE: Balance = {
  allowance: 10, used: 6, left: 4, extra: 0, total: 4, period: "month", resets_on: "2026-10-01", unlimited: false,
};
const OPTIONS: AIOptions = {
  email_verified: true,
  tier: "gold",
  is_admin: false,
  can_generate: true,
  reason: null,
  shared: true,
  own_key_allowed: true,
  own_key: null,
  balance: BALANCE,
  max_description: 1000,
  providers: [
    { id: "gemini", label: "Gemini", token_cost: 1, is_default: true, available: true, reason: null },
    { id: "claude", label: "Claude", token_cost: 2, is_default: false, available: false, reason: "Not available right now" },
  ],
  key_providers: [{ id: "groq", label: "Groq", model: "openai/gpt-oss-120b" }],
};
const OWN_KEY = {
  provider: "groq", provider_label: "Groq", model: "openai/gpt-oss-120b", key_hint: "••••1234",
  last_test_ok: true, last_tested_at: null,
};
const GEN: Generation = {
  id: 9, title: "Carbonara", category_slug: "recipe", category_label: "Recipe", provider: "gemini", key_source: "shared",
  card_count: 2, tokens_spent: 1, created_at: "2026-09-28T00:00:00Z", description: "A Roman pasta dish",
  deck: { deckTitle: "Carbonara", cards: [] },
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  (api.getCategories as jest.Mock).mockResolvedValue(CATS);
  (api.getAIOptions as jest.Mock).mockResolvedValue(OPTIONS);
  (api.getMe as jest.Mock).mockResolvedValue(USER);
});

function renderForm(onGenerated = jest.fn()) {
  render(<AuthProvider><CreateForm variant="web" returnTo="/create" onGenerated={onGenerated} /></AuthProvider>);
  return onGenerated;
}

test("asks visitors to create an account", async () => {
  renderForm();
  expect(await screen.findByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/account/register?next=%2Fcreate");
});

test("asks unverified users to confirm their email", async () => {
  localStorage.setItem("mfc_user_token", "tok");
  (api.getAIOptions as jest.Mock).mockResolvedValue({ ...OPTIONS, email_verified: false });
  renderForm();
  expect(await screen.findByText("Confirm your email first")).toBeInTheDocument();
});

test("generates a deck with the chosen category and default provider", async () => {
  localStorage.setItem("mfc_user_token", "tok");
  (api.generateDeck as jest.Mock).mockResolvedValue({ generation: GEN, balance: { ...BALANCE, left: 3, total: 3 } });
  const onGenerated = renderForm();
  expect(await screen.findByText("4 AI decks left")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Claude/ })).toBeDisabled();
  expect(screen.queryByText("AI to use")).not.toBeInTheDocument(); // no own key → no choice

  await userEvent.click(screen.getByRole("button", { name: /Travel/ }));
  const button = screen.getByRole("button", { name: /Generate deck/ });
  expect(button).toBeDisabled(); // description too short
  await userEvent.type(screen.getByRole("textbox"), "Three days in Lisbon on a budget");
  await userEvent.click(button);

  await waitFor(() => expect(onGenerated).toHaveBeenCalledWith(GEN, expect.any(Array)));
  expect(api.generateDeck).toHaveBeenCalledWith("tok", "travel", "Three days in Lisbon on a budget", "gemini", "shared");
  expect(await screen.findByText("3 AI decks left")).toBeInTheDocument();
});

test("shows the server error when generation fails", async () => {
  localStorage.setItem("mfc_user_token", "tok");
  (api.generateDeck as jest.Mock).mockRejectedValue(new Error("502: The AI didn't return a usable deck."));
  renderForm();
  await screen.findByText("4 AI decks left");
  await userEvent.type(screen.getByRole("textbox"), "Three days in Lisbon on a budget");
  await userEvent.click(screen.getByRole("button", { name: /Generate deck/ }));
  expect(await screen.findByText("The AI didn't return a usable deck.")).toBeInTheDocument();
});

test("disables generation when shared decks run out and there is no own key", async () => {
  localStorage.setItem("mfc_user_token", "tok");
  (api.getAIOptions as jest.Mock).mockResolvedValue({ ...OPTIONS, balance: { ...BALANCE, left: 0, total: 0 } });
  renderForm();
  expect(await screen.findByRole("button", { name: "No AI decks left this month" })).toBeDisabled();
});

test("explains that AI is a Premium feature", async () => {
  localStorage.setItem("mfc_user_token", "tok");
  (api.getAIOptions as jest.Mock).mockResolvedValue({
    ...OPTIONS, tier: "none", can_generate: false, shared: false, own_key_allowed: false, providers: [],
    reason: "AI generation is for Premium members (Bronze, Silver or Gold).",
  });
  renderForm();
  expect(await screen.findByText("AI decks are a Premium feature")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "See your plan" })).toHaveAttribute("href", "/account/ai");
});

test("asks Bronze members without a key to add one", async () => {
  localStorage.setItem("mfc_user_token", "tok");
  (api.getAIOptions as jest.Mock).mockResolvedValue({ ...OPTIONS, tier: "bronze", shared: false, providers: [] });
  renderForm();
  expect(await screen.findByText("Add your API key to start")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Add your API key" })).toHaveAttribute("href", "/account/ai");
});

test("Bronze members generate with their own key", async () => {
  localStorage.setItem("mfc_user_token", "tok");
  (api.getAIOptions as jest.Mock).mockResolvedValue({ ...OPTIONS, tier: "bronze", shared: false, providers: [], own_key: OWN_KEY });
  (api.generateDeck as jest.Mock).mockResolvedValue({ generation: { ...GEN, key_source: "own" }, balance: BALANCE });
  renderForm();
  expect(await screen.findByText(/Using your Groq key/)).toBeInTheDocument();
  await userEvent.type(screen.getByRole("textbox"), "Three days in Lisbon on a budget");
  await userEvent.click(screen.getByRole("button", { name: /Generate deck/ }));
  await waitFor(() => expect(api.generateDeck).toHaveBeenCalledWith("tok", "recipe", "Three days in Lisbon on a budget", undefined, "own"));
});

test("Gold members with a key choose between our AI and theirs", async () => {
  localStorage.setItem("mfc_user_token", "tok");
  (api.getAIOptions as jest.Mock).mockResolvedValue({ ...OPTIONS, own_key: OWN_KEY });
  (api.generateDeck as jest.Mock).mockResolvedValue({ generation: GEN, balance: BALANCE });
  renderForm();
  expect(await screen.findByText("AI to use")).toBeInTheDocument();
  expect(screen.getByText("4 AI decks left")).toBeInTheDocument(); // starts on our AI
  await userEvent.click(screen.getByRole("button", { name: /Your key/ }));
  expect(screen.queryByText("4 AI decks left")).not.toBeInTheDocument();
  await userEvent.type(screen.getByRole("textbox"), "Three days in Lisbon on a budget");
  await userEvent.click(screen.getByRole("button", { name: /Generate deck/ }));
  await waitFor(() => expect(api.generateDeck).toHaveBeenCalledWith("tok", "recipe", "Three days in Lisbon on a budget", undefined, "own"));
});

test("starts on the own key when shared decks are used up", async () => {
  localStorage.setItem("mfc_user_token", "tok");
  (api.getAIOptions as jest.Mock).mockResolvedValue({ ...OPTIONS, own_key: OWN_KEY, balance: { ...BALANCE, left: 0, total: 0 } });
  renderForm();
  expect(await screen.findByText(/Using your Groq key/)).toBeInTheDocument();
});
