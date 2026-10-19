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

/** Discreet footer "Admin" link, for visitors and admins (the admin page offers the admin password and
 *  account login). Hidden for members who are logged in but aren't admins. */
export function FooterAccountLink() {
  const { user, loading } = useAuth();
  if (loading || (user && user.role !== "admin")) return null;
  return (
    <>
      <span className="mx-2">·</span>
      <Link href="/admin" className="text-gray-300 hover:text-gray-500">Admin</Link>
    </>
  );
}
