"use client";

import { useEffect, useRef, useState } from "react";
import { Deck } from "@/lib/types";
import { CardData, DeckJson } from "./AppShell";
import BlockRenderer from "./BlockRenderer";
import { saveDeck } from "@/lib/deckStorage";

interface Props {
  deck: Deck;
  json: DeckJson;
  onClose: () => void;
}

export default function CardViewer({ deck, json, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const total = json.cards.length;
  const card: CardData = json.cards[index];
  const accent = card.accentColor ?? json.accentColor ?? "#0d9488";

  const touchStart = useRef<number | null>(null);

  useEffect(() => {
    saveDeck({ deck, cards: json, savedAt: Date.now() });
  }, [deck.id]);

  function prev() { setIndex((i) => Math.max(0, i - 1)); }
  function next() { setIndex((i) => Math.min(total - 1, i + 1)); }

  function onTouchStart(e: React.TouchEvent) {
    touchStart.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStart.current === null) return;
    const delta = touchStart.current - e.changedTouches[0].clientX;
    if (delta > 50) next();
    else if (delta < -50) prev();
    touchStart.current = null;
  }

  return (
    <div
      className="fixed inset-0 bg-gray-100 flex flex-col"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar — shrink-0 so it never collapses */}
      <div
        className="shrink-0 flex items-center justify-between px-4 pt-safe-top pb-3 text-white"
        style={{ backgroundColor: accent }}
      >
        <button onClick={onClose} className="p-1 -ml-1 rounded-lg active:bg-white/20">
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden>
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>

        <div className="text-center flex-1 px-3 min-w-0">
          <p className="text-sm font-semibold truncate opacity-90">{json.deckTitle}</p>
          <p className="text-xs opacity-70">{index + 1} / {total}</p>
        </div>

        <div className="w-8" />
      </div>

      {/* Progress bar — shrink-0 */}
      <div className="shrink-0 h-1" style={{ backgroundColor: `${accent}33` }}>
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${((index + 1) / total) * 100}%`, backgroundColor: accent }}
        />
      </div>

      {/* Card content — flex-1 + min-h-0 is the critical pair for flex scroll */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
          <div className="px-5 pt-5 pb-4" style={{ borderLeftWidth: 4, borderLeftColor: accent }}>
            <h2 className="text-lg font-bold text-gray-900 leading-snug">{card.title}</h2>
            {card.subtitle && (
              <p className="text-sm text-gray-500 mt-1">{card.subtitle}</p>
            )}
          </div>
          <div className="px-5 pb-5 space-y-4">
            {card.blocks.map((block, i) => (
              <BlockRenderer key={i} block={block} accent={accent} />
            ))}
          </div>
        </div>
        {index === 0 && total > 1 && (
          <p className="text-center text-xs text-gray-400 mb-4">Swipe left / right to navigate</p>
        )}
      </div>

      {/* Bottom nav — shrink-0 so it's always visible */}
      <div className="shrink-0 flex items-center justify-between px-4 bg-white border-t border-gray-200 safe-bottom" style={{ minHeight: 56 }}>
        <button
          onClick={prev}
          disabled={index === 0}
          className="flex items-center gap-1 px-4 py-3 rounded-xl font-medium text-sm disabled:opacity-30 active:bg-gray-100 text-gray-700"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden>
            <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/>
          </svg>
          Previous
        </button>

        <span className="text-sm text-gray-400 tabular-nums">{index + 1} / {total}</span>

        <button
          onClick={next}
          disabled={index === total - 1}
          className="flex items-center gap-1 px-4 py-3 rounded-xl font-medium text-sm disabled:opacity-30 active:bg-gray-100 text-gray-700"
        >
          Next
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden>
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
