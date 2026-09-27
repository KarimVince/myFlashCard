package com.example.myflashcard.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.myflashcard.DeckStorage
import com.example.myflashcard.JsonParser
import com.example.myflashcard.models.CardDeck
import java.io.File

@Composable
fun MyDecksScreen(
    onOpenDeck: (CardDeck) -> Unit,
    errorMessage: String?,
) {
    val context = LocalContext.current
    var localDecks by remember { mutableStateOf<List<File>>(emptyList()) }
    var deleteCandidate by remember { mutableStateOf<File?>(null) }
    var loadError by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) { localDecks = DeckStorage.listDecks(context) }

    fun refresh() { localDecks = DeckStorage.listDecks(context) }

    fun openFile(file: File) {
        try {
            val deck = JsonParser.parse(file.readText())
            if (deck.cards.isEmpty()) error("No cards found")
            loadError = null
            onOpenDeck(deck)
        } catch (e: Exception) {
            loadError = "Could not open deck: ${e.message}"
        }
    }

    Column(Modifier.fillMaxSize().background(AppBackground)) {

        val err = loadError ?: errorMessage
        if (err != null) {
            Text(
                text = err,
                fontSize = 14.sp,
                color = Color(0xFFB22222),
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFFB22222).copy(alpha = 0.09f))
                    .padding(horizontal = 20.dp, vertical = 10.dp)
            )
        }

        if (localDecks.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(
                    text = "No decks yet.\nBrowse the Library or load a file from My Own.",
                    fontSize = 15.sp,
                    color = DimText,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(32.dp),
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(localDecks, key = { it.path }) { file ->
                    LocalDeckCard(
                        file = file,
                        onClick = { openFile(file) },
                        onDelete = { deleteCandidate = file },
                    )
                }
            }
        }
    }

    // ── Delete confirmation dialog ────────────────────────────────────────
    if (deleteCandidate != null) {
        AlertDialog(
            onDismissRequest = { deleteCandidate = null },
            title = { Text("Delete deck?") },
            text = { Text("\"${DeckStorage.displayName(deleteCandidate!!)}\" will be removed from your phone.") },
            confirmButton = {
                TextButton(onClick = {
                    deleteCandidate?.let { DeckStorage.delete(it) }
                    deleteCandidate = null
                    refresh()
                }) { Text("Delete", color = Color(0xFFB22222)) }
            },
            dismissButton = {
                TextButton(onClick = { deleteCandidate = null }) { Text("Cancel") }
            },
        )
    }
}

// ── Local deck card ──────────────────────────────────────────────────────────

@Composable
private fun LocalDeckCard(file: File, onClick: () -> Unit, onDelete: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = CardSurface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = DeckStorage.displayName(file),
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = PrimaryText,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    text = file.name,
                    fontSize = 12.sp,
                    color = DimText,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Spacer(Modifier.width(8.dp))
            TextButton(
                onClick = onDelete,
                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
            ) {
                Text("✕", fontSize = 16.sp, color = DimText)
            }
        }
    }
}
