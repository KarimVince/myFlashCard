package com.example.myflashcard

import com.example.myflashcard.api.ApiClient
import com.example.myflashcard.models.Features
import com.example.myflashcard.models.User
import com.example.myflashcard.models.aiVisible
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import java.io.File

class AccountApiTest {

    private fun user(role: String = "user", tier: String = "none") =
        User(1, "Maker", "m@example.com", role, tier, emailVerified = true)

    // ── Who sees the AI screens (same rule as the website) ───────────────

    @Test fun visitorsNeverSeeAI() {
        assertFalse(aiVisible(null, Features(premium = true, accounts = true, ai = true)))
    }

    @Test fun adminsAlwaysSeeAI() {
        assertTrue(aiVisible(user(role = "admin"), Features()))
    }

    @Test fun membersSeeAIOnlyWhileAIAndPremiumAreOn() {
        val member = user(tier = "gold")
        assertFalse(aiVisible(member, Features(premium = false, accounts = true, ai = true)))
        assertFalse(aiVisible(member, Features(premium = true, accounts = true, ai = false)))
        assertTrue(aiVisible(member, Features(premium = true, accounts = true, ai = true)))
    }

    @Test fun premiumDecksForSilverGoldAndAdmins() {
        assertFalse(user(tier = "none").canOpenPremiumDecks)
        assertFalse(user(tier = "bronze").canOpenPremiumDecks)
        assertTrue(user(tier = "silver").canOpenPremiumDecks)
        assertTrue(user(tier = "gold").canOpenPremiumDecks)
        assertTrue(user(role = "admin").canOpenPremiumDecks)
    }

    // ── Error messages ──────────────────────────────────────────────────

    @Test fun errorMessageUsesDetailText() {
        assertEquals("Wrong email or password", ApiClient.errorMessage(401, """{"detail":"Wrong email or password"}"""))
    }

    @Test fun errorMessageJoinsValidationErrors() {
        val body = """{"detail":[{"msg":"Value error, Password must be at least 8 characters"},{"msg":"Value error, Enter a valid email address"}]}"""
        assertEquals(
            "Password must be at least 8 characters. Enter a valid email address",
            ApiClient.errorMessage(422, body),
        )
    }

    @Test fun errorMessageFallsBackWhenBodyIsNotJson() {
        assertTrue(ApiClient.errorMessage(429, "<html>").contains("Too many attempts"))
        assertTrue(ApiClient.errorMessage(500, "").contains("500"))
    }

    // ── Parsing server replies ──────────────────────────────────────────

    @Test fun parsesLoginReply() {
        val (token, u) = ApiClient.parseAuth(
            """{"token":"tok-1","user":{"id":7,"alias":"Boss","email":"b@example.com","role":"admin","tier":"gold","email_verified":true,"created_at":"2026-10-01T00:00:00Z"}}"""
        )
        assertEquals("tok-1", token)
        assertEquals("Boss", u.alias)
        assertTrue(u.isAdmin)
        assertEquals("gold", u.tier)
    }

    @Test fun parsesAIOptionsWithOwnKeyAndNulls() {
        val o = ApiClient.parseAIOptions(JSONObject("""
            {"email_verified":true,"tier":"silver","is_admin":false,"can_generate":true,"reason":null,
             "shared":true,"own_key_allowed":true,
             "own_key":{"provider":"groq","provider_label":"Groq","model":"m","key_hint":"••••abcd","last_test_ok":null,"last_tested_at":null},
             "balance":{"allowance":3,"used":1,"left":2,"extra":0,"total":2,"period":"total","resets_on":null,"unlimited":false},
             "providers":[{"id":"gemini","label":"Gemini","token_cost":1,"is_default":true,"available":true,"reason":null}],
             "key_providers":[{"id":"groq","label":"Groq","model":"m"}],"max_description":1000}
        """))
        assertNull(o.reason)
        assertEquals("Groq", o.ownKey?.providerLabel)
        assertNull(o.ownKey?.lastTestOk)
        assertEquals("total", o.balance.period)
        assertNull(o.balance.resetsOn)
        assertEquals(2, o.balance.total)
        assertTrue(o.providers.single().isDefault)
    }

    @Test fun parsesGenerationWithDeckJson() {
        val g = ApiClient.parseGeneration(JSONObject("""
            {"id":12,"title":"Carbonara","category_slug":"recipe","category_label":"Recipe","provider":"gemini",
             "key_source":"shared","card_count":2,"tokens_spent":1,"published_deck_id":null,"created_at":"2026-10-01T00:00:00Z",
             "description":"A Roman pasta dish",
             "deck":{"deckTitle":"Carbonara","cards":[{"title":"Ingredients","blocks":[{"type":"note","text":"Eggs"}]}]}}
        """))
        assertEquals(12, g.summary.id)
        assertNull(g.summary.publishedDeckId)
        // The deck JSON goes straight into the app's own parser.
        val deck = JsonParser.parse(g.deckJson)
        assertEquals("Carbonara", deck.deckTitle)
        assertEquals(1, deck.cards.size)
    }

    @Test fun parsesPremiumFlagOnLibraryDecks() {
        val decks = ApiClient.parseDecks(JSONArray("""[
            {"id":1,"title":"Free","description":null,"author":null,"language":"en","card_count":5,"public_url":"u","is_free":true,"downloads":0,"category":{"slug":"recipe","label":"Recipe"}},
            {"id":2,"title":"Gold","description":"x","author":"A","language":"fr","card_count":null,"public_url":"u","is_free":false,"downloads":3,"category":{"slug":"study","label":"Study"}}
        ]"""))
        assertTrue(decks[0].isFree)
        assertNull(decks[0].description)
        assertFalse(decks[1].isFree)
        assertNull(decks[1].cardCount)
    }

    // ── AI decks saved on the phone ─────────────────────────────────────

    @Test fun aiDecksGetTheirOwnFilenamesAndCleanTitles() {
        val name = DeckStorage.aiFilename(12, "Crêpes & Co!")
        assertTrue(name.startsWith("ai12_"))
        assertNotEquals(DeckStorage.remoteFilename(12, "Crêpes & Co!"), name)
        assertEquals("Crpes  Co", DeckStorage.displayName(File(name)))
    }
}
