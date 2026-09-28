"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as api from "./api";
import { User } from "./types";

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (alias: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const t = api.getUserToken();
    if (!t) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }
    try {
      setUser(await api.getMe(t));
      setToken(t);
    } catch (e) {
      // Only drop the session if the server rejected it, not on a network error.
      if (e instanceof Error && e.message.startsWith("401")) {
        api.setUserToken(null);
        setUser(null);
        setToken(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function start(result: api.AuthResult): Promise<User> {
    api.setUserToken(result.token);
    setToken(result.token);
    setUser(result.user);
    return result.user;
  }

  const value: AuthState = {
    user,
    token,
    loading,
    login: async (email, password) => start(await api.login(email, password)),
    register: async (alias, email, password) => start(await api.register(alias, email, password)),
    logout: async () => {
      if (token) await api.logout(token).catch(() => {});
      api.setUserToken(null);
      setToken(null);
      setUser(null);
    },
    refresh,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
