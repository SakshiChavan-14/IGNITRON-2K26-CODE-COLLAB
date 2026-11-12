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
  console.log('Backend server successfully started.');
}

function stopServer() {
  if (backendProcess) {
    console.log('Stopping backend server...');
    backendProcess.kill();
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('IGNITRON 2K26 — PHASE 3 COMPETITION ENGINE VERIFICATION');
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

    // 1. Admin Login
    console.log('\n--- Test 1: Admin Authentication ---');
    const adminLoginRes = await request('POST', '/auth/admin/login', {
      email: 'admin@ignitron.local',
      password: 'Ignitron@Admin2026',
    });
    assert(adminLoginRes.statusCode === 200, 'Admin login succeeds with 200 OK');
    const adminCookie = adminLoginRes.sessionCookie;
    assert(Boolean(adminCookie), 'Admin receives HttpOnly session cookie');

    // 2. Seed Question Bank
    console.log('\n--- Test 2: Official Question Bank Seeding ---');
    const seedRes = await request('POST', '/competition/questions/seed', {}, adminCookie);
    assert(seedRes.statusCode === 200, 'Admin seeds question bank with 200 OK');
    console.log('  Seed result:', seedRes.data?.data?.message || seedRes.data);

    // 3. Admin Question Listing & Data Integrity
    console.log('\n--- Test 3: Admin Question Listing & Data Integrity ---');
    const r1QuestionsRes = await request('GET', '/competition/questions?roundNumber=1', null, adminCookie);
    assert(r1QuestionsRes.statusCode === 200, 'Admin fetches Round 1 questions');
    const r1Questions = r1QuestionsRes.data?.data || [];
    assert(r1Questions.length === 15, `Round 1 contains exactly 15 MCQs (found: ${r1Questions.length})`);
    const q1Admin = r1Questions[0];
    assert(q1Admin?.correctOption !== undefined && q1Admin?.correctOption !== null, 'Admin can see correctOption for MCQs');
    assert(Boolean(q1Admin?.explanation), 'Admin can see answer explanation');

    // 4. Contestant Sanitization Protection
    console.log('\n--- Test 4: Contestant API Data Leakage Prevention ---');
    const publicQRes = await request('GET', '/competition/questions/round/1');
    assert(publicQRes.statusCode === 200, 'Contestant can query Round 1 questions');
    const publicQuestions = publicQRes.data?.data || [];
    assert(publicQuestions.length === 15, 'Contestant receives 15 questions');
    const q1Public = publicQuestions[0];
    assert(q1Public.correctOption === undefined, 'Contestant query STRICTLY OMITS correctOption');
    assert(q1Public.explanation === undefined, 'Contestant query STRICTLY OMITS explanation');
    assert(q1Public.hiddenTestCases === undefined, 'Contestant query STRICTLY OMITS hiddenTestCases');
    assert(q1Public.options && q1Public.options.length === 4, 'Contestant receives 4 multiple choice options');

    // 5. Team Registration & Login
    console.log('\n--- Test 5: Team Registration & Login ---');
    const randSuffix = Math.floor(Math.random() * 9000 + 1000);
    const testPassword = 'TestPassword@2026';
    const regPayload = {
      teamName: `Testing Relay Team ${randSuffix}`,
      institution: 'Ignitron Tech Institute',
      password: testPassword,
      participants: [
        {
          fullName: `Contestant Alpha ${randSuffix}`,
          email: `alpha_${randSuffix}@ignitron.test`,
          studentId: `STU-A${randSuffix}`,
        },
        {
          fullName: `Contestant Beta ${randSuffix}`,
          email: `beta_${randSuffix}@ignitron.test`,
          studentId: `STU-B${randSuffix}`,
        },
      ],
    };

    const regRes = await request('POST', '/auth/team/register', regPayload);
    assert(regRes.statusCode === 201, 'Team registration returns 201 Created');
    const teamData = regRes.data?.data || regRes.data?.team;
    const teamCode = teamData?.teamCode;
    const teamId = teamData?.teamId || teamData?.id;
    assert(Boolean(teamCode), `Team registered with code: ${teamCode}`);

    // Lookup participant
    const lookupRes = await request('GET', `/auth/team/lookup/${teamCode}`);
    assert(lookupRes.statusCode === 200, 'Team lookup returns participants');
    const participants = lookupRes.data?.data?.participants || lookupRes.data?.team?.participants || [];
    const pAlpha = participants[0];
    assert(Boolean(pAlpha?.id), 'Participant Alpha resolved');

    // Team login
    const teamLoginRes = await request('POST', '/auth/team/login', {
      teamCode,
      password: testPassword,
      participantId: pAlpha.id,
    });
    assert(teamLoginRes.statusCode === 200, 'Team login succeeds');
    const teamCookie = teamLoginRes.sessionCookie;
    assert(Boolean(teamCookie), 'Team session cookie received');

    // 6. Round 1 MCQ Arena Answering & Real-time Auto-saving
    console.log('\n--- Test 6: Round 1 MCQ Arena Answering & Auto-saving ---');
    const arenaStateRes = await request('GET', '/arena/mcq/state', null, teamCookie);
    assert(arenaStateRes.statusCode === 200, 'Team fetches MCQ arena state');
    assert(arenaStateRes.data?.data?.questions?.length === 15, 'State includes 15 sanitized questions');
    assert(arenaStateRes.data?.data?.isSubmitted === false, 'Team has not submitted yet');

    // Answer questions: make 13 correct and 2 incorrect
    console.log('  Autosaving answers for 15 questions...');
    for (let i = 0; i < r1Questions.length; i++) {
      const adminQ = r1Questions[i];
      // Make questions 0-12 correct, and 13-14 incorrect
      const choice = i < 13 ? adminQ.correctOption : (adminQ.correctOption + 1) % 4;

      const saveRes = await request(
        'POST',
        '/arena/mcq/save',
        {
          questionId: adminQ.id,
          selectedOption: choice,
          isFlagged: i % 5 === 0, // Flag every 5th question
        },
        teamCookie,
      );
      assert(saveRes.statusCode === 200, `Answer for Q${i + 1} saved successfully`);
    }

    // 7. Final MCQ Round Submission & Automatic Scoring
    console.log('\n--- Test 7: MCQ Final Submission & Automatic Scoring ---');
    const submitMcqRes = await request('POST', '/arena/mcq/submit', { autoSubmit: false }, teamCookie);
    assert(submitMcqRes.statusCode === 200, 'MCQ final submission returns 200 OK');
    const mcqResult = submitMcqRes.data?.data;
    assert(mcqResult?.totalQuestions === 15, 'Total questions evaluated is 15');
    assert(mcqResult?.answeredCount === 15, 'Answered count is 15');
    assert(mcqResult?.correctCount === 13, `Correct count is exactly 13 (found: ${mcqResult?.correctCount})`);
    assert(mcqResult?.score === 26.0, `Score is exactly 26.00 / 30.00 (found: ${mcqResult?.score})`);

    // Verify idempotent resubmission
    const resubmitRes = await request('POST', '/arena/mcq/submit', {}, teamCookie);
    assert(resubmitRes.statusCode === 200, 'Resubmission returns cached evaluated score safely');
    assert(resubmitRes.data?.data?.score === 26.0, 'Resubmission score matches original');

    // 8. Admin Inspection of Team's MCQ Answer Sheet
    console.log('\n--- Test 8: Admin MCQ Answer Sheet Inspection ---');
    const reviewRes = await request('GET', `/competition/evaluation/teams/${teamId}/mcq`, null, adminCookie);
    assert(reviewRes.statusCode === 200, 'Admin fetches team MCQ answer sheet review');
    const reviewData = reviewRes.data?.data;
    assert(reviewData?.score === 26.0, 'Admin review displays correct score 26.0');
    assert(reviewData?.correctCount === 13, 'Admin review displays 13 correct answers');
    assert(reviewData?.questions?.length === 15, 'Admin review contains all 15 question reviews');
    assert(reviewData?.questions?.[0]?.isCorrect === true, 'Question 1 correctly flagged as correct');

    // 9. Round 2 Workspace Drafts & Code Submission
    console.log('\n--- Test 9: Round 2 Workspace Draft & Code Submission ---');
    const r2DraftCode = `// Fixed Token Bucket Limiter
export class TokenBucketLimiter {
  constructor(public capacity: number, public refillRate: number) {}
}`;

    const saveDraftRes = await request(
      'POST',
      '/arena/workspace/draft',
      {
        roundNumber: 2,
        caseNumber: 1,
        sourceCode: r2DraftCode,
        language: 'typescript',
      },
      teamCookie,
    );
    assert(saveDraftRes.statusCode === 200, 'Team saves Round 2 workspace draft');

    const getDraftRes = await request('GET', '/arena/workspace/draft?roundNumber=2&caseNumber=1', null, teamCookie);
    assert(getDraftRes.statusCode === 200, 'Team retrieves Round 2 workspace draft');
    assert(getDraftRes.data?.data?.sourceCode === r2DraftCode, 'Draft code matches saved buffer');

    // Submit Round 2 Code
    const submitCodeRes = await request(
      'POST',
      '/arena/workspace/submit',
      {
        roundNumber: 2,
        caseNumber: 1,
        sourceCode: r2DraftCode,
        language: 'typescript',
      },
      teamCookie,
    );
    assert(submitCodeRes.statusCode === 200, 'Team submits Round 2 code solution');
    const submissionId = submitCodeRes.data?.data?.submissionId;
    assert(Boolean(submissionId), 'Submission ID generated and returned');

    // 10. Admin Evaluation & Rubric Grading
    console.log('\n--- Test 10: Admin Submission Inspection & Rubric Grading ---');
    const listSubsRes = await request('GET', '/competition/evaluation/submissions?roundNumber=2', null, adminCookie);
    assert(listSubsRes.statusCode === 200, 'Admin lists submissions for Round 2');
    const foundSub = listSubsRes.data?.data?.find((s) => s.id === submissionId);
    assert(Boolean(foundSub), 'Target submission present in admin queue');
    assert(foundSub?.submissionStatus === 'PENDING', 'Initial status is PENDING');

    // Admin inspects detail
    const detailRes = await request('GET', `/competition/evaluation/submissions/${submissionId}`, null, adminCookie);
    assert(detailRes.statusCode === 200, 'Admin fetches submission detail');
    assert(detailRes.data?.data?.sourceCode === r2DraftCode, 'Detail contains contestant source code');

    // Admin grades with rubric: Bug Id: 18/20, Test Correctness: 45/50, Edge Cases: 18/20, Quality: 9/10 = 90 Total
    const gradeRes = await request(
      'POST',
      `/competition/evaluation/submissions/${submissionId}/grade`,
      {
        totalScore: 90.0,
        criteriaScores: {
          bugIdentification: 18,
          testCorrectness: 45,
          edgeCases: 18,
          codeQuality: 9,
        },
        feedback: 'Excellent bug fix and edge case coverage. Clean TypeScript implementation.',
      },
      adminCookie,
    );
    assert(gradeRes.statusCode === 200, 'Admin grades submission with rubric');
    assert(gradeRes.data?.data?.score === 90.0, 'Graded score recorded as 90.0');

    // Verify submission status updated to EVALUATED
    const verifiedSubRes = await request('GET', `/competition/evaluation/submissions/${submissionId}`, null, adminCookie);
    assert(verifiedSubRes.data?.data?.submissionStatus === 'EVALUATED', 'Submission status updated to EVALUATED');
    assert(verifiedSubRes.data?.data?.score === 90.0, 'Score reflects evaluated marks');
    assert(verifiedSubRes.data?.data?.criteriaScores?.bugIdentification === 18, 'Criteria scores preserved');

    console.log('\n================================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');
  } catch (error) {
    console.error('Fatal test error:', error);
    failed++;
  } finally {
    stopServer();
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
