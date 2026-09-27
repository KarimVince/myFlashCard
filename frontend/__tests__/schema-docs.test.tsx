/**
 * Tests for /schema page.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SchemaPage from "@/app/schema/page";
import * as api from "@/lib/api";
import { Category } from "@/lib/types";

jest.mock("next/navigation", () => ({ usePathname: () => "/schema" }));
jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  getCategories: jest.fn(),
}));

const CATS: Category[] = [
  {
    id: 1,
    slug: "recipe",
    label: "Recipe",
    description: null,
    ai_prompt: "Create a recipe deck in JSON format...",
    schema_json: { type: "object" },
  },
  {
    id: 2,
    slug: "study",
    label: "Study",
    description: null,
    ai_prompt: "Create a study deck in JSON format...",
    schema_json: { type: "object" },
  },
];

beforeEach(() => {
  (api.getCategories as jest.Mock).mockResolvedValue(CATS);
});

test("each category tab renders its AI prompt in a copyable code block", async () => {
  render(<SchemaPage />);
  await waitFor(() => screen.getByText("Recipe"));

  // Recipe prompt visible by default
  expect(screen.getByText(/Create a recipe deck/i)).toBeInTheDocument();

  // Switch to Study
  fireEvent.click(screen.getByText("Study"));
  await waitFor(() =>
    expect(screen.getByText(/Create a study deck/i)).toBeInTheDocument(),
  );
});

test("schema field table renders expected columns", async () => {
  render(<SchemaPage />);
  await waitFor(() => screen.getByText("Recipe"));

  expect(screen.getByText("Field")).toBeInTheDocument();
  expect(screen.getByText("Type")).toBeInTheDocument();
  expect(screen.getByText("Required")).toBeInTheDocument();
  expect(screen.getByText("Description")).toBeInTheDocument();
});
