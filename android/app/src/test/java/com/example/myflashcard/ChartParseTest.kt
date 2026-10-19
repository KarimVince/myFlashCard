package com.example.myflashcard

import com.example.myflashcard.models.Block
import com.example.myflashcard.ui.chartFraction
import com.example.myflashcard.ui.chartValueLabel
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** Emoji icons and chart blocks (deck format 2.1). */
class ChartParseTest {

    private val json = """{"deckTitle":"Pasta","cards":[{"title":"Carbonara","icon":"🍝","blocks":[
        {"type":"stats","items":[{"label":"Time","value":"20 min","icon":"⏱️"},{"label":"Serves","value":"2"}]},
        {"type":"chart","style":"bar","heading":"Calories","unit":"kcal",
         "items":[{"label":"Pasta","value":350,"icon":"🍝"},{"label":"Cheese","value":175}]},
        {"type":"chart","style":"progress","items":[{"label":"Protein","value":40}]},
        {"type":"chart","style":"progress","max":8,"unit":"h","items":[{"label":"Sleep","value":6.5}]}
    ]}]}"""

    private val card = JsonParser.parse(json).cards[0]

    @Test
    fun `card and stat icons are read`() {
        assertEquals("🍝", card.icon)
        val stats = card.blocks[0] as Block.Stats
        assertEquals("⏱️", stats.items[0].icon)
        assertNull(stats.items[1].icon)
    }

    @Test
    fun `cards without an icon still parse`() {
        val plain = JsonParser.parse("""{"deckTitle":"T","cards":[{"title":"C","blocks":[]}]}""")
        assertNull(plain.cards[0].icon)
    }

    @Test
    fun `bar chart parses and scales to the largest value`() {
        val chart = card.blocks[1] as Block.Chart
        assertEquals("bar", chart.style)
        assertEquals("Calories", chart.heading)
        assertEquals(2, chart.items.size)
        assertEquals("🍝", chart.items[0].icon)
        assertEquals(1f, chartFraction(chart, 350.0), 0.001f)
        assertEquals(0.5f, chartFraction(chart, 175.0), 0.001f)
        assertEquals("350 kcal", chartValueLabel(chart, 350.0))
    }

    @Test
    fun `progress chart reads as a percentage out of 100`() {
        val chart = card.blocks[2] as Block.Chart
        assertNull(chart.max)
        assertEquals(0.4f, chartFraction(chart, 40.0), 0.001f)
        assertEquals("40%", chartValueLabel(chart, 40.0))
    }

    @Test
    fun `progress chart with another max shows out of`() {
        val chart = card.blocks[3] as Block.Chart
        assertEquals(8.0, chart.max!!, 0.0)
        assertEquals("6.5 h / 8", chartValueLabel(chart, 6.5))
        assertEquals(0.8125f, chartFraction(chart, 6.5), 0.001f)
    }
}
