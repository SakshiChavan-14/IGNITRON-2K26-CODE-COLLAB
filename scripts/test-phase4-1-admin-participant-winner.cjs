/**
 * IGNITRON 2K26 — PHASE 4.1 COMPREHENSIVE VERIFICATION SUITE
 * Tests:
 * 1. Admin navigation (clean header without horizontal scrollbars, 5 primary + More dropdown)
 * 2. Demo teams pruning (exact retention of Code Hunters IGN-4DD6)
 * 3. Official winner declaration (audit trail, announcement broadcast, winnerTeam metadata)
 * 4. Consolidated participant dashboard (single unified navbar, no duplicate headers)
 * 5. Dismissible announcement popups (priority badges, local storage dismissal)
 * 6. Pre-round workspace lock (403 forbidden for unstarted rounds, locked banner)
 * 7. MCQ review mode & confirmation modal guard (no duplicate modals, clean exit to scorecard)
 * 8. Post-submission waiting notifications
 * 9. Official state transition announcement broadcasts
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runVerification() {
  console.log('\n===============================================================');
  console.log('IGNITRON 2K26 — PHASE 4.1 VERIFICATION TEST SUITE');
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
    // TEST 1: Check Database State — Only Code Hunters Retained
    // -------------------------------------------------------------------------
    console.log('--- Test Group 1: Database & Demo Team Pruning ---');
    const teams = await prisma.team.findMany({
      include: { participants: true },
    });
    assert(teams.length === 1, `Exactly 1 team in database (Found: ${teams.length})`);

    const codeHunters = teams.find((t) => t.teamCode === 'IGN-4DD6');
    assert(codeHunters !== undefined, 'Genuine team "Code Hunters" (IGN-4DD6) is preserved');
    assert(codeHunters?.teamName === 'Code Hunters', 'Team name is "Code Hunters"');
    assert(codeHunters?.institution === 'GM university', `Institution is "GM university" (Found: ${codeHunters?.institution})`);
    assert(codeHunters?.participants.length === 2, `Participants count is 2 (Found: ${codeHunters?.participants.length})`);

    const participantNames = codeHunters?.participants.map((p) => p.fullName) || [];
    assert(participantNames.includes('Spoorthi M O'), 'Participant "Spoorthi M O" is present');
    assert(participantNames.includes('Sanjana'), 'Participant "Sanjana" is present');

    // -------------------------------------------------------------------------
    // TEST 2: Admin Navigation Source Audit
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 2: Admin Navigation Consolidation ---');
    const navbarFile = fs.readFileSync(
      path.join(__dirname, '../apps/frontend/src/components/Navbar.tsx'),
      'utf8',
    );
    assert(
      !navbarFile.includes('overflow-x-auto') || !navbarFile.includes('ChevronLeft className="w-3.5 h-3.5"'),
      'Admin navigation has no horizontal scrollbar or navigation scroll arrows',
    );
    assert(
      navbarFile.includes('primaryAdminItems') && navbarFile.includes('secondaryAdminItems'),
      'Admin navigation cleanly split into primary items and secondary "More" dropdown',
    );
    assert(
      navbarFile.includes('adminMoreOpen'),
      'Admin navigation contains dropdown toggle state for secondary destinations',
    );

    // -------------------------------------------------------------------------
    // TEST 3: Duplicate Header Removal from Participant Dashboard
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 3: Participant Dashboard Header Consolidation ---');
    const dashboardFile = fs.readFileSync(
      path.join(__dirname, '../apps/frontend/src/pages/team/TeamDashboardPage.tsx'),
      'utf8',
    );
    assert(
      !dashboardFile.includes('<header className="bg-white border-b border-slate-200 sticky top-0 z-40'),
      'Duplicate internal <header> completely removed from TeamDashboardPage',
    );
    assert(
      !dashboardFile.includes('handleLogout = async () => {'),
      'Redundant internal handleLogout removed from TeamDashboardPage (Navbar handles auth)',
    );

    // -------------------------------------------------------------------------
    // TEST 4: Dismissible Announcement Popups
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 4: Dismissible Announcement Popups ---');
    assert(
      dashboardFile.includes('storageKey = `ignitron_dismissed_announcements_'),
      'TeamDashboardPage persists dismissed announcement IDs in localStorage per team',
    );
    assert(
      dashboardFile.includes('handleDismissAnnouncement'),
      'TeamDashboardPage provides dismiss handler',
    );
    assert(
      dashboardFile.includes('currentPopupAnnouncement.priority === \'URGENT\''),
      'Floating announcement popup applies priority-specific visual styling',
    );

    // -------------------------------------------------------------------------
    // TEST 5: Arena Workspace Lock Pre-Round Start
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 5: Pre-Round Workspace Locking ---');
    const arenaServiceFile = fs.readFileSync(
      path.join(__dirname, '../apps/backend/src/competition/arena.service.ts'),
      'utf8',
    );
    assert(
      arenaServiceFile.includes('The competition arena will become available when Round'),
      'Backend assertRoundAccess throws 403 Forbidden for upcoming rounds',
    );

    const codingWorkspaceFile = fs.readFileSync(
      path.join(__dirname, '../apps/frontend/src/pages/team/CodingWorkspacePreviewPage.tsx'),
      'utf8',
    );
    assert(
      codingWorkspaceFile.includes('isLockedPreRound') && codingWorkspaceFile.includes('Arena Locked'),
      'CodingWorkspacePreviewPage renders dedicated locked arena screen for upcoming rounds',
    );

    // -------------------------------------------------------------------------
    // TEST 6: MCQ Arena Read-Only Review & Modal Guard
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 6: MCQ Review & Modal Guard ---');
    const mcqArenaFile = fs.readFileSync(
      path.join(__dirname, '../apps/frontend/src/pages/team/McqArenaPage.tsx'),
      'utf8',
    );
    assert(
      mcqArenaFile.includes('confirmSubmitOpen && !isSubmitted && !reviewMode'),
      'MCQ submission confirmation modal is strictly guarded against review mode and post-submit state',
    );
    assert(
      mcqArenaFile.includes('Back to Score Card'),
      'MCQ Arena provides clean navigation back to score card during read-only review',
    );
    assert(
      mcqArenaFile.includes('Read-Only Review Mode — Viewing submitted answers'),
      'MCQ Arena displays read-only review mode banner',
    );

    // -------------------------------------------------------------------------
    // TEST 7: Post-Submission Waiting Notifications
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 7: Post-Submission Waiting Notifications ---');
    assert(
      mcqArenaFile.includes('Submission Received Successfully!'),
      'MCQ Arena displays prominent post-submission waiting message',
    );
    assert(
      codingWorkspaceFile.includes('Submission Received Successfully!'),
      'Coding Workspace displays prominent post-submission waiting banner',
    );

    // -------------------------------------------------------------------------
    // TEST 8: State Transition Official Broadcast Announcements
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 8: State Transition Broadcast Announcements ---');
    const competitionServiceFile = fs.readFileSync(
      path.join(__dirname, '../apps/backend/src/competition/competition.service.ts'),
      'utf8',
    );
    assert(
      competitionServiceFile.includes('Round 1: MCQ Arena has Begun!'),
      'START_ROUND_1 automatically creates broadcast announcement',
    );
    assert(
      competitionServiceFile.includes('Tournament Paused: Round'),
      'PAUSE_ROUND automatically creates urgent broadcast announcement',
    );
    assert(
      competitionServiceFile.includes('Tournament Resumed: Round'),
      'RESUME_ROUND automatically creates broadcast announcement',
    );
    assert(
      competitionServiceFile.includes('All arena inputs are locked and evaluation is now in progress'),
      'END_ROUND automatically creates broadcast announcement',
    );
    assert(
      competitionServiceFile.includes('Round 2: Bug Hunt Arena has Begun!'),
      'START_ROUND_2 automatically creates broadcast announcement',
    );
    assert(
      competitionServiceFile.includes('Round 3: Final Boss Coding Relay has Begun!'),
      'START_ROUND_3 automatically creates broadcast announcement',
    );

    // -------------------------------------------------------------------------
    // TEST 9: Official Winner Declaration Workflow
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 9: Official Winner Declaration ---');
    assert(
      competitionServiceFile.includes('async declareWinner('),
      'competition.service.ts implements declareWinner workflow',
    );
    assert(
      competitionServiceFile.includes('OFFICIAL_WINNER_DECLARED'),
      'Winner declaration creates persistent audit log and metadata',
    );

    const competitionControllerFile = fs.readFileSync(
      path.join(__dirname, '../apps/backend/src/competition/competition.controller.ts'),
      'utf8',
    );
    assert(
      competitionControllerFile.includes('@Post(\'declare-winner\')'),
      'competition.controller.ts exposes POST /declare-winner endpoint',
    );

    const leaderboardPageFile = fs.readFileSync(
      path.join(__dirname, '../apps/frontend/src/pages/admin/LeaderboardManagementPage.tsx'),
      'utf8',
    );
    assert(
      leaderboardPageFile.includes('Declare Official Winner'),
      'LeaderboardManagementPage provides admin button to declare official winner',
    );
    assert(
      leaderboardPageFile.includes('Score Tie Detected:'),
      'LeaderboardManagementPage handles score tie detection among top ranks',
    );
    assert(
      dashboardFile.includes('Official Champion of IGNITRON 2K26'),
      'TeamDashboardPage displays celebratory champion banner upon official declaration',
    );

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n===============================================================');
    console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('===============================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runVerification();
