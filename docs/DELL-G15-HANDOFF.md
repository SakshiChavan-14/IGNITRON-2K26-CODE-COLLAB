# IGNITRON 2K26 — Dell G15 Workstation Handoff Guide

**Target Audience:** Handover Engineer / Competition Server Administrator  
**Host Platform:** Dell G15 Laptop (Windows 11 Home / Pro)  
**Operating Environment:** University Local Area Network (Offline / Air-Gapped)  

---

## 1. System Prerequisites on Dell G15

Ensure the following software packages are installed on the Dell G15 before configuring the repository:

1. **Operating System:** Windows 11 (64-bit) with virtualization enabled in BIOS (Intel VT-x / AMD-V).
2. **Terminal:** Windows Terminal with PowerShell 7+ or native Windows PowerShell.
3. **Version Control:** [Git for Windows](https://git-scm.com/download/win) (with Unix tools in PATH optional).
4. **Node.js Runtime:** Node.js **v20 LTS** or **v22 LTS** (includes npm v10+).
   - Verify: `node -v` and `npm -v`
5. **Database Engine:** **MySQL Community Server 8.0**
   - Installed via MySQL Installer for Windows, running as Windows Service `MySQL80` on port `3306`.
   - Alternatively, can be run inside Docker using `infrastructure/mysql/docker-compose.yml`.
6. **Container Runtime:** **Docker Desktop for Windows**
   - Configured with the **WSL 2 backend** (Ubuntu 22.04 or default WSL distro).
   - Ensure Docker Desktop is allocated at least 4 GB RAM in Settings &rarr; Resources.

---

## 2. Repository Setup & Dependencies

Clone the private repository and install all monorepo dependencies:

```powershell
# 1. Clone repository (use your private GitHub URL)
git clone <PRIVATE_GITHUB_REPO_URL> IGNITRON-2K26
cd IGNITRON-2K26

# 2. Install monorepo dependencies across all workspaces
npm install
```

---

## 3. Environment Configuration (`.env`)

Create the root `.env` file from the example template:

```powershell
Copy-Item .env.example .env
```

Open `.env` in an editor (e.g., VS Code or Notepad) and configure the variables:

```ini
# Environment mode
NODE_ENV=development

# Port configuration
FRONTEND_PORT=5173
BACKEND_PORT=4000
API_PREFIX=api

# Database connection URL (MySQL 8.0)
# Format: mysql://<USER>:<PASSWORD>@localhost:3306/ignitron_2k26
# If using native Windows MySQL with user 'ignitron_user':
DATABASE_URL="mysql://ignitron_user:ignitron_pass@localhost:3306/ignitron_2k26"
# Or if using native root user:
# DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/ignitron_2k26"

# JWT Authentication
# IMPORTANT: Generate a strong secret key for competition day
JWT_SECRET="generate-a-strong-random-64-character-string-here"
JWT_EXPIRES_IN="24h"

# Default Bootstrap Administrator Credentials
ADMIN_EMAIL="admin@ignitron.local"
ADMIN_PASSWORD="ChooseAStrongAdminPassword2026!"
ADMIN_FULL_NAME="IGNITRON System Administrator"

# Judge0 CE API Endpoint (Local Docker)
JUDGE0_API_URL="http://localhost:2358"
```

> **Security Note:** Never commit `.env` to Git. The `.gitignore` file is pre-configured to strictly ignore `.env` and all variations.

---

## 4. MySQL Database Setup

### Step 4.1: Create Database & User
Open the MySQL Command Line Client or PowerShell:

```powershell
mysql -u root -p
```

Execute the following SQL commands:

```sql
CREATE DATABASE IF NOT EXISTS ignitron_2k26 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Optional: Create a dedicated application user
CREATE USER IF NOT EXISTS 'ignitron_user'@'localhost' IDENTIFIED BY 'ignitron_pass';
GRANT ALL PRIVILEGES ON ignitron_2k26.* TO 'ignitron_user'@'localhost';
FLUSH PRIVILEGES;

EXIT;
```

*(Ensure the credentials match `DATABASE_URL` in your `.env` file).*

### Step 4.2: Run Prisma Migrations
Deploy the database schema migrations into MySQL:

```powershell
npm run db:deploy
```

This applies all versioned migrations:
- `20261031000000_init` (Core schema)
- `20261106000000_add_auth_and_sessions` (Team auth & single-session mutex)
- `20261109000000_add_competition_state` (Authoritative state machine)
- `20261109010000_add_execution_fields_to_submission` (Execution records)
- `20261109020000_add_workspace_draft` (Persistent team code drafts)

### Step 4.3: Seed Official Competition Rounds
Seed the three official competition rounds:

```powershell
npm run db:seed
```

Verify that the seed outputs:
- Round 1: Rapid Fire Relay (Duration: 30m, Weight: 25%)
- Round 2: Algorithmic Duel (Duration: 45m, Weight: 35%)
- Round 3: The Architect's Gauntlet (Duration: 60m, Weight: 40%)

---

## 5. Judge0 CE Code Execution Deployment (Docker)

Judge0 CE runs in local Docker containers to compile and execute untrusted participant code in isolated sandboxes.

### Step 5.1: Start Docker Desktop
Ensure Docker Desktop is running and the whale icon is active in the Windows notification tray.

### Step 5.2: Launch Judge0 Containers
Navigate to the Judge0 infrastructure directory and launch the services:

```powershell
cd infrastructure/judge0
docker compose up -d
```

### Step 5.3: Container Architecture
The compose file creates 4 isolated services:

| Container Name | Image | Port | Description |
| :--- | :--- | :---: | :--- |
| `ignitron-judge0-server` | `judge0/judge0:v1.13.1` | `2358` | REST API endpoint for submission dispatch |
| `ignitron-judge0-workers` | `judge0/judge0:v1.13.1` | - | Background queue worker compiling & executing code |
| `ignitron-judge0-db` | `postgres:13.0` | Internal `5432` | Internal state & language metadata database |
| `ignitron-judge0-redis` | `redis:7.2-alpine` | Internal `6379` | Queue broker for submission caching and workers |

### Step 5.4: Verify Judge0 Health
Test that the Judge0 REST API is responsive:

```powershell
curl http://localhost:2358/about
```

You should receive a JSON response showing the Judge0 version (e.g. `{"version": "1.13.1"}`).

Return to the project root:
```powershell
cd ../..
```

---

## 6. Running IGNITRON 2K26

### Method A: Monorepo Development Mode (Recommended)
Runs shared build, backend, and frontend concurrently:

```powershell
npm run dev
```

- **Backend API:** `http://localhost:4000/api`
- **Frontend App:** `http://localhost:5173`
- **Health Check:** `http://localhost:4000/api/health`

### Method B: Separate Terminal Windows
If you prefer running frontend and backend in isolated windows:

**Terminal 1 (Backend):**
```powershell
npm run dev:backend
```

**Terminal 2 (Frontend):**
```powershell
npm run dev:frontend
```

---

## 7. Verifying Real Code Execution on Dell G15

Run the automated Phase 05A test suite against the live Judge0 containers:

```powershell
node scripts/test-phase05a.cjs
```

This tests:
1. Retrieval of verified language IDs:
   - C++17 (ID `54`)
   - Java (ID `62`)
   - Python 3 (ID `71`)
   - JavaScript (ID `63`)
2. Synchronous submission execution.
3. Execution limit enforcement (CPU time <= 2.0s, Wall time <= 5.0s, Memory <= 128 MB).
4. Error capture: Syntax/Compile Errors, Infinite Loop / Time Limit Exceeded (TLE), Runtime Errors (Non-zero exit codes).

Additionally, run the shared workspace test suite:
```powershell
node scripts/test-workspace-draft.cjs
```

---

## 8. University LAN Deployment & Multi-Laptop Access

To allow student laptops to connect to IGNITRON hosted on the Dell G15:

### Step 8.1: Obtain the Dell G15 LAN IP Address
In PowerShell:

```powershell
ipconfig
```

Locate your active IPv4 Address (e.g., `192.168.1.150` on Wi-Fi or Ethernet).

### Step 8.2: Configure Windows Defender Firewall
Allow incoming connections on ports `5173` (Frontend) and `4000` (Backend API):

```powershell
# Run PowerShell as Administrator:
New-NetFirewallRule -DisplayName "IGNITRON Frontend (5173)" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "IGNITRON Backend (4000)" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow
```

### Step 8.3: Start Frontend with Network Host Flag
Run Vite bound to all network interfaces (`0.0.0.0`):

```powershell
# From the monorepo root:
npm run dev -w @ignitron/frontend -- --host 0.0.0.0
```

Participants can now open their browser to:
`http://192.168.1.150:5173`

---

## 9. Administrator Quick Access & Demo Data

1. **Admin Login:**
   - URL: `http://localhost:5173/admin/login`
   - Email: Value of `ADMIN_EMAIL` in `.env` (default: `admin@ignitron.local`)
   - Password: Value of `ADMIN_PASSWORD` in `.env`
2. **Team Import:**
   - Navigate to `/admin/csv-import` to upload Unstop participant rosters.
3. **Demo Mode:**
   - In `/admin/competition-control`, click **"Load Demo Data (20 Teams)"** to immediately populate the tournament with 20 pre-configured teams and credentials for rehearsal.
4. **Competition State Machine:**
   - Control round transitions (`STANDBY` &rarr; `ROUND_1` &rarr; `ROUND_2` &rarr; `ROUND_3` &rarr; `COMPLETED`) directly from the Competition Control panel.

---

## 10. Troubleshooting Checklist

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **`Can't reach database server at localhost:3306`** | MySQL service stopped or wrong port. | Start the service in PowerShell: `Start-Service MySQL80` or verify port in `my.ini`. |
| **`PrismaClientInitializationError: Environment variable not found: DATABASE_URL`** | Running command from subdirectory where `.env` is absent. | Always run commands from monorepo root or use `npm run db:*` workspace scripts. |
| **`Judge0 CE not reachable at http://localhost:2358`** | Docker containers not started. | Run `cd infrastructure/judge0 && docker compose up -d`. Verify with `docker ps`. |
| **`EPERM: operation not permitted` on npm install** | Windows file lock by IDE or antivirus. | Close active terminals, run PowerShell as Administrator, or retry `npm install`. |
| **Student laptops cannot open `http://<IP>:5173`** | Windows Firewall blocking inbound traffic or network set to "Public". | Set Wi-Fi network profile to "Private" in Windows Settings, and add firewall rules (Step 8.2). |
| **Participant B gets HTTP 409 when logging in** | Participant A has not logged out yet. | Expected behavior (Single-Session Mutex). Have Participant A click **Logout** or have Admin click **Revoke Session** in `/admin/teams`. |

