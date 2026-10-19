package com.example.myflashcard.models

/** Site-wide launch switches (admin → Premium page). Everything stays hidden until they're on. */
data class Features(
    val premium: Boolean = false,
    val accounts: Boolean = false,
    val ai: Boolean = false,
)

data class User(
    val id: Int,
    val alias: String,
    val email: String,
    val role: String,          // "user" | "admin"
    val tier: String,          // "none" | "bronze" | "silver" | "gold"
    val emailVerified: Boolean,
) {
    val isAdmin: Boolean get() = role == "admin"

    /** Silver, Gold and admins can open premium library decks. */
    val canOpenPremiumDecks: Boolean get() = isAdmin || tier == "silver" || tier == "gold"
}

/** Same rule as the website: AI screens for admins always; members only while AI and Premium are on. */
fun aiVisible(user: User?, features: Features): Boolean =
    user != null && (user.isAdmin || (features.ai && features.premium))

val TIER_LABELS = mapOf("none" to "No Premium", "bronze" to "Bronze", "silver" to "Silver", "gold" to "Gold")

fun tierPerks(tier: String, allowance: Int): String = when (tier) {
    "bronze" -> "AI decks with your own API key"
    "silver" -> "$allowance AI decks on us, then your own API key · premium library decks"
    "gold"   -> "$allowance AI decks on us every month, plus your own API key · premium library decks"
    else     -> "Free library decks"
}

data class Category(val id: Int, val slug: String, val label: String, val icon: String?)

/** Shared-AI allowance. period "month" (Gold) renews on resetsOn; "total" (Silver) never renews. */
data class Balance(
    val allowance: Int,
    val used: Int,
    val left: Int,
    val extra: Int,
    val total: Int,
    val period: String?,
    val resetsOn: String?,
    val unlimited: Boolean,
)

data class ProviderOption(
    val id: String,
    val label: String,
    val tokenCost: Int,
    val isDefault: Boolean,
    val available: Boolean,
    val reason: String?,
)

data class KeyProvider(val id: String, val label: String, val model: String)

data class OwnKey(
    val provider: String,
    val providerLabel: String,
    val model: String,
    val keyHint: String?,
    val lastTestOk: Boolean?,
)

data class AIOptions(
    val emailVerified: Boolean,
    val tier: String,
    val isAdmin: Boolean,
    val canGenerate: Boolean,
    val reason: String?,
    val shared: Boolean,
    val ownKeyAllowed: Boolean,
    val ownKey: OwnKey?,
    val balance: Balance,
    val providers: List<ProviderOption>,
    val keyProviders: List<KeyProvider>,
    val maxDescription: Int,
)

data class GenerationSummary(
    val id: Int,
    val title: String?,
    val categoryLabel: String?,
    val cardCount: Int?,
    val keySource: String,
    val publishedDeckId: Int?,
)

/** A generated deck: summary plus the deck JSON in the app format. */
data class Generation(val summary: GenerationSummary, val description: String, val deckJson: String)

data class TestResult(val ok: Boolean, val message: String)

/** Where to get an API key for each provider, and whether it has a free tier. */
val KEY_LINKS = mapOf(
    "gemini"  to Triple("https://aistudio.google.com/apikey", "Google AI Studio", true),
    "claude"  to Triple("https://console.anthropic.com/settings/keys", "Anthropic Console", false),
    "mistral" to Triple("https://console.mistral.ai/api-keys", "Mistral console", false),
    "groq"    to Triple("https://console.groq.com/keys", "Groq console", true),
)
