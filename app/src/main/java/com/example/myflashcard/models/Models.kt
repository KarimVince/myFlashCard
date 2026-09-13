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
    val blocks: List<Block>
)

data class StatItem(val label: String, val value: String)

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
        val rows: List<List<String>>
    ) : Block()

    data class TextBlock(val text: String) : Block()

    data class Image(val url: String?) : Block()
}
