/**
 * Tests for the AI Create form.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateForm from "@/components/create/CreateForm";
import { AuthProvider } from "@/lib/auth";
import * as api from "@/lib/api";
import { AIOptions, Category, Generation, User } from "@/lib/types";

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
  id: 1, alias: "Maker", email: "m@example.com", role: "user", email_verified: true, services: [],
  created_at: "2026-09-01T00:00:00Z",
};
const CATS: Category[] = [
  { id: 1, slug: "recipe", label: "Recipe", description: null, ai_prompt: null, schema_json: null, icon: "🍳" },
  { id: 2, slug: "travel", label: "Travel", description: null, ai_prompt: null, schema_json: null, icon: "✈️" },
];
const BALANCE = { monthly_allowance: 5, monthly_used: 1, monthly_left: 4, extra: 0, total: 4, resets_on: "2026-10-01" };
const OPTIONS: AIOptions = {
  email_verified: true,
  balance: BALANCE,
  max_description: 1000,
  providers: [
    { id: "gemini", label: "Gemini", token_cost: 1, is_default: true, available: true, reason: null },
    { id: "claude", label: "Claude", token_cost: 2, is_default: false, available: false, reason: "Needs extra access — ask the admin" },
  ],
};
const GEN: Generation = {
  id: 9, title: "Carbonara", category_slug: "recipe", category_label: "Recipe", provider: "gemini",
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
  (api.generateDeck as jest.Mock).mockResolvedValue({ generation: GEN, balance: { ...BALANCE, monthly_left: 3, total: 3 } });
  const onGenerated = renderForm();
  expect(await screen.findByText("4 tokens left")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Claude/ })).toBeDisabled();

  await userEvent.click(screen.getByRole("button", { name: /Travel/ }));
  const button = screen.getByRole("button", { name: /Generate deck · 1 token/ });
  expect(button).toBeDisabled(); // description too short
  await userEvent.type(screen.getByRole("textbox"), "Three days in Lisbon on a budget");
  await userEvent.click(button);

  await waitFor(() => expect(onGenerated).toHaveBeenCalledWith(GEN, expect.any(Array)));
  expect(api.generateDeck).toHaveBeenCalledWith("tok", "travel", "Three days in Lisbon on a budget", "gemini");
  expect(await screen.findByText("3 tokens left")).toBeInTheDocument();
});

test("shows the server error when generation fails", async () => {
  localStorage.setItem("mfc_user_token", "tok");
  (api.generateDeck as jest.Mock).mockRejectedValue(new Error("502: The AI didn't return a usable deck."));
  renderForm();
  await screen.findByText("4 tokens left");
  await userEvent.type(screen.getByRole("textbox"), "Three days in Lisbon on a budget");
  await userEvent.click(screen.getByRole("button", { name: /Generate deck/ }));
  expect(await screen.findByText("The AI didn't return a usable deck.")).toBeInTheDocument();
});

test("disables generation when out of tokens", async () => {
  localStorage.setItem("mfc_user_token", "tok");
  (api.getAIOptions as jest.Mock).mockResolvedValue({ ...OPTIONS, balance: { ...BALANCE, monthly_left: 0, total: 0 } });
  renderForm();
  expect(await screen.findByRole("button", { name: "No tokens left this month" })).toBeDisabled();
});
