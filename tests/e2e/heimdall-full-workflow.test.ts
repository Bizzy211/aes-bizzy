/**
 * Heimdall Full Workflow E2E Tests
 *
 * End-to-end tests simulating a complete A.E.S - Bizzy workflow with Heimdall memory.
 * Tests the entire flow from project initialization through task completion.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

// Mock memory system for E2E testing
interface Memory {
  id: string;
  content: string;
  tags: string[];
  memoryType: string;
  createdAt: number;
  metadata: Record<string, any>;
}

class MockHeimdallSystem {
  private memories: Memory[] = [];
  private idCounter = 0;

  async initialize() {
    this.memories = [];
    this.idCounter = 0;
    return { success: true };
  }

  async storeMemory(
    content: string,
    tags: string[],
    memoryType: string,
    metadata: Record<string, any> = {}
  ): Promise<{ success: boolean; id: string }> {
    const id = `mem_${++this.idCounter}`;
    this.memories.push({
      id,
      content,
      tags,
      memoryType,
      createdAt: Date.now(),
      metadata,
    });
    return { success: true, id };
  }

  async queryMemories(
    query: string,
    options: {
      tags?: string[];
      memoryType?: string;
      limit?: number;
    } = {}
  ): Promise<{ success: boolean; memories: Memory[] }> {
    let results = [...this.memories];

    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      results = results.filter((m) =>
        options.tags!.every((tag) => m.tags.includes(tag))
      );
    }

    // Filter by memory type
    if (options.memoryType) {
      results = results.filter((m) => m.memoryType === options.memoryType);
    }

    // Simple content search
    if (query) {
      const queryLower = query.toLowerCase();
      results = results.filter((m) =>
        m.content.toLowerCase().includes(queryLower)
      );
    }

    // Sort by recency
    results.sort((a, b) => b.createdAt - a.createdAt);

    // Apply limit
    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return { success: true, memories: results };
  }

  async getStats(): Promise<{
    totalMemories: number;
    byType: Record<string, number>;
    byProject: Record<string, number>;
  }> {
    const byType: Record<string, number> = {};
    const byProject: Record<string, number> = {};

    for (const memory of this.memories) {
      byType[memory.memoryType] = (byType[memory.memoryType] || 0) + 1;

      const projectTag = memory.tags.find((t) => t.startsWith('project:'));
      if (projectTag) {
        const project = projectTag.replace('project:', '');
        byProject[project] = (byProject[project] || 0) + 1;
      }
    }

    return {
      totalMemories: this.memories.length,
      byType,
      byProject,
    };
  }

  async deleteMemory(id: string): Promise<{ success: boolean }> {
    const index = this.memories.findIndex((m) => m.id === id);
    if (index !== -1) {
      this.memories.splice(index, 1);
      return { success: true };
    }
    return { success: false };
  }

  clear() {
    this.memories = [];
    this.idCounter = 0;
  }
}

// Workflow simulation helpers
class WorkflowSimulator {
  constructor(private heimdall: MockHeimdallSystem) {}

  async simulateProjectInit(projectName: string) {
    await this.heimdall.storeMemory(
      `## Project Initialized: ${projectName}\n\nNew project created with default structure.`,
      [`project:${projectName}`, 'event:project-init'],
      'context',
      { projectName }
    );
  }

  async simulatePRDParsing(projectName: string, tasks: string[]) {
    await this.heimdall.storeMemory(
      `## PRD Parsed\n\nProject: ${projectName}\nTasks Generated: ${tasks.length}\n\n${tasks.map((t, i) => `${i + 1}. ${t}`).join('\n')}`,
      [`project:${projectName}`, 'prd', 'planning'],
      'context',
      { tasksGenerated: tasks.length }
    );
  }

  async simulateTaskStart(taskId: string, title: string, agent: string) {
    await this.heimdall.storeMemory(
      `## Task Started: ${title}\n\nTask ID: ${taskId}\nAssigned to: ${agent}`,
      [`task:${taskId}`, `agent:${agent}`, 'task-started'],
      'context',
      { taskId, agent }
    );
  }

  async simulateTaskComplete(
    taskId: string,
    title: string,
    agent: string,
    lessons: string[]
  ) {
    await this.heimdall.storeMemory(
      `## Task Completed: ${title}\n\nTask ID: ${taskId}\nCompleted by: ${agent}\n\n### Lessons Learned\n${lessons.map((l) => `- ${l}`).join('\n')}`,
      [`task:${taskId}`, `agent:${agent}`, 'task-completed'],
      'context',
      { taskId, agent }
    );

    // Store individual lessons
    for (const lesson of lessons) {
      await this.heimdall.storeMemory(
        lesson,
        [`task:${taskId}`, `agent:${agent}`],
        'lesson',
        { taskId, agent }
      );
    }
  }

  async simulateError(
    errorType: string,
    message: string,
    resolution: string,
    agent: string
  ) {
    await this.heimdall.storeMemory(
      `## Error: ${errorType}\n\n**Message**: ${message}\n\n**Resolution**: ${resolution}`,
      [`error:${errorType}`, `agent:${agent}`],
      'error',
      { errorType, agent }
    );
  }

  async simulateCommit(hash: string, message: string, files: string[]) {
    await this.heimdall.storeMemory(
      `## Commit: ${hash.slice(0, 8)}\n\n${message}\n\n**Files**: ${files.join(', ')}`,
      ['git-commit', `commit:${hash.slice(0, 8)}`],
      'context',
      { commitHash: hash, filesChanged: files }
    );
  }

  async simulateSessionEnd(agent: string, summary: string) {
    await this.heimdall.storeMemory(
      `## Session Summary: ${agent}\n\n${summary}`,
      [`agent:${agent}`, 'session-summary'],
      'context',
      { agent }
    );
  }
}

describe('Heimdall Full Workflow E2E', () => {
  let heimdall: MockHeimdallSystem;
  let workflow: WorkflowSimulator;

  beforeAll(async () => {
    heimdall = new MockHeimdallSystem();
    workflow = new WorkflowSimulator(heimdall);
    await heimdall.initialize();
  });

  afterAll(() => {
    heimdall.clear();
  });

  beforeEach(() => {
    heimdall.clear();
  });

  describe('Complete Project Workflow', () => {
    it('should maintain context throughout a full project lifecycle', async () => {
      const projectName = 'test-webapp';

      // 1. Project Initialization
      await workflow.simulateProjectInit(projectName);

      // 2. PRD Parsing
      await workflow.simulatePRDParsing(projectName, [
        'Setup authentication',
        'Build product catalog',
        'Implement shopping cart',
        'Create checkout flow',
      ]);

      // 3. Task Execution
      await workflow.simulateTaskStart('1', 'Setup authentication', 'backend-dev');

      // 4. Error encountered and resolved
      await workflow.simulateError(
        'TypeScript',
        'Cannot find module "@/lib/auth"',
        'Fixed path alias in tsconfig.json',
        'debugger'
      );

      // 5. Task completion
      await workflow.simulateTaskComplete('1', 'Setup authentication', 'backend-dev', [
        'Use httpOnly cookies for JWT storage',
        'Implement refresh token rotation',
      ]);

      // 6. Git commit
      await workflow.simulateCommit('abc123def456', 'feat: implement authentication (task 1)', [
        'src/auth/login.ts',
        'src/auth/middleware.ts',
      ]);

      // 7. Session end
      await workflow.simulateSessionEnd(
        'backend-dev',
        'Completed authentication setup with JWT and refresh tokens'
      );

      // Verify full workflow was captured
      const stats = await heimdall.getStats();
      expect(stats.totalMemories).toBeGreaterThan(5);

      // Verify project context is retrievable
      const projectMemories = await heimdall.queryMemories('', {
        tags: [`project:${projectName}`],
      });
      expect(projectMemories.memories.length).toBeGreaterThan(0);

      // Verify lessons are stored
      const lessons = await heimdall.queryMemories('', {
        memoryType: 'lesson',
      });
      expect(lessons.memories.length).toBe(2);

      // Verify error resolution is stored
      const errors = await heimdall.queryMemories('', {
        memoryType: 'error',
      });
      expect(errors.memories.length).toBe(1);
    });
  });

  describe('Multi-Agent Collaboration', () => {
    it('should share knowledge between agents during task handoff', async () => {
      const projectName = 'collab-project';

      // PM Lead creates task
      await workflow.simulateProjectInit(projectName);
      await workflow.simulatePRDParsing(projectName, ['Build user dashboard']);

      // Frontend starts work
      await workflow.simulateTaskStart('1', 'Build user dashboard', 'frontend-dev');

      // Frontend discovers need for API
      await heimdall.storeMemory(
        'Need API endpoint for user stats at /api/users/:id/stats',
        [`project:${projectName}`, 'task:1', 'agent:frontend-dev', 'blocker'],
        'context'
      );

      // Backend picks up the requirement
      await workflow.simulateTaskStart('1.1', 'Create user stats API', 'backend-dev');

      // Backend queries for frontend's requirements
      const requirements = await heimdall.queryMemories('API endpoint', {
        tags: [`project:${projectName}`],
      });

      expect(requirements.memories.length).toBeGreaterThan(0);
      expect(requirements.memories[0].content).toContain('/api/users/:id/stats');

      // Backend completes API
      await workflow.simulateTaskComplete('1.1', 'Create user stats API', 'backend-dev', [
        'Used caching for performance',
      ]);

      // Frontend can now complete
      await workflow.simulateTaskComplete('1', 'Build user dashboard', 'frontend-dev', [
        'Implemented with React Query for data fetching',
      ]);

      // Verify cross-agent knowledge sharing
      const allLessons = await heimdall.queryMemories('', {
        memoryType: 'lesson',
      });
      expect(allLessons.memories.length).toBe(2);
    });
  });

  describe('Error Recovery Flow', () => {
    it('should help debug issues using stored error resolutions', async () => {
      // Store previous error resolution
      await workflow.simulateError(
        'ECONNREFUSED',
        'Database connection refused',
        'Start Docker container: docker compose up -d',
        'debugger'
      );

      // Later, when same error occurs, search finds it
      const errorSearch = await heimdall.queryMemories('ECONNREFUSED', {
        memoryType: 'error',
      });

      expect(errorSearch.memories.length).toBe(1);
      expect(errorSearch.memories[0].content).toContain('docker compose');
    });

    it('should accumulate multiple solutions for same error type', async () => {
      // Multiple resolutions for TypeScript errors
      await workflow.simulateError(
        'TypeScript',
        'Type "string" is not assignable to type "number"',
        'Fixed by using parseInt()',
        'debugger'
      );

      await workflow.simulateError(
        'TypeScript',
        'Object is possibly undefined',
        'Added optional chaining operator',
        'debugger'
      );

      await workflow.simulateError(
        'TypeScript',
        'Argument of type "X" is not assignable',
        'Fixed type definition in interface',
        'debugger'
      );

      const tsErrors = await heimdall.queryMemories('', {
        tags: ['error:TypeScript'],
      });

      expect(tsErrors.memories.length).toBe(3);
    });
  });

  describe('Session Context Loading', () => {
    it('should restore relevant context at session start', async () => {
      const projectName = 'context-test';

      // Previous session work
      await workflow.simulateProjectInit(projectName);
      await workflow.simulatePRDParsing(projectName, ['Feature A', 'Feature B']);

      await heimdall.storeMemory(
        'Project uses React 18 with Server Components',
        [`project:${projectName}`, 'tech:react'],
        'context'
      );

      await heimdall.storeMemory(
        'Decision: Use Prisma for database access',
        [`project:${projectName}`, 'tech:prisma'],
        'decision'
      );

      await heimdall.storeMemory(
        'Lesson: Always use error boundaries for async components',
        [`project:${projectName}`],
        'lesson'
      );

      // New session starts - load context
      const projectContext = await heimdall.queryMemories('', {
        tags: [`project:${projectName}`],
        memoryType: 'context',
        limit: 5,
      });

      const projectDecisions = await heimdall.queryMemories('', {
        tags: [`project:${projectName}`],
        memoryType: 'decision',
        limit: 5,
      });

      const recentLessons = await heimdall.queryMemories('', {
        tags: [`project:${projectName}`],
        memoryType: 'lesson',
        limit: 5,
      });

      expect(projectContext.memories.length).toBeGreaterThan(0);
      expect(projectDecisions.memories.length).toBe(1);
      expect(recentLessons.memories.length).toBe(1);
    });
  });

  describe('Performance with Large Memory Sets', () => {
    it('should handle 1K memories efficiently', async () => {
      const startTime = Date.now();

      // Create 1000 memories
      for (let i = 0; i < 1000; i++) {
        await heimdall.storeMemory(
          `Memory ${i}: Test content for performance testing`,
          [`batch:1k`, `index:${i}`],
          i % 3 === 0 ? 'lesson' : i % 3 === 1 ? 'pattern' : 'context'
        );
      }

      const insertTime = Date.now() - startTime;

      // Query should be fast
      const queryStart = Date.now();
      const results = await heimdall.queryMemories('Test content', { limit: 10 });
      const queryTime = Date.now() - queryStart;

      expect(results.memories.length).toBe(10);
      expect(queryTime).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should filter efficiently with tags', async () => {
      // Create memories with different tags
      for (let i = 0; i < 500; i++) {
        await heimdall.storeMemory(
          `Project A memory ${i}`,
          ['project:a', `index:${i}`],
          'context'
        );
        await heimdall.storeMemory(
          `Project B memory ${i}`,
          ['project:b', `index:${i}`],
          'context'
        );
      }

      const queryStart = Date.now();
      const results = await heimdall.queryMemories('', {
        tags: ['project:a'],
        limit: 20,
      });
      const queryTime = Date.now() - queryStart;

      expect(results.memories.length).toBe(20);
      results.memories.forEach((m) => {
        expect(m.tags).toContain('project:a');
      });
      expect(queryTime).toBeLessThan(500);
    });
  });

  describe('Memory Management', () => {
    it('should retrieve statistics correctly', async () => {
      await heimdall.storeMemory('Lesson 1', ['project:a'], 'lesson');
      await heimdall.storeMemory('Lesson 2', ['project:a'], 'lesson');
      await heimdall.storeMemory('Pattern 1', ['project:a'], 'pattern');
      await heimdall.storeMemory('Error 1', ['project:b'], 'error');
      await heimdall.storeMemory('Context 1', ['project:b'], 'context');

      const stats = await heimdall.getStats();

      expect(stats.totalMemories).toBe(5);
      expect(stats.byType['lesson']).toBe(2);
      expect(stats.byType['pattern']).toBe(1);
      expect(stats.byType['error']).toBe(1);
      expect(stats.byType['context']).toBe(1);
      expect(stats.byProject['a']).toBe(3);
      expect(stats.byProject['b']).toBe(2);
    });

    it('should delete memories correctly', async () => {
      const result1 = await heimdall.storeMemory('To keep', [], 'context');
      const result2 = await heimdall.storeMemory('To delete', [], 'context');

      let stats = await heimdall.getStats();
      expect(stats.totalMemories).toBe(2);

      await heimdall.deleteMemory(result2.id);

      stats = await heimdall.getStats();
      expect(stats.totalMemories).toBe(1);
    });
  });
});
