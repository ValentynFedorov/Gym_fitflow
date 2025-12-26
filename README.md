# FitFlow OS

FitFlow OS is a full‑stack, real‑time gym management platform with:

- Smart attendance (QR / check‑in / check‑out, live occupancy via WebSockets)
- Gamification (XP, levels, leaderboard, “Wrapped” monthly report)
- Role‑based dashboards for **Admin**, **Trainer**, and **Client**
- Class booking and equipment management
- Cinematic 3D hero (React Three Fiber) on the marketing/auth landing page

Monorepo layout:

- `apps/api` – NestJS + Prisma + PostgreSQL + Redis + Socket.io
- `apps/web` – Next.js 14 App Router + TypeScript + Tailwind + Recharts + R3F

---

## 1. Prerequisites

- Node.js 18+ (recommended) and npm
- Docker + Docker Compose (for Postgres + Redis)
- Git

---

## 2. Clone & install

```bash
git clone <your-repo-url> fitflow-os
cd fitflow-os

npm install
```

---

## 3. Environment variables

Copy the example env (if present) or create `.env` in the repo root:

```bash
cp .env.example .env
```

Minimum variables (adjust as needed):

```bash
# API
PORT=3001
API_PREFIX=/api/v1

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fitflow_os?schema=public

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=super-secret-access
JWT_REFRESH_SECRET=super-secret-refresh
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

---

## 4. Start infrastructure (Postgres + Redis)

From the repo root:

```bash
docker compose up -d
```

This will start:

- Postgres on `localhost:5432`
- Redis on `localhost:6379`

---

## 5. Prisma setup & seed

Generate the Prisma client and seed demo data:

```bash
npx prisma generate
npm run seed
```

The seed creates demo users, zones, classes, equipment, visits, XP, etc.

Demo accounts:

- Admin:   `admin@fitflow.local` / `admin123`
- Trainer: `trainer@fitflow.local` / `trainer123`
- Client:  `client@fitflow.local` / `client123`

---

## 6. Run the backend (API)

In the repo root:

```bash
npm run dev:api
```

This runs NestJS on:

- `http://localhost:3001/api/v1` – REST API
- `http://localhost:3001` – Socket.io server (for occupancy + admin events)

---

## 7. Run the frontend (Web)

In another terminal:

```bash
npm run dev:web
```

Next.js will start on:

- `http://localhost:3000`

Key routes:

- `/` – Landing + login/signup entry
- `/login` – Login & signup (choose role: ADMIN / TRAINER / CLIENT)
- `/admin` – Admin dashboard or Trainer console (depends on logged‑in role)
- `/client` – Client overview (XP + pass)
- `/client/classes` – Client class booking
- `/dashboard/wrapped` – “FitFlow Wrapped” monthly report

---

## 8. Typical flows

- **Admin**
  - Login with admin account.
  - Visit `/admin` for stats, occupancy, top clients, events and recent visits.
  - Manage classes via `/admin/classes`, equipment via `/admin/equipment`.

- **Trainer**
  - Login with trainer account.
  - `/admin` shows *Trainer Console*:
    - “My upcoming classes” tile with bookings chart.
    - Live occupancy + global leaderboard.
  - Equipment status visible at `/admin/equipment` (read‑only).

- **Client**
  - Login with client account.
  - `/client` – XP ring + “My Pass”.
  - `/client/classes` – book/cancel upcoming classes.
  - `/dashboard/wrapped` – personal monthly summary.

---

## 9. Useful scripts

From the repo root:

```bash
# Run API only
npm run dev:api

# Run Web only
npm run dev:web

# Re-run seed (will clear & repopulate demo data)
npm run seed
```

---

## 10. Troubleshooting

- Make sure Docker containers are running:

  ```bash
  docker compose ps
  ```

- If Prisma complains about the database, re‑run:

  ```bash
  npx prisma generate
  npm run seed
  ```

- If frontend cannot reach API, confirm API is on `http://localhost:3001` and `.env` matches.
