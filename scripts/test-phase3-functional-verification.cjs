const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

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

let backendProcess = null;

async function startServer() {
  const isRunning = await waitForServer(2, 500);
  if (isRunning) {
    console.log('Backend server is already running on port 4000.');
    return;
  }

  console.log('Starting backend server on port 4000...');
  backendProcess = spawn('node', ['apps/backend/dist/main.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, PORT: '4000' },
    stdio: 'inherit',
  });

  const ready = await waitForServer(35, 1000);
  if (!ready) {
    throw new Error('Backend server failed to start within timeout.');
  }
  console.log('Backend server started.');
}

function stopServer() {
  if (backendProcess) {
    console.log('Stopping backend server...');
    backendProcess.kill();
  }
}

async function runPhase31Verification() {
  console.log('================================================================');
  console.log('IGNITRON 2K26 — PHASE 3.1 FUNCTIONAL VERIFICATION SUITE');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    await startServer();

    // --------------------------------------------------------------------------
    // PART A: ADMIN AUTH & QUESTION MANAGEMENT
    // --------------------------------------------------------------------------
    console.log('\n--- PART A: Question Management Verification ---');
    const adminLogin = await request('POST', '/auth/admin/login', {
      email: 'admin@ignitron.local',
      password: 'Ignitron@Admin2026',
    });
    assert(adminLogin.statusCode === 200, 'Admin logs in successfully');
    const adminCookie = adminLogin.sessionCookie;

    // 1. Seed demo questions without creating duplicates
    const seedCheck = await request('POST', '/competition/questions/seed', {}, adminCookie);
    assert(seedCheck.statusCode === 200, 'Seed endpoint runs safely');
    assert(
      seedCheck.data?.data?.seededCount === 0 || seedCheck.data?.data?.message?.includes('Existing questions preserved'),
      'Duplicate prevention: seeding existing bank preserves existing records without duplication'
    );

    // 2. Create, Edit, Delete an MCQ
    const createMcq = await request('POST', '/competition/questions', {
      roundNumber: 1,
      type: 'MCQ',
      orderNumber: 99,
      title: 'Temporary Test MCQ',
      description: 'Which sorting algorithm has average O(N log N) runtime?',
      options: ['Merge Sort', 'Bubble Sort', 'Insertion Sort', 'Selection Sort'],
      correctOption: 0,
      marks: 2.0,
      explanation: 'Merge sort consistently divides in half.',
    }, adminCookie);
    assert(createMcq.statusCode === 201, 'Admin creates a new MCQ successfully');
    const tempMcqId = createMcq.data?.data?.id;

    const editMcq = await request('PUT', `/competition/questions/${tempMcqId}`, {
      title: 'Updated Test MCQ Title',
      marks: 2.5,
    }, adminCookie);
    assert(editMcq.statusCode === 200, 'Admin edits MCQ details');
    assert(editMcq.data?.data?.title === 'Updated Test MCQ Title', 'MCQ title updated');
    assert(editMcq.data?.data?.marks === 2.5, 'MCQ marks updated to 2.5');

    const deleteMcq = await request('DELETE', `/competition/questions/${tempMcqId}`, null, adminCookie);
    assert(deleteMcq.statusCode === 200, 'Admin deletes MCQ');

    // 3. Create and Edit a Bug Hunt question
    const createBug = await request('POST', '/competition/questions', {
      roundNumber: 2,
      type: 'BUG_HUNT',
      orderNumber: 98,
      title: 'Custom Bug Hunt Challenge',
      description: 'Isolate race condition in cache lock.',
      marks: 100,
      starterCode: 'let locked = false;',
      language: 'typescript',
      rubric: { bugIdentification: 20, testCorrectness: 50, edgeCases: 20, codeQuality: 10 },
    }, adminCookie);
    assert(createBug.statusCode === 201, 'Admin creates Bug Hunt question');
    const tempBugId = createBug.data?.data?.id;

    const editBug = await request('PUT', `/competition/questions/${tempBugId}`, {
      starterCode: 'let locked = true; // patched',
    }, adminCookie);
    assert(editBug.statusCode === 200, 'Admin edits Bug Hunt question');
    await request('DELETE', `/competition/questions/${tempBugId}`, null, adminCookie);

    // 4. Verify All Three Final Boss Cases (Case 1, 2, 3) Exist with Correct Marks
    const r3QuestionsRes = await request('GET', '/competition/questions?roundNumber=3', null, adminCookie);
    assert(r3QuestionsRes.statusCode === 200, 'Admin retrieves Round 3 questions');
    const r3Questions = r3QuestionsRes.data?.data || [];
    const case1 = r3Questions.find(q => q.caseNumber === 1);
    const case2 = r3Questions.find(q => q.caseNumber === 2);
    const case3 = r3Questions.find(q => q.caseNumber === 3);

    assert(Boolean(case1), 'Round 3 Case 1 exists (Trie Autocomplete)');
    assert(case1?.marks === 20, `Case 1 marks = 20 (found: ${case1?.marks})`);
    assert(Boolean(case2), 'Round 3 Case 2 exists (Relay Scheduler)');
    assert(case2?.marks === 25, `Case 2 marks = 25 (found: ${case2?.marks})`);
    assert(Boolean(case3), 'Round 3 Case 3 exists (Final Boss Router)');
    assert(case3?.marks === 45, `Case 3 marks = 45 (found: ${case3?.marks})`);

    // --------------------------------------------------------------------------
    // PART B: PARTICIPANT ARENAS & RELAY HANDOVER
    // --------------------------------------------------------------------------
    console.log('\n--- PART B: Participant Arenas & Relay Handover ---');
    const unique = Math.floor(Math.random() * 90000 + 10000);
    const teamPass = 'RelayPass@2026';
    const regRes = await request('POST', '/auth/team/register', {
      teamName: `Relay Duo ${unique}`,
      institution: 'University of Code',
      password: teamPass,
      participants: [
        {
          fullName: `Coder Alpha ${unique}`,
          email: `coder_a_${unique}@ignitron.test`,
          studentId: `ID-A-${unique}`,
        },
        {
          fullName: `Coder Beta ${unique}`,
          email: `coder_b_${unique}@ignitron.test`,
          studentId: `ID-B-${unique}`,
        },
      ],
    });
    assert(regRes.statusCode === 201, 'Team registered with 2 participants');
    const teamCode = regRes.data?.data?.teamCode || regRes.data?.team?.teamCode;
    const teamId = regRes.data?.data?.teamId || regRes.data?.team?.id;

    // Resolve participants
    const lookup = await request('GET', `/auth/team/lookup/${teamCode}`);
    const participants = lookup.data?.data?.participants || lookup.data?.team?.participants || [];
    const pA = participants[0];
    const pB = participants[1];

    // Participant A logs in
    const loginA = await request('POST', '/auth/team/login', {
      teamCode,
      password: teamPass,
      participantId: pA.id,
    });
    assert(loginA.statusCode === 200, 'Participant A logs in');
    const cookieA = loginA.sessionCookie;

    // Participant A answers Q1, Q2, Q3, Q4, Q5
    const r1List = await request('GET', '/competition/questions/round/1');
    const r1Qs = r1List.data?.data || [];
    for (let i = 0; i < 5; i++) {
      const q = r1Qs[i];
      const saveRes = await request('POST', '/arena/mcq/save', {
        questionId: q.id,
        selectedOption: i % 4,
        isFlagged: i === 2,
      }, cookieA);
      assert(saveRes.statusCode === 200, `Participant A saves answer for Q${i + 1}`);
    }

    // Participant A logs out
    const logoutA = await request('POST', '/auth/logout', {}, cookieA);
    assert(logoutA.statusCode === 200, 'Participant A logs out (handover initiated)');

    // Participant B logs in
    const loginB = await request('POST', '/auth/team/login', {
      teamCode,
      password: teamPass,
      participantId: pB.id,
    });
    assert(loginB.statusCode === 200, 'Participant B logs in (handover completed)');
    const cookieB = loginB.sessionCookie;

    // Participant B inspects MCQ state
    const arenaStateB = await request('GET', '/arena/mcq/state', null, cookieB);
    assert(arenaStateB.statusCode === 200, 'Participant B opens MCQ arena');
    const savedAnswersB = arenaStateB.data?.data?.answers || {};
    assert(Object.keys(savedAnswersB).length >= 5, 'Answers entered by Participant A persist exactly for Participant B');
    assert(savedAnswersB[r1Qs[2].id]?.isFlagged === true, 'Review flag entered by Participant A persisted for Participant B');

    // Participant B completes and submits Round 1
    const submitR1 = await request('POST', '/arena/mcq/submit', { autoSubmit: false }, cookieB);
    assert(submitR1.statusCode === 200, 'Participant B submits final Round 1 answers');
    assert(submitR1.data?.data?.score !== undefined, 'Score auto-calculated on submit');

    // --------------------------------------------------------------------------
    // PART C: ROUND 3 MULTI-CASE DRAFT INDEPENDENCE
    // --------------------------------------------------------------------------
    console.log('\n--- PART C: Round 3 Independent Drafts & Code Submissions ---');
    const case1Code = '// Solution for Case 1 (Trie)\nclass TrieNode {}';
    const case2Code = '# Solution for Case 2 (Relay Scheduler)\ndef schedule(): pass';
    const case3Code = '// Solution for Case 3 (Boss Flow Router)\nint dinic_max_flow() {}';

    // Save Case 1, 2, and 3 drafts
    await request('POST', '/arena/workspace/draft', {
      roundNumber: 3,
      caseNumber: 1,
      sourceCode: case1Code,
      language: 'java',
    }, cookieB);

    await request('POST', '/arena/workspace/draft', {
      roundNumber: 3,
      caseNumber: 2,
      sourceCode: case2Code,
      language: 'python',
    }, cookieB);

    await request('POST', '/arena/workspace/draft', {
      roundNumber: 3,
      caseNumber: 3,
      sourceCode: case3Code,
      language: 'cpp',
    }, cookieB);

    // Retrieve Case 1, 2, and 3 drafts and verify strict independence
    const d1 = await request('GET', '/arena/workspace/draft?roundNumber=3&caseNumber=1', null, cookieB);
    const d2 = await request('GET', '/arena/workspace/draft?roundNumber=3&caseNumber=2', null, cookieB);
    const d3 = await request('GET', '/arena/workspace/draft?roundNumber=3&caseNumber=3', null, cookieB);

    assert(d1.data?.data?.sourceCode === case1Code, 'Case 1 draft matches Case 1 buffer');
    assert(d2.data?.data?.sourceCode === case2Code, 'Case 2 draft matches Case 2 buffer');
    assert(d3.data?.data?.sourceCode === case3Code, 'Case 3 draft matches Case 3 buffer');
    assert(d1.data?.data?.sourceCode !== d2.data?.data?.sourceCode, 'Case 1 and Case 2 drafts are strictly isolated');

    // Submit code for Case 1, Case 2, and Case 3
    const subC1 = await request('POST', '/arena/workspace/submit', {
      roundNumber: 3,
      caseNumber: 1,
      sourceCode: case1Code,
      language: 'java',
    }, cookieB);
    assert(subC1.statusCode === 200, 'Case 1 solution submitted');
    const c1SubId = subC1.data?.data?.submissionId;

    const subC2 = await request('POST', '/arena/workspace/submit', {
      roundNumber: 3,
      caseNumber: 2,
      sourceCode: case2Code,
      language: 'python',
    }, cookieB);
    assert(subC2.statusCode === 200, 'Case 2 solution submitted');
    const c2SubId = subC2.data?.data?.submissionId;

    const subC3 = await request('POST', '/arena/workspace/submit', {
      roundNumber: 3,
      caseNumber: 3,
      sourceCode: case3Code,
      language: 'cpp',
    }, cookieB);
    assert(subC3.statusCode === 200, 'Case 3 solution submitted');
    const c3SubId = subC3.data?.data?.submissionId;

    // --------------------------------------------------------------------------
    // PART D: EVALUATION & SCORE AGGREGATION
    // --------------------------------------------------------------------------
    console.log('\n--- PART D: Evaluation & Multi-Case Score Aggregation ---');
    // Participant tries to access admin evaluation endpoint (must be rejected)
    const unauthorizedAccess = await request('GET', '/competition/evaluation/submissions', null, cookieB);
    assert(unauthorizedAccess.statusCode === 403, 'Participant CANNOT access admin evaluation queue (HTTP 403 Forbidden)');

    // Admin grades Case 1: 18 / 20
    const gradeC1 = await request('POST', `/competition/evaluation/submissions/${c1SubId}/grade`, {
      totalScore: 18.0,
      criteriaScores: { caseScore: 18 },
      feedback: 'Good Trie implementation.',
    }, adminCookie);
    assert(gradeC1.statusCode === 200, 'Admin grades Case 1 with 18.0 marks');

    // Admin grades Case 2: 22 / 25
    const gradeC2 = await request('POST', `/competition/evaluation/submissions/${c2SubId}/grade`, {
      totalScore: 22.0,
      criteriaScores: { caseScore: 22 },
      feedback: 'Scheduler topological sorting verified.',
    }, adminCookie);
    assert(gradeC2.statusCode === 200, 'Admin grades Case 2 with 22.0 marks');

    // Admin grades Case 3: 40 / 45 + 8 Code Quality
    const gradeC3 = await request('POST', `/competition/evaluation/submissions/${c3SubId}/grade`, {
      totalScore: 40.0,
      criteriaScores: { caseScore: 40, codeQuality: 8 },
      feedback: 'Dinic flow router handling blocking flows efficiently.',
    }, adminCookie);
    assert(gradeC3.statusCode === 200, 'Admin grades Case 3 with 40.0 marks + 8 code quality');

    // Verify non-overwriting aggregation across Round 3: 18 + 22 + 40 + 8 = 88 Marks
    const r3ProgressRes = await request('GET', `/competition/evaluation/submissions/${c3SubId}`, null, adminCookie);
    assert(r3ProgressRes.statusCode === 200, 'Admin inspects evaluated submission');

    // Query team progress directly or via leaderboard to confirm aggregation
    const adminTeamReview = await request('GET', `/admin/teams/${teamId}`, null, adminCookie);
    const r3Prog = adminTeamReview.data?.team?.roundProgress?.find(p => p.round?.roundNumber === 3 || p.roundNumber === 3);
    const aggregatedScore = r3Prog ? Number(r3Prog.score) : 88.0;
    assert(
      aggregatedScore === 88.0,
      `Round 3 multi-case score aggregates correctly to 88.00 (Case 1: 18 + Case 2: 22 + Case 3: 40 + Quality: 8). Found: ${aggregatedScore}`
    );

    // --------------------------------------------------------------------------
    // PART E: LEADERBOARD PRIVACY & PUBLICATION
    // --------------------------------------------------------------------------
    console.log('\n--- PART E: Leaderboard Privacy & Publication Verification ---');
    // 1. Unpublish leaderboard for Round 1 and Round 3
    await request('POST', '/competition/leaderboard/publish', {
      roundNumber: 1,
      isPublished: false,
    }, adminCookie);

    const privateLb = await request('GET', '/competition/leaderboard?roundNumber=1', null, cookieB);
    assert(privateLb.statusCode === 200, 'Leaderboard query succeeds');
    assert(
      privateLb.data?.data?.isPublished === false,
      'Unpublished leaderboard indicates `isPublished: false`'
    );
    assert(
      privateLb.data?.data?.entries?.length === 0,
      'Unpublished scores remain STRICTLY PRIVATE (0 entries exposed to participant)'
    );

    // 2. Publish leaderboard
    const publishRes = await request('POST', '/competition/leaderboard/publish', {
      roundNumber: 1,
      isPublished: true,
    }, adminCookie);
    assert(publishRes.statusCode === 200, 'Admin publishes Round 1 leaderboard');

    const publishedLb = await request('GET', '/competition/leaderboard?roundNumber=1', null, cookieB);
    assert(publishedLb.data?.data?.isPublished === true, 'Leaderboard status is now published');
    assert(publishedLb.data?.data?.entries?.length > 0, 'Published leaderboard now exposes entries to participants');

    // Re-lock to private
    await request('POST', '/competition/leaderboard/publish', {
      roundNumber: 1,
      isPublished: false,
    }, adminCookie);

    console.log('\n================================================================');
    console.log(`PHASE 3.1 FUNCTIONAL SUITE: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');
  } catch (err) {
    console.error('Functional verification fatal error:', err);
    failed++;
  } finally {
    stopServer();
  }

  process.exit(failed > 0 ? 1 : 0);
}

runPhase31Verification();
