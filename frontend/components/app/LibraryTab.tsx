"use client";

import { useEffect, useState } from "react";
import { getCategories, getDecks } from "@/lib/api";
import { Category, Deck } from "@/lib/types";
import { DeckJson } from "./AppShell";

interface Props {
  onOpenDeck: (v: { deck: Deck; json: DeckJson }) => void;
}

export default function LibraryTab({ onOpenDeck }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDeck, setLoadingDeck] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCategories()
      .then((cats) => {
        setCategories(cats);
        setActiveCat(cats[0]?.slug ?? null);
        if (cats.length === 0) setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        setError("Could not connect to the server. Check your connection or try again later.");
      });
  }, []);

  useEffect(() => {
    if (!activeCat) return;
    setLoading(true);
    getDecks({ category: activeCat })
      .then(setDecks)
      .catch(() => setDecks([]))
      .finally(() => setLoading(false));
  }, [activeCat]);

  async function handleOpen(deck: Deck) {
    setLoadingDeck(deck.id);
    setError(null);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const res = await fetch(`${base}/decks/${deck.id}/content`);
      if (!res.ok) throw new Error("Failed to load deck");
      const json: DeckJson = await res.json();
      onOpenDeck({ deck, json });
    } catch {
      setError("Could not load this deck. Check your connection.");
    } finally {
      setLoadingDeck(null);
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Category pills */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setActiveCat(cat.slug)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors
                ${activeCat === cat.slug
                  ? "bg-teal-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>


      {/* Deck list */}
      <div className="flex-1 px-4 py-3 space-y-3">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</div>
        )}
        {loading && (
          <div className="text-center text-gray-400 text-sm py-10">Loading…</div>
        )}
        {!loading && decks.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-10">No decks in this category yet.</div>
        )}
        {!loading && decks.map((deck) => (
          <button
            key={deck.id}
            onClick={() => handleOpen(deck)}
            disabled={loadingDeck !== null}
            className="w-full text-left bg-white border border-gray-200 rounded-2xl p-4 shadow-sm active:scale-95 transition-transform disabled:opacity-60"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{deck.title}</p>
                {deck.description && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{deck.description}</p>
                )}
                <div className="flex gap-3 mt-2 text-xs text-gray-400">
                  {deck.card_count != null && <span>{deck.card_count} cards</span>}
                  {deck.author && <span>by {deck.author}</span>}
                  {deck.language !== "en" && <span>{deck.language.toUpperCase()}</span>}
                </div>
              </div>
              <div className="shrink-0 mt-0.5">
                {loadingDeck === deck.id ? (
                  <span className="text-xs text-teal-600">Loading…</span>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-gray-300" aria-hidden>
                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
                  </svg>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
