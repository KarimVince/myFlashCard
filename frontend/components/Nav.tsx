"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/library", label: "Library" },
  { href: "/how-to", label: "How to" },
  { href: "/schema", label: "JSON Schema" },
  { href: "/policy", label: "Privacy" },
];

export default function Nav() {
  const path = usePathname();

  return (
    <header className="bg-teal-600 text-white shadow-md">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg tracking-tight">
          my<span className="font-light opacity-70">FlashCard</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {links.map(({ href, label }) => (
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
        </nav>
      </div>
    </header>
  );
}
