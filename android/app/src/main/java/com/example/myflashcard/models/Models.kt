package com.example.myflashcard.models

data class CardDeck(
    val deckTitle: String,
    val accentColor: String?,
    val cards: List<Card>
)

data class Card(
    val title: String,
    val subtitle: String?,
    val accentColor: String?,
    val blocks: List<Block>,
    val icon: String? = null          // one emoji shown before the title
)

data class StatItem(val label: String, val value: String, val icon: String? = null)

data class ChartItem(val label: String, val value: Double, val icon: String? = null)

sealed class Block {
    data class Note(
        val text: String,
        val accentColor: String?
    ) : Block()

    data class Stats(
        val items: List<StatItem>
    ) : Block()

    data class Steps(
        val heading: String?,
        val style: String,          // "bullet" or "number"
        val accentColor: String?,
        val items: List<String>
    ) : Block()

    data class Table(
        val heading: String?,
        val accentColor: String?,
        val columns: List<String>,
        val rows: List<List<String>>,
        val columnWeights: List<Float>? = null   // optional relative widths, e.g. [0.3, 0.7]
    ) : Block()

    /** Horizontal bars: "bar" scales to the largest value; "progress" is each value out of [max] (default 100). */
    data class Chart(
        val style: String,
        val heading: String?,
        val unit: String?,
        val max: Double?,
        val accentColor: String?,
        val items: List<ChartItem>
    ) : Block()

    data class TextBlock(val text: String) : Block()

    data class Image(val url: String?) : Block()
}
