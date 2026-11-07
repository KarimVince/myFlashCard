package com.example.myflashcard

import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.File

class DeckStorageTest {

    @Test
    fun `personal filename keeps accents and drops unsafe characters`() {
        assertEquals("my_Crêpes_de_Noël.json", DeckStorage.personalFilename("Crêpes / de: Noël?"))
    }

    @Test
    fun `personal filename of a title with no usable characters still gives a name`() {
        assertEquals("my_deck.json", DeckStorage.personalFilename("???"))
    }

    @Test
    fun `personal deck starting with a number is not mistaken for a library deck`() {
        val name = DeckStorage.personalFilename("12 Recipes")
        assertEquals("my_12_Recipes.json", name)
        assertEquals(false, name.startsWith("12_"))
    }

    @Test
    fun `display name strips each kind of prefix`() {
        assertEquals("12 Recipes", DeckStorage.displayName(File("my_12_Recipes.json")))
        assertEquals("Recipes", DeckStorage.displayName(File("7_Recipes.json")))
        assertEquals("Recipes", DeckStorage.displayName(File("ai7_Recipes.json")))
    }
}
