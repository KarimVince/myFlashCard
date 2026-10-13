"use client";

import { useEffect, useState } from "react";
import { adminDeleteUser, adminListUsers, adminUpdateMember, errorMessage, getToken } from "@/lib/api";
import { TIER_BADGE, TIER_LABEL, TIERS, tierPerks } from "@/lib/tiers";
import { User } from "@/lib/types";

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

  async function update(user: User, data: Parameters<typeof adminUpdateMember>[2]) {
    const token = getToken();
    if (!token) return;
    setBusy(String(user.id));
    try {
      const updated = await adminUpdateMember(token, user.id, data);
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
              {!query && ` · ${users.filter((u) => u.tier !== "none").length} premium`}
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

      <ul className="text-xs text-gray-500 mb-5 space-y-0.5">
        {(["bronze", "silver", "gold"] as const).map((t) => (
          <li key={t}>
            <span className={`inline-block w-14 text-center font-semibold rounded-full border px-1.5 mr-2 ${TIER_BADGE[t]}`}>{TIER_LABEL[t]}</span>
            {tierPerks(t)}
          </li>
        ))}
        <li className="text-gray-400 pt-1">Levels only apply while Premium is switched on (Premium page). Shared AI allowances are set in AI Card.</li>
      </ul>

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
                <th className="px-4 py-3 font-semibold" title="Shared AI decks used this month">AI</th>
                <th className="px-4 py-3 font-semibold">Level</th>
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
                    <div className="text-xs text-gray-400 flex items-center gap-1.5 flex-wrap">
                      {u.email}
                      {!u.email_verified && (
                        <>
                          <span className="text-amber-600">· unverified</span>
                          <button
                            onClick={() => update(u, { email_verified: true })}
                            disabled={busy === String(u.id)}
                            className="text-teal-600 hover:underline disabled:opacity-50"
                          >
                            Confirm email
                          </button>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        const makeAdmin = u.role !== "admin";
                        if (confirm(makeAdmin ? `Give ${u.alias} full admin access?` : `Remove admin access from ${u.alias}?`)) {
                          update(u, { role: makeAdmin ? "admin" : "user", ...(makeAdmin && !u.email_verified ? { email_verified: true } : {}) });
                        }
                      }}
                      disabled={busy === String(u.id)}
                      className="text-[11px] text-gray-400 hover:text-gray-700 disabled:opacity-50"
                    >
                      {u.role === "admin" ? "Remove admin" : "Make admin"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {u.tokens_used_month ?? 0}
                    {u.own_key_provider && (
                      <span className="block text-[11px] text-gray-400" title="Has their own API key">
                        own key · {u.own_key_provider}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.tier}
                      onChange={(e) => update(u, { tier: e.target.value as User["tier"] })}
                      disabled={busy === String(u.id)}
                      aria-label={`${u.alias} level`}
                      className={`text-xs font-semibold px-2 py-1 rounded-full border disabled:opacity-50 ${TIER_BADGE[u.tier]}`}
                    >
                      {TIERS.map((t) => (
                        <option key={t} value={t}>{TIER_LABEL[t]}</option>
                      ))}
                    </select>
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
