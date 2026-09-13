package com.example.myflashcard.ui

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.draggable
import androidx.compose.foundation.gestures.rememberDraggableState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.myflashcard.models.CardDeck

private const val SWIPE_THRESHOLD = 80f   // px – tune if needed
private const val ANIM_DURATION   = 170   // ms

@Composable
fun ViewerScreen(
    deck: CardDeck,
    onBack: () -> Unit
) {
    val total = deck.cards.size
    var currentIndex by remember { mutableIntStateOf(0) }
    var dragAccum     by remember { mutableFloatStateOf(0f) }
    var dragNavigated by remember { mutableStateOf(false) }

    val deckAccent = parseHexColor(deck.accentColor) ?: DefaultAccent

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppBackground)
    ) {
        // ── Top bar ───────────────────────────────────────────────────────────
        TopBar(
            deckTitle = deck.deckTitle,
            current   = currentIndex + 1,
            total     = total,
            onBack    = onBack
        )

        // ── Card area (swipeable) ─────────────────────────────────────────────
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .draggable(
                    orientation = Orientation.Horizontal,
                    state = rememberDraggableState { delta ->
                        if (!dragNavigated) {
                            dragAccum += delta
                            if (dragAccum < -SWIPE_THRESHOLD && currentIndex < total - 1) {
                                dragNavigated = true
                                currentIndex++
                            } else if (dragAccum > SWIPE_THRESHOLD && currentIndex > 0) {
                                dragNavigated = true
                                currentIndex--
                            }
                        }
                    },
                    onDragStarted  = { dragAccum = 0f; dragNavigated = false },
                    onDragStopped  = { dragAccum = 0f }
                )
        ) {
            AnimatedContent(
                targetState = currentIndex,
                transitionSpec = {
                    val forward = targetState > initialState
                    val slide = if (forward) 48 else -48   // px offset (small = snappy)
                    (slideInHorizontally(tween(ANIM_DURATION)) { slide } +
                     fadeIn(tween(ANIM_DURATION))) togetherWith
                    (slideOutHorizontally(tween(ANIM_DURATION)) { -slide } +
                     fadeOut(tween(ANIM_DURATION)))
                },
                label = "cardTransition"
            ) { idx ->
                val card       = deck.cards[idx]
                val scrollState = rememberScrollState()

                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(scrollState)
                        .padding(horizontal = 22.dp, vertical = 8.dp)
                ) {
                    CardHeader(card = card, deckAccent = deckAccent)
                    Spacer(modifier = Modifier.height(14.dp))

                    card.blocks.forEach { block ->
                        BlockView(block = block, card = card, deck = deck)
                    }

                    // Bottom breathing room so last block clears the nav bar
                    Spacer(modifier = Modifier.height(8.dp))
                }
            }
        }

        // ── Bottom nav bar ────────────────────────────────────────────────────
        BottomBar(
            currentIndex = currentIndex,
            total        = total,
            onPrev       = { if (currentIndex > 0) currentIndex-- },
            onNext       = { if (currentIndex < total - 1) currentIndex++ }
        )
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Top bar
// ─────────────────────────────────────────────────────────────────────────────

@Composable
private fun TopBar(
    deckTitle: String,
    current: Int,
    total: Int,
    onBack: () -> Unit
) {
    Column {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 14.dp, end = 22.dp, top = 18.dp, bottom = 10.dp)
        ) {
            // Back / deck title
            TextButton(
                onClick = onBack,
                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                colors = ButtonDefaults.textButtonColors(contentColor = DimText)
            ) {
                Text(
                    text = "← $deckTitle",
                    fontSize = 13.sp,
                    color = DimText,
                    maxLines = 1
                )
            }

            Spacer(modifier = Modifier.weight(1f))

            // Progress counter
            Text(
                text = "$current / $total",
                fontSize = 13.sp,
                color = DimText
            )
        }
        HorizontalDivider(color = DividerColor, thickness = 1.dp)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bottom bar
// ─────────────────────────────────────────────────────────────────────────────

@Composable
private fun BottomBar(
    currentIndex: Int,
    total: Int,
    onPrev: () -> Unit,
    onNext: () -> Unit
) {
    Column {
        HorizontalDivider(color = DividerColor, thickness = 1.dp)
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) {
            // Prev button
            NavButton(
                label   = "Prev",
                enabled = currentIndex > 0,
                onClick = onPrev
            )

            // Progress dots (shows when total ≤ 12, otherwise a thin progress bar)
            if (total <= 12) {
                ProgressDots(current = currentIndex, total = total)
            } else {
                ProgressBar(current = currentIndex, total = total)
            }

            // Next button
            NavButton(
                label   = "Next",
                enabled = currentIndex < total - 1,
                onClick = onNext
            )
        }
    }
}

@Composable
private fun NavButton(label: String, enabled: Boolean, onClick: () -> Unit) {
    TextButton(
        onClick  = onClick,
        enabled  = enabled,
        shape    = RoundedCornerShape(8.dp),
        colors   = ButtonDefaults.textButtonColors(
            contentColor        = DefaultAccent,
            disabledContentColor = DividerColor
        ),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
    ) {
        Text(text = label, fontSize = 15.sp, fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun ProgressDots(current: Int, total: Int) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        repeat(total) { i ->
            val isActive = i == current
            Box(
                modifier = Modifier
                    .size(if (isActive) 8.dp else 6.dp)
                    .clip(CircleShape)
                    .background(
                        if (isActive) DefaultAccent
                        else DividerColor
                    )
            )
        }
    }
}

@Composable
private fun ProgressBar(current: Int, total: Int) {
    val fraction = if (total > 1) current.toFloat() / (total - 1).toFloat() else 1f
    Box(
        modifier = Modifier
            .width(120.dp)
            .height(4.dp)
            .clip(RoundedCornerShape(2.dp))
            .background(DividerColor)
    ) {
        Box(
            modifier = Modifier
                .fillMaxHeight()
                .fillMaxWidth(fraction)
                .background(DefaultAccent)
        )
    }
}
