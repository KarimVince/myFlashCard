"use client";

import { useEffect, useRef, useState } from "react";
import { adminDeleteBuild, adminListBuilds, adminListDecks, adminUploadBuild, getToken } from "@/lib/api";
import { Deck } from "@/lib/types";
import Link from "next/link";

export default function AdminDashboard() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);

  // Build upload / list state
  const fileRef = useRef<HTMLInputElement>(null);
  const [buildUploading, setBuildUploading] = useState(false);
  const [buildResult, setBuildResult] = useState<{ filename: string; url: string; size_mb: number } | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [builds, setBuilds] = useState<{ filename: string; url: string; size_mb: number }[]>([]);
  const [deletingBuild, setDeletingBuild] = useState<string | null>(null);

  async function loadBuilds() {
    const token = getToken();
    if (!token) return;
    try {
      const list = await adminListBuilds(token);
      setBuilds(list);
    } catch {
      // non-critical
    }
  }

  async function handleBuildUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = getToken();
    if (!token) return;
    setBuildUploading(true);
    setBuildError(null);
    setBuildResult(null);
    try {
      const result = await adminUploadBuild(token, file);
      setBuildResult(result);
      await loadBuilds();
    } catch (err: unknown) {
      setBuildError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBuildUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDeleteBuild(filename: string) {
    if (!confirm(`Delete "${filename}"?`)) return;
    const token = getToken();
    if (!token) return;
    setDeletingBuild(filename);
    try {
      await adminDeleteBuild(token, filename);
      setBuilds((prev) => prev.filter((b) => b.filename !== filename));
      if (buildResult?.filename === filename) setBuildResult(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingBuild(null);
    }
  }

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    adminListDecks(token)
      .then(setDecks)
      .finally(() => setLoading(false));
    loadBuilds();
  }, []);

  const publicCount = decks.filter((d) => d.is_public).length;
  const hiddenCount = decks.filter((d) => !d.is_public).length;

  const byCategory: Record<string, number> = {};
  decks.forEach((d) => {
    byCategory[d.category.label] = (byCategory[d.category.label] ?? 0) + 1;
  });

  const recent = [...decks]
    .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())
    .slice(0, 5);

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Loading…</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: "Total decks", value: decks.length },
          { label: "Public", value: publicCount },
          { label: "Hidden", value: hiddenCount },
          { label: "Categories", value: Object.keys(byCategory).length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-3xl font-bold text-teal-600">{value}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* By category */}
      <section className="mb-10">
        <h2 className="font-semibold text-gray-900 mb-4">By category</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(byCategory).map(([cat, count]) => (
            <div
              key={cat}
              className="bg-teal-50 text-teal-800 rounded-lg px-4 py-2 text-sm font-medium"
            >
              {cat}: <span className="font-bold">{count}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Recent uploads */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Recent uploads</h2>
          <Link href="/admin/manage" className="text-sm text-teal-600 hover:underline">
            Manage all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-gray-400 text-sm">No decks yet.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
            {recent.map((deck) => (
              <div key={deck.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{deck.title}</p>
                  <p className="text-xs text-gray-400">
                    {deck.category.label} · {deck.card_count ?? "?"} cards ·{" "}
                    {new Date(deck.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    deck.is_public
                      ? "bg-green-50 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {deck.is_public ? "Public" : "Hidden"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* App build upload */}
      <section className="mt-10">
        <h2 className="font-semibold text-gray-900 mb-4">App builds</h2>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-sm text-gray-500 mb-4">
            Upload a new APK or AAB to R2. Each filename is stored separately — upload with the same name to overwrite.
          </p>

          <label className={`inline-flex items-center gap-2 cursor-pointer font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm
            ${buildUploading ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-blue-900 text-white hover:bg-blue-800"}`}>
            {buildUploading ? "Uploading…" : "⬆ Upload APK / AAB"}
            <input
              ref={fileRef}
              type="file"
              accept=".apk,.aab,.ipa"
              className="hidden"
              disabled={buildUploading}
              onChange={handleBuildUpload}
            />
          </label>

          {buildError && (
            <p className="mt-3 text-sm text-red-600">{buildError}</p>
          )}
          {buildResult && (
            <div className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <p className="font-semibold">✓ Uploaded {buildResult.filename} ({buildResult.size_mb} MB)</p>
              <a href={buildResult.url} target="_blank" rel="noopener noreferrer"
                className="text-green-800 underline break-all">{buildResult.url}</a>
            </div>
          )}

          {/* Build list */}
          {builds.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Stored builds</p>
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                {builds.map((b) => (
                  <div key={b.filename} className="flex items-center justify-between px-4 py-3 gap-3">
                    <div className="min-w-0">
                      <a href={b.url} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-700 hover:underline truncate block">
                        {b.filename}
                      </a>
                      <p className="text-xs text-gray-400">{b.size_mb} MB</p>
                    </div>
                    <button
                      onClick={() => handleDeleteBuild(b.filename)}
                      disabled={deletingBuild === b.filename}
                      className="shrink-0 text-xs text-red-500 hover:text-red-700 disabled:opacity-40 font-medium"
                    >
                      {deletingBuild === b.filename ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {builds.length === 0 && (
            <p className="mt-4 text-sm text-gray-400">No builds uploaded yet.</p>
          )}
        </div>
      </section>

      <div className="mt-8">
        <Link
          href="/admin/upload"
          className="inline-flex items-center gap-2 bg-teal-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-teal-700 transition-colors"
        >
          + Upload new deck
        </Link>
      </div>
    </div>
  );
}
