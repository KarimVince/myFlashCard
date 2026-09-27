"use client";

import { useEffect, useState } from "react";
import { adminListDecks, getToken } from "@/lib/api";
import { Deck } from "@/lib/types";
import Link from "next/link";

export default function AdminDashboard() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    adminListDecks(token)
      .then(setDecks)
      .finally(() => setLoading(false));
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

      <div className="mt-10">
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
