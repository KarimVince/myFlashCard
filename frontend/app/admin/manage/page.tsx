"use client";

import { useEffect, useState } from "react";
import {
  adminDeleteDeck,
  adminListDecks,
  adminSetFree,
  adminSetVisibility,
  getToken,
} from "@/lib/api";
import { Deck } from "@/lib/types";
import DeckCard from "@/components/DeckCard";
import { useRouter } from "next/navigation";

type Filter = "all" | "public" | "hidden" | "free" | "premium";

export default function ManagePage() {
  const router = useRouter();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  function load() {
    const token = getToken();
    if (!token) return;
    adminListDecks(token)
      .then(setDecks)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleToggle(id: number, currentlyPublic: boolean) {
    const token = getToken();
    if (!token) return;
    const updated = await adminSetVisibility(token, id, !currentlyPublic);
    setDecks((prev) => prev.map((d) => (d.id === id ? updated : d)));
  }

  async function handleToggleFree(id: number, currentlyFree: boolean) {
    const token = getToken();
    if (!token) return;
    const updated = await adminSetFree(token, id, !currentlyFree);
    setDecks((prev) => prev.map((d) => (d.id === id ? updated : d)));
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this deck? This cannot be undone.")) return;
    const token = getToken();
    if (!token) return;
    await adminDeleteDeck(token, id);
    setDecks((prev) => prev.filter((d) => d.id !== id));
  }

  const filtered = decks.filter((d) => {
    if (filter === "public")  return d.is_public;
    if (filter === "hidden")  return !d.is_public;
    if (filter === "free")    return d.is_free;
    if (filter === "premium") return !d.is_free;
    return true;
  });

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>;

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all",     label: "All" },
    { key: "public",  label: "Public" },
    { key: "hidden",  label: "Hidden" },
    { key: "free",    label: "Free" },
    { key: "premium", label: "Premium" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Manage decks</h1>
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === key
                  ? "bg-teal-600 text-white"
                  : "border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No decks found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              showVisibility
              onToggleVisibility={handleToggle}
              onToggleFree={handleToggleFree}
              onDelete={handleDelete}
              onEdit={(id) => router.push(`/admin/edit/${id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
