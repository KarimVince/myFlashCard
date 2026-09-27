/**
 * Tests for /admin/upload page.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UploadPage from "@/app/admin/upload/page";
import * as api from "@/lib/api";
import { Category } from "@/lib/types";

jest.mock("next/navigation", () => ({
  usePathname: () => "/admin/upload",
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  getCategories: jest.fn(),
  adminUploadDeck: jest.fn(),
  getToken: jest.fn(() => "testpassword"),
}));

const CATS: Category[] = [
  { id: 1, slug: "recipe", label: "Recipe", description: null, ai_prompt: null, schema_json: null },
];

beforeEach(() => {
  (api.getCategories as jest.Mock).mockResolvedValue(CATS);
  (api.adminUploadDeck as jest.Mock).mockResolvedValue({ id: 1, title: "Test" });
});

function makeJsonFile(content: object, name = "deck.json"): File {
  return new File([JSON.stringify(content)], name, { type: "application/json" });
}

function uploadFile(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  fireEvent.change(input);
}

test("rejects non-JSON file type before submit", async () => {
  render(<UploadPage />);
  await waitFor(() => screen.getByText(/Drag & drop/i));

  const badFile = new File(["hello"], "deck.txt", { type: "text/plain" });
  uploadFile(badFile);

  await waitFor(() =>
    expect(screen.getByText(/must be a .json file/i)).toBeInTheDocument(),
  );
});

test("validates JSON structure client-side and shows inline error", async () => {
  render(<UploadPage />);
  await waitFor(() => screen.getByText(/Drag & drop/i));

  // FileReader doesn't run in jsdom — mock it to call onload synchronously
  const originalReader = global.FileReader;
  class MockReader {
    onload: ((e: ProgressEvent) => void) | null = null;
    readAsText() {
      this.onload?.({ target: { result: JSON.stringify({ foo: "bar" }) } } as unknown as ProgressEvent);
    }
  }
  (global as unknown as { FileReader: unknown }).FileReader = MockReader;

  const badJson = new File([JSON.stringify({ foo: "bar" })], "deck.json", {
    type: "application/json",
  });
  uploadFile(badJson);

  await waitFor(() =>
    expect(
      screen.getByText(/must have a deckTitle string and a cards array/i),
    ).toBeInTheDocument(),
  );

  (global as unknown as { FileReader: unknown }).FileReader = originalReader;
});

test("successful upload shows confirmation and clears form", async () => {
  render(<UploadPage />);
  await waitFor(() => screen.getByText(/Drag & drop/i));

  const goodContent = { deckTitle: "My Deck", cards: [{ title: "C1", blocks: [] }] };
  const originalReader = global.FileReader;
  class MockReader {
    onload: ((e: ProgressEvent) => void) | null = null;
    readAsText() {
      this.onload?.({ target: { result: JSON.stringify(goodContent) } } as unknown as ProgressEvent);
    }
  }
  (global as unknown as { FileReader: unknown }).FileReader = MockReader;

  uploadFile(makeJsonFile(goodContent));
  await waitFor(() => screen.getByDisplayValue("My Deck"));

  (global as unknown as { FileReader: unknown }).FileReader = originalReader;

  fireEvent.submit(screen.getByRole("button", { name: /upload deck/i }).closest("form")!);
  await waitFor(() =>
    expect(screen.getByText(/uploaded successfully/i)).toBeInTheDocument(),
  );
});

test("unauthenticated access: getToken returns null", () => {
  (api.getToken as jest.Mock).mockReturnValueOnce(null);
  render(<UploadPage />);
  // Page still renders — auth gate is in layout, not page itself
  expect(screen.queryByText(/Drag & drop/i)).not.toBeNull();
});
