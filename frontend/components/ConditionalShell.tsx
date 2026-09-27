"use client";

import { usePathname } from "next/navigation";
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
