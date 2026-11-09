# IGNITRON 2K26 — CODE RELAY

> Production-grade competitive programming tournament platform engineered for offline university team code relay competitions.

---

## 1. Project Overview

**IGNITRON 2K26 — Code Relay** is a specialized competitive programming platform designed to orchestrate real-time, multi-team coding relay tournaments (20+ teams). During the competition, team members take turns writing, debugging, and passing code to solve algorithmic challenges across multiple progressive rounds under strict time constraints.

The platform is designed to operate seamlessly over a local area network (LAN) hosted on a dedicated workstation server (Dell G15 laptop) without external cloud or internet dependencies during live tournament events.

---

## 2. Key Features

- **External Registration & Secure Account Management:**
  - Import external participant rosters via dynamic Unstop CSV column mapping.
  - Automatic generation of secure temporary team credentials with forced first-login password updates.
- **Single-Active-Participant Session Mutex:**
  - Strict database-backed session lock preventing simultaneous logins by multiple team members.
  - Smooth relay handovers between team members with immediate mutex release on logout.
- **Authoritative Competition Control Engine:**
  - 8-stage state machine (`STANDBY` &rarr; `ROUND_1` &rarr; `ROUND_1_EVALUATION` &rarr; `ROUND_2` &rarr; `ROUND_2_EVALUATION` &rarr; `ROUND_3` &rarr; `FINAL_EVALUATION` &rarr; `COMPLETED`).
  - Server-authoritative timer synchronized to backend clocks, preventing client manipulation.
  - Pause and resume controls that preserve exact remaining duration.
  - Progressive team shortlisting (Top 50% advance from Round 1 to Round 2; finalists advance to Round 3).
- **Persistent Shared Team Workspace:**
  - Integrated **CodeMirror 6** editor with syntax highlighting for C++17, Java, Python, and JavaScript.
  - Line numbers, bracket matching, active line highlighting, tab indentation, and dark theme.
  - Debounced autosave (~800ms) with optimistic concurrency version conflict detection (HTTP 409).
  - Seamless Relay handover: Participant A writes & saves code, logs out; Participant B logs in and sees identical code and language state.
- **Code Execution Sandbox:**
  - Self-hosted **Judge0 CE** integration via local Docker Compose.
  - Synchronous compilation, execution, and error diagnostics for C++, Java, Python, and JavaScript.
  - CPU, wall-clock, and memory limit enforcement with automated development fallback.

---

## 3. Technology Stack

### Frontend (`apps/frontend`)
- **Framework:** React 18 (SPA)
- **Build Tool:** Vite 6
- **Language:** TypeScript 5 (Strict Mode)
- **Styling:** Tailwind CSS + PostCSS
- **Routing:** React Router DOM (v6)
- **State & Data Fetching:** TanStack Query (v5)
- **Code Editor:** CodeMirror 6 (`@uiw/react-codemirror`)
- **Icons:** Lucide React

### Backend (`apps/backend`)
- **Framework:** NestJS 10 (Modular Monolith)
- **Language:** TypeScript 5
- **Architecture:** REST APIs with global `/api` prefix, centralized error filters, and interceptors
- **Authentication:** Passport JWT with role-based access guards and `HttpOnly` cookie tokens
- **Configuration:** `@nestjs/config`
- **Database ORM:** Prisma ORM 6 (`@prisma/client`)

### Database (`infrastructure/mysql`)
- **Engine:** MySQL 8.0 Community Edition
- **Migration & Schema:** Prisma Migrations with versioned migration history and idempotent seeds

### Code Execution Engine (`infrastructure/judge0`)
- **Engine:** Judge0 CE (v1.13.1) deployed via Docker Compose (Server, Workers, PostgreSQL, Redis)

### Shared Package (`packages/shared`)
- Common TypeScript types, DTO contracts, language definitions, and competition metadata shared across frontend and backend.

---

## 4. Repository Structure

```text
IGNITRON-2K26/
├── apps/
│   ├── frontend/                     # React 18 + Vite SPA
│   │   ├── src/
│   │   │   ├── components/           # Reusable UI components (Navbar, StatusBadge, ProtectedRoute)
│   │   │   ├── context/              # AuthContext (JWT & session lifecycle)
│   │   │   ├── hooks/                # Custom hooks (useCompetition, useHealth)
│   │   │   ├── layouts/              # Root layout & page wrappers
│   │   │   ├── pages/                # Admin & Team views
│   │   │   │   ├── admin/            # Dashboard, Competition Control, Teams, CSV Import
│   │   │   │   └── team/             # Team Dashboard, Coding Workspace Preview
│   │   │   ├── services/             # API services (auth, admin, competition, workspace, execution)
│   │   │   ├── styles/               # Tailwind globals
│   │   │   ├── App.tsx               # Route definitions
│   │   │   └── main.tsx              # React DOM entry point
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── backend/                      # NestJS REST API Server
│       ├── prisma/
│       │   ├── schema.prisma         # Relational database schema
│       │   ├── seed.ts               # Official competition rounds seeder
│       │   └── migrations/           # Versioned migration history
│       ├── src/
│       │   ├── admin/                # Admin management & CSV import
│       │   ├── auth/                 # JWT auth & session mutex enforcement
│       │   ├── code-execution/       # Judge0 client & execution dispatcher
│       │   ├── common/               # Filters, interceptors, decorators
│       │   ├── competition/          # State machine, timers & shortlisting
│       │   ├── config/               # Environment configuration
│       │   ├── database/             # PrismaService & DatabaseModule
│       │   ├── health/               # Health probe endpoints
│       │   ├── workspace/            # Team workspace drafts & autosave
│       │   ├── app.module.ts         # Root NestJS module
│       │   └── main.ts               # Server bootstrap entry point
│       └── package.json
│
├── packages/
│   └── shared/                       # Shared domain types & contracts
│       ├── src/
│       │   └── index.ts              # Exported types & constants
│       └── package.json
│
├── infrastructure/
│   ├── mysql/                        # Optional MySQL Docker Compose
│   └── judge0/                       # Judge0 CE Docker Compose & config
│       ├── docker-compose.yml
│       ├── judge0.conf
│       └── README.md
│
├── docs/                             # Project documentation
│   ├── architecture.md               # Monorepo architecture overview
│   ├── PROJECT_STATUS.md             # Detailed implementation & test status
│   └── DELL-G15-HANDOFF.md           # Step-by-step Dell G15 setup guide
│
├── scripts/                          # Automated verification suites
│   ├── test-database.cjs             # Database connectivity & seed check
│   ├── test-phase03.cjs              # Auth & session mutex test suite
│   ├── test-phase04.cjs              # State machine & timer test suite
│   ├── test-phase05a.cjs             # Judge0 execution test suite
│   └── test-workspace-draft.cjs      # Shared workspace & handover suite
│
├── .env.example                      # Root environment template
├── .gitignore                        # Git exclusion rules
├── package.json                      # Monorepo root configuration
└── tsconfig.base.json                # Base TypeScript configuration
```

---

## 5. Quickstart & Installation

### Prerequisites
- **Node.js:** v20 LTS or v22 LTS
- **npm:** v10+
- **MySQL:** 8.0 Community Edition (running locally on port 3306)
- **Docker Desktop:** (Required for real Judge0 CE code execution)

### 1. Clone & Install
```powershell
git clone <PRIVATE_GITHUB_REPO_URL> IGNITRON-2K26
cd IGNITRON-2K26

# Install dependencies across all monorepo workspaces
npm install
```

### 2. Environment Configuration
Copy the template file to `.env`:
```powershell
cp .env.example .env
```

Configure `.env` with your local settings (database credentials, JWT secret, admin password).

### 3. Database Initialization
```powershell
# Deploy database migrations to MySQL
npm run db:deploy

# Seed official competition rounds
npm run db:seed
```

### 4. (Optional) Start Judge0 Code Execution Sandbox
```powershell
cd infrastructure/judge0
docker compose up -d
cd ../..
```

---

## 6. Development & Run Commands

| Command | Action |
| :--- | :--- |
| `npm run dev` | Builds shared package and concurrently runs backend (`:4000`) and frontend (`:5173`) |
| `npm run dev:backend` | Runs only the NestJS backend in watch mode |
| `npm run dev:frontend` | Runs only the Vite frontend dev server |
| `npm run build` | Compiles shared library, backend (`nest build`), and frontend (`vite build`) |
| `npm run lint` | Runs TypeScript type checking across all workspaces (`tsc --noEmit`) |
| `npm run db:deploy` | Applies pending Prisma migrations to the target database |
| `npm run db:seed` | Seeds official competition rounds |
| `npm run db:studio` | Opens Prisma Studio visual database inspector |
| `npm run test:db` | Verifies database connectivity and round seeding |

---

## 7. Application Access

Once started:
- **Public Landing Page:** `http://localhost:5173`
- **Team Login:** `http://localhost:5173/team/login`
- **Admin Login:** `http://localhost:5173/admin/login`
- **Backend API Base:** `http://localhost:4000/api`
- **Health Endpoint:** `http://localhost:4000/api/health`

---

## 8. Detailed Guides

For in-depth operational procedures, consult:
- **[DELL-G15-HANDOFF.md](docs/DELL-G15-HANDOFF.md):** Complete Windows, MySQL, Docker, and LAN setup walkthrough.
- **[PROJECT_STATUS.md](docs/PROJECT_STATUS.md):** Comprehensive phase deliverables, test results, and roadmap.
- **[infrastructure/judge0/README.md](infrastructure/judge0/README.md):** Detailed Judge0 configuration and execution limits.
