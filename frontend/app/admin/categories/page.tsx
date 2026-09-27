"use client";

import { useEffect, useState } from "react";
import {
  adminCreateCategory,
  adminListCategories,
  adminUpdateCategory,
  getToken,
} from "@/lib/api";
import { Category } from "@/lib/types";

const BLANK = { slug: "", label: "", description: "", icon: "", ai_prompt: "", schema_json: "" };

function tryParseJson(raw: string): { value?: Record<string, unknown>; error?: string } {
  if (!raw.trim()) return {};
  try { return { value: JSON.parse(raw) }; }
  catch { return { error: "Invalid JSON — fix syntax before saving" }; }
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [formJsonErr, setFormJsonErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(BLANK);
  const [editJsonErr, setEditJsonErr] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [previewId, setPreviewId] = useState<number | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    adminListCategories(token)
      .then(setCategories)
      .catch((e) => setFetchError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const { value: schema_json, error } = tryParseJson(form.schema_json);
    if (error) { setFormJsonErr(error); return; }
    const token = getToken();
    if (!token) return;
    setSubmitting(true); setSubmitError(null);
    try {
      const created = await adminCreateCategory(token, {
        slug: form.slug.toLowerCase().trim(),
        label: form.label.trim(),
        description: form.description.trim() || undefined,
        icon: form.icon.trim() || undefined,
        ai_prompt: form.ai_prompt.trim() || undefined,
        schema_json,
      });
      setCategories((p) => [...p, created].sort((a, b) => a.label.localeCompare(b.label)));
      setForm(BLANK); setCreating(false);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Create failed");
    } finally { setSubmitting(false); }
  }

  function openEdit(cat: Category) {
    setEditId(cat.id);
    setEditForm({
      slug: cat.slug, label: cat.label,
      description: cat.description ?? "", icon: cat.icon ?? "",
      ai_prompt: cat.ai_prompt ?? "",
      schema_json: cat.schema_json ? JSON.stringify(cat.schema_json, null, 2) : "",
    });
    setEditJsonErr(null); setEditError(null); setPreviewId(null);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    const { value: schema_json, error } = tryParseJson(editForm.schema_json);
    if (error) { setEditJsonErr(error); return; }
    const token = getToken();
    if (!token || editId === null) return;
    setEditSubmitting(true); setEditError(null);
    try {
      const updated = await adminUpdateCategory(token, editId, {
        label: editForm.label.trim(),
        description: editForm.description.trim() || undefined,
        icon: editForm.icon.trim() || undefined,
        ai_prompt: editForm.ai_prompt.trim() || undefined,
        ...(schema_json !== undefined && { schema_json }),
      });
      setCategories((p) => p.map((c) => c.id === editId ? updated : c).sort((a, b) => a.label.localeCompare(b.label)));
      setEditId(null);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Update failed");
    } finally { setEditSubmitting(false); }
  }

  const field = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white";

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage categories, icons, AI prompts and deck JSON structure.
          </p>
        </div>
        {!creating && (
          <button onClick={() => { setCreating(true); setSubmitError(null); }}
            className="bg-teal-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-teal-700 transition-colors">
            + New category
          </button>
        )}
      </div>

      {/* ── Create form ── */}
      {creating && (
        <div className="mb-8 border border-teal-200 bg-teal-50 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 mb-4">New category</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Slug *</label>
                <input value={form.slug} required placeholder="game"
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  className={field} />
                <p className="text-xs text-gray-400 mt-0.5">Lowercase, no spaces</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                <input value={form.label} required placeholder="Game"
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  className={field} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Icon (emoji)</label>
                <input value={form.icon} placeholder="🎮"
                  onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                  className={field} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <input value={form.description} placeholder="Card & board game references"
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className={field} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                AI prompt <span className="text-gray-400 font-normal">(can be added later)</span>
              </label>
              <textarea value={form.ai_prompt} rows={3}
                placeholder="Paste the AI prompt once crafted…"
                onChange={(e) => setForm((f) => ({ ...f, ai_prompt: e.target.value }))}
                className={`${field} resize-none font-mono`} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Deck JSON structure{" "}
                <span className="text-gray-400 font-normal">(sample deck showing all block types — fetched by the app)</span>
              </label>
              <textarea value={form.schema_json} rows={10}
                placeholder={'{\n  "deckTitle": "Game Name",\n  "cards": [...]\n}'}
                onChange={(e) => { setForm((f) => ({ ...f, schema_json: e.target.value })); setFormJsonErr(null); }}
                className={`${field} resize-y font-mono ${formJsonErr ? "border-red-300" : ""}`} />
              {formJsonErr && <p className="text-xs text-red-500 mt-0.5">{formJsonErr}</p>}
            </div>
            {submitError && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{submitError}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => { setCreating(false); setForm(BLANK); }}
                className="flex-1 border border-gray-200 rounded-xl py-2 text-sm hover:bg-white transition-colors">Cancel</button>
              <button type="submit" disabled={submitting}
                className="flex-1 bg-teal-600 text-white font-semibold py-2 rounded-xl hover:bg-teal-700 disabled:opacity-50 transition-colors">
                {submitting ? "Creating…" : "Create category"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Category list ── */}
      {loading && <p className="text-gray-400 py-10 text-center">Loading…</p>}
      {fetchError && <p className="text-red-500 py-10 text-center">{fetchError}</p>}
      {!loading && !fetchError && (
        <div className="space-y-3">
          {categories.map((cat) => (
            <div key={cat.id} className="border border-gray-200 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-4">
                <span className="text-2xl w-8 text-center">{cat.icon ?? "📄"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{cat.label}</span>
                    <span className="text-xs text-gray-400 font-mono">{cat.slug}</span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {cat.deck_count ?? 0} deck{(cat.deck_count ?? 0) !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {cat.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{cat.description}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {cat.ai_prompt
                    ? <span className="text-xs text-teal-600 font-medium">✓ Prompt</span>
                    : <span className="text-xs text-amber-500">No prompt</span>}
                  {cat.schema_json
                    ? <button onClick={() => setPreviewId(previewId === cat.id ? null : cat.id)}
                        className="text-xs text-indigo-600 font-medium hover:underline">
                        {previewId === cat.id ? "Hide JSON" : "✓ JSON"}
                      </button>
                    : <span className="text-xs text-gray-400">No JSON</span>}
                  <button onClick={() => openEdit(cat)}
                    className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 font-medium transition-colors">
                    Edit
                  </button>
                </div>
              </div>

              {/* JSON preview */}
              {previewId === cat.id && cat.schema_json && editId !== cat.id && (
                <div className="border-t border-gray-100 bg-slate-50 px-5 py-3">
                  <p className="text-xs font-medium text-gray-500 mb-2">Deck JSON structure</p>
                  <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto bg-white border border-gray-100 rounded-lg p-3 font-mono">
                    {JSON.stringify(cat.schema_json, null, 2)}
                  </pre>
                </div>
              )}

              {/* Edit form */}
              {editId === cat.id && (
                <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                  <form onSubmit={handleEdit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                        <input value={editForm.label} required
                          onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                          className={field} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Icon</label>
                        <input value={editForm.icon}
                          onChange={(e) => setEditForm((f) => ({ ...f, icon: e.target.value }))}
                          className={field} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                      <input value={editForm.description}
                        onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                        className={field} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">AI prompt</label>
                      <textarea value={editForm.ai_prompt} rows={4}
                        onChange={(e) => setEditForm((f) => ({ ...f, ai_prompt: e.target.value }))}
                        className={`${field} resize-none font-mono`} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Deck JSON structure
                      </label>
                      <textarea value={editForm.schema_json} rows={10}
                        onChange={(e) => { setEditForm((f) => ({ ...f, schema_json: e.target.value })); setEditJsonErr(null); }}
                        className={`${field} resize-y font-mono ${editJsonErr ? "border-red-300" : ""}`} />
                      {editJsonErr && <p className="text-xs text-red-500 mt-0.5">{editJsonErr}</p>}
                    </div>
                    {editError && <p className="text-sm text-red-500">{editError}</p>}
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setEditId(null)}
                        className="flex-1 border border-gray-200 rounded-lg py-1.5 text-sm hover:bg-white transition-colors">Cancel</button>
                      <button type="submit" disabled={editSubmitting}
                        className="flex-1 bg-teal-600 text-white text-sm font-semibold py-1.5 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors">
                        {editSubmitting ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
