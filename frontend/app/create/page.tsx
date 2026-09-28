"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import CreateForm from "@/components/create/CreateForm";
import DeckPreview from "@/components/create/DeckPreview";
import { useAuth } from "@/lib/auth";
import { deleteGeneration, errorMessage, getCategories, getGeneration, listGenerations } from "@/lib/api";
import { downloadDeckJson, generationToDeck } from "@/lib/generated";
import { saveDeck } from "@/lib/deckStorage";
import { Category, Generation, GenerationSummary } from "@/lib/types";

export default function CreatePage() {
  const { user, token } = useAuth();
  const [current, setCurrent] = useState<Generation | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [history, setHistory] = useState<GenerationSummary[]>([]);
  const [saved, setSaved] = useState(false);

  const loadHistory = useCallback(() => {
    if (token) listGenerations(token).then(setHistory).catch(() => {});
  }, [token]);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);
  useEffect(loadHistory, [loadHistory]);

  function show(gen: Generation) {
    setCurrent(gen);
    setSaved(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function openFromHistory(id: number) {
    if (!token) return;
    try {
      show(await getGeneration(token, id));
    } catch (e) {
      alert(errorMessage(e));
    }
  }

  async function removeFromHistory(id: number) {
    if (!token || !confirm("Remove this deck from your history? Tokens are not refunded.")) return;
    await deleteGeneration(token, id).catch(() => {});
    setHistory((h) => h.filter((g) => g.id !== id));
    if (current?.id === id) setCurrent(null);
  }

  async function saveToWebApp(gen: Generation) {
    const { deck, json } = generationToDeck(gen, categories, user?.alias);
    await saveDeck({ deck, cards: json, savedAt: Date.now() });
    setSaved(true);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Create a deck with AI</h1>
      <p className="text-gray-500 mb-8">
        Pick a deck type, describe what you want, and get a ready-to-use flashcard deck.{" "}
        <Link href="/how-to" className="text-teal-600 hover:underline">Prefer to do it manually?</Link>
      </p>

      {current ? (
        <section className="space-y-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">
                {current.category_label} · {current.card_count} cards
              </p>
              <h2 className="text-2xl font-bold text-gray-900">{current.title}</h2>
              <p className="text-sm text-gray-400 mt-1 max-w-2xl">“{current.description}”</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => downloadDeckJson(current)}
                className="px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700"
              >
                ↓ Download JSON
              </button>
              <button
                onClick={() => saveToWebApp(current)}
                disabled={saved}
                className="px-4 py-2 border border-gray-200 text-sm font-semibold rounded-lg hover:bg-gray-50 disabled:text-teal-700"
              >
                {saved ? "✓ In My Decks" : "Add to My Decks"}
              </button>
              <button
                onClick={() => setCurrent(null)}
                className="px-4 py-2 text-sm font-semibold text-gray-500 hover:underline"
              >
                + Create another
              </button>
            </div>
          </div>
          {saved && (
            <p className="text-sm text-teal-800 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
              Saved on this device. Open <Link href="/app" className="underline font-medium">the web app</Link> to study it
              — or download the JSON and load it in the Android app.
            </p>
          )}
          <DeckPreview deck={current.deck} />
        </section>
      ) : (
        <div className="max-w-2xl">
          <CreateForm
            variant="web"
            returnTo="/create"
            onGenerated={(gen) => {
              show(gen);
              loadHistory();
            }}
          />
        </div>
      )}

      {history.length > 0 && (
        <section className="mt-14">
          <h2 className="font-semibold text-gray-900 mb-4">Your AI decks</h2>
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {history.map((g) => (
              <div key={g.id} className="px-4 py-3 flex items-center justify-between gap-4">
                <button onClick={() => openFromHistory(g.id)} className="text-left min-w-0">
                  <p className="font-medium text-gray-900 truncate hover:text-teal-700">{g.title}</p>
                  <p className="text-xs text-gray-400">
                    {g.category_label} · {g.card_count} cards · {new Date(g.created_at).toLocaleDateString()}
                  </p>
                </button>
                <button onClick={() => removeFromHistory(g.id)} className="text-xs text-gray-400 hover:text-red-600 shrink-0">
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
