"use client";

import { useState } from "react";
import LibraryTab from "./LibraryTab";
import MyDecksTab from "./MyDecksTab";
import CardViewer from "./CardViewer";
import CreateTab from "./CreateTab";
import { Deck } from "@/lib/types";

export type Tab = "library" | "decks" | "create";

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
      {/* Top tab bar */}
      <nav className="shrink-0 border-b border-gray-200 bg-white flex pt-safe-top">
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
          label="Create"
          icon={
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden>
              <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/>
            </svg>
          }
          active={tab === "create"}
          color="text-rose-500"
          onClick={() => setTab("create")}
        />
      </nav>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === "library" && <LibraryTab onOpenDeck={setViewing} />}
        {tab === "decks" && <MyDecksTab onOpenDeck={setViewing} />}
        {tab === "create" && <CreateTab onOpenDeck={setViewing} />}
      </div>
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
