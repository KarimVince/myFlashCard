/**
 * Tests for the admin "Add to library" panel on the Create page.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PublishPanel from "@/components/create/PublishPanel";
import * as api from "@/lib/api";
import { Generation } from "@/lib/types";

jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  adminPublishGeneration: jest.fn(),
}));

const GEN: Generation = {
  id: 9, title: "Carbonara", category_slug: "recipe", category_label: "Recipe", provider: "groq", key_source: "shared",
  card_count: 2, tokens_spent: 0, created_at: "2026-10-19T00:00:00Z", description: "A Roman pasta dish",
  deck: { deckTitle: "Carbonara", cards: [] },
};

beforeEach(() => jest.clearAllMocks());

test("publishes the deck with the chosen details", async () => {
  (api.adminPublishGeneration as jest.Mock).mockResolvedValue({ id: 42 });
  const onPublished = jest.fn();
  render(<PublishPanel token="tok" gen={GEN} premiumEnabled={false} onPublished={onPublished} />);
  await userEvent.click(screen.getByRole("button", { name: /Add to library/ }));
  const title = screen.getByLabelText("Title");
  expect(title).toHaveValue("Carbonara");
  await userEvent.clear(title);
  await userEvent.type(title, "Roman Carbonara");
  await userEvent.click(screen.getByLabelText(/Premium deck/));
  expect(screen.getByText(/stays hidden until you switch Premium on/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Publish" }));
  await waitFor(() => expect(api.adminPublishGeneration).toHaveBeenCalledWith(
    "tok", 9, { title: "Roman Carbonara", description: undefined, language: "en", is_free: false },
  ));
  expect(onPublished).toHaveBeenCalledWith(42);
});

test("shows when the deck is already in the library", () => {
  render(<PublishPanel token="tok" gen={{ ...GEN, published_deck_id: 42 }} premiumEnabled onPublished={jest.fn()} />);
  expect(screen.getByText(/In the public library/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Open the library" })).toHaveAttribute("href", "/library");
});

test("shows the server error", async () => {
  (api.adminPublishGeneration as jest.Mock).mockRejectedValue(new Error("409: This deck is already in the library"));
  render(<PublishPanel token="tok" gen={GEN} premiumEnabled onPublished={jest.fn()} />);
  await userEvent.click(screen.getByRole("button", { name: /Add to library/ }));
  await userEvent.click(screen.getByRole("button", { name: "Publish" }));
  expect(await screen.findByText("This deck is already in the library")).toBeInTheDocument();
});
