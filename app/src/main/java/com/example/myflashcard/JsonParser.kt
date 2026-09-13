package com.example.myflashcard

import com.example.myflashcard.models.*
import org.json.JSONArray
import org.json.JSONObject

object JsonParser {

    fun parse(json: String): CardDeck {
        val root = JSONObject(json)
        val deckTitle = root.getString("deckTitle")
        val accentColor = root.optString("accentColor", "").takeIf { it.isNotBlank() }
        val cardsArr = root.getJSONArray("cards")
        val cards = (0 until cardsArr.length()).map { parseCard(cardsArr.getJSONObject(it)) }
        return CardDeck(deckTitle, accentColor, cards)
    }

    private fun parseCard(obj: JSONObject): Card {
        val title = obj.getString("title")
        val subtitle = obj.optString("subtitle", "").takeIf { it.isNotBlank() }
        val accentColor = obj.optString("accentColor", "").takeIf { it.isNotBlank() }
        val blocksArr = obj.getJSONArray("blocks")
        val blocks = (0 until blocksArr.length()).map { parseBlock(blocksArr.getJSONObject(it)) }
        return Card(title, subtitle, accentColor, blocks)
    }

    private fun parseBlock(obj: JSONObject): Block {
        return when (val type = obj.getString("type")) {
            "note" -> Block.Note(
                text = obj.getString("text"),
                accentColor = obj.optString("accentColor", "").takeIf { it.isNotBlank() }
            )
            "stats" -> {
                val arr = obj.getJSONArray("items")
                val items = (0 until arr.length()).map {
                    val item = arr.getJSONObject(it)
                    StatItem(item.getString("label"), item.getString("value"))
                }
                Block.Stats(items)
            }
            "steps" -> Block.Steps(
                heading = obj.optString("heading", "").takeIf { it.isNotBlank() },
                style = obj.optString("style", "bullet"),
                accentColor = obj.optString("accentColor", "").takeIf { it.isNotBlank() },
                items = obj.getJSONArray("items").toStringList()
            )
            "table" -> Block.Table(
                heading = obj.optString("heading", "").takeIf { it.isNotBlank() },
                accentColor = obj.optString("accentColor", "").takeIf { it.isNotBlank() },
                columns = obj.getJSONArray("columns").toStringList(),
                rows = obj.getJSONArray("rows").let { rowsArr ->
                    (0 until rowsArr.length()).map { i ->
                        rowsArr.getJSONArray(i).toStringList()
                    }
                }
            )
            "text" -> Block.TextBlock(obj.getString("text"))
            "image" -> Block.Image(obj.optString("url", "").takeIf { it.isNotBlank() })
            else -> Block.TextBlock("[Unknown block: $type]")
        }
    }

    private fun JSONArray.toStringList(): List<String> =
        (0 until length()).map { getString(it) }
}
