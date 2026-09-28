"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { errorMessage, generateDeck, getAIOptions, getCategories, resendVerification } from "@/lib/api";
import { AIOptions, Balance, Category, Generation } from "@/lib/types";

interface Props {
  /** "web" = website page, "app" = compact layout for the iPhone web app */
  variant: "web" | "app";
  /** Where login/register should send the user back to. */
  returnTo: string;
  onGenerated: (gen: Generation, categories: Category[]) => void;
}

const EXAMPLES: Record<string, string> = {
  recipe: "Crêpes for 4 people, sweet and savoury fillings, with a shopping list",
  study: "The French Revolution 1789–1799 for a high-school exam: causes, key events, people, dates",
  training: "A 20-minute beginner bodyweight workout I can do at home, 3 times a week",
  song: "Lyrics structure and chords for 'Imagine' by John Lennon",
  travel: "3 days in Lisbon on a budget: neighbourhoods, food, transport, phrases",
  game: "Texas Hold'em poker: hand rankings, betting rounds and beginner strategy",
};

export default function CreateForm({ variant, returnTo, onGenerated }: Props) {
  const { user, token, loading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [options, setOptions] = useState<AIOptions | null>(null);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [provider, setProvider] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    getCategories()
      .then((cats) => {
        const sorted = [...cats].sort((a, b) => a.label.localeCompare(b.label));
        setCategories(sorted);
        setCategory((c) => c || sorted[0]?.slug || "");
      })
      .catch(() => setLoadError("Could not connect to the server. Check your connection and try again."));
  }, []);

  useEffect(() => {
    if (!token) return;
    getAIOptions(token)
      .then((o) => {
        setOptions(o);
        const usable = o.providers.filter((p) => p.available);
        setProvider((p) => p || (usable.find((x) => x.is_default) ?? usable[0])?.id || "");
      })
      .catch((e) => setLoadError(errorMessage(e)));
  }, [token]);

  const compact = variant === "app";
  const card = compact ? "bg-white rounded-2xl border border-gray-200 p-4" : "bg-white rounded-xl border border-gray-200 p-6";

  if (loading) return <p className="text-center text-sm text-gray-400 py-10">Loading…</p>;

  if (!user || !token) {
    return (
      <div className={`${card} text-center space-y-4`}>
        <div className="text-4xl">✨</div>
        <div>
          <p className="font-semibold text-gray-900">Create decks with AI</p>
          <p className="text-sm text-gray-500 mt-1">
            Describe what you want to learn and the AI builds the deck for you. You need a free account — it comes with
            free decks every month.
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <Link href={`/account/register?next=${encodeURIComponent(returnTo)}`} className="px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700">
            Create an account
          </Link>
          <Link href={`/account/login?next=${encodeURIComponent(returnTo)}`} className="px-4 py-2 border border-gray-200 text-sm font-semibold rounded-lg hover:bg-gray-50">
            Log in
          </Link>
        </div>
      </div>
    );
  }

  if (loadError) return <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{loadError}</p>;
  if (!options) return <p className="text-center text-sm text-gray-400 py-10">Loading…</p>;

  if (!options.email_verified) return <VerifyFirst token={token} email={user.email} card={card} />;

  const usable = options.providers.filter((p) => p.available);
  const chosen = options.providers.find((p) => p.id === provider);
  const cost = chosen?.token_cost ?? 1;
  const notEnough = options.balance.total < cost;
  const tooShort = description.trim().length < 10;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const result = await generateDeck(token, category, description.trim(), provider || undefined);
      setOptions((o) => o && { ...o, balance: result.balance });
      setDescription("");
      onGenerated(result.generation, categories);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (usable.length === 0) {
    return (
      <div className={`${card} text-sm text-gray-500 text-center`}>
        AI generation isn&apos;t available right now. Please check back later.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`${card} space-y-5`}>
      <BalanceLine balance={options.balance} />

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">1. Deck type</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => setCategory(c.slug)}
              disabled={busy}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                category === c.slug ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {c.icon && <span className="mr-1">{c.icon}</span>}
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-2">2. What should the deck cover?</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, options.max_description))}
          disabled={busy}
          rows={compact ? 4 : 5}
          placeholder={EXAMPLES[category] ? `e.g. ${EXAMPLES[category]}` : "Describe the topic, the level and anything the deck should include"}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50"
        />
        <span className="flex justify-between text-xs text-gray-400 mt-1">
          <span>Be specific: topic, level, language, what to include.</span>
          <span>{description.length}/{options.max_description}</span>
        </span>
      </label>

      {options.providers.length > 1 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">3. AI</p>
          <div className="flex flex-wrap gap-2">
            {options.providers.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => p.available && setProvider(p.id)}
                disabled={!p.available || busy}
                title={p.reason ?? undefined}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  provider === p.id ? "border-teal-600 bg-teal-50 text-teal-800 font-semibold" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p.label}
                <span className="ml-1 text-xs opacity-70">· {p.token_cost} token{p.token_cost !== 1 ? "s" : ""}</span>
              </button>
            ))}
          </div>
          {options.providers.some((p) => !p.available && p.reason?.includes("access")) && (
            <p className="text-xs text-gray-400 mt-2">Greyed-out AIs need extra access.</p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {busy ? (
        <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 text-sm text-teal-800">
          <span className="w-4 h-4 rounded-full border-2 border-teal-600 border-t-transparent animate-spin shrink-0" />
          Writing your deck… this usually takes 20–60 seconds. Keep this page open.
        </div>
      ) : (
        <button
          type="submit"
          disabled={tooShort || notEnough || !category || !provider}
          className="w-full bg-teal-600 text-white font-semibold py-2.5 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          {notEnough
            ? "No tokens left this month"
            : `✨ Generate deck · ${cost} token${cost !== 1 ? "s" : ""}`}
        </button>
      )}
    </form>
  );
}

function BalanceLine({ balance }: { balance: Balance }) {
  const resets = new Date(`${balance.resets_on}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "long" });
  const pct = balance.monthly_allowance ? (balance.monthly_left / balance.monthly_allowance) * 100 : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-gray-700">
          {balance.total} token{balance.total !== 1 ? "s" : ""} left
        </span>
        <span className="text-xs text-gray-400">
          {balance.monthly_allowance} per month · renews {resets}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
        <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function VerifyFirst({ token, email, card }: { token: string; email: string; card: string }) {
  const [sent, setSent] = useState(false);
  return (
    <div className={`${card} text-sm space-y-3`}>
      <p className="font-semibold text-gray-900">Confirm your email first</p>
      <p className="text-gray-500">
        We sent a link to <strong>{email}</strong>. Open it, then come back here to create decks with AI.
      </p>
      <button
        onClick={async () => {
          await resendVerification(token).catch(() => {});
          setSent(true);
        }}
        disabled={sent}
        className="text-teal-600 font-medium hover:underline disabled:no-underline disabled:text-gray-400"
      >
        {sent ? "New link sent ✓" : "Send a new link"}
      </button>
    </div>
  );
}
