package com.example.myflashcard.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

// Fixed warm-cream palette — no dynamic color, no dark mode override.
// The app has its own explicit color system so we lock it to light here.
private val FlashCardColorScheme = lightColorScheme(
    primary          = AccentBrick,
    onPrimary        = CardWhite,
    secondary        = TextDim,
    onSecondary      = CardWhite,
    background       = AppBg,
    onBackground     = TextPrimary,
    surface          = CardWhite,
    onSurface        = TextPrimary,
    outline          = Divider
)

@Composable
fun MyFlashCardTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = FlashCardColorScheme,
        typography  = Typography,
        content     = content
    )
}
