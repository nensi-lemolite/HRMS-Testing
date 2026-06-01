# HRMS — Multi-Country (India + Qatar)

A Human Resource Management System for IT companies, supporting India and Qatar with a country-strategy pattern that makes adding new countries straightforward.

## Stack
- **Backend:** Node.js + Express + MongoDB (Mongoose)
- **Frontend:** React + Vite + React Router
- **Auth:** JWT
- **Architecture:** Country profile modules (`server/src/countries/{india,qatar}/`) injected into every domain operation via a resolver middleware.

## Project Layout
```
HRMS/
├── client/         React + Vite SPA
└── server/         Express API
    └── src/countries/   ← country-strategy layer (payroll, leave, holidays, compliance)
```

## Run locally

### Prerequisites
- Node.js ≥ 18
- MongoDB running locally (or a Mongo Atlas URI)

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

## First-time setup
1. Open http://localhost:5173 → click **Register your company**.
2. Fill company name, pick default country, enable India + Qatar.
3. You're logged in as **SUPER_ADMIN**.
4. Add employees in either country — country-specific fields (PAN/Aadhaar for IN, QID/Visa for QA) appear automatically.
5. Use the **country switcher** in the top-bar to toggle data view.

## Build phases
- **Phase 1 — Foundation** ✅ (this) — Auth, RBAC, country layer, employees CRUD, dashboard shell
- **Phase 2 — Time** — Attendance, leave, holidays
- **Phase 3 — Payroll** — Payroll runs, payslips, WPS file (Qatar), Form 16 (India)
- **Phase 4 — Extras** — Recruitment, performance, reports
