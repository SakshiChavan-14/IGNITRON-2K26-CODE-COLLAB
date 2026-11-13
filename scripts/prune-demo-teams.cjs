/**
 * IGNITRON 2K26 — Safe Transactional Pruning of Seeded Demo/Test Teams
 * Preserves ONLY "Code Hunters" (IGN-4DD6) and all official questions/rounds.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function pruneDemoTeams() {
  console.log('================================================================');
  console.log('   IGNITRON 2K26 — SAFE DEMO/TEST TEAM PRUNING');
  console.log('================================================================\n');

  try {
    // 1. Locate Code Hunters
    const codeHunters = await prisma.team.findFirst({
      where: { teamName: 'Code Hunters' },
      include: {
        participants: true,
        sessions: true,
      },
    });

    if (!codeHunters) {
      throw new Error('CRITICAL: "Code Hunters" team was not found in database! Aborting to prevent data loss.');
    }

    console.log(`[PRESERVE TARGET] Team: "${codeHunters.teamName}" (${codeHunters.teamCode})`);
    console.log(`  Institution: ${codeHunters.institution}`);
    console.log(`  Participants: ${codeHunters.participants.map((p) => p.fullName).join(', ')}`);
    console.log(`  ID: ${codeHunters.id}\n`);

    // 2. Identify all teams to be pruned (excluding Code Hunters)
    const teamsToPrune = await prisma.team.findMany({
      where: {
        id: { not: codeHunters.id },
      },
      select: {
        id: true,
        teamName: true,
        teamCode: true,
        institution: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    console.log(`Identified ${teamsToPrune.length} demo/test teams to be safely pruned:\n`);
    teamsToPrune.forEach((t, i) => {
      console.log(`  ${(i + 1).toString().padStart(2, '0')}. [${t.teamCode}] "${t.teamName}" (${t.institution || 'N/A'}) - ID: ${t.id}`);
    });

    const pruneTeamIds = teamsToPrune.map((t) => t.id);

    console.log('\nStarting transactional cascading cleanup...\n');

    const result = await prisma.$transaction(async (tx) => {
      // Step A: Find all submissions belonging to these teams
      const submissions = await tx.submission.findMany({
        where: { teamId: { in: pruneTeamIds } },
        select: { id: true },
      });
      const subIds = submissions.map((s) => s.id);

      // Step B: Delete evaluations referencing these submissions or teams
      const deletedEvaluations = await tx.evaluation.deleteMany({
        where: {
          OR: [
            { submissionId: { in: subIds } },
            { teamId: { in: pruneTeamIds } },
          ],
        },
      });

      // Step C: Delete submissions
      const deletedSubmissions = await tx.submission.deleteMany({
        where: { teamId: { in: pruneTeamIds } },
      });

      // Step D: Delete team round progress
      const deletedProgress = await tx.teamRoundProgress.deleteMany({
        where: { teamId: { in: pruneTeamIds } },
      });

      // Step E: Delete workspace drafts
      const deletedDrafts = await tx.workspaceDraft.deleteMany({
        where: { teamId: { in: pruneTeamIds } },
      });

      // Step F: Delete MCQ answers
      const deletedMcqAnswers = await tx.teamMcqAnswer.deleteMany({
        where: { teamId: { in: pruneTeamIds } },
      });

      // Step G: Delete team sessions
      const deletedSessions = await tx.teamSession.deleteMany({
        where: { teamId: { in: pruneTeamIds } },
      });

      // Step H: Delete participants
      const deletedParticipants = await tx.participant.deleteMany({
        where: { teamId: { in: pruneTeamIds } },
      });

      // Step I: Delete teams
      const deletedTeams = await tx.team.deleteMany({
        where: { id: { in: pruneTeamIds } },
      });

      // Step J: Record Audit Log
      await tx.activityLog.create({
        data: {
          actorType: 'SYSTEM',
          action: 'PRUNE_DEMO_TEAMS',
          description: `Safely pruned ${deletedTeams.count} demo/test teams while strictly preserving "Code Hunters" (${codeHunters.teamCode}).`,
          metadata: {
            preservedTeamId: codeHunters.id,
            preservedTeamName: codeHunters.teamName,
            deletedTeamsCount: deletedTeams.count,
            deletedParticipantsCount: deletedParticipants.count,
          },
        },
      });

      return {
        deletedEvaluations: deletedEvaluations.count,
        deletedSubmissions: deletedSubmissions.count,
        deletedProgress: deletedProgress.count,
        deletedDrafts: deletedDrafts.count,
        deletedMcqAnswers: deletedMcqAnswers.count,
        deletedSessions: deletedSessions.count,
        deletedParticipants: deletedParticipants.count,
        deletedTeams: deletedTeams.count,
      };
    });

    console.log('Transactional pruning finished successfully:');
    console.log(`  - Deleted Evaluations:  ${result.deletedEvaluations}`);
    console.log(`  - Deleted Submissions:  ${result.deletedSubmissions}`);
    console.log(`  - Deleted Round Progress:${result.deletedProgress}`);
    console.log(`  - Deleted Drafts:       ${result.deletedDrafts}`);
    console.log(`  - Deleted MCQ Answers:  ${result.deletedMcqAnswers}`);
    console.log(`  - Deleted Sessions:     ${result.deletedSessions}`);
    console.log(`  - Deleted Participants: ${result.deletedParticipants}`);
    console.log(`  - Deleted Demo Teams:   ${result.deletedTeams}\n`);

    // 3. Post-cleanup verification
    const remainingTeams = await prisma.team.findMany({
      include: { participants: true },
    });
    console.log(`Total remaining teams in database: ${remainingTeams.length}`);
    for (const t of remainingTeams) {
      console.log(`  -> [${t.teamCode}] "${t.teamName}" | Inst: "${t.institution}" | Participants: ${t.participants.length}`);
    }

    if (remainingTeams.length === 1 && remainingTeams[0].teamName === 'Code Hunters') {
      console.log('\n[SUCCESS] Exactly 1 team ("Code Hunters") remains. All demo/test teams successfully cleared!');
    } else {
      console.warn('\n[WARNING] Unexpected team count or state.');
    }
  } catch (err) {
    console.error('Fatal pruning error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

pruneDemoTeams();
