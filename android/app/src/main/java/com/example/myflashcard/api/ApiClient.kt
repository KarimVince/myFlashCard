package com.example.myflashcard.api

import com.example.myflashcard.BuildConfig
import com.example.myflashcard.models.DeckMeta
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

object ApiClient {

    val baseUrl: String get() = BuildConfig.API_BASE_URL

    suspend fun fetchDecks(categorySlug: String? = null): List<DeckMeta> =
        withContext(Dispatchers.IO) {
            val url = buildString {
                append("$baseUrl/decks")
                if (!categorySlug.isNullOrBlank()) append("?category=$categorySlug")
            }
            val json = get(url)
            parseDecks(JSONArray(json))
        }

    suspend fun downloadDeck(publicUrl: String): ByteArray =
        withContext(Dispatchers.IO) {
            // Local dev: backend stores public_url as http://localhost:8000/...
            // On a real device "localhost" = the phone itself → rewrite to API host
            val effectiveUrl = rewriteLocalhost(publicUrl)
            val conn = URL(effectiveUrl).openConnection() as HttpURLConnection
            conn.connectTimeout = 8_000
            conn.readTimeout    = 15_000
            conn.connect()
            if (conn.responseCode != 200) error("HTTP ${conn.responseCode}")
            conn.inputStream.use { it.readBytes() }
        }

    /** Replace localhost / 127.0.0.1 in a URL with the API server's host. */
    private fun rewriteLocalhost(url: String): String {
        val apiHost = URL(baseUrl).host          // e.g. "192.168.1.100"
        val apiPort = URL(baseUrl).port.takeIf { it > 0 }?.toString() ?: ""
        return url
            .replace(Regex("://localhost(:\\d+)?/")) { m ->
                val port = m.groupValues[1].ifEmpty { if (apiPort.isNotEmpty()) ":$apiPort" else "" }
                "://$apiHost$port/"
            }
            .replace(Regex("://127\\.0\\.0\\.1(:\\d+)?/")) { m ->
                val port = m.groupValues[1].ifEmpty { if (apiPort.isNotEmpty()) ":$apiPort" else "" }
                "://$apiHost$port/"
            }
    }

    // ── Internal ──────────────────────────────────────────────────────────

    private fun get(url: String): String {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.connectTimeout = 10_000
        conn.readTimeout    = 15_000
        conn.connect()
        if (conn.responseCode != 200) error("HTTP ${conn.responseCode}")
        return conn.inputStream.bufferedReader().use { it.readText() }
    }

    private fun parseDecks(arr: JSONArray): List<DeckMeta> =
        (0 until arr.length()).map { i ->
            val o = arr.getJSONObject(i)
            val cat = o.optJSONObject("category") ?: JSONObject()
            DeckMeta(
                id            = o.getInt("id"),
                title         = o.getString("title"),
                description   = o.optString("description").ifEmpty { null },
                author        = o.optString("author").ifEmpty { null },
                language      = o.optString("language").ifEmpty { "en" },
                cardCount     = if (o.isNull("card_count")) null else o.getInt("card_count"),
                publicUrl     = o.getString("public_url"),
                downloads     = o.optInt("downloads", 0),
                categorySlug  = cat.optString("slug"),
                categoryLabel = cat.optString("label"),
            )
        }
}
