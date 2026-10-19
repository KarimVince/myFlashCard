"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Nav from "./Nav";

export function ConditionalNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/app")) return null;
  return <Nav />;
}

export function ConditionalFooter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/app")) return null;
  return <>{children}</>;
}

/** Discreet footer link: "Admin" for admins, "Log in" for visitors (Log in is hidden in the nav while accounts are closed). */
export function FooterAccountLink() {
  const { user, loading } = useAuth();
  if (loading || (user && user.role !== "admin")) return null;
  return (
    <>
      <span className="mx-2">·</span>
      {user ? (
        <Link href="/admin" className="text-gray-300 hover:text-gray-500">Admin</Link>
      ) : (
        <Link href="/account/login" className="text-gray-300 hover:text-gray-500">Log in</Link>
      )}
    </>
  );
}
