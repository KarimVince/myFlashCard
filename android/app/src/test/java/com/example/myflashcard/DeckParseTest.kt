package com.example.myflashcard

import com.example.myflashcard.models.Block
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Full round-trip parse tests — one representative JSON per category.
 * Verifies that a realistic deck for each category parses without error
 * and that key structural fields are present.
 */
class DeckParseTest {

    // ── Recipe ────────────────────────────────────────────────────────────────

    @Test
    fun `recipe deck parses correctly`() {
        val json = """
        {
          "deckTitle": "Favourite Recipes",
          "accentColor": "#A6543C",
          "cards": [
            {
              "title": "Crêpes Bretonnes",
              "subtitle": "Traditional Brittany buckwheat crêpes",
              "accentColor": "#7B4A2D",
              "blocks": [
                {"type":"stats","items":[
                  {"label":"Prep","value":"10 min"},
                  {"label":"Cook","value":"20 min"},
                  {"label":"Serves","value":"4"}
                ]},
                {"type":"steps","style":"number","heading":"Method","items":[
                  "Mix flour and salt",
                  "Add egg and milk gradually",
                  "Cook on hot pan"
                ]},
                {"type":"note","text":"Rest batter 30 min before cooking."}
              ]
            }
          ]
        }
        """.trimIndent()

        val deck = JsonParser.parse(json)
        assertEquals("Favourite Recipes", deck.deckTitle)
        assertEquals(1, deck.cards.size)
        val card = deck.cards[0]
        assertEquals("Crêpes Bretonnes", card.title)
        assertEquals(3, card.blocks.size)
        assertTrue(card.blocks[0] is Block.Stats)
        assertTrue(card.blocks[1] is Block.Steps)
        assertTrue(card.blocks[2] is Block.Note)
        val stats = card.blocks[0] as Block.Stats
        assertEquals(3, stats.items.size)
    }

    // ── Study ─────────────────────────────────────────────────────────────────

    @Test
    fun `study deck parses correctly`() {
        val json = """
        {
          "deckTitle": "Histoire — Terminale",
          "accentColor": "#1A4FD6",
          "cards": [
            {
              "title": "La Première Guerre mondiale",
              "subtitle": "Causes et déclenchement",
              "blocks": [
                {"type":"note","text":"Contexte général : tensions en Europe depuis 1870."},
                {"type":"table",
                 "heading":"Chronologie",
                 "columns":["Date","Événement"],
                 "columnWeights":[0.27,0.73],
                 "rows":[
                   ["28 juin 1914","Assassinat de François-Ferdinand"],
                   ["1er août 1914","Déclaration de guerre de l'Allemagne à la Russie"]
                 ]},
                {"type":"steps","style":"bullet","heading":"Causes principales","items":[
                  "Nationalisme exacerbé",
                  "Course aux armements",
                  "Système d'alliances rigide"
                ]},
                {"type":"text","text":"L'attentat de Sarajevo n'est que le détonateur d'un conflit latent depuis plusieurs décennies."}
              ]
            }
          ]
        }
        """.trimIndent()

        val deck = JsonParser.parse(json)
        assertEquals("Histoire — Terminale", deck.deckTitle)
        val card = deck.cards[0]
        assertEquals(4, card.blocks.size)
        val table = card.blocks[1] as Block.Table
        assertEquals("Chronologie", table.heading)
        assertEquals(2, table.rows.size)
        assertNotNull(table.columnWeights)
        val text = card.blocks[3] as Block.TextBlock
        assertTrue(text.text.isNotBlank())
    }

    // ── Training ──────────────────────────────────────────────────────────────

    @Test
    fun `training deck parses correctly`() {
        val json = """
        {
          "deckTitle": "5K Running Plan",
          "accentColor": "#0A7B6B",
          "cards": [
            {
              "title": "Week 1 — Day 1",
              "subtitle": "Easy run",
              "blocks": [
                {"type":"stats","items":[
                  {"label":"Distance","value":"3 km"},
                  {"label":"Pace","value":"Easy"},
                  {"label":"Duration","value":"20 min"}
                ]},
                {"type":"steps","style":"number","heading":"Session","items":[
                  "5 min warm-up walk",
                  "15 min easy jog",
                  "5 min cool-down walk"
                ]},
                {"type":"note","text":"Keep your heart rate below 70% of max."}
              ]
            }
          ]
        }
        """.trimIndent()

        val deck = JsonParser.parse(json)
        assertEquals("5K Running Plan", deck.deckTitle)
        val card = deck.cards[0]
        val stats = card.blocks[0] as Block.Stats
        assertEquals("Distance", stats.items[0].label)
        assertEquals("3 km",     stats.items[0].value)
    }

    // ── Song ──────────────────────────────────────────────────────────────────

    @Test
    fun `song deck parses correctly`() {
        val json = """
        {
          "deckTitle": "My Playlist",
          "accentColor": "#6D28D9",
          "cards": [
            {
              "title": "APT.",
              "subtitle": "ROSE & Bruno Mars",
              "accentColor": "#6D28D9",
              "blocks": [
                {"type":"stats","items":[
                  {"label":"Artist","value":"ROSE & Bruno Mars"},
                  {"label":"Year","value":"2024"},
                  {"label":"Genre","value":"Pop"}
                ]},
                {"type":"note","text":"Korean-style drinking game song turned global hit."},
                {"type":"steps","style":"bullet","heading":"Verse 1","items":[
                  "Boy, you're making it hard for me",
                  "Every time that I see your face"
                ]},
                {"type":"steps","style":"bullet","heading":"Chorus","items":[
                  "Apartment, apartment, apartment"
                ]}
              ]
            }
          ]
        }
        """.trimIndent()

        val deck = JsonParser.parse(json)
        assertEquals("My Playlist", deck.deckTitle)
        val card = deck.cards[0]
        assertEquals("APT.", card.title)
        assertEquals(4, card.blocks.size)
        // Stats
        val stats = card.blocks[0] as Block.Stats
        assertEquals(3, stats.items.size)
        // Note
        assertTrue(card.blocks[1] is Block.Note)
        // Two steps sections (verse + chorus)
        assertTrue(card.blocks[2] is Block.Steps)
        assertTrue(card.blocks[3] is Block.Steps)
        val chorus = card.blocks[3] as Block.Steps
        assertEquals("Chorus", chorus.heading)
    }

    // ── Deck metadata ─────────────────────────────────────────────────────────

    @Test
    fun `deck with multiple cards parses all cards`() {
        val json = """
        {"deckTitle":"Multi","cards":[
          {"title":"Card 1","blocks":[]},
          {"title":"Card 2","blocks":[]},
          {"title":"Card 3","blocks":[]}
        ]}
        """.trimIndent()
        val deck = JsonParser.parse(json)
        assertEquals(3, deck.cards.size)
        assertEquals("Card 1", deck.cards[0].title)
        assertEquals("Card 3", deck.cards[2].title)
    }

    @Test
    fun `deck with no accentColor has null accent`() {
        val json = """{"deckTitle":"T","cards":[{"title":"C","blocks":[]}]}"""
        assertNotNull(JsonParser.parse(json))
        val deck = JsonParser.parse(json)
        assertTrue(deck.accentColor == null)
    }
}
