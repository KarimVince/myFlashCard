package com.example.myflashcard.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.myflashcard.R

@Composable
fun PickerScreen(
    onLoadFile: () -> Unit,
    errorMessage: String?
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppBackground)
    ) {
        // ── Top banner ───────────────────────────────────────────────────────────
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .background(CardSurface)
                .padding(horizontal = 20.dp, vertical = 14.dp)
        ) {
            Image(
                painter = painterResource(id = R.drawable.app_logo),
                contentDescription = "myFlashCard",
                modifier = Modifier
                    .size(38.dp)
                    .clip(RoundedCornerShape(10.dp))
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = "myFlashCard",
                fontFamily = FontFamily.Serif,
                fontWeight = FontWeight.Bold,
                fontSize = 22.sp,
                color = PrimaryText
            )
        }
        HorizontalDivider(thickness = 1.dp, color = DividerColor)

        // ── Scrollable content ───────────────────────────────────────────────────
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 28.dp),
            verticalArrangement = Arrangement.spacedBy(28.dp)
        ) {
            // Section title
            Text(
                text = "How to get started",
                fontFamily = FontFamily.Serif,
                fontWeight = FontWeight.Bold,
                fontSize = 24.sp,
                color = PrimaryText
            )

            // Step 1
            GuideStep(
                number = "1",
                title = "Create a card deck with AI",
                description = "Open Claude or ChatGPT and ask it to generate a myFlashCard JSON deck on any topic — training plans, recipes, study notes, and more."
            )

            // Step 2
            GuideStep(
                number = "2",
                title = "Save the file to your phone",
                description = "Copy the JSON text into a .json file and transfer it via OneDrive, WhatsApp, email, or USB into your phone's Downloads folder."
            )

            // Step 3
            GuideStep(
                number = "3",
                title = "Load and start swiping",
                description = "Tap \"Load card file\" below, pick your .json file, then swipe left and right to navigate between cards."
            )

            if (errorMessage != null) {
                Text(
                    text = errorMessage,
                    fontSize = 14.sp,
                    color = Color(0xFFB22222),
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            color = Color(0xFFB22222).copy(alpha = 0.08f),
                            shape = RoundedCornerShape(8.dp)
                        )
                        .padding(horizontal = 16.dp, vertical = 10.dp)
                )
            }
        }

        // ── Sticky bottom button ─────────────────────────────────────────────────
        HorizontalDivider(thickness = 1.dp, color = DividerColor)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(CardSurface)
                .padding(horizontal = 24.dp, vertical = 18.dp)
        ) {
            Button(
                onClick = onLoadFile,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = DefaultAccent),
                contentPadding = PaddingValues(horizontal = 28.dp, vertical = 14.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "Load card file",
                    fontSize = 16.sp,
                    color = CardSurface
                )
            }
        }
    }
}

// ── Guide step row ─────────────────────────────────────────────────────────────

@Composable
private fun GuideStep(number: String, title: String, description: String) {
    Row(
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        // Numbered circle
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(36.dp)
                .background(DefaultAccent, shape = RoundedCornerShape(18.dp))
        ) {
            Text(
                text = number,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
        }

        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                text = title,
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                color = PrimaryText
            )
            Text(
                text = description,
                fontSize = 14.sp,
                lineHeight = 21.sp,
                color = DimText
            )
        }
    }
}
