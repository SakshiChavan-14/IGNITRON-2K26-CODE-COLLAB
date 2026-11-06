import * as path from 'path';
import * as dotenv from 'dotenv';
import { PrismaClient, RoundStatus } from '@prisma/client';

// Ensure root .env is loaded regardless of working directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const prisma = new PrismaClient();

export const OFFICIAL_ROUNDS = [
  {
    roundNumber: 1,
    name: 'MCQ Arena',
    description:
      'Round 1 of IGNITRON 2K26 Code Relay: Fast-paced algorithmic multiple-choice questions assessing core computer science and programming fundamentals.',
    durationMinutes: 30,
    maximumMarks: 30,
    status: RoundStatus.UPCOMING,
  },
  {
    roundNumber: 2,
    name: 'Bug Hunt Arena',
    description:
      'Round 2 of IGNITRON 2K26 Code Relay: Code debugging and error isolation challenges across multiple programming languages.',
    durationMinutes: 40,
    maximumMarks: 100,
    status: RoundStatus.UPCOMING,
  },
  {
    roundNumber: 3,
    name: 'Final Boss Coding',
    description:
      'Round 3 of IGNITRON 2K26 Code Relay: Complex multi-stage team code relay programming challenge against timed test suites.',
    durationMinutes: 60,
    maximumMarks: 100,
    status: RoundStatus.UPCOMING,
  },
];

async function main() {
  console.log('--- Seeding Official Competition Rounds for IGNITRON 2K26 ---');

  for (const round of OFFICIAL_ROUNDS) {
    const upserted = await prisma.competitionRound.upsert({
      where: { roundNumber: round.roundNumber },
      update: {
        name: round.name,
        description: round.description,
        durationMinutes: round.durationMinutes,
        maximumMarks: round.maximumMarks,
        status: round.status,
      },
      create: {
        roundNumber: round.roundNumber,
        name: round.name,
        description: round.description,
        durationMinutes: round.durationMinutes,
        maximumMarks: round.maximumMarks,
        status: round.status,
      },
    });

    console.log(
      `✓ Seeded Round ${upserted.roundNumber}: ${upserted.name} (${upserted.durationMinutes} mins, ${upserted.maximumMarks} marks)`,
    );
  }

  console.log('--- Seeding Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error('Error executing database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

