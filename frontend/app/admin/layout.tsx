"use client";

import { useEffect, useState } from "react";
import { clearToken, setToken } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useFeatures } from "@/lib/features";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const features = useFeatures();
  const [legacyToken, setLegacyToken] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const path = usePathname();

  useEffect(() => {
    setLegacyToken(sessionStorage.getItem("mfc_admin_token"));
    setChecking(false);
  }, []);

  async function handleLegacyLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    // Verify the password by making a real API call
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/admin/decks`,
        { headers: { Authorization: `Bearer ${input}` } },
      );
      if (!res.ok) throw new Error("Invalid password");
      setToken(input);
      setLegacyToken(input);
    } catch {
      setError("Incorrect admin password");
    }
  }

  async function handleSignOut() {
    if (legacyToken) {
      clearToken();
      setLegacyToken(null);
    } else {
      await logout();
    }
  }

  if (checking || loading) return null;

  const isAdmin = user?.role === "admin" || !!legacyToken;

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Admin</h1>
          {user ? (
            <p className="text-sm text-gray-500 mb-6">
              You&apos;re logged in as <strong>{user.alias}</strong>, which doesn&apos;t have admin access.
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-6">Log in with your admin account.</p>
              <Link
                href="/account/login?next=/admin"
                className="block text-center w-full bg-teal-600 text-white font-semibold py-2 rounded-lg hover:bg-teal-700 transition-colors"
              >
                Log in
              </Link>
            </>
          )}

          <details className="mt-8 text-sm">
            <summary className="cursor-pointer text-gray-400 hover:text-gray-600">Use the admin password instead</summary>
            <form onSubmit={handleLegacyLogin} className="space-y-4 mt-4">
              <input
                type="password"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Admin password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                className="w-full border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Sign in with password
              </button>
            </form>
          </details>
        </div>
      </div>
    );
  }

  const adminLinks = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/upload", label: "Upload" },
    { href: "/admin/manage", label: "Manage" },
    { href: "/admin/categories", label: "Categories" },
    { href: "/admin/members", label: "Members" },
    // AI Card only while AI generation is switched on (Premium page → Launch switches).
    ...(features.ai ? [{ href: "/admin/ai-card", label: "AI Card" }] : []),
    { href: "/admin/premium", label: "Premium" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <nav className="flex gap-1 flex-wrap">
          {adminLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                path === href
                  ? "bg-teal-600 text-white"
                  : "border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <button
          onClick={handleSignOut}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          Sign out
        </button>
      </div>
      {children}
    </div>
  );
}
