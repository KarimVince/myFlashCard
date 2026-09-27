package com.example.myflashcard

import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.myflashcard.models.CardDeck
import com.example.myflashcard.ui.*
import com.example.myflashcard.ui.CardSurface
import com.example.myflashcard.ui.DefaultAccent
import com.example.myflashcard.ui.DimText
import com.example.myflashcard.ui.DividerColor
import com.example.myflashcard.ui.PrimaryText
import com.example.myflashcard.ui.theme.MyFlashCardTheme

// ── App navigation states ──────────────────────────────────────────────────────

private sealed class Screen {
    data object Home   : Screen()
    data class  Viewer(val deck: CardDeck) : Screen()
}

private enum class Tab { MY_DECKS, LIBRARY, MY_OWN }

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
    var screen       by remember { mutableStateOf<Screen>(Screen.Home) }
    var activeTab    by remember { mutableStateOf(Tab.MY_DECKS) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    // File picker launcher
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
        is Screen.Viewer -> ViewerScreen(
            deck   = s.deck,
            onBack = {
                errorMessage = null
                screen = Screen.Home
            },
        )
        is Screen.Home -> Column(Modifier.fillMaxSize()) {
            // ── Top header + tabs ─────────────────────────────────────────
            AppHeader()
            AppTabBar(
                active = activeTab,
                onSelect = { tab ->
                    activeTab = tab
                    if (tab != Tab.MY_DECKS) errorMessage = null
                },
            )

            // ── Tab content ───────────────────────────────────────────────
            Box(Modifier.weight(1f)) {
                when (activeTab) {
                    Tab.MY_DECKS -> MyDecksScreen(
                        onOpenDeck   = { deck -> screen = Screen.Viewer(deck) },
                        errorMessage = errorMessage,
                    )
                    Tab.LIBRARY  -> LibraryScreen(
                        onOpenDeck = { deck -> screen = Screen.Viewer(deck) },
                    )
                    Tab.MY_OWN   -> MyOwnScreen(
                        onLoadFile   = { fileLauncher.launch("application/json") },
                        errorMessage = errorMessage,
                    )
                }
            }
        }
    }
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

@Composable
private fun AppTabBar(active: Tab, onSelect: (Tab) -> Unit) {
    HorizontalDivider(thickness = 1.dp, color = DividerColor)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(CardSurface)
            .height(56.dp),
    ) {
        Tab.entries.forEach { tab ->
            val isActive = tab == active
            val tabColor = when (tab) {
                Tab.MY_DECKS -> Color(0xFF4CAF82)  // light green
                Tab.LIBRARY  -> Color(0xFF4A90D9)  // light blue
                Tab.MY_OWN   -> Color(0xFFE05C5C)  // light red
            }
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .background(if (isActive) tabColor.copy(alpha = 0.12f) else Color.Transparent)
                    .clickable { onSelect(tab) },
                contentAlignment = Alignment.Center,
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    Text(
                        text = when (tab) {
                            Tab.MY_DECKS -> "My Decks"
                            Tab.LIBRARY  -> "Library"
                            Tab.MY_OWN   -> "Do My Own"
                        },
                        fontSize = 13.sp,
                        fontWeight = if (isActive) FontWeight.SemiBold else FontWeight.Normal,
                        color = if (isActive) tabColor else DimText,
                    )
                    if (isActive) {
                        Spacer(Modifier.height(3.dp))
                        Box(
                            Modifier
                                .width(28.dp)
                                .height(2.dp)
                                .background(tabColor, RoundedCornerShape(1.dp))
                        )
                    }
                }
            }
        }
    }
}

// ── Shared app header ─────────────────────────────────────────────────────────

@Composable
private fun AppHeader() {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .background(CardSurface)
            .padding(horizontal = 20.dp, vertical = 14.dp)
    ) {
        Image(
            painter = painterResource(id = R.drawable.app_logo),
            contentDescription = "myFlashCard",
            modifier = Modifier
                .size(38.dp)
                .clip(RoundedCornerShape(10.dp))
        )
        Spacer(Modifier.width(12.dp))
        Text(
            text = "myFlashCard",
            fontFamily = FontFamily.Serif,
            fontWeight = FontWeight.Bold,
            fontSize = 22.sp,
            color = PrimaryText,
        )
    }
    HorizontalDivider(thickness = 1.dp, color = DividerColor)
}
