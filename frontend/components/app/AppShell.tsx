"use client";

import { useState } from "react";
import LibraryTab from "./LibraryTab";
import MyDecksTab from "./MyDecksTab";
import CardViewer from "./CardViewer";
import CreateTab from "./CreateTab";
import { Deck } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import AccountPanel from "./AccountPanel";

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
  /** One emoji shown before the title. */
  icon?: string;
  accentColor?: string;
  blocks: Block[];
}

export type Block =
  | { type: "stats"; items: { label: string; value: string; icon?: string }[] }
  | { type: "note"; text: string; accentColor?: string }
  | { type: "steps"; style: "number" | "bullet"; items: string[]; accentColor?: string }
  | { type: "table"; columns: string[]; rows: string[][]; heading?: string; accentColor?: string }
  | {
      type: "chart";
      /** bar: compare amounts (scaled to the largest); progress: each value out of `max` (default 100). */
      style: "bar" | "progress";
      items: { label: string; value: number; icon?: string }[];
      heading?: string;
      unit?: string;
      max?: number;
      accentColor?: string;
    };

interface Props {
  initialTab?: Tab;
}

export default function AppShell({ initialTab = "library" }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [viewing, setViewing] = useState<{ deck: Deck; json: DeckJson } | null>(null);
  const [account, setAccount] = useState(false);
  const { user, loading } = useAuth();

  if (account) return <AccountPanel onBack={() => setAccount(false)} />;

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
      {/* Header: logo and account (like the Android app) */}
      <header className="shrink-0 bg-white pt-safe-top">
        <div className="flex items-center gap-2.5 px-4 h-12">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/apple-icon.png" alt="" className="w-7 h-7 rounded-lg" />
          <span className="flex-1 font-serif font-bold text-lg text-gray-900">myFlashCard</span>
          <button
            onClick={() => setAccount(true)}
            className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full text-sm text-gray-500 active:bg-gray-100"
            aria-label="Account"
          >
            <span className="max-w-[7.5rem] truncate">{loading ? "" : user ? user.alias : "Log in"}</span>
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-teal-600" aria-hidden>
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zm0 14a8 8 0 0 1-6.2-2.95C6.9 15.4 9.9 14.5 12 14.5s5.1.9 6.2 2.55A8 8 0 0 1 12 20z"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="shrink-0 border-y border-gray-200 bg-white flex">
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
