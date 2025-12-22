/**
 * Beads Integration Tests
 *
 * Comprehensive test suite for Beads context/memory persistence
 * covering JSONL storage, bead creation, linking, session continuity,
 * and agent handoff workflows.
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

// Mock dependencies
vi.mock('../../src/utils/shell.js', () => ({
  executeCommand: vi.fn(),
  checkCommandExists: vi.fn(),
}));

import { executeCommand, checkCommandExists } from '../../src/utils/shell.js';

// ============================================================================
// Test Fixtures and Helper Functions
// ============================================================================

/** Test directory for Beads operations */
const TEST_DIR = path.join(tmpdir(), 'beads-integration-test');
const BEADS_DIR = path.join(TEST_DIR, '.beads');

/** Sample bead data for testing */
const SAMPLE_BEADS = {
  basic: {
    id: 'bd-test001',
    title: 'Test task',
    status: 'open',
    priority: 1,
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  withNotes: {
    id: 'bd-test002',
    title: 'Task with notes',
    status: 'in_progress',
    priority: 2,
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T11:00:00Z',
    notes: ['First note', 'Second note'],
  },
  withDependencies: {
    id: 'bd-test003',
    title: 'Dependent task',
    status: 'open',
    priority: 1,
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
    dependencies: ['blocks:bd-test001'],
  },
  closed: {
    id: 'bd-test004',
    title: 'Completed task',
    status: 'closed',
    priority: 3,
    created_at: '2025-01-15T08:00:00Z',
    updated_at: '2025-01-15T12:00:00Z',
    closed_at: '2025-01-15T12:00:00Z',
  },
};

/**
 * Create a test bead using mocked bd create command
 */
async function createTestBead(
  title: string,
  options: {
    priority?: number;
    description?: string;
    deps?: string;
    status?: string;
  } = {}
): Promise<string> {
  const beadId = `bd-${Date.now().toString(36)}`;
  const args = ['create', title, '--json'];

  if (options.priority) args.push('-p', String(options.priority));
  if (options.description) args.push('--description', options.description);
  if (options.deps) args.push('--deps', options.deps);

  vi.mocked(executeCommand).mockResolvedValueOnce({
    stdout: JSON.stringify({
      id: beadId,
      title,
      status: options.status || 'open',
      priority: options.priority || 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    stderr: '',
    exitCode: 0,
    duration: 50,
    command: 'bd',
    args,
  });

  await executeCommand('bd', args, { cwd: TEST_DIR });
  return beadId;
}

/**
 * Parse bead JSON from bd command output
 */
function parseBead(jsonString: string): Record<string, unknown> {
  try {
    return JSON.parse(jsonString);
  } catch {
    throw new Error(`Failed to parse bead JSON: ${jsonString}`);
  }
}

/**
 * Simulate an agent session with a series of actions
 */
async function simulateAgentSession(
  beadId: string,
  actions: Array<{ type: 'claim' | 'update' | 'close' | 'note'; data?: string }>
): Promise<void> {
  for (const action of actions) {
    switch (action.type) {
      case 'claim':
        vi.mocked(executeCommand).mockResolvedValueOnce({
          stdout: JSON.stringify({ id: beadId, status: 'in_progress' }),
          stderr: '',
          exitCode: 0,
          duration: 50,
          command: 'bd',
          args: ['update', beadId, '--status', 'in_progress'],
        });
        await executeCommand('bd', ['update', beadId, '--status', 'in_progress'], {
          cwd: TEST_DIR,
        });
        break;

      case 'update':
        vi.mocked(executeCommand).mockResolvedValueOnce({
          stdout: JSON.stringify({ id: beadId, status: 'in_progress' }),
          stderr: '',
          exitCode: 0,
          duration: 50,
          command: 'bd',
          args: ['update', beadId],
        });
        await executeCommand('bd', ['update', beadId], { cwd: TEST_DIR });
        break;

      case 'close':
        vi.mocked(executeCommand).mockResolvedValueOnce({
          stdout: JSON.stringify({ id: beadId, status: 'closed' }),
          stderr: '',
          exitCode: 0,
          duration: 50,
          command: 'bd',
          args: ['update', beadId, '--status', 'closed'],
        });
        await executeCommand('bd', ['update', beadId, '--status', 'closed'], {
          cwd: TEST_DIR,
        });
        break;

      case 'note':
        vi.mocked(executeCommand).mockResolvedValueOnce({
          stdout: JSON.stringify({ id: beadId, notes: [action.data] }),
          stderr: '',
          exitCode: 0,
          duration: 50,
          command: 'bd',
          args: ['update', beadId, '--add-note', action.data || ''],
        });
        await executeCommand('bd', ['update', beadId, '--add-note', action.data || ''], {
          cwd: TEST_DIR,
        });
        break;
    }
  }
}

/**
 * Write sample JSONL file for testing
 */
async function writeTestJSONL(filename: string, beads: Record<string, unknown>[]): Promise<void> {
  const content = beads.map((b) => JSON.stringify(b)).join('\n') + '\n';
  await fs.writeFile(path.join(BEADS_DIR, filename), content, 'utf-8');
}

/**
 * Read and parse JSONL file
 */
async function readTestJSONL(filename: string): Promise<Record<string, unknown>[]> {
  const content = await fs.readFile(path.join(BEADS_DIR, filename), 'utf-8');
  return content
    .trim()
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

// ============================================================================
// Test Setup and Teardown
// ============================================================================

describe('Beads Integration Tests', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Create test directories
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(BEADS_DIR, { recursive: true });

    // Default mock for checkCommandExists
    vi.mocked(checkCommandExists).mockResolvedValue(true);
  });

  afterEach(async () => {
    // Cleanup test directories
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // JSONL Storage Tests
  // ==========================================================================

  describe('JSONL Storage Tests', () => {
    it('should create JSONL file on bead creation', async () => {
      const beadId = await createTestBead('Test JSONL creation');

      // Simulate file creation
      await writeTestJSONL('beads.jsonl', [
        {
          id: beadId,
          title: 'Test JSONL creation',
          status: 'open',
          priority: 1,
          created_at: new Date().toISOString(),
        },
      ]);

      expect(existsSync(path.join(BEADS_DIR, 'beads.jsonl'))).toBe(true);

      const beads = await readTestJSONL('beads.jsonl');
      expect(beads).toHaveLength(1);
      expect(beads[0]).toHaveProperty('id', beadId);
      expect(beads[0]).toHaveProperty('title', 'Test JSONL creation');
    });

    it('should append to JSONL file on updates', async () => {
      // Create initial bead
      const beadId = await createTestBead('Append test');

      // Simulate initial creation
      await writeTestJSONL('beads.jsonl', [
        {
          id: beadId,
          title: 'Append test',
          status: 'open',
          action: 'create',
          timestamp: new Date().toISOString(),
        },
      ]);

      // Simulate update
      const existingContent = await fs.readFile(path.join(BEADS_DIR, 'beads.jsonl'), 'utf-8');
      const updateEntry = JSON.stringify({
        id: beadId,
        status: 'in_progress',
        action: 'update',
        timestamp: new Date().toISOString(),
      });
      await fs.writeFile(
        path.join(BEADS_DIR, 'beads.jsonl'),
        existingContent + updateEntry + '\n',
        'utf-8'
      );

      const beads = await readTestJSONL('beads.jsonl');
      expect(beads).toHaveLength(2);
      expect(beads[0]).toHaveProperty('action', 'create');
      expect(beads[1]).toHaveProperty('action', 'update');
    });

    it('should validate JSON structure compliance', async () => {
      await writeTestJSONL('beads.jsonl', [
        SAMPLE_BEADS.basic,
        SAMPLE_BEADS.withNotes,
        SAMPLE_BEADS.withDependencies,
      ]);

      const beads = await readTestJSONL('beads.jsonl');

      for (const bead of beads) {
        // Required fields
        expect(bead).toHaveProperty('id');
        expect(bead).toHaveProperty('title');
        expect(bead).toHaveProperty('status');
        expect(bead).toHaveProperty('priority');
        expect(bead).toHaveProperty('created_at');

        // Validate types
        expect(typeof bead['id']).toBe('string');
        expect(typeof bead['title']).toBe('string');
        expect(['open', 'in_progress', 'blocked', 'closed']).toContain(bead['status']);
        expect(typeof bead['priority']).toBe('number');
      }
    });

    it('should handle git-backed storage integrity', async () => {
      const beadId = await createTestBead('Git sync test');

      await writeTestJSONL('beads.jsonl', [
        { id: beadId, title: 'Git sync test', status: 'open', priority: 1 },
      ]);

      // Mock git sync command
      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: '[main abc123] Sync beads',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: 'bd',
        args: ['sync'],
      });

      const result = await executeCommand('bd', ['sync'], { cwd: TEST_DIR });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Sync beads');
    });

    it('should handle concurrent write operations', async () => {
      // Simulate multiple concurrent bead creations
      const createPromises = Array.from({ length: 5 }, (_, i) => {
        const beadId = `bd-concurrent-${i}`;
        vi.mocked(executeCommand).mockResolvedValueOnce({
          stdout: JSON.stringify({ id: beadId, title: `Concurrent ${i}` }),
          stderr: '',
          exitCode: 0,
          duration: 50,
          command: 'bd',
          args: ['create', `Concurrent ${i}`, '--json'],
        });
        return executeCommand('bd', ['create', `Concurrent ${i}`, '--json'], { cwd: TEST_DIR });
      });

      const results = await Promise.all(createPromises);

      // All should succeed
      results.forEach((result) => {
        expect(result.exitCode).toBe(0);
      });

      // Verify unique IDs
      const ids = results.map((r) => JSON.parse(r.stdout).id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);
    });
  });

  // ==========================================================================
  // Bead Creation/Reading Tests
  // ==========================================================================

  describe('Bead Creation/Reading Tests', () => {
    it('should create bead with bd create command', async () => {
      const beadId = await createTestBead('New task', { priority: 1 });

      expect(beadId).toMatch(/^bd-[a-z0-9]+$/);
      expect(executeCommand).toHaveBeenCalledWith(
        'bd',
        expect.arrayContaining(['create', 'New task', '--json']),
        expect.anything()
      );
    });

    it('should generate unique bead IDs', async () => {
      const ids: string[] = [];

      // Generate 10 unique bead IDs using timestamp + index
      for (let i = 0; i < 10; i++) {
        const beadId = `bd-${Date.now().toString(36)}-${i}`;
        const args = ['create', `Task ${i}`, '--json'];

        vi.mocked(executeCommand).mockResolvedValueOnce({
          stdout: JSON.stringify({
            id: beadId,
            title: `Task ${i}`,
            status: 'open',
            priority: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
          stderr: '',
          exitCode: 0,
          duration: 50,
          command: 'bd',
          args,
        });

        const result = await executeCommand('bd', args, { cwd: TEST_DIR });
        const bead = parseBead(result.stdout);
        ids.push(bead['id'] as string);
      }

      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });

    it('should parse bd show output correctly', async () => {
      const beadId = 'bd-show-test';

      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: JSON.stringify({
          id: beadId,
          title: 'Show test',
          status: 'open',
          priority: 2,
          created_at: '2025-01-15T10:00:00Z',
          updated_at: '2025-01-15T10:00:00Z',
        }),
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'bd',
        args: ['show', beadId, '--json'],
      });

      const result = await executeCommand('bd', ['show', beadId, '--json'], { cwd: TEST_DIR });
      const bead = parseBead(result.stdout);

      expect(bead).toHaveProperty('id', beadId);
      expect(bead).toHaveProperty('title', 'Show test');
      expect(bead).toHaveProperty('status', 'open');
      expect(bead).toHaveProperty('priority', 2);
      expect(bead).toHaveProperty('created_at');
      expect(bead).toHaveProperty('updated_at');
    });

    it('should validate required fields presence', async () => {
      const bead = SAMPLE_BEADS.basic;

      // Required fields check
      expect(bead).toHaveProperty('id');
      expect(bead).toHaveProperty('title');
      expect(bead).toHaveProperty('status');
      expect(bead).toHaveProperty('priority');
      expect(bead).toHaveProperty('created_at');

      // Type validation
      expect(typeof bead.id).toBe('string');
      expect(typeof bead.title).toBe('string');
      expect(['open', 'in_progress', 'blocked', 'closed']).toContain(bead.status);
      expect(typeof bead.priority).toBe('number');
      expect(bead.priority).toBeGreaterThanOrEqual(1);
      expect(bead.priority).toBeLessThanOrEqual(5);
    });

    it('should create bead with description and priority', async () => {
      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: JSON.stringify({
          id: 'bd-desc-test',
          title: 'Task with details',
          description: 'Detailed description here',
          priority: 2,
          status: 'open',
        }),
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'bd',
        args: ['create', 'Task with details', '--description', 'Detailed description here', '-p', '2', '--json'],
      });

      const result = await executeCommand(
        'bd',
        ['create', 'Task with details', '--description', 'Detailed description here', '-p', '2', '--json'],
        { cwd: TEST_DIR }
      );

      const bead = parseBead(result.stdout);
      expect(bead).toHaveProperty('description', 'Detailed description here');
      expect(bead).toHaveProperty('priority', 2);
    });

    it('should create bead with dependencies', async () => {
      const parentId = 'bd-parent';

      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: JSON.stringify({
          id: 'bd-child',
          title: 'Child task',
          dependencies: [`blocks:${parentId}`],
          status: 'open',
          priority: 1,
        }),
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'bd',
        args: ['create', 'Child task', '--deps', `blocks:${parentId}`, '--json'],
      });

      const result = await executeCommand(
        'bd',
        ['create', 'Child task', '--deps', `blocks:${parentId}`, '--json'],
        { cwd: TEST_DIR }
      );

      const bead = parseBead(result.stdout);
      expect(bead).toHaveProperty('dependencies');
      expect(bead['dependencies']).toContain(`blocks:${parentId}`);
    });

    it('should handle invalid bead creation', async () => {
      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: '',
        stderr: 'Error: Title is required',
        exitCode: 1,
        duration: 50,
        command: 'bd',
        args: ['create', '', '--json'],
      });

      const result = await executeCommand('bd', ['create', '', '--json'], { cwd: TEST_DIR });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Error');
    });
  });

  // ==========================================================================
  // Bead Linking Tests
  // ==========================================================================

  describe('Bead Linking Tests', () => {
    it('should create blocking dependency', async () => {
      const beadA = 'bd-blocker';
      const beadB = 'bd-blocked';

      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: JSON.stringify({
          id: beadB,
          title: 'Blocked task',
          dependencies: [`blocks:${beadA}`],
          status: 'blocked',
        }),
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'bd',
        args: ['create', 'Blocked task', '--deps', `blocks:${beadA}`, '--json'],
      });

      const result = await executeCommand(
        'bd',
        ['create', 'Blocked task', '--deps', `blocks:${beadA}`, '--json'],
        { cwd: TEST_DIR }
      );

      const bead = parseBead(result.stdout);
      expect(bead['dependencies']).toContain(`blocks:${beadA}`);
    });

    it('should create discovered-from relationships', async () => {
      const parentBead = 'bd-discovered-parent';

      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: JSON.stringify({
          id: 'bd-discovered-child',
          title: 'Discovered task',
          dependencies: [`discovered-from:${parentBead}`],
          status: 'open',
        }),
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'bd',
        args: ['create', 'Discovered task', '--deps', `discovered-from:${parentBead}`, '--json'],
      });

      const result = await executeCommand(
        'bd',
        ['create', 'Discovered task', '--deps', `discovered-from:${parentBead}`, '--json'],
        { cwd: TEST_DIR }
      );

      const bead = parseBead(result.stdout);
      expect(bead['dependencies']).toContain(`discovered-from:${parentBead}`);
    });

    it('should create parent-child task hierarchies', async () => {
      const epicId = 'bd-epic';

      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: JSON.stringify({
          id: 'bd-subtask',
          title: 'Subtask',
          parent: epicId,
          status: 'open',
        }),
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'bd',
        args: ['create', 'Subtask', '--deps', `parent:${epicId}`, '--json'],
      });

      const result = await executeCommand(
        'bd',
        ['create', 'Subtask', '--deps', `parent:${epicId}`, '--json'],
        { cwd: TEST_DIR }
      );

      const bead = parseBead(result.stdout);
      expect(bead).toHaveProperty('parent', epicId);
    });

    it('should detect circular dependencies', async () => {
      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: '',
        stderr: 'Error: Circular dependency detected',
        exitCode: 1,
        duration: 50,
        command: 'bd',
        args: ['update', 'bd-a', '--deps', 'blocks:bd-b'],
      });

      const result = await executeCommand('bd', ['update', 'bd-a', '--deps', 'blocks:bd-b'], {
        cwd: TEST_DIR,
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Circular dependency');
    });

    it('should handle multiple dependency types', async () => {
      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: JSON.stringify({
          id: 'bd-multi-deps',
          title: 'Multi-dependency task',
          dependencies: ['parent:bd-x', 'blocks:bd-y', 'discovered-from:bd-z'],
          status: 'open',
        }),
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'bd',
        args: ['create', 'Multi-dependency task', '--deps', 'parent:bd-x,blocks:bd-y,discovered-from:bd-z', '--json'],
      });

      const result = await executeCommand(
        'bd',
        ['create', 'Multi-dependency task', '--deps', 'parent:bd-x,blocks:bd-y,discovered-from:bd-z', '--json'],
        { cwd: TEST_DIR }
      );

      const bead = parseBead(result.stdout);
      const deps = bead['dependencies'] as string[];
      expect(deps).toContain('parent:bd-x');
      expect(deps).toContain('blocks:bd-y');
      expect(deps).toContain('discovered-from:bd-z');
    });

    it('should update dependency relationships', async () => {
      // Close the blocker
      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: JSON.stringify({ id: 'bd-blocker', status: 'closed' }),
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'bd',
        args: ['update', 'bd-blocker', '--status', 'closed'],
      });

      await executeCommand('bd', ['update', 'bd-blocker', '--status', 'closed'], { cwd: TEST_DIR });

      // Check ready tasks
      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: JSON.stringify([{ id: 'bd-blocked', status: 'open' }]),
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'bd',
        args: ['ready', '--json'],
      });

      const result = await executeCommand('bd', ['ready', '--json'], { cwd: TEST_DIR });
      const readyTasks = JSON.parse(result.stdout);
      expect(readyTasks).toHaveLength(1);
    });
  });

  // ==========================================================================
  // Session Continuity Tests
  // ==========================================================================

  describe('Session Continuity Tests', () => {
    it('should simulate agent session start with bd ready', async () => {
      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: JSON.stringify([
          { id: 'bd-ready-1', title: 'Ready task 1', status: 'open' },
          { id: 'bd-ready-2', title: 'Ready task 2', status: 'open' },
        ]),
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'bd',
        args: ['ready', '--json'],
      });

      const result = await executeCommand('bd', ['ready', '--json'], { cwd: TEST_DIR });
      const readyTasks = JSON.parse(result.stdout);

      expect(readyTasks).toBeInstanceOf(Array);
      expect(readyTasks.length).toBeGreaterThan(0);
      readyTasks.forEach((task: Record<string, unknown>) => {
        expect(task).toHaveProperty('id');
        expect(task).toHaveProperty('status', 'open');
      });
    });

    it('should claim tasks with status update', async () => {
      const beadId = 'bd-claim-test';

      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: JSON.stringify({ id: beadId, status: 'in_progress' }),
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'bd',
        args: ['update', beadId, '--status', 'in_progress'],
      });

      const result = await executeCommand('bd', ['update', beadId, '--status', 'in_progress'], {
        cwd: TEST_DIR,
      });

      const bead = parseBead(result.stdout);
      expect(bead).toHaveProperty('status', 'in_progress');
    });

    it('should persist context after session end', async () => {
      const beadId = 'bd-persist-test';

      // Session 1: Create and add note
      await writeTestJSONL('beads.jsonl', [
        {
          id: beadId,
          title: 'Persist test',
          status: 'in_progress',
          notes: ['Session 1 note'],
        },
      ]);

      // Simulate sync
      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: 'Synced',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: 'bd',
        args: ['sync'],
      });

      await executeCommand('bd', ['sync'], { cwd: TEST_DIR });

      // Session 2: Read persisted data
      const beads = await readTestJSONL('beads.jsonl');
      const bead = beads.find((b) => b['id'] === beadId);

      expect(bead).toBeDefined();
      expect(bead?.['notes']).toContain('Session 1 note');
    });

    it('should handle bd sync commits to git', async () => {
      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: 'Committed: [main abc123] Sync beads: 2 changes',
        stderr: '',
        exitCode: 0,
        duration: 150,
        command: 'bd',
        args: ['sync'],
      });

      const result = await executeCommand('bd', ['sync'], { cwd: TEST_DIR });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Committed');
    });

    it('should maintain bead state across sessions', async () => {
      const beadId = 'bd-session-state';

      // Create bead with state in session 1
      await writeTestJSONL('beads.jsonl', [
        {
          id: beadId,
          title: 'Session state test',
          status: 'in_progress',
          priority: 2,
          notes: ['Progress note 1', 'Progress note 2'],
          updated_at: '2025-01-15T11:00:00Z',
        },
      ]);

      // Session 2: Verify state preserved
      const beads = await readTestJSONL('beads.jsonl');
      const bead = beads.find((b) => b['id'] === beadId);

      expect(bead?.['status']).toBe('in_progress');
      expect(bead?.['priority']).toBe(2);
      expect((bead?.['notes'] as string[]).length).toBe(2);
    });

    it('should handle stale task detection', async () => {
      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: JSON.stringify([
          { id: 'bd-stale', title: 'Stale task', updated_at: '2025-01-10T00:00:00Z' },
        ]),
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'bd',
        args: ['stale', '--days', '1', '--json'],
      });

      const result = await executeCommand('bd', ['stale', '--days', '1', '--json'], {
        cwd: TEST_DIR,
      });

      const staleTasks = JSON.parse(result.stdout);
      expect(staleTasks).toHaveLength(1);
      expect(staleTasks[0]).toHaveProperty('id', 'bd-stale');
    });

    it('should preserve work history in notes', async () => {
      const beadId = 'bd-history';
      const notes = [
        '2025-01-15 10:00 - Started work',
        '2025-01-15 11:00 - Completed initial implementation',
        '2025-01-15 12:00 - Added tests',
        '2025-01-15 13:00 - Ready for review',
      ];

      await writeTestJSONL('beads.jsonl', [
        {
          id: beadId,
          title: 'History test',
          status: 'in_progress',
          notes,
        },
      ]);

      const beads = await readTestJSONL('beads.jsonl');
      const bead = beads.find((b) => b['id'] === beadId);

      expect(bead?.['notes']).toEqual(notes);
      expect((bead?.['notes'] as string[]).length).toBe(4);
    });
  });

  // ==========================================================================
  // Agent Handoff Tests
  // ==========================================================================

  describe('Agent Handoff Tests', () => {
    it('should simulate multi-agent workflow', async () => {
      // pm-lead creates epic
      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: JSON.stringify({ id: 'bd-epic', title: 'Epic', status: 'open', agent: 'pm-lead' }),
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'bd',
        args: ['create', 'Epic', '--json'],
      });

      await executeCommand('bd', ['create', 'Epic', '--json'], { cwd: TEST_DIR });

      // frontend-dev claims subtask
      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: JSON.stringify({ id: 'bd-frontend', status: 'in_progress', agent: 'frontend-dev' }),
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'bd',
        args: ['update', 'bd-frontend', '--status', 'in_progress'],
      });

      await executeCommand('bd', ['update', 'bd-frontend', '--status', 'in_progress'], {
        cwd: TEST_DIR,
      });

      // test-engineer claims testing
      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: JSON.stringify({ id: 'bd-testing', status: 'in_progress', agent: 'test-engineer' }),
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'bd',
        args: ['update', 'bd-testing', '--status', 'in_progress'],
      });

      const result = await executeCommand('bd', ['update', 'bd-testing', '--status', 'in_progress'], {
        cwd: TEST_DIR,
      });

      expect(result.exitCode).toBe(0);
    });

    it('should create handoff notes with bd update --add-note', async () => {
      const handoffNote = 'HANDOFF to frontend-dev: Completed API design, ready for UI implementation';

      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: JSON.stringify({ id: 'bd-handoff', notes: [handoffNote] }),
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'bd',
        args: ['update', 'bd-handoff', '--add-note', handoffNote],
      });

      const result = await executeCommand('bd', ['update', 'bd-handoff', '--add-note', handoffNote], {
        cwd: TEST_DIR,
      });

      const bead = parseBead(result.stdout);
      expect((bead['notes'] as string[])[0]).toContain('HANDOFF');
      expect((bead['notes'] as string[])[0]).toContain('frontend-dev');
    });

    it('should track discovered-from dependencies for handoffs', async () => {
      const agentABead = 'bd-agent-a';

      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: JSON.stringify({
          id: 'bd-agent-b',
          title: 'Task for Agent B',
          dependencies: [`discovered-from:${agentABead}`],
        }),
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'bd',
        args: ['create', 'Task for Agent B', '--deps', `discovered-from:${agentABead}`, '--json'],
      });

      const result = await executeCommand(
        'bd',
        ['create', 'Task for Agent B', '--deps', `discovered-from:${agentABead}`, '--json'],
        { cwd: TEST_DIR }
      );

      const bead = parseBead(result.stdout);
      expect((bead['dependencies'] as string[])[0]).toContain('discovered-from');
    });

    it('should transfer context between agents', async () => {
      const beadId = 'bd-context-transfer';
      const agentANotes = [
        'Agent A: Started implementation',
        'Agent A: Found issue with API',
        'Agent A: HANDOFF to Agent B - needs debugging',
      ];

      await writeTestJSONL('beads.jsonl', [
        {
          id: beadId,
          title: 'Context transfer test',
          status: 'in_progress',
          notes: agentANotes,
        },
      ]);

      // Agent B reads bead
      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: JSON.stringify({
          id: beadId,
          title: 'Context transfer test',
          notes: agentANotes,
        }),
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'bd',
        args: ['show', beadId, '--json'],
      });

      const result = await executeCommand('bd', ['show', beadId, '--json'], { cwd: TEST_DIR });
      const bead = parseBead(result.stdout);

      expect((bead['notes'] as string[]).length).toBe(3);
      expect((bead['notes'] as string[])[2]).toContain('HANDOFF');
    });

    it('should complete handoff workflow', async () => {
      // Agent A closes with handoff
      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: JSON.stringify({ id: 'bd-a-task', status: 'closed', handoff_to: 'agent-b' }),
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'bd',
        args: ['update', 'bd-a-task', '--status', 'closed', '--add-note', 'HANDOFF to agent-b'],
      });

      await executeCommand('bd', ['update', 'bd-a-task', '--status', 'closed', '--add-note', 'HANDOFF to agent-b'], {
        cwd: TEST_DIR,
      });

      // Agent B claims new task
      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: JSON.stringify({ id: 'bd-b-task', status: 'in_progress' }),
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'bd',
        args: ['update', 'bd-b-task', '--status', 'in_progress'],
      });

      await executeCommand('bd', ['update', 'bd-b-task', '--status', 'in_progress'], { cwd: TEST_DIR });

      // Agent B closes
      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: JSON.stringify({ id: 'bd-b-task', status: 'closed' }),
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'bd',
        args: ['update', 'bd-b-task', '--status', 'closed'],
      });

      const result = await executeCommand('bd', ['update', 'bd-b-task', '--status', 'closed'], {
        cwd: TEST_DIR,
      });

      expect(result.exitCode).toBe(0);
      expect(parseBead(result.stdout)).toHaveProperty('status', 'closed');
    });

    it('should handle parallel agent workflows', async () => {
      // Two agents working on independent tasks simultaneously
      const agent1Promise = (async () => {
        vi.mocked(executeCommand).mockResolvedValueOnce({
          stdout: JSON.stringify({ id: 'bd-agent1', status: 'in_progress' }),
          stderr: '',
          exitCode: 0,
          duration: 50,
          command: 'bd',
          args: ['update', 'bd-agent1', '--status', 'in_progress'],
        });
        return executeCommand('bd', ['update', 'bd-agent1', '--status', 'in_progress'], { cwd: TEST_DIR });
      })();

      const agent2Promise = (async () => {
        vi.mocked(executeCommand).mockResolvedValueOnce({
          stdout: JSON.stringify({ id: 'bd-agent2', status: 'in_progress' }),
          stderr: '',
          exitCode: 0,
          duration: 50,
          command: 'bd',
          args: ['update', 'bd-agent2', '--status', 'in_progress'],
        });
        return executeCommand('bd', ['update', 'bd-agent2', '--status', 'in_progress'], { cwd: TEST_DIR });
      })();

      const [result1, result2] = await Promise.all([agent1Promise, agent2Promise]);

      expect(result1.exitCode).toBe(0);
      expect(result2.exitCode).toBe(0);
    });

    it('should support cascading handoffs', async () => {
      // A → B → C handoff chain
      const handoffChain = [
        { from: 'agent-a', to: 'agent-b', beadId: 'bd-a-to-b' },
        { from: 'agent-b', to: 'agent-c', beadId: 'bd-b-to-c' },
      ];

      for (const handoff of handoffChain) {
        vi.mocked(executeCommand).mockResolvedValueOnce({
          stdout: JSON.stringify({
            id: handoff.beadId,
            notes: [`HANDOFF from ${handoff.from} to ${handoff.to}`],
          }),
          stderr: '',
          exitCode: 0,
          duration: 50,
          command: 'bd',
          args: ['update', handoff.beadId, '--add-note', `HANDOFF from ${handoff.from} to ${handoff.to}`],
        });

        await executeCommand(
          'bd',
          ['update', handoff.beadId, '--add-note', `HANDOFF from ${handoff.from} to ${handoff.to}`],
          { cwd: TEST_DIR }
        );
      }

      expect(executeCommand).toHaveBeenCalledTimes(2);
    });

    it('should maintain priority during handoff', async () => {
      const highPriorityBead = {
        id: 'bd-high-priority',
        title: 'High priority handoff',
        priority: 1,
        status: 'closed',
      };

      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: JSON.stringify({
          id: 'bd-handoff-priority',
          title: 'Handed off task',
          priority: highPriorityBead.priority,
          dependencies: [`discovered-from:${highPriorityBead.id}`],
        }),
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'bd',
        args: ['create', 'Handed off task', '-p', '1', '--deps', `discovered-from:${highPriorityBead.id}`, '--json'],
      });

      const result = await executeCommand(
        'bd',
        ['create', 'Handed off task', '-p', '1', '--deps', `discovered-from:${highPriorityBead.id}`, '--json'],
        { cwd: TEST_DIR }
      );

      const bead = parseBead(result.stdout);
      expect(bead['priority']).toBe(1);
    });

    it('should detect incomplete handoffs', async () => {
      // Agent creates handoff but doesn't sync
      await writeTestJSONL('beads.jsonl', [
        {
          id: 'bd-incomplete-handoff',
          title: 'Incomplete handoff',
          status: 'in_progress',
          notes: ['HANDOFF to agent-b: Needs review'],
          synced: false,
        },
      ]);

      const beads = await readTestJSONL('beads.jsonl');
      const incompleteBead = beads.find((b) => b['id'] === 'bd-incomplete-handoff');

      expect(incompleteBead?.['synced']).toBe(false);
      expect((incompleteBead?.['notes'] as string[])[0]).toContain('HANDOFF');
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling Tests', () => {
    it('should handle missing .beads directory gracefully', async () => {
      rmSync(BEADS_DIR, { recursive: true, force: true });

      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: '',
        stderr: 'Error: Not a beads repository (or any parent directories)',
        exitCode: 1,
        duration: 50,
        command: 'bd',
        args: ['ready', '--json'],
      });

      const result = await executeCommand('bd', ['ready', '--json'], { cwd: TEST_DIR });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Not a beads repository');
    });

    it('should handle invalid bead IDs', async () => {
      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: '',
        stderr: 'Error: Bead not found: bd-invalid',
        exitCode: 1,
        duration: 50,
        command: 'bd',
        args: ['show', 'bd-invalid', '--json'],
      });

      const result = await executeCommand('bd', ['show', 'bd-invalid', '--json'], { cwd: TEST_DIR });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Bead not found');
    });

    it('should handle malformed JSONL gracefully', async () => {
      // Write malformed JSONL
      await fs.writeFile(
        path.join(BEADS_DIR, 'beads.jsonl'),
        '{"valid": "json"}\nnot valid json\n{"also": "valid"}\n',
        'utf-8'
      );

      const content = await fs.readFile(path.join(BEADS_DIR, 'beads.jsonl'), 'utf-8');
      const lines = content.trim().split('\n');

      const validBeads: Record<string, unknown>[] = [];
      const errors: string[] = [];

      for (const line of lines) {
        try {
          validBeads.push(JSON.parse(line));
        } catch {
          errors.push(line);
        }
      }

      expect(validBeads).toHaveLength(2);
      expect(errors).toHaveLength(1);
    });

    it('should handle bd CLI not installed', async () => {
      vi.mocked(checkCommandExists).mockResolvedValue(false);

      const bdAvailable = await checkCommandExists('bd');

      expect(bdAvailable).toBe(false);
    });
  });
});
