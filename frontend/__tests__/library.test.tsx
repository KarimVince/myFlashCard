/**
 * Tests for /library page.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LibraryPage from "@/app/library/page";
import * as api from "@/lib/api";
import { Category, Deck } from "@/lib/types";

// ── Mocks ─────────────────────────────────────────────────────────────────

jest.mock("next/navigation", () => ({ usePathname: () => "/library" }));
jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  getCategories: jest.fn(),
  getDecks: jest.fn(),
  getSettings: jest.fn(),
  downloadUrl: jest.fn((id: number) => `http://api/decks/${id}/download`),
}));

const CATS: Category[] = [
  { id: 1, slug: "recipe", label: "Recipe", description: null, ai_prompt: null, schema_json: null },
  { id: 2, slug: "study", label: "Study", description: null, ai_prompt: null, schema_json: null },
];

const DECKS: Deck[] = [
  {
    id: 1,
    title: "Pasta Week",
    description: "5 pasta dishes",
    author: "Chef A",
    language: "en",
    card_count: 5,
    public_url: "https://cdn/recipe/1.json",
    is_free: true,
    downloads: 12,
    category: CATS[0],
    created_at: "2025-09-01T00:00:00Z",
  },
  {
    id: 2,
    title: "French History",
    description: "WW2 summary",
    author: null,
    language: "fr",
    card_count: 8,
    public_url: "https://cdn/study/2.json",
    is_free: true,
    downloads: 4,
    category: CATS[1],
    created_at: "2025-09-02T00:00:00Z",
  },
];

beforeEach(() => {
  (api.getCategories as jest.Mock).mockResolvedValue(CATS);
  (api.getDecks as jest.Mock).mockResolvedValue(DECKS);
  (api.getSettings as jest.Mock).mockResolvedValue({ premium_enabled: false });
});

// ── Tests ─────────────────────────────────────────────────────────────────

test("renders deck cards fetched from mocked API", async () => {
  render(<LibraryPage />);
  await waitFor(() => screen.getByText("Pasta Week"));
  expect(screen.getByText("French History")).toBeInTheDocument();
});

test("category filter buttons change displayed decks", async () => {
  render(<LibraryPage />);
  await waitFor(() => screen.getAllByText("Recipe"));
  // Click the "Recipe" filter button (role=button, not the badge span inside a card)
  const recipeBtn = screen.getAllByRole("button").find(
    (b) => b.textContent === "Recipe",
  )!;
  fireEvent.click(recipeBtn);
  await waitFor(() => {
    expect(screen.getByText("Pasta Week")).toBeInTheDocument();
    expect(screen.queryByText("French History")).not.toBeInTheDocument();
  });
});

test("download button calls correct API URL", async () => {
  render(<LibraryPage />);
  await waitFor(() => screen.getByText("Pasta Week"));
  const links = screen.getAllByRole("link", { name: /Download JSON/i });
  expect(links[0]).toHaveAttribute("href", "http://api/decks/1/download");
});

test("shows empty state when no decks match filter", async () => {
  (api.getDecks as jest.Mock).mockResolvedValue([]);
  render(<LibraryPage />);
  await waitFor(() =>
    expect(screen.getByText(/No decks found/i)).toBeInTheDocument(),
  );
});

test("hides all premium references while premium is inactive", async () => {
  render(<LibraryPage />);
  await waitFor(() => expect(screen.getByText("Pasta Week")).toBeInTheDocument());
  expect(screen.queryByText(/premium/i)).not.toBeInTheDocument();
  expect(screen.queryByText("✓ Free")).not.toBeInTheDocument();
});

test("shows premium notice and badges when premium is active", async () => {
  (api.getSettings as jest.Mock).mockResolvedValue({ premium_enabled: true });
  (api.getDecks as jest.Mock).mockResolvedValue([...DECKS, { ...DECKS[0], id: 3, title: "Gold Deck", is_free: false }]);
  render(<LibraryPage />);
  await waitFor(() => expect(screen.getByText("Gold Deck")).toBeInTheDocument());
  await waitFor(() => expect(screen.getByText(/Premium access is coming/)).toBeInTheDocument());
  expect(screen.getByText("Premium — access required")).toBeInTheDocument();
});
