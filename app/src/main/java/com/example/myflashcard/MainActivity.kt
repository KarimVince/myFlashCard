package com.example.myflashcard

import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.Box
import androidx.compose.ui.platform.LocalContext
import com.example.myflashcard.models.CardDeck
import com.example.myflashcard.ui.PickerScreen
import com.example.myflashcard.ui.ViewerScreen
import com.example.myflashcard.ui.theme.MyFlashCardTheme

// ── App screen states ──────────────────────────────────────────────────────────

private sealed class Screen {
    data object Picker : Screen()
    data class  Viewer(val deck: CardDeck) : Screen()
}

// ── Activity ──────────────────────────────────────────────────────────────────

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MyFlashCardTheme {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .safeDrawingPadding()
                ) {
                    FlashCardApp()
                }
            }
        }
    }
}

// ── Root composable ───────────────────────────────────────────────────────────

@Composable
private fun FlashCardApp() {
    val context = LocalContext.current
    var screen       by remember { mutableStateOf<Screen>(Screen.Picker) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    // File picker launcher — requests any JSON file from the device storage
    val fileLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri ?: return@rememberLauncherForActivityResult
        try {
            val stream = context.contentResolver.openInputStream(uri)
                ?: error("Could not open file")
            val json = stream.bufferedReader().use { it.readText() }
            val deck = JsonParser.parse(json)
            if (deck.cards.isEmpty()) error("No cards found in the file")
            errorMessage = null
            screen = Screen.Viewer(deck)
        } catch (e: Exception) {
            errorMessage = "Could not load file: ${e.message ?: "unknown error"}"
        }
    }

    when (val s = screen) {
        is Screen.Picker -> PickerScreen(
            onLoadFile   = { fileLauncher.launch("application/json") },
            errorMessage = errorMessage
        )
        is Screen.Viewer -> ViewerScreen(
            deck   = s.deck,
            onBack = {
                errorMessage = null
                screen = Screen.Picker
            }
        )
    }
}
