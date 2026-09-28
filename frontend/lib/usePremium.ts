"use client";

import { useEffect, useState } from "react";
import { getSettings } from "./api";

/**
 * Whether premium is active site-wide. Defaults to false (and stays false if the
 * API is unreachable) so nothing premium-related shows unless explicitly enabled.
 */
export function usePremiumEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    getSettings()
      .then((s) => setEnabled(s.premium_enabled))
      .catch(() => setEnabled(false));
  }, []);
  return enabled;
}
