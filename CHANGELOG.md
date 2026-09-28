# Changelog

All notable changes to myFlashCard are documented here.
Format: [Semantic Versioning](https://semver.org) — `MAJOR.MINOR.PATCH`.

---

## [Unreleased]

### Added
- User accounts (2.0 Phase A): register with alias + email, email verification, login, password reset, change password, delete account; account pages on the website; "Log in" / alias in the nav
- Admin access through an admin user account (the `ADMIN_EMAIL` account becomes admin once verified); the old admin password still works during the transition
- Admin Members page: search members, grant or remove Premium and Claude AI access, delete members
- Privacy policy rewritten for accounts and AI generation
- AI deck generation backend (2.0 Phase B): Gemini (REST) and Claude (Anthropic SDK, `claude-opus-5` by default with structured JSON output and Anthropic's refusal fallback); every result is validated against the deck format and the category schema, with one automatic retry
- Monthly AI tokens: 5 for free members, 15 for premium (configurable); spent only when a valid deck comes back; ledger ready for purchased tokens later
- `/ai/options`, `/ai/generate`, `/me/generations` (history, view, delete)
- Launch switches on the admin Premium page: **Member accounts** and **AI generation** (both Inactif by default). While off, the site looks like v1: no Create page/tab, no Log in, registration closed, how-to shows only the manual method, AI Card hidden from the admin menu, and the backend refuses registration and AI requests. AI can only be on while accounts are on
- Mistral as a third AI provider, through a generic OpenAI-compatible adapter (API address editable in AI Card)
- Create page on the website (2.0 Phase C): pick a deck type, describe it, choose the AI, see tokens left; preview the result, download the JSON, add it to My Decks; history of your AI decks
- Create tab in the iPhone web app: generated decks open in the card viewer and are saved to My Decks
- How-to page reworked into "Generate with AI" and "Do it manually"; "Create" in the site nav
- Admin AI Card page: API keys (stored encrypted with `SECRETS_KEY`, shown masked), model, tokens per deck, enable/default, a Test button, monthly allowances, and recent generations for moderation; Members page shows tokens used this month
- `auto-deploy.yml`: on push to `main`, backend and frontend deploy to Render once their tests pass (only the part that changed). Render's own auto-deploy is turned off in `render.yaml`

### Fixed
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
