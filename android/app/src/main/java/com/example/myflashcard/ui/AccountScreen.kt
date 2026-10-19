package com.example.myflashcard.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.myflashcard.AppSession
import com.example.myflashcard.api.ApiClient
import com.example.myflashcard.models.TIER_LABELS
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

private enum class SignedOutMode { LOGIN, REGISTER, FORGOT }

/** Runs [block] with a busy flag and turns any error into a message. */
private fun CoroutineScope.act(
    setBusy: (Boolean) -> Unit,
    setMessage: (Pair<NoticeKind, String>?) -> Unit,
    block: suspend () -> String?,
) = launch {
    setBusy(true)
    setMessage(null)
    try {
        block()?.let { setMessage(NoticeKind.SUCCESS to it) }
    } catch (e: Exception) {
        setMessage(NoticeKind.ERROR to (e.message ?: "Something went wrong"))
    } finally {
        setBusy(false)
    }
}

@Composable
fun AccountScreen(session: AppSession, onBack: () -> Unit, onOpenAISettings: () -> Unit) {
    Column(Modifier.fillMaxSize().background(AppBackground)) {
        BackBar(if (session.user == null) "Account" else "My account", onBack)
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            if (session.user == null) SignedOut(session) else SignedIn(session, onBack, onOpenAISettings)
        }
    }
}

// ── Signed out: log in / create account / forgot password ────────────────────

@Composable
private fun SignedOut(session: AppSession) {
    val scope = rememberCoroutineScope()
    var mode by remember { mutableStateOf(SignedOutMode.LOGIN) }
    var alias by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<Pair<NoticeKind, String>?>(null) }
    val canRegister = session.features.accounts

    when (mode) {
        SignedOutMode.LOGIN -> {
            ScreenTitle("Log in")
            Text("Welcome back to myFlashCard.", color = DimText, fontSize = 14.sp)
            Field("Email", email, { email = it }, email = true)
            Field("Password", password, { password = it }, password = true)
            message?.let { Notice(it.second, it.first) }
            PrimaryButton("Log in", busy = busy, enabled = email.isNotBlank() && password.isNotBlank(), onClick = {
                scope.act({ busy = it }, { message = it }) { session.login(email, password); null }
            })
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                TextButton(onClick = { mode = SignedOutMode.FORGOT; message = null }) {
                    Text("Forgot password?", color = DefaultAccent)
                }
                if (canRegister) {
                    TextButton(onClick = { mode = SignedOutMode.REGISTER; message = null }) {
                        Text("Create an account", color = DefaultAccent)
                    }
                }
            }
            if (!canRegister) {
                Text("New accounts aren't open yet. Everything else works without one.", color = DimText, fontSize = 13.sp)
            }
        }

        SignedOutMode.REGISTER -> {
            ScreenTitle("Create an account")
            Text("Only an alias and an email.", color = DimText, fontSize = 14.sp)
            Field("Alias", alias, { alias = it }, supporting = "Shown on your account. 3–30 characters.")
            Field("Email", email, { email = it }, email = true, supporting = "Used to log in and reset your password. Never shown publicly.")
            Field("Password", password, { password = it }, password = true, supporting = "At least 8 characters.")
            message?.let { Notice(it.second, it.first) }
            PrimaryButton(
                "Create account", busy = busy,
                enabled = alias.isNotBlank() && email.isNotBlank() && password.isNotBlank(),
                onClick = { scope.act({ busy = it }, { message = it }) { session.register(alias, email, password); null } },
            )
            Text(
                "By creating an account you accept our privacy policy (myflashcard website → Privacy).",
                color = DimText, fontSize = 12.sp,
            )
            TextButton(onClick = { mode = SignedOutMode.LOGIN; message = null }) {
                Text("Already have an account? Log in", color = DefaultAccent)
            }
        }

        SignedOutMode.FORGOT -> {
            ScreenTitle("Forgot your password?")
            Text("Enter your email and we'll send you a link to choose a new one.", color = DimText, fontSize = 14.sp)
            Field("Email", email, { email = it }, email = true)
            message?.let { Notice(it.second, it.first) }
            PrimaryButton("Send reset link", busy = busy, enabled = email.isNotBlank(), onClick = {
                scope.act({ busy = it }, { message = it }) {
                    ApiClient.forgotPassword(email.trim())
                    "If an account exists for $email, a reset link is on its way. It's valid for 1 hour."
                }
            })
            TextButton(onClick = { mode = SignedOutMode.LOGIN; message = null }) {
                Text("Back to log in", color = DefaultAccent)
            }
        }
    }
}

// ── Signed in: profile ────────────────────────────────────────────────────────

@Composable
private fun SignedIn(session: AppSession, onBack: () -> Unit, onOpenAISettings: () -> Unit) {
    val user = session.user ?: return
    val token = session.token ?: return
    val scope = rememberCoroutineScope()

    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        ScreenTitle(user.alias)
        Text(user.email, color = DimText, fontSize = 14.sp)
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            if (user.isAdmin) Badge("Admin", PrimaryText)
            if (session.features.premium && user.tier != "none") Badge("★ ${TIER_LABELS[user.tier] ?: user.tier}")
        }
    }

    if (!user.emailVerified) {
        var sent by remember { mutableStateOf(false) }
        SectionCard("Confirm your email") {
            Text(
                "We sent a link to ${user.email}. Open it to confirm your address — it's needed for AI decks.",
                fontSize = 14.sp, color = DimText,
            )
            TextButton(enabled = !sent, onClick = {
                scope.launch { runCatching { ApiClient.resendVerification(token) }; sent = true }
            }) { Text(if (sent) "New link sent ✓" else "Send a new link", color = DefaultAccent) }
            TextButton(onClick = { scope.launch { session.refresh() } }) {
                Text("I've confirmed it — refresh", color = DefaultAccent)
            }
        }
    }

    if (session.aiVisible) {
        SectionCard("AI decks") {
            Text("Your plan, AI decks left and your own API key.", fontSize = 14.sp, color = DimText)
            SecondaryButton("AI settings ›", onClick = onOpenAISettings)
        }
    }

    // Alias
    run {
        var alias by remember(user.alias) { mutableStateOf(user.alias) }
        var busy by remember { mutableStateOf(false) }
        var message by remember { mutableStateOf<Pair<NoticeKind, String>?>(null) }
        SectionCard("Profile") {
            Field("Alias", alias, { alias = it })
            message?.let { Notice(it.second, it.first) }
            PrimaryButton("Save", busy = busy, enabled = alias.isNotBlank() && alias != user.alias, onClick = {
                scope.act({ busy = it }, { message = it }) {
                    session.updateUser(ApiClient.updateAlias(token, alias.trim())); "Alias saved."
                }
            })
        }
    }

    // Password
    run {
        var current by remember { mutableStateOf("") }
        var new by remember { mutableStateOf("") }
        var busy by remember { mutableStateOf(false) }
        var message by remember { mutableStateOf<Pair<NoticeKind, String>?>(null) }
        SectionCard("Password") {
            Field("Current password", current, { current = it }, password = true)
            Field("New password", new, { new = it }, password = true, supporting = "At least 8 characters.")
            message?.let { Notice(it.second, it.first) }
            PrimaryButton("Change password", busy = busy, enabled = current.isNotBlank() && new.isNotBlank(), onClick = {
                scope.act({ busy = it }, { message = it }) {
                    ApiClient.changePassword(token, current, new)
                    current = ""; new = ""
                    "Password changed. Your other devices were signed out."
                }
            })
        }
    }

    PrimaryButton("Log out", onClick = { scope.launch { session.logout(); onBack() } })

    // Delete account (required by Google Play for apps with accounts)
    run {
        var open by remember { mutableStateOf(false) }
        var password by remember { mutableStateOf("") }
        var busy by remember { mutableStateOf(false) }
        var error by remember { mutableStateOf<String?>(null) }
        TextButton(onClick = { open = true }, modifier = Modifier.fillMaxWidth()) {
            Text("Delete my account…", color = ErrorRed)
        }
        if (open) {
            AlertDialog(
                onDismissRequest = { if (!busy) open = false },
                title = { Text("Delete your account?") },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("This permanently deletes your account, your AI deck history and your API key. Decks saved on this phone stay. Enter your password to confirm.")
                        Field("Password", password, { password = it }, password = true)
                        error?.let { Text(it, color = ErrorRed, fontSize = 13.sp) }
                    }
                },
                confirmButton = {
                    TextButton(enabled = password.isNotBlank() && !busy, onClick = {
                        scope.launch {
                            busy = true
                            error = null
                            try {
                                ApiClient.deleteAccount(token, password)
                                session.clear()
                                open = false
                                onBack()
                            } catch (e: Exception) {
                                error = e.message
                            } finally {
                                busy = false
                            }
                        }
                    }) { Text(if (busy) "Deleting…" else "Delete", color = ErrorRed, fontWeight = FontWeight.SemiBold) }
                },
                dismissButton = { TextButton(onClick = { open = false }, enabled = !busy) { Text("Cancel") } },
            )
        }
    }
}
