"use client";

import { useEffect, useState } from "react";
import {
  adminGetAI,
  adminListGenerations,
  adminSetAllowances,
  adminTestProvider,
  adminUpdateProvider,
  errorMessage,
  getToken,
} from "@/lib/api";
import { AdminAI, AdminGeneration, AdminProvider } from "@/lib/types";

const KEY_LINKS: Record<string, { href: string; label: string }> = {
  gemini: { href: "https://aistudio.google.com/apikey", label: "Google AI Studio" },
  claude: { href: "https://console.anthropic.com/settings/keys", label: "Anthropic Console" },
  mistral: { href: "https://console.mistral.ai/api-keys", label: "Mistral console" },
};

export default function AiCardPage() {
  const [data, setData] = useState<AdminAI | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    adminGetAI(token).then(setData).catch((e) => setError(errorMessage(e)));
  }, []);

  if (error) return <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>;
  if (!data) return <div className="text-center py-20 text-gray-400">Loading…</div>;

  function replaceProvider(p: AdminProvider) {
    setData((d) => d && {
      ...d,
      providers: d.providers.map((x) => (x.id === p.id ? p : p.is_default ? { ...x, is_default: false } : x)),
    });
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">AI Card</h1>
        <p className="text-sm text-gray-500">
          AI deck generation for registered members. Keys are stored encrypted and never shown again after saving.
        </p>
      </div>

      {!data.secrets_key_configured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
          <strong>SECRETS_KEY is not set.</strong> Fine for local development; in production the backend refuses to
          save API keys until it&apos;s set in Render.
        </div>
      )}

      <section>
        <h2 className="font-semibold text-gray-900 mb-4">Providers</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {data.providers.map((p) => (
            <ProviderCard key={p.id} provider={p} onSaved={replaceProvider} />
          ))}
        </div>
      </section>

      <Allowances data={data} onSaved={setData} />

      <RecentGenerations />
    </div>
  );
}

function ProviderCard({ provider, onSaved }: { provider: AdminProvider; onSaved: (p: AdminProvider) => void }) {
  const [model, setModel] = useState(provider.model);
  const [cost, setCost] = useState(String(provider.token_cost));
  const [baseUrl, setBaseUrl] = useState(provider.base_url ?? "");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(changes: Parameters<typeof adminUpdateProvider>[2], okText = "Saved") {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    setMsg(null);
    try {
      const updated = await adminUpdateProvider(token, provider.id, changes);
      onSaved(updated);
      setApiKey("");
      setMsg({ ok: true, text: okText });
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    setMsg({ ok: true, text: "Testing — this takes a few seconds…" });
    try {
      const r = await adminTestProvider(token, provider.id);
      setMsg({ ok: r.ok, text: `${r.message} (${(r.duration_ms / 1000).toFixed(1)}s)` });
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  const link = KEY_LINKS[provider.id];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            {provider.label}
            {provider.is_default && (
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-teal-600 text-white">Default</span>
            )}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {provider.requires_service ? "Only members with Claude AI access" : "All verified members"}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={provider.enabled}
          aria-label={`${provider.label} enabled`}
          disabled={busy}
          onClick={() => save({ enabled: !provider.enabled }, provider.enabled ? "Disabled" : "Enabled")}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
            provider.enabled ? "bg-teal-600" : "bg-gray-300"
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${provider.enabled ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>

      <label className="block">
        <span className="block text-xs font-medium text-gray-600 mb-1">
          API key {provider.has_key ? <span className="text-gray-400">· saved {provider.key_hint}</span> : <span className="text-amber-600">· none</span>}
        </span>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={provider.has_key ? "Paste a new key to replace it" : "Paste the API key"}
          autoComplete="off"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        {link && (
          <a href={link.href} target="_blank" rel="noreferrer" className="text-xs text-teal-600 hover:underline mt-1 inline-block">
            Get a key from {link.label} ↗
          </a>
        )}
      </label>

      <div className="grid grid-cols-3 gap-3">
        <label className="block col-span-2">
          <span className="block text-xs font-medium text-gray-600 mb-1">Model</span>
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-gray-600 mb-1">Tokens per deck</span>
          <input
            type="number"
            min={1}
            max={100}
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </label>
      </div>

      {provider.base_url !== null && (
        <label className="block">
          <span className="block text-xs font-medium text-gray-600 mb-1">API address</span>
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <span className="block text-xs text-gray-400 mt-1">OpenAI-compatible chat completions endpoint base.</span>
        </label>
      )}

      {msg && (
        <p className={`text-xs rounded-lg px-3 py-2 ${msg.ok ? "bg-teal-50 text-teal-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          disabled={busy}
          onClick={() => save({
            model,
            token_cost: Number(cost),
            ...(apiKey.trim() ? { api_key: apiKey } : {}),
            ...(provider.base_url !== null ? { base_url: baseUrl } : {}),
          })}
          className="text-sm px-4 py-1.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          Save
        </button>
        <button
          disabled={busy || !provider.has_key}
          onClick={test}
          className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Test
        </button>
        {!provider.is_default && (
          <button
            disabled={busy}
            onClick={() => save({ is_default: true }, "Now the default")}
            className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Make default
          </button>
        )}
        {provider.has_key && !provider.enabled && (
          <button
            disabled={busy}
            onClick={() => confirm(`Remove the ${provider.label} API key?`) && save({ api_key: "" }, "Key removed")}
            className="text-sm px-3 py-1.5 text-red-600 hover:underline disabled:opacity-50 ml-auto"
          >
            Remove key
          </button>
        )}
      </div>
    </div>
  );
}

function Allowances({ data, onSaved }: { data: AdminAI; onSaved: (d: AdminAI) => void }) {
  const [free, setFree] = useState(String(data.free_monthly));
  const [premium, setPremium] = useState(String(data.premium_monthly));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setBusy(true);
    setMsg(null);
    try {
      onSaved(await adminSetAllowances(token, Number(free), Number(premium)));
      setMsg({ ok: true, text: "Saved — applies immediately, including this month." });
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2 className="font-semibold text-gray-900 mb-1">Monthly tokens</h2>
      <p className="text-sm text-gray-500 mb-4">
        Each member gets this many tokens on the 1st of every month. Unused tokens don&apos;t carry over. A token is only
        used when a valid deck comes back.
      </p>
      <form onSubmit={save} className="bg-white border border-gray-200 rounded-xl p-5 flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="block text-xs font-medium text-gray-600 mb-1">Free members</span>
          <input type="number" min={0} max={1000} value={free} onChange={(e) => setFree(e.target.value)}
            className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-gray-600 mb-1">Premium members</span>
          <input type="number" min={0} max={1000} value={premium} onChange={(e) => setPremium(e.target.value)}
            className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </label>
        <button disabled={busy} className="text-sm px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50">
          Save
        </button>
        {msg && <p className={`text-xs w-full ${msg.ok ? "text-teal-700" : "text-red-600"}`}>{msg.text}</p>}
      </form>
    </section>
  );
}

function RecentGenerations() {
  const [rows, setRows] = useState<AdminGeneration[] | null>(null);
  const [onlyFailed, setOnlyFailed] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    adminListGenerations(token, onlyFailed ? "failed" : undefined).then(setRows).catch(() => setRows([]));
  }, [onlyFailed]);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">Recent generations</h2>
        <label className="text-sm text-gray-500 flex items-center gap-2">
          <input type="checkbox" checked={onlyFailed} onChange={(e) => setOnlyFailed(e.target.checked)} />
          Failed only
        </label>
      </div>
      {rows === null && <p className="text-sm text-gray-400">Loading…</p>}
      {rows?.length === 0 && <p className="text-sm text-gray-400">Nothing yet.</p>}
      {rows && rows.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                <th className="px-4 py-3 font-semibold">When</th>
                <th className="px-4 py-3 font-semibold">Member</th>
                <th className="px-4 py-3 font-semibold">Request</th>
                <th className="px-4 py-3 font-semibold">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 align-top">
              {rows.map((g) => (
                <tr key={g.id}>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(g.created_at).toLocaleString()}
                    <div className="text-xs text-gray-400">{g.provider} · {g.duration_ms ? `${(g.duration_ms / 1000).toFixed(1)}s` : "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{g.user_alias}</div>
                    <div className="text-xs text-gray-400">{g.user_email}</div>
                  </td>
                  <td className="px-4 py-3 max-w-sm">
                    <div className="text-xs font-semibold text-teal-700">{g.category_label}</div>
                    <p className="text-gray-600 line-clamp-3" title={g.description}>{g.description}</p>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    {g.status === "failed" ? (
                      <p className="text-xs text-red-600 line-clamp-4" title={g.error ?? ""}>✕ {g.error}</p>
                    ) : (
                      <p className="text-gray-900">
                        {g.status === "deleted" ? <span className="text-gray-400">(deleted by member)</span> : g.title}
                        <span className="block text-xs text-gray-400">{g.tokens_spent} token{g.tokens_spent !== 1 ? "s" : ""}</span>
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
