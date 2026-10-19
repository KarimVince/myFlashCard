# Changelog

All notable changes to myFlashCard are documented here.
Format: [Semantic Versioning](https://semver.org) — `MAJOR.MINOR.PATCH`.

---

## [Unreleased]

### Added — 2.1 (in progress)
- AI from a document: on Create, add a PDF, Word (.docx) or text file (.txt, .md, .csv); its text (up to about 12,000 characters, ~3,000 words) is sent with the description and the AI builds the deck from it. The file isn't stored. Scanned PDFs (images of pages) aren't supported yet
- Deck format: optional emoji **icons** (one per card, shown before the title; optional on stats) and a **chart** block — horizontal bars (`"style": "bar"`, scaled to the largest value) or progress bars (`"style": "progress"`, out of `max`, default 100), with optional heading and unit. Drawn by the website, web app and Android app (no images, works offline). The AI is told to use them sparingly and never to invent numbers; every value is checked. The JSON Schema page lists them and adds them to each copied prompt. Older Android versions show a chart as an "Unknown block" line

### Added
- Android 2.0 (Phase D): account icon in the header → log in, create account (while Member accounts is on), forgot password, profile, confirm-email reminder, change alias/password, log out, delete account; AI settings (plan, AI decks left, own API key: add/test/remove); "Do My Own" becomes **Create** — Generate with AI (admins always; Premium members while AI and Premium are on), saved to My Decks and opened, "Your AI decks" history, admins can add a deck to the public library; manual guide and Load from file unchanged. Library decks now load through the backend so premium decks open only for Silver, Gold and admins. Login token kept in app-private storage and excluded from backups. Version 2.0 (versionCode 2)
- User accounts (2.0 Phase A): register with alias + email, email verification, login, password reset, change password, delete account; account pages on the website; "Log in" / alias in the nav
- Admin access through an admin user account (the `ADMIN_EMAIL` account becomes admin once verified); the old admin password still works during the transition
- Admin Members page: search members, grant or remove Premium and Claude AI access, delete members
- Privacy policy rewritten for accounts and AI generation
- AI deck generation backend (2.0 Phase B): Gemini (REST) and Claude (Anthropic SDK, `claude-opus-5` by default with structured JSON output and Anthropic's refusal fallback); every result is validated against the deck format and the category schema, with one automatic retry
- Monthly AI tokens: 5 for free members, 15 for premium (configurable); spent only when a valid deck comes back; ledger ready for purchased tokens later
- `/ai/options`, `/ai/generate`, `/me/generations` (history, view, delete)
- Launch switches on the admin Premium page: **Member accounts** and **AI generation** (both Inactif by default). While off, the site looks like v1: no Create page/tab, no Log in, registration closed, how-to shows only the manual method, and the backend refuses registration and AI requests. AI can only be on while accounts are on
- Mistral as a third AI provider, through a generic OpenAI-compatible adapter (API address editable in AI Card)
- Groq as a fourth AI provider (free tier, `openai/gpt-oss-120b` by default — Groq retired `llama-3.3-70b-versatile`) through the same OpenAI-compatible adapter; off until a key is added in AI Card
- AI Card stays in the admin menu while AI generation is off, so provider keys can be set up and tested before launch
- Premium levels **Bronze / Silver / Gold**, set per member on the admin Members page (replaces the "premium" and "Claude AI" grants). AI generation is for Premium members only: Bronze uses their own API key, Silver gets 3 shared AI decks in total, Gold 10 per month (both editable in AI Card), and both can also add their own key. Premium library decks are for Silver and Gold
- Members' own API key (one provider): **Account → AI settings** to add, test, replace or remove it. Stored encrypted; generation uses the model set in AI Card; costs no shared decks
- Create page: choose "Our AI" or "Your key" when both are available; clear messages when AI isn't part of the plan or a key is needed
- The admin can always generate with AI — even with the AI or Premium switches off — with no limit
- Admin Members page: set the level, confirm a member's email, make or remove an admin (lets the admin password holder set up the new admin account without an email service)
- Library: logged-in members are told premium decks are for Silver and Gold; Silver and Gold can download them on the website and open them in the web app
- Admin: **Add to library** on a generated deck (Create page) — set title, description, language and Free/Premium; it's stored like an uploaded deck, credited to the admin's alias, and marked "in library" in the history
- Who sees what: **Create** and the AI part of **How to** are shown to admins always, and to logged-in members only while AI generation **and** Premium are on — never to visitors (they get the manual JSON method). Logging out also ends an admin-password session, so the **Admin** button disappears. The footer **Admin** link shows for visitors (to reach the admin-password login) and admins, not for other members. Account → **AI settings** is hidden from members while AI or Premium is off
- AI settings: the key test result shows right under the key (it was at the bottom of the card, off-screen on phones), with a plain explanation instead of the provider's raw error
- Create page on the website (2.0 Phase C): pick a deck type, describe it, choose the AI, see tokens left; preview the result, download the JSON, add it to My Decks; history of your AI decks
- Create tab in the iPhone web app: generated decks open in the card viewer and are saved to My Decks
- How-to page reworked into "Generate with AI" and "Do it manually"; "Create" in the site nav
- Admin AI Card page: API keys (stored encrypted with `SECRETS_KEY`, shown masked), model, tokens per deck, enable/default, a Test button, monthly allowances, and recent generations for moderation; Members page shows tokens used this month
- `auto-deploy.yml`: on push to `main`, backend and frontend deploy to Render once their tests pass (only the part that changed). Render's own auto-deploy is turned off in `render.yaml`

### Fixed
- Android: publishing an AI deck to the library no longer leaves a second copy — the phone's copy is kept under the library name, so the Library shows it as already downloaded (existing duplicates are cleaned up when the Create tab loads)
- Website: a member's Premium level is re-checked when they come back to the tab, so a change made in Members (e.g. Bronze → Silver) applies without logging out
- Website: an admin signed in with the admin password can download premium library decks (the backend now accepts it for premium deck content)
- Note blocks: the coloured side bar was positioned against the wrong element
- Admin "Sign out" now actually signs out (it cleared the wrong storage)
- Migration 005 no longer fails when the Game category already exists, which would have stopped the backend from starting

---

## [1.0.0] — 2026-09-28

First public release: Android app, website, iPhone web app and admin.

### Added
- Public website: home, deck library with JSON download, AI how-to guide, schema docs, privacy policy, app download page
- iPhone web app (PWA) at `/app`: Library and My Decks tabs, card viewer, decks saved on device
- FastAPI backend with PostgreSQL and object storage for deck JSON
- Admin: dashboard, upload, edit, manage, categories, app build uploads
- Global Premium toggle (Actif/Inactif) in admin, stored in new `app_settings` table (migration 006, inactive by default). While inactive, premium decks are hidden from the public API, website, web app and Android app, and all premium wording is removed; admins can still mark decks as premium
- `GET /settings` public endpoint; `GET /admin/settings` and `PATCH /admin/settings/premium` admin endpoints
- Admin sections: Premium, and AI Card placeholder (coming later)
- GitHub Actions CI workflow (`ci.yml`) — unit tests + debug build on every PR
- GitHub Actions deploy workflow (`deploy.yml`) — manual trigger, signed AAB → Play Store
- Monorepo structure: Android project moved to `android/` subfolder
- Unit test suite: `JsonParserTest`, `ColumnWeightsTest`, `AccentColorTest`, `DeckParseTest`
- `android/whatsnew/` directory for Play Store release notes

#### Android app
- Load any JSON flashcard deck from device storage
- Card viewer with swipe navigation and animated transitions
- Block types: note, stats (3-colour tiles), steps (bullet/numbered), table, text, image placeholder
- Optional `columnWeights` on table blocks for proportional column sizing
- Smart table column logic — narrow fixed width only for `#` index columns
- Accent colour system: block → card → deck fallback chain
- 4 deck categories: Recipe, Study (class notes), Training, Song (with lyrics structure)
- Example decks: WW2 history (French, Terminale level), song playlist
- App icon: teal flashcard design, all mipmap densities including adaptive
- PickerScreen banner: logo + app name + 3-step quick guide
- ViewerScreen: progress dots (≤12 cards) or bar (>12 cards), Prev/Next navigation
- Privacy policy (WillYGO Incorporation — no data collected)

---

[Unreleased]: https://github.com/KarimVince/myFlashCard/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/KarimVince/myFlashCard/releases/tag/v1.0.0
