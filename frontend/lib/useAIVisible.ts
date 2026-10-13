"use client";

import { useAuth } from "./auth";
import { useFeatures } from "./features";

/**
 * Whether the Create (AI) screens are shown: to everyone once AI generation is switched on,
 * and always to admins. `loaded` turns true once both the switches and the login are known.
 */
export function useAIVisible(): { visible: boolean; loaded: boolean } {
  const features = useFeatures();
  const { user, loading } = useAuth();
  return { visible: features.ai || user?.role === "admin", loaded: features.loaded && !loading };
}
