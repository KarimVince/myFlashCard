"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppShell, { Tab } from "@/components/app/AppShell";

function App() {
  // ?tab=create lets login/register send the user back to the Create tab.
  const tab = useSearchParams().get("tab");
  const initial: Tab = tab === "create" || tab === "library" ? tab : "decks";
  return <AppShell initialTab={initial} />;
}

export default function AppPage() {
  return (
    <Suspense>
      <App />
    </Suspense>
  );
}
