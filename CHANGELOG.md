# Changelog

All notable changes to myFlashCard are documented here.
Format: [Semantic Versioning](https://semver.org) — `MAJOR.MINOR.PATCH`.

---

## [Unreleased]

### Added
- GitHub Actions CI workflow (`ci.yml`) — unit tests + debug build on every PR
- GitHub Actions deploy workflow (`deploy.yml`) — manual trigger, signed AAB → Play Store
- Monorepo structure: Android project moved to `android/` subfolder
- Unit test suite: `JsonParserTest`, `ColumnWeightsTest`, `AccentColorTest`, `DeckParseTest`
- `android/whatsnew/` directory for Play Store release notes

---

## [1.0.0] — 2025-09-14

### Added
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
