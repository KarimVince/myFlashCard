"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useFeatures } from "@/lib/features";
import { errorMessage } from "@/lib/api";
import { AuthCard, Field, Notice, SubmitButton } from "@/components/account/Form";

function RegisterForm() {
  const { register } = useAuth();
  const features = useFeatures();
  const router = useRouter();
  const next = useSearchParams().get("next") || "/account";
  const [alias, setAlias] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register(alias, email, password);
      router.push(next.startsWith("/") ? next : "/account");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!features.loaded) return null;
  if (!features.accounts) {
    return (
      <AuthCard title="Accounts are coming soon" subtitle="Registration isn't open yet. Everything else in myFlashCard works without an account.">
        <Link href="/library" className="text-sm text-teal-600 hover:underline">Browse the library →</Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create an account"
      subtitle="Only an alias and an email. The account is free and lets you generate decks with AI."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Alias" value={alias} onChange={setAlias} autoComplete="nickname" autoFocus hint="Shown on your account. 3–30 characters." />
        <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" hint="Used to log in and reset your password. Never shown publicly." />
        <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="new-password" hint="At least 8 characters." />
        {error && <Notice kind="error">{error}</Notice>}
        <SubmitButton busy={busy}>Create account</SubmitButton>
      </form>
      <p className="mt-4 text-xs text-gray-400">
        By creating an account you accept our <Link href="/policy" className="underline">privacy policy</Link>.
      </p>
      <p className="mt-6 text-sm text-center">
        Already have an account?{" "}
        <Link href="/account/login" className="text-teal-600 hover:underline">Log in</Link>
      </p>
    </AuthCard>
  );
}

export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>;
}
