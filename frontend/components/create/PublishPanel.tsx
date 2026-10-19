"use client";

import { useState } from "react";
import Link from "next/link";
import { adminPublishGeneration, errorMessage } from "@/lib/api";
import { Generation } from "@/lib/types";

/** Admin only: put a generated deck in the public library. */
export default function PublishPanel({
  token,
  gen,
  premiumEnabled,
  onPublished,
  startOpen = false,
  onCancel,
}: {
  token: string;
  gen: Generation;
  premiumEnabled: boolean;
  onPublished: (deckId: number) => void;
  /** Show the form straight away (web app history), instead of the "Add to library" button first. */
  startOpen?: boolean;
  onCancel?: () => void;
}) {
  const [open, setOpen] = useState(startOpen);
  const [title, setTitle] = useState(gen.title ?? "");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("en");
  const [isFree, setIsFree] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (gen.published_deck_id) {
    return (
      <p className="text-sm text-teal-800 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
        ✓ In the public library.{" "}
        <Link href="/library" className="underline font-medium">Open the library</Link>
        {" · "}
        <Link href="/admin/manage" className="underline">Manage decks</Link>
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 border border-amber-300 text-amber-800 bg-amber-50 text-sm font-semibold rounded-lg hover:bg-amber-100"
      >
        ＋ Add to library
      </button>
    );
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const deck = await adminPublishGeneration(token, gen.id, {
        title, description: description.trim() || undefined, language, is_free: isFree,
      });
      onPublished(deck.id);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500";
  return (
    <form onSubmit={publish} className="bg-white border border-amber-200 rounded-xl p-4 space-y-3 max-w-xl">
      <p className="font-semibold text-gray-900 text-sm">Add to the public library</p>
      <label className="block">
        <span className="block text-xs font-medium text-gray-600 mb-1">Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} required />
      </label>
      <label className="block">
        <span className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</span>
        <input value={description} onChange={(e) => setDescription(e.target.value)} className={input} />
      </label>
      <div className="flex gap-3 flex-wrap items-end">
        <label className="block">
          <span className="block text-xs font-medium text-gray-600 mb-1">Language</span>
          <input value={language} onChange={(e) => setLanguage(e.target.value)} className={`${input} w-20`} maxLength={5} />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
          <input type="checkbox" checked={!isFree} onChange={(e) => setIsFree(!e.target.checked)} />
          Premium deck (Silver &amp; Gold)
        </label>
      </div>
      {!isFree && !premiumEnabled && (
        <p className="text-xs text-gray-500">Premium is off, so this deck stays hidden until you switch Premium on.</p>
      )}
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex gap-2">
        <button
          disabled={busy || !title.trim()}
          className="px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-50"
        >
          {busy ? "Publishing…" : "Publish"}
        </button>
        <button type="button" onClick={() => { setOpen(false); onCancel?.(); }} className="px-3 py-2 text-sm text-gray-500 hover:underline">
          Cancel
        </button>
      </div>
    </form>
  );
}
