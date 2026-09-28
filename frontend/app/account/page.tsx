"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { changePassword, deleteAccount, errorMessage, resendVerification, updateAlias } from "@/lib/api";
import { usePremiumEnabled } from "@/lib/usePremium";
import { Field, Notice, SubmitButton } from "@/components/account/Form";

export default function AccountPage() {
  const { user, token, loading, logout, setUser } = useAuth();
  const premiumEnabled = usePremiumEnabled();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/account/login");
  }, [loading, user, router]);

  if (loading || !user || !token) {
    return <div className="text-center py-20 text-gray-400">Loading…</div>;
  }

  const isPremium = user.services.includes("premium");

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{user.alias}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {user.email} · member since {new Date(user.created_at).toLocaleDateString()}
          </p>
          <div className="flex gap-2 mt-3">
            {user.role === "admin" && (
              <Link href="/admin" className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-900 text-white">
                Admin →
              </Link>
            )}
            {premiumEnabled && isPremium && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                ★ Premium
              </span>
            )}
          </div>
        </div>
        <button
          onClick={async () => { await logout(); router.push("/"); }}
          className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shrink-0"
        >
          Log out
        </button>
      </div>

      {!user.email_verified && <VerifyBanner token={token} email={user.email} />}

      <Section title="Profile">
        <AliasForm token={token} current={user.alias} onSaved={setUser} />
      </Section>

      <Section title="Password">
        <PasswordForm token={token} />
      </Section>

      <Section title="Delete account" danger>
        <DeleteForm token={token} onDeleted={async () => { await logout(); router.push("/"); }} />
      </Section>
    </div>
  );
}

function Section({ title, danger, children }: { title: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <section className={`bg-white border rounded-xl p-5 ${danger ? "border-red-200" : "border-gray-200"}`}>
      <h2 className={`font-semibold mb-4 ${danger ? "text-red-700" : "text-gray-900"}`}>{title}</h2>
      {children}
    </section>
  );
}

function VerifyBanner({ token, email }: { token: string; email: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
      <p className="font-semibold">Confirm your email</p>
      <p className="mt-1">
        We sent a link to <strong>{email}</strong>. You need to confirm it before generating decks with AI.
      </p>
      <button
        disabled={state === "sending" || state === "sent"}
        onClick={async () => {
          setState("sending");
          try {
            await resendVerification(token);
            setState("sent");
          } catch {
            setState("error");
          }
        }}
        className="mt-3 text-sm font-medium underline disabled:no-underline disabled:opacity-70"
      >
        {state === "sent" ? "New link sent ✓" : state === "sending" ? "Sending…" : "Send a new link"}
      </button>
      {state === "error" && <p className="mt-1 text-red-600">Could not send — try again in a few minutes.</p>}
    </div>
  );
}

function AliasForm({ token, current, onSaved }: { token: string; current: string; onSaved: (u: import("@/lib/types").User) => void }) {
  const [alias, setAlias] = useState(current);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      onSaved(await updateAlias(token, alias));
      setMsg({ kind: "success", text: "Alias saved." });
    } catch (err) {
      setMsg({ kind: "error", text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Alias" value={alias} onChange={setAlias} autoComplete="nickname" />
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <div className="w-40"><SubmitButton busy={busy}>Save</SubmitButton></div>
    </form>
  );
}

function PasswordForm({ token }: { token: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await changePassword(token, current, next);
      setCurrent("");
      setNext("");
      setMsg({ kind: "success", text: "Password changed. Your other devices were signed out." });
    } catch (err) {
      setMsg({ kind: "error", text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Current password" type="password" value={current} onChange={setCurrent} autoComplete="current-password" />
      <Field label="New password" type="password" value={next} onChange={setNext} autoComplete="new-password" hint="At least 8 characters." />
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <div className="w-48"><SubmitButton busy={busy}>Change password</SubmitButton></div>
    </form>
  );
}

function DeleteForm({ token, onDeleted }: { token: string; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-gray-500">
          Permanently delete your account, your AI generation history and your remaining tokens.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="text-sm px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors shrink-0"
        >
          Delete…
        </button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(token, password);
      onDeleted();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-red-700">This can&apos;t be undone. Enter your password to confirm.</p>
      <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" autoFocus />
      {error && <Notice kind="error">{error}</Notice>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={busy}
          className="bg-red-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
        >
          {busy ? "Deleting…" : "Delete my account"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:underline">
          Cancel
        </button>
      </div>
    </form>
  );
}
