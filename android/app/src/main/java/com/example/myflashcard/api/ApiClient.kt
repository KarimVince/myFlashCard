package com.example.myflashcard.api

import com.example.myflashcard.BuildConfig
import com.example.myflashcard.models.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

/** An API error with a message that is safe to show to the user. */
class ApiException(val status: Int, message: String) : Exception(message)

object ApiClient {

    val baseUrl: String get() = BuildConfig.API_BASE_URL

    // ── Library ───────────────────────────────────────────────────────────

    suspend fun fetchDecks(categorySlug: String? = null): List<DeckMeta> {
        val path = if (categorySlug.isNullOrBlank()) "/decks" else "/decks?category=$categorySlug"
        return parseDecks(JSONArray(request("GET", path)))
    }

    /** Deck JSON through the backend, which checks premium access (Silver, Gold, admins). */
    suspend fun deckContent(deckId: Int, token: String?): ByteArray =
        request("GET", "/decks/$deckId/content", token = token).toByteArray()

    suspend fun categories(): List<Category> {
        val arr = JSONArray(request("GET", "/categories"))
        return (0 until arr.length()).map { i ->
            val o = arr.getJSONObject(i)
            Category(o.getInt("id"), o.getString("slug"), o.getString("label"), o.optStringOrNull("icon"))
        }.sortedBy { it.label }
    }

    suspend fun settings(): Features {
        val o = JSONObject(request("GET", "/settings"))
        return Features(
            premium  = o.optBoolean("premium_enabled"),
            accounts = o.optBoolean("accounts_enabled"),
            ai       = o.optBoolean("ai_enabled"),
        )
    }

    // ── Accounts ──────────────────────────────────────────────────────────

    /** Returns the session token and the user. */
    suspend fun login(email: String, password: String): Pair<String, User> =
        parseAuth(request("POST", "/auth/login", JSONObject().put("email", email).put("password", password)))

    suspend fun register(alias: String, email: String, password: String): Pair<String, User> =
        parseAuth(request("POST", "/auth/register",
            JSONObject().put("alias", alias).put("email", email).put("password", password)))

    suspend fun logout(token: String) { request("POST", "/auth/logout", token = token) }

    suspend fun forgotPassword(email: String) {
        request("POST", "/auth/forgot-password", JSONObject().put("email", email))
    }

    suspend fun resendVerification(token: String) {
        request("POST", "/auth/resend-verification", token = token)
    }

    suspend fun me(token: String): User = parseUser(JSONObject(request("GET", "/me", token = token)))

    suspend fun updateAlias(token: String, alias: String): User =
        parseUser(JSONObject(request("PATCH", "/me", JSONObject().put("alias", alias), token)))

    suspend fun changePassword(token: String, current: String, new: String) {
        request("POST", "/me/password",
            JSONObject().put("current_password", current).put("new_password", new), token)
    }

    suspend fun deleteAccount(token: String, password: String) {
        request("DELETE", "/me", JSONObject().put("password", password), token)
    }

    // ── AI ────────────────────────────────────────────────────────────────

    suspend fun aiOptions(token: String): AIOptions = parseAIOptions(JSONObject(request("GET", "/ai/options", token = token)))

    /** Generate a deck. source: "shared" (the site's AI) or "own" (the member's key). */
    suspend fun generate(
        token: String, categorySlug: String, description: String, provider: String?, source: String,
    ): Pair<Generation, Balance> {
        val body = JSONObject()
            .put("category_slug", categorySlug)
            .put("description", description)
            .put("source", source)
        if (provider != null) body.put("provider", provider)
        // AI generation can take a minute or two (with a retry on invalid output).
        val o = JSONObject(request("POST", "/ai/generate", body, token, readTimeoutMs = 240_000))
        return parseGeneration(o.getJSONObject("generation")) to parseBalance(o.getJSONObject("balance"))
    }

    suspend fun generations(token: String): List<GenerationSummary> {
        val arr = JSONArray(request("GET", "/me/generations", token = token))
        return (0 until arr.length()).map { parseGenerationSummary(arr.getJSONObject(it)) }
    }

    suspend fun generation(token: String, id: Int): Generation =
        parseGeneration(JSONObject(request("GET", "/me/generations/$id", token = token)))

    suspend fun deleteGeneration(token: String, id: Int) {
        request("DELETE", "/me/generations/$id", token = token)
    }

    suspend fun saveOwnKey(token: String, provider: String, apiKey: String) {
        request("PUT", "/me/ai-key", JSONObject().put("provider", provider).put("api_key", apiKey), token)
    }

    suspend fun deleteOwnKey(token: String) { request("DELETE", "/me/ai-key", token = token) }

    suspend fun testOwnKey(token: String): TestResult {
        val o = JSONObject(request("POST", "/me/ai-key/test", token = token, readTimeoutMs = 150_000))
        return TestResult(o.getBoolean("ok"), o.getString("message"))
    }

    /** Admin: add a generated deck to the public library. Returns the new library deck id. */
    suspend fun publishGeneration(
        token: String, id: Int, title: String, description: String?, language: String, isFree: Boolean,
    ): Int {
        val body = JSONObject().put("title", title).put("language", language).put("is_free", isFree)
        if (!description.isNullOrBlank()) body.put("description", description)
        return JSONObject(request("POST", "/admin/ai/generations/$id/publish", body, token)).getInt("id")
    }

    // ── HTTP ──────────────────────────────────────────────────────────────

    private suspend fun request(
        method: String,
        path: String,
        body: JSONObject? = null,
        token: String? = null,
        readTimeoutMs: Int = 20_000,
    ): String = withContext(Dispatchers.IO) {
        val conn = try {
            URL("$baseUrl$path").openConnection() as HttpURLConnection
        } catch (e: IOException) {
            throw ApiException(0, "Could not reach the server. Check your connection.")
        }
        try {
            conn.requestMethod = method
            conn.connectTimeout = 10_000
            conn.readTimeout = readTimeoutMs
            conn.setRequestProperty("Accept", "application/json")
            if (token != null) conn.setRequestProperty("Authorization", "Bearer $token")
            if (body != null) {
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/json")
                conn.outputStream.use { it.write(body.toString().toByteArray()) }
            }
            val status = conn.responseCode
            val stream = if (status in 200..299) conn.inputStream else conn.errorStream
            val text = stream?.bufferedReader()?.use { it.readText() } ?: ""
            if (status !in 200..299) throw ApiException(status, errorMessage(status, text))
            text
        } catch (e: ApiException) {
            throw e
        } catch (e: java.net.SocketTimeoutException) {
            throw ApiException(0, "The server took too long to answer. Please try again.")
        } catch (e: IOException) {
            throw ApiException(0, "Could not reach the server. Check your connection.")
        } finally {
            conn.disconnect()
        }
    }

    // ── Parsing (internal so unit tests can use them) ─────────────────────

    /** FastAPI errors: {"detail": "text"} or {"detail": [{"msg": "Value error, …"}]}. */
    internal fun errorMessage(status: Int, body: String): String {
        val detail = try { JSONObject(body).opt("detail") } catch (_: Exception) { null }
        val text = when (detail) {
            is String -> detail
            is JSONArray -> (0 until detail.length())
                .mapNotNull { detail.optJSONObject(it)?.optString("msg")?.removePrefix("Value error, ") }
                .joinToString(". ")
            else -> null
        }
        return text?.takeIf { it.isNotBlank() } ?: when (status) {
            401 -> "Your session has expired. Please log in again."
            429 -> "Too many attempts — please wait and try again."
            else -> "Something went wrong (error $status). Please try again."
        }
    }

    internal fun parseUser(o: JSONObject) = User(
        id            = o.getInt("id"),
        alias         = o.getString("alias"),
        email         = o.getString("email"),
        role          = o.optString("role", "user"),
        tier          = o.optString("tier", "none"),
        emailVerified = o.optBoolean("email_verified"),
    )

    internal fun parseAuth(json: String): Pair<String, User> {
        val o = JSONObject(json)
        return o.getString("token") to parseUser(o.getJSONObject("user"))
    }

    internal fun parseBalance(o: JSONObject) = Balance(
        allowance = o.optInt("allowance"),
        used      = o.optInt("used"),
        left      = o.optInt("left"),
        extra     = o.optInt("extra"),
        total     = o.optInt("total"),
        period    = o.optStringOrNull("period"),
        resetsOn  = o.optStringOrNull("resets_on"),
        unlimited = o.optBoolean("unlimited"),
    )

    internal fun parseAIOptions(o: JSONObject): AIOptions {
        val providers = o.optJSONArray("providers") ?: JSONArray()
        val keyProviders = o.optJSONArray("key_providers") ?: JSONArray()
        val own = o.optJSONObject("own_key")
        return AIOptions(
            emailVerified = o.optBoolean("email_verified"),
            tier          = o.optString("tier", "none"),
            isAdmin       = o.optBoolean("is_admin"),
            canGenerate   = o.optBoolean("can_generate"),
            reason        = o.optStringOrNull("reason"),
            shared        = o.optBoolean("shared"),
            ownKeyAllowed = o.optBoolean("own_key_allowed"),
            ownKey        = own?.let {
                OwnKey(
                    provider      = it.getString("provider"),
                    providerLabel = it.getString("provider_label"),
                    model         = it.optString("model"),
                    keyHint       = it.optStringOrNull("key_hint"),
                    lastTestOk    = if (it.isNull("last_test_ok")) null else it.optBoolean("last_test_ok"),
                )
            },
            balance       = parseBalance(o.getJSONObject("balance")),
            providers     = (0 until providers.length()).map { i ->
                val p = providers.getJSONObject(i)
                ProviderOption(
                    id        = p.getString("id"),
                    label     = p.getString("label"),
                    tokenCost = p.optInt("token_cost", 1),
                    isDefault = p.optBoolean("is_default"),
                    available = p.optBoolean("available"),
                    reason    = p.optStringOrNull("reason"),
                )
            },
            keyProviders  = (0 until keyProviders.length()).map { i ->
                val p = keyProviders.getJSONObject(i)
                KeyProvider(p.getString("id"), p.getString("label"), p.optString("model"))
            },
            maxDescription = o.optInt("max_description", 1000),
        )
    }

    internal fun parseGenerationSummary(o: JSONObject) = GenerationSummary(
        id              = o.getInt("id"),
        title           = o.optStringOrNull("title"),
        categoryLabel   = o.optStringOrNull("category_label"),
        cardCount       = if (o.isNull("card_count")) null else o.optInt("card_count"),
        keySource       = o.optString("key_source", "shared"),
        publishedDeckId = if (o.isNull("published_deck_id")) null else o.optInt("published_deck_id"),
    )

    internal fun parseGeneration(o: JSONObject) = Generation(
        summary     = parseGenerationSummary(o),
        description = o.optString("description"),
        deckJson    = o.getJSONObject("deck").toString(),
    )

    internal fun parseDecks(arr: JSONArray): List<DeckMeta> =
        (0 until arr.length()).map { i ->
            val o = arr.getJSONObject(i)
            val cat = o.optJSONObject("category") ?: JSONObject()
            DeckMeta(
                id            = o.getInt("id"),
                title         = o.getString("title"),
                description   = o.optStringOrNull("description"),
                author        = o.optStringOrNull("author"),
                language      = o.optString("language").ifEmpty { "en" },
                cardCount     = if (o.isNull("card_count")) null else o.getInt("card_count"),
                publicUrl     = o.getString("public_url"),
                downloads     = o.optInt("downloads", 0),
                categorySlug  = cat.optString("slug"),
                categoryLabel = cat.optString("label"),
                isFree        = o.optBoolean("is_free", true),
            )
        }

    /** optString returns "" for missing and "null" for JSON null; normalise both to null. */
    private fun JSONObject.optStringOrNull(key: String): String? =
        if (isNull(key)) null else optString(key).ifEmpty { null }
}
