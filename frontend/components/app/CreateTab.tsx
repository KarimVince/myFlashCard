"use client";

import { useEffect, useState } from "react";
import CreateForm from "@/components/create/CreateForm";
import { useAuth } from "@/lib/auth";
import { errorMessage, getCategories, getGeneration, listGenerations } from "@/lib/api";
import { generationToDeck } from "@/lib/generated";
import { Category, Deck, GenerationSummary } from "@/lib/types";
import { DeckJson } from "./AppShell";

interface Props {
  onOpenDeck: (v: { deck: Deck; json: DeckJson }) => void;
}

/** Create tab of the iPhone web app: generate with AI, then open the deck (which saves it to My Decks). */
export default function CreateTab({ onOpenDeck }: Props) {
  const { user, token } = useAuth();
  const [history, setHistory] = useState<GenerationSummary[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [opening, setOpening] = useState<number | null>(null);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);
  useEffect(() => {
    if (token) listGenerations(token).then(setHistory).catch(() => {});
  }, [token]);

  async function open(id: number) {
    if (!token) return;
    setOpening(id);
    try {
      onOpenDeck(generationToDeck(await getGeneration(token, id), categories, user?.alias));
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setOpening(null);
    }
  }

  return (
    <div className="px-4 py-4 space-y-6">
      <CreateForm
        variant="app"
        returnTo="/app?tab=create"
        onGenerated={(gen, cats) => onOpenDeck(generationToDeck(gen, cats, user?.alias))}
      />

      {history.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2 px-1">Your AI decks</h2>
          <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100 overflow-hidden">
            {history.map((g) => (
              <button
                key={g.id}
                onClick={() => open(g.id)}
                disabled={opening !== null}
                className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 active:bg-gray-50 disabled:opacity-60"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{g.title}</p>
                  <p className="text-xs text-gray-400">{g.category_label} · {g.card_count} cards</p>
                </div>
                <span className="text-xs text-teal-600 shrink-0">{opening === g.id ? "Opening…" : "Open"}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
