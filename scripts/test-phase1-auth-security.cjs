const http = require('http');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:4000/api';

function request(method, endpoint, body = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + endpoint);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (cookie) {
      options.headers['Cookie'] = cookie;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }

        const setCookie = res.headers['set-cookie'];
        let sessionCookie = null;
        if (setCookie) {
          const cookieStr = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
          const match = cookieStr.match(/ignitron_session=([^;]+)/);
          if (match) sessionCookie = `ignitron_session=${match[1]}`;
        }

        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: json,
          sessionCookie,
        });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function waitForServer(retries = 30, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await request('GET', '/health');
      if (res.statusCode === 200) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

async function runTests() {
  console.log('=============================================================');
  console.log('   IGNITRON 2K26 — PHASE 1.1 AUTH & ROUTE SECURITY SUITE     ');
  console.log('=============================================================\n');

  const results = [];
  function assert(title, condition, extra = '') {
    if (condition) {
      console.log(`  ✔ [PASS] ${title}`);
      results.push({ title, pass: true });
    } else {
      console.error(`  ✖ [FAIL] ${title} ${extra ? `(${extra})` : ''}`);
      results.push({ title, pass: false, error: extra });
    }
  }

  const timestamp = Date.now().toString().slice(-6);

  // 1. Logged-out access to workspace
  console.log('[1/9] Testing Logged-Out Access to Workspace API...');
  const unauthWorkspace = await request('GET', '/workspace/draft');
  assert(
    'Logged-out access to /api/workspace/draft is blocked (HTTP 401)',
    unauthWorkspace.statusCode === 401,
    `Got status: ${unauthWorkspace.statusCode}`,
  );

  // 2. Logged-out access to team dashboard API
  console.log('\n[2/9] Testing Logged-Out Access to Team Dashboard API...');
  const unauthStatus = await request('GET', '/competition/team-status');
  assert(
    'Logged-out access to /api/competition/team-status is blocked (HTTP 401)',
    unauthStatus.statusCode === 401,
    `Got status: ${unauthStatus.statusCode}`,
  );

  // Register a test team for authentication tests
  const regRes = await request('POST', '/auth/team/register', {
    teamName: `SecTest Team ${timestamp}`,
    institution: 'Security University',
    password: 'SecureTeamPassword123!',
    participants: [
      {
        fullName: 'Alice Sec',
        email: `alice.sec.${timestamp}@test.edu`,
        phone: '9876543210',
        studentId: 'SEC001',
      },
      {
        fullName: 'Bob Sec',
        email: `bob.sec.${timestamp}@test.edu`,
        phone: '9876543211',
        studentId: 'SEC002',
      },
    ],
  });

  const registeredTeam = regRes.data.data;
  const teamCode = registeredTeam.teamCode; // e.g. IGN-XXXX
  const p1 = registeredTeam.participants[0];
  const p2 = registeredTeam.participants[1];

  // 3. Lowercase Team Code Login & Lookup
  console.log('\n[3/9] Testing Lowercase & Untrimmed Team Code Input...');
  const lowercaseCode = teamCode.toLowerCase(); // e.g. ign-xxxx
  const untrimmedLowercase = `  ${lowercaseCode}  `;

  const lookupRes = await request('GET', `/auth/team/lookup/${encodeURIComponent(untrimmedLowercase)}`);
  assert(
    'Lookup accepts lowercase and trimmed Team Code (HTTP 200)',
    lookupRes.statusCode === 200 && lookupRes.data.team.teamCode === teamCode,
    `Got status: ${lookupRes.statusCode}`,
  );

  const lowercaseLogin = await request('POST', '/auth/team/login', {
    teamCode: untrimmedLowercase,
    password: 'SecureTeamPassword123!',
    participantId: p1.id,
  });
  assert(
    'Login accepts lowercase Team Code and authenticates successfully (HTTP 200)',
    lowercaseLogin.statusCode === 200 && lowercaseLogin.data.user.type === 'TEAM',
    `Got status: ${lowercaseLogin.statusCode}`,
  );
  const teamCookie = lowercaseLogin.sessionCookie;

  // 4. Uppercase Team Code Login (after logout)
  console.log('\n[4/9] Testing Uppercase Team Code Login...');
  await request('POST', '/auth/logout', null, teamCookie);

  const uppercaseLogin = await request('POST', '/auth/team/login', {
    teamCode: teamCode.toUpperCase(),
    password: 'SecureTeamPassword123!',
    participantId: p1.id,
  });
  assert(
    'Login accepts uppercase Team Code and authenticates successfully (HTTP 200)',
    uppercaseLogin.statusCode === 200 && uppercaseLogin.data.user.type === 'TEAM',
    `Got status: ${uppercaseLogin.statusCode}`,
  );
  const activeTeamCookie = uppercaseLogin.sessionCookie;

  // 5. Invalid email entered as Team Code
  console.log('\n[5/9] Testing Invalid Email Entered as Team Code...');
  const emailAsCodeLookup = await request('GET', '/auth/team/lookup/alice.sec@test.edu');
  assert(
    'Lookup rejects email address entered as Team Code (HTTP 400)',
    emailAsCodeLookup.statusCode === 400 && JSON.stringify(emailAsCodeLookup.data).includes('email address'),
    `Got status: ${emailAsCodeLookup.statusCode}`,
  );

  const emailAsCodeLogin = await request('POST', '/auth/team/login', {
    teamCode: 'alice.sec@test.edu',
    password: 'SecureTeamPassword123!',
    participantId: p1.id,
  });
  assert(
    'Login rejects email address entered as Team Code (HTTP 400)',
    emailAsCodeLogin.statusCode === 400 && JSON.stringify(emailAsCodeLogin.data).includes('email address'),
    `Got status: ${emailAsCodeLogin.statusCode}`,
  );

  // 6. Single-Session A/B Mutex Restriction
  console.log('\n[6/9] Testing Participant A/B Session Mutex Restriction...');
  const p2BlockedLogin = await request('POST', '/auth/team/login', {
    teamCode: teamCode,
    password: 'SecureTeamPassword123!',
    participantId: p2.id,
  });
  assert(
    'Participant B is blocked while Participant A is actively logged in (HTTP 409 Conflict)',
    p2BlockedLogin.statusCode === 409,
    `Got status: ${p2BlockedLogin.statusCode}`,
  );

  // 7. Team trying to access admin routes
  console.log('\n[7/9] Testing Team Access Control to Admin Routes...');
  const teamAccessAdminStats = await request('GET', '/admin/dashboard-stats', null, activeTeamCookie);
  assert(
    'Team user cannot access /api/admin/dashboard-stats (HTTP 403 Forbidden)',
    teamAccessAdminStats.statusCode === 403,
    `Got status: ${teamAccessAdminStats.statusCode}`,
  );

  const teamAccessAdminTeams = await request('GET', '/admin/teams', null, activeTeamCookie);
  assert(
    'Team user cannot access /api/admin/teams (HTTP 403 Forbidden)',
    teamAccessAdminTeams.statusCode === 403,
    `Got status: ${teamAccessAdminTeams.statusCode}`,
  );

  const teamAccessCompControl = await request('POST', '/competition/control', { action: 'PAUSE' }, activeTeamCookie);
  assert(
    'Team user cannot access /api/competition/control (HTTP 403 Forbidden)',
    teamAccessCompControl.statusCode === 403,
    `Got status: ${teamAccessCompControl.statusCode}`,
  );

  // 8. Admin Authentication & Role Enforcement
  console.log('\n[8/9] Testing Admin Authentication & Access...');
  const adminLoginRes = await request('POST', '/auth/admin/login', {
    email: process.env.ADMIN_EMAIL || 'admin@ignitron.local',
    password: process.env.ADMIN_PASSWORD || 'Ignitron@Admin2026',
  });
  assert(
    'Admin logs in successfully with ADMIN credentials (HTTP 200)',
    adminLoginRes.statusCode === 200 && adminLoginRes.data.user.type === 'ADMIN',
    `Got status: ${adminLoginRes.statusCode}`,
  );
  const adminCookie = adminLoginRes.sessionCookie;

  const adminStats = await request('GET', '/admin/dashboard-stats', null, adminCookie);
  assert(
    'Admin successfully accesses /api/admin/dashboard-stats (HTTP 200)',
    adminStats.statusCode === 200 && adminStats.data.success === true,
    `Got status: ${adminStats.statusCode}`,
  );

  const adminWorkspaceAccess = await request('GET', '/workspace/draft', null, adminCookie);
  assert(
    'Admin cannot access team-only /api/workspace/draft (HTTP 403 Forbidden)',
    adminWorkspaceAccess.statusCode === 403,
    `Got status: ${adminWorkspaceAccess.statusCode}`,
  );

  // 9. Logout Security & Session Invalidation (Prevents Back / Refresh Access)
  console.log('\n[9/9] Testing Logout Security, Session Clearing & Post-Logout Invalidation...');
  const logoutRes = await request('POST', '/auth/logout', null, activeTeamCookie);
  assert(
    'Logout successfully invalidates server session (HTTP 200)',
    logoutRes.statusCode === 200,
    `Got status: ${logoutRes.statusCode}`,
  );

  // Attempting to reuse the revoked/logged-out cookie (simulating browser Back or page refresh)
  const backNavAttemptMe = await request('GET', '/auth/me', null, activeTeamCookie);
  assert(
    'Browser Back / Refresh revalidation to /api/auth/me fails after logout (HTTP 401)',
    backNavAttemptMe.statusCode === 401,
    `Got status: ${backNavAttemptMe.statusCode}`,
  );

  const backNavAttemptWorkspace = await request('GET', '/workspace/draft', null, activeTeamCookie);
  assert(
    'Direct URL / Back navigation to /api/workspace/draft fails after logout (HTTP 401)',
    backNavAttemptWorkspace.statusCode === 401,
    `Got status: ${backNavAttemptWorkspace.statusCode}`,
  );

  // Frontend Route Protection Verification
  console.log('\n[Frontend Route Guard Verification]');
  const appTsx = fs.readFileSync(path.resolve(__dirname, '../apps/frontend/src/App.tsx'), 'utf8');
  const hasProtectedWorkspace = appTsx.includes('path="workspace"') && appTsx.includes('requiredType="TEAM"');
  const hasProtectedTeamDash = appTsx.includes('path="team/dashboard"') && appTsx.includes('requiredType="TEAM"');
  const hasProtectedAdminDash = appTsx.includes('path="admin/dashboard"') && appTsx.includes('requiredType="ADMIN"');
  assert('Frontend route /workspace is protected with requiredType="TEAM"', hasProtectedWorkspace);
  assert('Frontend route /team/dashboard is protected with requiredType="TEAM"', hasProtectedTeamDash);
  assert('Frontend route /admin/dashboard is protected with requiredType="ADMIN"', hasProtectedAdminDash);

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;

  console.log('\n=============================================================');
  console.log(`  PHASE 1.1 AUTH & SECURITY RESULTS: ${passed}/${results.length} CHECKS PASSED`);
  if (failed > 0) {
    console.log(`  FAILED: ${failed}`);
  }
  console.log('=============================================================\n');

  return failed === 0;
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
        execSync(`taskkill /pid ${backendProc.pid} /f /t`);
      } catch {}
      process.exit(1);
    }

    const passed = await runTests();
    try {
      execSync(`taskkill /pid ${backendProc.pid} /f /t`);
    } catch {}
    process.exit(passed ? 0 : 1);
  } else {
    const passed = await runTests();
    process.exit(passed ? 0 : 1);
  }
}

main().catch((err) => {
  console.error('Fatal error during test execution:', err);
  process.exit(1);
});
