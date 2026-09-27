"use client";

import { useEffect, useState } from "react";
import { getCategories } from "@/lib/api";
import { Category } from "@/lib/types";

const FIELD_DOCS: Record<
  string,
  { field: string; type: string; required: boolean; description: string }[]
> = {
  recipe: [
    { field: "deckTitle", type: "string", required: true, description: "Name of the recipe collection" },
    { field: "accentColor", type: "string (hex)", required: false, description: "Theme colour for the deck e.g. #C98A3B" },
    { field: "cards[].title", type: "string", required: true, description: "Dish name" },
    { field: "cards[].subtitle", type: "string", required: false, description: "Quick summary e.g. '20 min · Serves 2'" },
    { field: "blocks[].type = stats", type: "object", required: false, description: "Key figures: prep time, cook time, servings" },
    { field: "blocks[].type = steps", type: "object", required: false, description: "Ingredient list (style:bullet) or method (style:number)" },
    { field: "blocks[].type = note", type: "object", required: false, description: "Chef tip or warning" },
  ],
  study: [
    { field: "deckTitle", type: "string", required: true, description: "Subject — Topic e.g. 'History — WW2'" },
    { field: "accentColor", type: "string (hex)", required: false, description: "Theme colour" },
    { field: "cards[].title", type: "string", required: true, description: "Concept, event, or person name" },
    { field: "blocks[].type = note", type: "object", required: false, description: "Definition or summary paragraph" },
    { field: "blocks[].type = stats", type: "object", required: false, description: "Key dates, figures, or facts" },
    { field: "blocks[].type = steps", type: "object", required: false, description: "Sequence of events or list" },
    { field: "blocks[].type = table", type: "object", required: false, description: "Comparison table with rows and columns" },
  ],
  training: [
    { field: "deckTitle", type: "string", required: true, description: "Program name e.g. 'Upper Body Strength'" },
    { field: "accentColor", type: "string (hex)", required: false, description: "Theme colour" },
    { field: "cards[].title", type: "string", required: true, description: "Exercise name" },
    { field: "cards[].subtitle", type: "string", required: false, description: "Target muscle · Equipment" },
    { field: "blocks[].type = stats", type: "object", required: false, description: "Sets, reps, rest time, tempo" },
    { field: "blocks[].type = steps", type: "object", required: false, description: "Step-by-step technique cues (style:number)" },
    { field: "blocks[].type = note", type: "object", required: false, description: "Safety tip or coach's note" },
  ],
  song: [
    { field: "deckTitle", type: "string", required: true, description: "Artist — Song title" },
    { field: "accentColor", type: "string (hex)", required: false, description: "Theme colour" },
    { field: "cards[].title", type: "string", required: true, description: "Section name e.g. 'Verse 1', 'Chorus'" },
    { field: "blocks[].type = text", type: "object", required: false, description: "Lyric text block" },
    { field: "blocks[].type = note", type: "object", required: false, description: "Chord progression or playing note" },
    { field: "blocks[].type = stats", type: "object", required: false, description: "Tempo, key, capo position" },
  ],
};

export default function SchemaPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [active, setActive] = useState<string>("recipe");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getCategories().then((cats) => {
      setCategories(cats);
      if (cats.length > 0) setActive(cats[0].slug);
    });
  }, []);

  const cat = categories.find((c) => c.slug === active);
  const fields = FIELD_DOCS[active] ?? [];

  function copyPrompt() {
    if (!cat?.ai_prompt) return;
    navigator.clipboard.writeText(cat.ai_prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">JSON Schema Reference</h1>
      <p className="text-gray-500 mb-8">
        Each deck type has a defined JSON structure. Copy the AI prompt for your
        category — paste it into Claude or ChatGPT to get a valid deck instantly.
      </p>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((c) => (
          <button
            key={c.slug}
            onClick={() => { setActive(c.slug); setCopied(false); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              active === c.slug
                ? "bg-teal-600 text-white"
                : "border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {cat && (
        <>
          {/* AI Prompt */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">
                AI prompt — {cat.label}
              </h2>
              <button
                onClick={copyPrompt}
                className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${
                  copied
                    ? "bg-green-100 text-green-700"
                    : "bg-teal-50 text-teal-700 hover:bg-teal-100"
                }`}
              >
                {copied ? "✓ Copied!" : "Copy prompt"}
              </button>
            </div>
            <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap">
              {cat.ai_prompt ?? "No prompt available yet."}
            </pre>
          </section>

          {/* Field reference table */}
          <section>
            <h2 className="font-semibold text-gray-900 mb-4">Field reference</h2>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-700">Field</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Type</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Required</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {fields.map((f) => (
                    <tr key={f.field} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-mono text-teal-700 text-xs">{f.field}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{f.type}</td>
                      <td className="px-4 py-2.5">
                        {f.required ? (
                          <span className="text-xs font-semibold text-red-600">Yes</span>
                        ) : (
                          <span className="text-xs text-gray-400">No</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 text-xs">{f.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
