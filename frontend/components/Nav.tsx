"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { hasAdminPasswordSession } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useFeatures } from "@/lib/features";

const links = [
  { href: "/library", label: "Library" },
  { href: "/create", label: "Create" },
  { href: "/how-to", label: "How to" },
  { href: "/schema", label: "JSON Schema" },
  { href: "/policy", label: "Privacy" },
];

export default function Nav() {
  const path = usePathname();
  const { user, loading } = useAuth();
  const features = useFeatures();
  // Create only exists while AI generation is switched on.
  const visibleLinks = links.filter((l) => l.href !== "/create" || features.ai);
  // Admin button while signed in as admin — by admin account or by the admin password.
  const [passwordAdmin, setPasswordAdmin] = useState(false);
  useEffect(() => setPasswordAdmin(hasAdminPasswordSession()), [path]);
  const showAdmin = user?.role === "admin" || passwordAdmin;

  return (
    <header className="bg-teal-600 text-white shadow-md">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg tracking-tight">
          my<span className="font-light opacity-70">FlashCard</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {visibleLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                path?.startsWith(href)
                  ? "bg-white/20 font-semibold"
                  : "hover:bg-white/10"
              }`}
            >
              {label}
            </Link>
          ))}
          {showAdmin && (
            <Link
              href="/admin"
              className={`ml-2 px-3 py-1.5 rounded-md border border-white/30 transition-colors text-xs uppercase tracking-wide ${
                path?.startsWith("/admin")
                  ? "bg-white text-teal-700 font-semibold"
                  : "hover:bg-white/10"
              }`}
            >
              Admin
            </Link>
          )}
          {!loading && (user || features.accounts) && (
            <Link
              href={user ? "/account" : "/account/login"}
              className={`ml-2 px-3 py-1.5 rounded-md transition-colors max-w-[10rem] truncate ${
                path?.startsWith("/account") ? "bg-white text-teal-700 font-semibold" : "bg-white/15 hover:bg-white/25"
              }`}
            >
              {user ? user.alias : "Log in"}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
