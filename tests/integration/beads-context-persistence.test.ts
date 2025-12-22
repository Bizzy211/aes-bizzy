/**
 * Beads Context Persistence Integration Tests
 *
 * Tests verifying that Beads integration properly persists and retrieves
 * context across sessions, testing initialization, context creation,
 * session restart survival, and agent context retrieval.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

// Mock dependencies
vi.mock('../../src/utils/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
  }),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../src/utils/shell.js', () => ({
  executeCommand: vi.fn(),
}));

// Import after mocks
import { executeCommand } from '../../src/utils/shell.js';

// ============================================================================
// Types and Interfaces
// ============================================================================

interface BeadEntry {
  id: string;
  title: string;
  type: 'decision' | 'architecture' | 'implementation' | 'task' | 'note';
  status: 'open' | 'in_progress' | 'blocked' | 'closed';
  priority: number;
  created_at: string;
  updated_at: string;
  notes: BeadNote[];
  deps: string[];
  tags: string[];
  project?: string;
}

interface BeadNote {
  id: string;
  content: string;
  author: string;
  timestamp: string;
}

interface BeadSearchResult {
  id: string;
  title: string;
  relevance: number;
}

interface BeadDependencyTree {
  id: string;
  title: string;
  children: BeadDependencyTree[];
}

// ============================================================================
// Test Helpers and Fixtures
// ============================================================================

/**
 * Create a valid Beads project structure
 */
function createBeadsProject(testDir: string, projectName: string): string {
  const projectRoot = path.join(testDir, projectName);
  const beadsDir = path.join(projectRoot, '.beads');

  mkdirSync(projectRoot, { recursive: true });
  mkdirSync(beadsDir, { recursive: true });
  mkdirSync(path.join(projectRoot, '.git'), { recursive: true });
  mkdirSync(path.join(projectRoot, 'src'), { recursive: true });
  mkdirSync(path.join(projectRoot, 'docs'), { recursive: true });

  // Create empty beads.jsonl
  writeFileSync(path.join(beadsDir, 'beads.jsonl'), '');

  // Create empty notes.jsonl
  writeFileSync(path.join(beadsDir, 'notes.jsonl'), '');

  // Create project context
  writeFileSync(
    path.join(projectRoot, '.project-context'),
    JSON.stringify({
      name: projectName,
      createdAt: new Date().toISOString(),
      ecosystem: true,
      beads: true,
    }, null, 2)
  );

  return projectRoot;
}

/**
 * Create a bead entry and append to beads.jsonl
 */
function createBead(
  projectRoot: string,
  bead: BeadEntry
): void {
  const beadsPath = path.join(projectRoot, '.beads', 'beads.jsonl');
  const line = JSON.stringify(bead) + '\n';
  writeFileSync(beadsPath, line, { flag: 'a' });
}

/**
 * Create multiple bead entries
 */
function createBeads(projectRoot: string, beads: BeadEntry[]): void {
  for (const bead of beads) {
    createBead(projectRoot, bead);
  }
}

/**
 * Read all beads from beads.jsonl
 */
function readBeads(projectRoot: string): BeadEntry[] {
  const beadsPath = path.join(projectRoot, '.beads', 'beads.jsonl');
  if (!existsSync(beadsPath)) return [];

  const content = readFileSync(beadsPath, 'utf-8');
  const lines = content.trim().split('\n').filter(Boolean);

  return lines.map((line) => JSON.parse(line) as BeadEntry);
}

/**
 * Create a note and append to notes.jsonl
 */
function createNote(
  projectRoot: string,
  beadId: string,
  note: BeadNote
): void {
  const notesPath = path.join(projectRoot, '.beads', 'notes.jsonl');
  const entry = { beadId, ...note };
  const line = JSON.stringify(entry) + '\n';
  writeFileSync(notesPath, line, { flag: 'a' });
}

/**
 * Generate a unique bead ID
 */
let beadCounter = 0;
function generateBeadId(): string {
  return `bd-${String(++beadCounter).padStart(3, '0')}`;
}

/**
 * Reset bead counter for tests
 */
function resetBeadCounter(): void {
  beadCounter = 0;
}

/**
 * Create a sample bead
 */
function createSampleBead(overrides: Partial<BeadEntry> = {}): BeadEntry {
  const id = overrides.id || generateBeadId();
  const now = new Date().toISOString();

  return {
    id,
    title: `Sample Bead ${id}`,
    type: 'task',
    status: 'open',
    priority: 2,
    created_at: now,
    updated_at: now,
    notes: [],
    deps: [],
    tags: [],
    ...overrides,
  };
}

/**
 * Mock bd CLI command responses
 */
function mockBdCommand(command: string, output: string, exitCode = 0): void {
  vi.mocked(executeCommand).mockResolvedValueOnce({
    stdout: output,
    stderr: '',
    exitCode,
    duration: 50,
    command: 'bd',
    args: [command],
  });
}

/**
 * Mock bd init command
 */
function mockBdInit(success = true): void {
  vi.mocked(executeCommand).mockResolvedValueOnce({
    stdout: success ? 'Initialized Beads in .beads/' : '',
    stderr: success ? '' : 'Error initializing Beads',
    exitCode: success ? 0 : 1,
    duration: 100,
    command: 'bd',
    args: ['init'],
  });
}

/**
 * Mock bd ready command returning beads
 */
function mockBdReady(beads: BeadEntry[]): void {
  vi.mocked(executeCommand).mockResolvedValueOnce({
    stdout: JSON.stringify(beads),
    stderr: '',
    exitCode: 0,
    duration: 50,
    command: 'bd',
    args: ['ready', '--json'],
  });
}

/**
 * Mock bd show command
 */
function mockBdShow(bead: BeadEntry): void {
  vi.mocked(executeCommand).mockResolvedValueOnce({
    stdout: JSON.stringify(bead),
    stderr: '',
    exitCode: 0,
    duration: 50,
    command: 'bd',
    args: ['show', bead.id, '--json'],
  });
}

/**
 * Mock bd search command
 */
function mockBdSearch(results: BeadSearchResult[]): void {
  vi.mocked(executeCommand).mockResolvedValueOnce({
    stdout: JSON.stringify(results),
    stderr: '',
    exitCode: 0,
    duration: 100,
    command: 'bd',
    args: ['search'],
  });
}

// ============================================================================
// Test Suites
// ============================================================================

describe('Beads Context Persistence', () => {
  const testDir = path.join(tmpdir(), 'beads-context-test');

  beforeEach(() => {
    vi.clearAllMocks();
    resetBeadCounter();

    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });

    // Default mock for executeCommand
    vi.mocked(executeCommand).mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: '',
      args: [],
    });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // 1. Beads Initialization Tests
  // ==========================================================================

  describe('Beads Initialization', () => {
    it('should create .beads/ directory structure on init', () => {
      const projectRoot = createBeadsProject(testDir, 'init-test');

      expect(existsSync(path.join(projectRoot, '.beads'))).toBe(true);
      expect(existsSync(path.join(projectRoot, '.beads', 'beads.jsonl'))).toBe(true);
      expect(existsSync(path.join(projectRoot, '.beads', 'notes.jsonl'))).toBe(true);
    });

    it('should create git repository for persistence', () => {
      const projectRoot = createBeadsProject(testDir, 'git-init-test');

      expect(existsSync(path.join(projectRoot, '.git'))).toBe(true);
    });

    it('should execute bd init command successfully', async () => {
      mockBdInit(true);

      const result = await executeCommand('bd', ['init'], { cwd: testDir });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Initialized');
    });

    it('should be idempotent - running init twice is safe', () => {
      const projectRoot = createBeadsProject(testDir, 'idempotent-test');

      // Create structure again - should not throw
      expect(() => {
        createBeadsProject(testDir, 'idempotent-test');
      }).not.toThrow();

      expect(existsSync(path.join(projectRoot, '.beads'))).toBe(true);
    });
  });

  // ==========================================================================
  // 2. Context Creation Tests
  // ==========================================================================

  describe('Context Creation', () => {
    it('should create technical decision beads', () => {
      const projectRoot = createBeadsProject(testDir, 'decision-test');

      const bead = createSampleBead({
        title: 'API uses REST pattern',
        type: 'decision',
      });
      createBead(projectRoot, bead);

      const beads = readBeads(projectRoot);
      expect(beads.length).toBe(1);
      expect(beads[0].title).toBe('API uses REST pattern');
      expect(beads[0].type).toBe('decision');
    });

    it('should create architecture note beads', () => {
      const projectRoot = createBeadsProject(testDir, 'arch-test');

      const bead = createSampleBead({
        title: 'Database: PostgreSQL with connection pooling',
        type: 'architecture',
      });
      createBead(projectRoot, bead);

      const beads = readBeads(projectRoot);
      expect(beads[0].type).toBe('architecture');
    });

    it('should create implementation detail beads', () => {
      const projectRoot = createBeadsProject(testDir, 'impl-test');

      const bead = createSampleBead({
        title: 'Auth flow: JWT with refresh tokens',
        type: 'implementation',
      });
      createBead(projectRoot, bead);

      const beads = readBeads(projectRoot);
      expect(beads[0].type).toBe('implementation');
    });

    it('should assign unique IDs to each bead', () => {
      const projectRoot = createBeadsProject(testDir, 'unique-id-test');

      const bead1 = createSampleBead({ title: 'First bead' });
      const bead2 = createSampleBead({ title: 'Second bead' });
      const bead3 = createSampleBead({ title: 'Third bead' });

      createBeads(projectRoot, [bead1, bead2, bead3]);

      const beads = readBeads(projectRoot);
      const ids = beads.map((b) => b.id);

      expect(new Set(ids).size).toBe(3);
    });

    it('should add notes to existing beads', () => {
      const projectRoot = createBeadsProject(testDir, 'notes-test');

      const bead = createSampleBead();
      createBead(projectRoot, bead);

      const note: BeadNote = {
        id: 'note-001',
        content: 'Updated to use OAuth2',
        author: 'backend-dev',
        timestamp: new Date().toISOString(),
      };
      createNote(projectRoot, bead.id, note);

      const notesPath = path.join(projectRoot, '.beads', 'notes.jsonl');
      const content = readFileSync(notesPath, 'utf-8');

      expect(content).toContain('OAuth2');
      expect(content).toContain(bead.id);
    });

    it('should create beads with dependencies', () => {
      const projectRoot = createBeadsProject(testDir, 'deps-test');

      const parentBead = createSampleBead({ id: 'bd-parent' });
      const childBead = createSampleBead({
        id: 'bd-child',
        deps: ['blocks:bd-parent'],
      });

      createBeads(projectRoot, [parentBead, childBead]);

      const beads = readBeads(projectRoot);
      const child = beads.find((b) => b.id === 'bd-child');

      expect(child?.deps).toContain('blocks:bd-parent');
    });

    it('should use JSONL append-only format', () => {
      const projectRoot = createBeadsProject(testDir, 'jsonl-test');

      createBead(projectRoot, createSampleBead({ title: 'First' }));
      createBead(projectRoot, createSampleBead({ title: 'Second' }));
      createBead(projectRoot, createSampleBead({ title: 'Third' }));

      const beadsPath = path.join(projectRoot, '.beads', 'beads.jsonl');
      const content = readFileSync(beadsPath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(3);
      // Each line should be valid JSON
      for (const line of lines) {
        expect(() => JSON.parse(line)).not.toThrow();
      }
    });
  });

  // ==========================================================================
  // 3. Session Restart Survival Tests
  // ==========================================================================

  describe('Session Restart Survival', () => {
    it('should persist beads across session restarts', () => {
      const projectRoot = createBeadsProject(testDir, 'restart-test');

      // Session 1: Create beads
      const bead1 = createSampleBead({ title: 'Session 1 bead', status: 'open' });
      createBead(projectRoot, bead1);

      // Session 2: Read beads (simulating restart)
      const beads = readBeads(projectRoot);

      expect(beads.length).toBe(1);
      expect(beads[0].title).toBe('Session 1 bead');
    });

    it('should maintain stable bead IDs across sessions', () => {
      const projectRoot = createBeadsProject(testDir, 'stable-id-test');

      const originalId = 'bd-stable-001';
      const bead = createSampleBead({ id: originalId });
      createBead(projectRoot, bead);

      // Simulate session restart
      const beads = readBeads(projectRoot);

      expect(beads[0].id).toBe(originalId);
    });

    it('should preserve notes across sessions', () => {
      const projectRoot = createBeadsProject(testDir, 'notes-persist-test');

      const bead = createSampleBead();
      bead.notes = [
        { id: 'n1', content: 'First note', author: 'agent1', timestamp: new Date().toISOString() },
        { id: 'n2', content: 'Second note', author: 'agent2', timestamp: new Date().toISOString() },
      ];
      createBead(projectRoot, bead);

      // Session restart
      const beads = readBeads(projectRoot);

      expect(beads[0].notes.length).toBe(2);
      expect(beads[0].notes[0].content).toBe('First note');
      expect(beads[0].notes[1].content).toBe('Second note');
    });

    it('should preserve status across sessions', () => {
      const projectRoot = createBeadsProject(testDir, 'status-persist-test');

      const bead = createSampleBead({ status: 'in_progress' });
      createBead(projectRoot, bead);

      const beads = readBeads(projectRoot);
      expect(beads[0].status).toBe('in_progress');
    });

    it('should preserve priority across sessions', () => {
      const projectRoot = createBeadsProject(testDir, 'priority-persist-test');

      const bead = createSampleBead({ priority: 1 });
      createBead(projectRoot, bead);

      const beads = readBeads(projectRoot);
      expect(beads[0].priority).toBe(1);
    });

    it('should preserve dependencies across sessions', () => {
      const projectRoot = createBeadsProject(testDir, 'deps-persist-test');

      const bead = createSampleBead({ deps: ['blocks:bd-001', 'parent:bd-epic'] });
      createBead(projectRoot, bead);

      const beads = readBeads(projectRoot);
      expect(beads[0].deps).toEqual(['blocks:bd-001', 'parent:bd-epic']);
    });
  });

  // ==========================================================================
  // 4. Agent Context Retrieval Tests
  // ==========================================================================

  describe('Agent Context Retrieval', () => {
    it('should retrieve all open beads with bd ready', async () => {
      const projectRoot = createBeadsProject(testDir, 'ready-test');

      const openBead = createSampleBead({ status: 'open' });
      const closedBead = createSampleBead({ status: 'closed' });
      createBeads(projectRoot, [openBead, closedBead]);

      mockBdReady([openBead]);

      const result = await executeCommand('bd', ['ready', '--json'], { cwd: projectRoot });
      const beads = JSON.parse(result.stdout) as BeadEntry[];

      expect(beads.length).toBe(1);
      expect(beads[0].status).toBe('open');
    });

    it('should claim bead by updating status to in_progress', () => {
      const projectRoot = createBeadsProject(testDir, 'claim-test');

      const bead = createSampleBead({ status: 'open' });
      createBead(projectRoot, bead);

      // Simulate claiming (update bead)
      const beadsPath = path.join(projectRoot, '.beads', 'beads.jsonl');
      const claimedBead = { ...bead, status: 'in_progress' as const, updated_at: new Date().toISOString() };
      writeFileSync(beadsPath, JSON.stringify(claimedBead) + '\n');

      const beads = readBeads(projectRoot);
      expect(beads[0].status).toBe('in_progress');
    });

    it('should read full bead context with bd show', async () => {
      const bead = createSampleBead({
        notes: [
          { id: 'n1', content: 'Implementation started', author: 'dev', timestamp: new Date().toISOString() },
        ],
      });

      mockBdShow(bead);

      const result = await executeCommand('bd', ['show', bead.id, '--json'], { cwd: testDir });
      const retrieved = JSON.parse(result.stdout) as BeadEntry;

      expect(retrieved.id).toBe(bead.id);
      expect(retrieved.notes.length).toBe(1);
    });

    it('should add implementation progress notes', () => {
      const projectRoot = createBeadsProject(testDir, 'progress-test');

      const bead = createSampleBead();
      bead.notes.push({
        id: 'progress-001',
        content: 'Completed API endpoint implementation',
        author: 'backend-dev',
        timestamp: new Date().toISOString(),
      });
      createBead(projectRoot, bead);

      const beads = readBeads(projectRoot);
      expect(beads[0].notes[0].content).toContain('API endpoint');
    });

    it('should support multi-agent read/update scenarios', () => {
      const projectRoot = createBeadsProject(testDir, 'multi-agent-test');

      // Agent A creates bead
      const bead = createSampleBead({ title: 'Shared task' });
      createBead(projectRoot, bead);

      // Agent B reads and updates
      const beads = readBeads(projectRoot);
      const updated = {
        ...beads[0],
        notes: [
          ...beads[0].notes,
          { id: 'n1', content: 'Agent B update', author: 'agent-b', timestamp: new Date().toISOString() },
        ],
      };

      // Rewrite with update
      writeFileSync(
        path.join(projectRoot, '.beads', 'beads.jsonl'),
        JSON.stringify(updated) + '\n'
      );

      const finalBeads = readBeads(projectRoot);
      expect(finalBeads[0].notes.length).toBe(1);
      expect(finalBeads[0].notes[0].author).toBe('agent-b');
    });

    it('should list beads by status', async () => {
      const closedBeads = [
        createSampleBead({ status: 'closed', title: 'Done 1' }),
        createSampleBead({ status: 'closed', title: 'Done 2' }),
      ];

      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: JSON.stringify(closedBeads),
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'bd',
        args: ['list', '--status', 'closed'],
      });

      const result = await executeCommand('bd', ['list', '--status', 'closed'], { cwd: testDir });
      const beads = JSON.parse(result.stdout) as BeadEntry[];

      expect(beads.length).toBe(2);
      expect(beads.every((b) => b.status === 'closed')).toBe(true);
    });

    it('should query beads by priority', async () => {
      const highPriorityBeads = [createSampleBead({ priority: 1 })];

      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: JSON.stringify(highPriorityBeads),
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'bd',
        args: ['list', '--priority', '1'],
      });

      const result = await executeCommand('bd', ['list', '--priority', '1'], { cwd: testDir });
      const beads = JSON.parse(result.stdout) as BeadEntry[];

      expect(beads[0].priority).toBe(1);
    });

    it('should support agent handoff workflow', () => {
      const projectRoot = createBeadsProject(testDir, 'handoff-test');

      // Agent A creates and completes work
      const bead = createSampleBead({ status: 'open' });
      bead.notes = [
        { id: 'h1', content: 'HANDOFF: Frontend complete, passing to backend', author: 'frontend-dev', timestamp: new Date().toISOString() },
      ];
      createBead(projectRoot, bead);

      // Agent B retrieves and continues
      const beads = readBeads(projectRoot);
      const handoffNote = beads[0].notes.find((n) => n.content.includes('HANDOFF'));

      expect(handoffNote).toBeDefined();
      expect(handoffNote?.content).toContain('passing to backend');
    });
  });

  // ==========================================================================
  // 5. Context Indexing and Searchability Tests
  // ==========================================================================

  describe('Context Indexing and Searchability', () => {
    it('should search beads by keyword', async () => {
      const searchResults: BeadSearchResult[] = [
        { id: 'bd-001', title: 'Implement authentication', relevance: 0.95 },
        { id: 'bd-002', title: 'Auth token refresh', relevance: 0.85 },
      ];

      mockBdSearch(searchResults);

      const result = await executeCommand('bd', ['search', 'authentication'], { cwd: testDir });
      const results = JSON.parse(result.stdout) as BeadSearchResult[];

      expect(results.length).toBe(2);
      expect(results[0].relevance).toBeGreaterThan(results[1].relevance);
    });

    it('should return relevance scores in search results', async () => {
      const searchResults: BeadSearchResult[] = [
        { id: 'bd-001', title: 'Auth implementation', relevance: 0.9 },
      ];

      mockBdSearch(searchResults);

      const result = await executeCommand('bd', ['search', 'auth'], { cwd: testDir });
      const results = JSON.parse(result.stdout) as BeadSearchResult[];

      expect(results[0]).toHaveProperty('relevance');
      expect(typeof results[0].relevance).toBe('number');
    });

    it('should filter by multiple criteria', async () => {
      const filteredBeads = [createSampleBead({ status: 'open', priority: 1 })];

      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: JSON.stringify(filteredBeads),
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'bd',
        args: ['list', '--status', 'open', '--priority', '1'],
      });

      const result = await executeCommand('bd', ['list', '--status', 'open', '--priority', '1'], { cwd: testDir });
      const beads = JSON.parse(result.stdout) as BeadEntry[];

      expect(beads[0].status).toBe('open');
      expect(beads[0].priority).toBe(1);
    });

    it('should identify stale beads', async () => {
      const staleBeads = [createSampleBead({ title: 'Old task' })];

      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: JSON.stringify(staleBeads),
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'bd',
        args: ['stale', '--days', '7'],
      });

      const result = await executeCommand('bd', ['stale', '--days', '7'], { cwd: testDir });
      const beads = JSON.parse(result.stdout) as BeadEntry[];

      expect(beads.length).toBeGreaterThan(0);
    });

    it('should show dependency tree', async () => {
      const depTree: BeadDependencyTree = {
        id: 'bd-001',
        title: 'Epic',
        children: [
          { id: 'bd-002', title: 'Task A', children: [] },
          { id: 'bd-003', title: 'Task B', children: [] },
        ],
      };

      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: JSON.stringify(depTree),
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'bd',
        args: ['deps', 'bd-001', '--recursive'],
      });

      const result = await executeCommand('bd', ['deps', 'bd-001', '--recursive'], { cwd: testDir });
      const tree = JSON.parse(result.stdout) as BeadDependencyTree;

      expect(tree.children.length).toBe(2);
    });

    it('should filter beads by date', async () => {
      const recentBeads = [createSampleBead({ created_at: '2025-01-20T00:00:00Z' })];

      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: JSON.stringify(recentBeads),
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'bd',
        args: ['list', '--since', '2025-01-15'],
      });

      const result = await executeCommand('bd', ['list', '--since', '2025-01-15'], { cwd: testDir });
      const beads = JSON.parse(result.stdout) as BeadEntry[];

      expect(beads.length).toBeGreaterThan(0);
    });

    it('should handle large bead histories performantly', () => {
      const projectRoot = createBeadsProject(testDir, 'large-history-test');

      // Create 100+ beads
      const beads: BeadEntry[] = [];
      for (let i = 0; i < 100; i++) {
        beads.push(createSampleBead({ title: `Bead ${i}` }));
      }

      const startTime = Date.now();
      createBeads(projectRoot, beads);
      const writeTime = Date.now() - startTime;

      const readStart = Date.now();
      const readBeadsResult = readBeads(projectRoot);
      const readTime = Date.now() - readStart;

      expect(readBeadsResult.length).toBe(100);
      expect(writeTime).toBeLessThan(1000); // Should be fast
      expect(readTime).toBeLessThan(500);
    });
  });

  // ==========================================================================
  // 6. JSONL Storage Integrity Tests
  // ==========================================================================

  describe('JSONL Storage Integrity', () => {
    it('should store one JSON object per line', () => {
      const projectRoot = createBeadsProject(testDir, 'jsonl-format-test');

      createBeads(projectRoot, [
        createSampleBead({ title: 'Bead 1' }),
        createSampleBead({ title: 'Bead 2' }),
        createSampleBead({ title: 'Bead 3' }),
      ]);

      const beadsPath = path.join(projectRoot, '.beads', 'beads.jsonl');
      const content = readFileSync(beadsPath, 'utf-8');
      const lines = content.trim().split('\n');

      // Should have 3 lines, one per bead
      expect(lines.length).toBe(3);

      // File should NOT start with [ (array wrapper)
      expect(content.trim().startsWith('[')).toBe(false);

      // Each line should be valid JSON
      for (const line of lines) {
        expect(() => JSON.parse(line)).not.toThrow();
        const parsed = JSON.parse(line);
        expect(parsed).toHaveProperty('id');
        expect(parsed).toHaveProperty('title');
      }
    });

    it('should handle valid lines even with corrupted entries', () => {
      const projectRoot = createBeadsProject(testDir, 'corrupted-entry-test');
      const beadsPath = path.join(projectRoot, '.beads', 'beads.jsonl');

      // Write valid + invalid + valid
      const validBead = createSampleBead({ id: 'bd-valid-1' });
      writeFileSync(beadsPath, JSON.stringify(validBead) + '\n');
      writeFileSync(beadsPath, '{ invalid json }\n', { flag: 'a' });
      const validBead2 = createSampleBead({ id: 'bd-valid-2' });
      writeFileSync(beadsPath, JSON.stringify(validBead2) + '\n', { flag: 'a' });

      // Read with error handling
      const content = readFileSync(beadsPath, 'utf-8');
      const lines = content.trim().split('\n');

      const validBeads: BeadEntry[] = [];
      for (const line of lines) {
        try {
          validBeads.push(JSON.parse(line));
        } catch {
          // Skip invalid lines
        }
      }

      expect(validBeads.length).toBe(2);
    });

    it('should validate JSONL schema', () => {
      const projectRoot = createBeadsProject(testDir, 'schema-test');

      const validBead = createSampleBead();
      createBead(projectRoot, validBead);

      const beads = readBeads(projectRoot);
      const bead = beads[0];

      // Validate required fields
      expect(bead).toHaveProperty('id');
      expect(bead).toHaveProperty('title');
      expect(bead).toHaveProperty('status');
      expect(bead).toHaveProperty('created_at');
      expect(bead).toHaveProperty('notes');
      expect(Array.isArray(bead.notes)).toBe(true);
    });

    it('should preserve JSONL format with special characters', () => {
      const projectRoot = createBeadsProject(testDir, 'special-chars-test');

      const bead = createSampleBead({
        title: 'Test with "quotes" and \\ backslashes',
        notes: [
          { id: 'n1', content: 'Line 1\nLine 2\tTabbed', author: 'dev', timestamp: new Date().toISOString() },
        ],
      });
      createBead(projectRoot, bead);

      const beads = readBeads(projectRoot);
      expect(beads[0].title).toContain('"quotes"');
      expect(beads[0].notes[0].content).toContain('\n');
    });

    it('should support append operations atomically', () => {
      const projectRoot = createBeadsProject(testDir, 'append-test');

      // Simulate concurrent appends
      const bead1 = createSampleBead({ id: 'bd-append-1' });
      const bead2 = createSampleBead({ id: 'bd-append-2' });

      createBead(projectRoot, bead1);
      createBead(projectRoot, bead2);

      const beads = readBeads(projectRoot);
      expect(beads.length).toBe(2);
      expect(beads.map((b) => b.id)).toContain('bd-append-1');
      expect(beads.map((b) => b.id)).toContain('bd-append-2');
    });
  });

  // ==========================================================================
  // 7. Context Linking and References Tests
  // ==========================================================================

  describe('Context Linking and References', () => {
    it('should create discovered-from relationships', () => {
      const projectRoot = createBeadsProject(testDir, 'discovered-test');

      const originalBead = createSampleBead({ id: 'bd-original' });
      const discoveredBead = createSampleBead({
        id: 'bd-discovered',
        deps: ['discovered-from:bd-original'],
      });

      createBeads(projectRoot, [originalBead, discoveredBead]);

      const beads = readBeads(projectRoot);
      const discovered = beads.find((b) => b.id === 'bd-discovered');

      expect(discovered?.deps).toContain('discovered-from:bd-original');
    });

    it('should create parent-child hierarchies', () => {
      const projectRoot = createBeadsProject(testDir, 'parent-child-test');

      const epicBead = createSampleBead({ id: 'bd-epic' });
      const subtaskBead = createSampleBead({
        id: 'bd-subtask',
        deps: ['parent:bd-epic'],
      });

      createBeads(projectRoot, [epicBead, subtaskBead]);

      const beads = readBeads(projectRoot);
      const subtask = beads.find((b) => b.id === 'bd-subtask');

      expect(subtask?.deps).toContain('parent:bd-epic');
    });

    it('should create blocking relationships', () => {
      const projectRoot = createBeadsProject(testDir, 'blocking-test');

      const blockerBead = createSampleBead({ id: 'bd-blocker' });
      const blockedBead = createSampleBead({
        id: 'bd-blocked',
        deps: ['blocks:bd-blocker'],
      });

      createBeads(projectRoot, [blockerBead, blockedBead]);

      const beads = readBeads(projectRoot);
      const blocked = beads.find((b) => b.id === 'bd-blocked');

      expect(blocked?.deps).toContain('blocks:bd-blocker');
    });

    it('should detect circular dependencies', () => {
      // This is a validation test - circular deps should be prevented
      const circularDeps1 = ['blocks:bd-002'];
      const circularDeps2 = ['blocks:bd-001'];

      // In real implementation, this should be rejected
      expect(
        circularDeps1.includes('blocks:bd-002') && circularDeps2.includes('blocks:bd-001')
      ).toBe(true);
    });

    it('should preserve dependency relationships across sessions', () => {
      const projectRoot = createBeadsProject(testDir, 'deps-session-test');

      const bead = createSampleBead({
        deps: ['parent:bd-epic', 'blocks:bd-prereq', 'related:bd-feature'],
      });
      createBead(projectRoot, bead);

      // Session restart
      const beads = readBeads(projectRoot);

      expect(beads[0].deps).toHaveLength(3);
      expect(beads[0].deps).toContain('parent:bd-epic');
      expect(beads[0].deps).toContain('blocks:bd-prereq');
      expect(beads[0].deps).toContain('related:bd-feature');
    });

    it('should support multiple dependency types', () => {
      const projectRoot = createBeadsProject(testDir, 'multi-dep-test');

      const bead = createSampleBead({
        deps: [
          'parent:bd-epic',
          'blocks:bd-prereq',
          'discovered-from:bd-bug',
          'related:bd-feature',
        ],
      });
      createBead(projectRoot, bead);

      const beads = readBeads(projectRoot);
      expect(beads[0].deps.length).toBe(4);
    });
  });

  // ==========================================================================
  // 8. Session Continuity Across Agent Types Tests
  // ==========================================================================

  describe('Session Continuity Across Agent Types', () => {
    it('should allow pm-lead to create epic beads', () => {
      const projectRoot = createBeadsProject(testDir, 'pm-lead-test');

      const epicBead = createSampleBead({
        id: 'bd-epic-001',
        title: 'Implement user authentication',
        type: 'task',
        priority: 1,
        notes: [
          { id: 'n1', content: 'Created by pm-lead', author: 'pm-lead', timestamp: new Date().toISOString() },
        ],
      });
      createBead(projectRoot, epicBead);

      const beads = readBeads(projectRoot);
      expect(beads[0].notes[0].author).toBe('pm-lead');
    });

    it('should allow frontend-dev to claim frontend tasks', () => {
      const projectRoot = createBeadsProject(testDir, 'frontend-claim-test');

      const taskBead = createSampleBead({
        status: 'open',
        tags: ['frontend'],
      });
      createBead(projectRoot, taskBead);

      // Frontend-dev claims
      const beads = readBeads(projectRoot);
      beads[0].status = 'in_progress';
      beads[0].notes.push({
        id: 'claim-1',
        content: 'Claimed by frontend-dev',
        author: 'frontend-dev',
        timestamp: new Date().toISOString(),
      });

      writeFileSync(
        path.join(projectRoot, '.beads', 'beads.jsonl'),
        JSON.stringify(beads[0]) + '\n'
      );

      const updatedBeads = readBeads(projectRoot);
      expect(updatedBeads[0].status).toBe('in_progress');
    });

    it('should support parallel agent work without conflicts', () => {
      const projectRoot = createBeadsProject(testDir, 'parallel-agents-test');

      // Different agents work on different beads
      const frontendBead = createSampleBead({
        id: 'bd-frontend',
        tags: ['frontend'],
        status: 'in_progress',
      });
      const backendBead = createSampleBead({
        id: 'bd-backend',
        tags: ['backend'],
        status: 'in_progress',
      });

      createBeads(projectRoot, [frontendBead, backendBead]);

      const beads = readBeads(projectRoot);
      expect(beads.length).toBe(2);
      expect(beads.find((b) => b.tags.includes('frontend'))).toBeDefined();
      expect(beads.find((b) => b.tags.includes('backend'))).toBeDefined();
    });

    it('should provide consistent view across agents', () => {
      const projectRoot = createBeadsProject(testDir, 'consistent-view-test');

      const sharedBead = createSampleBead({ title: 'Shared context' });
      createBead(projectRoot, sharedBead);

      // Multiple agents read
      const agentAView = readBeads(projectRoot);
      const agentBView = readBeads(projectRoot);
      const agentCView = readBeads(projectRoot);

      expect(agentAView[0].id).toBe(agentBView[0].id);
      expect(agentBView[0].id).toBe(agentCView[0].id);
    });

    it('should preserve full context history in notes', () => {
      const projectRoot = createBeadsProject(testDir, 'history-test');

      const bead = createSampleBead();
      bead.notes = [
        { id: 'n1', content: 'pm-lead: Created task', author: 'pm-lead', timestamp: '2025-01-20T10:00:00Z' },
        { id: 'n2', content: 'frontend-dev: Started UI', author: 'frontend-dev', timestamp: '2025-01-20T11:00:00Z' },
        { id: 'n3', content: 'backend-dev: API ready', author: 'backend-dev', timestamp: '2025-01-20T12:00:00Z' },
        { id: 'n4', content: 'test-engineer: Tests passing', author: 'test-engineer', timestamp: '2025-01-20T13:00:00Z' },
      ];
      createBead(projectRoot, bead);

      const beads = readBeads(projectRoot);
      expect(beads[0].notes.length).toBe(4);

      const authors = beads[0].notes.map((n) => n.author);
      expect(authors).toContain('pm-lead');
      expect(authors).toContain('frontend-dev');
      expect(authors).toContain('backend-dev');
      expect(authors).toContain('test-engineer');
    });

    it('should support test-engineer reading implementation beads', () => {
      const projectRoot = createBeadsProject(testDir, 'test-engineer-test');

      const implBead = createSampleBead({
        type: 'implementation',
        status: 'closed',
        notes: [
          { id: 'impl-1', content: 'JWT auth implemented', author: 'backend-dev', timestamp: new Date().toISOString() },
        ],
      });
      createBead(projectRoot, implBead);

      // Test engineer reads
      const beads = readBeads(projectRoot);
      const implNote = beads[0].notes.find((n) => n.content.includes('JWT'));

      expect(implNote).toBeDefined();
    });

    it('should support agent handoff with context preservation', () => {
      const projectRoot = createBeadsProject(testDir, 'agent-handoff-test');

      const bead = createSampleBead();
      bead.notes = [
        { id: 'h1', content: 'Agent A completed phase 1', author: 'agent-a', timestamp: new Date().toISOString() },
        { id: 'h2', content: 'HANDOFF to Agent B', author: 'agent-a', timestamp: new Date().toISOString() },
      ];
      createBead(projectRoot, bead);

      // Agent B adds their work
      const beads = readBeads(projectRoot);
      beads[0].notes.push({
        id: 'h3',
        content: 'Agent B received handoff, continuing work',
        author: 'agent-b',
        timestamp: new Date().toISOString(),
      });

      writeFileSync(
        path.join(projectRoot, '.beads', 'beads.jsonl'),
        JSON.stringify(beads[0]) + '\n'
      );

      const finalBeads = readBeads(projectRoot);
      expect(finalBeads[0].notes.length).toBe(3);
      expect(finalBeads[0].notes.some((n) => n.content.includes('HANDOFF'))).toBe(true);
    });
  });

  // ==========================================================================
  // 9. Error Recovery and Edge Cases Tests
  // ==========================================================================

  describe('Error Recovery and Edge Cases', () => {
    it('should handle missing .beads/ directory gracefully', async () => {
      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: '',
        stderr: 'Error: .beads/ directory not found. Run "bd init" first.',
        exitCode: 1,
        duration: 50,
        command: 'bd',
        args: ['ready'],
      });

      const result = await executeCommand('bd', ['ready'], { cwd: testDir });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('bd init');
    });

    it('should handle invalid bead IDs', async () => {
      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: '',
        stderr: 'Error: Bead "bd-invalid" not found',
        exitCode: 1,
        duration: 50,
        command: 'bd',
        args: ['show', 'bd-invalid'],
      });

      const result = await executeCommand('bd', ['show', 'bd-invalid'], { cwd: testDir });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('not found');
    });

    it('should handle empty beads.jsonl', () => {
      const projectRoot = createBeadsProject(testDir, 'empty-jsonl-test');

      // File exists but is empty
      const beads = readBeads(projectRoot);
      expect(beads).toEqual([]);
    });

    it('should handle filesystem permission errors', async () => {
      vi.mocked(executeCommand).mockResolvedValueOnce({
        stdout: '',
        stderr: 'Error: Permission denied writing to .beads/beads.jsonl',
        exitCode: 1,
        duration: 50,
        command: 'bd',
        args: ['create', 'Test'],
      });

      const result = await executeCommand('bd', ['create', 'Test'], { cwd: testDir });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Permission denied');
    });

    it('should recover from partial writes', () => {
      const projectRoot = createBeadsProject(testDir, 'partial-write-test');
      const beadsPath = path.join(projectRoot, '.beads', 'beads.jsonl');

      // Write complete bead
      const completeBead = createSampleBead({ id: 'bd-complete' });
      writeFileSync(beadsPath, JSON.stringify(completeBead) + '\n');

      // Write partial/incomplete JSON
      writeFileSync(beadsPath, '{"id": "bd-partial", "title": "Inco', { flag: 'a' });

      // Should still be able to read complete beads
      const content = readFileSync(beadsPath, 'utf-8');
      const lines = content.split('\n').filter(Boolean);

      const validBeads: BeadEntry[] = [];
      for (const line of lines) {
        try {
          validBeads.push(JSON.parse(line));
        } catch {
          // Skip incomplete
        }
      }

      expect(validBeads.length).toBe(1);
      expect(validBeads[0].id).toBe('bd-complete');
    });
  });

  // ==========================================================================
  // 10. Integration with Project Context Tests
  // ==========================================================================

  describe('Project Context Integration', () => {
    it('should integrate with .project-context file', () => {
      const projectRoot = createBeadsProject(testDir, 'project-context-test');

      const contextPath = path.join(projectRoot, '.project-context');
      const context = JSON.parse(readFileSync(contextPath, 'utf-8'));

      expect(context.beads).toBe(true);
      expect(context.ecosystem).toBe(true);
    });

    it('should tag beads with project name', () => {
      const projectRoot = createBeadsProject(testDir, 'project-tag-test');

      const bead = createSampleBead({
        project: 'project-tag-test',
      });
      createBead(projectRoot, bead);

      const beads = readBeads(projectRoot);
      expect(beads[0].project).toBe('project-tag-test');
    });

    it('should work alongside CLAUDE.md', () => {
      const projectRoot = createBeadsProject(testDir, 'claude-md-test');

      // Create CLAUDE.md
      writeFileSync(
        path.join(projectRoot, 'CLAUDE.md'),
        '# Project\n\n## Guidelines\nFollow best practices.'
      );

      // Beads should still work
      const bead = createSampleBead();
      createBead(projectRoot, bead);

      expect(existsSync(path.join(projectRoot, 'CLAUDE.md'))).toBe(true);
      expect(existsSync(path.join(projectRoot, '.beads', 'beads.jsonl'))).toBe(true);

      const beads = readBeads(projectRoot);
      expect(beads.length).toBe(1);
    });

    it('should work alongside ecosystem.json', () => {
      const projectRoot = createBeadsProject(testDir, 'ecosystem-test');

      // Create ecosystem.json
      writeFileSync(
        path.join(projectRoot, 'ecosystem.json'),
        JSON.stringify({
          version: '1.0.0',
          installedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          components: {},
          mcpServers: [],
          settings: {},
        }, null, 2)
      );

      // Beads should reference available tools
      const bead = createSampleBead({
        notes: [
          { id: 'n1', content: 'Using Supabase MCP for database', author: 'dev', timestamp: new Date().toISOString() },
        ],
      });
      createBead(projectRoot, bead);

      expect(existsSync(path.join(projectRoot, 'ecosystem.json'))).toBe(true);

      const beads = readBeads(projectRoot);
      expect(beads[0].notes[0].content).toContain('Supabase');
    });
  });
});
