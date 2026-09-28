"use client";

import { useEffect, useState } from "react";
import { adminDeleteUser, adminListUsers, adminSetService, errorMessage, getToken } from "@/lib/api";
import { User } from "@/lib/types";

const SERVICES: { key: string; label: string; on: string }[] = [
  { key: "premium", label: "Premium", on: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "ai_claude", label: "Claude AI", on: "bg-violet-50 text-violet-700 border-violet-200" },
];

export default function MembersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const t = setTimeout(() => {
      adminListUsers(token, query.trim() || undefined)
        .then(setUsers)
        .catch((e) => setError(errorMessage(e)))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  async function toggle(user: User, service: string) {
    const token = getToken();
    if (!token) return;
    setBusy(`${user.id}:${service}`);
    try {
      const updated = await adminSetService(token, user.id, service, !user.services.includes(service));
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function remove(user: User) {
    if (!confirm(`Delete ${user.alias} (${user.email})? This can't be undone.`)) return;
    const token = getToken();
    if (!token) return;
    try {
      await adminDeleteUser(token, user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (e) {
      alert(errorMessage(e));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          {!loading && (
            <p className="text-sm text-gray-500 mt-1">
              {users.length} member{users.length !== 1 ? "s" : ""}
              {query && " found"}
              {!query && ` · ${users.filter((u) => u.services.includes("premium")).length} premium`}
            </p>
          )}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search alias or email"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}
      {loading && <div className="text-center py-20 text-gray-400">Loading…</div>}
      {!loading && users.length === 0 && (
        <div className="text-center py-20 text-gray-400">{query ? "No member matches this search." : "No members yet."}</div>
      )}

      {!loading && users.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                <th className="px-4 py-3 font-semibold">Member</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3 font-semibold">Last login</th>
                <th className="px-4 py-3 font-semibold" title="AI tokens used this month">Tokens</th>
                <th className="px-4 py-3 font-semibold">Access</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="align-middle">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      {u.alias}
                      {u.role === "admin" && (
                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-gray-900 text-white">Admin</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-1.5">
                      {u.email}
                      {!u.email_verified && <span className="text-amber-600">· unverified</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.tokens_used_month ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-wrap">
                      {SERVICES.map((s) => {
                        const on = u.services.includes(s.key);
                        return (
                          <button
                            key={s.key}
                            onClick={() => toggle(u, s.key)}
                            disabled={busy === `${u.id}:${s.key}`}
                            title={on ? `Remove ${s.label}` : `Give ${s.label}`}
                            className={`text-xs font-semibold px-2 py-1 rounded-full border transition-colors disabled:opacity-50 ${
                              on ? s.on : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            {on ? "✓ " : "+ "}{s.label}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(u)} className="text-xs text-red-500 hover:text-red-700 font-medium">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
