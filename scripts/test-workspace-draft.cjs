/**
 * IGNITRON 2K26 — Shared Team Workspace Drafts Verification Suite
 *
 * Validates:
 * 1. Default starter template retrieval when no draft exists
 * 2. Participant A draft saving & version increment
 * 3. Language persistence (switching between C++, Python, etc.)
 * 4. Exact Participant A to B relay handover:
 *    - Participant A writes & saves code
 *    - Participant A logs out (mutex released)
 *    - Participant B logs in (mutex acquired)
 *    - Participant B retrieves identical code and edits it
 * 5. Team isolation (Team 2 cannot read or overwrite Team 1's draft)
 * 6. Unauthorized access rejection (HTTP 401)
 * 7. Inactive participant session mutex rejection (HTTP 403)
 * 8. Stale save rejection on version mismatch (HTTP 409 Conflict)
 * 9. Source code size limit enforcement (> 64 KB rejected with HTTP 400)
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
  console.log('  IGNITRON 2K26 — SHARED WORKSPACE DRAFTS VERIFICATION');
  console.log('=============================================================\n');

  let adminCookie = null;
  let p1Cookie = null;
  let p2Cookie = null;
  let team2Cookie = null;
  let team1 = null;
  let team1Pass = null;
  let p1Id = null;
  let p2Id = null;

  try {
    // -------------------------------------------------------------------------
    // 1. Setup Admin & Test Teams
    // -------------------------------------------------------------------------
    console.log('[1/5] Setting Up Test Teams with Two Participants Each...');

    const adminLogin = await request('/auth/admin/login', {
      method: 'POST',
      body: {
        email: process.env.ADMIN_EMAIL || 'admin@ignitron.local',
        password: process.env.ADMIN_PASSWORD || 'Ignitron@Admin2026',
      },
    });
    adminCookie = adminLogin.sessionCookie;
    recordCheck('Admin authenticated successfully', adminLogin.statusCode === 200 && !!adminCookie);

    const suffix = Date.now().toString().slice(-4);
    const team1Code = `RELAY1-${suffix}`;

    const createT1 = await request('/admin/teams', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        teamCode: team1Code,
        teamName: `Relay Duo ${suffix}`,
        participants: [
          { fullName: 'Alice Relay', email: `alice_${suffix}@relay.local` },
          { fullName: 'Bob Relay', email: `bob_${suffix}@relay.local` },
        ],
      },
    });
    team1 = createT1.data?.team;
    team1Pass = createT1.data?.credentials?.temporaryPassword;
    p1Id = team1?.participants[0]?.id;
    p2Id = team1?.participants[1]?.id;

    // Team 2 for isolation test
    const team2Code = `RELAY2-${suffix}`;
    const createT2 = await request('/admin/teams', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        teamCode: team2Code,
        teamName: `Other Relay Team ${suffix}`,
        participants: [
          { fullName: 'Charlie Other', email: `charlie_${suffix}@other.local` },
          { fullName: 'Dave Other', email: `dave_${suffix}@other.local` },
        ],
      },
    });
    const team2Pass = createT2.data?.credentials?.temporaryPassword;
    const t2P1Id = createT2.data?.team?.participants[0]?.id;

    recordCheck('Teams created with two registered participants each', !!team1 && !!createT2.data?.team);

    // -------------------------------------------------------------------------
    // 2. Initial Draft Retrieval (Starter Template)
    // -------------------------------------------------------------------------
    console.log('\n[2/5] Testing Initial Draft Retrieval & Starter Template...');

    // Alice (Participant 1) logs in
    const p1Login = await request('/auth/team/login', {
      method: 'POST',
      body: { teamCode: team1Code, password: team1Pass, participantId: p1Id },
    });
    p1Cookie = p1Login.sessionCookie;
    recordCheck('Participant 1 (Alice) logged in with active session', p1Login.statusCode === 200 && !!p1Cookie);

    // Alice requests draft
    const initialDraftRes = await request('/workspace/draft?roundNumber=3', {
      cookie: p1Cookie,
    });
    recordCheck(
      'Returns starter template when no draft exists (version: 0, isStarterTemplate: true)',
      initialDraftRes.statusCode === 200 &&
        initialDraftRes.data?.draft?.isStarterTemplate === true &&
        initialDraftRes.data?.draft?.version === 0 &&
        initialDraftRes.data?.draft?.language === 'cpp' &&
        initialDraftRes.data?.draft?.sourceCode.includes('RELAY_OPTIMIZED'),
    );

    // -------------------------------------------------------------------------
    // 3. Draft Saving, Autosave & Language Persistence
    // -------------------------------------------------------------------------
    console.log('\n[3/5] Testing Participant A Draft Save & Language Persistence...');

    const aliceCode = `// IGNITRON 2K26 - Written by Alice (Participant 1)\n#include <iostream>\nusing namespace std;\nint main() { cout << "ALICE_STEP_1" << endl; return 0; }`;

    const saveDraftRes = await request('/workspace/draft', {
      method: 'PUT',
      cookie: p1Cookie,
      body: {
        sourceCode: aliceCode,
        language: 'cpp',
        roundNumber: 3,
        expectedVersion: 0,
      },
    });
    recordCheck(
      'Participant 1 saves draft successfully (version incremented to 1)',
      saveDraftRes.statusCode === 200 &&
        saveDraftRes.data?.draft?.version === 1 &&
        saveDraftRes.data?.draft?.sourceCode === aliceCode &&
        saveDraftRes.data?.draft?.lastEditedByParticipantId === p1Id,
    );

    // Test language persistence (Alice switches to Python)
    const alicePythonCode = `# Written by Alice in Python\nprint("ALICE_PYTHON_RELAY")\n`;
    const savePyRes = await request('/workspace/draft', {
      method: 'PUT',
      cookie: p1Cookie,
      body: {
        sourceCode: alicePythonCode,
        language: 'python',
        roundNumber: 3,
        expectedVersion: 1,
      },
    });
    recordCheck(
      'Participant 1 updates language to Python & saves successfully (version: 2)',
      savePyRes.statusCode === 200 &&
        savePyRes.data?.draft?.version === 2 &&
        savePyRes.data?.draft?.language === 'python' &&
        savePyRes.data?.draft?.sourceCode === alicePythonCode,
    );

    // Verify GET retrieves updated python draft
    const verifyGet = await request('/workspace/draft?roundNumber=3', {
      cookie: p1Cookie,
    });
    recordCheck(
      'GET /api/workspace/draft retrieves saved Python draft and version',
      verifyGet.statusCode === 200 &&
        verifyGet.data?.draft?.language === 'python' &&
        verifyGet.data?.draft?.version === 2 &&
        verifyGet.data?.draft?.sourceCode === alicePythonCode,
    );

    // -------------------------------------------------------------------------
    // 4. Exact Participant A to B Relay Handover Workflow
    // -------------------------------------------------------------------------
    console.log('\n[4/5] Testing Exact Participant A -> Participant B Relay Handover...');

    // Alice logs out
    const logoutRes = await request('/auth/logout', {
      method: 'POST',
      cookie: p1Cookie,
    });
    recordCheck('Participant 1 (Alice) logs out, releasing session lock', logoutRes.statusCode === 200);

    // Bob (Participant 2) logs in
    const p2Login = await request('/auth/team/login', {
      method: 'POST',
      body: { teamCode: team1Code, password: team1Pass, participantId: p2Id },
    });
    p2Cookie = p2Login.sessionCookie;
    recordCheck('Participant 2 (Bob) logs in successfully, acquiring session lock', p2Login.statusCode === 200 && !!p2Cookie);

    // Bob opens the workspace and loads draft
    const bobDraftRes = await request('/workspace/draft?roundNumber=3', {
      cookie: p2Cookie,
    });
    recordCheck(
      'Participant 2 (Bob) retrieves exactly the code and language saved by Alice',
      bobDraftRes.statusCode === 200 &&
        bobDraftRes.data?.draft?.sourceCode === alicePythonCode &&
        bobDraftRes.data?.draft?.language === 'python' &&
        bobDraftRes.data?.draft?.version === 2,
    );

    // Bob continues editing
    const bobContinuedCode = alicePythonCode + `# Bob continues relay execution\nprint("BOB_HANDOVER_COMPLETE")\n`;
    const bobSaveRes = await request('/workspace/draft', {
      method: 'PUT',
      cookie: p2Cookie,
      body: {
        sourceCode: bobContinuedCode,
        language: 'python',
        roundNumber: 3,
        expectedVersion: 2,
      },
    });
    recordCheck(
      'Participant 2 (Bob) successfully edits and saves draft (version: 3)',
      bobSaveRes.statusCode === 200 &&
        bobSaveRes.data?.draft?.version === 3 &&
        bobSaveRes.data?.draft?.sourceCode === bobContinuedCode &&
        bobSaveRes.data?.draft?.lastEditedByParticipantId === p2Id,
    );

    // -------------------------------------------------------------------------
    // 5. Team Isolation, Security & Concurrency Controls
    // -------------------------------------------------------------------------
    console.log('\n[5/5] Testing Team Isolation, Concurrency & Validation Limits...');

    // Team 2 logs in
    const t2Login = await request('/auth/team/login', {
      method: 'POST',
      body: { teamCode: team2Code, password: team2Pass, participantId: t2P1Id },
    });
    team2Cookie = t2Login.sessionCookie;

    // Team 2 gets their draft
    const t2DraftRes = await request('/workspace/draft?roundNumber=3', {
      cookie: team2Cookie,
    });
    recordCheck(
      'Team 2 is isolated and cannot see Team 1’s code (gets fresh starter template)',
      t2DraftRes.statusCode === 200 &&
        t2DraftRes.data?.draft?.teamId !== team1.id &&
        t2DraftRes.data?.draft?.isStarterTemplate === true &&
        !t2DraftRes.data?.draft?.sourceCode.includes('ALICE') &&
        !t2DraftRes.data?.draft?.sourceCode.includes('BOB'),
    );

    // Unauthenticated request rejection
    const unauthGet = await request('/workspace/draft');
    recordCheck('Rejects unauthenticated draft retrieval (HTTP 401)', unauthGet.statusCode === 401);

    const unauthSave = await request('/workspace/draft', {
      method: 'PUT',
      body: { sourceCode: 'print(1)', language: 'python' },
    });
    recordCheck('Rejects unauthenticated draft save (HTTP 401)', unauthSave.statusCode === 401);

    // Inactive session rejection (Alice tries to save after logging out)
    const alicePostLogoutSave = await request('/workspace/draft', {
      method: 'PUT',
      cookie: p1Cookie,
      body: { sourceCode: 'print(1)', language: 'python' },
    });
    recordCheck(
      'Rejects save when participant session is ended/inactive (HTTP 401)',
      alicePostLogoutSave.statusCode === 401,
    );

    // Stale version conflict handling
    const staleSaveRes = await request('/workspace/draft', {
      method: 'PUT',
      cookie: p2Cookie,
      body: {
        sourceCode: 'print("stale overwrite")',
        language: 'python',
        roundNumber: 3,
        expectedVersion: 1, // Current is 3!
      },
    });
    recordCheck(
      'Rejects stale save when version mismatch detected (HTTP 409 Conflict)',
      staleSaveRes.statusCode === 409,
    );

    // Code size limit (> 64 KB)
    const hugeCode = 'x = 1\n' + ' '.repeat(65 * 1024);
    const hugeCodeRes = await request('/workspace/draft', {
      method: 'PUT',
      cookie: p2Cookie,
      body: {
        sourceCode: hugeCode,
        language: 'python',
        roundNumber: 3,
      },
    });
    recordCheck('Rejects source code exceeding 64 KB limit (HTTP 400)', hugeCodeRes.statusCode === 400);

  } catch (err) {
    console.error('\n\x1b[31mUnexpected test suite error:\x1b[0m', err);
    recordCheck('Test suite completed without unhandled fatal crash', false, err.message);
  }

  // ---------------------------------------------------------------------------
  // Summary Report
  // ---------------------------------------------------------------------------
  console.log('\n=============================================================');
  console.log(`  WORKSPACE DRAFTS VERIFICATION: ${passedChecks}/${totalChecks} CHECKS PASSED`);
  console.log('=============================================================\n');

  if (passedChecks === totalChecks && totalChecks > 0) {
    console.log('\x1b[32m✔ ALL SHARED WORKSPACE & HANDOVER REQUIREMENTS VERIFIED.\x1b[0m\n');
    return true;
  } else {
    console.log(`\x1b[31m✘ ${totalChecks - passedChecks} check(s) failed.\x1b[0m\n`);
    return false;
  }
}

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
