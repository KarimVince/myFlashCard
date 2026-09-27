"use client";

import { useEffect, useRef, useState } from "react";
import { adminUpdateDeck, getDeck, getToken } from "@/lib/api";
import { Deck } from "@/lib/types";
import { useParams, useRouter } from "next/navigation";

export default function EditDeckPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    author: "",
    language: "en",
    is_free: true,
  });
  const [file, setFile] = useState<File | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getDeck(Number(id)).then((d) => {
      setDeck(d);
      setForm({
        title: d.title,
        description: d.description ?? "",
        author: d.author ?? "",
        language: d.language,
        is_free: d.is_free,
      });
    });
  }, [id]);

  function handleFile(f: File | null) {
    setJsonError(null);
    if (!f) { setFile(null); return; }
    if (!f.name.endsWith(".json")) {
      setJsonError("File must be a .json file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!data.deckTitle || !Array.isArray(data.cards)) {
          setJsonError("JSON must have a deckTitle and cards array");
          return;
        }
        setFile(f);
      } catch {
        setJsonError("Invalid JSON");
      }
    };
    reader.readAsText(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token || !deck) return;
    setSubmitting(true);
    setServerError(null);
    try {
      await adminUpdateDeck(token, deck.id, file, form);
      router.push("/admin/manage");
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!deck) return <div className="text-center py-20 text-gray-400">Loading…</div>;

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Edit deck</h1>
      <p className="text-sm text-gray-500 mb-8">
        Category: <strong>{deck.category.label}</strong> · {deck.card_count ?? "?"} cards
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Optional replacement file */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Replace JSON file (optional)
          </label>
          <div
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
              jsonError ? "border-red-300 bg-red-50" : file ? "border-teal-400 bg-teal-50" : "border-gray-200 hover:border-teal-300"
            }`}
            onClick={() => inputRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0] ?? null); }}
            onDragOver={(e) => e.preventDefault()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-sm text-gray-400">
              {file ? file.name : "Leave empty to keep current file · Drop new .json to replace"}
            </p>
          </div>
          {jsonError && <p className="mt-1.5 text-xs text-red-500">{jsonError}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
            <input
              type="text"
              value={form.author}
              onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
            <input
              type="text"
              value={form.language}
              onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Free / Premium toggle */}
        <div className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-700">Free to download</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {form.is_free ? "Anyone can download this deck" : "Premium — download blocked for public users"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, is_free: !f.is_free }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.is_free ? "bg-teal-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                form.is_free ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {serverError && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {serverError}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/manage")}
            className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-teal-600 text-white font-semibold py-2.5 rounded-xl hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
