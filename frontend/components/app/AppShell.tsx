"use client";

import { useState } from "react";
import LibraryTab from "./LibraryTab";
import MyDecksTab from "./MyDecksTab";
import CardViewer from "./CardViewer";
import { Deck } from "@/lib/types";

export type Tab = "library" | "decks";

export interface SavedDeck {
  deck: Deck;
  cards: DeckJson;
  savedAt: number;
}

export interface DeckJson {
  deckTitle: string;
  accentColor?: string;
  cards: CardData[];
}

export interface CardData {
  title: string;
  subtitle?: string;
  accentColor?: string;
  blocks: Block[];
}

export type Block =
  | { type: "stats"; items: { label: string; value: string }[] }
  | { type: "note"; text: string; accentColor?: string }
  | { type: "steps"; style: "number" | "bullet"; items: string[]; accentColor?: string }
  | { type: "table"; columns: string[]; rows: string[][]; heading?: string; accentColor?: string };

interface Props {
  initialTab?: Tab;
}

export default function AppShell({ initialTab = "library" }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [viewing, setViewing] = useState<{ deck: Deck; json: DeckJson } | null>(null);

  if (viewing) {
    return (
      <CardViewer
        deck={viewing.deck}
        json={viewing.json}
        onClose={() => setViewing(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden">
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "library" && <LibraryTab onOpenDeck={setViewing} />}
        {tab === "decks" && <MyDecksTab onOpenDeck={setViewing} />}
      </div>

      {/* Bottom tab bar */}
      <nav className="shrink-0 border-t border-gray-200 bg-white flex safe-bottom">
        <TabBtn
          label="Library"
          icon={
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden>
              <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
            </svg>
          }
          active={tab === "library"}
          color="text-teal-600"
          onClick={() => setTab("library")}
        />
        <TabBtn
          label="My Decks"
          icon={
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden>
              <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-7 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm6 12H6v-.5c0-2.5 4-4 6-4s6 1.5 6 4V18z"/>
            </svg>
          }
          active={tab === "decks"}
          color="text-blue-600"
          onClick={() => setTab("decks")}
        />
      </nav>
    </div>
  );
}

function TabBtn({
  label, icon, active, color, onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors
        ${active ? color : "text-gray-400"}`}
    >
      {icon}
      {label}
    </button>
  );
}
