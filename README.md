<div align="center">
  <img src="docs/icon.svg" width="140" alt="myFlashCard icon" />
  <h1>myFlashCard</h1>
  <p><strong>Offline flash-card viewer for Android</strong></p>
  <p>Load any JSON card deck — training plans, recipes, study notes — and flip through it on your phone, no internet required.</p>

  <a href="https://play.google.com/store/apps/details?id=com.willygo.myflashcard">
    <img src="https://img.shields.io/badge/Google%20Play-Available-brightgreen?logo=google-play&logoColor=white" alt="Google Play"/>
  </a>
  <img src="https://img.shields.io/badge/Android-7.0%2B-blue?logo=android&logoColor=white" alt="Android 7.0+"/>
  <img src="https://img.shields.io/badge/No%20login-No%20data%20collected-orange" alt="Privacy"/>
</div>

---

## ✨ Features

- 📂 **Load any card deck** — pick a JSON file from your phone's storage
- 🃏 **Swipe or tap** to navigate between cards
- 🎨 **Rich card blocks** — tables, numbered steps, stats tiles, notes, images
- 🌈 **Per-deck colour themes** — each deck can have its own accent colours
- 📴 **Fully offline** — no internet, no account, no tracking

---

## 🚀 How to Use

### Step 1 — Create a card deck with an AI tool

Open [Claude](https://claude.ai), [ChatGPT](https://chat.openai.com) or any AI assistant and ask it to generate a card deck in the myFlashCard JSON format.

**Example prompt:**
> *"Create a myFlashCard JSON deck for a 4-week beginner running plan. Use table blocks for each week's sessions and a note block at the top with the goal."*

The AI will produce a JSON file following this structure:

```json
{
  "deckTitle": "My Card Deck",
  "accentColor": "#A6543C",
  "cards": [
    {
      "title": "Card Title",
      "subtitle": "Optional subtitle",
      "blocks": [
        {
          "type": "note",
          "text": "A highlighted note or goal.",
          "accentColor": "#7A2E3A"
        },
        {
          "type": "table",
          "heading": "Session plan",
          "accentColor": "#3E7CB1",
          "columns": ["#", "Exercise"],
          "rows": [
            ["1", "Warm up 5 min"],
            ["2", "Run 20 min easy pace"],
            ["3", "Cool down 5 min"]
          ]
        },
        {
          "type": "steps",
          "heading": "Tips",
          "style": "bullet",
          "items": ["Stay hydrated", "Keep a steady pace", "Stretch after"]
        }
      ]
    }
  ]
}
```

**Supported block types:**

| Type | Description |
|------|-------------|
| `note` | Bold centred text — goals, warnings, key concept |
| `stats` | Row of stat tiles (e.g. Prep time · Serves · Calories) |
| `table` | Table with coloured header and striped rows |
| `steps` | Numbered or bulleted list |
| `text` | Plain paragraph |
| `image` | Placeholder (local files not yet supported) |

---

## 📚 Card Deck Categories

Each category below shows the recommended JSON structure and links to a ready-made example file you can load directly into the app or use as a template.

---

### 🍳 Recipe

Use `stats` for cook time / servings, `steps` for ingredient list and method, `note` for a tip.

<details>
<summary>JSON template</summary>

```json
{
  "deckTitle": "My Recipe Book",
  "accentColor": "#A6543C",
  "cards": [
    {
      "title": "Pasta Carbonara",
      "subtitle": "Classic Italian",
      "blocks": [
        {
          "type": "stats",
          "items": [
            { "label": "Prep", "value": "10 min" },
            { "label": "Cook", "value": "20 min" },
            { "label": "Serves", "value": "2" }
          ]
        },
        {
          "type": "steps",
          "heading": "Ingredients",
          "style": "bullet",
          "items": ["200g spaghetti", "100g guanciale", "2 eggs", "50g Pecorino Romano", "Black pepper"]
        },
        {
          "type": "steps",
          "heading": "Method",
          "style": "number",
          "items": [
            "Cook pasta in salted water until al dente.",
            "Fry guanciale in a dry pan until crispy.",
            "Mix eggs and cheese in a bowl.",
            "Combine hot pasta with guanciale off the heat.",
            "Add egg mixture, toss quickly. Serve immediately."
          ]
        },
        {
          "type": "note",
          "text": "Never add cream! The creaminess comes only from eggs and cheese."
        }
      ]
    }
  ]
}
```
</details>

**Example file:** [`design-reference/examples/`](design-reference/examples/)

---

### 🏋️ Training Plan

Use `table` for weekly sessions, `note` for the goal, `stats` for duration / sets / reps.

<details>
<summary>JSON template</summary>

```json
{
  "deckTitle": "4-Week Running Plan",
  "accentColor": "#2E5E2E",
  "cards": [
    {
      "title": "Week 1 — Foundation",
      "subtitle": "Build the base",
      "blocks": [
        {
          "type": "note",
          "text": "Goal: run 3× this week, keep a conversational pace. No speed work yet.",
          "accentColor": "#2E5E2E"
        },
        {
          "type": "stats",
          "items": [
            { "label": "Sessions", "value": "3" },
            { "label": "Long run", "value": "5 km" },
            { "label": "Total km", "value": "12 km" }
          ]
        },
        {
          "type": "table",
          "heading": "Weekly schedule",
          "accentColor": "#2E5E2E",
          "columns": ["#", "Session"],
          "rows": [
            ["1", "Easy run 3 km — Monday"],
            ["2", "Easy run 4 km — Wednesday"],
            ["3", "Long run 5 km — Saturday"]
          ]
        }
      ]
    }
  ]
}
```
</details>

**Example file:** [`design-reference/soobahkdo_v4.json`](design-reference/soobahkdo_v4.json)

---

### 📖 Study — Class Notes

Use one card per chapter. `note` for the key concept, `table` for dates/facts, `steps` for chronology or bullet points. Ideal for history, geography, sciences.

<details>
<summary>JSON template</summary>

```json
{
  "deckTitle": "La Seconde Guerre mondiale",
  "accentColor": "#1A3A5C",
  "cards": [
    {
      "title": "Chapitre 1 — Les origines",
      "subtitle": "1918 – 1933",
      "accentColor": "#1A3A5C",
      "blocks": [
        {
          "type": "note",
          "text": "Le traité de Versailles humilie l'Allemagne et prépare le terrain à la montée des extrêmes.",
          "accentColor": "#1A3A5C"
        },
        {
          "type": "table",
          "heading": "Causes principales",
          "accentColor": "#1A3A5C",
          "columns": ["Facteur", "Conséquence"],
          "rows": [
            ["Traité de Versailles", "Réparations lourdes, humiliation nationale"],
            ["Crise de 1929", "Chômage massif, montée des extrêmes"],
            ["Faiblesse de la SDN", "Incapacité à maintenir la paix"]
          ]
        },
        {
          "type": "steps",
          "heading": "Dates clés",
          "style": "number",
          "accentColor": "#1A3A5C",
          "items": [
            "1919 — Traité de Versailles",
            "1929 — Crise économique mondiale",
            "1933 — Hitler chancelier"
          ]
        }
      ]
    }
  ]
}
```
</details>

**Full example (10 chapters — Terminale):** [`design-reference/examples/history-ww2-terminale.json`](design-reference/examples/history-ww2-terminale.json)

---

### 🎵 Song Lyrics

One card per song. `stats` for artist / year / genre, `note` for the song description, `steps` with `"style": "bullet"` for each section (verse, chorus, bridge). Use the `heading` field to label each section.

<details>
<summary>JSON template</summary>

```json
{
  "deckTitle": "My Playlist",
  "accentColor": "#7C3AED",
  "cards": [
    {
      "title": "Song Title",
      "subtitle": "Artist · Year",
      "accentColor": "#7C3AED",
      "blocks": [
        {
          "type": "stats",
          "items": [
            { "label": "Artist", "value": "Artist Name" },
            { "label": "Released", "value": "2024" },
            { "label": "Genre", "value": "Pop" }
          ]
        },
        {
          "type": "note",
          "text": "Brief description of the song's theme or story.",
          "accentColor": "#7C3AED"
        },
        {
          "type": "steps",
          "heading": "🎵 Verse 1",
          "style": "bullet",
          "accentColor": "#7C3AED",
          "items": [
            "Line 1 of verse",
            "Line 2 of verse",
            "Line 3 of verse",
            "Line 4 of verse"
          ]
        },
        {
          "type": "steps",
          "heading": "🎤 Chorus",
          "style": "bullet",
          "accentColor": "#5B21B6",
          "items": [
            "Chorus line 1",
            "Chorus line 2",
            "Chorus line 3"
          ]
        },
        {
          "type": "steps",
          "heading": "🎵 Bridge",
          "style": "bullet",
          "accentColor": "#6D28D9",
          "items": [
            "Bridge line 1",
            "Bridge line 2"
          ]
        }
      ]
    }
  ]
}
```
</details>

**Example file (APT · Die with a Smile · Espresso):** [`design-reference/examples/songs-top3.json`](design-reference/examples/songs-top3.json)

---

### Step 2 — Save the JSON file to your phone

Once the AI produces the JSON:

1. Copy the JSON text
2. Save it as a `.json` file (e.g. `running-plan.json`)
3. Transfer it to your phone — via **OneDrive**, **Google Drive**, **WhatsApp**, **email**, or USB cable into the **Downloads** folder

---

### Step 3 — Load the deck in the app

1. Open **myFlashCard** on your phone
2. Tap **"Load card file"**
3. Browse to your `.json` file and select it
4. Swipe left/right or use the **Prev / Next** buttons to navigate

That's it — your deck loads instantly, no account needed.

---

## 🔒 Privacy Policy

**Last updated: September 2025**
**Developer: WillYGO Incorporation**

### What data we collect

**None.** myFlashCard does not collect, store, transmit, or share any personal data whatsoever.

### How the app works

- All card decks are JSON files that **you create and load yourself** from your own device storage.
- The app reads the file you select and displays it on screen.
- **No data leaves your device.** The app makes no network requests of any kind.
- Nothing is stored on external servers — there are no servers.

### Permissions

| Permission | Why |
|---|---|
| **Storage / Files** | To let you pick a JSON card file from your phone using the system file picker |

No other permissions are requested or used.

### Third-party services

This app uses no analytics, no advertising SDKs, no crash-reporting tools, and no third-party services of any kind.

### Children's privacy

Because no data is collected, the app is safe for users of all ages.

### Changes to this policy

If we ever add features that affect data handling, this policy will be updated and the "Last updated" date will change.

### Contact

Questions? Email us at **support@willygo.com**

---

## 🛠 Building from source

```bash
git clone https://github.com/WillYGO/myFlashCard.git
cd myFlashCard
./gradlew assembleDebug
```

Requires Android Studio Meerkat or later, Android SDK 37.

---

<div align="center">
  <sub>Made with ❤️ by <a href="https://willygo.com">WillYGO Incorporation</a> · Hong Kong</sub>
</div>
