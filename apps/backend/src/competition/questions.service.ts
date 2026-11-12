import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  QuestionType,
  QuestionDto,
  SanitizedQuestionDto,
  CreateQuestionDto,
  UpdateQuestionDto,
} from '@ignitron/shared';

@Injectable()
export class QuestionsService {
  private readonly logger = new Logger(QuestionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to resolve round ID by round number
   */
  private async getRoundByNumber(roundNumber: number) {
    const round = await this.prisma.competitionRound.findFirst({
      where: { roundNumber },
    });
    if (!round) {
      throw new NotFoundException(`Competition Round ${roundNumber} not found.`);
    }
    return round;
  }

  /**
   * List questions for admin (includes correct answers & hidden test cases)
   */
  async listAdminQuestions(roundNumber?: number, type?: QuestionType): Promise<QuestionDto[]> {
    const whereClause: any = {};
    if (roundNumber) {
      const round = await this.getRoundByNumber(roundNumber);
      whereClause.roundId = round.id;
    }
    if (type) {
      whereClause.type = type;
    }

    const questions = await this.prisma.question.findMany({
      where: whereClause,
      include: {
        round: {
          select: { roundNumber: true },
        },
      },
      orderBy: [{ round: { roundNumber: 'asc' } }, { orderNumber: 'asc' }],
    });

    return questions.map((q) => ({
      id: q.id,
      roundId: q.roundId,
      roundNumber: q.round.roundNumber,
      type: q.type as QuestionType,
      orderNumber: q.orderNumber,
      caseNumber: q.caseNumber,
      title: q.title,
      description: q.description,
      starterCode: q.starterCode,
      language: q.language,
      marks: Number(q.marks),
      options: (q.options as string[]) || null,
      correctOption: q.correctOption,
      explanation: q.explanation,
      sampleTestCases: (q.sampleTestCases as any) || null,
      hiddenTestCases: (q.hiddenTestCases as any) || null,
      rubric: (q.rubric as any) || null,
      isActive: q.isActive,
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString(),
    }));
  }

  /**
   * Get single question for admin
   */
  async getAdminQuestion(id: string): Promise<QuestionDto> {
    const q = await this.prisma.question.findUnique({
      where: { id },
      include: { round: { select: { roundNumber: true } } },
    });
    if (!q) {
      throw new NotFoundException(`Question with ID ${id} not found.`);
    }

    return {
      id: q.id,
      roundId: q.roundId,
      roundNumber: q.round.roundNumber,
      type: q.type as QuestionType,
      orderNumber: q.orderNumber,
      caseNumber: q.caseNumber,
      title: q.title,
      description: q.description,
      starterCode: q.starterCode,
      language: q.language,
      marks: Number(q.marks),
      options: (q.options as string[]) || null,
      correctOption: q.correctOption,
      explanation: q.explanation,
      sampleTestCases: (q.sampleTestCases as any) || null,
      hiddenTestCases: (q.hiddenTestCases as any) || null,
      rubric: (q.rubric as any) || null,
      isActive: q.isActive,
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString(),
    };
  }

  /**
   * Create question (Admin)
   */
  async createQuestion(dto: CreateQuestionDto): Promise<QuestionDto> {
    const round = await this.getRoundByNumber(dto.roundNumber);

    const question = await this.prisma.question.create({
      data: {
        roundId: round.id,
        type: dto.type,
        orderNumber: dto.orderNumber,
        caseNumber: dto.caseNumber,
        title: dto.title.trim(),
        description: dto.description.trim(),
        starterCode: dto.starterCode,
        language: dto.language,
        marks: dto.marks !== undefined ? dto.marks : 2.0,
        options: dto.options ? (dto.options as any) : null,
        correctOption: dto.correctOption,
        explanation: dto.explanation,
        sampleTestCases: dto.sampleTestCases ? (dto.sampleTestCases as any) : null,
        hiddenTestCases: dto.hiddenTestCases ? (dto.hiddenTestCases as any) : null,
        rubric: dto.rubric ? (dto.rubric as any) : null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: { round: { select: { roundNumber: true } } },
    });

    return {
      id: question.id,
      roundId: question.roundId,
      roundNumber: question.round.roundNumber,
      type: question.type as QuestionType,
      orderNumber: question.orderNumber,
      caseNumber: question.caseNumber,
      title: question.title,
      description: question.description,
      starterCode: question.starterCode,
      language: question.language,
      marks: Number(question.marks),
      options: (question.options as string[]) || null,
      correctOption: question.correctOption,
      explanation: question.explanation,
      sampleTestCases: (question.sampleTestCases as any) || null,
      hiddenTestCases: (question.hiddenTestCases as any) || null,
      rubric: (question.rubric as any) || null,
      isActive: question.isActive,
      createdAt: question.createdAt.toISOString(),
      updatedAt: question.updatedAt.toISOString(),
    };
  }

  /**
   * Update question (Admin)
   */
  async updateQuestion(id: string, dto: UpdateQuestionDto): Promise<QuestionDto> {
    const existing = await this.prisma.question.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Question with ID ${id} not found.`);
    }

    let roundId = existing.roundId;
    if (dto.roundNumber) {
      const round = await this.getRoundByNumber(dto.roundNumber);
      roundId = round.id;
    }

    const updated = await this.prisma.question.update({
      where: { id },
      data: {
        roundId,
        type: dto.type ?? existing.type,
        orderNumber: dto.orderNumber ?? existing.orderNumber,
        caseNumber: dto.caseNumber !== undefined ? dto.caseNumber : existing.caseNumber,
        title: dto.title ? dto.title.trim() : existing.title,
        description: dto.description ? dto.description.trim() : existing.description,
        starterCode: dto.starterCode !== undefined ? dto.starterCode : existing.starterCode,
        language: dto.language !== undefined ? dto.language : existing.language,
        marks: dto.marks !== undefined ? dto.marks : existing.marks,
        options: dto.options !== undefined ? (dto.options as any) : existing.options,
        correctOption: dto.correctOption !== undefined ? dto.correctOption : existing.correctOption,
        explanation: dto.explanation !== undefined ? dto.explanation : existing.explanation,
        sampleTestCases: dto.sampleTestCases !== undefined ? (dto.sampleTestCases as any) : existing.sampleTestCases,
        hiddenTestCases: dto.hiddenTestCases !== undefined ? (dto.hiddenTestCases as any) : existing.hiddenTestCases,
        rubric: dto.rubric !== undefined ? (dto.rubric as any) : existing.rubric,
        isActive: dto.isActive !== undefined ? dto.isActive : existing.isActive,
      },
      include: { round: { select: { roundNumber: true } } },
    });

    return {
      id: updated.id,
      roundId: updated.roundId,
      roundNumber: updated.round.roundNumber,
      type: updated.type as QuestionType,
      orderNumber: updated.orderNumber,
      caseNumber: updated.caseNumber,
      title: updated.title,
      description: updated.description,
      starterCode: updated.starterCode,
      language: updated.language,
      marks: Number(updated.marks),
      options: (updated.options as string[]) || null,
      correctOption: updated.correctOption,
      explanation: updated.explanation,
      sampleTestCases: (updated.sampleTestCases as any) || null,
      hiddenTestCases: (updated.hiddenTestCases as any) || null,
      rubric: (updated.rubric as any) || null,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Delete question (Admin)
   */
  async deleteQuestion(id: string): Promise<{ success: boolean; message: string }> {
    const existing = await this.prisma.question.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Question with ID ${id} not found.`);
    }

    await this.prisma.question.delete({ where: { id } });
    return { success: true, message: `Question ${id} successfully deleted.` };
  }

  /**
   * Sanitized questions for contestants (Round 1 MCQs, Round 2 Bug Hunt, Round 3 Coding Cases)
   * Strictly omits correctOption, explanation, and hiddenTestCases.
   */
  async getSanitizedQuestionsForRound(roundNumber: number): Promise<SanitizedQuestionDto[]> {
    const round = await this.getRoundByNumber(roundNumber);

    const questions = await this.prisma.question.findMany({
      where: {
        roundId: round.id,
        isActive: true,
      },
      orderBy: { orderNumber: 'asc' },
    });

    return questions.map((q) => ({
      id: q.id,
      roundNumber,
      type: q.type as QuestionType,
      orderNumber: q.orderNumber,
      caseNumber: q.caseNumber,
      title: q.title,
      description: q.description,
      starterCode: q.starterCode,
      language: q.language,
      marks: Number(q.marks),
      options: (q.options as string[]) || null,
      sampleTestCases: (q.sampleTestCases as any) || null,
      rubric: (q.rubric as any) || null,
    }));
  }

  /**
   * Seeds official question bank for all three rounds if not already seeded
   */
  async seedOfficialQuestionBank(): Promise<{ seededCount: number; message: string }> {
    const r1 = await this.getRoundByNumber(1);
    const r2 = await this.getRoundByNumber(2);
    const r3 = await this.getRoundByNumber(3);

    let createdCount = 0;

    // Check if questions already exist
    const existingCount = await this.prisma.question.count();
    if (existingCount > 0) {
      this.logger.log(`Questions already exist (${existingCount}). Skipping auto-seed.`);
      return {
        seededCount: 0,
        message: `Database already contains ${existingCount} questions. Existing questions preserved.`,
      };
    }

    // ROUND 1: 15 OFFICIAL MCQS (2 Marks each = 30 Marks)
    const round1MCQs = [
      {
        orderNumber: 1,
        title: 'Heap Construction Runtime Complexity',
        description: 'What is the tightest asymptotic worst-case time complexity of building a Binary Max-Heap from an unsorted array of N elements using Floyd’s linear build-heap algorithm (bottom-up sift-down)?',
        options: ['O(N log N)', 'O(N)', 'O(N^2)', 'O(log N)'],
        correctOption: 1, // 'O(N)'
        explanation: 'Floyd’s algorithm operates in linear time O(N) because the sum of heights across all nodes is bounded by N * sum_{h=1}^{inf} (h / 2^h) = 2N.',
      },
      {
        orderNumber: 2,
        title: 'Shortest Path Graph Limitations',
        description: 'Under which condition does standard Dijkstra’s algorithm fail to guarantee the shortest path to all reachable vertices?',
        options: [
          'The graph is directed and cyclic',
          'The graph contains edges with negative weights',
          'The graph is disconnected',
          'The graph has vertices with degree greater than 2',
        ],
        correctOption: 1, // 'The graph contains edges with negative weights'
        explanation: 'Dijkstra greedily assumes once a vertex is extracted from the priority queue its distance is finalized, which fails when negative edges exist.',
      },
      {
        orderNumber: 3,
        title: 'AVL Tree Height Bounds',
        description: 'In an AVL tree with N nodes, what is the theoretical upper bound on tree height in terms of Fibonacci numbers?',
        options: [
          'H < 1.44 log2(N + 2) - 0.328',
          'H = 2 * log2(N)',
          'H <= log2(N)',
          'H = sqrt(N)',
        ],
        correctOption: 0,
        explanation: 'The minimal number of nodes in an AVL tree of height H satisfies N(H) = N(H-1) + N(H-2) + 1, leading to H < 1.4404 log2(N + 2).',
      },
      {
        orderNumber: 4,
        title: 'Space Complexity: Graph Traversals',
        description: 'For a balanced binary search tree of depth D and N nodes, what is the maximum auxiliary space required by Depth-First Search (call stack) versus Breadth-First Search (queue)?',
        options: [
          'DFS requires O(N), BFS requires O(1)',
          'DFS requires O(D) = O(log N), BFS requires O(N) at leaf level',
          'Both require strictly O(1) auxiliary space',
          'DFS requires O(N log N), BFS requires O(D)',
        ],
        correctOption: 1,
        explanation: 'DFS only stores the current branch path (depth D), whereas BFS must store the entire widest level in the queue, which is O(N/2) = O(N) at the leaf tier.',
      },
      {
        orderNumber: 5,
        title: 'Karatsuba Integer Multiplication',
        description: 'Karatsuba multiplication splits two N-digit integers and computes their product using 3 sub-multiplications of size N/2. What is its asymptotic time complexity?',
        options: ['O(N^2)', 'O(N log N)', 'O(N^(log2 3)) approx O(N^1.585)', 'O(N^3)'],
        correctOption: 2,
        explanation: 'By the Master Theorem, T(N) = 3T(N/2) + O(N) yields T(N) = O(N^(log_2 3)) approx O(N^1.585).',
      },
      {
        orderNumber: 6,
        title: 'Minimum Spanning Tree Cut Property',
        description: 'Let G = (V, E) be a connected, undirected graph with unique edge weights. Let (S, V \\ S) be any cut of G. Which statement is guaranteed to be true?',
        options: [
          'All edges crossing the cut belong to the MST',
          'The lightest (minimum weight) edge crossing the cut must belong to the MST',
          'The heaviest edge crossing the cut must belong to the MST',
          'No edges crossing the cut can belong to the MST',
        ],
        correctOption: 1,
        explanation: 'By the MST Cut Property, the strictly minimum weight edge crossing any valid cut is uniquely required in any MST of G.',
      },
      {
        orderNumber: 7,
        title: 'Hash Collisions with Separate Chaining',
        description: 'In a hash table of size M holding N keys using separate chaining with linked lists, what is the worst-case lookup time if the hash function maps all keys to the same bucket?',
        options: ['O(1)', 'O(log N)', 'O(N)', 'O(N / M)'],
        correctOption: 2,
        explanation: 'If all keys collide into a single chain, lookup degrades to a linear search across the chain of length N, taking O(N) time.',
      },
      {
        orderNumber: 8,
        title: 'QuickSort Degradation',
        description: 'Under which partitioning scenario does standard QuickSort with first-element pivot selection exhibit worst-case O(N^2) behavior?',
        options: [
          'When the input array is already sorted or reverse-sorted',
          'When the array contains strictly randomized uniform distributions',
          'When the pivot always splits the array into two equal halves',
          'When all array elements are powers of two',
        ],
        correctOption: 0,
        explanation: 'When the array is already sorted, picking the first element yields partitions of size 0 and N-1 at every step, creating O(N) levels and O(N^2) total comparisons.',
      },
      {
        orderNumber: 9,
        title: 'Dynamic Programming Prerequisite',
        description: 'Which two fundamental properties are strictly necessary for a problem to be solvable via Dynamic Programming?',
        options: [
          'Greedy choice property and disjoint subproblems',
          'Optimal substructure and overlapping subproblems',
          'Linear dependency and state-space tree pruning',
          'Bipartite connectivity and monotone stack invariance',
        ],
        correctOption: 1,
        explanation: 'Dynamic Programming requires that the global optimum can be composed from subproblem optima (optimal substructure) and that subproblems recur repeatedly (overlapping subproblems).',
      },
      {
        orderNumber: 10,
        title: 'Bit Manipulation Invariance',
        description: 'In two’s complement arithmetic, what effect does the bitwise expression `x & (x - 1)` have on non-zero integer x?',
        options: [
          'Inverts the most significant bit',
          'Clears (turns to 0) the lowest set bit (rightmost 1-bit)',
          'Doubles the magnitude of x',
          'Checks if x is a prime number',
        ],
        correctOption: 1,
        explanation: 'Subtracting 1 flips the rightmost 1 and all subsequent 0s to 1. ANDing with x zeroes out that rightmost 1 and leaves all higher bits unchanged.',
      },
      {
        orderNumber: 11,
        title: 'Topological Sort Preconditions',
        description: 'Which class of graphs admits a valid topological ordering of its vertices?',
        options: [
          'Any connected undirected graph',
          'Directed Acyclic Graphs (DAGs) only',
          'Complete bipartite graphs with cycles',
          'Eulerian circuits with negative loops',
        ],
        correctOption: 1,
        explanation: 'A topological sort orders vertices such that for every directed edge u -> v, u appears before v. If any cycle exists, no such order can exist.',
      },
      {
        orderNumber: 12,
        title: 'Amortized Complexity: Dynamic Array',
        description: 'A dynamic array starts at capacity 1 and doubles whenever full. What is the amortized cost per append operation over a sequence of N insertions?',
        options: ['O(N)', 'O(log N)', 'O(1)', 'O(N log N)'],
        correctOption: 2,
        explanation: 'The total cost of doubling across N operations is 1 + 2 + 4 + ... + N <= 2N. Averaged over N insertions, the amortized cost per append is O(1).',
      },
      {
        orderNumber: 13,
        title: 'Master Theorem Evaluation',
        description: 'Given the divide-and-conquer recurrence T(n) = 4T(n/2) + O(n), what is the asymptotic solution according to the Master Theorem?',
        options: ['O(n log n)', 'O(n^2)', 'O(n^3)', 'O(log n)'],
        correctOption: 1,
        explanation: 'Here a = 4, b = 2, so n^(log_b a) = n^(log_2 4) = n^2. Since f(n) = O(n) is polynomially smaller than n^2 by n^1, Case 1 applies and T(n) = Theta(n^2).',
      },
      {
        orderNumber: 14,
        title: 'Red-Black Tree Isomorphism',
        description: 'A Red-Black tree is structurally isomorphic to which multi-way balanced search tree?',
        options: ['B-Tree of order 10', '2-3-4 (B-tree of minimum degree 2)', 'Splay Tree', 'Radix Tree'],
        correctOption: 1,
        explanation: 'Every Red-Black tree node corresponds to a key in a 2-3-4 tree, where red edges glue nodes together into 3-nodes and 4-nodes.',
      },
      {
        orderNumber: 15,
        title: 'Graph Bridges and Cut Vertices',
        description: 'In Tarjan’s / Kosaraju’s DFS algorithm, edge (u, v) in a connected undirected graph is an articulation bridge if and only if which condition holds?',
        options: [
          'low[v] > disc[u]',
          'low[v] == disc[u]',
          'disc[v] < disc[u]',
          'low[v] == 0',
        ],
        correctOption: 0,
        explanation: 'Edge (u, v) is a bridge iff low[v] > disc[u], signifying that no back-edge from the subtree rooted at v reaches u or any of u’s ancestors.',
      },
    ];

    for (const mcq of round1MCQs) {
      await this.prisma.question.create({
        data: {
          roundId: r1.id,
          type: 'MCQ',
          orderNumber: mcq.orderNumber,
          title: mcq.title,
          description: mcq.description,
          marks: 2.0,
          options: mcq.options,
          correctOption: mcq.correctOption,
          explanation: mcq.explanation,
          isActive: true,
        },
      });
      createdCount++;
    }

    // ROUND 2: BUG HUNT ARENA (100 Marks Total)
    const bugHuntProblem = {
      orderNumber: 1,
      title: 'Bug Hunt: Distributed Token Bucket Rate Limiter',
      description: `### Challenge Overview
Your team has inherited a high-throughput Token Bucket Rate Limiter intended for mission-critical microservice APIs.
The system is failing under stress testing: it allows illegal request bursts, calculates incorrect token refills after idle intervals, and suffers from integer division truncation.

### Your Objectives:
1. Identify all logic and algorithmic defects in the provided starter code.
2. Fix the token calculation, capacity enforcement, and thread-safety / state boundaries.
3. Ensure every test case passes within the specified sub-millisecond execution constraints.

### Rubric Breakdown:
- **Bug Identification & Isolation:** 20 Marks
- **Test Correctness & Passing Suite:** 50 Marks
- **Boundary & Edge Case Handling:** 20 Marks
- **Code Cleanliness & Documentation:** 10 Marks`,
      language: 'typescript',
      starterCode: `/**
 * IGNITRON 2K26 — Round 2 Bug Hunt Starter
 * Rate Limiter Token Bucket Implementation
 * FAULTY CODE — CONTAINS LOGICAL BUGS
 */

export class TokenBucketLimiter {
  private capacity: number;
  private refillRatePerSecond: number;
  private tokens: number;
  private lastRefillTimestamp: number;

  constructor(capacity: number, refillRatePerSecond: number) {
    this.capacity = capacity;
    this.refillRatePerSecond = refillRatePerSecond;
    this.tokens = capacity;
    this.lastRefillTimestamp = Date.now();
  }

  /**
   * Refills tokens based on elapsed wall-clock seconds.
   * BUG 1: Integer truncation prevents fractional refills.
   * BUG 2: Tokens exceed maximum capacity.
   */
  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - this.lastRefillTimestamp) / 1000);
    
    // BUG: Allows negative refills if clocks jump backwards
    const addedTokens = elapsedSeconds * this.refillRatePerSecond;
    this.tokens += addedTokens;
    // BUG: Missing upper bound check: this.tokens > capacity
    this.lastRefillTimestamp = now;
  }

  /**
   * Attempts to consume requested tokens.
   * BUG 3: Consumes tokens even when balance is insufficient!
   */
  public tryConsume(tokensRequested: number = 1): boolean {
    this.refill();

    if (this.tokens >= tokensRequested) {
      this.tokens -= tokensRequested;
      return true;
    }

    // BUG: Deducts anyway when false
    this.tokens -= tokensRequested;
    return false;
  }

  public getAvailableTokens(): number {
    return this.tokens;
  }
}`,
      marks: 100.0,
      rubric: {
        bugIdentification: 20,
        testCorrectness: 50,
        edgeCases: 20,
        codeQuality: 10,
      },
      sampleTestCases: [
        {
          stdin: 'CAPACITY=10 REFILL=2 CONSUME=5',
          expectedOutput: 'CONSUMED: true, REMAINING: 5',
          explanation: 'Initial bucket starts full (10 tokens). Consuming 5 leaves 5.',
        },
        {
          stdin: 'CAPACITY=5 REFILL=1 CONSUME=10',
          expectedOutput: 'CONSUMED: false, REMAINING: 5',
          explanation: 'Insufficient tokens (5 < 10) must reject without deducting balance.',
        },
      ],
      hiddenTestCases: [
        {
          stdin: 'CAPACITY=100 REFILL=50 ELAPSED_MS=500 CONSUME=25',
          expectedOutput: 'CONSUMED: true, REMAINING: 100',
          marks: 10,
        },
        {
          stdin: 'CAPACITY=10 REFILL=5 CLOCK_SKEW_NEGATIVE=-2000 CONSUME=1',
          expectedOutput: 'CONSUMED: true, REMAINING: 9',
          marks: 10,
        },
      ],
    };

    await this.prisma.question.create({
      data: {
        roundId: r2.id,
        type: 'BUG_HUNT',
        orderNumber: bugHuntProblem.orderNumber,
        title: bugHuntProblem.title,
        description: bugHuntProblem.description,
        starterCode: bugHuntProblem.starterCode,
        language: bugHuntProblem.language,
        marks: bugHuntProblem.marks,
        rubric: bugHuntProblem.rubric,
        sampleTestCases: bugHuntProblem.sampleTestCases,
        hiddenTestCases: bugHuntProblem.hiddenTestCases,
        isActive: true,
      },
    });
    createdCount++;

    // ROUND 3: FINAL BOSS CODING (100 Marks across 3 Distinct Cases)
    const round3Cases = [
      {
        orderNumber: 1,
        caseNumber: 1,
        title: 'Case 1: High-Throughput Prefix Tree Autocomplete (20 Marks)',
        description: `### Case 1 Problem Statement
Design an in-memory Trie (Prefix Tree) search engine that handles concurrent insertions and prefix-based completions with frequency ranking.

#### Requirements:
1. Insert words with associated positive popularity weights.
2. Given a prefix query string, return the top-K highest-weighted words starting with that prefix in lexicographical order for tie-breaking.
3. Optimal worst-case prefix lookup time: \`O(P + K log K)\` where P is prefix length.

#### Input Format:
- Line 1: Integer \`N\` (number of operations)
- Next N lines: \`INSERT <word> <weight>\` or \`QUERY <prefix> <K>\`

#### Output Format:
- Print comma-separated top-K matching words for each query, or \`NONE\` if no words match.`,
        starterCode: `import java.util.*;

public class Case1PrefixTrie {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextInt()) return;
        int operations = scanner.nextInt();
        
        // TODO: Implement Trie with priority ranking
    }
}`,
        language: 'java',
        marks: 20.0,
        rubric: { case1CoreAlgorithm: 20 },
      },
      {
        orderNumber: 2,
        caseNumber: 2,
        title: 'Case 2: Priority-Weighted Code Relay Task Scheduler (25 Marks)',
        description: `### Case 2 Problem Statement
Contestants must implement an optimal directed acyclic task graph (DAG) scheduler that dispatches compilation jobs across parallel executor threads.

#### Requirements:
1. Detect any circular compilation dependency cycles immediately and report the offending cycle path.
2. Given a set of dependencies \`task_u -> task_v\` (meaning u must precede v) and estimated execution durations, compute the Critical Path Method (CPM) minimum completion duration.
3. Output the exact topological dispatch sequence maximizing executor utilization.

#### Input Format:
- Line 1: \`V E\` (Number of tasks and dependency edges)
- Next V lines: \`<task_id> <duration_ms>\`
- Next E lines: \`<from_task> <to_task>\`

#### Output Format:
- Line 1: \`MIN_DURATION: <X>ms\`
- Line 2: Space-separated topological schedule order.`,
        starterCode: `# Case 2: Priority-Weighted Task Scheduler
import sys

def main():
    lines = sys.stdin.read().strip().split()
    if not lines:
        return
    # TODO: Implement DAG cycle detection and Critical Path Method (CPM)

if __name__ == '__main__':
    main()`,
        language: 'python',
        marks: 25.0,
        rubric: { case2TopologicalDispatcher: 25 },
      },
      {
        orderNumber: 3,
        caseNumber: 3,
        title: 'Case 3: Real-Time Concurrent Event Graph Cycle Detector & Flow Router (45 Marks)',
        description: `### Case 3 Problem Statement — The Final Boss
Implement a dynamic network flow optimizer for the IGNITRON 2K26 relay mesh. The system must maximize end-to-end data throughput while enforcing capacity and latency constraints.

#### Requirements:
1. Implement Dinic’s or Edmonds-Karp Maximum Flow algorithm to find maximum concurrent data packets between source terminal \`S\` and sink terminal \`T\`.
2. Find the minimum-cut edge set isolating \`S\` from \`T\`.
3. Support dynamic capacity reduction without recomputing the entire flow from scratch.

#### Scoring:
- Case 3 Core Algorithm: 45 Marks
- General Code Quality across all 3 cases: 10 Marks`,
        starterCode: `// Case 3: Final Boss Flow Router
#include <iostream>
#include <vector>
#include <queue>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // TODO: Implement Dinic's Algorithm with BFS level graph and DFS blocking flows
    return 0;
}`,
        language: 'cpp',
        marks: 45.0,
        rubric: { case3FlowRouter: 45, codeQuality: 10 },
      },
    ];

    for (const c of round3Cases) {
      await this.prisma.question.create({
        data: {
          roundId: r3.id,
          type: 'CODING_CASE',
          orderNumber: c.orderNumber,
          caseNumber: c.caseNumber,
          title: c.title,
          description: c.description,
          starterCode: c.starterCode,
          language: c.language,
          marks: c.marks,
          rubric: c.rubric,
          isActive: true,
        },
      });
      createdCount++;
    }

    this.logger.log(`Successfully seeded ${createdCount} competition questions.`);
    return {
      seededCount: createdCount,
      message: `Successfully populated question bank with ${createdCount} official questions.`,
    };
  }
}
