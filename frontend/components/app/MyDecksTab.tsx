"use client";

import { useEffect, useState } from "react";
import { Deck } from "@/lib/types";
import { DeckJson, SavedDeck } from "./AppShell";
import { loadAllDecks, removeDeck } from "@/lib/deckStorage";

interface Props {
  onOpenDeck: (v: { deck: Deck; json: DeckJson }) => void;
}

export default function MyDecksTab({ onOpenDeck }: Props) {
  const [saved, setSaved] = useState<SavedDeck[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadAllDecks().then((decks) => {
      setSaved(decks.sort((a, b) => b.savedAt - a.savedAt));
      setLoaded(true);
    });
  }, []);

  async function handleDelete(id: number) {
    await removeDeck(id);
    setSaved((prev) => prev.filter((s) => s.deck.id !== id));
  }

  return (
    <div className="flex flex-col min-h-full">

      <div className="flex-1 px-4 py-3 space-y-3">
        {!loaded && (
          <div className="text-center text-gray-400 text-sm py-10">Loading…</div>
        )}
        {loaded && saved.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-4">📚</div>
            <p className="text-sm">No saved decks yet.</p>
            <p className="text-xs mt-1">Open a deck from the Library and tap Save.</p>
          </div>
        )}
        {saved.map((s) => (
          <div
            key={s.deck.id}
            className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
          >
            <button
              onClick={() => onOpenDeck({ deck: s.deck, json: s.cards })}
              className="w-full text-left p-4 active:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{s.deck.title}</p>
                  <div className="flex gap-3 mt-1.5 text-xs text-gray-400">
                    <span>{s.cards.cards.length} cards</span>
                    <span>{s.deck.category.label}</span>
                    <span>{new Date(s.savedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-gray-300 shrink-0 mt-0.5" aria-hidden>
                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
                </svg>
              </div>
            </button>
            <div className="border-t border-gray-100 px-4 py-2 flex justify-end">
              <button
                onClick={() => handleDelete(s.deck.id)}
                className="text-xs text-red-400 hover:text-red-600 font-medium"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
