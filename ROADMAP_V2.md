# myFlashCard — v2 Implementation Roadmap

> **For code agents:** This file is the single source of truth for the v2 architecture. Read it before starting any implementation work. Implementation happens stage by stage — only one stage is in scope at a time. GitHub deployment is **manual only** (no auto-deploy on push).

---

## Architecture Overview

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  Android App        │     │  Next.js Frontend     │     │  Supabase Storage   │
│  (Kotlin/Compose)   │────▶│  (Render Static Site) │────▶│  deck-json bucket   │
│  local + library    │     │  public + /admin       │     │  (CDN public URLs)  │
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
                                        │
                                        ▼
                             ┌──────────────────────┐
                             │  FastAPI Backend      │
                             │  (Render Web Service) │
                             └──────────────────────┘
                                        │
                                        ▼
                             ┌──────────────────────┐
                             │  PostgreSQL           │
                             │  (Render Database)    │
                             └──────────────────────┘
```

### Database choice: Render PostgreSQL (not Supabase DB)

Render DB is used instead of Supabase DB because:
- No user accounts → Row Level Security (Supabase's main advantage) is not needed
- Single platform for backend + DB simplifies ops and billing
- Supabase is kept only for Storage: it provides CDN-backed public URLs for JSON files,
  which is exactly what the public library needs

---

## Monorepo Structure

```
myFlashCard/
├── .github/
│   └── workflows/
│       ├── ci.yml                  # Runs tests on every PR — never deploys
│       └── deploy.yml              # workflow_dispatch only — no auto-deploy
│
├── android/                        # Existing Kotlin app (moved from root)
│   ├── app/
│   │   └── src/main/java/com/example/myflashcard/
│   ├── build.gradle.kts
│   └── local.properties            # git-ignored; never committed
│
├── frontend/                       # Next.js 14 web app
│   ├── app/
│   │   ├── page.tsx                # Home — app description + download links
│   │   ├── library/
│   │   │   └── page.tsx            # Public deck library (browse + download)
│   │   ├── how-to/
│   │   │   └── page.tsx            # AI creation guide
│   │   ├── schema/
│   │   │   └── page.tsx            # JSON schema docs + AI prompts per type
│   │   ├── policy/
│   │   │   └── page.tsx            # Privacy policy (moved from README)
│   │   └── admin/
│   │       ├── layout.tsx          # Auth gate (admin password)
│   │       ├── page.tsx            # Dashboard
│   │       ├── upload/page.tsx     # Upload + validate + submit JSON
│   │       ├── edit/[id]/page.tsx  # Deck editor — load, amend, re-upload
│   │       └── manage/page.tsx     # List all decks, toggle visibility, delete
│   ├── components/
│   ├── lib/
│   │   └── api.ts                  # Typed client for the backend API
│   ├── __tests__/
│   ├── package.json
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── decks.py            # Public deck endpoints
│   │   │   ├── categories.py       # Category list + schema + AI prompt
│   │   │   └── admin.py            # Admin-only CRUD
│   │   ├── models.py               # SQLAlchemy models
│   │   ├── schemas.py              # Pydantic request/response schemas
│   │   ├── db.py                   # Render PostgreSQL connection
│   │   ├── storage.py              # Supabase Storage client
│   │   ├── auth.py                 # Admin token verification
│   │   └── main.py                 # FastAPI app entry point
│   ├── tests/
│   │   ├── conftest.py             # Test DB + fixtures
│   │   ├── test_public_decks.py
│   │   ├── test_admin.py
│   │   └── test_categories.py
│   ├── alembic/                    # DB migrations
│   │   ├── env.py
│   │   └── versions/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── pytest.ini
│
├── shared/
│   └── schema/                     # JSON schema definitions (source of truth)
│       ├── recipe.schema.json
│       ├── study.schema.json
│       ├── training.schema.json
│       └── song.schema.json
│
├── design-reference/               # Existing example JSONs (unchanged)
│   └── examples/
│
├── ROADMAP_V2.md                   # This file
├── CHANGELOG.md
└── README.md
```

---

## Stage 1 — Release Engineering

**Target:** v1.x | **Effort:** 1–2 days | **Scope:** Android only

No new features. Infrastructure only.

### 1.1 Monorepo migration

Move the current Android project into `android/` at the repo root. Update all relative paths in `build.gradle.kts`, `local.properties`, and the GitHub workflow to reference `android/`.

### 1.2 Git branching strategy

| Branch | Purpose | Rules |
|--------|---------|-------|
| `main` | Production | Protected; requires PR + passing CI |
| `develop` | Integration | All features land here first |
| `feature/*` | New work | PR targets `develop` |
| `hotfix/*` | Urgent fixes | Branch from `main`; merge to `main` AND `develop` |

### 1.3 Semantic versioning

- Format: `MAJOR.MINOR.PATCH` — baseline `1.0.0`
- Single source: `appVersion` in `android/app/build.gradle.kts`
- Git tag on every release: `v1.0.0`, `v1.1.0`, etc.
- `versionCode` auto-incremented by CI (not manually edited)

### 1.4 CI workflow — `ci.yml`

Triggers: every PR to `develop` or `main`

```yaml
# .github/workflows/ci.yml
on:
  pull_request:
    branches: [develop, main]

jobs:
  android-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { java-version: '17', distribution: 'temurin' }
      - run: cd android && ./gradlew test          # unit tests
      - run: cd android && ./gradlew assembleDebug  # compile check

  backend-tests:                                    # Stage 2+ only
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: cd backend && pip install -r requirements.txt
      - run: cd backend && pytest --tb=short

  frontend-tests:                                   # Stage 2+ only
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd frontend && npm ci
      - run: cd frontend && npm test -- --watchAll=false
```

### 1.5 Deploy workflow — `deploy.yml`

**Triggered manually only** — `workflow_dispatch` in the GitHub Actions UI. No auto-deploy on any push or merge.

```yaml
# .github/workflows/deploy.yml
on:
  workflow_dispatch:
    inputs:
      target:
        description: 'What to deploy'
        required: true
        type: choice
        options: [android, backend, frontend, all]
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options: [staging, production]
        default: staging
```

Pre-deploy steps (always run first, regardless of target):
1. Run all test suites (same as CI)
2. If `backend` or `all`: run `alembic upgrade head` against the target DB
3. Only proceed to artifact build/upload if all checks pass

Android path: decode keystore → build signed AAB → upload to Play Store Internal Track (staging) or Production (production).

Backend path: Docker build → push to Render Web Service via deploy hook.

Frontend path: `next build` → deploy to Render Static Site.

### 1.6 Required GitHub Secrets

| Secret | Content |
|--------|---------|
| `KEYSTORE_BASE64` | `willygo-release.keystore` base64-encoded |
| `KEYSTORE_PASSWORD` | Keystore password |
| `KEY_ALIAS` | `willygo` |
| `KEY_PASSWORD` | Key password |
| `PLAY_STORE_JSON_KEY` | Google Play service account JSON |
| `RENDER_BACKEND_DEPLOY_HOOK` | Render webhook URL for backend service |
| `RENDER_FRONTEND_DEPLOY_HOOK` | Render webhook URL for frontend static site |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (write access to storage) |
| `DATABASE_URL` | Render PostgreSQL connection string |
| `ADMIN_PASSWORD_HASH` | bcrypt hash of admin panel password |

### 1.7 Test cases — Android (Stage 1)

All tests in `android/app/src/test/`. Run with `./gradlew test`.

| Test file | Cases |
|-----------|-------|
| `JsonParserTest.kt` | Parse each block type; verify field mapping; null optionals return null not blank |
| `ColumnWeightsTest.kt` | Table with `columnWeights` parses to `List<Float>`; table without falls back to null |
| `AccentColorTest.kt` | Card accent overrides deck accent; null card accent falls back to deck accent |
| `DeckParseTest.kt` | Full round-trip parse for each category (recipe, study, training, song) |

---

## Stage 2 — Web Frontend + Backend

**Target:** v2.0 | **Effort:** 3–4 weeks | **Requires:** Stage 1 complete

### 2.1 Frontend scope

The web app is a **content hub and admin tool**. No user accounts. No flashcard viewer.

#### Public pages

| Route | Purpose |
|-------|---------|
| `/` | App description, Android download link, overview of what the app does |
| `/library` | Browse all public decks by category; filter; download `.json` to use in app |
| `/how-to` | Step-by-step: pick a category → copy the AI prompt → paste in Claude/ChatGPT → get JSON → load in app or upload to library |
| `/schema` | Per-category: schema field reference + the exact AI prompt to produce valid JSON for that type |
| `/policy` | Privacy policy (moved from GitHub README) |
| `/admin` | Password-protected; all management functions below |

#### Admin pages (behind password gate)

| Route | Purpose |
|-------|---------|
| `/admin` | Dashboard: counts by category, recent uploads |
| `/admin/upload` | Drag-drop or select `.json` → client-side schema validation → submit to API |
| `/admin/edit/[id]` | Load deck from library; form-based editor for title, subtitle, accent, blocks; re-upload on save |
| `/admin/manage` | Table of all decks (including hidden); toggle public/hidden; delete |

**Deck editor scope:** form fields per block type — text inputs for Note/TextBlock, key-value rows for Stats, list items for Steps, column/row editor for Table. No code view needed. Changes are re-serialised to JSON and re-uploaded to Supabase Storage.

### 2.2 Backend API

Base URL: `https://api.myflashcard.app` (or Render-assigned URL)

#### Public endpoints (no authentication)

```
GET  /decks                       List public decks. Query: ?category=recipe&lang=fr
GET  /decks/{id}                  Deck metadata (not the JSON file itself)
GET  /decks/{id}/download         Redirect to Supabase Storage URL; increments download counter
GET  /categories                  All categories with slug, label, description, ai_prompt, schema
```

#### Admin endpoints (Authorization: Bearer {ADMIN_PASSWORD_HASH})

```
GET    /admin/decks               List all decks including hidden
POST   /admin/decks               Upload: multipart (json_file + metadata fields)
PUT    /admin/decks/{id}          Replace JSON file and/or update metadata
PATCH  /admin/decks/{id}/visibility   Body: { "is_public": true|false }
DELETE /admin/decks/{id}          Remove DB row + Supabase Storage file
```

### 2.3 Database schema (Render PostgreSQL)

```sql
-- Migration 001_initial.sql

CREATE TABLE categories (
    id           SERIAL PRIMARY KEY,
    slug         TEXT UNIQUE NOT NULL,   -- 'recipe' | 'study' | 'training' | 'song'
    label        TEXT NOT NULL,
    description  TEXT,
    ai_prompt    TEXT,                   -- copy-paste prompt for Claude/ChatGPT
    schema_json  JSONB                   -- the JSON schema for this type
);

CREATE TABLE decks (
    id            SERIAL PRIMARY KEY,
    category_id   INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
    title         TEXT NOT NULL,
    description   TEXT,
    author        TEXT,
    language      TEXT NOT NULL DEFAULT 'en',
    card_count    INTEGER,
    storage_path  TEXT NOT NULL,         -- path inside Supabase bucket
    public_url    TEXT NOT NULL,         -- full Supabase CDN URL
    is_public     BOOLEAN NOT NULL DEFAULT true,
    downloads     INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX decks_category_id_idx ON decks(category_id);
CREATE INDEX decks_is_public_idx   ON decks(is_public);
```

Seed `categories` with the 4 types (recipe, study, training, song) including their `ai_prompt` and `schema_json` values. These come from `shared/schema/*.schema.json`.

### 2.4 Supabase Storage

- Bucket name: `deck-json`
- Bucket policy: public read (anon), authenticated write (service role key only)
- Path pattern: `{category_slug}/{deck_id}.json`
- The backend holds the service role key; the frontend never touches Supabase directly

### 2.5 Android app changes

Keep existing local JSON loading completely unchanged. Add a **Library** tab to `PickerScreen`:

1. Calls `GET /decks` on open; shows list grouped by category with pull-to-refresh
2. Tap a deck card → call `GET /decks/{id}/download` → receive redirect → fetch JSON from Supabase URL → parse with existing `JsonParser` → open in `ViewerScreen`
3. "Save offline" button (optional) writes the JSON to internal storage with the deck title as filename, making it appear in the local file list
4. No sign-in required; the library is entirely public read

### 2.6 Test cases — Backend

File: `backend/tests/`. Run with `pytest`.

**`test_public_decks.py`**
- `test_list_returns_200` — GET /decks returns HTTP 200
- `test_list_only_public` — hidden decks do not appear in GET /decks
- `test_list_filter_by_category` — ?category=recipe returns only recipe decks
- `test_get_deck_fields` — response contains id, title, category, public_url, downloads
- `test_download_redirects` — GET /decks/{id}/download returns 302 with Location header
- `test_download_increments_counter` — downloads count increases by 1 after download call
- `test_get_nonexistent_returns_404`

**`test_admin.py`**
- `test_upload_requires_auth` — POST /admin/decks without token returns 401
- `test_upload_valid_json_returns_201` — valid JSON file + metadata → 201
- `test_upload_invalid_json_returns_422` — malformed JSON → 422 with error detail
- `test_upload_wrong_schema_returns_422` — JSON that doesn't match category schema → 422
- `test_update_metadata_works` — PUT updates title and returns 200
- `test_toggle_visibility` — PATCH is_public=false → deck disappears from public list
- `test_delete_removes_row_and_file` — DELETE → 204; subsequent GET returns 404; storage file gone

**`test_categories.py`**
- `test_all_4_categories_present` — GET /categories returns exactly 4 slugs
- `test_each_category_has_ai_prompt` — ai_prompt field is non-empty for all categories
- `test_each_category_has_schema` — schema_json field is a valid JSON object

### 2.7 Test cases — Frontend

File: `frontend/__tests__/`. Run with `jest` + `@testing-library/react`.

**`library.test.tsx`**
- Renders deck cards fetched from mocked API
- Category filter buttons change displayed decks
- Download button calls `GET /decks/{id}/download`
- Shows empty state when no decks match filter

**`admin-upload.test.tsx`**
- Rejects non-JSON file type before submit
- Validates JSON structure client-side and shows inline error
- Successful upload shows confirmation and clears form
- Unauthenticated access redirects to login

**`schema-docs.test.tsx`**
- Each category tab renders its AI prompt in a copyable code block
- Schema field table renders all expected columns

### 2.8 Environment variables

**Backend (set in Render Web Service env)**

```
DATABASE_URL=postgresql://...            # Render PostgreSQL
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=...
ADMIN_PASSWORD_HASH=...                  # bcrypt hash; never the plaintext
CORS_ORIGINS=https://myflashcard.app,http://localhost:3000
```

**Frontend (set in Render Static Site env)**

```
NEXT_PUBLIC_API_URL=https://api.myflashcard.app
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co   # public URL only, for direct file reads
```

### 2.9 Pre-deployment checklist

Before triggering `deploy.yml` for Stage 2:

- [ ] All backend tests pass locally: `cd backend && pytest`
- [ ] All frontend tests pass locally: `cd frontend && npm test -- --watchAll=false`
- [ ] Android tests pass: `cd android && ./gradlew test`
- [ ] DB migration applied to staging: `alembic upgrade head`
- [ ] Categories seed data inserted
- [ ] Supabase bucket `deck-json` created with correct policy
- [ ] All GitHub Secrets populated
- [ ] CORS_ORIGINS includes the deployed frontend URL
- [ ] Smoke test on staging: upload one JSON → appears in library → Android app fetches it

---

## Stage 3 — iOS (future, post-Stage 2 stable)

Decision at Stage 3 entry: **SwiftUI** (native, separate codebase, best iOS quality) vs **Flutter** (one codebase replaces both Android and iOS, but requires rewriting the Android app).

Both options connect to the same FastAPI backend. No schema changes required.

---

## Stage 4+ — Advanced Features (after iOS)

Deferred to a future version:
- Flashcard viewer on the web
- Spaced repetition (SM-2 algorithm)
- User accounts and personal libraries
- AI deck generator in-app (Claude API)
- Collaborative/shared decks
- Community ratings and comments
- Offline PWA (service worker)
- PDF or notes → deck via AI

---

## Deployment rules (enforced)

1. **No auto-deploy.** The `deploy.yml` workflow is `workflow_dispatch` only. Nothing deploys on push to any branch.
2. **Tests must pass before any deploy.** The deploy workflow runs the full test suite as its first step and exits on failure.
3. **Staging first.** Every deploy targets staging unless the operator explicitly selects `production` in the dispatch form.
4. **Keystore never in git.** `willygo-release.keystore` and `local.properties` remain in `.gitignore`. The keystore is stored only in the GitHub Secret `KEYSTORE_BASE64`.
5. **Admin password never in source.** Only the bcrypt hash is stored in env/secrets; the plaintext is never committed or logged.
