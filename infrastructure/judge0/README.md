# IGNITRON 2K26 — Judge0 CE Infrastructure Guide

This directory contains the self-hosted **Judge0 Community Edition (CE)** containerized execution cluster for IGNITRON 2K26 Code Relay.

Judge0 CE provides isolated, sandboxed execution of untrusted participant code inside Linux cgroups containers via the `isolate` sandbox engine.

---

## 1. Architecture & Required Containers

The stack consists of 4 Docker containers connected via a private bridge network (`ignitron-judge0-net`):

| Container Name | Base Image | Role & Responsibilities |
| :--- | :--- | :--- |
| `ignitron-judge0-server` | `judge0/judge0:v1.13.1` | REST API gateway, accepts submissions, queries status, dispatches tasks to Redis. |
| `ignitron-judge0-workers` | `judge0/judge0:v1.13.1` | Asynchronous worker process that pulls jobs from Redis and executes them in sandboxed `isolate` boxes. |
| `ignitron-judge0-db` | `postgres:13.0` | Relational storage for submission logs, language profiles, and system settings. |
| `ignitron-judge0-redis` | `redis:7.2-alpine` | High-throughput in-memory queue and broker between API server and isolate workers. |

---

## 2. Ports & Network Interfaces

| Container | Host Port | Internal Port | Protocol | Scope | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `server` | `2358` | `2358` | TCP / HTTP | Host & Backend Only | Judge0 REST API endpoint (`/submissions`, `/languages`, `/health`). |
| `db` | None | `5432` | TCP / PostgreSQL | Internal Network Only | Database communication restricted to internal network. |
| `redis` | None | `6379` | TCP / Redis | Internal Network Only | Redis queue communication restricted to internal network. |

> [!IMPORTANT]
> The backend NestJS server communicates with Judge0 on `http://localhost:2358` (or via docker host alias). Port 2358 must **never** be exposed directly to the public network or contestant browsers. Contestant submissions are routed exclusively through authenticated NestJS endpoints (`/api/execution/run`).

---

## 3. Configuration & Environment Variables

The stack is configured through [judge0.conf](file:///c:/Users/user/OneDrive/Desktop/Project/IGNITRON-2K26/infrastructure/judge0/judge0.conf).

Key parameters:
- `SERVER_PORT=2358`: Port on which Judge0 listens.
- `ENABLE_WAIT_RESULT=true`: Allows synchronous submission mode (`wait=true`) for low-latency feedback.
- `CPU_TIME_LIMIT=2.0`: Default execution CPU time limit per test case (seconds).
- `MEMORY_LIMIT=128000`: Default RAM limit per submission (128 MB in KB).
- `ALLOWED_LANGUAGES_NUMBERS=54,62,71,63`: Restricts execution to official competition languages:
  - `54`: C++17 (GCC 9.2.0)
  - `62`: Java (OpenJDK 13.0.1)
  - `71`: Python 3 (3.8.1)
  - `63`: JavaScript (Node.js 12.14.0)

---

## 4. Startup & Teardown Commands

From the monorepo root or inside this directory:

### Start the Infrastructure
```bash
# 1. Start database and Redis first
docker compose -f infrastructure/judge0/docker-compose.yml up -d db redis

# 2. Wait for Postgres health check to report healthy (approx 5-10 seconds)
# 3. Start Judge0 Server and Workers
docker compose -f infrastructure/judge0/docker-compose.yml up -d
```

### Stop the Infrastructure
```bash
# Stop all containers while preserving database volume
docker compose -f infrastructure/judge0/docker-compose.yml stop

# Completely remove containers and network (preserves volumes)
docker compose -f infrastructure/judge0/docker-compose.yml down

# Wipe volumes and reset everything
docker compose -f infrastructure/judge0/docker-compose.yml down -v
```

---

## 5. Health Checks & Verification

Verify that Judge0 is operational:

```bash
# 1. System Info & Server Status
curl -s http://localhost:2358/system_info

# 2. About Endpoint
curl -s http://localhost:2358/about

# 3. Verify Active Languages
curl -s http://localhost:2358/languages

# 4. Check Container Status
docker compose -f infrastructure/judge0/docker-compose.yml ps
```

---

## 6. Troubleshooting & System Requirements

### A. Docker Privileged Mode & Cgroups
Judge0's isolate sandbox uses Linux kernel control groups (`cgroups`). The `docker-compose.yml` specifies `privileged: true` for both `server` and `workers`. If deploying on Linux or WSL2:
- Ensure the Docker daemon has cgroups v1 / v2 enabled.
- If running under systemd with cgroups v2: add `systemd.unified_cgroup_hierarchy=0` to the kernel boot flags if isolate fails to create sandbox boxes.

### B. Redis Authentication Errors
If workers output `NOAUTH Authentication required`:
- Confirm `REDIS_PASSWORD` in `judge0.conf` matches the `--requirepass` argument in `docker-compose.yml`.

### C. Worker Timeouts
If submissions remain in `In Queue` (status ID 1):
- Check worker logs: `docker compose -f infrastructure/judge0/docker-compose.yml logs -f workers`.
- Ensure the worker container has sufficient memory allocated in Docker Desktop settings.
