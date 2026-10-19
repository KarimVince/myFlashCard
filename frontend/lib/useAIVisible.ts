"use client";

import { useAuth } from "./auth";
import { useFeatures } from "./features";

/**
 * Whether the AI screens (Create, the AI part of How to) are shown: always to admins; to other
 * logged-in members only while both AI generation and Premium are switched on; never to visitors.
 * `loaded` turns true once both the switches and the login are known.
 */
export function useAIVisible(): { visible: boolean; loaded: boolean } {
  const features = useFeatures();
  const { user, loading } = useAuth();
  const visible = user?.role === "admin" || (!!user && features.ai && features.premium);
  return { visible, loaded: features.loaded && !loading };
}
