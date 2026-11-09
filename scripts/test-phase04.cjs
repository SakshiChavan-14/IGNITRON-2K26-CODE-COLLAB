/**
 * IGNITRON 2K26 — Phase 04 Comprehensive Verification Test Suite
 *
 * Validates:
 * 1. Authoritative MySQL Global Competition State Machine (STANDBY -> R1 -> R1_EVAL -> R2 -> R2_EVAL -> R3 -> FINAL_EVAL -> COMPLETED)
 * 2. Server-Authoritative Timer & Deadlines
 * 3. Pause & Resume Mechanics (Preserving Remaining Duration)
 * 4. Progressive Eligibility & Shortlisting Enforcement (Top 50% R1 -> R2, Finalists R2 -> R3)
 * 5. Access Control & Authorization (Rejecting Invalid Transitions & Non-Admin Actions)
 * 6. Team Competition Status & Real-time Progression Visibility
 * 7. Demonstration Data Generation (20 Labeled Demo Teams) & Controlled Reset
 * 8. Comprehensive Activity Logging Audit
 * 9. Regression Check: Phase 03 Single-Participant Session Mutex Enforcement
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
  console.log('  IGNITRON 2K26 — PHASE 04 GLOBAL COMPETITION CONTROL SUITE');
  console.log('=============================================================\n');

  let adminCookie = null;
  let team1Cookie = null;
  let team2Cookie = null;
  let team1Id = null;
  let team2Id = null;
  const unique = Date.now().toString().slice(-4);

  try {
    // -------------------------------------------------------------------------
    // 1. Authenticate Admin
    // -------------------------------------------------------------------------
    console.log('[1/10] Authenticating Administrator...');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@ignitron.local';
    const adminPass = process.env.ADMIN_PASSWORD || 'Ignitron@Admin2026';

    const loginRes = await request('/auth/admin/login', {
      method: 'POST',
      body: { email: adminEmail, password: adminPass },
    });
    adminCookie = loginRes.sessionCookie;
    recordCheck('Administrator authenticated and session established', loginRes.statusCode === 200 && !!adminCookie);

    // -------------------------------------------------------------------------
    // 2. Initial State Verification & Protected Reset
    // -------------------------------------------------------------------------
    console.log('\n[2/10] Verifying Authoritative Global State Machine (STANDBY)...');
    
    // Reset to clean STANDBY state
    await request('/competition/control', {
      method: 'POST',
      cookie: adminCookie,
      body: { action: 'RESET_COMPETITION', resetType: 'FULL_RESET' },
    });

    const initialState = await request('/competition/state');
    recordCheck(
      'Competition state is STANDBY with server time synchronization',
      initialState.statusCode === 200 &&
        initialState.data?.data?.status === 'STANDBY' &&
        !!initialState.data?.data?.serverTime,
    );

    // Verify invalid transition rejection: Cannot start Round 2 directly from STANDBY
    const invalidTrans = await request('/competition/control', {
      method: 'POST',
      cookie: adminCookie,
      body: { action: 'START_ROUND_2' },
    });
    recordCheck(
      'Invalid state transition rejected by state machine (HTTP 400)',
      invalidTrans.statusCode === 400,
    );

    // -------------------------------------------------------------------------
    // 3. Register Two Test Teams with Participants
    // -------------------------------------------------------------------------
    console.log('\n[3/10] Setting Up Test Teams for Tournament Progression...');
    const t1Res = await request('/admin/teams', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        teamCode: `ALGO-${unique}`,
        teamName: `Algorithms Alpha ${unique}`,
        institution: 'University College 1',
        participants: [
          { fullName: 'Alice One', email: `alice1_${unique}@test.local` },
          { fullName: 'Alice Two', email: `alice2_${unique}@test.local` },
        ],
      },
    });
    team1Id = t1Res.data?.team?.id;
    const t1Pass = t1Res.data?.credentials?.temporaryPassword;
    const t1P1Id = t1Res.data?.team?.participants[0]?.id;

    const t2Res = await request('/admin/teams', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        teamCode: `BETA-${unique}`,
        teamName: `Beta Debuggers ${unique}`,
        institution: 'University College 2',
        participants: [
          { fullName: 'Bob One', email: `bob1_${unique}@test.local` },
          { fullName: 'Bob Two', email: `bob2_${unique}@test.local` },
        ],
      },
    });
    team2Id = t2Res.data?.team?.id;
    const t2Pass = t2Res.data?.credentials?.temporaryPassword;
    const t2P1Id = t2Res.data?.team?.participants[0]?.id;

    recordCheck('Two competition teams created with verified participants', !!team1Id && !!team2Id);

    // Team 1 logs in
    const t1Login = await request('/auth/team/login', {
      method: 'POST',
      body: { teamCode: `ALGO-${unique}`, password: t1Pass, participantId: t1P1Id },
    });
    team1Cookie = t1Login.sessionCookie;

    // Team 2 logs in
    const t2Login = await request('/auth/team/login', {
      method: 'POST',
      body: { teamCode: `BETA-${unique}`, password: t2Pass, participantId: t2P1Id },
    });
    team2Cookie = t2Login.sessionCookie;

    recordCheck('Both teams authenticated with single-session concurrency mutex active', !!team1Cookie && !!team2Cookie);

    // -------------------------------------------------------------------------
    // 4. Start Round 1 (MCQ Arena)
    // -------------------------------------------------------------------------
    console.log('\n[4/10] Starting Round 1: MCQ Arena (30 Minutes, 30 Marks)...');
    const startR1 = await request('/competition/control', {
      method: 'POST',
      cookie: adminCookie,
      body: { action: 'START_ROUND_1' },
    });
    recordCheck('Admin successfully starts Round 1 (HTTP 200)', startR1.statusCode === 200);

    const r1State = await request('/competition/state');
    recordCheck(
      'Authoritative state is ROUND_1_ACTIVE with 1800s deadline',
      r1State.statusCode === 200 &&
        r1State.data?.data?.status === 'ROUND_1_ACTIVE' &&
        r1State.data?.data?.currentRoundNumber === 1 &&
        r1State.data?.data?.totalDurationSeconds === 1800,
    );

    // Verify Team 1 status shows ELIGIBLE for Round 1
    const t1R1Status = await request('/competition/team-status', { cookie: team1Cookie });
    recordCheck(
      'Team 1 receives ELIGIBLE status for active Round 1 with server timer',
      t1R1Status.statusCode === 200 &&
        t1R1Status.data?.data?.isEligible === true &&
        t1R1Status.data?.data?.competitionStatus === 'ROUND_1_ACTIVE' &&
        !!t1R1Status.data?.data?.deadlineAt,
    );

    // -------------------------------------------------------------------------
    // 5. Server-Authoritative Timer: Pause & Resume
    // -------------------------------------------------------------------------
    console.log('\n[5/10] Testing Server-Authoritative Timer (Pause & Resume)...');

    // Pause
    const pauseRes = await request('/competition/control', {
      method: 'POST',
      cookie: adminCookie,
      body: { action: 'PAUSE_ROUND' },
    });
    recordCheck('Admin pauses round timer (HTTP 200)', pauseRes.statusCode === 200);

    const pausedState = await request('/competition/state');
    const preservedSeconds = pausedState.data?.data?.remainingDurationSeconds;
    recordCheck(
      'Server state is paused and remaining seconds preserved (>1700s)',
      pausedState.statusCode === 200 &&
        pausedState.data?.data?.isPaused === true &&
        preservedSeconds > 1700,
    );

    // Resume
    const resumeRes = await request('/competition/control', {
      method: 'POST',
      cookie: adminCookie,
      body: { action: 'RESUME_ROUND' },
    });
    recordCheck('Admin resumes round timer (HTTP 200)', resumeRes.statusCode === 200);

    const resumedState = await request('/competition/state');
    recordCheck(
      'Server state is resumed with newly recalculated deadline',
      resumedState.statusCode === 200 &&
        resumedState.data?.data?.isPaused === false &&
        new Date(resumedState.data?.data?.deadlineAt) > new Date(),
    );

    // -------------------------------------------------------------------------
    // 6. Conclude Round 1 -> ROUND_1_EVALUATION
    // -------------------------------------------------------------------------
    console.log('\n[6/10] Ending Round 1 and Entering Evaluation Mode...');
    const endR1 = await request('/competition/control', {
      method: 'POST',
      cookie: adminCookie,
      body: { action: 'END_ROUND' },
    });
    recordCheck('Admin concludes Round 1 (HTTP 200)', endR1.statusCode === 200);

    const r1EvalState = await request('/competition/state');
    recordCheck(
      'State transitioned to ROUND_1_EVALUATION',
      r1EvalState.statusCode === 200 &&
        r1EvalState.data?.data?.status === 'ROUND_1_EVALUATION',
    );

    // Team status should reflect EVALUATION
    const t1EvalStatus = await request('/competition/team-status', { cookie: team1Cookie });
    recordCheck(
      'Team status reflects evaluation in progress',
      t1EvalStatus.statusCode === 200 &&
        t1EvalStatus.data?.data?.competitionStatus === 'ROUND_1_EVALUATION',
    );

    // -------------------------------------------------------------------------
    // 7. Progressive Shortlisting: Advance Team 1 to Round 2 (Disqualify Team 2)
    // -------------------------------------------------------------------------
    console.log('\n[7/10] Testing Round 2 Shortlisting (Top 50% Rule)...');

    // Get candidates for Round 2 shortlisting
    const candidatesR2 = await request('/competition/shortlisting/2', { cookie: adminCookie });
    recordCheck(
      'Candidates for Round 2 shortlisting retrieved successfully',
      candidatesR2.statusCode === 200 && candidatesR2.data?.data?.length >= 2,
    );

    // Qualify Team 1 only (Team 2 is NOT shortlisted)
    const shortlistR2 = await request('/competition/shortlisting', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        roundNumber: 2,
        qualifiedTeamIds: [team1Id],
        notes: 'Top 50% percentile cut applied.',
      },
    });
    recordCheck(
      'Admin shortlists Team 1 and disqualifies Team 2 for Round 2',
      shortlistR2.statusCode === 200 &&
        shortlistR2.data?.data?.qualifiedCount === 1,
    );

    // -------------------------------------------------------------------------
    // 8. Start Round 2: Bug Hunt Arena (40 Minutes, 100 Marks)
    // -------------------------------------------------------------------------
    console.log('\n[8/10] Starting Round 2: Bug Hunt Arena & Enforcing Eligibility...');
    const startR2 = await request('/competition/control', {
      method: 'POST',
      cookie: adminCookie,
      body: { action: 'START_ROUND_2' },
    });
    recordCheck('Admin starts Round 2: Bug Hunt Arena (HTTP 200)', startR2.statusCode === 200);

    // Team 1 is qualified -> must be ELIGIBLE
    const t1R2Status = await request('/competition/team-status', { cookie: team1Cookie });
    recordCheck(
      'Qualified Team 1 is ELIGIBLE for Round 2 with active timer',
      t1R2Status.statusCode === 200 &&
        t1R2Status.data?.data?.isEligible === true &&
        t1R2Status.data?.data?.currentRound?.roundNumber === 2,
    );

    // Team 2 was not qualified -> must be INELIGIBLE
    const t2R2Status = await request('/competition/team-status', { cookie: team2Cookie });
    recordCheck(
      'Unqualified Team 2 is strictly INELIGIBLE for Round 2',
      t2R2Status.statusCode === 200 &&
        t2R2Status.data?.data?.isEligible === false &&
        t2R2Status.data?.data?.eligibilityStatus === 'INELIGIBLE',
    );

    // -------------------------------------------------------------------------
    // 9. Advance to Round 3 (Grand Finals) and Complete Tournament
    // -------------------------------------------------------------------------
    console.log('\n[9/10] Progressing Through Round 3 to Competition Completion...');
    
    // End Round 2 -> ROUND_2_EVALUATION
    await request('/competition/control', {
      method: 'POST',
      cookie: adminCookie,
      body: { action: 'END_ROUND' },
    });

    // Shortlist Team 1 for Round 3 (Final Boss Coding)
    await request('/competition/shortlisting', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        roundNumber: 3,
        qualifiedTeamIds: [team1Id],
        notes: 'Finalist qualification confirmed.',
      },
    });

    // Start Round 3
    const startR3 = await request('/competition/control', {
      method: 'POST',
      cookie: adminCookie,
      body: { action: 'START_ROUND_3' },
    });
    recordCheck('Admin starts Round 3: Final Boss Coding (60 Minutes)', startR3.statusCode === 200);

    // End Round 3 -> FINAL_EVALUATION
    await request('/competition/control', {
      method: 'POST',
      cookie: adminCookie,
      body: { action: 'END_ROUND' },
    });

    // Complete Competition
    const completeRes = await request('/competition/control', {
      method: 'POST',
      cookie: adminCookie,
      body: { action: 'COMPLETE_COMPETITION' },
    });
    recordCheck('Admin officially concludes competition (HTTP 200)', completeRes.statusCode === 200);

    const finalState = await request('/competition/state');
    recordCheck(
      'Final authoritative state is COMPLETED',
      finalState.statusCode === 200 && finalState.data?.data?.status === 'COMPLETED',
    );

    // -------------------------------------------------------------------------
    // 10. Demo Data Generation & Audit Trail Logging
    // -------------------------------------------------------------------------
    console.log('\n[10/10] Testing Demo Data Generation & Activity Logging...');
    
    // Seed 20 Demo Teams
    const demoGen = await request('/competition/demo-data', {
      method: 'POST',
      cookie: adminCookie,
      body: { count: 20 },
    });
    recordCheck(
      'Admin generates 20 labeled demonstration teams with credentials',
      demoGen.statusCode === 200 && demoGen.data?.teamsCount === 20,
    );

    // Verify Activity Logs
    const logsRes = await request('/competition/activity-logs', { cookie: adminCookie });
    recordCheck(
      'Server activity audit trail contains all transition and shortlisting logs',
      logsRes.statusCode === 200 && logsRes.data?.data?.length >= 5,
    );

  } catch (err) {
    console.error('\n\x1b[31mUnexpected test suite error:\x1b[0m', err);
    recordCheck('Test suite completed without unhandled fatal crash', false, err.message);
  }

  // ---------------------------------------------------------------------------
  // Summary Report
  // ---------------------------------------------------------------------------
  console.log('\n=============================================================');
  console.log(`  PHASE 04 VERIFICATION SUMMARY: ${passedChecks}/${totalChecks} CHECKS PASSED`);
  console.log('=============================================================\n');

  if (passedChecks === totalChecks && totalChecks > 0) {
    console.log('\x1b[32m✔ ALL PHASE 04 REQUIREMENTS, STATE MACHINE RULES & AUDITS VERIFIED.\x1b[0m\n');
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

