"use client";

import { useEffect, useRef, useState } from "react";
import CreateForm from "@/components/create/CreateForm";
import PublishPanel from "@/components/create/PublishPanel";
import { useAuth } from "@/lib/auth";
import { deleteGeneration, errorMessage, getCategories, getGeneration, listGenerations } from "@/lib/api";
import { generationToDeck } from "@/lib/generated";
import { parseDeckFile, readFileText } from "@/lib/loadDeckFile";
import { usePremiumEnabled } from "@/lib/usePremium";
import { useAIVisible } from "@/lib/useAIVisible";
import { Category, Deck, Generation, GenerationSummary } from "@/lib/types";
import { DeckJson } from "./AppShell";

interface Props {
  onOpenDeck: (v: { deck: Deck; json: DeckJson }) => void;
}

/**
 * Create tab of the iPhone web app, like Android's: generate with AI (when it's offered to you),
 * your AI decks, how to make a deck manually, and loading a deck file. Opening a deck saves it to My Decks.
 */
export default function CreateTab({ onOpenDeck }: Props) {
  const { user, token } = useAuth();
  const ai = useAIVisible();
  const premiumEnabled = usePremiumEnabled();
  const [history, setHistory] = useState<GenerationSummary[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [opening, setOpening] = useState<number | null>(null);
  const [publishing, setPublishing] = useState<Generation | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);
  useEffect(() => {
    if (token && ai.visible) listGenerations(token).then(setHistory).catch(() => {});
  }, [token, ai.visible]);

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

  async function startPublish(id: number) {
    if (!token) return;
    try {
      setPublishing(await getGeneration(token, id));
    } catch (e) {
      alert(errorMessage(e));
    }
  }

  async function remove(g: GenerationSummary) {
    if (!token || !confirm(`Remove “${g.title}” from your AI decks? A copy saved in My Decks stays. Decks used are not refunded.`)) return;
    await deleteGeneration(token, g.id).catch(() => {});
    setHistory((h) => h.filter((x) => x.id !== g.id));
  }

  async function loadFile(file: File | undefined) {
    if (!file) return;
    setFileError(null);
    try {
      onOpenDeck(parseDeckFile(await readFileText(file), file.name));
    } catch (e) {
      setFileError(e instanceof Error ? e.message : "Could not load this file.");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 px-4 py-4 space-y-6">
        {ai.visible && (
          <>
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
                    <div key={g.id} className="px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <button onClick={() => open(g.id)} disabled={opening !== null} className="min-w-0 text-left disabled:opacity-60">
                          <p className="font-medium text-gray-900 truncate">{g.title}</p>
                          <p className="text-xs text-gray-400">
                            {g.category_label} · {g.card_count} cards
                            {g.published_deck_id ? " · ✓ in library" : ""}
                          </p>
                        </button>
                        <div className="flex items-center gap-3 shrink-0 text-xs">
                          {user?.role === "admin" && !g.published_deck_id && (
                            <button onClick={() => startPublish(g.id)} className="text-amber-800 font-medium">＋ Library</button>
                          )}
                          <button onClick={() => remove(g)} className="text-gray-400">Remove</button>
                          <button onClick={() => open(g.id)} disabled={opening !== null} className="text-teal-600 font-medium">
                            {opening === g.id ? "Opening…" : "Open"}
                          </button>
                        </div>
                      </div>
                      {publishing?.id === g.id && token && (
                        <PublishPanel
                          token={token}
                          gen={publishing}
                          premiumEnabled={premiumEnabled}
                          startOpen
                          onCancel={() => setPublishing(null)}
                          onPublished={(deckId) => {
                            setHistory((h) => h.map((x) => (x.id === g.id ? { ...x, published_deck_id: deckId } : x)));
                            setPublishing(null);
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <section className="space-y-4 px-1">
          <h2 className="font-serif font-bold text-xl text-gray-900">{ai.visible ? "Or do it manually" : "How to get started"}</h2>
          <GuideStep n="1" title="Browse the library">
            Open the Library tab to discover community decks. Tap a deck to open it — it&apos;s saved to My Decks.
          </GuideStep>
          <GuideStep n="2" title="Create with any AI chat">
            Copy the prompt for your deck type from the JSON Schema page on the website, paste it into Claude or ChatGPT
            with your topic, and save the answer as a .json file.
          </GuideStep>
          <GuideStep n="3" title="Load from file">
            Tap &ldquo;Load from file&rdquo; below, pick the .json file, and start swiping.
          </GuideStep>
        </section>
      </div>

      <div className="shrink-0 sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3">
        {fileError && <p className="text-xs text-red-600 mb-2 text-center">{fileError}</p>}
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          className="hidden"
          aria-label="Deck file"
          onChange={(e) => loadFile(e.target.files?.[0])}
        />
        <button
          onClick={() => fileInput.current?.click()}
          className="w-full bg-teal-600 text-white font-semibold py-3 rounded-xl active:bg-teal-700"
        >
          Load from file
        </button>
      </div>
    </div>
  );
}

function GuideStep({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="shrink-0 w-7 h-7 rounded-full bg-teal-600 text-white text-sm font-bold flex items-center justify-center">{n}</span>
      <div>
        <p className="font-semibold text-gray-900 text-sm">{title}</p>
        <p className="text-sm text-gray-500 mt-0.5">{children}</p>
      </div>
    </div>
  );
}
