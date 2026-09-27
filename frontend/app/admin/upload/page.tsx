"use client";

import { useEffect, useRef, useState } from "react";
import { adminUploadDeck, getCategories, getToken } from "@/lib/api";
import { Category } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [form, setForm] = useState({
    category_slug: "recipe",
    title: "",
    description: "",
    author: "",
    language: "en",
    is_free: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCategories().then((cats) => {
      setCategories(cats);
      if (cats.length > 0) setForm((f) => ({ ...f, category_slug: cats[0].slug }));
    });
  }, []);

  function handleFile(f: File | null) {
    setJsonError(null);
    setSuccess(false);
    if (!f) { setFile(null); return; }

    if (!f.name.endsWith(".json")) {
      setJsonError("File must be a .json file");
      setFile(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        // Basic structure check
        if (!data.deckTitle || !Array.isArray(data.cards)) {
          setJsonError("JSON must have a deckTitle string and a cards array");
          setFile(null);
          return;
        }
        // Auto-fill title if empty
        if (!form.title) {
          setForm((prev) => ({ ...prev, title: data.deckTitle }));
        }
        setFile(f);
      } catch {
        setJsonError("Invalid JSON — the file could not be parsed");
        setFile(null);
      }
    };
    reader.readAsText(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setJsonError("Please select a JSON file"); return; }
    const token = getToken();
    if (!token) return;

    setSubmitting(true);
    setServerError(null);

    try {
      await adminUploadDeck(token, file, form);
      setSuccess(true);
      setFile(null);
      setForm({ category_slug: categories[0]?.slug ?? "recipe", title: "", description: "", author: "", language: "en", is_free: true });
      if (inputRef.current) inputRef.current.value = "";
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload new deck</h1>
      <p className="text-sm text-gray-500 mb-8">
        The JSON file is validated against the category schema before upload.
      </p>

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3 flex items-center justify-between">
          <span>✓ Deck uploaded successfully!</span>
          <button onClick={() => router.push("/admin/manage")} className="underline font-medium">
            Manage decks →
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* File drop */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            JSON file <span className="text-red-500">*</span>
          </label>
          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
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
            {file ? (
              <p className="text-sm text-teal-700 font-medium">{file.name}</p>
            ) : (
              <p className="text-sm text-gray-400">
                Drag & drop a .json file here, or click to select
              </p>
            )}
          </div>
          {jsonError && <p className="mt-1.5 text-xs text-red-500">{jsonError}</p>}
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            value={form.category_slug}
            onChange={(e) => setForm((f) => ({ ...f, category_slug: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Deck title"
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Short description (optional)"
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
          />
        </div>

        {/* Author + language */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
            <input
              type="text"
              value={form.author}
              onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
              placeholder="Optional"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
            <input
              type="text"
              value={form.language}
              onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
              placeholder="en"
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

        <button
          type="submit"
          disabled={submitting || !file}
          className="w-full bg-teal-600 text-white font-semibold py-2.5 rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Uploading…" : "Upload deck"}
        </button>
      </form>
    </div>
  );
}
