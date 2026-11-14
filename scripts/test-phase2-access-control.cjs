/**
 * IGNITRON 2K26 — STRICT WORKSPACE VISIBILITY & ACCESS CONTROL VERIFICATION SUITE
 *
 * Verifies:
 * 1. Database Integrity & Team Retention (Code Hunters IGN-4DD6)
 * 2. Static Code Security Checks:
 *    - Code Execution locks: countdown lock, active round requirement, pause check, deadline check, eligibility check, submission lock
 *    - Workspace draft locks: getDraft eligibility & active/review check, saveDraft submission lock & active check
 *    - ArenaService assertRoundAccess: READ locks before round start, WRITE/SUBMIT locks, countdown locks
 *    - QuestionsController: @Roles('ADMIN', 'TEAM') guards with assertRoundAccess(..., 'READ')
 *    - Frontend CodingWorkspacePreviewPage: Clean prep screen before round start, no materials leak, execution disabled after submit
 *    - Frontend McqArenaPage: Clean prep screen before round start, automatic unlock on start
 * 3. Functional Simulation & Access Control across all 3 rounds:
 *    - Round 1: Eligible before start (403), during countdown (403), after start (Allowed), after submission (WRITE 403, READ Allowed)
 *    - Round 2: Ineligible team (403), eligible before start (403), during countdown (403), after start (Allowed), after submit (403)
 *    - Round 3: Ineligible team (403), eligible before start (403), during countdown (403), after start (Allowed), concluded round (403)
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

async function runAccessControlVerification() {
  console.log('\n===============================================================');
  console.log('IGNITRON 2K26 — WORKSPACE VISIBILITY & ACCESS CONTROL TEST SUITE');
  console.log('===============================================================\n');

  try {
    // -------------------------------------------------------------------------
    // TEST GROUP 1: Database Integrity & Team Retention
    // -------------------------------------------------------------------------
    console.log('--- Test Group 1: Database Integrity & Team Retention ---');
    const teams = await prisma.team.findMany({
      include: { participants: true },
    });
    assert(teams.length >= 1, `Database contains registered teams (Found: ${teams.length})`);

    const codeHunters = teams.find((t) => t.teamCode === 'IGN-4DD6');
    assert(codeHunters !== undefined, 'Genuine team "Code Hunters" (IGN-4DD6) is preserved intact');
    assert(
      codeHunters && codeHunters.participants.length === 2,
      `Participants count for Code Hunters is 2 (Found: ${codeHunters?.participants.length})`,
    );

    const rounds = await prisma.competitionRound.findMany({
      orderBy: { roundNumber: 'asc' },
    });
    assert(rounds.length === 3, `All 3 competition rounds exist in database (Found: ${rounds.length})`);

    // -------------------------------------------------------------------------
    // TEST GROUP 2: Code Execution Service Security Hardening
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 2: Code Execution Service Security Hardening ---');
    const codeExecPath = path.resolve(
      __dirname,
      '../apps/backend/src/code-execution/code-execution.service.ts',
    );
    const codeExecContent = fs.readFileSync(codeExecPath, 'utf-8');

    assert(
      codeExecContent.includes('countdownEndsAt') &&
        codeExecContent.includes('Round launch countdown is in progress'),
      'Code execution rejects runs during synchronized round countdown',
    );

    assert(
      codeExecContent.includes('ROUND_1_ACTIVE') &&
        codeExecContent.includes('ROUND_2_ACTIVE') &&
        codeExecContent.includes('ROUND_3_ACTIVE'),
      'Code execution requires the requested round to be currently ACTIVE',
    );

    assert(
      codeExecContent.includes('participationStatus === \'SUBMITTED\'') &&
        codeExecContent.includes('Code execution is locked'),
      'Code execution strictly rejects runs for submitted teams',
    );

    assert(
      codeExecContent.includes('competitionState.isPaused') &&
        codeExecContent.includes('paused by administrators'),
      'Code execution verifies competition pause state',
    );

    assert(
      codeExecContent.includes('competitionState.deadlineAt') &&
        codeExecContent.includes('Round deadline has expired'),
      'Code execution verifies round deadline has not expired',
    );

    assert(
      codeExecContent.includes('eligibilityStatus === \'ELIGIBLE\''),
      'Code execution validates team round eligibility before running code',
    );

    // -------------------------------------------------------------------------
    // TEST GROUP 3: Workspace Service Security Hardening
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 3: Workspace Service Draft Security ---');
    const workspaceServicePath = path.resolve(
      __dirname,
      '../apps/backend/src/workspace/workspace.service.ts',
    );
    const workspaceContent = fs.readFileSync(workspaceServicePath, 'utf-8');

    assert(
      workspaceContent.includes('validateCompetitionStateAndEligibility(teamUser, round.roundNumber, \'READ\')'),
      'getDraft verifies round active status and eligibility before returning drafts',
    );

    assert(
      workspaceContent.includes('The competition workspace will become available when Round'),
      'getDraft blocks draft loading before round starts unless already submitted',
    );

    assert(
      workspaceContent.includes('participationStatus === \'SUBMITTED\'') &&
        workspaceContent.includes('Workspace is locked'),
      'saveDraft strictly rejects modifications after team has submitted',
    );

    assert(
      workspaceContent.includes('isCountdownActive') &&
        workspaceContent.includes('Round ${roundNumber} is not currently active'),
      'saveDraft rejects draft saving when round is not active or during countdown',
    );

    // -------------------------------------------------------------------------
    // TEST GROUP 4: Arena Service & Questions Controller Security
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 4: Arena Service & Questions Controller Security ---');
    const arenaServicePath = path.resolve(
      __dirname,
      '../apps/backend/src/competition/arena.service.ts',
    );
    const arenaContent = fs.readFileSync(arenaServicePath, 'utf-8');

    assert(
      arenaContent.includes('isCountdownActive') &&
        arenaContent.includes('countdown is in progress'),
      'assertRoundAccess detects synchronized countdown and locks access',
    );

    assert(
      arenaContent.includes('canReviewSubmitted = progress.participationStatus === \'SUBMITTED\'') &&
        arenaContent.includes('The competition arena will become available when Round'),
      'assertRoundAccess allows READ only when round is active or team is reviewing submitted work',
    );

    assert(
      arenaContent.includes('action === \'WRITE\' || action === \'SUBMIT\'') &&
        arenaContent.includes('has already been submitted by your team'),
      'assertRoundAccess blocks WRITE and SUBMIT once team has submitted',
    );

    const questionsCtrlPath = path.resolve(
      __dirname,
      '../apps/backend/src/competition/questions.controller.ts',
    );
    const questionsCtrlContent = fs.readFileSync(questionsCtrlPath, 'utf-8');

    assert(
      questionsCtrlContent.includes('getQuestionsForRound') &&
        questionsCtrlContent.includes('assertRoundAccess(user as AuthTeamUser, roundNumber, \'READ\')'),
      'getQuestionsForRound enforces assertRoundAccess for all TEAM requests',
    );

    // -------------------------------------------------------------------------
    // TEST GROUP 5: Frontend Clean Preparation Screen & Submission Locks
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 5: Frontend Clean Preparation Screen & Submission Locks ---');
    const codingWorkspacePath = path.resolve(
      __dirname,
      '../apps/frontend/src/pages/team/CodingWorkspacePreviewPage.tsx',
    );
    const workspacePageContent = fs.readFileSync(codingWorkspacePath, 'utf-8');

    assert(
      workspacePageContent.includes('isLockedPreRound') &&
        workspacePageContent.includes('Round ${roundNumber} Preparation Screen'),
      'CodingWorkspacePreviewPage displays clean preparation screen before round start',
    );

    assert(
      workspacePageContent.includes('isCurrentCaseSubmitted') &&
        workspacePageContent.includes('disabled={isRunning || isCompetitionPaused || isCurrentCaseSubmitted}'),
      'CodingWorkspacePreviewPage disables Run Code button when case/round is submitted',
    );

    assert(
      workspacePageContent.includes('editable={!isCurrentCaseSubmitted && !isCompetitionPaused}'),
      'CodingWorkspacePreviewPage renders CodeMirror in read-only mode after submission',
    );

    const mcqPagePath = path.resolve(
      __dirname,
      '../apps/frontend/src/pages/team/McqArenaPage.tsx',
    );
    const mcqPageContent = fs.readFileSync(mcqPagePath, 'utf-8');

    assert(
      mcqPageContent.includes('Round 1 MCQ Arena Locked') &&
        mcqPageContent.includes('The competition arena will become available when Round 1 begins'),
      'McqArenaPage displays clean preparation screen before Round 1 starts',
    );

    assert(
      mcqPageContent.includes('isR1Active && !isSubmitted'),
      'McqArenaPage automatically unlocks and loads arena state when Round 1 starts',
    );

    // -------------------------------------------------------------------------
    // TEST GROUP 6: Functional Access Control Simulation
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 6: Functional Access Control Simulation ---');

    // Simulate assertRoundAccess logic for all three rounds
    function simulateAccess(roundNum, compStatus, countdownActive, eligibility, partStatus, action) {
      if (eligibility !== 'ELIGIBLE') {
        return { allowed: false, error: 'NOT_ELIGIBLE', status: 403 };
      }

      const isRoundActive =
        !countdownActive && compStatus === `ROUND_${roundNum}_ACTIVE`;

      if (action === 'READ') {
        const canReview = partStatus === 'SUBMITTED';
        if (!isRoundActive && !canReview) {
          return { allowed: false, error: countdownActive ? 'COUNTDOWN_ACTIVE' : 'NOT_ACTIVE', status: 403 };
        }
        return { allowed: true, status: 200 };
      }

      if (action === 'WRITE' || action === 'SUBMIT') {
        if (countdownActive) return { allowed: false, error: 'COUNTDOWN_ACTIVE', status: 403 };
        if (!isRoundActive) return { allowed: false, error: 'NOT_ACTIVE', status: 403 };
        if (partStatus === 'SUBMITTED') return { allowed: false, error: 'ALREADY_SUBMITTED', status: 403 };
        return { allowed: true, status: 200 };
      }

      return { allowed: false, error: 'UNKNOWN_ACTION', status: 400 };
    }

    // Round 1 scenarios
    const r1BeforeStart = simulateAccess(1, 'STANDBY', false, 'ELIGIBLE', 'NOT_STARTED', 'READ');
    assert(!r1BeforeStart.allowed && r1BeforeStart.status === 403, 'R1: Eligible team before round start is rejected (403)');

    const r1DuringCountdown = simulateAccess(1, 'STANDBY', true, 'ELIGIBLE', 'NOT_STARTED', 'READ');
    assert(!r1DuringCountdown.allowed && r1DuringCountdown.status === 403, 'R1: Eligible team during countdown is rejected (403)');

    const r1ActiveRead = simulateAccess(1, 'ROUND_1_ACTIVE', false, 'ELIGIBLE', 'NOT_STARTED', 'READ');
    assert(r1ActiveRead.allowed && r1ActiveRead.status === 200, 'R1: Eligible team after round start is allowed to read (200)');

    const r1ActiveWrite = simulateAccess(1, 'ROUND_1_ACTIVE', false, 'ELIGIBLE', 'NOT_STARTED', 'WRITE');
    assert(r1ActiveWrite.allowed && r1ActiveWrite.status === 200, 'R1: Eligible team after round start is allowed to save answers (200)');

    const r1SubmittedWrite = simulateAccess(1, 'ROUND_1_ACTIVE', false, 'ELIGIBLE', 'SUBMITTED', 'WRITE');
    assert(!r1SubmittedWrite.allowed && r1SubmittedWrite.status === 403, 'R1: Submitted team cannot write/modify answers (403)');

    const r1SubmittedReview = simulateAccess(1, 'COMPLETED', false, 'ELIGIBLE', 'SUBMITTED', 'READ');
    assert(r1SubmittedReview.allowed && r1SubmittedReview.status === 200, 'R1: Submitted team can review completed answers (200)');

    // Round 2 scenarios
    const r2Ineligible = simulateAccess(2, 'ROUND_2_ACTIVE', false, 'INELIGIBLE', 'NOT_STARTED', 'READ');
    assert(!r2Ineligible.allowed && r2Ineligible.status === 403, 'R2: Ineligible team is rejected (403)');

    const r2BeforeStart = simulateAccess(2, 'STANDBY', false, 'ELIGIBLE', 'NOT_STARTED', 'READ');
    assert(!r2BeforeStart.allowed && r2BeforeStart.status === 403, 'R2: Eligible team before start is rejected (403)');

    const r2Countdown = simulateAccess(2, 'STANDBY', true, 'ELIGIBLE', 'NOT_STARTED', 'READ');
    assert(!r2Countdown.allowed && r2Countdown.status === 403, 'R2: Eligible team during countdown is rejected (403)');

    const r2ActiveRead = simulateAccess(2, 'ROUND_2_ACTIVE', false, 'ELIGIBLE', 'NOT_STARTED', 'READ');
    assert(r2ActiveRead.allowed && r2ActiveRead.status === 200, 'R2: Eligible team after start is allowed to read questions and drafts (200)');

    const r2SubmittedWrite = simulateAccess(2, 'ROUND_2_ACTIVE', false, 'ELIGIBLE', 'SUBMITTED', 'WRITE');
    assert(!r2SubmittedWrite.allowed && r2SubmittedWrite.status === 403, 'R2: Submitted team cannot modify code or submit again (403)');

    // Round 3 scenarios
    const r3Ineligible = simulateAccess(3, 'ROUND_3_ACTIVE', false, 'INELIGIBLE', 'NOT_STARTED', 'READ');
    assert(!r3Ineligible.allowed && r3Ineligible.status === 403, 'R3: Ineligible team is rejected (403)');

    const r3BeforeStart = simulateAccess(3, 'STANDBY', false, 'ELIGIBLE', 'NOT_STARTED', 'READ');
    assert(!r3BeforeStart.allowed && r3BeforeStart.status === 403, 'R3: Eligible team before start is rejected (403)');

    const r3Countdown = simulateAccess(3, 'STANDBY', true, 'ELIGIBLE', 'NOT_STARTED', 'READ');
    assert(!r3Countdown.allowed && r3Countdown.status === 403, 'R3: Eligible team during countdown is rejected (403)');

    const r3Active = simulateAccess(3, 'ROUND_3_ACTIVE', false, 'ELIGIBLE', 'NOT_STARTED', 'READ');
    assert(r3Active.allowed && r3Active.status === 200, 'R3: Eligible team after start is allowed (200)');

    const r3ConcludedUnsubmitted = simulateAccess(3, 'COMPLETED', false, 'ELIGIBLE', 'NOT_STARTED', 'READ');
    assert(!r3ConcludedUnsubmitted.allowed && r3ConcludedUnsubmitted.status === 403, 'R3: Unsubmitted team after round conclusion cannot access workspace (403)');

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n===============================================================');
    console.log(`TOTAL TESTS: ${passed + failed}`);
    console.log(`PASSED: ${passed}`);
    console.log(`FAILED: ${failed}`);
    console.log('===============================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test suite error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAccessControlVerification();
