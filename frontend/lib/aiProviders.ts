/** Where to get an API key for each AI provider, and whether it has a free tier. */
export const KEY_LINKS: Record<string, { href: string; label: string; free?: boolean }> = {
  gemini: { href: "https://aistudio.google.com/apikey", label: "Google AI Studio", free: true },
  claude: { href: "https://console.anthropic.com/settings/keys", label: "Anthropic Console" },
  mistral: { href: "https://console.mistral.ai/api-keys", label: "Mistral console" },
  groq: { href: "https://console.groq.com/keys", label: "Groq console", free: true },
};
