"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useFeatures } from "@/lib/features";
import { useAIVisible } from "@/lib/useAIVisible";
import { TIER_BADGE, TIER_LABEL } from "@/lib/tiers";

/** Account pages are website pages; remember to offer a way back to the web app from there. */
export const FROM_APP_KEY = "mfc_from_app";

function markFromApp() {
  try {
    sessionStorage.setItem(FROM_APP_KEY, "1");
  } catch {
    // private mode — the "Back to the app" link just won't show
  }
}

/** In-app account screen (like Android's): log in, or see your plan and reach your settings. */
export default function AccountPanel({ onBack }: { onBack: () => void }) {
  const { user, loading, logout } = useAuth();
  const features = useFeatures();
  const ai = useAIVisible();

  const row = "flex items-center justify-between px-4 py-3.5 text-sm text-gray-800 active:bg-gray-50";

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50">
      <header className="shrink-0 bg-white border-b border-gray-200 pt-safe-top">
        <div className="flex items-center gap-2 px-2 h-12">
          <button onClick={onBack} className="px-2 py-1 text-teal-600 text-sm font-medium" aria-label="Back">
            ‹ Back
          </button>
          <h1 className="font-semibold text-gray-900">Account</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {loading && <p className="text-center text-sm text-gray-400 py-10">Loading…</p>}

        {!loading && !user && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 text-center space-y-4">
            <div className="text-4xl">👤</div>
            <p className="text-sm text-gray-500">
              Log in to create decks with AI and use your Premium level.
              {!features.accounts && " New accounts aren't open yet — everything else works without one."}
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/account/login?next=/app"
                onClick={markFromApp}
                className="px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg"
              >
                Log in
              </Link>
              {features.accounts && (
                <Link
                  href="/account/register?next=/app"
                  onClick={markFromApp}
                  className="px-4 py-2 border border-gray-200 bg-white text-sm font-semibold rounded-lg"
                >
                  Create an account
                </Link>
              )}
            </div>
          </div>
        )}

        {!loading && user && (
          <>
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <p className="text-lg font-semibold text-gray-900">{user.alias}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
              <div className="flex gap-2 mt-3">
                {user.role === "admin" && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-900 text-white">Admin</span>
                )}
                {features.premium && user.tier !== "none" && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${TIER_BADGE[user.tier]}`}>
                    ★ {TIER_LABEL[user.tier]}
                  </span>
                )}
              </div>
              {!user.email_verified && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
                  Confirm your email — we sent you a link.
                </p>
              )}
            </div>

            <nav className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100 overflow-hidden">
              {ai.visible && (
                <Link href="/account/ai" onClick={markFromApp} className={row}>
                  <span>AI settings</span>
                  <span className="text-gray-300">›</span>
                </Link>
              )}
              <Link href="/account" onClick={markFromApp} className={row}>
                <span>Profile &amp; password</span>
                <span className="text-gray-300">›</span>
              </Link>
              {user.role === "admin" && (
                <Link href="/admin" onClick={markFromApp} className={row}>
                  <span>Admin</span>
                  <span className="text-gray-300">›</span>
                </Link>
              )}
            </nav>

            <button
              onClick={async () => { await logout(); onBack(); }}
              className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-medium text-red-600"
            >
              Log out
            </button>
          </>
        )}
      </div>
    </div>
  );
}
