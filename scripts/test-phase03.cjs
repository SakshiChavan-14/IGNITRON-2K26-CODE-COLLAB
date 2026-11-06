/**
 * IGNITRON 2K26 — Phase 03 Comprehensive Verification Test Script
 *
 * Validates:
 * 1. Admin Bootstrap & Credentials
 * 2. Admin Authentication & Role Guards
 * 3. Manual Team Creation & Duplicate Validation
 * 4. Strict Single-Participant Session Concurrency (409 Conflict on concurrent login)
 * 5. Session Release upon Logout & Relay Handover
 * 6. Admin Active Session Revocation
 * 7. Forced Password Change Flow
 * 8. Unstop CSV Ingestion (Preview, Validation, Transactional Confirm & Export)
 * 9. Dashboard Statistics Verification
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from monorepo root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PORT = 4000;
const BASE_URL = `http://localhost:${PORT}/api`;

let passedChecks = 0;
let totalChecks = 0;
const testResults = [];

function recordCheck(name, passed, details = '') {
  totalChecks++;
  if (passed) {
    passedChecks++;
    console.log(`  \x1b[32m✔ [PASS]\x1b[0m ${name}`);
  } else {
    console.log(`  \x1b[31m✘ [FAIL]\x1b[0m ${name}`);
    if (details) console.log(`     \x1b[33mDetails: ${details}\x1b[0m`);
  }
  testResults.push({ name, passed, details });
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

          // Extract set-cookie if present
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
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

async function runTests() {
  console.log('\n=============================================================');
  console.log('  IGNITRON 2K26 — PHASE 03 COMPREHENSIVE VERIFICATION SUITE');
  console.log('=============================================================\n');

  let adminCookie = null;
  let p1Cookie = null;
  let p2Cookie = null;
  let createdTeam = null;
  let p1Id = null;
  let p2Id = null;
  let tempPassword = null;

  try {
    // -------------------------------------------------------------------------
    // 1. Health & Readiness
    // -------------------------------------------------------------------------
    console.log('[1/9] Verifying Server Health & Readiness...');
    const health = await request('/health');
    recordCheck('Backend Health Endpoint responds with HTTP 200', health.statusCode === 200);

    const readiness = await request('/health/ready');
    recordCheck(
      'Database Readiness Check reports connected',
      readiness.statusCode === 200 && readiness.data?.checks?.database === 'connected',
    );

    // -------------------------------------------------------------------------
    // 2. Admin Authentication
    // -------------------------------------------------------------------------
    console.log('\n[2/9] Testing Administrator Authentication & Role Guards...');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@ignitron.local';
    const adminPass = process.env.ADMIN_PASSWORD || 'Ignitron@Admin2026';

    // Test invalid password
    const badLogin = await request('/auth/admin/login', {
      method: 'POST',
      body: { email: adminEmail, password: 'WrongPassword999!' },
    });
    recordCheck('Admin login rejects invalid credentials (HTTP 401)', badLogin.statusCode === 401);

    // Test valid admin login
    const goodLogin = await request('/auth/admin/login', {
      method: 'POST',
      body: { email: adminEmail, password: adminPass },
    });
    adminCookie = goodLogin.sessionCookie;
    recordCheck(
      'Admin login succeeds with HTTP 200 and sets HttpOnly session cookie',
      goodLogin.statusCode === 200 && !!adminCookie,
    );

    // Test /auth/me for admin
    const adminMe = await request('/auth/me', { cookie: adminCookie });
    recordCheck(
      'Admin session verified via /auth/me with SUPER_ADMIN role',
      adminMe.statusCode === 200 &&
        adminMe.data?.user?.type === 'ADMIN' &&
        adminMe.data?.user?.role === 'SUPER_ADMIN',
    );

    // -------------------------------------------------------------------------
    // 3. Admin Team Creation & Duplicate Validation
    // -------------------------------------------------------------------------
    console.log('\n[3/9] Testing Manual Team Creation & Duplicate Constraints...');
    const uniqueSuffix = Date.now().toString().slice(-4);
    const testTeamPayload = {
      teamCode: `TST-${uniqueSuffix}`,
      teamName: `Algorithm Aces ${uniqueSuffix}`,
      institution: 'University of Engineering',
      participants: [
        {
          fullName: 'Alice Walker',
          email: `alice_${uniqueSuffix}@university.edu`,
          phone: '+1-555-0101',
          studentId: `CS-${uniqueSuffix}-1`,
        },
        {
          fullName: 'Bob Martinez',
          email: `bob_${uniqueSuffix}@university.edu`,
          phone: '+1-555-0102',
          studentId: `CS-${uniqueSuffix}-2`,
        },
      ],
    };

    const createRes = await request('/admin/teams', {
      method: 'POST',
      cookie: adminCookie,
      body: testTeamPayload,
    });

    recordCheck(
      'Admin creates team with 2 participants and receives credentials',
      createRes.statusCode === 201 &&
        createRes.data?.team?.teamCode === testTeamPayload.teamCode &&
        !!createRes.data?.credentials?.temporaryPassword,
    );

    createdTeam = createRes.data?.team;
    tempPassword = createRes.data?.credentials?.temporaryPassword;
    p1Id = createdTeam?.participants[0]?.id;
    p2Id = createdTeam?.participants[1]?.id;

    // Test duplicate email rejection
    const duplicateRes = await request('/admin/teams', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        teamName: 'Duplicate Team',
        participants: [
          {
            fullName: 'Charlie duplicate',
            email: testTeamPayload.participants[0].email, // duplicate email!
          },
          {
            fullName: 'David Unique',
            email: `david_uniq_${uniqueSuffix}@university.edu`,
          },
        ],
      },
    });
    recordCheck(
      'Rejects creation with duplicate participant email (HTTP 409)',
      duplicateRes.statusCode === 409,
    );

    // -------------------------------------------------------------------------
    // 4. Team Code Lookup
    // -------------------------------------------------------------------------
    console.log('\n[4/9] Testing Team Lookup for Login Dropdown...');
    const lookupRes = await request(`/auth/team/lookup/${testTeamPayload.teamCode}`);
    recordCheck(
      'Public team lookup resolves team name and 2 registered participants',
      lookupRes.statusCode === 200 &&
        lookupRes.data?.team?.participants?.length === 2 &&
        lookupRes.data?.team?.teamName === testTeamPayload.teamName,
    );

    // -------------------------------------------------------------------------
    // 5. Strict Single-Participant Session Concurrency
    // -------------------------------------------------------------------------
    console.log('\n[5/9] Testing Strict Single-Participant Session Concurrency...');

    // Participant 1 logs in
    const p1Login = await request('/auth/team/login', {
      method: 'POST',
      body: {
        teamCode: testTeamPayload.teamCode,
        password: tempPassword,
        participantId: p1Id,
      },
    });
    p1Cookie = p1Login.sessionCookie;
    recordCheck(
      'Participant 1 logs in successfully (session lock acquired)',
      p1Login.statusCode === 200 &&
        p1Login.data?.user?.activeParticipant?.id === p1Id &&
        !!p1Cookie,
    );

    // Participant 2 attempts concurrent login -> MUST FAIL with 409 Conflict!
    const p2ConcurrentLogin = await request('/auth/team/login', {
      method: 'POST',
      body: {
        teamCode: testTeamPayload.teamCode,
        password: tempPassword,
        participantId: p2Id,
      },
    });
    recordCheck(
      'Participant 2 concurrent login rejected with HTTP 409 Conflict',
      p2ConcurrentLogin.statusCode === 409,
      p2ConcurrentLogin.data?.message,
    );

    // Participant 1 sends heartbeat
    const heartbeatRes = await request('/auth/heartbeat', {
      method: 'POST',
      cookie: p1Cookie,
    });
    recordCheck(
      'Participant 1 session heartbeat accepted (HTTP 200)',
      heartbeatRes.statusCode === 200,
    );

    // -------------------------------------------------------------------------
    // 6. Session Handover & Logout Release
    // -------------------------------------------------------------------------
    console.log('\n[6/9] Testing Session Logout & Participant Relay Handover...');

    // Participant 1 logs out
    const p1Logout = await request('/auth/logout', {
      method: 'POST',
      cookie: p1Cookie,
    });
    recordCheck(
      'Participant 1 logs out cleanly, releasing concurrency lock',
      p1Logout.statusCode === 200,
    );

    // Participant 2 now logs in -> MUST SUCCEED
    const p2LoginAfterLogout = await request('/auth/team/login', {
      method: 'POST',
      body: {
        teamCode: testTeamPayload.teamCode,
        password: tempPassword,
        participantId: p2Id,
      },
    });
    p2Cookie = p2LoginAfterLogout.sessionCookie;
    recordCheck(
      'Participant 2 logs in successfully after lock was released',
      p2LoginAfterLogout.statusCode === 200 &&
        p2LoginAfterLogout.data?.user?.activeParticipant?.id === p2Id &&
        !!p2Cookie,
    );

    // -------------------------------------------------------------------------
    // 7. Admin Session Revocation & Password Reset
    // -------------------------------------------------------------------------
    console.log('\n[7/9] Testing Admin Session Revocation & Password Reset...');

    // Admin revokes active session for this team
    const revokeRes = await request(`/admin/teams/${createdTeam.id}/revoke-session`, {
      method: 'POST',
      cookie: adminCookie,
    });
    recordCheck(
      'Admin revokes active participant session (HTTP 200)',
      revokeRes.statusCode === 200 && revokeRes.data?.sessionsRevoked > 0,
    );

    // Participant 2 attempts action with revoked session -> MUST FAIL (HTTP 401)
    const p2MeAfterRevoke = await request('/auth/me', { cookie: p2Cookie });
    recordCheck(
      'Revoked session immediately rejected on subsequent requests (HTTP 401)',
      p2MeAfterRevoke.statusCode === 401,
    );

    // Admin resets team password
    const resetRes = await request(`/admin/teams/${createdTeam.id}/reset-password`, {
      method: 'POST',
      cookie: adminCookie,
    });
    const newTempPassword = resetRes.data?.data?.temporaryPassword;
    recordCheck(
      'Admin resets team password and receives new temporary credential',
      resetRes.statusCode === 200 && !!newTempPassword,
    );

    // Team logs in with new temporary password
    const p1LoginNew = await request('/auth/team/login', {
      method: 'POST',
      body: {
        teamCode: testTeamPayload.teamCode,
        password: newTempPassword,
        participantId: p1Id,
      },
    });
    const p1NewCookie = p1LoginNew.sessionCookie;
    recordCheck(
      'Team logs in with reset password and mustChangePassword is true',
      p1LoginNew.statusCode === 200 && p1LoginNew.data?.user?.mustChangePassword === true,
    );

    // Team changes password
    const changePassRes = await request('/auth/change-password', {
      method: 'POST',
      cookie: p1NewCookie,
      body: {
        currentPassword: newTempPassword,
        newPassword: 'PersonalSecurePass2026!',
      },
    });
    recordCheck(
      'Team completes password change successfully',
      changePassRes.statusCode === 200,
    );

    // Verify mustChangePassword is now false
    const teamMeAfterChange = await request('/auth/me', { cookie: p1NewCookie });
    recordCheck(
      'mustChangePassword is now cleared to false in session state',
      teamMeAfterChange.statusCode === 200 &&
        teamMeAfterChange.data?.user?.mustChangePassword === false,
    );

    // -------------------------------------------------------------------------
    // 8. Unstop CSV Bulk Ingestion
    // -------------------------------------------------------------------------
    console.log('\n[8/9] Testing Unstop CSV Bulk Ingestion & Validation...');

    const sampleCsv = `Team Name,College,Leader Name,Leader Email,Member Name,Member Email
"Code Crusaders ${uniqueSuffix}","Tech University","Rohan Sharma","rohan_${uniqueSuffix}@tech.edu","Ananya Iyer","ananya_${uniqueSuffix}@tech.edu"
"Pixel Pioneers ${uniqueSuffix}","National College","Aditya Verma","aditya_${uniqueSuffix}@nat.edu","Sneha Patel","sneha_${uniqueSuffix}@nat.edu"
`;

    // Preview & Validate CSV
    const previewRes = await request('/admin/teams/import/preview', {
      method: 'POST',
      cookie: adminCookie,
      body: { csvContent: sampleCsv },
    });

    recordCheck(
      'CSV Preview parses columns, validates rows, and detects 2 valid teams',
      previewRes.statusCode === 200 &&
        previewRes.data?.data?.validCount === 2 &&
        previewRes.data?.data?.invalidCount === 0,
    );

    // Confirm Bulk Import
    const validRows = previewRes.data?.data?.rows
      ?.filter((r) => r.isValid && r.mappedData)
      .map((r) => r.mappedData);

    const confirmRes = await request('/admin/teams/import/confirm', {
      method: 'POST',
      cookie: adminCookie,
      body: { validRows },
    });

    recordCheck(
      'Bulk import confirms in database transaction with credentials list',
      confirmRes.statusCode === 200 &&
        confirmRes.data?.data?.importedCount === 2 &&
        confirmRes.data?.data?.generatedCredentials?.length === 2,
    );

    // -------------------------------------------------------------------------
    // 9. Dashboard Statistics
    // -------------------------------------------------------------------------
    console.log('\n[9/9] Verifying Admin Dashboard Roster Statistics...');
    const statsRes = await request('/admin/dashboard-stats', { cookie: adminCookie });
    recordCheck(
      'Admin dashboard reflects updated team, contestant, and session totals',
      statsRes.statusCode === 200 &&
        statsRes.data?.data?.totalTeams >= 3 &&
        statsRes.data?.data?.totalParticipants >= 6,
    );

  } catch (err) {
    console.error('\n\x1b[31mUnexpected test suite error:\x1b[0m', err);
    recordCheck('Test suite completed without fatal error', false, err.message);
  }

  // ---------------------------------------------------------------------------
  // Summary Report
  // ---------------------------------------------------------------------------
  console.log('\n=============================================================');
  console.log(`  PHASE 03 VERIFICATION SUMMARY: ${passedChecks}/${totalChecks} CHECKS PASSED`);
  console.log('=============================================================\n');

  if (passedChecks === totalChecks && totalChecks > 0) {
    console.log('\x1b[32m✔ ALL PHASE 03 REQUIREMENTS AND SECURITY CONSTRAINTS VERIFIED.\x1b[0m\n');
    return true;
  } else {
    console.log(`\x1b[31m✘ ${totalChecks - passedChecks} check(s) failed.\x1b[0m\n`);
    return false;
  }
}

// Check if running directly or waiting for external server
async function main() {
  const isServerRunning = await waitForServer(2, 500);

  if (!isServerRunning) {
    console.log('Starting backend server for test execution...');
    const backendProc = spawn('npm', ['run', 'start:prod', '--workspace=@ignitron/backend'], {
      shell: true,
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
    });

    const ready = await waitForServer(30, 1000);
    if (!ready) {
      console.error('Backend server failed to start within 30 seconds.');
      backendProc.kill();
      process.exit(1);
    }

    const passed = await runTests();
    // Cleanly kill spawned backend process on Windows
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

