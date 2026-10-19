import { Deck } from "./types";
import { DeckJson } from "@/components/app/AppShell";

/**
 * Read a deck JSON file chosen by the user (web app "Load from file", like Android).
 * Throws an Error with a short message when the file isn't a usable deck.
 */
export function parseDeckFile(text: string, fileName: string, now: number = Date.now()): { deck: Deck; json: DeckJson } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("This file isn't valid JSON.");
  }
  const json = data as Partial<DeckJson>;
  if (!json || typeof json !== "object" || typeof json.deckTitle !== "string" || !Array.isArray(json.cards)) {
    throw new Error("This isn't a myFlashCard deck (it needs deckTitle and cards).");
  }
  const cards = json.cards.filter((c) => c && typeof c.title === "string" && Array.isArray(c.blocks));
  if (cards.length === 0) throw new Error("No cards found in this file.");

  const title = json.deckTitle.trim() || fileName.replace(/\.json$/i, "");
  const deck: Deck = {
    // Negative ids keep loaded decks apart from library decks; the time makes each load unique.
    id: -now,
    title,
    description: null,
    author: null,
    language: "",
    card_count: cards.length,
    public_url: "",
    is_free: true,
    downloads: 0,
    category: { id: 0, slug: "file", label: "From file", description: null, ai_prompt: null, schema_json: null },
    created_at: new Date(now).toISOString(),
  };
  return { deck, json: { ...(json as DeckJson), deckTitle: title, cards } };
}

/** A file's text. Uses FileReader so it also works where File.text() is missing (older iOS Safari). */
export function readFileText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read this file."));
    reader.readAsText(file);
  });
}
