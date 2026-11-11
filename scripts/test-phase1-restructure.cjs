/**
 * IGNITRON 2K26 — Phase 1 Core Platform Restructuring Test Suite
 *
 * Validates:
 * 1. Public team registration with personal emails (e.g. @gmail.com)
 * 2. Public team registration with college emails (e.g. @mit.edu)
 * 3. Validation: rejecting registration with fewer than 2 participants (400)
 * 4. Validation: rejecting registration with duplicate participant emails within team (409)
 * 5. Validation: rejecting registration with duplicate participant email across teams (409)
 * 6. Team lookup and login with registered credentials (teamCode, password, participant selection)
 * 7. Single-active-participant session mutex: Participant A active -> Participant B rejected (409)
 * 8. Handover: Participant A logs out -> Participant B logs in successfully
 * 9. Admin visibility: Admin logs in, views registered teams, registration date, last login, active participant
 * 10. Admin CSV export: /api/admin/teams/export/csv returns valid CSV formatted data
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PORT = 4000;
const BASE_URL = `http://localhost:${PORT}/api`;

let passedChecks = 0;
let totalChecks = 0;

function recordCheck(name, passed, details = '') {
  totalChecks++;
  if (passed) {
    passedChecks++;
    console.log(`  \x1b[32m✔ [PASS]\x1b[0m ${name}`);
  } else {
    console.log(`  \x1b[31m✘ [FAIL]\x1b[0m ${name}`);
    if (details) console.log(`     \x1b[33mDetails: ${details}\x1b[0m`);
  }
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const parsedUrl = new URL(url);

  return new Promise((resolve, reject) => {
    const headers = options.headers || {};
    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    if (options.cookie) {
      headers['Cookie'] = options.cookie;
    }

    const req = http.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method || 'GET',
        headers,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          let data = null;
          try {
            data = JSON.parse(rawData);
          } catch {
            data = rawData;
          }

          const setCookie = res.headers['set-cookie'];
          let sessionCookie = null;
          if (setCookie) {
            const match = setCookie[0]?.match(/ignitron_session=([^;]+)/);
            if (match) {
              sessionCookie = `ignitron_session=${match[1]}`;
            }
          }

          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            sessionCookie,
            data,
          });
        });
      },
    );

    req.on('error', (err) => reject(err));

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function waitForServer(retries = 30, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await request('/health');
      if (res.statusCode === 200) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

async function runTests() {
  console.log('\n=============================================================');
  console.log('  IGNITRON 2K26 — PHASE 1 RESTRUCTURING TEST SUITE');
  console.log('=============================================================\n');

  const unique = Date.now().toString().slice(-6);

  try {
    // -------------------------------------------------------------------------
    // 1. Validation: Reject registration with < 2 participants
    // -------------------------------------------------------------------------
    console.log('[1/10] Testing Registration Validation: Participant Count...');
    const invalidCountRes = await request('/auth/team/register', {
      method: 'POST',
      body: {
        teamName: `Invalid Team ${unique}`,
        institution: 'Tech Institute',
        password: 'ValidPassword123!',
        participants: [
          { fullName: 'Solo Coder', email: `solo_${unique}@gmail.com` },
        ],
      },
    });
    recordCheck(
      'Rejects registration with fewer than 2 participants (HTTP 400)',
      invalidCountRes.statusCode === 400,
      `Got status ${invalidCountRes.statusCode}`,
    );

    // -------------------------------------------------------------------------
    // 2. Validation: Reject duplicate emails within same team
    // -------------------------------------------------------------------------
    console.log('[2/10] Testing Registration Validation: Intra-team Duplicate Email...');
    const duplicateEmailRes = await request('/auth/team/register', {
      method: 'POST',
      body: {
        teamName: `Dup Email Team ${unique}`,
        institution: 'Tech Institute',
        password: 'ValidPassword123!',
        participants: [
          { fullName: 'Member 1', email: `same_${unique}@gmail.com` },
          { fullName: 'Member 2', email: `same_${unique}@gmail.com` },
        ],
      },
    });
    recordCheck(
      'Rejects registration with duplicate emails within the same team (HTTP 409)',
      duplicateEmailRes.statusCode === 409,
      `Got status ${duplicateEmailRes.statusCode}`,
    );

    // -------------------------------------------------------------------------
    // 3. Public Registration with Personal Emails
    // -------------------------------------------------------------------------
    console.log('[3/10] Testing Public Registration with Personal Emails...');
    const team1Pass = 'SecurePersonalPass123!';
    const regPersonalRes = await request('/auth/team/register', {
      method: 'POST',
      body: {
        teamName: `Team Alpha ${unique}`,
        institution: 'National Engineering College',
        password: team1Pass,
        participants: [
          {
            fullName: 'Rahul Sharma',
            email: `rahul.dev.${unique}@gmail.com`,
            phone: '+919876543210',
            studentId: 'ST-001',
          },
          {
            fullName: 'Priya Patel',
            email: `priya.codes.${unique}@yahoo.com`,
            phone: '+919876543211',
            studentId: 'ST-002',
          },
        ],
      },
    });

    const team1Data = regPersonalRes.data?.data;
    recordCheck(
      'Successfully registers team with personal emails (HTTP 201)',
      regPersonalRes.statusCode === 201 && !!team1Data?.teamCode,
      `Team Code: ${team1Data?.teamCode}`,
    );

    // -------------------------------------------------------------------------
    // 4. Public Registration with College Emails
    // -------------------------------------------------------------------------
    console.log('[4/10] Testing Public Registration with College Emails...');
    const regCollegeRes = await request('/auth/team/register', {
      method: 'POST',
      body: {
        teamName: `Team Beta ${unique}`,
        institution: 'MIT World Peace University',
        password: 'CollegePass2026!',
        participants: [
          {
            fullName: 'Ananya Deshmukh',
            email: `ananya.cs.${unique}@mitwpu.edu.in`,
            phone: '+919876543212',
            studentId: 'MIT-2026-01',
          },
          {
            fullName: 'Vikram Joshi',
            email: `vikram.it.${unique}@mitwpu.edu.in`,
            phone: '+919876543213',
            studentId: 'MIT-2026-02',
          },
        ],
      },
    });

    const team2Data = regCollegeRes.data?.data;
    recordCheck(
      'Successfully registers team with college emails (HTTP 201)',
      regCollegeRes.statusCode === 201 && !!team2Data?.teamCode,
      `Team Code: ${team2Data?.teamCode}`,
    );

    // -------------------------------------------------------------------------
    // 5. Validation: Reject duplicate email across different teams
    // -------------------------------------------------------------------------
    console.log('[5/10] Testing Duplicate Email Prevention Across Teams...');
    const dupAcrossTeamsRes = await request('/auth/team/register', {
      method: 'POST',
      body: {
        teamName: `Team Gamma ${unique}`,
        institution: 'Another University',
        password: 'AnotherPassword123!',
        participants: [
          {
            fullName: 'Copycat Member',
            email: `rahul.dev.${unique}@gmail.com`, // Already used in Team Alpha
          },
          {
            fullName: 'Second Member',
            email: `unique.member.${unique}@gmail.com`,
          },
        ],
      },
    });
    recordCheck(
      'Rejects registration using an email already registered with another team (HTTP 409)',
      dupAcrossTeamsRes.statusCode === 409,
      `Got status ${dupAcrossTeamsRes.statusCode}`,
    );

    // -------------------------------------------------------------------------
    // 6. Team Lookup & Login
    // -------------------------------------------------------------------------
    console.log('[6/10] Testing Team Lookup & Login with Registered Credentials...');
    const lookupRes = await request(`/auth/team/lookup/${team1Data.teamCode}`);
    const participants = lookupRes.data?.team?.participants || [];
    recordCheck(
      'Lookup returns team details and both registered participants',
      lookupRes.statusCode === 200 && participants.length === 2,
    );

    const p1 = participants[0];
    const p2 = participants[1];

    // Participant A logs in
    const p1LoginRes = await request('/auth/team/login', {
      method: 'POST',
      body: {
        teamCode: team1Data.teamCode,
        password: team1Pass,
        participantId: p1.id,
      },
    });

    const p1Cookie = p1LoginRes.sessionCookie;
    recordCheck(
      'Participant A logs in successfully with registered password (HTTP 200)',
      p1LoginRes.statusCode === 200 && !!p1Cookie,
    );

    // -------------------------------------------------------------------------
    // 7. Single-Active-Participant Session Mutex Enforcement
    // -------------------------------------------------------------------------
    console.log('[7/10] Testing Single-Session Concurrency Mutex (Participant B blocked)...');
    const p2ConcurrentLoginRes = await request('/auth/team/login', {
      method: 'POST',
      body: {
        teamCode: team1Data.teamCode,
        password: team1Pass,
        participantId: p2.id,
      },
    });
    recordCheck(
      'Participant B login is rejected while Participant A is active (HTTP 409 Conflict)',
      p2ConcurrentLoginRes.statusCode === 409,
      `Got status ${p2ConcurrentLoginRes.statusCode}`,
    );

    // -------------------------------------------------------------------------
    // 8. Relay Handover: Participant A logs out -> Participant B logs in
    // -------------------------------------------------------------------------
    console.log('[8/10] Testing Relay Handover: Participant A logout -> Participant B login...');
    const p1LogoutRes = await request('/auth/logout', {
      method: 'POST',
      cookie: p1Cookie,
    });
    recordCheck('Participant A logs out successfully', p1LogoutRes.statusCode === 200);

    // Participant B logs in now
    const p2LoginAfterLogoutRes = await request('/auth/team/login', {
      method: 'POST',
      body: {
        teamCode: team1Data.teamCode,
        password: team1Pass,
        participantId: p2.id,
      },
    });
    const p2Cookie = p2LoginAfterLogoutRes.sessionCookie;
    recordCheck(
      'Participant B logs in successfully after Participant A logout (Relay Handover)',
      p2LoginAfterLogoutRes.statusCode === 200 && !!p2Cookie,
    );

    // -------------------------------------------------------------------------
    // 9. Admin Roster Visibility: Registration Date, Last Login, Active Session
    // -------------------------------------------------------------------------
    console.log('[9/10] Testing Admin Visibility of Registered Teams...');
    const adminLoginRes = await request('/auth/admin/login', {
      method: 'POST',
      body: {
        email: process.env.ADMIN_EMAIL || 'admin@ignitron.local',
        password: process.env.ADMIN_PASSWORD || 'Ignitron@Admin2026',
      },
    });
    const adminCookie = adminLoginRes.sessionCookie;

    const adminTeamsRes = await request('/admin/teams', {
      cookie: adminCookie,
    });
    const allTeams = adminTeamsRes.data?.data || [];
    const foundTeam1 = allTeams.find((t) => t.teamCode === team1Data.teamCode);

    recordCheck(
      'Admin sees registered team with createdAt, lastLoginAt, and activeSession',
      adminTeamsRes.statusCode === 200 &&
        !!foundTeam1 &&
        !!foundTeam1.createdAt &&
        !!foundTeam1.lastLoginAt &&
        foundTeam1.activeSession?.participantName === p2.fullName,
      `Active session participant: ${foundTeam1?.activeSession?.participantName}`,
    );

    // -------------------------------------------------------------------------
    // 10. Admin CSV Export Endpoint
    // -------------------------------------------------------------------------
    console.log('[10/10] Testing Admin CSV Export Endpoint (/api/admin/teams/export/csv)...');
    const csvExportRes = await request('/admin/teams/export/csv', {
      cookie: adminCookie,
    });

    const isCsvContent =
      csvExportRes.statusCode === 200 &&
      typeof csvExportRes.data === 'string' &&
      csvExportRes.data.includes('Team Code,Team Name,Institution') &&
      csvExportRes.data.includes(team1Data.teamCode);

    recordCheck(
      'Admin exports complete registration roster as CSV with headers and team data',
      isCsvContent,
      `CSV length: ${csvExportRes.data?.length || 0} characters`,
    );

  } catch (err) {
    console.error('\n\x1b[31mUnexpected test suite error:\x1b[0m', err);
    recordCheck('Test suite completed without fatal error', false, err.message);
  }

  console.log('\n=============================================================');
  console.log(`  PHASE 1 RESTRUCTURING RESULTS: ${passedChecks}/${totalChecks} CHECKS PASSED`);
  console.log('=============================================================\n');

  return passedChecks === totalChecks && totalChecks > 0;
}

async function main() {
  const isServerRunning = await waitForServer(2, 500);

  if (!isServerRunning) {
    console.log('Starting backend server for test execution...');
    const backendProc = spawn('node', ['apps/backend/dist/main.js'], {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
    });

    const ready = await waitForServer(30, 1000);
    if (!ready) {
      console.error('Backend server failed to start within 30 seconds.');
      try {
        require('child_process').execSync(`taskkill /pid ${backendProc.pid} /f /t`);
      } catch {}
      process.exit(1);
    }

    const passed = await runTests();
    try {
      require('child_process').execSync(`taskkill /pid ${backendProc.pid} /f /t`);
    } catch {}
    process.exit(passed ? 0 : 1);
  } else {
    const passed = await runTests();
    process.exit(passed ? 0 : 1);
  }
}

main();
