package com.example.myflashcard.ui

/**
 * Column widths for a table when the deck doesn't set "columnWeights".
 *
 * Each column gets a weight from its content: enough for its header and its longest word
 * (so short columns like "Fa'an" holding "1"–"13" stay narrow), growing with the longest
 * cell but capped, so one very long column can't squeeze the others into one word per line.
 */
object TableLayout {

    /** Upper bound for a column's weight, in characters — longer text wraps. */
    const val MAX_WEIGHT = 28f

    /** Lower bound, so a column of single digits still has room to breathe. */
    const val MIN_WEIGHT = 3f

    fun autoColumnWeights(columns: List<String>, rows: List<List<String>>): List<Float> =
        columns.indices.map { col ->
            val cells = listOf(columns[col]) + rows.mapNotNull { it.getOrNull(col) }
            val longest = cells.maxOf { it.trim().length }
            // The longest single word must fit on one line (a word can't wrap).
            val longestWord = cells.maxOf { cell -> cell.split(Regex("\\s+")).maxOf { it.length } }
            maxOf(longestWord + 1f, minOf(longest.toFloat(), MAX_WEIGHT), MIN_WEIGHT)
        }
}
