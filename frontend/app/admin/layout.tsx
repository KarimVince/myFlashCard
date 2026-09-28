"use client";

import { useEffect, useState } from "react";
import { getToken, setToken } from "@/lib/api";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const path = usePathname();

  useEffect(() => {
    setTokenState(getToken());
    setChecking(false);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    // Verify the token by making a real API call
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/admin/decks`,
        { headers: { Authorization: `Bearer ${input}` } },
      );
      if (!res.ok) throw new Error("Invalid password");
      setToken(input);
      setTokenState(input);
    } catch {
      setError("Incorrect admin password");
    }
  }

  if (checking) return null;

  if (!token) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Admin login</h1>
          <p className="text-sm text-gray-500 mb-6">
            Enter your admin password to access the management panel.
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Admin password"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              autoFocus
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              className="w-full bg-teal-600 text-white font-semibold py-2 rounded-lg hover:bg-teal-700 transition-colors"
            >
              Sign in
            </button>
          </form>
        </div>
      </div>
    );
  }

  const adminLinks = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/upload", label: "Upload" },
    { href: "/admin/manage", label: "Manage" },
    { href: "/admin/categories", label: "Categories" },
    { href: "/admin/ai-card", label: "AI Card" },
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
          onClick={() => { localStorage.removeItem("mfc_admin_token"); setTokenState(null); }}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          Sign out
        </button>
      </div>
      {children}
    </div>
  );
}
