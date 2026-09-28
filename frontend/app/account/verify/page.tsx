"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { errorMessage, verifyEmail } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AuthCard, Notice } from "@/components/account/Form";

function Verify() {
  const token = useSearchParams().get("token");
  const { refresh } = useAuth();
  const [state, setState] = useState<"working" | "done" | "error">("working");
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    // Tokens are single-use: don't run twice under React strict mode.
    if (ran.current) return;
    ran.current = true;
    if (!token) {
      setState("error");
      setError("This link is missing its code.");
      return;
    }
    verifyEmail(token)
      .then(() => {
        setState("done");
        refresh();
      })
      .catch((e) => {
        setState("error");
        setError(errorMessage(e));
      });
  }, [token, refresh]);

  return (
    <AuthCard title="Confirm your email">
      {state === "working" && <p className="text-sm text-gray-500">Confirming…</p>}
      {state === "done" && (
        <div className="space-y-4">
          <Notice kind="success">Your email is confirmed. You can now generate decks with AI.</Notice>
          <Link href="/account" className="inline-block text-sm text-teal-600 hover:underline">Go to my account →</Link>
        </div>
      )}
      {state === "error" && (
        <div className="space-y-4">
          <Notice kind="error">{error}</Notice>
          <p className="text-sm text-gray-500">
            You can send a new link from <Link href="/account" className="text-teal-600 hover:underline">your account</Link>.
          </p>
        </div>
      )}
    </AuthCard>
  );
}

export default function VerifyPage() {
  return <Suspense><Verify /></Suspense>;
}
