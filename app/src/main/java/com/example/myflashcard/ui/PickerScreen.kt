package com.example.myflashcard.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun PickerScreen(
    onLoadFile: () -> Unit,
    errorMessage: String?
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(AppBackground),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(20.dp),
            modifier = Modifier
                .padding(horizontal = 40.dp)
                .widthIn(max = 400.dp)
        ) {
            Text(
                text = "Cards",
                fontFamily = FontFamily.Serif,
                fontSize = 48.sp,
                color = PrimaryText
            )

            Text(
                text = "Load a JSON card file from your storage to get started.",
                fontSize = 15.sp,
                color = DimText,
                textAlign = TextAlign.Center,
                lineHeight = 22.sp
            )

            Spacer(modifier = Modifier.height(4.dp))

            Button(
                onClick = onLoadFile,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = DefaultAccent),
                contentPadding = PaddingValues(horizontal = 28.dp, vertical = 14.dp)
            ) {
                Text(
                    text = "Load card file",
                    fontSize = 16.sp,
                    color = CardSurface
                )
            }

            if (errorMessage != null) {
                Text(
                    text = errorMessage,
                    fontSize = 14.sp,
                    color = androidx.compose.ui.graphics.Color(0xFFB22222),
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .background(
                            color = androidx.compose.ui.graphics.Color(0xFFB22222).copy(alpha = 0.08f),
                            shape = RoundedCornerShape(8.dp)
                        )
                        .padding(horizontal = 16.dp, vertical = 10.dp)
                )
            }
        }
    }
}
