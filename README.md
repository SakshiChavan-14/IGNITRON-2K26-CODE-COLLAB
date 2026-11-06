# IGNITRON 2K26 — CODE RELAY

> Production-oriented competitive programming platform engineered for university team code relay competitions.

---

## 1. Project Overview

**IGNITRON 2K26 — Code Relay** is a competitive programming event platform built to orchestrate real-time, multi-team coding relay tournaments (20+ teams). During the competition, team members take turns writing, debugging, and passing code to solve algorithmic challenges across multiple progressive rounds under strict time constraints.

The platform is designed to operate seamlessly over a local area network (LAN) hosted on a dedicated competition machine (Dell G15 laptop) without external cloud or internet dependencies.

---

## 2. Project Objectives

- **High Reliability in Offline/LAN Environments**: Zero hard dependencies on external paid SaaS or internet services during the live competition.
- **Strict Anti-Malpractice & Observability**: Real-time status polling, active team monitoring, and submission evaluation.
- **Predictable Local Performance**: Lean, responsive architecture designed to run on a local workstation server with minimal overhead.
- **Extensible Monorepo Architecture**: Clean separation between frontend, backend, and shared domain logic using TypeScript and npm workspaces.

---

## 3. Technology Stack

### Frontend (`apps/frontend`)
- **Framework**: React 18
- **Build Tool**: Vite 6
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM (v6)
- **Data Fetching / State**: TanStack Query (v5) — HTTP polling architecture
- **Editor**: CodeMirror 6 *(planned for Phase 04)*

### Backend (`apps/backend`)
- **Framework**: NestJS 10 (Modular Monolith)
- **Language**: TypeScript
- **Architecture**: REST API with global `/api` prefix, centralized error filters, and logging interceptors
- **Configuration**: `@nestjs/config`
- **Database Client**: Prisma ORM 6 (`@prisma/client`)

### Shared Domain Package (`packages/shared`)
- **Package**: `@ignitron/shared`
- Contains common API contracts, DTO types, and application metadata shared across frontend and backend.

### Database (`infrastructure/mysql`)
- **Engine**: MySQL 8.0 Community Edition
- **ORM**: Prisma ORM with automated migrations and seeders

### Code Execution Worker *(Later Phase)*
- Judge0 CE (Self-hosted via Docker Compose)

---

## 4. Repository Structure

```text
IGNITRON-2K26/
│
├── apps/
│   ├── frontend/                 # React 18 + Vite SPA
│   │   ├── public/               # Public assets
│   │   ├── src/
│   │   │   ├── assets/           # Static media assets
│   │   │   ├── components/       # Reusable UI components (StatusBadge, etc.)
│   │   │   ├── layouts/          # Root application layouts
│   │   │   ├── pages/            # View pages (StatusPage with live DB check)
│   │   │   ├── hooks/            # Custom hooks (useHealth with TanStack Query)
│   │   │   ├── services/         # Centralized API service layer (apiClient, healthService)
│   │   │   ├── types/            # Frontend specific types
│   │   │   ├── utils/            # Helper utilities
│   │   │   ├── styles/           # Tailwind globals
│   │   │   ├── App.tsx           # Router & QueryClient setup
│   │   │   └── main.tsx          # Application entrypoint
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── vite.config.ts        # Vite config with /api proxy to backend
│   │   └── tsconfig.json
│   │
│   └── backend/                  # NestJS Modular Monolithic Server
│       ├── prisma/               # Database schema & migrations
│       │   ├── schema.prisma     # 8 core relational competition models
│       │   ├── seed.ts           # Idempotent official competition round seeder
│       │   └── migrations/       # Versioned migration SQL files
│       ├── src/
│       │   ├── common/           # Cross-cutting concerns (filters, interceptors)
│       │   ├── config/           # Environment config loader
│       │   ├── database/         # PrismaService and DatabaseModule
│       │   ├── health/           # System health & dynamic DB readiness
│       │   ├── app.module.ts     # Root NestJS module
│       │   └── main.ts           # Server bootstrap (Port 4000)
│       ├── nest-cli.json
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/                   # Common TypeScript package
│       ├── src/
│       │   └── index.ts          # Shared types & metadata
│       ├── package.json
│       └── tsconfig.json
│
├── infrastructure/               # Local hosting infrastructure
│   ├── mysql/                    # Local MySQL Docker Compose configuration
│   └── judge0/                   # Reserved for Judge0 CE deployment
│
├── docs/                         # Architecture documentation
├── scripts/
│   ├── validate-phase02.cjs      # Automated integration verification suite
│   └── test-database.cjs         # Automated database architecture test suite
├── .gitignore                    # Root gitignore rules
├── .env.example                  # Environment template
├── package.json                  # Monorepo workspaces & root scripts
├── tsconfig.base.json            # Shared TypeScript configuration
└── README.md                     # Comprehensive documentation
```

---

## 5. Database Architecture (Phase 02)

The database schema is normalized and indexed for high-concurrency competition access:

| Model | Table | Purpose | Key Relations & Constraints |
|---|---|---|---|
| `Team` | `teams` | Registered competition teams | Unique `team_code`, 1:N `participants`, 1:N `roundProgress`, 1:N `submissions` |
| `Participant` | `participants` | Students belonging to a team (2 per team) | Unique `email`, FK `team_id` (Cascade delete with team) |
| `AdminAccount` | `admin_accounts` | Competition administrators & judges | Unique `email`, Role enum (`SUPER_ADMIN`, `ORGANIZER`, `JUDGE`) |
| `CompetitionRound` | `competition_rounds` | The 3 competition stages | Unique `round_number`, 1:N `teamProgress`, 1:N `submissions` |
| `TeamRoundProgress` | `team_round_progress` | Team progress per round | Unique `(team_id, round_id)`, status enums, scores |
| `Submission` | `submissions` | Team code submissions | FK `team_id`, FK `round_id`, 1:N `evaluations` |
| `Evaluation` | `evaluations` | Judge evaluations & scores | FK `submission_id`, FK `evaluator_id` (SetNull) |
| `ActivityLog` | `activity_logs` | Audit trail & malpractice tracking | Indexed `actor_type`, `action`, `created_at` |

### Official Competition Rounds (Pre-seeded):
1. **Round 1 — MCQ Arena**: 30 minutes, 30 max marks.
2. **Round 2 — Bug Hunt Arena**: 40 minutes, 100 max marks.
3. **Round 3 — Final Boss Coding**: 60 minutes, 100 max marks.

---

## 6. Installation Prerequisites

Ensure the following tools are installed on the development machine:

- **Node.js**: `v20.x` or higher (verified on Node `v24.x`)
- **npm**: `v10.x` or higher
- **MySQL Server 8.0**: Local native install OR Docker Desktop

---

## 7. Database Setup Instructions

### Option A: Local Docker Compose (Recommended)

If Docker Desktop is installed, run from the project root:

```bash
docker compose -f infrastructure/mysql/docker-compose.yml up -d
```

This starts MySQL 8.0 on port 3306 with:
- Database: `ignitron_2k26`
- User: `ignitron_user`
- Password: `ignitron_pass`

Set in `.env`:
```env
DATABASE_URL="mysql://ignitron_user:ignitron_pass@localhost:3306/ignitron_2k26"
```

### Option B: Native MySQL Server

If using native MySQL 8.0 on Windows:
1. Open MySQL Command Line Client or MySQL Workbench as `root`.
2. Run:
```sql
CREATE DATABASE IF NOT EXISTS ignitron_2k26 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'ignitron_user'@'localhost' IDENTIFIED BY 'ignitron@2026';
GRANT ALL PRIVILEGES ON ignitron_2k26.* TO 'ignitron_user'@'localhost';
FLUSH PRIVILEGES;
```
3. Set in `.env`:
```env
# Note: '@' in passwords MUST be URL-encoded as '%40' for Prisma:
DATABASE_URL="mysql://ignitron_user:ignitron%402026@localhost:3306/ignitron_2k26"
```

---

## 8. Database Migration & Seeding

After configuring `.env`:

```bash
# Apply migrations to database
npm run db:deploy

# Or for local schema development:
npm run db:migrate

# Seed official competition rounds (idempotent)
npm run db:seed

# Run database architecture automated tests
npm run test:db
```

---

## 9. Development Commands

The root package manages all workspace lifecycle commands:

| Command | Description |
|---|---|
| `npm run dev` | **Recommended**: Compiles shared package and concurrently boots Backend and Frontend. |
| `npm run dev:frontend` | Starts only the Vite React frontend. |
| `npm run dev:backend` | Starts only the NestJS backend in watch mode. |
| `npm run build` | Builds shared package, NestJS backend, and Vite frontend for production. |
| `npm run lint` | Runs TypeScript type checking across all workspaces. |
| `npm run validate` | Runs the automated end-to-end integration verification suite. |
| `npm run db:generate` | Generates the Prisma Client. |
| `npm run db:migrate` | Runs Prisma development migrations. |
| `npm run db:deploy` | Applies pending migrations to the active database. |
| `npm run db:seed` | Seeds the official competition round definitions. |
| `npm run db:studio` | Opens Prisma Studio GUI in the browser. |
| `npm run test:db` | Runs automated database tests (relations, constraints, seeding). |

---

## 10. Health & Readiness API

### Liveness Endpoint
- **URL**: `GET /api/health`
- **Status Code**: `200 OK`
- Verifies backend process liveness without requiring a database connection.

### Readiness Endpoint
- **URL**: `GET /api/health/ready`
- **Status Code**: `200 OK` (when database is connected) or `503 Service Unavailable` (when database is offline)
- **Response Format**:
```json
{
  "status": "ready",
  "application": "IGNITRON 2K26",
  "service": "backend",
  "timestamp": "2026-11-03T05:55:05.580Z",
  "checks": {
    "api": "ok",
    "database": "connected"
  }
}
```

---

## 11. Troubleshooting Common Database Issues

1. **Authentication failed (`P1000`)**:
   - Verify credentials in `.env`.
   - If the password contains `@` (e.g. `ignitron@2026`), encode it as `%40` (`ignitron%402026`).
2. **Database does not exist (`P1003`)**:
   - Create the database: `CREATE DATABASE ignitron_2k26;` or run `npm run db:deploy`.
3. **Connection refused (`ECONNREFUSED 127.0.0.1:3306`)**:
   - Ensure the MySQL Windows service is started or start the Docker container via `docker compose -f infrastructure/mysql/docker-compose.yml up -d`.
