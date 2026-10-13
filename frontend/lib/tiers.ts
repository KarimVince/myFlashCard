import { Tier } from "./types";

export const TIERS: Tier[] = ["none", "bronze", "silver", "gold"];

export const TIER_LABEL: Record<Tier, string> = {
  none: "No Premium",
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
};

/** What each level includes, in plain words. Allowances come from the server. */
export function tierPerks(tier: Tier, silverTotal = 3, goldMonthly = 10): string {
  switch (tier) {
    case "bronze":
      return "AI decks with your own API key";
    case "silver":
      return `${silverTotal} AI decks on us, then your own API key · premium library decks`;
    case "gold":
      return `${goldMonthly} AI decks on us every month, plus your own API key · premium library decks`;
    default:
      return "Free library decks";
  }
}

export const TIER_BADGE: Record<Tier, string> = {
  none: "bg-gray-50 text-gray-500 border-gray-200",
  bronze: "bg-orange-50 text-orange-800 border-orange-200",
  silver: "bg-slate-100 text-slate-700 border-slate-300",
  gold: "bg-amber-50 text-amber-700 border-amber-300",
};

/** Silver, Gold and admins can open premium library decks. */
export function canOpenPremiumDecks(user: { tier: Tier; role: string } | null): boolean {
  return !!user && (user.role === "admin" || user.tier === "silver" || user.tier === "gold");
}
