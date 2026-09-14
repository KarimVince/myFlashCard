package com.example.myflashcard

import com.example.myflashcard.models.Block
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * Tests that accent color falls back correctly through card → deck hierarchy.
 */
class AccentColorTest {

    @Test
    fun `deck accent color is parsed`() {
        val json = """{"deckTitle":"T","accentColor":"#AA0000","cards":[
            {"title":"C","blocks":[]}
        ]}"""
        val deck = JsonParser.parse(json)
        assertEquals("#AA0000", deck.accentColor)
    }

    @Test
    fun `card accent color overrides deck accent`() {
        val json = """{"deckTitle":"T","accentColor":"#AA0000","cards":[
            {"title":"C","accentColor":"#0055FF","blocks":[]}
        ]}"""
        val deck = JsonParser.parse(json)
        // Card has its own accent — it is stored and expected to override deck-level
        assertEquals("#0055FF", deck.cards[0].accentColor)
        assertEquals("#AA0000", deck.accentColor)
    }

    @Test
    fun `null card accent returns null so deck accent is used by UI`() {
        val json = """{"deckTitle":"T","accentColor":"#AA0000","cards":[
            {"title":"C","blocks":[]}
        ]}"""
        val deck = JsonParser.parse(json)
        assertNull(deck.cards[0].accentColor)
        // UI resolves: card.accentColor ?: deck.accentColor
        val resolved = deck.cards[0].accentColor ?: deck.accentColor
        assertEquals("#AA0000", resolved)
    }

    @Test
    fun `blank accent color string is treated as null`() {
        val json = """{"deckTitle":"T","accentColor":"","cards":[
            {"title":"C","accentColor":"  ","blocks":[]}
        ]}"""
        val deck = JsonParser.parse(json)
        assertNull(deck.accentColor)
        assertNull(deck.cards[0].accentColor)
    }

    @Test
    fun `note block accent overrides card accent`() {
        val json = """{"deckTitle":"T","accentColor":"#AA0000","cards":[
            {"title":"C","accentColor":"#0055FF","blocks":[
                {"type":"note","text":"Hi","accentColor":"#00CC88"}
            ]}
        ]}"""
        val block = JsonParser.parse(json).cards[0].blocks[0] as Block.Note
        assertEquals("#00CC88", block.accentColor)
    }

    @Test
    fun `null note accent resolves to card then deck`() {
        val json = """{"deckTitle":"T","accentColor":"#AA0000","cards":[
            {"title":"C","accentColor":"#0055FF","blocks":[
                {"type":"note","text":"Hi"}
            ]}
        ]}"""
        val deck = JsonParser.parse(json)
        val block = deck.cards[0].blocks[0] as Block.Note
        assertNull(block.accentColor)
        // UI chain: block.accentColor ?: card.accentColor ?: deck.accentColor
        val resolved = block.accentColor
            ?: deck.cards[0].accentColor
            ?: deck.accentColor
        assertEquals("#0055FF", resolved)
    }
}
