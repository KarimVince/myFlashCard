/**
 * Deck blocks: emoji icons and charts.
 */
import { render, screen } from "@testing-library/react";
import BlockRenderer from "@/components/app/BlockRenderer";
import DeckPreview from "@/components/create/DeckPreview";

test("stats show their icon", () => {
  render(<BlockRenderer accent="#0d9488" block={{ type: "stats", items: [{ label: "Time", value: "20 min", icon: "⏱️" }] }} />);
  expect(screen.getByText("⏱️")).toBeInTheDocument();
  expect(screen.getByText("Time")).toBeInTheDocument();
});

test("bar chart scales to the largest value and shows the unit", () => {
  const { container } = render(
    <BlockRenderer
      accent="#0d9488"
      block={{
        type: "chart", style: "bar", heading: "Calories", unit: "kcal",
        items: [{ label: "Pasta", value: 350, icon: "🍝" }, { label: "Cheese", value: 175 }],
      }}
    />,
  );
  expect(screen.getByLabelText("Calories")).toBeInTheDocument();
  expect(screen.getByText("350 kcal")).toBeInTheDocument();
  expect(screen.getByText("175 kcal")).toBeInTheDocument();
  const widths = Array.from(container.querySelectorAll<HTMLElement>("div.h-full")).map((el) => el.style.width);
  expect(widths).toEqual(["100%", "50%"]);
});

test("progress chart reads as a percentage out of 100", () => {
  const { container } = render(
    <BlockRenderer accent="#0d9488" block={{ type: "chart", style: "progress", items: [{ label: "Protein", value: 40 }] }} />,
  );
  expect(screen.getByText("40%")).toBeInTheDocument();
  expect(container.querySelector<HTMLElement>("div.h-full")!.style.width).toBe("40%");
});

test("progress chart with another max shows 'out of'", () => {
  render(
    <BlockRenderer
      accent="#0d9488"
      block={{ type: "chart", style: "progress", max: 8, unit: "h", items: [{ label: "Sleep", value: 6 }] }}
    />,
  );
  expect(screen.getByText(/6 h/)).toBeInTheDocument();
  expect(screen.getByText("/ 8")).toBeInTheDocument();
});

test("card icon shows before the title in the preview", () => {
  render(<DeckPreview deck={{ deckTitle: "Pasta", cards: [{ title: "Carbonara", icon: "🍝", blocks: [] }] }} />);
  const heading = screen.getByRole("heading", { name: "Carbonara" }); // the emoji is decorative (aria-hidden)
  expect(heading).toHaveTextContent("🍝Carbonara");
});
