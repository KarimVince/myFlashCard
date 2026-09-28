"use client";

import BlockRenderer from "@/components/app/BlockRenderer";
import { Block } from "@/components/app/AppShell";

interface PreviewCard {
  title: string;
  subtitle?: string;
  accentColor?: string;
  blocks: Block[];
}

/** Read-only rendering of every card of a deck, for the website. */
export default function DeckPreview({ deck }: { deck: { deckTitle: string; accentColor?: string; cards: unknown[] } }) {
  const cards = deck.cards as PreviewCard[];
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {cards.map((card, i) => {
        const accent = card.accentColor ?? deck.accentColor ?? "#0d9488";
        return (
          <article key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <header className="px-4 py-3 text-white" style={{ backgroundColor: accent }}>
              <p className="text-xs opacity-80">Card {i + 1} of {cards.length}</p>
              <h3 className="font-semibold leading-snug">{card.title}</h3>
              {card.subtitle && <p className="text-sm opacity-90">{card.subtitle}</p>}
            </header>
            <div className="p-4 space-y-4">
              {card.blocks.map((block, j) => (
                <BlockRenderer key={j} block={block} accent={card.accentColor ?? accent} />
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}
