"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCategories } from "@/lib/api";
import { Category } from "@/lib/types";

const FEATURES = [
  { icon: "📱", title: "Fully offline", desc: "No internet required after loading a deck." },
  { icon: "📂", title: "Any JSON deck", desc: "Load any .json deck file from your device storage." },
  { icon: "🎨", title: "Rich card types", desc: "Stats tiles, step lists, tables, images, notes." },
  { icon: "🔒", title: "No account needed", desc: "Use free & personal decks with no sign-up. An account unlocks premium content." },
];

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  const typeCount = categories.length;
  const heading =
    typeCount > 0
      ? `${typeCount} deck type${typeCount !== 1 ? "s" : ""}, infinite content`
      : "Deck types, infinite content";

  return (
    <div className="max-w-5xl mx-auto px-4">
      {/* Hero */}
      <section className="py-20 text-center">
        <p className="text-xs font-bold tracking-widest uppercase text-teal-600 mb-4">
          WillYGO · Free · Android
        </p>
        <h1 className="text-5xl font-bold text-gray-900 mb-4 leading-tight">
          Study anything.<br />
          <span className="text-teal-600">Offline. Always.</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto mb-10">
          Load any JSON flashcard deck from your device or the public library —
          no internet, no account, no limits.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/download"
            className="inline-flex items-center gap-2 bg-teal-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-teal-700 transition-colors shadow-sm"
          >
            ↓ Download
          </Link>
          <Link
            href="/library"
            className="inline-flex items-center gap-2 bg-blue-900 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-950 transition-colors shadow-sm"
          >
            Browse deck library →
          </Link>
          <Link
            href="/how-to"
            className="inline-flex items-center gap-2 bg-rose-800 text-white font-semibold px-6 py-3 rounded-xl hover:bg-rose-900 transition-colors shadow-sm"
          >
            Create your own deck →
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 border-t border-gray-100">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-10">
          Simple by design
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {FEATURES.map(({ icon, title, desc }) => (
            <div key={title} className="text-center">
              <div className="text-3xl mb-3">{icon}</div>
              <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
              <p className="text-sm text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Deck types — dynamic from API, 4 per row */}
      <section className="py-12 border-t border-gray-100">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">
          {heading}
        </h2>
        <p className="text-center text-gray-500 mb-10">
          Each type has a structured JSON format. Use our AI prompts to generate
          any deck in seconds.{" "}
          <Link href="/how-to" className="text-teal-600 font-medium underline">
            Learn how →
          </Link>
        </p>

        {categories.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white border border-gray-100 rounded-xl p-4 h-24 animate-pulse bg-gray-50"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.slug}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-2xl mb-2">{cat.icon ?? "📄"}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{cat.label}</h3>
                <p className="text-xs text-gray-400 mb-2">{cat.description}</p>
                {(cat.deck_count ?? 0) > 0 && (
                  <p className="text-xs font-medium text-teal-600">
                    {cat.deck_count} deck{cat.deck_count !== 1 ? "s" : ""} available
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
