"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { errorMessage, resetPassword } from "@/lib/api";
import { AuthCard, Field, Notice, SubmitButton } from "@/components/account/Form";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Choose a new password">
      {done ? (
        <div className="space-y-4">
          <Notice kind="success">Your password is changed. You&apos;ve been signed out everywhere.</Notice>
          <Link href="/account/login" className="inline-block text-sm text-teal-600 hover:underline">Log in →</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="New password" type="password" value={password} onChange={setPassword} autoComplete="new-password" autoFocus hint="At least 8 characters." />
          <Field label="Confirm new password" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
          {error && <Notice kind="error">{error}</Notice>}
          <SubmitButton busy={busy}>Change password</SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetForm /></Suspense>;
}
