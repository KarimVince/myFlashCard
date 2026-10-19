package com.example.myflashcard.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.myflashcard.AppSession
import com.example.myflashcard.api.ApiClient
import com.example.myflashcard.models.AIOptions
import com.example.myflashcard.models.Balance
import com.example.myflashcard.models.KEY_LINKS
import com.example.myflashcard.models.TIER_LABELS
import com.example.myflashcard.models.tierPerks
import kotlinx.coroutines.launch

@Composable
fun AISettingsScreen(session: AppSession, onBack: () -> Unit) {
    val token = session.token
    var options by remember { mutableStateOf<AIOptions?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var reloadKey by remember { mutableIntStateOf(0) }

    LaunchedEffect(token, reloadKey) {
        if (token == null) return@LaunchedEffect
        try {
            options = ApiClient.aiOptions(token)
            error = null
        } catch (e: Exception) {
            error = e.message
        }
    }

    Column(Modifier.fillMaxSize().background(AppBackground)) {
        BackBar("AI settings", onBack)
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            error?.let { Notice(it, NoticeKind.ERROR) }
            val o = options
            if (o == null && error == null) {
                Box(Modifier.fillMaxWidth().padding(40.dp)) { CircularProgressIndicator(color = DefaultAccent) }
            }
            if (o != null && token != null) {
                PlanCard(o)
                if (o.shared && !o.isAdmin && !o.balance.unlimited) SharedCard(o.balance)
                if (o.ownKeyAllowed || o.ownKey != null) OwnKeyCard(token, o) { reloadKey++ }
            }
        }
    }
}

@Composable
private fun PlanCard(o: AIOptions) {
    SectionCard("Your plan") {
        if (o.isAdmin) {
            Text("Admin — you can always create decks with the site's AI, without limits.", fontSize = 14.sp, color = PrimaryText)
        } else {
            Text(TIER_LABELS[o.tier] ?: o.tier, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = PrimaryText)
            Text(tierPerks(o.tier, o.balance.allowance), fontSize = 14.sp, color = DimText)
            if (!o.canGenerate && o.reason != null) Notice(o.reason, NoticeKind.INFO)
        }
    }
}

@Composable
private fun SharedCard(b: Balance) {
    SectionCard("AI decks on us") {
        Text("${b.left} of ${b.allowance} left", fontWeight = FontWeight.Medium, fontSize = 14.sp, color = PrimaryText)
        LinearProgressIndicator(
            progress = { if (b.allowance > 0) b.left.toFloat() / b.allowance else 0f },
            color = DefaultAccent,
            trackColor = DividerColor,
            modifier = Modifier.fillMaxWidth(),
        )
        Text(
            if (b.period == "month") "Renews on ${b.resetsOn ?: "the 1st"}." else "In total — doesn't renew.",
            fontSize = 12.sp, color = DimText,
        )
        Text("Once they run out, your own API key below takes over.", fontSize = 12.sp, color = DimText)
    }
}

@Composable
private fun OwnKeyCard(token: String, o: AIOptions, onChanged: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val current = o.ownKey
    var provider by remember(o) {
        mutableStateOf(current?.provider ?: o.keyProviders.firstOrNull { KEY_LINKS[it.id]?.third == true }?.id ?: o.keyProviders.firstOrNull()?.id ?: "")
    }
    var apiKey by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<Pair<NoticeKind, String>?>(null) }
    var confirmRemove by remember { mutableStateOf(false) }

    fun run(pending: Pair<NoticeKind, String>? = null, block: suspend () -> Pair<NoticeKind, String>?) = scope.launch {
        busy = true
        message = pending
        try {
            message = block()
            onChanged()
        } catch (e: Exception) {
            message = NoticeKind.ERROR to (e.message ?: "Something went wrong")
        } finally {
            busy = false
        }
    }

    SectionCard("Your own API key") {
        Text(
            "Use your own account with an AI provider. Decks made with it are free on our side — the provider may charge you or apply its own free-tier limits. Your key is stored encrypted and never shown again.",
            fontSize = 13.sp, color = DimText,
        )

        if (current != null) {
            Column(
                Modifier.fillMaxWidth().background(AppBackground, RoundedCornerShape(8.dp)).padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text("${current.providerLabel}  ${current.keyHint ?: "· key unreadable, paste it again"}", fontWeight = FontWeight.Medium, color = PrimaryText)
                Text(
                    "Model ${current.model}" + when (current.lastTestOk) {
                        true -> " · ✓ worked on last test"
                        false -> " · ✗ failed on last test"
                        null -> ""
                    },
                    fontSize = 12.sp, color = DimText,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    SecondaryButton("Test", enabled = !busy && o.ownKeyAllowed, onClick = {
                        run(NoticeKind.INFO to "Testing — this takes a few seconds…") {
                            val r = ApiClient.testOwnKey(token)
                            (if (r.ok) NoticeKind.SUCCESS else NoticeKind.ERROR) to r.message
                        }
                    })
                    TextButton(enabled = !busy, onClick = { confirmRemove = true }) { Text("Remove", color = ErrorRed) }
                }
            }
        }

        message?.let { Notice(it.second, it.first) }

        if (o.ownKeyAllowed) {
            Text(if (current != null) "Replace with another key" else "Add a key", fontWeight = FontWeight.Medium, fontSize = 14.sp, color = PrimaryText)
            ChipRow(o.keyProviders.map { p ->
                val free = KEY_LINKS[p.id]?.third == true
                Triple(p.id, p.label + if (free) " · free tier" else "", true)
            }, provider) { provider = it }
            Field("API key", apiKey, { apiKey = it }, password = true)
            val chosen = o.keyProviders.firstOrNull { it.id == provider }
            if (chosen != null) Text("We use the model ${chosen.model}.", fontSize = 12.sp, color = DimText)
            KEY_LINKS[provider]?.let { (url, label, _) ->
                TextButton(onClick = { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }) {
                    Text("Get a key from $label ↗", color = DefaultAccent)
                }
            }
            PrimaryButton("Save key", busy = busy, enabled = apiKey.isNotBlank() && provider.isNotBlank(), onClick = {
                run {
                    ApiClient.saveOwnKey(token, provider, apiKey.trim())
                    apiKey = ""
                    NoticeKind.SUCCESS to "Key saved — press Test to check it works."
                }
            })
        }
    }

    if (confirmRemove) {
        AlertDialog(
            onDismissRequest = { confirmRemove = false },
            title = { Text("Remove your API key?") },
            confirmButton = {
                TextButton(onClick = {
                    confirmRemove = false
                    run { ApiClient.deleteOwnKey(token); NoticeKind.SUCCESS to "Key removed" }
                }) { Text("Remove", color = ErrorRed) }
            },
            dismissButton = { TextButton(onClick = { confirmRemove = false }) { Text("Cancel") } },
        )
    }
}

/** A wrapping row of selectable chips: (id, label, enabled). */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ChipRow(items: List<Triple<String, String, Boolean>>, selected: String, onSelect: (String) -> Unit) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        items.forEach { (id, label, enabled) ->
            FilterChip(
                selected = selected == id,
                enabled = enabled,
                onClick = { onSelect(id) },
                label = { Text(label, fontSize = 13.sp) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = DefaultAccent,
                    selectedLabelColor = CardSurface,
                ),
            )
        }
    }
}
