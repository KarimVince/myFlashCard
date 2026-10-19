package com.example.myflashcard.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.myflashcard.AppSession
import com.example.myflashcard.DeckStorage
import com.example.myflashcard.JsonParser
import com.example.myflashcard.api.ApiClient
import com.example.myflashcard.models.*
import kotlinx.coroutines.launch

/**
 * Create tab: "Generate with AI" (admins, and Premium members while AI and Premium are on)
 * above the manual method and "Load from file", which everyone keeps.
 */
@Composable
fun CreateScreen(
    session: AppSession,
    onOpenDeck: (CardDeck) -> Unit,
    onLoadFile: () -> Unit,
    onOpenAISettings: () -> Unit,
    errorMessage: String?,
) {
    Column(Modifier.fillMaxSize().background(AppBackground)) {
        if (errorMessage != null) {
            Text(
                text = errorMessage,
                fontSize = 14.sp,
                color = ErrorRed,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .background(ErrorRed.copy(alpha = 0.09f))
                    .padding(horizontal = 20.dp, vertical = 10.dp),
            )
        }

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 20.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            if (session.aiVisible) {
                AICreateSection(session, onOpenDeck, onOpenAISettings)
            }
            ManualGuide(withAI = session.aiVisible)
        }

        HorizontalDivider(thickness = 1.dp, color = DividerColor)
        Box(
            Modifier.fillMaxWidth().background(CardSurface).padding(horizontal = 24.dp, vertical = 16.dp)
        ) {
            Button(
                onClick = onLoadFile,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = DefaultAccent),
                contentPadding = PaddingValues(horizontal = 28.dp, vertical = 14.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Load from file", fontSize = 16.sp, color = CardSurface)
            }
        }
    }
}

@Composable
private fun ManualGuide(withAI: Boolean) {
    Column(Modifier.padding(horizontal = 8.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
        Text(
            if (withAI) "Or do it manually" else "How to get started",
            fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold, fontSize = 22.sp, color = PrimaryText,
        )
        GuideStep("1", "Browse the library", "Open the Library tab to discover community decks. Tap Download to save a deck to your phone.")
        GuideStep("2", "Create with any AI chat", "Ask Claude or ChatGPT to generate a myFlashCard JSON deck on any topic and save the file to your phone.")
        GuideStep("3", "Load from file", "Tap \"Load from file\" below, pick any .json file from your phone, and start swiping.")
    }
}

// ── Generate with AI ─────────────────────────────────────────────────────────

@Composable
private fun AICreateSection(session: AppSession, onOpenDeck: (CardDeck) -> Unit, onOpenAISettings: () -> Unit) {
    val token = session.token ?: return
    val user = session.user ?: return
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var options by remember { mutableStateOf<AIOptions?>(null) }
    var categories by remember { mutableStateOf<List<Category>>(emptyList()) }
    var history by remember { mutableStateOf<List<GenerationSummary>>(emptyList()) }
    var loadError by remember { mutableStateOf<String?>(null) }
    var reloadKey by remember { mutableIntStateOf(0) }

    var category by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var provider by remember { mutableStateOf("") }
    var source by remember { mutableStateOf("shared") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(token, reloadKey) {
        try {
            val o = ApiClient.aiOptions(token)
            options = o
            if (categories.isEmpty()) categories = ApiClient.categories()
            if (category.isEmpty()) category = categories.firstOrNull()?.slug ?: ""
            val usable = o.providers.filter { it.available }
            if (provider.isEmpty()) provider = (usable.firstOrNull { it.isDefault } ?: usable.firstOrNull())?.id ?: ""
            val first = usable.firstOrNull { it.id == provider }
            val sharedOk = first != null && (o.balance.unlimited || o.balance.total >= first.tokenCost)
            source = if (sharedOk || o.ownKey == null) "shared" else "own"
            history = ApiClient.generations(token)
            // Decks published to the library (here or on the website): keep one copy, under the library name.
            history.forEach { g ->
                g.publishedDeckId?.let { DeckStorage.linkPublished(context, g.id, it, g.title ?: "AI deck") }
            }
            loadError = null
        } catch (e: Exception) {
            loadError = e.message
        }
    }

    /** Save a generated deck on the phone (it then shows in My Decks) and open it. */
    fun saveAndOpen(gen: Generation) {
        val title = gen.summary.title ?: "AI deck"
        val published = gen.summary.publishedDeckId
        // Already in the library: reuse that copy rather than saving a second one.
        val existing = if (published != null) DeckStorage.libraryFile(context, published) else DeckStorage.aiFile(context, gen.summary.id)
        if (existing == null) {
            val name = if (published != null) DeckStorage.remoteFilename(published, title) else DeckStorage.aiFilename(gen.summary.id, title)
            DeckStorage.save(context, name, gen.deckJson.toByteArray())
        }
        onOpenDeck(JsonParser.parse(gen.deckJson))
    }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("✨ Generate with AI", fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold, fontSize = 22.sp, color = PrimaryText)

        val o = options
        when {
            loadError != null -> Notice(loadError!!, NoticeKind.ERROR)
            o == null -> Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = DefaultAccent)
            }
            !o.canGenerate -> SectionCard {
                Text("AI decks are a Premium feature", fontWeight = FontWeight.SemiBold, color = PrimaryText)
                Text(o.reason ?: "", fontSize = 14.sp, color = DimText)
                SecondaryButton("See your plan ›", onClick = onOpenAISettings)
            }
            !o.emailVerified -> SectionCard {
                Text("Confirm your email first", fontWeight = FontWeight.SemiBold, color = PrimaryText)
                Text("We sent a link to ${user.email}. Open it, then come back here.", fontSize = 14.sp, color = DimText)
                var sent by remember { mutableStateOf(false) }
                TextButton(enabled = !sent, onClick = {
                    scope.launch { runCatching { ApiClient.resendVerification(token) }; sent = true }
                }) { Text(if (sent) "New link sent ✓" else "Send a new link", color = DefaultAccent) }
                TextButton(onClick = { scope.launch { session.refresh(); reloadKey++ } }) {
                    Text("I've confirmed it — refresh", color = DefaultAccent)
                }
            }
            else -> {
                val usable = o.providers.filter { it.available }
                val hasOwn = o.ownKeyAllowed && o.ownKey != null
                val sharedPossible = o.shared && usable.isNotEmpty()
                val useOwn = hasOwn && (source == "own" || !sharedPossible)
                val cost = o.providers.firstOrNull { it.id == provider }?.tokenCost ?: 1
                val notEnough = !useOwn && !o.balance.unlimited && o.balance.total < cost
                val tooShort = description.trim().length < 10

                if (!sharedPossible && !hasOwn) {
                    SectionCard {
                        if (o.shared) {
                            Text("AI generation isn't available right now. Please check back later.", fontSize = 14.sp, color = DimText)
                        } else {
                            Text("Add your API key to start", fontWeight = FontWeight.SemiBold, color = PrimaryText)
                            Text("Your plan uses your own key from an AI provider (some have a free tier).", fontSize = 14.sp, color = DimText)
                            SecondaryButton("AI settings ›", onClick = onOpenAISettings)
                        }
                    }
                } else SectionCard {
                    if (sharedPossible && hasOwn) {
                        Text("Use", fontWeight = FontWeight.Medium, fontSize = 14.sp, color = PrimaryText)
                        ChipRow(
                            listOf(
                                Triple("shared", "Our AI · " + if (o.balance.unlimited) "unlimited" else "${o.balance.total} left", true),
                                Triple("own", "Your key · ${o.ownKey?.providerLabel ?: ""}", true),
                            ),
                            if (useOwn) "own" else "shared",
                        ) { source = it }
                    }
                    when {
                        useOwn -> Text("Using your ${o.ownKey?.providerLabel} key · free on our side.", fontSize = 13.sp, color = DimText)
                        !o.balance.unlimited -> Text(
                            "${o.balance.total} AI deck${if (o.balance.total != 1) "s" else ""} left · " +
                                if (o.balance.period == "month") "${o.balance.allowance} per month, renews ${o.balance.resetsOn ?: "on the 1st"}"
                                else "${o.balance.allowance} in total",
                            fontSize = 13.sp, color = DimText,
                        )
                    }

                    Text("1. Deck type", fontWeight = FontWeight.Medium, fontSize = 14.sp, color = PrimaryText)
                    ChipRow(categories.map { Triple(it.slug, listOfNotNull(it.icon, it.label).joinToString(" "), !busy) }, category) { category = it }

                    Text("2. What should the deck cover?", fontWeight = FontWeight.Medium, fontSize = 14.sp, color = PrimaryText)
                    Field(
                        "Topic, level, language, what to include", description,
                        { description = it.take(o.maxDescription) },
                        singleLine = false, minLines = 4, enabled = !busy,
                        supporting = "${description.length}/${o.maxDescription}",
                    )

                    if (!useOwn && o.providers.size > 1) {
                        Text("3. AI", fontWeight = FontWeight.Medium, fontSize = 14.sp, color = PrimaryText)
                        ChipRow(
                            o.providers.map { p ->
                                Triple(p.id, p.label + if (!o.balance.unlimited) " · ${p.tokenCost}" else "", p.available && !busy)
                            },
                            provider,
                        ) { provider = it }
                    }

                    error?.let { Notice(it, NoticeKind.ERROR) }

                    if (busy) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(DefaultAccent.copy(alpha = 0.08f), RoundedCornerShape(8.dp))
                                .padding(12.dp),
                        ) {
                            CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp, color = DefaultAccent)
                            Spacer(Modifier.width(12.dp))
                            Text("Writing your deck… this usually takes 20–60 seconds. Keep the app open.", fontSize = 13.sp, color = PrimaryText)
                        }
                    } else {
                        PrimaryButton(
                            text = when {
                                notEnough -> if (o.balance.period == "month") "No AI decks left this month" else "No AI decks left"
                                useOwn || o.balance.unlimited -> "✨ Generate deck"
                                else -> "✨ Generate deck · $cost"
                            },
                            enabled = !tooShort && !notEnough && category.isNotEmpty() && (useOwn || provider.isNotEmpty()),
                            onClick = {
                                scope.launch {
                                    busy = true
                                    error = null
                                    try {
                                        val (gen, balance) = ApiClient.generate(
                                            token, category, description.trim(),
                                            if (useOwn) null else provider, if (useOwn) "own" else "shared",
                                        )
                                        options = o.copy(balance = balance)
                                        description = ""
                                        history = listOf(gen.summary) + history
                                        saveAndOpen(gen)
                                    } catch (e: Exception) {
                                        error = e.message
                                    } finally {
                                        busy = false
                                    }
                                }
                            },
                        )
                    }
                }

                if (history.isNotEmpty()) {
                    AIHistory(
                        token = token,
                        history = history,
                        isAdmin = user.isAdmin,
                        premiumEnabled = session.features.premium,
                        onOpen = { id ->
                            scope.launch {
                                try { saveAndOpen(ApiClient.generation(token, id)) } catch (e: Exception) { error = e.message }
                            }
                        },
                        onChanged = { reloadKey++ },
                    )
                }
            }
        }
    }
}

@Composable
private fun AIHistory(
    token: String,
    history: List<GenerationSummary>,
    isAdmin: Boolean,
    premiumEnabled: Boolean,
    onOpen: (Int) -> Unit,
    onChanged: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var publishing by remember { mutableStateOf<GenerationSummary?>(null) }
    var removing by remember { mutableStateOf<GenerationSummary?>(null) }

    Text("Your AI decks", fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = PrimaryText)
    SectionCard {
        history.forEachIndexed { i, g ->
            if (i > 0) HorizontalDivider(thickness = 1.dp, color = DividerColor)
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.weight(1f).clickable { onOpen(g.id) }.padding(vertical = 4.dp)) {
                    Text(g.title ?: "AI deck", fontWeight = FontWeight.Medium, color = PrimaryText, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(
                        listOfNotNull(g.categoryLabel, g.cardCount?.let { "$it cards" }, if (g.keySource == "own") "your key" else null)
                            .joinToString(" · "),
                        fontSize = 12.sp, color = DimText,
                    )
                }
                if (isAdmin) {
                    if (g.publishedDeckId != null) {
                        Text("✓ In library", fontSize = 12.sp, color = SuccessTeal)
                    } else {
                        TextButton(onClick = { publishing = g }) { Text("＋ Library", fontSize = 13.sp, color = Color(0xFF92400E)) }
                    }
                }
                TextButton(onClick = { removing = g }) { Text("Remove", fontSize = 12.sp, color = DimText) }
            }
        }
    }

    removing?.let { g ->
        AlertDialog(
            onDismissRequest = { removing = null },
            title = { Text("Remove from your AI decks?") },
            text = { Text("\"${g.title}\" is removed from this list. A copy already saved in My Decks stays. Decks used are not refunded.") },
            confirmButton = {
                TextButton(onClick = {
                    removing = null
                    scope.launch { runCatching { ApiClient.deleteGeneration(token, g.id) }; onChanged() }
                }) { Text("Remove", color = ErrorRed) }
            },
            dismissButton = { TextButton(onClick = { removing = null }) { Text("Cancel") } },
        )
    }

    publishing?.let { g ->
        PublishDialog(
            token, g, premiumEnabled,
            onDone = { deckId, title ->
                DeckStorage.linkPublished(context, g.id, deckId, title)
                publishing = null
                onChanged()
            },
            onCancel = { publishing = null },
        )
    }
}

/** Admin only: put a generated deck in the public library. */
@Composable
private fun PublishDialog(
    token: String,
    gen: GenerationSummary,
    premiumEnabled: Boolean,
    onDone: (deckId: Int, title: String) -> Unit,
    onCancel: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var title by remember { mutableStateOf(gen.title ?: "") }
    var description by remember { mutableStateOf("") }
    var language by remember { mutableStateOf("en") }
    var premium by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = { if (!busy) onCancel() },
        title = { Text("Add to the public library") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Field("Title", title, { title = it })
                Field("Description (optional)", description, { description = it })
                Field("Language", language, { language = it.take(5) }, supporting = "Short code like en or fr")
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = premium, onCheckedChange = { premium = it })
                    Text("Premium deck (Silver & Gold)", fontSize = 14.sp)
                }
                if (premium && !premiumEnabled) {
                    Text("Premium is off, so this deck stays hidden until you switch Premium on.", fontSize = 12.sp, color = DimText)
                }
                error?.let { Text(it, color = ErrorRed, fontSize = 13.sp) }
            }
        },
        confirmButton = {
            TextButton(enabled = title.isNotBlank() && !busy, onClick = {
                scope.launch {
                    busy = true
                    error = null
                    try {
                        val deckId = ApiClient.publishGeneration(token, gen.id, title.trim(), description.trim(), language.trim().ifEmpty { "en" }, !premium)
                        onDone(deckId, title.trim())
                    } catch (e: Exception) {
                        error = e.message
                    } finally {
                        busy = false
                    }
                }
            }) { Text(if (busy) "Publishing…" else "Publish", fontWeight = FontWeight.SemiBold) }
        },
        dismissButton = { TextButton(onClick = onCancel, enabled = !busy) { Text("Cancel") } },
    )
}
