package com.example.myflashcard.models

data class DeckMeta(
    val id: Int,
    val title: String,
    val description: String?,
    val author: String?,
    val language: String,
    val cardCount: Int?,
    val publicUrl: String,
    val downloads: Int,
    val categorySlug: String,
    val categoryLabel: String,
)
