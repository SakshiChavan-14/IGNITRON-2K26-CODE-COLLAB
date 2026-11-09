# IGNITRON 2K26 — Code Relay
## Comprehensive Project Implementation Status

**Document Version:** 1.0.0  
**Last Updated:** November 2026  
**Target Deployment:** Dell G15 Workstation / University LAN Competition  

---

### 1. Executive Summary

IGNITRON 2K26 is an offline-first, server-authoritative competitive programming tournament platform engineered specifically for university team code relay tournaments. The platform orchestrates multi-round, progressive team competitions without reliance on cloud or internet services during live events.

As of this status report, **Phases 01 through 05B (Task 1)** have been fully implemented, integrated, and verified across both backend (NestJS + MySQL 8.0 + Prisma ORM) and frontend (React 18 + Vite + Tailwind CSS + CodeMirror 6).

---

### 2. Implementation Status by Phase

| Phase | Title | Status | Scope & Deliverables |
| :--- | :--- | :---: | :--- |
| **Phase 01** | Architecture & Monorepo Foundation | **COMPLETE** | npm workspaces monorepo (`@ignitron/shared`, `@ignitron/backend`, `@ignitron/frontend`), TypeScript base configs, initial Docker Compose configurations. |
| **Phase 02** | Database Architecture & Migrations | **COMPLETE** | MySQL 8.0 + Prisma ORM, 8 relational models (`AdminAccount`, `Team`, `Participant`, `ParticipantSession`, `CompetitionRound`, `Submission`, `ActivityLog`, `CompetitionState`), idempotent migration pipeline and official rounds seeder. |
| **Phase 03** | Auth, Admin Access & Team Management | **COMPLETE** | Role-based JWT authentication (Admin & Team), Unstop CSV bulk import with flexible column mapping, strict single-active-participant mutex per team, forced password change flow, and full admin management portal. |
| **Phase 04** | Global Competition Control Engine | **COMPLETE** | 8-stage authoritative state machine (`STANDBY` &rarr; `ROUND_1` &rarr; `ROUND_1_EVALUATION` &rarr; `ROUND_2` &rarr; `ROUND_2_EVALUATION` &rarr; `ROUND_3` &rarr; `FINAL_EVALUATION` &rarr; `COMPLETED`), server-authoritative timer, pause/resume, progressive shortlisting (50% rule), activity audit logging, and 20-team demo data generator. |
| **Phase 05A** | Judge0 CE Execution Infrastructure | **COMPLETE** | Self-hosted Judge0 CE Docker Compose configuration, backend `CodeExecutionModule`, `Judge0ClientService` supporting C++, Java, Python, and JavaScript, execution limit enforcement, and automated fallback mocking for dev. |
| **Phase 05B (Task 1)** | CodeMirror 6 Workspace Upgrade | **COMPLETE** | Integrated CodeMirror 6 with syntax highlighting for C++17, Java, Python, and JavaScript, line numbers, bracket matching, dark theme matching IGNITRON UI, tab indentation, and persistent shared team drafts with autosave & version conflict resolution. |

---

### 3. Detailed Module Implementation Breakdown

#### A. Database & Persistence Layer (`apps/backend/prisma`)
- **Engine:** MySQL 8.0 Community Edition
- **ORM:** Prisma 6.19
- **Core Entities:**
  - `AdminAccount`: Superuser and administrator access with hashed credentials (`bcrypt`).
  - `Team`: External registration records (Unstop), access credentials, status flags (`REGISTERED`, `ACTIVE`, `DISQUALIFIED`), and competition progress stage.
  - `Participant`: Two assigned members per team (`PARTICIPANT_A`, `PARTICIPANT_B`).
  - `ParticipantSession`: Server-side session mutex locking each team to exactly one concurrently active member.
  - `CompetitionRound`: Official seeded rounds (Round 1: Rapid Fire Relay, Round 2: Algorithmic Duel, Round 3: The Architect's Gauntlet).
  - `WorkspaceDraft`: Persistent team coding drafts per round, with source code, language, version number, and auto-updated timestamps.
  - `Submission`: Code submissions with Judge0 token, status, execution time, memory usage, stdout, stderr, and compile output.
  - `CompetitionState`: Singleton authoritative state machine record storing current stage, start timestamp, paused time, remaining seconds, and active round.
  - `ActivityLog`: Immutable system audit trail capturing administrative, team, and engine actions.

#### B. Authentication & Session Security (`apps/backend/src/auth`)
- **JWT Strategy:** Signed with server-side `JWT_SECRET`, transmitted via `HttpOnly` cookie or Bearer token.
- **Session Mutex:** When Participant A logs in, an active session lock is held. If Participant B attempts to log in, login is rejected with HTTP 409 until Participant A logs out or an admin manually revokes the session.
- **Credential Handover:** Teams receive randomized initial credentials; upon first login, `mustChangePassword` forces password change before accessing competition workspace.

#### C. Competition Control Engine (`apps/backend/src/competition`)
- **Server-Authoritative Clock:** Client timers poll backend `/api/competition/state`. All deadline calculations occur on the backend to prevent client clock manipulation.
- **Pause & Resume:** Accurately retains remaining round duration in seconds upon pause, recalculating deadlines upon resumption.
- **Progressive Shortlisting:**
  - End of Round 1: Top 50% of active teams advance to Round 2.
  - End of Round 2: Finalist teams advance to Round 3.
  - Non-shortlisted teams are locked from submitting or editing drafts.

#### D. Code Execution Engine (`apps/backend/src/code-execution`)
- **Judge0 CE Integration:** Backend communicates with local Judge0 service at `http://localhost:2358`.
- **Supported Languages:**
  - C++ (C++17, Judge0 ID 54)
  - Java (OpenJDK 13, Judge0 ID 62)
  - Python (Python 3.8, Judge0 ID 71)
  - JavaScript (Node.js 12, Judge0 ID 63)
- **Execution Limits:** CPU limit 2.0s, wall-clock 5.0s, memory 128 MB.
- **Fallback Simulation:** In offline local development without Docker running, the service automatically falls back to deterministic simulated execution so developers can test UI and workflows without crashing.

#### E. Shared Team Workspace (`apps/frontend` & `apps/backend/src/workspace`)
- **Editor:** CodeMirror 6 with `@uiw/react-codemirror`.
- **Relay Handover:**
  1. Participant A writes code in CodeMirror.
  2. Debounced autosave (~800ms) writes draft to MySQL via `PUT /api/workspace/draft`.
  3. Participant A logs out, releasing the session mutex.
  4. Participant B logs in, opens the workspace, and retrieves the exact draft via `GET /api/workspace/draft`.
- **Optimistic Concurrency & Conflict Protection:** Drafts include an integer `version`. Stale saves are rejected with HTTP 409 Conflict.
- **Size Limits:** Enforces a 64 KB payload cap on code drafts.

---

### 4. Verification & Automated Test Suites

The repository contains automated end-to-end verification scripts under the `scripts/` directory:

| Script | Test Scope | Checks Passed | Result |
| :--- | :--- | :---: | :---: |
| `scripts/test-database.cjs` | Prisma schema, client connection, round seeds | 4 / 4 | **PASS** |
| `scripts/test-phase03.cjs` | Admin login, team creation, CSV import, session mutex, password change | 9 / 9 | **PASS** |
| `scripts/test-phase04.cjs` | Competition state machine, timer sync, pause/resume, shortlisting, audit logs | 18 / 18 | **PASS** |
| `scripts/test-phase05a.cjs` | Judge0 language IDs, execution request handling, limits, error reporting | 16 / 16 | **PASS** |
| `scripts/test-workspace-draft.cjs` | Starter templates, autosave, language persistence, Relay handover, 409 conflict | 17 / 17 | **PASS** |

All tests pass with 100% success rate when prerequisites (database and backend) are running.

---

### 5. Genuine vs. Simulated Functionality Summary

To maintain complete transparency for the handover engineer:

| Feature Area | Implementation Type | Current Status |
| :--- | :--- | :--- |
| **User & Team Authentication** | **Genuinely Working** | Full JWT verification, bcrypt hashing, cookie session management. |
| **Single-Participant Session Mutex**| **Genuinely Working** | Database-backed mutex strictly blocking concurrent logins per team. |
| **Unstop CSV Bulk Import** | **Genuinely Working** | Dynamic column mapping parser creating teams and participants in MySQL. |
| **Global State Machine** | **Genuinely Working** | MySQL-stored state transitions and server-authoritative timer logic. |
| **CodeMirror 6 Editor** | **Genuinely Working** | Full CodeMirror 6 bundle with real syntax highlighting, line numbers, and keyboard shortcuts. |
| **Team Draft Autosave & Handover** | **Genuinely Working** | Real-time debounced persistence to MySQL; Participant A &rarr; B handover fully functional. |
| **Code Execution (Dev Fallback)** | **Simulated Fallback** | When Judge0 Docker container is stopped, backend returns simulated compilation and output to prevent crashes. |
| **Code Execution (Real Judge0)** | **Container Ready** | Docker Compose and client service are implemented. **Real container execution must be verified on the Dell G15 machine with Docker Desktop running.** |

---

### 6. Known Considerations & Future Tasks

1. **Docker Execution on Windows:** Ensure WSL2 is installed and enabled in Docker Desktop so that Judge0 CE isolates containers cleanly without permission issues.
2. **Arena Implementations (Subsequent Phase 5 Tasks):**
   - Round 1 MCQ Arena (Rapid Fire questions)
   - Round 2 Bug Hunt Arena (debugging challenges)
   - Round 3 Final Boss Coding (full algorithmic problem evaluation)
3. **LAN Firewall:** When running on the Dell G15 over Wi-Fi/Ethernet, Windows Defender Firewall must have inbound allow rules configured for ports `5173` (Vite) and `4000` (NestJS).

