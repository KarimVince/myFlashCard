"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useFeatures } from "@/lib/features";
import { errorMessage } from "@/lib/api";
import { AuthCard, Field, Notice, SubmitButton } from "@/components/account/Form";

function LoginForm() {
  const { login } = useAuth();
  const { accounts } = useFeatures();
  const router = useRouter();
  const next = useSearchParams().get("next") || "/account";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      router.push(next.startsWith("/") ? next : "/account");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Log in" subtitle="Welcome back to myFlashCard.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" autoFocus />
        <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
        {error && <Notice kind="error">{error}</Notice>}
        <SubmitButton busy={busy}>Log in</SubmitButton>
      </form>
      <div className="mt-6 flex justify-between text-sm">
        <Link href="/account/forgot" className="text-teal-600 hover:underline">Forgot password?</Link>
        {accounts && (
          <Link href={`/account/register${next !== "/account" ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-teal-600 hover:underline">
            Create an account
          </Link>
        )}
      </div>
    </AuthCard>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
