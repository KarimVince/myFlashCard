package com.example.myflashcard

import com.example.myflashcard.models.Block
import com.example.myflashcard.models.StatItem
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for JsonParser — each block type, field mapping, and null/optional handling.
 * Run with: ./gradlew test
 */
class JsonParserTest {

    // ── Note block ────────────────────────────────────────────────────────────

    @Test
    fun `note block parses text correctly`() {
        val json = """{"deckTitle":"T","accentColor":"#AA0000","cards":[{"title":"C","blocks":[
            {"type":"note","text":"Hello world"}
        ]}]}"""
        val deck = JsonParser.parse(json)
        val block = deck.cards[0].blocks[0] as Block.Note
        assertEquals("Hello world", block.text)
    }

    @Test
    fun `note block with accent color parses correctly`() {
        val json = """{"deckTitle":"T","cards":[{"title":"C","blocks":[
            {"type":"note","text":"Hi","accentColor":"#FF5500"}
        ]}]}"""
        val block = JsonParser.parse(json).cards[0].blocks[0] as Block.Note
        assertEquals("#FF5500", block.accentColor)
    }

    @Test
    fun `note block with no accent color returns null`() {
        val json = """{"deckTitle":"T","cards":[{"title":"C","blocks":[
            {"type":"note","text":"Hi"}
        ]}]}"""
        val block = JsonParser.parse(json).cards[0].blocks[0] as Block.Note
        assertNull(block.accentColor)
    }

    // ── Stats block ───────────────────────────────────────────────────────────

    @Test
    fun `stats block parses all items`() {
        val json = """{"deckTitle":"T","cards":[{"title":"C","blocks":[
            {"type":"stats","items":[
                {"label":"Time","value":"30 min"},
                {"label":"Serves","value":"4"},
                {"label":"Cal","value":"350"}
            ]}
        ]}]}"""
        val block = JsonParser.parse(json).cards[0].blocks[0] as Block.Stats
        assertEquals(3, block.items.size)
        assertEquals(StatItem("Time", "30 min"), block.items[0])
        assertEquals(StatItem("Serves", "4"),    block.items[1])
        assertEquals(StatItem("Cal", "350"),     block.items[2])
    }

    // ── Steps block ───────────────────────────────────────────────────────────

    @Test
    fun `steps block parses bullet style`() {
        val json = """{"deckTitle":"T","cards":[{"title":"C","blocks":[
            {"type":"steps","style":"bullet","items":["Step one","Step two"]}
        ]}]}"""
        val block = JsonParser.parse(json).cards[0].blocks[0] as Block.Steps
        assertEquals("bullet", block.style)
        assertEquals(listOf("Step one", "Step two"), block.items)
        assertNull(block.heading)
    }

    @Test
    fun `steps block parses number style with heading`() {
        val json = """{"deckTitle":"T","cards":[{"title":"C","blocks":[
            {"type":"steps","style":"number","heading":"Method","items":["Mix","Bake"]}
        ]}]}"""
        val block = JsonParser.parse(json).cards[0].blocks[0] as Block.Steps
        assertEquals("number", block.style)
        assertEquals("Method", block.heading)
    }

    @Test
    fun `steps block missing style defaults to bullet`() {
        val json = """{"deckTitle":"T","cards":[{"title":"C","blocks":[
            {"type":"steps","items":["A"]}
        ]}]}"""
        val block = JsonParser.parse(json).cards[0].blocks[0] as Block.Steps
        assertEquals("bullet", block.style)
    }

    // ── Table block ───────────────────────────────────────────────────────────

    @Test
    fun `table block parses columns and rows`() {
        val json = """{"deckTitle":"T","cards":[{"title":"C","blocks":[
            {"type":"table","columns":["Date","Event"],
             "rows":[["1939","WW2 starts"],["1945","WW2 ends"]]}
        ]}]}"""
        val block = JsonParser.parse(json).cards[0].blocks[0] as Block.Table
        assertEquals(listOf("Date", "Event"), block.columns)
        assertEquals(2, block.rows.size)
        assertEquals(listOf("1939", "WW2 starts"), block.rows[0])
    }

    @Test
    fun `table block parses optional columnWeights`() {
        val json = """{"deckTitle":"T","cards":[{"title":"C","blocks":[
            {"type":"table","columns":["Date","Event"],
             "rows":[["1939","Starts"]],
             "columnWeights":[0.27,0.73]}
        ]}]}"""
        val block = JsonParser.parse(json).cards[0].blocks[0] as Block.Table
        assertNotNull(block.columnWeights)
        assertEquals(2, block.columnWeights!!.size)
        assertEquals(0.27f, block.columnWeights!![0], 0.001f)
        assertEquals(0.73f, block.columnWeights!![1], 0.001f)
    }

    @Test
    fun `table block without columnWeights returns null`() {
        val json = """{"deckTitle":"T","cards":[{"title":"C","blocks":[
            {"type":"table","columns":["A","B"],"rows":[["x","y"]]}
        ]}]}"""
        val block = JsonParser.parse(json).cards[0].blocks[0] as Block.Table
        assertNull(block.columnWeights)
    }

    // ── TextBlock ─────────────────────────────────────────────────────────────

    @Test
    fun `text block parses correctly`() {
        val json = """{"deckTitle":"T","cards":[{"title":"C","blocks":[
            {"type":"text","text":"Some detail paragraph."}
        ]}]}"""
        val block = JsonParser.parse(json).cards[0].blocks[0] as Block.TextBlock
        assertEquals("Some detail paragraph.", block.text)
    }

    // ── Image block ───────────────────────────────────────────────────────────

    @Test
    fun `image block with url parses correctly`() {
        val json = """{"deckTitle":"T","cards":[{"title":"C","blocks":[
            {"type":"image","url":"https://example.com/img.jpg"}
        ]}]}"""
        val block = JsonParser.parse(json).cards[0].blocks[0] as Block.Image
        assertEquals("https://example.com/img.jpg", block.url)
    }

    @Test
    fun `image block with no url returns null`() {
        val json = """{"deckTitle":"T","cards":[{"title":"C","blocks":[
            {"type":"image"}
        ]}]}"""
        val block = JsonParser.parse(json).cards[0].blocks[0] as Block.Image
        assertNull(block.url)
    }

    // ── Unknown block ─────────────────────────────────────────────────────────

    @Test
    fun `unknown block type returns TextBlock with error message`() {
        val json = """{"deckTitle":"T","cards":[{"title":"C","blocks":[
            {"type":"foobar","text":"whatever"}
        ]}]}"""
        val block = JsonParser.parse(json).cards[0].blocks[0] as Block.TextBlock
        assertTrue(block.text.contains("foobar"))
    }
}
