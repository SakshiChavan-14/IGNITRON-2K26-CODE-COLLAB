const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyDatabase() {
  console.log('================================================================');
  console.log('IGNITRON 2K26 — PHASE 3.1: DATABASE SCHEMA & DATA INTEGRITY');
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
    // 1. Verify Tables Exist via Information Schema
    console.log('\n--- 1. Table Verification ---');
    const tables = await prisma.$queryRaw`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
    `;
    const tableNames = tables.map(t => t.TABLE_NAME || t.table_name);
    assert(tableNames.includes('questions'), 'Table `questions` exists in database');
    assert(tableNames.includes('team_mcq_answers'), 'Table `team_mcq_answers` exists in database');
    assert(tableNames.includes('workspace_drafts'), 'Table `workspace_drafts` exists');
    assert(tableNames.includes('submissions'), 'Table `submissions` exists');
    assert(tableNames.includes('evaluations'), 'Table `evaluations` exists');
    assert(tableNames.includes('team_round_progress'), 'Table `team_round_progress` exists');

    // 2. Verify New Columns on Existing Tables
    console.log('\n--- 2. Column Verification ---');
    const subCols = await prisma.$queryRaw`
      SELECT COLUMN_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'submissions'
    `;
    const subColNames = subCols.map(c => c.COLUMN_NAME || c.column_name);
    assert(subColNames.includes('question_id'), '`submissions.question_id` column exists');
    assert(subColNames.includes('test_case_results'), '`submissions.test_case_results` column exists');

    const evalCols = await prisma.$queryRaw`
      SELECT COLUMN_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'evaluations'
    `;
    const evalColNames = evalCols.map(c => c.COLUMN_NAME || c.column_name);
    assert(evalColNames.includes('team_id'), '`evaluations.team_id` column exists');
    assert(evalColNames.includes('round_number'), '`evaluations.round_number` column exists');
    assert(evalColNames.includes('criteria_scores'), '`evaluations.criteria_scores` column exists');

    const progressCols = await prisma.$queryRaw`
      SELECT COLUMN_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'team_round_progress'
    `;
    const progressColNames = progressCols.map(c => c.COLUMN_NAME || c.column_name);
    assert(progressColNames.includes('score_breakdown'), '`team_round_progress.score_breakdown` column exists');

    const draftCols = await prisma.$queryRaw`
      SELECT COLUMN_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'workspace_drafts'
    `;
    const draftColNames = draftCols.map(c => c.COLUMN_NAME || c.column_name);
    assert(draftColNames.includes('case_number'), '`workspace_drafts.case_number` column exists');

    // 3. Verify Constraints & Indexes
    console.log('\n--- 3. Index & Constraint Verification ---');
    const draftIndexes = await prisma.$queryRaw`
      SELECT INDEX_NAME, COLUMN_NAME 
      FROM information_schema.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'workspace_drafts'
    `;
    const uniqueCompound = draftIndexes.filter(i => 
      (i.INDEX_NAME || i.index_name) === 'workspace_drafts_team_id_round_id_case_number_key'
    );
    const compoundCols = uniqueCompound.map(c => c.COLUMN_NAME || c.column_name);
    assert(
      compoundCols.includes('team_id') && compoundCols.includes('round_id') && compoundCols.includes('case_number'),
      'Unique compound index `(team_id, round_id, case_number)` verified on `workspace_drafts`'
    );

    // 4. Verify Existing Data Intact (Non-destructive check)
    console.log('\n--- 4. Existing Tournament Data Integrity ---');
    const teamCount = await prisma.team.count();
    const participantCount = await prisma.participant.count();
    const sessionCount = await prisma.teamSession.count();
    const roundCount = await prisma.competitionRound.count();
    const questionCount = await prisma.question.count();

    console.log(`  Current Database Counts:`);
    console.log(`    - Teams: ${teamCount}`);
    console.log(`    - Participants: ${participantCount}`);
    console.log(`    - Sessions: ${sessionCount}`);
    console.log(`    - Competition Rounds: ${roundCount}`);
    console.log(`    - Questions: ${questionCount}`);

    assert(teamCount > 0, `Team records preserved intact (${teamCount} teams present)`);
    assert(participantCount > 0, `Participant records preserved intact (${participantCount} participants present)`);
    assert(roundCount === 3, `Official 3 competition rounds present (${roundCount} rounds)`);
    assert(questionCount >= 19, `Official question bank present (${questionCount} questions)`);

    console.log('\n================================================================');
    console.log(`DATABASE VERIFICATION: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');
  } catch (err) {
    console.error('Database verification error:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  process.exit(failed > 0 ? 1 : 0);
}

verifyDatabase();
