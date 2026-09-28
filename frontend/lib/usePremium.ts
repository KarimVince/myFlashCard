"use client";

import { useFeatures } from "./features";

/**
 * Whether premium is active site-wide. False until loaded (and if the API is
 * unreachable) so nothing premium-related shows unless explicitly enabled.
 */
export function usePremiumEnabled(): boolean {
  return useFeatures().premium;
}
