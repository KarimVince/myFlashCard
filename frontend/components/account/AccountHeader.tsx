"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useFeatures } from "@/lib/features";
import { useAIVisible } from "@/lib/useAIVisible";
import { TIER_BADGE, TIER_LABEL } from "@/lib/tiers";
import { User } from "@/lib/types";

const TABS = [
  { href: "/account", label: "Profile" },
  { href: "/account/ai", label: "AI settings" },
];

/** Name, badges, log out, and the tabs shared by the account pages. */
export default function AccountHeader({ user }: { user: User }) {
  const { logout } = useAuth();
  const { premium } = useFeatures();
  const router = useRouter();
  const path = usePathname();
  // AI settings only when AI is offered to this user (admins always; members while AI and Premium are on).
  const ai = useAIVisible();
  const tabs = TABS.filter((t) => t.href !== "/account/ai" || ai.visible);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{user.alias}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {user.email} · member since {new Date(user.created_at).toLocaleDateString()}
          </p>
          <div className="flex gap-2 mt-3">
            {user.role === "admin" && (
              <Link href="/admin" className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-900 text-white">
                Admin →
              </Link>
            )}
            {premium && user.tier !== "none" && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${TIER_BADGE[user.tier]}`}>
                ★ {TIER_LABEL[user.tier]}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={async () => { await logout(); router.push("/"); }}
          className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shrink-0"
        >
          Log out
        </button>
      </div>

      {tabs.length > 1 && <nav className="flex gap-1 border-b border-gray-200">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
              path === t.href ? "border-teal-600 text-teal-700" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>}
    </div>
  );
}
