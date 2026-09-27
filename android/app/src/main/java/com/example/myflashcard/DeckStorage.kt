package com.example.myflashcard

import android.content.Context
import java.io.File

/**
 * Manages the local deck folder — stored in the app's private external directory:
 *
 *   Internal Storage / Android / data / com.willygo.myflashcard / files / myFlashCard /
 *
 * On Samsung: My Files → Internal storage → Android → data → com.willygo.myflashcard → files → myFlashCard
 * On stock Android: Files → Browse → Internal storage → Android → data → … → myFlashCard
 *
 * No WRITE_EXTERNAL_STORAGE permission needed (app-scoped directory).
 * Files survive until the user uninstalls the app or deletes them manually.
 */
object DeckStorage {

    private const val FOLDER = "myFlashCard"

    fun decksDir(context: Context): File {
        val dir = context.getExternalFilesDir(FOLDER)
            ?: context.filesDir.resolve(FOLDER)
        dir.mkdirs()
        return dir
    }

    fun listDecks(context: Context): List<File> =
        decksDir(context).listFiles { f -> f.extension == "json" }
            ?.sortedByDescending { it.lastModified() }
            ?: emptyList()

    /** Filename used for a remote deck: "<id>_<sanitised-title>.json" */
    fun remoteFilename(id: Int, title: String): String {
        val safe = title.replace(Regex("[^A-Za-z0-9 _-]"), "").trim().replace(' ', '_')
        return "${id}_${safe.take(40)}.json"
    }

    fun save(context: Context, filename: String, content: ByteArray): File {
        val file = decksDir(context).resolve(filename)
        file.writeBytes(content)
        return file
    }

    fun exists(context: Context, filename: String): Boolean =
        decksDir(context).resolve(filename).exists()

    fun delete(file: File) { file.delete() }

    /** Human-readable deck title from filename: strip leading id prefix and underscores. */
    fun displayName(file: File): String =
        file.nameWithoutExtension
            .replaceFirst(Regex("^\\d+_"), "")
            .replace('_', ' ')
}
