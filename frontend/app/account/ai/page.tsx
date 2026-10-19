"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { deleteMyKey, errorMessage, getAIOptions, saveMyKey, testMyKey } from "@/lib/api";
import { KEY_LINKS } from "@/lib/aiProviders";
import { TIER_LABEL, tierPerks } from "@/lib/tiers";
import { AIOptions, Balance } from "@/lib/types";
import AccountHeader from "@/components/account/AccountHeader";
import { Notice } from "@/components/account/Form";

export default function AISettingsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [options, setOptions] = useState<AIOptions | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/account/login?next=/account/ai");
  }, [loading, user, router]);

  const load = useCallback(() => {
    if (token) getAIOptions(token).then(setOptions).catch((e) => setError(errorMessage(e)));
  }, [token]);
  useEffect(load, [load]);

  if (loading || !user || !token) return <div className="text-center py-20 text-gray-400">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      <AccountHeader user={user} />
      {error && <Notice kind="error">{error}</Notice>}
      {!options && !error && <div className="text-center py-10 text-gray-400">Loading…</div>}
      {options && (
        <>
          <PlanCard options={options} />
          {options.shared && <SharedCard balance={options.balance} isAdmin={options.is_admin} />}
          {(options.own_key_allowed || options.own_key) && (
            <OwnKeyCard token={token} options={options} onChanged={load} />
          )}
        </>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="font-semibold text-gray-900 mb-3">{title}</h2>
      {children}
    </section>
  );
}

function PlanCard({ options }: { options: AIOptions }) {
  if (options.is_admin) {
    return (
      <Card title="Your plan">
        <p className="text-sm text-gray-600">
          <strong>Admin</strong> — you can always create decks with the site&apos;s AI, without limits.{" "}
          <Link href="/create" className="text-teal-600 hover:underline">Create a deck →</Link>
        </p>
      </Card>
    );
  }
  return (
    <Card title="Your plan">
      <p className="text-sm text-gray-900 font-medium">{TIER_LABEL[options.tier]}</p>
      <p className="text-sm text-gray-500 mt-0.5">
        {tierPerks(options.tier, options.balance.allowance, options.balance.allowance)}
      </p>
      {options.can_generate ? (
        <p className="text-sm mt-3">
          <Link href="/create" className="text-teal-600 hover:underline">Create a deck with AI →</Link>
        </p>
      ) : (
        <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mt-3">{options.reason}</p>
      )}
    </Card>
  );
}

function SharedCard({ balance, isAdmin }: { balance: Balance; isAdmin: boolean }) {
  if (isAdmin || balance.unlimited) return null;
  const pct = balance.allowance ? (balance.left / balance.allowance) * 100 : 0;
  const renews = balance.resets_on
    ? new Date(`${balance.resets_on}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "long" })
    : null;
  return (
    <Card title="AI decks on us">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-gray-700">
          {balance.left} of {balance.allowance} left
        </span>
        <span className="text-xs text-gray-400">
          {balance.period === "month" ? `renews ${renews}` : "in total — doesn't renew"}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
        <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-gray-400 mt-3">
        Used when you create a deck with our AI. Once they run out, your own API key below takes over.
      </p>
    </Card>
  );
}

function OwnKeyCard({ token, options, onChanged }: { token: string; options: AIOptions; onChanged: () => void }) {
  const current = options.own_key;
  const providers = options.key_providers;
  const [provider, setProvider] = useState(current?.provider ?? providers.find((p) => KEY_LINKS[p.id]?.free)?.id ?? providers[0]?.id ?? "");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run(action: () => Promise<{ ok: boolean; text: string } | void>) {
    setBusy(true);
    setMsg(null);
    try {
      const result = await action();
      if (result) setMsg(result);
      onChanged();
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  const chosen = providers.find((p) => p.id === provider);
  const link = KEY_LINKS[provider];

  return (
    <Card title="Your own API key">
      <p className="text-sm text-gray-500 mb-4">
        Use your own account with an AI provider. Decks you make with it are free on our side — the provider may charge
        you or apply its own free-tier limits. Your key is stored encrypted and never shown again.
      </p>

      {current && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-4 text-sm">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-medium text-gray-900">
                {current.provider_label} <span className="text-gray-400 font-normal">{current.key_hint ?? "· key unreadable, paste it again"}</span>
              </p>
              <p className="text-xs text-gray-400">
                Model {current.model}
                {current.last_test_ok === true && " · ✓ worked on last test"}
                {current.last_test_ok === false && " · ✗ failed on last test"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy || !options.own_key_allowed}
                onClick={() => run(async () => {
                  setMsg({ ok: true, text: "Testing — this takes a few seconds…" });
                  const r = await testMyKey(token);
                  return { ok: r.ok, text: r.message };
                })}
                className="text-sm px-3 py-1.5 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Test
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => confirm("Remove your API key?") && run(async () => {
                  await deleteMyKey(token);
                  return { ok: true, text: "Key removed" };
                })}
                className="text-sm px-3 py-1.5 text-red-600 hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {msg && <div className="mb-4" role="status"><Notice kind={msg.ok ? "success" : "error"}>{msg.text}</Notice></div>}

      {options.own_key_allowed && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await saveMyKey(token, provider, apiKey);
              setApiKey("");
              return { ok: true, text: "Key saved — press Test to check it works." };
            });
          }}
          className="space-y-3"
        >
          <p className="text-sm font-medium text-gray-700">{current ? "Replace with another key" : "Add a key"}</p>
          <div className="flex flex-wrap gap-2">
            {providers.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProvider(p.id)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  provider === p.id ? "border-teal-600 bg-teal-50 text-teal-800 font-semibold" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p.label}
                {KEY_LINKS[p.id]?.free && <span className="ml-1 text-[10px] uppercase text-teal-600">free tier</span>}
              </button>
            ))}
          </div>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={`Paste your ${chosen?.label ?? ""} API key`}
            autoComplete="off"
            aria-label="API key"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-gray-400">
            <span>{chosen && <>We use the model {chosen.model}.</>}</span>
            {link && (
              <a href={link.href} target="_blank" rel="noreferrer" className="text-teal-600 hover:underline">
                Get a key from {link.label} ↗
              </a>
            )}
          </div>
          <button
            disabled={busy || !apiKey.trim() || !provider}
            className="text-sm px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            Save key
          </button>
        </form>
      )}

    </Card>
  );
}
