"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getSettings } from "./api";

export interface Features {
  premium: boolean;
  accounts: boolean;
  ai: boolean;
  /** false until /settings answered; everything stays hidden until then (and if it fails). */
  loaded: boolean;
  refresh: () => void;
}

const OFF = { premium: false, accounts: false, ai: false, loaded: false };

const FeaturesContext = createContext<Features | null>(null);

function useLoadFeatures(enabled: boolean): Features {
  const [state, setState] = useState(OFF);
  const refresh = useCallback(() => {
    getSettings()
      .then((s) => setState({
        premium: s.premium_enabled,
        accounts: !!s.accounts_enabled,
        ai: !!s.ai_enabled,
        loaded: true,
      }))
      .catch(() => setState({ ...OFF, loaded: true }));
  }, []);
  useEffect(() => {
    if (enabled) refresh();
  }, [enabled, refresh]);
  return { ...state, refresh };
}

/** Site-wide launch switches (Premium, member accounts, AI generation), fetched once. */
export function FeaturesProvider({ children }: { children: React.ReactNode }) {
  const value = useLoadFeatures(true);
  return <FeaturesContext.Provider value={value}>{children}</FeaturesContext.Provider>;
}

export function useFeatures(): Features {
  const ctx = useContext(FeaturesContext);
  // Outside the provider (e.g. isolated component tests) fetch on our own.
  const own = useLoadFeatures(ctx === null);
  return ctx ?? own;
}
