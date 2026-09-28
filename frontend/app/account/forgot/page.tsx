"use client";

import { useState } from "react";
import Link from "next/link";
import { errorMessage, forgotPassword } from "@/lib/api";
import { AuthCard, Field, Notice, SubmitButton } from "@/components/account/Form";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Forgot your password?" subtitle="Enter your email and we'll send you a link to choose a new one.">
      {sent ? (
        <Notice kind="success">
          If an account exists for {email}, a reset link is on its way. It&apos;s valid for 1 hour.
        </Notice>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" autoFocus />
          {error && <Notice kind="error">{error}</Notice>}
          <SubmitButton busy={busy}>Send reset link</SubmitButton>
        </form>
      )}
      <p className="mt-6 text-sm text-center">
        <Link href="/account/login" className="text-teal-600 hover:underline">Back to log in</Link>
      </p>
    </AuthCard>
  );
}
