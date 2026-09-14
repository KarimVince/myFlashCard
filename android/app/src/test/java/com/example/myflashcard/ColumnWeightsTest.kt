package com.example.myflashcard

import com.example.myflashcard.models.Block
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * Tests for the optional columnWeights field on Table blocks.
 */
class ColumnWeightsTest {

    private fun tableJson(weightsJson: String?) = """
        {"deckTitle":"T","cards":[{"title":"C","blocks":[
            {"type":"table","columns":["A","B","C"],"rows":[["1","2","3"]]
            ${if (weightsJson != null) ""","columnWeights":$weightsJson""" else ""}
            }
        ]}]}
    """.trimIndent()

    @Test
    fun `three weights parse to correct float list`() {
        val block = JsonParser.parse(tableJson("[0.2,0.5,0.3]")).cards[0].blocks[0] as Block.Table
        val w = block.columnWeights!!
        assertEquals(3, w.size)
        assertEquals(0.2f, w[0], 0.001f)
        assertEquals(0.5f, w[1], 0.001f)
        assertEquals(0.3f, w[2], 0.001f)
    }

    @Test
    fun `two weights for two columns parse correctly`() {
        val json = """{"deckTitle":"T","cards":[{"title":"C","blocks":[
            {"type":"table","columns":["Date","Event"],"rows":[["1939","Start"]],
             "columnWeights":[0.27,0.73]}
        ]}]}"""
        val block = JsonParser.parse(json).cards[0].blocks[0] as Block.Table
        assertEquals(2, block.columnWeights!!.size)
        assertEquals(0.27f, block.columnWeights!![0], 0.001f)
    }

    @Test
    fun `missing columnWeights returns null`() {
        val block = JsonParser.parse(tableJson(null)).cards[0].blocks[0] as Block.Table
        assertNull(block.columnWeights)
    }

    @Test
    fun `empty columnWeights array returns empty list, not null`() {
        // An empty array is distinct from missing — parser returns an empty list
        val block = JsonParser.parse(tableJson("[]")).cards[0].blocks[0] as Block.Table
        // takeIf { it.size == totalCols } in the UI means empty list won't be used as weights;
        // here we just verify the parser itself doesn't crash and returns non-null
        assertEquals(0, block.columnWeights?.size)
    }
}
