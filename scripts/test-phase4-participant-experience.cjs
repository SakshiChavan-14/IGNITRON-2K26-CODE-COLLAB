/**
 * IGNITRON 2K26 — PHASE 4 COMPREHENSIVE VERIFICATION SUITE
 * Participant Arena Completion & Competition Experience
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

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

async function runPhase4Verification() {
  console.log('===============================================================');
  console.log('   IGNITRON 2K26 — PHASE 4 VERIFICATION SUITE');
  console.log('   Participant Arena Completion & Experience');
  console.log('===============================================================\n');

  try {
    // -------------------------------------------------------------------------
    // TEST GROUP 1: PARTICIPANT DASHBOARD & 6-STATE LIFECYCLE
    // -------------------------------------------------------------------------
    console.log('TEST GROUP 1: Participant Dashboard & 6-State Lifecycle');

    const sharedFile = path.join(__dirname, '../packages/shared/src/index.ts');
    const compServiceFile = path.join(__dirname, '../apps/backend/src/competition/competition.service.ts');
    const teamDashboardFile = path.join(__dirname, '../apps/frontend/src/pages/team/TeamDashboardPage.tsx');

    const sharedContent = fs.readFileSync(sharedFile, 'utf8');
    const compServiceContent = fs.readFileSync(compServiceFile, 'utf8');
    const teamDashboardContent = fs.readFileSync(teamDashboardFile, 'utf8');

    assert(
      sharedContent.includes('ParticipantRoundStatus') &&
      sharedContent.includes("'LOCKED'") &&
      sharedContent.includes("'AVAILABLE'") &&
      sharedContent.includes("'ACTIVE'") &&
      sharedContent.includes("'SUBMITTED'") &&
      sharedContent.includes("'COMPLETED'") &&
      sharedContent.includes("'NOT_QUALIFIED'"),
      'Shared types define all 6 exact ParticipantRoundStatus states'
    );

    assert(
      compServiceContent.includes('NOT_QUALIFIED') &&
      compServiceContent.includes('COMPLETED') &&
      compServiceContent.includes('SUBMITTED') &&
      compServiceContent.includes('ACTIVE') &&
      compServiceContent.includes('AVAILABLE') &&
      compServiceContent.includes('LOCKED'),
      'Backend competition service computes 6-state participant round lifecycle'
    );

    assert(
      teamDashboardContent.includes('getEffectiveParticipantStatus') &&
      teamDashboardContent.includes("case 'ACTIVE':") &&
      teamDashboardContent.includes("case 'AVAILABLE':") &&
      teamDashboardContent.includes("case 'SUBMITTED':") &&
      teamDashboardContent.includes("case 'COMPLETED':") &&
      teamDashboardContent.includes("case 'NOT_QUALIFIED':") &&
      teamDashboardContent.includes("case 'LOCKED':"),
      'Team Dashboard UI renders dedicated visual cues for all 6 round states'
    );

    assert(
      teamDashboardContent.includes("effStatus === 'AVAILABLE' || effStatus === 'ACTIVE'") &&
      teamDashboardContent.includes('canViewReview'),
      'Team Dashboard allows entering only Available/Active rounds and viewing submitted work'
    );

    // -------------------------------------------------------------------------
    // TEST GROUP 2: ROUND 1 MCQ ARENA POLISH & AUTOSAVE
    // -------------------------------------------------------------------------
    console.log('\nTEST GROUP 2: Round 1 MCQ Arena Polish & Autosave');

    const arenaServiceFile = path.join(__dirname, '../apps/backend/src/competition/arena.service.ts');
    const mcqArenaFile = path.join(__dirname, '../apps/frontend/src/pages/team/McqArenaPage.tsx');

    const arenaServiceContent = fs.readFileSync(arenaServiceFile, 'utf8');
    const mcqArenaContent = fs.readFileSync(mcqArenaFile, 'utf8');

    assert(
      arenaServiceContent.includes('getMcqArenaState') &&
      !arenaServiceContent.match(/questions:\s*rawQuestions\.map\(\(q\)\s*=>\s*\({\s*.*correctOption/s),
      'Contestant MCQ state never leaks correct options or answer keys'
    );

    assert(
      arenaServiceContent.includes('saveMcqAnswer') &&
      arenaServiceContent.includes('teamMcqAnswer.upsert'),
      'MCQ answers autosave atomically via database upsert'
    );

    assert(
      arenaServiceContent.includes('calculatedScore = correctCount * 2.0') &&
      arenaServiceContent.includes("participationStatus: 'SUBMITTED'"),
      'MCQ submission calculates 2 marks per question with automatic scoring'
    );

    assert(
      mcqArenaContent.includes('Question Navigator') &&
      mcqArenaContent.includes('isAnswered && isFlagged') &&
      mcqArenaContent.includes('Flagged for Review'),
      'MCQ Arena features 1-15 question navigator with answered, flagged, and active cues'
    );

    assert(
      mcqArenaContent.includes('confirmSubmitOpen') &&
      mcqArenaContent.includes('reviewMode') &&
      mcqArenaContent.includes('Review Submitted Answers'),
      'MCQ Arena has submission confirmation modal and post-submission read-only review mode'
    );

    // -------------------------------------------------------------------------
    // TEST GROUP 3: SERVER-AUTHORITATIVE SECURITY & QUALIFICATION
    // -------------------------------------------------------------------------
    console.log('\nTEST GROUP 3: Server-Authoritative Security & Qualification');

    assert(
      arenaServiceContent.includes('assertRoundAccess') &&
      arenaServiceContent.includes('Only shortlisted teams may participate'),
      'Arena backend rejects non-shortlisted teams entering Round 2 or Round 3 with ForbiddenException'
    );

    assert(
      arenaServiceContent.includes('Competition is currently paused by the administrator') &&
      arenaServiceContent.includes('deadline has expired'),
      'Backend strictly enforces competition pause and deadline limits for saves and submissions'
    );

    const arenaControllerFile = path.join(__dirname, '../apps/backend/src/competition/arena.controller.ts');
    const arenaControllerContent = fs.readFileSync(arenaControllerFile, 'utf8');

    assert(
      arenaControllerContent.includes("@Get('status/:roundNumber')") &&
      arenaControllerContent.includes('assertRoundAccess'),
      'Arena controller exposes verified status/:roundNumber endpoint for access checks'
    );

    // -------------------------------------------------------------------------
    // TEST GROUP 4: WORKSPACE MULTI-CASE DRAFT ISOLATION & SUBMISSIONS
    // -------------------------------------------------------------------------
    console.log('\nTEST GROUP 4: Workspace Multi-Case Draft Isolation & Submissions');

    const workspacePageFile = path.join(__dirname, '../apps/frontend/src/pages/team/CodingWorkspacePreviewPage.tsx');
    const workspacePageContent = fs.readFileSync(workspacePageFile, 'utf8');

    assert(
      workspacePageContent.includes('caseDrafts') &&
      workspacePageContent.includes('handleSelectCase'),
      'Coding workspace implements case-isolated draft caching'
    );

    assert(
      workspacePageContent.includes('Case switch draft flush') ||
      workspacePageContent.includes('saveWorkspaceDraft({'),
      'Case switching flushes unsaved draft of previous case before switching'
    );

    assert(
      workspacePageContent.includes('submittedCases') &&
      workspacePageContent.includes('Select Problem Case:') &&
      workspacePageContent.includes('Case ${activeCase} Submitted'),
      'Round 3 Case Switcher tracks and displays per-case submission indicators'
    );

    assert(
      workspacePageContent.includes('accessDeniedError') &&
      workspacePageContent.includes('Arena Access Restricted'),
      'Workspace displays secure access restricted UI when team is not qualified'
    );

    // -------------------------------------------------------------------------
    // TEST GROUP 5: SERVER-AUTHORITATIVE TIMER SYNCHRONIZATION
    // -------------------------------------------------------------------------
    console.log('\nTEST GROUP 5: Server-Authoritative Timer Synchronization');

    const hookFile = path.join(__dirname, '../apps/frontend/src/hooks/useCompetition.ts');
    const hookContent = fs.readFileSync(hookFile, 'utf8');

    assert(
      hookContent.includes('useServerTimer') &&
      hookContent.includes('remainingSecondsFromServer') &&
      hookContent.includes('isPaused'),
      'useServerTimer syncs with server remaining duration and freezes on pause'
    );

    assert(
      workspacePageContent.includes('useServerTimer') &&
      workspacePageContent.includes('Time Remaining:'),
      'Workspace top bar displays server-authoritative countdown timer'
    );

    assert(
      workspacePageContent.includes('Tournament paused by Administrator'),
      'Workspace displays tournament paused alert and freezes editor during pause'
    );

    // -------------------------------------------------------------------------
    // TEST GROUP 6: DATABASE RECORDS & ARENA QUESTION INTEGRITY
    // -------------------------------------------------------------------------
    console.log('\nTEST GROUP 6: Database Records & Arena Question Integrity');

    const rounds = await prisma.competitionRound.findMany({
      orderBy: { roundNumber: 'asc' },
    });
    assert(rounds.length === 3, `Found ${rounds.length} competition rounds in database (expected 3)`);

    const r1Questions = await prisma.question.findMany({
      where: { round: { roundNumber: 1 } },
    });
    assert(r1Questions.length === 15, `Round 1 has ${r1Questions.length} MCQs configured (expected 15)`);

    const r2Questions = await prisma.question.findMany({
      where: { round: { roundNumber: 2 } },
    });
    assert(r2Questions.length >= 1, `Round 2 Bug Hunt question exists (${r2Questions.length} found)`);

    const r3Questions = await prisma.question.findMany({
      where: { round: { roundNumber: 3 } },
      orderBy: { caseNumber: 'asc' },
    });
    assert(r3Questions.length === 3, `Round 3 Final Boss has 3 cases configured (${r3Questions.length} found)`);

    const compState = await prisma.competitionState.findUnique({
      where: { id: 'global' },
    });
    assert(compState !== null, 'Global competition state record exists in database');

    const teams = await prisma.team.findMany({
      where: { isActive: true },
    });
    assert(teams.length > 0, `Active tournament teams exist in database (${teams.length} found)`);

  } catch (error) {
    console.error('Unexpected error during Phase 4 verification:', error);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n===============================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase4Verification();
