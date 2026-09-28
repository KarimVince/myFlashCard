import { Category, Deck, Generation } from "./types";
import { DeckJson } from "@/components/app/AppShell";

/**
 * Turn an AI generation into the {deck, json} pair the card viewer and My Decks use.
 * Negative ids keep generated decks from colliding with library deck ids in local storage.
 */
export function generationToDeck(gen: Generation, categories: Category[], author?: string): { deck: Deck; json: DeckJson } {
  const category: Category =
    categories.find((c) => c.slug === gen.category_slug) ?? {
      id: 0,
      slug: gen.category_slug ?? "ai",
      label: gen.category_label ?? "AI deck",
      description: null,
      ai_prompt: null,
      schema_json: null,
    };
  const json = gen.deck as unknown as DeckJson;
  const deck: Deck = {
    id: -gen.id,
    title: gen.title ?? json.deckTitle,
    description: gen.description,
    author: author ?? null,
    language: "",
    card_count: gen.card_count,
    public_url: "",
    is_free: true,
    downloads: 0,
    category,
    created_at: gen.created_at,
  };
  return { deck, json };
}

/** Download the deck JSON as a file the Android app (or anyone) can load. */
export function downloadDeckJson(gen: Generation): void {
  const name =
    (gen.title ?? "deck")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // "Crêpes à l'orange" → "Crepes a l'orange"
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "deck";
  const blob = new Blob([JSON.stringify(gen.deck, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
