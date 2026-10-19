package com.example.myflashcard

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.example.myflashcard.api.ApiClient
import com.example.myflashcard.api.ApiException
import com.example.myflashcard.models.Features
import com.example.myflashcard.models.User
import com.example.myflashcard.models.aiVisible

/**
 * Login and launch switches, shared by every screen.
 *
 * The session token lives in app-private SharedPreferences ("session"), which other apps can't
 * read and which is excluded from backups (see res/xml backup rules).
 */
class AppSession(context: Context) {

    private val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    var token by mutableStateOf(prefs.getString(KEY_TOKEN, null))
        private set
    var user by mutableStateOf<User?>(null)
        private set
    var features by mutableStateOf(Features())
        private set
    /** True once the first check of settings + login is done. */
    var loaded by mutableStateOf(false)
        private set

    val aiVisible: Boolean get() = aiVisible(user, features)

    /** Reload launch switches and the current user. Offline: keep what we have. */
    suspend fun refresh() {
        try {
            features = ApiClient.settings()
        } catch (_: Exception) {
            // offline — features stay as they were (all off on first launch)
        }
        val t = token
        if (t != null) {
            try {
                user = ApiClient.me(t)
            } catch (e: ApiException) {
                if (e.status == 401) clear()  // expired or revoked; offline errors keep the session
            }
        }
        loaded = true
    }

    suspend fun login(email: String, password: String) {
        val (t, u) = ApiClient.login(email.trim(), password)
        start(t, u)
    }

    suspend fun register(alias: String, email: String, password: String) {
        val (t, u) = ApiClient.register(alias.trim(), email.trim(), password)
        start(t, u)
    }

    suspend fun logout() {
        token?.let { runCatching { ApiClient.logout(it) } }
        clear()
    }

    fun updateUser(u: User) { user = u }

    /** Forget the session locally (after logout, account deletion, or an expired token). */
    fun clear() {
        prefs.edit().remove(KEY_TOKEN).apply()
        token = null
        user = null
    }

    private fun start(t: String, u: User) {
        prefs.edit().putString(KEY_TOKEN, t).apply()
        token = t
        user = u
    }

    companion object {
        const val PREFS = "session"
        private const val KEY_TOKEN = "token"
    }
}
