"use client";

import { useEffect, useState } from "react";
import { AppSettings, adminGetSettings, adminListDecks, adminSetFeature, adminSetPremium, errorMessage, getToken } from "@/lib/api";
import { useFeatures } from "@/lib/features";

export default function PremiumPage() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [premiumCount, setPremiumCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    adminGetSettings(token)
      .then((s) => {
        setEnabled(s.premium_enabled);
        setSettings(s);
      })
      .catch((e) => setError(e.message));
    adminListDecks(token)
      .then((decks) => setPremiumCount(decks.filter((d) => !d.is_free).length))
      .catch(() => {});
  }, []);

  async function handleToggle() {
    const token = getToken();
    if (!token || enabled === null) return;
    setSaving(true);
    setError(null);
    try {
      const s = await adminSetPremium(token, !enabled);
      setEnabled(s.premium_enabled);
      setSettings(s);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not update setting");
    } finally {
      setSaving(false);
    }
  }

  if (enabled === null && !error) {
    return <div className="text-center py-20 text-gray-400">Loading…</div>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Premium</h1>
      <p className="text-sm text-gray-500 mb-8">
        Paid access to premium decks. Payments are not implemented yet — keep this inactive for launch.
      </p>

      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-4">
        <div>
          <p className="font-medium text-gray-900">
            Status:{" "}
            <span className={enabled ? "text-teal-600" : "text-gray-500"}>
              {enabled ? "Actif" : "Inactif"}
            </span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {enabled
              ? "Premium decks and badges are shown on the website, web app and Android app."
              : "All premium references are removed from the website, web app and Android app."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!!enabled}
          aria-label="Premium active"
          disabled={saving || enabled === null}
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
            enabled ? "bg-teal-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="mt-6 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 space-y-2">
        <p>
          <strong>{premiumCount}</strong> deck{premiumCount !== 1 ? "s are" : " is"} marked Premium.
        </p>
        <p className="text-gray-500">
          You can still mark decks as Premium from Upload, Edit or Manage. While Premium is inactive
          those decks are treated like hidden decks: they don&apos;t appear in the public library or apps.
        </p>
      </div>
      {settings && <LaunchSwitches settings={settings} onChange={setSettings} />}
    </div>
  );
}

function LaunchSwitches({ settings, onChange }: { settings: AppSettings; onChange: (s: AppSettings) => void }) {
  const features = useFeatures();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(feature: "accounts" | "ai", enabled: boolean) {
    const token = getToken();
    if (!token) return;
    setBusy(feature);
    setError(null);
    try {
      onChange(await adminSetFeature(token, feature, enabled));
      features.refresh(); // show/hide AI Card and public entry points right away
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const rows: { key: "accounts" | "ai"; title: string; on: boolean; onText: string; offText: string }[] = [
    {
      key: "accounts",
      title: "Member accounts",
      on: !!settings.accounts_enabled,
      onText: "Anyone can register. Log in / account pages are visible.",
      offText: "Registration is closed and Log in is hidden. You can still log in as admin at /admin.",
    },
    {
      key: "ai",
      title: "AI generation",
      on: !!settings.ai_enabled,
      onText: "Create page, web app Create tab and the AI how-to are visible. AI Card is in the admin menu.",
      offText: "Everything AI is hidden; the how-to shows only the manual method. Needs member accounts on.",
    },
  ];

  return (
    <section className="mt-10">
      <h2 className="font-semibold text-gray-900 mb-1">Launch switches</h2>
      <p className="text-sm text-gray-500 mb-4">Version 2.0 features, kept hidden until you&apos;re ready.</p>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-4 bg-white border border-gray-200 rounded-xl px-5 py-4">
            <div>
              <p className="font-medium text-gray-900">
                {r.title}:{" "}
                <span className={r.on ? "text-teal-600" : "text-gray-500"}>{r.on ? "Actif" : "Inactif"}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">{r.on ? r.onText : r.offText}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={r.on}
              aria-label={`${r.title} active`}
              disabled={busy !== null}
              onClick={() => toggle(r.key, !r.on)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                r.on ? "bg-teal-600" : "bg-gray-300"
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${r.on ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
    </section>
  );
}
