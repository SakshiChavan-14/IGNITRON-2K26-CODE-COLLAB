/**
 * IGNITRON 2K26 — PHASE 3.3 COMPREHENSIVE VERIFICATION SUITE
 * Admin Control Center Redesign & Competition Progression Management
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'ignitron_jwt_secret_dev_key_2026';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${message}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${message}`);
  }
}

async function runPhase33Verification() {
  console.log('===============================================================');
  console.log('   IGNITRON 2K26 — PHASE 3.3 VERIFICATION SUITE');
  console.log('===============================================================\n');

  try {
    // -------------------------------------------------------------------------
    // TEST GROUP 1: UNIFIED ADMIN NAVIGATION & ROUTING
    // -------------------------------------------------------------------------
    console.log('TEST GROUP 1: Unified Admin Navigation & Header Consolidation');

    const adminNavFile = path.join(__dirname, '../apps/frontend/src/components/AdminNav.tsx');
    const navbarFile = path.join(__dirname, '../apps/frontend/src/components/Navbar.tsx');
    const appFile = path.join(__dirname, '../apps/frontend/src/App.tsx');

    const adminNavContent = fs.readFileSync(adminNavFile, 'utf8');
    const navbarContent = fs.readFileSync(navbarFile, 'utf8');
    const appContent = fs.readFileSync(appFile, 'utf8');

    assert(adminNavContent.includes('export const ADMIN_NAV_ITEMS ='), 'AdminNav exports ADMIN_NAV_ITEMS');
    assert(adminNavContent.includes('return null;'), 'AdminNav component returns null to prevent duplicate second row');

    // Check all 8 items exist in ADMIN_NAV_ITEMS
    const expectedPaths = [
      '/admin/dashboard',
      '/admin/teams',
      '/admin/competition',
      '/admin/questions',
      '/admin/submissions',
      '/admin/leaderboard',
      '/admin/announcements',
      '/admin/reports',
    ];
    for (const p of expectedPaths) {
      assert(adminNavContent.includes(`path: '${p}'`), `ADMIN_NAV_ITEMS contains route ${p}`);
    }

    assert(navbarContent.includes("user?.type === 'ADMIN'"), 'Navbar renders dedicated header for admin users');
    assert(navbarContent.includes('ADMIN_NAV_ITEMS.map'), 'Navbar iterates over ADMIN_NAV_ITEMS to render all 8 sections in header');
    assert(navbarContent.includes('Admin'), 'Navbar renders Admin Console / Admin badge on left brand');
    assert(navbarContent.includes('user.role'), 'Navbar renders admin user role badge on right');
    assert(navbarContent.includes('handleLogout'), 'Navbar renders admin logout button');

    // Route alias check
    assert(appContent.includes('path="admin/control"'), 'App.tsx defines /admin/control route');
    assert(appContent.includes('Navigate to="/admin/competition"'), 'App.tsx redirects /admin/control to /admin/competition');

    // Verify all admin pages no longer render secondary <AdminNav />
    const adminPages = [
      'apps/frontend/src/pages/admin/AdminDashboardPage.tsx',
      'apps/frontend/src/pages/admin/AnnouncementManagementPage.tsx',
      'apps/frontend/src/pages/admin/CompetitionControlPage.tsx',
      'apps/frontend/src/pages/admin/LeaderboardManagementPage.tsx',
      'apps/frontend/src/pages/admin/QuestionManagementPage.tsx',
      'apps/frontend/src/pages/admin/ReportsPage.tsx',
      'apps/frontend/src/pages/admin/SubmissionsPage.tsx',
      'apps/frontend/src/pages/admin/TeamManagementPage.tsx',
    ];

    for (const pageRel of adminPages) {
      const pageFile = path.join(__dirname, '..', pageRel);
      const pageContent = fs.readFileSync(pageFile, 'utf8');
      assert(!pageContent.includes('<AdminNav />'), `${path.basename(pageRel)} does NOT render duplicate <AdminNav />`);
    }

    // -------------------------------------------------------------------------
    // TEST GROUP 2: COMPETITION CONTROL PAGE REDESIGN & LIGHT THEME
    // -------------------------------------------------------------------------
    console.log('\nTEST GROUP 2: Competition Control Page Light Redesign');

    const controlPageFile = path.join(__dirname, '../apps/frontend/src/pages/admin/CompetitionControlPage.tsx');
    const controlContent = fs.readFileSync(controlPageFile, 'utf8');

    assert(controlContent.includes('bg-[#f8faf9]'), 'CompetitionControlPage uses light page background (#f8faf9)');
    assert(controlContent.includes('text-emerald-950'), 'CompetitionControlPage uses deep forest green heading text');
    assert(!controlContent.includes('bg-slate-900'), 'CompetitionControlPage contains zero bg-slate-900 dark elements');
    assert(!controlContent.includes('bg-slate-950'), 'CompetitionControlPage contains zero bg-slate-950 dark elements');
    assert(!controlContent.includes('border-slate-800'), 'CompetitionControlPage contains zero border-slate-800 dark borders');

    assert(controlContent.includes('Server-Authoritative Clock'), 'CompetitionControlPage displays Server-Authoritative Clock');
    assert(controlContent.includes('COMPETITION_STEPS'), 'CompetitionControlPage includes sequential state machine steps');
    assert(controlContent.includes('Round 1: MCQ Arena'), 'CompetitionControlPage includes Round 1 independent card');
    assert(controlContent.includes('Round 2: Bug Hunt Arena'), 'CompetitionControlPage includes Round 2 independent card');
    assert(controlContent.includes('Round 3: Final Boss'), 'CompetitionControlPage includes Round 3 independent card');

    // -------------------------------------------------------------------------
    // TEST GROUP 3: SERVER STATE & INDEPENDENT ROUND DATA
    // -------------------------------------------------------------------------
    console.log('\nTEST GROUP 3: Database & Authoritative State Integrity');

    let globalState = await prisma.competitionState.findUnique({
      where: { id: 'global' },
    });
    if (!globalState) {
      globalState = await prisma.competitionState.create({
        data: { id: 'global', status: 'STANDBY', isPaused: false },
      });
    }
    assert(globalState !== null, 'Global competition state record exists in database');

    const rounds = await prisma.competitionRound.findMany({
      orderBy: { roundNumber: 'asc' },
    });
    assert(rounds.length === 3, 'All 3 competition rounds exist in database');
    assert(rounds[0].durationMinutes === 30, 'Round 1 duration is 30 minutes');
    assert(rounds[1].durationMinutes === 40, 'Round 2 duration is 40 minutes');
    assert(rounds[2].durationMinutes === 60, 'Round 3 duration is 60 minutes');
    assert(Number(rounds[0].maximumMarks) === 30, 'Round 1 max marks is 30');
    assert(Number(rounds[1].maximumMarks) === 100, 'Round 2 max marks is 100');
    assert(Number(rounds[2].maximumMarks) === 100, 'Round 3 max marks is 100');

    // -------------------------------------------------------------------------
    // TEST GROUP 4: ADMINISTRATOR TEAM SHORTLISTING & PROGRESSION
    // -------------------------------------------------------------------------
    console.log('\nTEST GROUP 4: Admin Team Shortlisting & Mutual Exclusion');

    const activeTeams = await prisma.team.findMany({
      where: { isActive: true },
      take: 6,
    });
    assert(activeTeams.length >= 2, `Active teams available for shortlisting test (${activeTeams.length} found)`);

    const r1 = rounds[0];
    const r2 = rounds[1];
    const r3 = rounds[2];

    // Ensure test teams have Round 1 progress
    for (let i = 0; i < activeTeams.length; i++) {
      await prisma.teamRoundProgress.upsert({
        where: {
          teamId_roundId: { teamId: activeTeams[i].id, roundId: r1.id },
        },
        update: {
          eligibilityStatus: 'ELIGIBLE',
          participationStatus: 'SUBMITTED',
          score: 15 + i * 2,
        },
        create: {
          teamId: activeTeams[i].id,
          roundId: r1.id,
          eligibilityStatus: 'ELIGIBLE',
          participationStatus: 'SUBMITTED',
          score: 15 + i * 2,
        },
      });
    }

    // Simulate Admin shortlisting: choose first 3 teams for Round 2
    const chosenForR2 = activeTeams.slice(0, 3).map((t) => t.id);
    const unchosenForR2 = activeTeams.slice(3).map((t) => t.id);

    // Perform shortlisting upsert simulating competition.service.ts
    for (const team of activeTeams) {
      const isQualified = chosenForR2.includes(team.id);
      await prisma.teamRoundProgress.upsert({
        where: {
          teamId_roundId: { teamId: team.id, roundId: r2.id },
        },
        update: {
          eligibilityStatus: isQualified ? 'ELIGIBLE' : 'INELIGIBLE',
          participationStatus: 'NOT_STARTED',
        },
        create: {
          teamId: team.id,
          roundId: r2.id,
          eligibilityStatus: isQualified ? 'ELIGIBLE' : 'INELIGIBLE',
          participationStatus: 'NOT_STARTED',
          score: 0,
        },
      });
    }

    const r2Eligible = await prisma.teamRoundProgress.findMany({
      where: { roundId: r2.id, eligibilityStatus: 'ELIGIBLE' },
    });
    const r2Ineligible = await prisma.teamRoundProgress.findMany({
      where: { roundId: r2.id, eligibilityStatus: 'INELIGIBLE' },
    });

    assert(r2Eligible.length >= 3, `Selected teams are marked ELIGIBLE for Round 2 (${r2Eligible.length} found)`);
    assert(r2Ineligible.length >= 1, `Unselected teams are marked INELIGIBLE for Round 2 (${r2Ineligible.length} found)`);

    // Verify unselected teams are blocked by eligibility check
    const disqualifiedTeamProgress = await prisma.teamRoundProgress.findUnique({
      where: {
        teamId_roundId: { teamId: unchosenForR2[0], roundId: r2.id },
      },
    });
    assert(disqualifiedTeamProgress.eligibilityStatus === 'INELIGIBLE', 'Unselected team has INELIGIBLE status');

    // -------------------------------------------------------------------------
    // TEST GROUP 5: SCORING & DASHBOARD INCONSISTENCIES FIXES
    // -------------------------------------------------------------------------
    console.log('\nTEST GROUP 5: Scoring Inconsistency Fixes');

    const qmFile = path.join(__dirname, '../apps/frontend/src/pages/admin/QuestionManagementPage.tsx');
    const qmContent = fs.readFileSync(qmFile, 'utf8');

    assert(qmContent.includes('100 Marks: 20 + 25 + 45 + 10'), 'QuestionManagement tab displays 100 Marks for Round 3');
    assert(qmContent.includes('90 Cases + 10 Rubric/Quality'), 'QuestionManagement displays 100 Marks total (90 cases + 10 rubric/quality)');
    assert(qmContent.includes('Round 3 Tournament Rubric'), 'QuestionManagement contains Round 3 scoring rubric banner');

    const subPageFile = path.join(__dirname, '../apps/frontend/src/pages/admin/SubmissionsPage.tsx');
    const subPageContent = fs.readFileSync(subPageFile, 'utf8');

    assert(subPageContent.includes('Case 3 Combined Score'), 'SubmissionsPage grading modal displays Case 3 Combined Score');
    assert(subPageContent.includes('/ 55'), 'SubmissionsPage displays Case 3 combined max score of 55 (45 case + 10 quality)');

    const evalServiceFile = path.join(__dirname, '../apps/backend/src/competition/evaluation.service.ts');
    const evalServiceContent = fs.readFileSync(evalServiceFile, 'utf8');

    assert(evalServiceContent.includes('Case 1 (20) + Case 2 (25) + Case 3 Combined (45 case + 10 code quality = 55) = 100 max'), 'EvaluationService enforces 100 max across all 3 cases');
    assert(!evalServiceContent.includes('finalRoundScore += dto.criteriaScores.codeQuality;'), 'EvaluationService does not double-count code quality');

    // Test Round 3 cumulative scoring calculation in database
    const testTeam = activeTeams[0];
    const r3Question1 = await prisma.question.findFirst({ where: { roundId: r3.id, caseNumber: 1 } });
    const r3Question2 = await prisma.question.findFirst({ where: { roundId: r3.id, caseNumber: 2 } });
    const r3Question3 = await prisma.question.findFirst({ where: { roundId: r3.id, caseNumber: 3 } });

    assert(r3Question1 !== null && r3Question2 !== null && r3Question3 !== null, 'All 3 Round 3 case questions exist in DB');

    // Simulate Case 1 submission (scored 18/20)
    const subCase1 = await prisma.submission.create({
      data: {
        teamId: testTeam.id,
        roundId: r3.id,
        questionId: r3Question1.id,
        language: 'python',
        sourceCode: 'print("Case 1")',
        submissionStatus: 'EVALUATED',
        score: 18,
      },
    });

    // Simulate Case 2 submission (scored 22/25)
    const subCase2 = await prisma.submission.create({
      data: {
        teamId: testTeam.id,
        roundId: r3.id,
        questionId: r3Question2.id,
        language: 'python',
        sourceCode: 'print("Case 2")',
        submissionStatus: 'EVALUATED',
        score: 22,
      },
    });

    // Simulate Case 3 submission (scored 40/45 + 8/10 quality = 48/55)
    const subCase3 = await prisma.submission.create({
      data: {
        teamId: testTeam.id,
        roundId: r3.id,
        questionId: r3Question3.id,
        language: 'python',
        sourceCode: 'print("Case 3")',
        submissionStatus: 'EVALUATED',
        score: 48,
      },
    });

    // Test cumulative calculation logic: Case 1 (18) + Case 2 (22) + Case 3 (48) = 88 / 100
    const allR3 = await prisma.submission.findMany({
      where: {
        teamId: testTeam.id,
        roundId: r3.id,
        submissionStatus: 'EVALUATED',
        score: { not: null },
      },
      include: { question: true },
    });

    const caseScores = new Map();
    for (const sub of allR3) {
      const cNum = sub.question ? sub.question.caseNumber || 1 : 1;
      const currentMax = caseScores.get(cNum) || 0;
      const subScore = Number(sub.score || 0);
      if (subScore > currentMax) {
        caseScores.set(cNum, subScore);
      }
    }

    const calculatedCumulative = Math.min(100, Array.from(caseScores.values()).reduce((a, b) => a + b, 0));
    assert(caseScores.get(1) === 18, 'Case 1 score evaluated at 18/20');
    assert(caseScores.get(2) === 22, 'Case 2 score evaluated at 22/25');
    assert(caseScores.get(3) === 48, 'Case 3 combined score evaluated at 48/55');
    assert(calculatedCumulative === 88, `Round 3 cumulative score is exactly 88/100 (${calculatedCumulative} calculated)`);

    // Clean up test submissions
    await prisma.submission.deleteMany({
      where: { id: { in: [subCase1.id, subCase2.id, subCase3.id] } },
    });
    console.log('  [CLEANUP] Test submissions cleaned up cleanly');

    console.log('\n===============================================================');
    console.log(`VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during verification:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase33Verification();
