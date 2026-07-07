# HRMS — India HRMS for IT Companies

A feature-rich Human Resource Management System built for Indian IT companies —
covering the full employee lifecycle (hire → onboard → work → grow → exit) with
an India-accurate statutory core, employee self-service, and a gamification layer
(points, badges, leaderboards, and rewards).

It runs on a **country-strategy** backend (India + Qatar profiles) so statutory
rules are injected per request; the product and UI are **India-first**.

## Highlights

- 🇮🇳 **India payroll & statutory** — PF, ESI, Professional Tax, TDS, gratuity; payslips and compliance exports (PF ECR, Form 16, Form 24Q, bank NEFT file).
- 🕒 **Time & leave** — attendance, regularization, timesheets, leave with accrual/carry-forward, holiday calendar.
- 👥 **Core HR** — employee master with India statutory identity (PAN/Aadhaar/UAN), org chart, documents.
- 🧩 **IT lifecycle** — recruitment (ATS), onboarding, **projects & bench** (allocation/utilization), and **offboarding with full & final settlement** (gratuity + leave encashment).
- 🎮 **Gamification** — My Space (ESS home with level/XP, coins, streaks, goals), Achievements badge wall, Leaderboard, Rewards store, and a Rewards admin console.
- 📊 **Analytics & RBAC** — reports/dashboards, 60+ granular permissions with role-aware, hide-not-disable navigation.
- 🎨 **Emerald theme** with light/dark support.

> Note: Core HR, attendance, leave, and payroll pages are API-backed. The
> gamification, projects, and offboarding modules currently render from
> front-end **dummy data** (`client/src/features/gamification/data.js`), so they
> can be previewed with no backend.

## Stack

- **Backend:** Node.js + Express + MongoDB (Mongoose), JWT auth
- **Frontend:** React 18 + Vite + React Router
- **Architecture:** Country profile modules (`server/src/countries/{india,qatar}/`) injected into every domain operation via a resolver middleware
- **Deploy:** Single-origin web service on Render (Express serves the built React SPA)

## Project layout

```
HRMS/
├── client/                         React + Vite SPA
│   ├── public/wireframes.html      Standalone clickable wireframe (all screens)
│   └── src/
│       ├── features/
│       │   ├── gamification/       My Space, Achievements, Leaderboard,
│       │   │                       Rewards store/admin, DemoShell, dummy data
│       │   ├── projects/           Projects & bench
│       │   └── exit/               Offboarding + full & final settlement
│       ├── components/Layout.jsx   Grouped, role-aware sidebar
│       └── styles/global.css       Design system (emerald theme)
└── server/
    └── src/countries/              country-strategy layer (payroll, leave, holidays, compliance)
```

## Run locally

### Prerequisites
- Node.js ≥ 18
- MongoDB running locally (or a MongoDB Atlas URI)

### Backend
```
cd server
cp .env.example .env       # edit MONGO_URI, JWT_SECRET
npm install
npm run dev                # http://localhost:5000
```

### Frontend
```
cd client
npm install
npm run dev                # http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:5000`.

## Preview the new modules (no backend needed)

Open **http://localhost:5173/demo** — a public, login-free page with tabs for
My Space, Achievements, Leaderboard, Rewards store/admin, Projects, and
Offboarding, all driven by dummy data. The static wireframe of every screen is
at **http://localhost:5173/wireframes.html**.

## First-time setup (full app)

1. Open http://localhost:5173 → click **Register your company**.
2. Fill company details and pick the default country (India).
3. You're logged in as **SUPER_ADMIN**.
4. Add employees — India statutory fields (PAN/Aadhaar/UAN) appear on the profile.
5. Explore the grouped sidebar: **Home** (My space, Dashboard), **People**, **Growth** (Projects, Offboarding), **Rewards** (Achievements, Leaderboard, store, admin), **More** (Reports, Roles, Settings).

## Deployment (Render)

The repo deploys as a **single web service** via the `render.yaml` blueprint —
Express serves the API and the built React client from the same origin.

- **Build:** `npm run render-build` (installs deps, builds the client)
- **Start:** `npm start`
- **Health check:** `/api/health`
- **Required env vars** (set in the Render dashboard, `sync: false`):
  - `MONGO_URI` — MongoDB Atlas connection string
  - `CLIENT_ORIGIN` — the public Render URL (`https://<service>.onrender.com`)

Pushing to `main` triggers an auto-deploy. Once live:
`https://<service>.onrender.com` (app), `/demo` (dummy-data preview),
`/wireframes.html` (wireframe).

## Roadmap

- **Phase 1 — Foundation** ✅ — Auth, RBAC, country layer, employee CRUD, dashboard
- **Phase 2 — Time** — Attendance, timesheets, leave, holidays
- **Phase 3 — Payroll & statutory (India)** — Payroll runs, payslips, PF/ESI/PT/TDS, gratuity, compliance exports
- **Phase 4 — Talent lifecycle** — Recruitment (ATS), onboarding, offboarding + full & final settlement
- **Phase 5 — Gamification & engagement** ✅ (front-end) — Points, badges, leaderboard, rewards; back this with real events/API next
- **Phase 6 — Analytics & platform** — Dashboards, exports, PWA/mobile
