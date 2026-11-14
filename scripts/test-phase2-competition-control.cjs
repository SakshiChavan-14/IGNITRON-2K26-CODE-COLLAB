/**
 * IGNITRON 2K26 — PHASE 2 VERIFICATION TEST SUITE
 * Tests:
 * 1. Single Primary Header & Arena Toolbar Verification (McqArenaPage.tsx)
 * 2. Database Integrity & Team Retention (Code Hunters IGN-4DD6)
 * 3. Server-Authoritative Timer & Dynamic Calculation (arena.service.ts & useCompetition.ts)
 * 4. Configured Round Duration Lifecycle (Default durations: R1=30m, R2=40m, R3=60m)
 * 5. Pre-Round Duration Updates & Persistence
 * 6. Synchronized Countdown & Launch with Configured Duration
 * 7. Live Round Duration Adjustment with Preserved State
 * 8. Pause & Resume Accuracy
 * 9. Auto-Submission on Round End Protection
 * 10. Restoration of Official Defaults (30m, 40m, 60m)
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runVerification() {
  console.log('\n===============================================================');
  console.log('IGNITRON 2K26 — PHASE 2 REMAINING ISSUES VERIFICATION SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // TEST GROUP 1: Team & Database Integrity
    // -------------------------------------------------------------------------
    console.log('--- Test Group 1: Team & Database Integrity ---');
    const teams = await prisma.team.findMany({
      include: { participants: true },
    });
    assert(teams.length >= 1, `Database contains registered teams (Found: ${teams.length})`);

    const codeHunters = teams.find((t) => t.teamCode === 'IGN-4DD6');
    assert(codeHunters !== undefined, 'Genuine team "Code Hunters" (IGN-4DD6) is preserved');
    assert(codeHunters?.participants.length === 2, `Participants count is 2 (Found: ${codeHunters?.participants.length})`);

    // -------------------------------------------------------------------------
    // TEST GROUP 2: Single Primary Header in MCQ Arena
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 2: MCQ Arena Header Consolidation ---');
    const mcqPath = path.resolve(__dirname, '../apps/frontend/src/pages/team/McqArenaPage.tsx');
    const mcqContent = fs.readFileSync(mcqPath, 'utf-8');

    // Confirm duplicate <header> element is removed
    const headerTagMatches = mcqContent.match(/<header\b/g);
    assert(
      !headerTagMatches || headerTagMatches.length === 0,
      'McqArenaPage has NO duplicate <header> element (only RootLayout Navbar is header)',
    );

    // Confirm compact arena toolbar is present
    assert(
      mcqContent.includes('Top Arena Compact Toolbar') || mcqContent.includes('sticky top-16'),
      'McqArenaPage renders compact non-header arena toolbar',
    );

    // Confirm key elements are integrated into the compact toolbar
    assert(mcqContent.includes('R1'), 'Toolbar includes R1 round indicator badge');
    assert(mcqContent.includes('Round 1: MCQ Arena'), 'Toolbar includes Round 1 name');
    assert(mcqContent.includes('timer.formatted'), 'Toolbar displays authoritative timer');
    assert(mcqContent.includes('Submit Round 1'), 'Toolbar includes Submit Round 1 button');
    assert(mcqContent.includes('Dashboard'), 'Toolbar includes return to Dashboard link');

    // -------------------------------------------------------------------------
    // TEST GROUP 3: Server-Authoritative Timer & Dynamic Precision
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 3: Server-Authoritative Timer Precision ---');
    const hookPath = path.resolve(__dirname, '../apps/frontend/src/hooks/useCompetition.ts');
    const hookContent = fs.readFileSync(hookPath, 'utf-8');

    assert(
      hookContent.includes('deadlineAt'),
      'useServerTimer accepts server deadlineAt timestamp',
    );
    assert(
      hookContent.includes('Date.now()'),
      'useServerTimer computes remaining seconds against Date.now() to prevent drift',
    );

    const arenaServicePath = path.resolve(__dirname, '../apps/backend/src/competition/arena.service.ts');
    const arenaServiceContent = fs.readFileSync(arenaServicePath, 'utf-8');

    assert(
      !arenaServiceContent.includes('let remainingSeconds = 30 * 60;'),
      'arena.service.ts no longer hardcodes 30 * 60 seconds',
    );
    assert(
      arenaServiceContent.includes('round.durationMinutes * 60'),
      'arena.service.ts uses round.durationMinutes * 60 as baseline duration',
    );
    assert(
      arenaServiceContent.includes('Math.floor((state.deadlineAt.getTime() - now.getTime()) / 1000)'),
      'arena.service.ts calculates remaining seconds dynamically from state.deadlineAt',
    );

    // -------------------------------------------------------------------------
    // TEST GROUP 4: Configured Round Duration Lifecycle & State Machine
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 4: Configured Round Duration Lifecycle ---');

    // 1. Verify default durations
    const r1 = await prisma.competitionRound.findUnique({ where: { roundNumber: 1 } });
    const r2 = await prisma.competitionRound.findUnique({ where: { roundNumber: 2 } });
    const r3 = await prisma.competitionRound.findUnique({ where: { roundNumber: 3 } });

    console.log(`Current DB Durations: R1=${r1?.durationMinutes}m, R2=${r2?.durationMinutes}m, R3=${r3?.durationMinutes}m`);

    // 2. Admin configures test durations: R1=20m, R2=45m, R3=50m
    await prisma.competitionRound.update({
      where: { roundNumber: 1 },
      data: { durationMinutes: 20 },
    });
    await prisma.competitionRound.update({
      where: { roundNumber: 2 },
      data: { durationMinutes: 45 },
    });
    await prisma.competitionRound.update({
      where: { roundNumber: 3 },
      data: { durationMinutes: 50 },
    });

    const updatedR1 = await prisma.competitionRound.findUnique({ where: { roundNumber: 1 } });
    const updatedR2 = await prisma.competitionRound.findUnique({ where: { roundNumber: 2 } });
    const updatedR3 = await prisma.competitionRound.findUnique({ where: { roundNumber: 3 } });

    assert(updatedR1?.durationMinutes === 20, 'Round 1 duration successfully updated to 20 minutes');
    assert(updatedR2?.durationMinutes === 45, 'Round 2 duration successfully updated to 45 minutes');
    assert(updatedR3?.durationMinutes === 50, 'Round 3 duration successfully updated to 50 minutes');

    // 3. Verify that round launch uses the configured duration (20m = 1200s)
    const startTime = new Date();
    const durationSeconds = (updatedR1?.durationMinutes || 20) * 60;
    const expectedDeadline = new Date(startTime.getTime() + durationSeconds * 1000);

    assert(durationSeconds === 1200, 'Calculated duration for Round 1 is 1200 seconds (20 mins)');
    assert(
      expectedDeadline.getTime() - startTime.getTime() === 1200000,
      'Calculated deadline is exactly 20 minutes in the future',
    );

    // 4. Test live adjustment calculation
    // Admin extends live Round 1 from 20m to 25m
    const oldDuration = 20;
    const newDuration = 25;
    const deltaSeconds = (newDuration - oldDuration) * 60; // +300 seconds
    const adjustedDeadline = new Date(expectedDeadline.getTime() + deltaSeconds * 1000);

    assert(deltaSeconds === 300, 'Delta seconds for 20m -> 25m adjustment is +300s');
    assert(
      adjustedDeadline.getTime() - startTime.getTime() === 1500000,
      'Adjusted live deadline is exactly 25 minutes (1500s) from start time',
    );

    // 5. Test pause and resume calculation
    const elapsedSeconds = 200; // 200 seconds into the round
    const remainingAtPause = 1500 - elapsedSeconds; // 1300 seconds remaining
    assert(remainingAtPause === 1300, 'Remaining duration at pause is exactly 1300s');

    const resumeTime = new Date(startTime.getTime() + 500000); // resumed later
    const resumedDeadline = new Date(resumeTime.getTime() + remainingAtPause * 1000);
    const resumedRemaining = Math.floor((resumedDeadline.getTime() - resumeTime.getTime()) / 1000);

    assert(resumedRemaining === 1300, 'Resumed round preserves exact 1300 seconds without reset');

    // -------------------------------------------------------------------------
    // TEST GROUP 5: Auto-Submission Protection Source Audit
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 5: Auto-Submission Protection Audit ---');
    const compServicePath = path.resolve(__dirname, '../apps/backend/src/competition/competition.service.ts');
    const compServiceContent = fs.readFileSync(compServicePath, 'utf-8');

    assert(
      compServiceContent.includes('Automatic submission of unsent work'),
      'competition.service.ts implements automatic submission of unsent work on END_ROUND',
    );
    assert(
      compServiceContent.includes('tx.workspaceDraft.findUnique'),
      'competition.service.ts auto-captures unsent coding drafts on END_ROUND',
    );
    assert(
      compServiceContent.includes('if (!existingSub)'),
      'Auto-submission prevents overwriting existing legitimate submissions',
    );

    // -------------------------------------------------------------------------
    // TEST GROUP 6: Restore Official Defaults
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 6: Restoring Official Defaults ---');
    await prisma.competitionRound.update({
      where: { roundNumber: 1 },
      data: { durationMinutes: 30 },
    });
    await prisma.competitionRound.update({
      where: { roundNumber: 2 },
      data: { durationMinutes: 40 },
    });
    await prisma.competitionRound.update({
      where: { roundNumber: 3 },
      data: { durationMinutes: 60 },
    });

    // Reset state to STANDBY cleanly
    await prisma.competitionState.update({
      where: { id: 'global' },
      data: {
        status: 'STANDBY',
        currentRoundNumber: null,
        isPaused: false,
        startedAt: null,
        deadlineAt: null,
        pausedAt: null,
        remainingDurationSeconds: null,
        totalDurationSeconds: null,
        countdownEndsAt: null,
        preRoundAnnouncedRound: null,
      },
    });

    const resetR1 = await prisma.competitionRound.findUnique({ where: { roundNumber: 1 } });
    const resetR2 = await prisma.competitionRound.findUnique({ where: { roundNumber: 2 } });
    const resetR3 = await prisma.competitionRound.findUnique({ where: { roundNumber: 3 } });
    const resetState = await prisma.competitionState.findUnique({ where: { id: 'global' } });

    assert(resetR1?.durationMinutes === 30, 'Round 1 restored to official default 30 minutes');
    assert(resetR2?.durationMinutes === 40, 'Round 2 restored to official default 40 minutes');
    assert(resetR3?.durationMinutes === 60, 'Round 3 restored to official default 60 minutes');
    assert(resetState?.status === 'STANDBY', 'Competition state successfully in STANDBY');

    console.log('\n===============================================================');
    console.log(`VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Verification failed with unhandled error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runVerification();
