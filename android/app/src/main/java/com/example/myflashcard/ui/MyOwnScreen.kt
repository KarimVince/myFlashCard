package com.example.myflashcard.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun MyOwnScreen(
    onLoadFile: () -> Unit,
    errorMessage: String?,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppBackground)
    ) {
        if (errorMessage != null) {
            Text(
                text = errorMessage,
                fontSize = 14.sp,
                color = Color(0xFFB22222),
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFFB22222).copy(alpha = 0.09f))
                    .padding(horizontal = 20.dp, vertical = 10.dp)
            )
        }

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 28.dp),
            verticalArrangement = Arrangement.spacedBy(28.dp)
        ) {
            Text(
                "How to get started",
                fontFamily = FontFamily.Serif,
                fontWeight = FontWeight.Bold,
                fontSize = 24.sp,
                color = PrimaryText,
            )
            GuideStep(
                number      = "1",
                title       = "Browse the library",
                description = "Open the Library tab to discover community decks. Tap Download to save a deck to your phone.",
            )
            GuideStep(
                number      = "2",
                title       = "Create with AI",
                description = "Ask Claude or ChatGPT to generate a myFlashCard JSON deck on any topic and save the file to your phone.",
            )
            GuideStep(
                number      = "3",
                title       = "Load from file",
                description = "Tap \"Load from file\" below, pick any .json file from your phone, and start swiping.",
            )
        }

        HorizontalDivider(thickness = 1.dp, color = DividerColor)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(CardSurface)
                .padding(horizontal = 24.dp, vertical = 16.dp)
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
