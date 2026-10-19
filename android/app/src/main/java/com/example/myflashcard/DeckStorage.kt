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

    /** Filename used for an AI-generated deck: "ai<id>_<sanitised-title>.json" */
    fun aiFilename(generationId: Int, title: String): String = "ai" + remoteFilename(generationId, title)

    fun save(context: Context, filename: String, content: ByteArray): File {
        val file = decksDir(context).resolve(filename)
        file.writeBytes(content)
        return file
    }

    fun exists(context: Context, filename: String): Boolean =
        decksDir(context).resolve(filename).exists()

    /** The saved copy of library deck [deckId], whatever title it was saved under. */
    fun libraryFile(context: Context, deckId: Int): File? =
        listDecks(context).firstOrNull { it.name.startsWith("${deckId}_") }

    /** The saved copy of AI generation [generationId], if any. */
    fun aiFile(context: Context, generationId: Int): File? =
        listDecks(context).firstOrNull { it.name.startsWith("ai${generationId}_") }

    /**
     * An AI deck was published to the library as [deckId]: keep a single copy, saved under the
     * library name, so the Library shows it as already downloaded instead of offering a duplicate.
     */
    fun linkPublished(context: Context, generationId: Int, deckId: Int, title: String) {
        val ai = aiFile(context, generationId) ?: return
        if (libraryFile(context, deckId) != null) {
            ai.delete()
        } else {
            ai.renameTo(decksDir(context).resolve(remoteFilename(deckId, title)))
        }
    }

    fun delete(file: File) { file.delete() }

    /** Human-readable deck title from filename: strip leading (ai)id prefix and underscores. */
    fun displayName(file: File): String =
        file.nameWithoutExtension
            .replaceFirst(Regex("^(ai)?\\d+_"), "")
            .replace('_', ' ')
}
