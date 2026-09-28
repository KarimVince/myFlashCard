"use client";

import { useEffect, useState } from "react";
import { getCategories, getDecks } from "@/lib/api";
import { Category, Deck } from "@/lib/types";
import DeckCard from "@/components/DeckCard";
import { usePremiumEnabled } from "@/lib/usePremium";

const PILLS_THRESHOLD = 7; // switch to <select> when more categories than this

export default function LibraryPage() {
  const premiumEnabled = usePremiumEnabled();
  const [categories, setCategories] = useState<Category[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [activeSlug, setActiveSlug] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getCategories(), getDecks()])
      .then(([cats, decks]) => {
        // Sort categories alphabetically for filter
        const sorted = [...cats].sort((a, b) => a.label.localeCompare(b.label));
        setCategories(sorted);
        setDecks(decks);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = (
    activeSlug === "all"
      ? decks
      : decks.filter((d) => d.category.slug === activeSlug)
  ).slice().sort((a, b) => {
    const catCmp = a.category.label.localeCompare(b.category.label);
    return catCmp !== 0 ? catCmp : a.title.localeCompare(b.title);
  });

  const usePills = categories.length <= PILLS_THRESHOLD;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Deck Library</h1>
      {!premiumEnabled && (
        <p className="text-gray-500 mb-8">
          Browse community decks. Download any deck directly into the myFlashCard app.
        </p>
      )}
      {premiumEnabled && (<>
      <p className="text-gray-500 mb-8">
        Browse community decks. Free decks can be downloaded directly into the myFlashCard app.
        <span className="ml-1 inline-flex items-center gap-1 text-xs bg-teal-50 text-teal-700 font-medium px-2 py-0.5 rounded-full border border-teal-200">
          ✓ Free
        </span>
        {" "}decks include the JSON download.{" "}
        <span className="inline-flex items-center text-xs bg-amber-50 text-amber-700 font-medium px-2 py-0.5 rounded-full border border-amber-200">
          ★ Premium
        </span>
        {" "}decks are preview-only for now.
      </p>

      {/* Premium coming-soon notice */}
      <div className="mb-8 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
        <span className="text-lg leading-none mt-0.5">★</span>
        <span>
          <strong>Premium access is coming at a later stage.</strong>{" "}
          For now, all premium decks are available to preview but not download.
          Stay tuned — we&apos;ll announce when subscriptions open.
        </span>
      </div>
      </>)}

      {/* Category filter */}
      {!loading && (
        <div className="mb-8">
          {usePills ? (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveSlug("all")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeSlug === "all"
                    ? "bg-teal-600 text-white"
                    : "border border-gray-200 hover:bg-gray-50"
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => setActiveSlug(cat.slug)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    activeSlug === cat.slug
                      ? "bg-teal-600 text-white"
                      : "border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {cat.icon && <span className="mr-1">{cat.icon}</span>}
                  {cat.label}
                </button>
              ))}
            </div>
          ) : (
            <select
              value={activeSlug}
              onChange={(e) => setActiveSlug(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            >
              <option value="all">All categories</option>
              {categories.map((cat) => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.icon ? `${cat.icon} ` : ""}{cat.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Content */}
      {loading && (
        <div className="text-center py-20 text-gray-400">Loading decks…</div>
      )}
      {error && (
        <div className="text-center py-20 text-red-500">
          Could not load library: {error}
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          No decks found for this category.
        </div>
      )}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((deck) => (
            <DeckCard key={deck.id} deck={deck} premiumEnabled={premiumEnabled} />
          ))}
        </div>
      )}
    </div>
  );
}
