package com.example.myflashcard.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.myflashcard.models.Block
import com.example.myflashcard.models.Card
import com.example.myflashcard.models.CardDeck

// ── Card header ────────────────────────────────────────────────────────────────

@Composable
fun CardHeader(card: Card, deckAccent: Color) {
    val titleColor = parseHexColor(card.accentColor) ?: deckAccent
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 6.dp, bottom = 6.dp)
    ) {
        Text(
            text = card.title,
            fontFamily = FontFamily.Serif,
            fontSize = 27.sp,
            lineHeight = 33.sp,
            fontWeight = FontWeight.Normal,
            color = titleColor,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth()
        )
        if (card.subtitle != null) {
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = card.subtitle,
                fontSize = 14.sp,
                color = DimText,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

// ── Note ───────────────────────────────────────────────────────────────────────

@Composable
fun NoteBlock(block: Block.Note, accent: Color) {
    Text(
        text = block.text,
        fontSize = 15.sp,
        lineHeight = 22.sp,
        fontWeight = FontWeight.SemiBold,
        color = accent,
        textAlign = TextAlign.Center,
        modifier = Modifier.fillMaxWidth()
    )
}

// ── Stats ──────────────────────────────────────────────────────────────────────

@Composable
fun StatsBlock(block: Block.Stats) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        block.items.forEachIndexed { index, item ->
            val tileBg = StatTileColors[index % StatTileColors.size]
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .weight(1f)
                    .background(tileBg, RoundedCornerShape(10.dp))
                    .padding(vertical = 10.dp, horizontal = 8.dp)
            ) {
                Text(
                    text = item.value,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = PrimaryText,
                    textAlign = TextAlign.Center
                )
                Text(
                    text = item.label,
                    fontSize = 11.sp,
                    color = DimText,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(top = 2.dp)
                )
            }
        }
    }
}

// ── Steps (bullet or numbered) ─────────────────────────────────────────────────

@Composable
fun StepsBlock(block: Block.Steps, accent: Color) {
    Column(modifier = Modifier.fillMaxWidth()) {
        if (block.heading != null) {
            BlockHeading(text = block.heading, accent = accent)
        }
        block.items.forEachIndexed { index, item ->
            Row(
                verticalAlignment = Alignment.Top,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp)
            ) {
                // Badge: filled circle with number, or solid bullet dot
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .padding(top = 3.dp)
                        .size(24.dp)
                ) {
                    if (block.style == "number") {
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier
                                .size(24.dp)
                                .background(color = accent, shape = CircleShape)
                        ) {
                            Text(
                                text = "${index + 1}",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                textAlign = TextAlign.Center
                            )
                        }
                    } else {
                        // Bullet — slightly larger and accent-coloured for visibility
                        Box(
                            modifier = Modifier
                                .size(7.dp)
                                .background(color = accent, shape = CircleShape)
                        )
                    }
                }

                Spacer(modifier = Modifier.width(10.dp))

                Text(
                    text = item,
                    fontSize = 16.sp,
                    lineHeight = 23.sp,
                    color = PrimaryText,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

// ── Table ──────────────────────────────────────────────────────────────────────

@Composable
fun TableBlock(block: Block.Table, accent: Color) {
    val stripeTint  = blendTowardWhite(accent, 0.78f)
    val totalCols   = block.columns.size

    // Narrow fixed width ONLY when the first column is the index "#".
    // All other tables give every column equal space via weight(1f).
    val indexColumn = totalCols > 1 && block.columns.firstOrNull()?.trim() == "#"
    val indexWidth  = 36.dp

    Column(modifier = Modifier.fillMaxWidth()) {

        // ── Heading sits ABOVE the table border ──────────────────────────────
        if (block.heading != null) {
            BlockHeading(text = block.heading, accent = accent)
        }

        // ── Table with rounded border ─────────────────────────────────────────
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(10.dp))
                .border(width = 1.dp, color = DividerColor, shape = RoundedCornerShape(10.dp))
        ) {
            // Header row
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .background(accent)
                    .padding(horizontal = 10.dp, vertical = 8.dp)
            ) {
                block.columns.forEachIndexed { colIdx, col ->
                    val isIdx = indexColumn && colIdx == 0
                    val mod   = if (isIdx) Modifier.width(indexWidth) else Modifier.weight(1f)
                    Text(
                        text       = col,
                        fontSize   = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        color      = Color.White,
                        textAlign  = if (isIdx) TextAlign.Center else TextAlign.Start,
                        modifier   = mod
                    )
                }
            }

            // Data rows — alternating stripe tint
            block.rows.forEachIndexed { rowIdx, row ->
                val bg = if (rowIdx % 2 == 0) Color.Transparent else stripeTint
                Row(
                    verticalAlignment = Alignment.Top,
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(bg)
                        .padding(horizontal = 10.dp, vertical = 8.dp)
                ) {
                    row.forEachIndexed { colIdx, cell ->
                        val isIdx = indexColumn && colIdx == 0
                        val mod   = if (isIdx) Modifier.width(indexWidth) else Modifier.weight(1f)
                        Text(
                            text       = cell,
                            fontSize   = 15.sp,
                            lineHeight = 21.sp,
                            fontWeight = if (isIdx) FontWeight.SemiBold else FontWeight.Normal,
                            color      = if (isIdx) accent else PrimaryText,
                            textAlign  = if (isIdx) TextAlign.Center else TextAlign.Start,
                            modifier   = mod
                        )
                    }
                }
                if (rowIdx < block.rows.lastIndex) {
                    HorizontalDivider(thickness = 0.5.dp, color = DividerColor)
                }
            }
        }
    }
}

// ── Plain text / detail section ────────────────────────────────────────────────

@Composable
fun TextBlockView(block: Block.TextBlock, accent: Color) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(6.dp))
            .background(DividerColor.copy(alpha = 0.25f))
    ) {
        // Left accent bar
        Box(
            modifier = Modifier
                .width(4.dp)
                .fillMaxHeight()
                .background(accent)
        )
        Text(
            text       = block.text,
            fontSize   = 15.sp,
            lineHeight = 23.sp,
            color      = PrimaryText,
            modifier   = Modifier
                .weight(1f)
                .padding(horizontal = 12.dp, vertical = 10.dp)
        )
    }
}

// ── Image placeholder ──────────────────────────────────────────────────────────

@Composable
fun ImageBlockView(block: Block.Image) {
    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(16f / 10f)
            .clip(RoundedCornerShape(10.dp))
            .background(DividerColor)
            .border(width = 1.dp, color = DividerColor, shape = RoundedCornerShape(10.dp))
    ) {
        Text(text = "Image", fontSize = 13.sp, color = DimText)
    }
}

// ── Section heading (shared by Table and Steps) ────────────────────────────────

@Composable
fun BlockHeading(
    text: String,
    accent: Color,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = text,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            color = accent,
            letterSpacing = 0.3.sp
        )
        HorizontalDivider(
            thickness = 1.dp,
            color = DividerColor,
            modifier = Modifier.padding(top = 4.dp, bottom = 8.dp)
        )
    }
}

// ── Block dispatcher ───────────────────────────────────────────────────────────

@Composable
fun BlockView(block: Block, card: Card, deck: CardDeck) {
    val accent = resolveAccent(block, card, deck)
    Box(modifier = Modifier.padding(bottom = 22.dp)) {
        when (block) {
            is Block.Note      -> NoteBlock(block, accent)
            is Block.Stats     -> StatsBlock(block)
            is Block.Steps     -> StepsBlock(block, accent)
            is Block.Table     -> TableBlock(block, accent)
            is Block.TextBlock -> TextBlockView(block, accent)
            is Block.Image     -> ImageBlockView(block)
        }
    }
}
