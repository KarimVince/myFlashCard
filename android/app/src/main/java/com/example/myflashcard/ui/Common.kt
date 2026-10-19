package com.example.myflashcard.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

val ErrorRed   = Color(0xFFB22222)
val SuccessTeal = Color(0xFF0F766E)

/** White rounded card with an optional title, used by account, AI settings and Create. */
@Composable
fun SectionCard(title: String? = null, modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = CardSurface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            if (title != null) {
                Text(title, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, color = PrimaryText)
            }
            content()
        }
    }
}

@Composable
fun ScreenTitle(text: String) {
    Text(text, fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold, fontSize = 24.sp, color = PrimaryText)
}

@Composable
fun Field(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    password: Boolean = false,
    email: Boolean = false,
    singleLine: Boolean = true,
    minLines: Int = 1,
    supporting: String? = null,
    enabled: Boolean = true,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        singleLine = singleLine,
        minLines = minLines,
        enabled = enabled,
        visualTransformation = if (password) PasswordVisualTransformation() else androidx.compose.ui.text.input.VisualTransformation.None,
        keyboardOptions = KeyboardOptions(
            keyboardType = when {
                password -> KeyboardType.Password
                email -> KeyboardType.Email
                else -> KeyboardType.Text
            },
        ),
        supportingText = supporting?.let { { Text(it, fontSize = 12.sp) } },
        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = DefaultAccent, focusedLabelColor = DefaultAccent),
        modifier = Modifier.fillMaxWidth(),
    )
}

@Composable
fun PrimaryButton(text: String, onClick: () -> Unit, enabled: Boolean = true, busy: Boolean = false, modifier: Modifier = Modifier.fillMaxWidth()) {
    Button(
        onClick = onClick,
        enabled = enabled && !busy,
        shape = RoundedCornerShape(10.dp),
        colors = ButtonDefaults.buttonColors(containerColor = DefaultAccent),
        modifier = modifier.heightIn(min = 46.dp),
    ) {
        if (busy) {
            CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp, color = CardSurface)
            Spacer(Modifier.width(10.dp))
            Text("Please wait…", color = CardSurface)
        } else {
            Text(text, color = CardSurface, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
fun SecondaryButton(text: String, onClick: () -> Unit, enabled: Boolean = true, color: Color = DefaultAccent) {
    OutlinedButton(onClick = onClick, enabled = enabled, shape = RoundedCornerShape(10.dp)) {
        Text(text, color = if (enabled) color else DimText, fontSize = 14.sp)
    }
}

enum class NoticeKind { ERROR, SUCCESS, INFO }

@Composable
fun Notice(text: String, kind: NoticeKind) {
    val color = when (kind) {
        NoticeKind.ERROR -> ErrorRed
        NoticeKind.SUCCESS -> SuccessTeal
        NoticeKind.INFO -> Color(0xFF92400E)
    }
    Text(
        text = text,
        fontSize = 14.sp,
        color = color,
        modifier = Modifier
            .fillMaxWidth()
            .background(color.copy(alpha = 0.08f), RoundedCornerShape(8.dp))
            .padding(horizontal = 12.dp, vertical = 10.dp),
    )
}

/** Small rounded label, e.g. a Premium level. */
@Composable
fun Badge(text: String, color: Color = DefaultAccent) {
    Text(
        text = text,
        fontSize = 11.sp,
        fontWeight = FontWeight.SemiBold,
        color = color,
        modifier = Modifier
            .background(color.copy(alpha = 0.1f), RoundedCornerShape(4.dp))
            .padding(horizontal = 7.dp, vertical = 3.dp),
    )
}

/** Top bar for sub-screens (Account, AI settings) with a back action. */
@Composable
fun BackBar(title: String, onBack: () -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .background(CardSurface)
            .padding(horizontal = 4.dp, vertical = 4.dp),
    ) {
        TextButton(onClick = onBack) { Text("‹ Back", color = DefaultAccent, fontSize = 15.sp) }
        Text(title, fontWeight = FontWeight.SemiBold, fontSize = 17.sp, color = PrimaryText)
    }
    HorizontalDivider(thickness = 1.dp, color = DividerColor)
}
