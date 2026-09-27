package com.example.myflashcard.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.myflashcard.DeckStorage
import com.example.myflashcard.JsonParser
import com.example.myflashcard.api.ApiClient
import com.example.myflashcard.models.CardDeck
import com.example.myflashcard.models.DeckMeta
import kotlinx.coroutines.launch

@Composable
fun LibraryScreen(onOpenDeck: (CardDeck) -> Unit) {
    val context = LocalContext.current
    val scope   = rememberCoroutineScope()

    var allDecks       by remember { mutableStateOf<List<DeckMeta>>(emptyList()) }
    var loading        by remember { mutableStateOf(false) }
    var error          by remember { mutableStateOf<String?>(null) }
    var selectedCat    by remember { mutableStateOf<String?>(null) }          // slug or null = All
    var refreshKey     by remember { mutableStateOf(0) }
    var downloadingId  by remember { mutableStateOf<Int?>(null) }
    var downloadError  by remember { mutableStateOf<String?>(null) }

    // Fetch all decks once; filter locally so categories stay dynamic
    LaunchedEffect(refreshKey) {
        loading = true
        error   = null
        try {
            allDecks = ApiClient.fetchDecks()
        } catch (e: Exception) {
            error = "Could not reach the library: ${e.message}"
        } finally {
            loading = false
        }
    }

    // Build category chips from the actual deck data — no hardcoded list
    val categories: List<Pair<String, String?>> = remember(allDecks) {
        val distinct = allDecks
            .map { it.categoryLabel to it.categorySlug }
            .distinctBy { it.second }
            .sortedBy { it.first }
        listOf("All" to null) + distinct
    }

    val decks = remember(allDecks, selectedCat) {
        if (selectedCat == null) allDecks
        else allDecks.filter { it.categorySlug == selectedCat }
    }

    Column(Modifier.fillMaxSize().background(AppBackground)) {

        // ── Category filter chips ─────────────────────────────────────────
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(categories) { (label, slug) ->
                val active = selectedCat == slug
                FilterChip(
                    selected = active,
                    onClick = { selectedCat = slug },
                    label = { Text(label, fontSize = 13.sp) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = DefaultAccent,
                        selectedLabelColor = CardSurface,
                    ),
                )
            }
        }

        // ── Download error banner ─────────────────────────────────────────
        if (downloadError != null) {
            Text(
                text = downloadError!!,
                fontSize = 13.sp,
                color = Color(0xFFB22222),
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFFB22222).copy(alpha = 0.08f))
                    .padding(horizontal = 20.dp, vertical = 8.dp),
            )
        }

        when {
            loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = DefaultAccent)
            }
            error != null -> Column(
                Modifier.fillMaxSize().padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Text(error!!, color = DimText, fontSize = 14.sp)
                Spacer(Modifier.height(16.dp))
                Button(
                    onClick = { refreshKey++ },
                    colors = ButtonDefaults.buttonColors(containerColor = DefaultAccent),
                ) { Text("Retry") }
            }
            allDecks.isEmpty() && !loading && downloadError == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No decks found", color = DimText, fontSize = 15.sp)
            }
            else -> LazyColumn(
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(decks, key = { it.id }) { deck ->
                    val filename    = DeckStorage.remoteFilename(deck.id, deck.title)
                    val downloaded  = DeckStorage.exists(context, filename)
                    val isDownloading = downloadingId == deck.id

                    RemoteDeckCard(
                        deck          = deck,
                        downloaded    = downloaded,
                        isDownloading = isDownloading,
                        onOpen = {
                            // Already downloaded — open local copy
                            try {
                                val file = DeckStorage.decksDir(context).resolve(filename)
                                val parsed = JsonParser.parse(file.readText())
                                onOpenDeck(parsed)
                            } catch (e: Exception) {
                                downloadError = "Could not open: ${e.message}"
                            }
                        },
                        onDownload = {
                            scope.launch {
                                downloadError = null
                                downloadingId = deck.id
                                try {
                                    val bytes = ApiClient.downloadDeck(deck.publicUrl)
                                    DeckStorage.save(context, filename, bytes)
                                    // Open immediately after download
                                    val parsed = JsonParser.parse(String(bytes))
                                    onOpenDeck(parsed)
                                } catch (e: Exception) {
                                    downloadError = "Download failed: ${e.message}"
                                } finally {
                                    downloadingId = null
                                }
                            }
                        },
                    )
                }
            }
        }
    }
}

// ── Remote deck card ─────────────────────────────────────────────────────────

@Composable
private fun RemoteDeckCard(
    deck: DeckMeta,
    downloaded: Boolean,
    isDownloading: Boolean,
    onOpen: () -> Unit,
    onDownload: () -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .then(if (downloaded) Modifier.clickable(onClick = onOpen) else Modifier),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = CardSurface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(Modifier.padding(horizontal = 16.dp, vertical = 14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                // Category badge
                Text(
                    text = deck.categoryLabel,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = DefaultAccent,
                    modifier = Modifier
                        .background(DefaultAccent.copy(alpha = 0.1f), RoundedCornerShape(4.dp))
                        .padding(horizontal = 7.dp, vertical = 3.dp),
                )
                Spacer(Modifier.width(8.dp))
                if (deck.language.isNotBlank() && deck.language != "en") {
                    Text(
                        text = deck.language.uppercase(),
                        fontSize = 11.sp,
                        color = DimText,
                        modifier = Modifier
                            .background(DividerColor, RoundedCornerShape(4.dp))
                            .padding(horizontal = 6.dp, vertical = 3.dp),
                    )
                }
            }
            Spacer(Modifier.height(8.dp))
            Text(
                text = deck.title,
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                color = PrimaryText,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            if (!deck.description.isNullOrBlank()) {
                Spacer(Modifier.height(4.dp))
                Text(
                    text = deck.description,
                    fontSize = 13.sp,
                    color = DimText,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Spacer(Modifier.height(10.dp))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth(),
            ) {
                // Meta line
                Text(
                    text = listOfNotNull(
                        deck.cardCount?.let { "$it cards" },
                        deck.author?.let { "by $it" },
                    ).joinToString(" · "),
                    fontSize = 12.sp,
                    color = DimText,
                )
                // Action button
                when {
                    isDownloading -> CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        strokeWidth = 2.dp,
                        color = DefaultAccent,
                    )
                    downloaded -> TextButton(
                        onClick = onOpen,
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                    ) {
                        Text("Open", color = DefaultAccent, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    }
                    else -> Button(
                        onClick = onDownload,
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = DefaultAccent),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp),
                    ) {
                        Text("Download", fontSize = 13.sp, color = CardSurface)
                    }
                }
            }
        }
    }
}
