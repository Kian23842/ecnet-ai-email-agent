# Changelog — ECNET AI Email Agent v2 (PHP/MySQL)

All notable changes to this project are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

---

## [2.0.0] — 2026-04-20
### 🚀 Initial Release — PHP/MySQL Architecture (Migration from Firebase)

#### Architecture Changes
- **Replaced** Firebase/Firestore with **MySQL 8.x** relational database
- **Replaced** Node.js/Express backend with **PHP 8.2 REST API**
- **Replaced** Firebase Auth with PHP session tokens (bcrypt cost-12 + AES-256 token storage)
- **Replaced** Firestore `onSnapshot` real-time listeners with **15-second HTTP polling** (`usePolling` hook)
- **Kept** React 19 + Vite 6 + Tailwind CSS v4 frontend unchanged
- **Kept** Google Gemini AI integration (now via PHP cURL to Gemini REST API)
- **Kept** Gmail OAuth2 integration (now via PHP cURL, no googleapis npm)

#### Backend — PHP Library Classes (`lib/`)
- `lib/Database.php` — PDO singleton with query helper and UUID v4 generator
- `lib/Response.php` — Standardized JSON response envelope (`success`, `error`)
- `lib/Encryption.php` — AES-256-CBC token encryption for OAuth credential storage
- `lib/Auth.php` — Session-based auth with bcrypt verification, `requireAuth()`, `requireAdmin()` guards
- `lib/GeminiClient.php` — Gemini REST API via cURL; `classifyEmail()` and `generateDraft()` with persona system
- `lib/GmailClient.php` — Gmail OAuth2 flow, token exchange/refresh, message list/fetch/send, MIME body extraction

#### Backend — PHP API Endpoints (`api/`)
- `POST /api/auth/login` — credential validation, session token issuance
- `POST /api/auth/logout` — session token invalidation
- `GET  /api/auth/me` — authenticated user profile
- `POST /api/gmail/connect` — generate Gmail OAuth2 authorization URL
- `GET  /api/gmail/callback` — OAuth code exchange, encrypted token storage
- `POST /api/gmail/sync` — fetch 20 messages per Gmail account, auto-refresh expired tokens
- `POST /api/gmail/send` — send draft via Gmail API, mark as sent
- `POST /api/ai/classify` — Gemini email classification (category/urgency/sentiment/summary)
- `POST /api/ai/draft` — Gemini reply draft generation with 5 built-in personas
- `GET  /api/messages` — paginated messages with classifications and drafts joined
- `PUT  /api/drafts/{id}` — inline draft text/status update
- `DELETE /api/drafts/{id}` — draft removal
- `GET  /api/admin/users` — list all users (admin only)
- `POST /api/admin/users` — create user with auto-generated temp password
- `PUT  /api/admin/users/{id}` — update user fields/status/password
- `DELETE /api/admin/users/{id}` — delete user
- `GET  /api/admin/organizations` — list orgs with user counts
- `POST /api/admin/organizations` — create organization
- `DELETE /api/admin/organizations/{id}` — cascade-delete organization
- `GET  /api/admin/gcp/{orgId}` — get GCP config (never exposes client_secret)
- `POST /api/admin/gcp` — save encrypted GCP OAuth credentials
- `DELETE /api/admin/gcp/{orgId}` — remove GCP config

#### Database (`schema/schema.sql`)
- `organizations` — multi-tenant root table
- `users` — bcrypt passwords, org-scoped
- `sessions` — 64-byte random hex tokens with expiry
- `gcp_configs` — per-org AES-256 encrypted GCP OAuth credentials
- `gmail_accounts` — connected Gmail mailboxes (encrypted tokens)
- `messages` — synced Gmail messages with MIME body
- `classifications` — Gemini AI analysis results (category/urgency/sentiment/confidence)
- `personas` — custom tone personas per org
- `drafts` — AI-generated reply drafts with status lifecycle

#### Frontend — React 19 (`src/`)
- `src/api/client.ts` — Axios client replacing `firebase.ts`; auto Bearer token injection; global 401 handler
- `src/hooks/useAuth.ts` — Auth state with token validation on mount
- `src/hooks/usePolling.ts` — Generic polling hook replacing Firestore `onSnapshot`
- `src/types.ts` — Complete TypeScript interfaces for all MySQL entities
- `src/components/Login.tsx` — Glassmorphism login with Framer Motion animations
- `src/App.tsx` — Route guard: Login / MainDashboard / AdminDashboard
- `src/MainDashboard.tsx` — 3-pane inbox: Gmail sync, AI classify/draft, inline edit, send
- `src/AdminDashboard.tsx` — Admin panel: org/user CRUD, temp password display, GCP credential manager

#### Security Implemented
- bcrypt cost-12 for all passwords
- AES-256-CBC encryption for all OAuth tokens stored in MySQL
- 64-byte cryptographically random session tokens
- Parameterized SQL queries only (zero string interpolation)
- `organization_id` scoping on all tenant data queries
- Admin guard (`requireAdmin()`) on all `/api/admin/*` endpoints
- `.env` excluded from git; content file protection via `.htaccess`

#### Tooling
- `seed.php` — creates default org + admin user from `.env` values
- `.env.example` — safe template for environment variables
- `.htaccess` — Apache SPA + API routing
- `vite.config.ts` — proxy `/api/*` to PHP dev server on port 8000

---

## Build Phases Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Project Scaffold (dirs, package.json, configs) | ✅ Complete |
| 2 | Database Schema (`schema.sql`) | ✅ Complete |
| 3 | PHP Library Classes (`lib/`) | ✅ Complete |
| 4 | PHP API Endpoints (`api/`) | ✅ Complete |
| 5 | PHP Dev Server Test | ⏳ Pending (needs `.env` + MySQL) |
| 6 | Database Seed (`seed.php`) | ✅ Complete (script ready) |
| 7 | React Frontend (types, hooks, client, Login, App) | ✅ Complete |
| 8 | MainDashboard + AdminDashboard | ✅ Complete |
| 9 | Integration Test Checklist | ⏳ Pending |
| 10 | Production Build | ⏳ Pending |

---

*Document version: 1.0 — Generated 2026-04-20*  
*Target stack: PHP 8.2 · MySQL 8.x · React 19 · Vite 6 · Tailwind CSS 4 · Gemini 2.5 Pro*
