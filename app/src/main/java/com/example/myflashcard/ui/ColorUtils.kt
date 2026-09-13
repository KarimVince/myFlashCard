package com.example.myflashcard.ui

import androidx.compose.ui.graphics.Color
import com.example.myflashcard.models.Block
import com.example.myflashcard.models.Card
import com.example.myflashcard.models.CardDeck

// ── Design tokens ──────────────────────────────────────────────────────────────
val AppBackground   = Color(0xFFF6F1E8)
val CardSurface     = Color(0xFFFFFFFF)
val PrimaryText     = Color(0xFF2B2620)
val DimText         = Color(0xFF8A8175)
val DividerColor    = Color(0xFFE4DCCC)
val DefaultAccent   = Color(0xFFA6543C)
val StatTileBg      = Color(0xFFDFF2ED)   // light teal — consistent across all stat blocks

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Parse a #RRGGBB hex string to a Compose Color, returning null on any failure. */
fun parseHexColor(hex: String?): Color? {
    if (hex.isNullOrBlank()) return null
    return try {
        val normalized = if (hex.startsWith("#")) hex else "#$hex"
        Color(android.graphics.Color.parseColor(normalized))
    } catch (_: Exception) {
        null
    }
}

/**
 * Blend a color toward white using a linear RGB blend (no alpha – avoids hue
 * shift on non-white backgrounds that alpha transparency would cause).
 *
 * result_channel = channel + (255 − channel) × factor
 * Default factor 0.78 matches the HTML prototype stripe tint.
 */
fun blendTowardWhite(color: Color, factor: Float = 0.78f): Color = Color(
    red   = color.red   + (1f - color.red)   * factor,
    green = color.green + (1f - color.green) * factor,
    blue  = color.blue  + (1f - color.blue)  * factor,
    alpha = 1f
)

/**
 * Resolve the effective accent Color for a block, walking up the hierarchy:
 *   block.accentColor → card.accentColor → deck.accentColor → DefaultAccent
 */
fun resolveAccent(
    blockHex: String?,
    card: Card,
    deck: CardDeck
): Color =
    parseHexColor(blockHex)
        ?: parseHexColor(card.accentColor)
        ?: parseHexColor(deck.accentColor)
        ?: DefaultAccent

/** Resolve accent for a block that carries its own optional accentColor field. */
fun resolveAccent(block: Block, card: Card, deck: CardDeck): Color {
    val blockHex = when (block) {
        is Block.Note  -> block.accentColor
        is Block.Steps -> block.accentColor
        is Block.Table -> block.accentColor
        else           -> null
    }
    return resolveAccent(blockHex, card, deck)
}
