package com.example.myflashcard

import com.example.myflashcard.ui.TableLayout
import org.junit.Assert.*
import org.junit.Test

class TableLayoutTest {

    // From the HK Mahjong deck: the Fa'an column only holds small numbers.
    private val columns = listOf("Pattern", "Fa'an", "Description")
    private val rows = listOf(
        listOf("Chicken Hand", "0", "Melds are a mixture of Pong and Chow"),
        listOf("Right Flower", "1", "Floral tile number matches your seat position (East=1, South=2, West=3, North=4)"),
        listOf("Great Dragons", "8", "Melds of all 3 dragons"),
        listOf("Thirteen Orphans", "13", "One of each suit's One and Nine + one of each wind and dragon"),
    )

    @Test fun shortNumberColumnStaysNarrow() {
        val (pattern, faan, description) = TableLayout.autoColumnWeights(columns, rows)
        // "Fa'an" gets just its header plus a little room, far less than a third of the table.
        assertEquals(6f, faan, 0.001f)
        assertTrue(faan / (pattern + faan + description) < 0.15f)
        assertTrue(description > pattern)
    }

    @Test fun longTextIsCappedSoOtherColumnsKeepRoom() {
        val weights = TableLayout.autoColumnWeights(columns, rows)
        assertEquals(TableLayout.MAX_WEIGHT, weights[2], 0.001f)
    }

    @Test fun longestWordAlwaysFits() {
        val w = TableLayout.autoColumnWeights(listOf("A", "B"), listOf(listOf("x", "Antidisestablishmentarianism")))
        assertEquals("Antidisestablishmentarianism".length + 1f, w[1], 0.001f)
    }

    @Test fun tinyColumnsHaveAMinimum() {
        val w = TableLayout.autoColumnWeights(listOf("#", "Name"), listOf(listOf("1", "Alice")))
        assertEquals(TableLayout.MIN_WEIGHT, w[0], 0.001f)
    }

    @Test fun rowsShorterThanTheHeaderDontCrash() {
        val w = TableLayout.autoColumnWeights(listOf("A", "B", "C"), listOf(listOf("only one")))
        assertEquals(3, w.size)
    }
}
