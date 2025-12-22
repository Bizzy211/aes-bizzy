/**
 * Beads Context Management for NY Knicks Website Integration Tests
 *
 * Tests verifying that Beads integration properly manages context for
 * the NY Knicks website development project, including requirements storage,
 * design system sharing, conversation history, session restart survival,
 * agent handoffs, and large context window management.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
  type: 'requirement' | 'design-system' | 'implementation' | 'task' | 'note' | 'decision' | 'architecture';
  status: 'open' | 'in_progress' | 'blocked' | 'closed';
  priority: number;
  created_at: string;
  updated_at: string;
  notes: BeadNote[];
  deps: string[];
  tags: string[];
  project?: string;
  assigned_to?: string;
  discovered_from?: string;
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
  snippet?: string;
}

interface BeadDependencyTree {
  id: string;
  title: string;
  children: BeadDependencyTree[];
}

interface NYKnicksRequirements {
  teamRoster: {
    features: string[];
    acceptance: string[];
  };
  gameSchedule: {
    features: string[];
    acceptance: string[];
  };
  ticketIntegration: {
    features: string[];
    acceptance: string[];
  };
  designSystem: {
    colors: Record<string, string>;
    typography: Record<string, string>;
    components: string[];
  };
}

interface SessionState {
  sessionId: string;
  startTime: string;
  beads: BeadEntry[];
  lastSyncCommit?: string;
}

interface HandoffContext {
  from_agent: string;
  to_agent: string;
  bead_id: string;
  handoff_notes: string;
  timestamp: string;
}

// ============================================================================
// NY Knicks Project Configuration
// ============================================================================

const KNICKS_COLORS = {
  primary: '#006BB6',      // Knicks Blue
  secondary: '#F58426',    // Knicks Orange
  accent: '#BEC0C2',       // Silver
  background: '#FFFFFF',
  text: '#1D1160',
};

const KNICKS_TYPOGRAPHY = {
  headingFont: 'Gotham Bold',
  bodyFont: 'Helvetica Neue',
  headingSize: '32px',
  bodySize: '16px',
  lineHeight: '1.5',
};

const KNICKS_COMPONENTS = [
  'PlayerCard',
  'GameScheduleWidget',
  'TicketPurchaseButton',
  'LiveScoreBoard',
  'TeamStatsTable',
  'NewsCarousel',
  'SocialFeed',
];

// ============================================================================
// Test Helpers and Fixtures
// ============================================================================

/**
 * Create a valid NY Knicks Beads project structure
 */
function createKnicksBeadsProject(testDir: string): string {
  const projectRoot = path.join(testDir, 'ny-knicks-website');
  const beadsDir = path.join(projectRoot, '.beads');

  mkdirSync(projectRoot, { recursive: true });
  mkdirSync(beadsDir, { recursive: true });
  mkdirSync(path.join(projectRoot, '.git'), { recursive: true });
  mkdirSync(path.join(projectRoot, 'src', 'components'), { recursive: true });
  mkdirSync(path.join(projectRoot, 'src', 'styles'), { recursive: true });
  mkdirSync(path.join(projectRoot, 'docs'), { recursive: true });

  // Create empty beads.jsonl
  writeFileSync(path.join(beadsDir, 'beads.jsonl'), '');

  // Create empty notes.jsonl
  writeFileSync(path.join(beadsDir, 'notes.jsonl'), '');

  // Create project context
  writeFileSync(
    path.join(projectRoot, '.project-context'),
    JSON.stringify({
      name: 'NY Knicks Official Website',
      createdAt: new Date().toISOString(),
      ecosystem: true,
      beads: true,
      team: 'New York Knicks',
      sport: 'NBA Basketball',
    }, null, 2)
  );

  // Create ecosystem.json
  writeFileSync(
    path.join(projectRoot, 'ecosystem.json'),
    JSON.stringify({
      projectId: 'ny-knicks-website',
      version: '1.0.0',
      agents: ['pm-lead', 'ux-designer', 'frontend-dev', 'backend-dev', 'beautiful-web-designer'],
      beadsEnabled: true,
    }, null, 2)
  );

  return projectRoot;
}

/**
 * Create a bead entry and append to beads.jsonl
 */
function createBead(projectRoot: string, bead: BeadEntry): void {
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
 * Add a note to a bead
 */
function addNoteToBead(projectRoot: string, beadId: string, note: BeadNote): void {
  const notesPath = path.join(projectRoot, '.beads', 'notes.jsonl');
  const entry = { beadId, ...note };
  const line = JSON.stringify(entry) + '\n';
  writeFileSync(notesPath, line, { flag: 'a' });
}

/**
 * Read all notes for a bead
 */
function readNotesForBead(projectRoot: string, beadId: string): BeadNote[] {
  const notesPath = path.join(projectRoot, '.beads', 'notes.jsonl');
  if (!existsSync(notesPath)) return [];

  const content = readFileSync(notesPath, 'utf-8');
  const lines = content.trim().split('\n').filter(Boolean);

  return lines
    .map((line) => JSON.parse(line))
    .filter((entry) => entry.beadId === beadId)
    .map(({ beadId: _, ...note }) => note as BeadNote);
}

/**
 * Generate a unique bead ID
 */
let beadCounter = 0;
function generateBeadId(prefix = 'bd'): string {
  return `${prefix}-${String(++beadCounter).padStart(3, '0')}`;
}

/**
 * Reset bead counter for tests
 */
function resetBeadCounter(): void {
  beadCounter = 0;
}

/**
 * Create a NY Knicks requirement bead
 */
function createRequirementBead(
  title: string,
  category: string,
  features: string[],
  overrides: Partial<BeadEntry> = {}
): BeadEntry {
  const id = overrides.id || generateBeadId('req');
  const now = new Date().toISOString();

  return {
    id,
    title,
    type: 'requirement',
    status: 'open',
    priority: 1,
    created_at: now,
    updated_at: now,
    notes: [{
      id: generateBeadId('note'),
      content: `Features: ${features.join(', ')}`,
      author: 'pm-lead',
      timestamp: now,
    }],
    deps: [],
    tags: ['requirement', 'ny-knicks', category],
    project: 'ny-knicks-website',
    ...overrides,
  };
}

/**
 * Create a design system bead
 */
function createDesignSystemBead(
  title: string,
  component: string,
  overrides: Partial<BeadEntry> = {}
): BeadEntry {
  const id = overrides.id || generateBeadId('design');
  const now = new Date().toISOString();

  return {
    id,
    title,
    type: 'design-system',
    status: 'open',
    priority: 2,
    created_at: now,
    updated_at: now,
    notes: [{
      id: generateBeadId('note'),
      content: `Component: ${component}, Colors: Knicks Blue (#006BB6), Orange (#F58426)`,
      author: 'ux-designer',
      timestamp: now,
    }],
    deps: [],
    tags: ['design-system', 'ny-knicks', component],
    project: 'ny-knicks-website',
    ...overrides,
  };
}

/**
 * Create an implementation bead
 */
function createImplementationBead(
  title: string,
  agent: string,
  overrides: Partial<BeadEntry> = {}
): BeadEntry {
  const id = overrides.id || generateBeadId('impl');
  const now = new Date().toISOString();

  return {
    id,
    title,
    type: 'implementation',
    status: 'open',
    priority: 3,
    created_at: now,
    updated_at: now,
    notes: [],
    deps: [],
    tags: ['implementation', 'ny-knicks'],
    project: 'ny-knicks-website',
    assigned_to: agent,
    ...overrides,
  };
}

/**
 * Mock bd CLI command responses
 */
function mockBdCommand(output: string, exitCode = 0): void {
  vi.mocked(executeCommand).mockResolvedValueOnce({
    stdout: output,
    stderr: '',
    exitCode,
    duration: 50,
    command: 'bd',
    args: [],
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

/**
 * Mock bd sync command (git-backed persistence)
 */
function mockBdSync(success = true, commitSha = 'abc123'): void {
  vi.mocked(executeCommand).mockResolvedValueOnce({
    stdout: success ? `Synced beads to git commit ${commitSha}` : '',
    stderr: success ? '' : 'Error syncing beads',
    exitCode: success ? 0 : 1,
    duration: 200,
    command: 'bd',
    args: ['sync'],
  });
}

/**
 * Mock bd stale command
 */
function mockBdStale(staleBeads: BeadEntry[]): void {
  vi.mocked(executeCommand).mockResolvedValueOnce({
    stdout: JSON.stringify(staleBeads),
    stderr: '',
    exitCode: 0,
    duration: 75,
    command: 'bd',
    args: ['stale', '--days=7'],
  });
}

/**
 * Mock bd deps command
 */
function mockBdDeps(tree: BeadDependencyTree): void {
  vi.mocked(executeCommand).mockResolvedValueOnce({
    stdout: JSON.stringify(tree),
    stderr: '',
    exitCode: 0,
    duration: 100,
    command: 'bd',
    args: ['deps', '--recursive'],
  });
}

/**
 * Mock bd update --add-note command
 */
function mockBdUpdate(success = true): void {
  vi.mocked(executeCommand).mockResolvedValueOnce({
    stdout: success ? 'Note added successfully' : '',
    stderr: success ? '' : 'Error adding note',
    exitCode: success ? 0 : 1,
    duration: 50,
    command: 'bd',
    args: ['update', '--add-note'],
  });
}

/**
 * Simulate session save and restore
 */
function saveSessionState(projectRoot: string, state: SessionState): void {
  const statePath = path.join(projectRoot, '.beads', 'session-state.json');
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function loadSessionState(projectRoot: string): SessionState | null {
  const statePath = path.join(projectRoot, '.beads', 'session-state.json');
  if (!existsSync(statePath)) return null;
  return JSON.parse(readFileSync(statePath, 'utf-8'));
}

/**
 * Calculate performance metrics
 */
function measurePerformance<T>(fn: () => T): { result: T; duration: number } {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  return { result, duration };
}

// ============================================================================
// Test Suites
// ============================================================================

describe('NY Knicks Website Beads Context Management', () => {
  const testDir = path.join(tmpdir(), 'beads-knicks-context-test');

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
  // 1. Project Requirements as Beads Storage
  // ==========================================================================

  describe('Project Requirements as Beads Storage', () => {
    it('should store NY Knicks PRD requirements as beads with type=requirement', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const teamRosterReq = createRequirementBead(
        'Team Roster Page Requirements',
        'team-roster',
        ['Player profiles', 'Season stats', 'Injury status', 'Contract info']
      );
      createBead(projectRoot, teamRosterReq);

      const beads = readBeads(projectRoot);
      expect(beads.length).toBe(1);
      expect(beads[0].type).toBe('requirement');
      expect(beads[0].tags).toContain('team-roster');
    });

    it('should create beads from parsed PRD sections', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const requirements = [
        createRequirementBead('Team Roster Features', 'team-roster',
          ['Player cards', 'Stats dashboard', 'Position filtering']),
        createRequirementBead('Game Schedule Features', 'game-schedule',
          ['Calendar view', 'Live scores', 'Broadcast info']),
        createRequirementBead('Ticket Integration Features', 'ticketing',
          ['Seat selection', 'Price display', 'Checkout flow']),
      ];

      createBeads(projectRoot, requirements);

      const beads = readBeads(projectRoot);
      expect(beads.length).toBe(3);
      expect(beads.map(b => b.tags)).toEqual(
        expect.arrayContaining([
          expect.arrayContaining(['team-roster']),
          expect.arrayContaining(['game-schedule']),
          expect.arrayContaining(['ticketing']),
        ])
      );
    });

    it('should store beads in JSONL format with git-backed persistence', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const req = createRequirementBead('Test Requirement', 'test', ['Feature 1']);
      createBead(projectRoot, req);

      const beadsPath = path.join(projectRoot, '.beads', 'beads.jsonl');
      const content = readFileSync(beadsPath, 'utf-8');

      expect(content).toContain('\n'); // JSONL format
      expect(() => JSON.parse(content.trim())).not.toThrow(); // Valid JSON
      expect(existsSync(path.join(projectRoot, '.git'))).toBe(true);
    });

    it('should include project metadata in bead entries', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const req = createRequirementBead('Roster Page', 'roster', ['Player list'], {
        priority: 1,
        project: 'ny-knicks-website',
      });
      createBead(projectRoot, req);

      const beads = readBeads(projectRoot);
      expect(beads[0].project).toBe('ny-knicks-website');
      expect(beads[0].priority).toBe(1);
      expect(beads[0].status).toBe('open');
    });

    it('should execute bd create command for new requirements', async () => {
      mockBdCommand('Created bead req-001', 0);

      const result = await executeCommand('bd', ['create', '--type=requirement', '--title=Test']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Created bead');
    });

    it('should validate bead metadata structure', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const req = createRequirementBead('Valid Requirement', 'test', ['Feature']);
      createBead(projectRoot, req);

      const beads = readBeads(projectRoot);
      const bead = beads[0];

      expect(bead).toHaveProperty('id');
      expect(bead).toHaveProperty('title');
      expect(bead).toHaveProperty('type');
      expect(bead).toHaveProperty('status');
      expect(bead).toHaveProperty('priority');
      expect(bead).toHaveProperty('created_at');
      expect(bead).toHaveProperty('updated_at');
      expect(bead).toHaveProperty('notes');
      expect(bead).toHaveProperty('deps');
      expect(bead).toHaveProperty('tags');
    });

    it('should preserve requirement acceptance criteria in notes', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const req = createRequirementBead('Roster Page', 'roster', ['Player cards']);
      req.notes.push({
        id: generateBeadId('note'),
        content: 'Acceptance: Players sorted by position, clickable for detail view',
        author: 'pm-lead',
        timestamp: new Date().toISOString(),
      });
      createBead(projectRoot, req);

      const beads = readBeads(projectRoot);
      expect(beads[0].notes.length).toBe(2);
      expect(beads[0].notes[1].content).toContain('Acceptance:');
    });

    it('should support multiple requirement categories', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const categories = ['frontend', 'backend', 'design', 'devops'];
      const beads: BeadEntry[] = categories.map(cat =>
        createRequirementBead(`${cat} requirements`, cat, [`${cat} feature`])
      );

      createBeads(projectRoot, beads);

      const storedBeads = readBeads(projectRoot);
      expect(storedBeads.length).toBe(4);
      categories.forEach(cat => {
        expect(storedBeads.some(b => b.tags.includes(cat))).toBe(true);
      });
    });
  });

  // ==========================================================================
  // 2. Design System Context Sharing
  // ==========================================================================

  describe('Design System Context Sharing', () => {
    it('should create design system beads with Knicks color palette', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const colorBead = createDesignSystemBead(
        'Knicks Color Palette',
        'colors',
        {
          notes: [{
            id: generateBeadId('note'),
            content: `Primary: ${KNICKS_COLORS.primary}, Secondary: ${KNICKS_COLORS.secondary}, Accent: ${KNICKS_COLORS.accent}`,
            author: 'ux-designer',
            timestamp: new Date().toISOString(),
          }],
        }
      );
      createBead(projectRoot, colorBead);

      const beads = readBeads(projectRoot);
      expect(beads[0].type).toBe('design-system');
      expect(beads[0].notes[0].content).toContain('#006BB6');
      expect(beads[0].notes[0].content).toContain('#F58426');
    });

    it('should create typography beads for design consistency', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const typoBead = createDesignSystemBead(
        'Knicks Typography System',
        'typography',
        {
          notes: [{
            id: generateBeadId('note'),
            content: `Heading: ${KNICKS_TYPOGRAPHY.headingFont}, Body: ${KNICKS_TYPOGRAPHY.bodyFont}, Line-height: ${KNICKS_TYPOGRAPHY.lineHeight}`,
            author: 'ux-designer',
            timestamp: new Date().toISOString(),
          }],
        }
      );
      createBead(projectRoot, typoBead);

      const beads = readBeads(projectRoot);
      expect(beads[0].tags).toContain('typography');
    });

    it('should allow UX-designer to create beads consumed by frontend-dev', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      // UX-designer creates design bead
      const designBead = createDesignSystemBead('PlayerCard Component Design', 'PlayerCard', {
        assigned_to: 'ux-designer',
      });
      createBead(projectRoot, designBead);

      // Frontend-dev reads the bead
      const beads = readBeads(projectRoot);
      const playerCardDesign = beads.find(b => b.title.includes('PlayerCard'));

      expect(playerCardDesign).toBeDefined();
      expect(playerCardDesign!.tags).toContain('design-system');
    });

    it('should filter beads by design-system tag', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      // Create mixed beads
      createBeads(projectRoot, [
        createDesignSystemBead('Colors', 'colors'),
        createDesignSystemBead('Typography', 'typography'),
        createRequirementBead('Roster Page', 'roster', ['Players']),
        createDesignSystemBead('Components', 'components'),
      ]);

      const allBeads = readBeads(projectRoot);
      const designBeads = allBeads.filter(b => b.type === 'design-system');

      expect(designBeads.length).toBe(3);
      expect(designBeads.every(b => b.tags.includes('design-system'))).toBe(true);
    });

    it('should mock bd ready --tag=design-system filtering', async () => {
      const designBeads = [
        createDesignSystemBead('Colors', 'colors'),
        createDesignSystemBead('Typography', 'typography'),
      ];

      mockBdReady(designBeads);

      const result = await executeCommand('bd', ['ready', '--tag=design-system', '--json']);
      const beads = JSON.parse(result.stdout);

      expect(beads.length).toBe(2);
      expect(beads.every((b: BeadEntry) => b.type === 'design-system')).toBe(true);
    });

    it('should support cross-agent context sharing workflow', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      // Step 1: UX-designer creates design bead
      const designBead = createDesignSystemBead('Button Styles', 'buttons', {
        assigned_to: 'ux-designer',
        status: 'in_progress',
      });
      createBead(projectRoot, designBead);

      // Step 2: UX-designer marks as ready
      let beads = readBeads(projectRoot);
      beads[0].status = 'open';
      beads[0].notes.push({
        id: generateBeadId('note'),
        content: 'READY FOR FRONTEND: Button styles defined with hover states',
        author: 'ux-designer',
        timestamp: new Date().toISOString(),
      });

      // Rewrite the beads file
      const beadsPath = path.join(projectRoot, '.beads', 'beads.jsonl');
      writeFileSync(beadsPath, beads.map(b => JSON.stringify(b)).join('\n') + '\n');

      // Step 3: Frontend-dev picks up
      beads = readBeads(projectRoot);
      expect(beads[0].notes.some(n => n.content.includes('READY FOR FRONTEND'))).toBe(true);
    });

    it('should allow beautiful-web-designer to update beads with implementation notes', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const designBead = createDesignSystemBead('Animation System', 'animations');
      createBead(projectRoot, designBead);

      // Beautiful-web-designer adds implementation note
      addNoteToBead(projectRoot, designBead.id, {
        id: generateBeadId('note'),
        content: 'IMPLEMENTATION: Using Framer Motion for smooth transitions, 300ms duration',
        author: 'beautiful-web-designer',
        timestamp: new Date().toISOString(),
      });

      const notes = readNotesForBead(projectRoot, designBead.id);
      expect(notes.some(n => n.author === 'beautiful-web-designer')).toBe(true);
    });

    it('should track component library decisions across agents', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      KNICKS_COMPONENTS.forEach(comp => {
        const bead = createDesignSystemBead(`${comp} Component`, comp.toLowerCase());
        createBead(projectRoot, bead);
      });

      const beads = readBeads(projectRoot);
      expect(beads.length).toBe(KNICKS_COMPONENTS.length);
    });

    it('should preserve design tokens in structured format', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const tokenBead = createDesignSystemBead('Design Tokens', 'tokens', {
        notes: [{
          id: generateBeadId('note'),
          content: JSON.stringify({
            colors: KNICKS_COLORS,
            typography: KNICKS_TYPOGRAPHY,
            spacing: { sm: '8px', md: '16px', lg: '24px' },
          }),
          author: 'ux-designer',
          timestamp: new Date().toISOString(),
        }],
      });
      createBead(projectRoot, tokenBead);

      const beads = readBeads(projectRoot);
      const tokens = JSON.parse(beads[0].notes[0].content);
      expect(tokens.colors.primary).toBe('#006BB6');
    });
  });

  // ==========================================================================
  // 3. Large Feature Conversation History
  // ==========================================================================

  describe('Large Feature Conversation History', () => {
    it('should simulate multi-session development with note appends', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const featureBead = createImplementationBead('Interactive Game Schedule', 'frontend-dev');
      createBead(projectRoot, featureBead);

      // Session 1: Initial planning
      addNoteToBead(projectRoot, featureBead.id, {
        id: generateBeadId('note'),
        content: 'Session 1: Defined calendar view component structure',
        author: 'frontend-dev',
        timestamp: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      });

      // Session 2: API integration
      addNoteToBead(projectRoot, featureBead.id, {
        id: generateBeadId('note'),
        content: 'Session 2: Integrated NBA API for live scores',
        author: 'frontend-dev',
        timestamp: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
      });

      // Session 3: Final touches
      addNoteToBead(projectRoot, featureBead.id, {
        id: generateBeadId('note'),
        content: 'Session 3: Added refresh interval and loading states',
        author: 'frontend-dev',
        timestamp: new Date().toISOString(),
      });

      const notes = readNotesForBead(projectRoot, featureBead.id);
      expect(notes.length).toBe(3);
    });

    it('should execute bd update --add-note for progress tracking', async () => {
      mockBdUpdate(true);

      const result = await executeCommand('bd', [
        'update', 'impl-001', '--add-note', 'Progress: Completed API integration'
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Note added');
    });

    it('should store implementation decisions in bead notes', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const bead = createImplementationBead('Live Scores Widget', 'frontend-dev');
      createBead(projectRoot, bead);

      const decisions = [
        'DECISION: Using WebSocket for real-time updates',
        'DECISION: Fallback to polling every 30s if WS fails',
        'DECISION: Cache scores in localStorage for offline',
      ];

      decisions.forEach(decision => {
        addNoteToBead(projectRoot, bead.id, {
          id: generateBeadId('note'),
          content: decision,
          author: 'frontend-dev',
          timestamp: new Date().toISOString(),
        });
      });

      const notes = readNotesForBead(projectRoot, bead.id);
      expect(notes.filter(n => n.content.startsWith('DECISION:')).length).toBe(3);
    });

    it('should preserve note ordering by timestamp', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const bead = createImplementationBead('Schedule Feature', 'frontend-dev');
      createBead(projectRoot, bead);

      const timestamps = [
        new Date(Date.now() - 3600000).toISOString(),
        new Date(Date.now() - 1800000).toISOString(),
        new Date().toISOString(),
      ];

      timestamps.forEach((ts, i) => {
        addNoteToBead(projectRoot, bead.id, {
          id: generateBeadId('note'),
          content: `Note ${i + 1}`,
          author: 'frontend-dev',
          timestamp: ts,
        });
      });

      const notes = readNotesForBead(projectRoot, bead.id);
      const sortedTimestamps = notes.map(n => n.timestamp).sort();
      expect(notes.map(n => n.timestamp)).toEqual(sortedTimestamps);
    });

    it('should handle extensive notes (>50 entries)', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const bead = createImplementationBead('Complex Feature', 'frontend-dev');
      createBead(projectRoot, bead);

      // Add 60 notes simulating long development
      for (let i = 0; i < 60; i++) {
        addNoteToBead(projectRoot, bead.id, {
          id: generateBeadId('note'),
          content: `Progress update #${i + 1}: Completed step ${i + 1}`,
          author: 'frontend-dev',
          timestamp: new Date(Date.now() - (60 - i) * 3600000).toISOString(),
        });
      }

      const notes = readNotesForBead(projectRoot, bead.id);
      expect(notes.length).toBe(60);
    });

    it('should mock bd show returning full conversation history', async () => {
      const bead = createImplementationBead('Schedule Widget', 'frontend-dev');
      bead.notes = Array.from({ length: 10 }, (_, i) => ({
        id: `note-${i}`,
        content: `Session ${i + 1} progress`,
        author: 'frontend-dev',
        timestamp: new Date(Date.now() - (10 - i) * 86400000).toISOString(),
      }));

      mockBdShow(bead);

      const result = await executeCommand('bd', ['show', bead.id, '--json']);
      const retrievedBead = JSON.parse(result.stdout);

      expect(retrievedBead.notes.length).toBe(10);
    });

    it('should store API integration details in structured notes', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const bead = createImplementationBead('NBA API Integration', 'backend-dev');
      createBead(projectRoot, bead);

      const apiDetails = {
        endpoint: 'https://api.nba.com/v1/games',
        auth: 'Bearer token',
        rateLimit: '100 req/min',
        responseFormat: 'JSON',
      };

      addNoteToBead(projectRoot, bead.id, {
        id: generateBeadId('note'),
        content: `API_CONFIG: ${JSON.stringify(apiDetails)}`,
        author: 'backend-dev',
        timestamp: new Date().toISOString(),
      });

      const notes = readNotesForBead(projectRoot, bead.id);
      const apiNote = notes.find(n => n.content.startsWith('API_CONFIG:'));
      expect(apiNote).toBeDefined();

      const config = JSON.parse(apiNote!.content.replace('API_CONFIG: ', ''));
      expect(config.endpoint).toContain('nba.com');
    });

    it('should preserve component architecture decisions', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const bead = createImplementationBead('Component Architecture', 'frontend-dev');
      createBead(projectRoot, bead);

      const architecture = {
        pattern: 'Atomic Design',
        stateManagement: 'React Query + Zustand',
        styling: 'Tailwind CSS + CSS Modules',
        testing: 'Vitest + React Testing Library',
      };

      addNoteToBead(projectRoot, bead.id, {
        id: generateBeadId('note'),
        content: `ARCHITECTURE: ${JSON.stringify(architecture)}`,
        author: 'frontend-dev',
        timestamp: new Date().toISOString(),
      });

      const notes = readNotesForBead(projectRoot, bead.id);
      expect(notes.some(n => n.content.includes('Atomic Design'))).toBe(true);
    });
  });

  // ==========================================================================
  // 4. Memory Retrieval Across Sessions
  // ==========================================================================

  describe('Memory Retrieval Across Sessions', () => {
    it('should create epic bead and subtask in session 1', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      // PM-lead creates epic
      const epicBead = createRequirementBead('Player Roster Page Epic', 'roster', [
        'Player cards', 'Stats view', 'Filters',
      ], {
        assigned_to: 'pm-lead',
        status: 'open',
      });
      createBead(projectRoot, epicBead);

      // Frontend-dev claims subtask
      const subtaskBead = createImplementationBead('PlayerCard Component', 'frontend-dev', {
        deps: [epicBead.id],
        status: 'in_progress',
      });
      createBead(projectRoot, subtaskBead);

      const beads = readBeads(projectRoot);
      expect(beads.length).toBe(2);
      expect(beads[1].deps).toContain(epicBead.id);
    });

    it('should simulate bd sync for session persistence', async () => {
      mockBdSync(true, 'def456');

      const result = await executeCommand('bd', ['sync']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Synced beads to git');
    });

    it('should restore session state after restart', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      // Create beads and save session
      const bead = createImplementationBead('In-Progress Work', 'frontend-dev', {
        status: 'in_progress',
      });
      createBead(projectRoot, bead);

      const sessionState: SessionState = {
        sessionId: 'session-001',
        startTime: new Date(Date.now() - 3600000).toISOString(),
        beads: readBeads(projectRoot),
        lastSyncCommit: 'abc123',
      };
      saveSessionState(projectRoot, sessionState);

      // Simulate restart - load session
      const restoredState = loadSessionState(projectRoot);

      expect(restoredState).not.toBeNull();
      expect(restoredState!.beads.length).toBe(1);
      expect(restoredState!.beads[0].status).toBe('in_progress');
    });

    it('should mock bd ready retrieving in-progress beads after restart', async () => {
      const inProgressBeads = [
        createImplementationBead('Work 1', 'frontend-dev', { status: 'in_progress' }),
        createImplementationBead('Work 2', 'backend-dev', { status: 'in_progress' }),
      ];

      mockBdReady(inProgressBeads);

      const result = await executeCommand('bd', ['ready', '--json']);
      const beads = JSON.parse(result.stdout);

      expect(beads.length).toBe(2);
      expect(beads.every((b: BeadEntry) => b.status === 'in_progress')).toBe(true);
    });

    it('should verify bead status survives restart', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const beads = [
        createImplementationBead('Open', 'dev1', { status: 'open' }),
        createImplementationBead('In Progress', 'dev2', { status: 'in_progress' }),
        createImplementationBead('Blocked', 'dev3', { status: 'blocked' }),
        createImplementationBead('Closed', 'dev4', { status: 'closed' }),
      ];
      createBeads(projectRoot, beads);

      // Simulate restart
      const restored = readBeads(projectRoot);

      expect(restored.map(b => b.status)).toEqual(['open', 'in_progress', 'blocked', 'closed']);
    });

    it('should verify notes survive restart', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const bead = createImplementationBead('Feature', 'frontend-dev');
      createBead(projectRoot, bead);

      addNoteToBead(projectRoot, bead.id, {
        id: 'note-1',
        content: 'Important context',
        author: 'frontend-dev',
        timestamp: new Date().toISOString(),
      });

      // Simulate restart
      const notes = readNotesForBead(projectRoot, bead.id);

      expect(notes.length).toBe(1);
      expect(notes[0].content).toBe('Important context');
    });

    it('should verify dependencies survive restart', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const parent = createRequirementBead('Parent', 'parent', ['Feature']);
      const child = createImplementationBead('Child', 'dev', {
        deps: [parent.id],
      });

      createBeads(projectRoot, [parent, child]);

      // Simulate restart
      const restored = readBeads(projectRoot);

      expect(restored[1].deps).toContain(parent.id);
    });

    it('should detect stale beads with bd stale', async () => {
      const staleBeads = [
        createImplementationBead('Abandoned Work', 'dev', {
          status: 'in_progress',
          updated_at: new Date(Date.now() - 8 * 86400000).toISOString(), // 8 days ago
        }),
      ];

      mockBdStale(staleBeads);

      const result = await executeCommand('bd', ['stale', '--days=7']);
      const beads = JSON.parse(result.stdout);

      expect(beads.length).toBe(1);
    });

    it('should verify data integrity after multiple sessions', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      // Session 1
      const bead1 = createImplementationBead('Session 1 Work', 'dev1');
      createBead(projectRoot, bead1);

      // Session 2
      const bead2 = createImplementationBead('Session 2 Work', 'dev2');
      createBead(projectRoot, bead2);

      // Session 3
      const bead3 = createImplementationBead('Session 3 Work', 'dev3');
      createBead(projectRoot, bead3);

      const allBeads = readBeads(projectRoot);
      expect(allBeads.length).toBe(3);
      expect(allBeads.map(b => b.assigned_to)).toEqual(['dev1', 'dev2', 'dev3']);
    });

    it('should handle session interruption gracefully', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const bead = createImplementationBead('Interrupted Work', 'dev');
      createBead(projectRoot, bead);

      // Partial note (simulating interruption)
      addNoteToBead(projectRoot, bead.id, {
        id: 'note-partial',
        content: 'Started implementing...',
        author: 'dev',
        timestamp: new Date().toISOString(),
      });

      // Verify data is still readable
      const beads = readBeads(projectRoot);
      const notes = readNotesForBead(projectRoot, bead.id);

      expect(beads.length).toBe(1);
      expect(notes.length).toBe(1);
    });

    it('should preserve full session history across multiple restarts', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      // Multiple session states
      for (let session = 1; session <= 5; session++) {
        const bead = createImplementationBead(`Session ${session} Work`, `dev${session}`);
        createBead(projectRoot, bead);

        addNoteToBead(projectRoot, bead.id, {
          id: `note-s${session}`,
          content: `Work from session ${session}`,
          author: `dev${session}`,
          timestamp: new Date(Date.now() - (5 - session) * 86400000).toISOString(),
        });
      }

      const allBeads = readBeads(projectRoot);
      expect(allBeads.length).toBe(5);
    });
  });

  // ==========================================================================
  // 5. Agent Handoff with Context Preservation
  // ==========================================================================

  describe('Agent Handoff with Context Preservation', () => {
    it('should track PM-lead to UX-designer handoff', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      // PM-lead creates requirement
      const reqBead = createRequirementBead('Roster Page Design', 'design', ['Visual design']);
      createBead(projectRoot, reqBead);

      // Handoff to UX-designer
      addNoteToBead(projectRoot, reqBead.id, {
        id: generateBeadId('note'),
        content: 'HANDOFF to ux-designer: Need visual design for player cards with Knicks branding',
        author: 'pm-lead',
        timestamp: new Date().toISOString(),
      });

      const notes = readNotesForBead(projectRoot, reqBead.id);
      expect(notes.some(n => n.content.includes('HANDOFF to ux-designer'))).toBe(true);
    });

    it('should track UX-designer to frontend-dev handoff', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      // UX-designer creates design bead
      const designBead = createDesignSystemBead('PlayerCard Design', 'playercard');
      createBead(projectRoot, designBead);

      // Handoff to frontend-dev
      addNoteToBead(projectRoot, designBead.id, {
        id: generateBeadId('note'),
        content: 'HANDOFF to frontend-dev: Design complete. Use Tailwind for responsive layout. Figma link: ...',
        author: 'ux-designer',
        timestamp: new Date().toISOString(),
      });

      const notes = readNotesForBead(projectRoot, designBead.id);
      expect(notes.some(n => n.author === 'ux-designer' && n.content.includes('HANDOFF'))).toBe(true);
    });

    it('should validate discovered-from dependencies', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const designBead = createDesignSystemBead('Button Design', 'button');
      createBead(projectRoot, designBead);

      const implBead = createImplementationBead('Button Component', 'frontend-dev', {
        discovered_from: designBead.id,
        deps: [designBead.id],
      });
      createBead(projectRoot, implBead);

      const beads = readBeads(projectRoot);
      expect(beads[1].discovered_from).toBe(designBead.id);
    });

    it('should support parallel agent workflows', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      // Frontend and backend work in parallel
      const frontendBead = createImplementationBead('UI Components', 'frontend-dev', {
        status: 'in_progress',
      });
      const backendBead = createImplementationBead('API Endpoints', 'backend-dev', {
        status: 'in_progress',
      });

      createBeads(projectRoot, [frontendBead, backendBead]);

      const beads = readBeads(projectRoot);
      const inProgress = beads.filter(b => b.status === 'in_progress');

      expect(inProgress.length).toBe(2);
      expect(inProgress.map(b => b.assigned_to).sort()).toEqual(['backend-dev', 'frontend-dev']);
    });

    it('should track complete handoff chain', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const agents = ['pm-lead', 'ux-designer', 'frontend-dev', 'beautiful-web-designer'];
      const bead = createRequirementBead('Feature Flow', 'feature', ['Complete feature']);
      createBead(projectRoot, bead);

      // Each agent adds handoff note
      for (let i = 0; i < agents.length - 1; i++) {
        addNoteToBead(projectRoot, bead.id, {
          id: generateBeadId('note'),
          content: `HANDOFF to ${agents[i + 1]}: Context from ${agents[i]}`,
          author: agents[i],
          timestamp: new Date(Date.now() + i * 3600000).toISOString(),
        });
      }

      const notes = readNotesForBead(projectRoot, bead.id);
      expect(notes.filter(n => n.content.includes('HANDOFF')).length).toBe(3);
    });

    it('should preserve context through handoff chain', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const bead = createImplementationBead('Schedule Feature', 'pm-lead');
      createBead(projectRoot, bead);

      const handoffs: HandoffContext[] = [
        {
          from_agent: 'pm-lead',
          to_agent: 'ux-designer',
          bead_id: bead.id,
          handoff_notes: 'Requirements defined, need visual design',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          from_agent: 'ux-designer',
          to_agent: 'frontend-dev',
          bead_id: bead.id,
          handoff_notes: 'Designs complete, Figma ready for implementation',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          from_agent: 'frontend-dev',
          to_agent: 'beautiful-web-designer',
          bead_id: bead.id,
          handoff_notes: 'Core logic done, needs polish and animations',
          timestamp: new Date().toISOString(),
        },
      ];

      handoffs.forEach(h => {
        addNoteToBead(projectRoot, h.bead_id, {
          id: generateBeadId('note'),
          content: `HANDOFF ${h.from_agent} -> ${h.to_agent}: ${h.handoff_notes}`,
          author: h.from_agent,
          timestamp: h.timestamp,
        });
      });

      const notes = readNotesForBead(projectRoot, bead.id);
      expect(notes.length).toBe(3);
    });

    it('should handle concurrent updates from multiple agents', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const bead = createImplementationBead('Shared Feature', 'team');
      createBead(projectRoot, bead);

      // Simulate concurrent updates
      const agents = ['frontend-dev', 'backend-dev', 'ux-designer'];
      agents.forEach(agent => {
        addNoteToBead(projectRoot, bead.id, {
          id: generateBeadId('note'),
          content: `Update from ${agent}`,
          author: agent,
          timestamp: new Date().toISOString(),
        });
      });

      const notes = readNotesForBead(projectRoot, bead.id);
      expect(notes.length).toBe(3);
      expect(new Set(notes.map(n => n.author)).size).toBe(3); // All unique
    });

    it('should mock bd deps showing dependency tree', async () => {
      const tree: BeadDependencyTree = {
        id: 'req-001',
        title: 'Roster Page Epic',
        children: [
          {
            id: 'design-001',
            title: 'PlayerCard Design',
            children: [
              { id: 'impl-001', title: 'PlayerCard Component', children: [] },
              { id: 'impl-002', title: 'PlayerCard Styles', children: [] },
            ],
          },
          {
            id: 'impl-003',
            title: 'Roster API Integration',
            children: [],
          },
        ],
      };

      mockBdDeps(tree);

      const result = await executeCommand('bd', ['deps', 'req-001', '--recursive']);
      const depTree = JSON.parse(result.stdout);

      expect(depTree.children.length).toBe(2);
      expect(depTree.children[0].children.length).toBe(2);
    });

    it('should track assignment changes', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const bead = createImplementationBead('Reassigned Task', 'frontend-dev');
      createBead(projectRoot, bead);

      // Assignment change
      addNoteToBead(projectRoot, bead.id, {
        id: generateBeadId('note'),
        content: 'REASSIGNMENT: frontend-dev -> beautiful-web-designer (needs animation expertise)',
        author: 'pm-lead',
        timestamp: new Date().toISOString(),
      });

      const notes = readNotesForBead(projectRoot, bead.id);
      expect(notes.some(n => n.content.includes('REASSIGNMENT'))).toBe(true);
    });

    it('should support blocking handoff with blocker notes', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const bead = createImplementationBead('Blocked Feature', 'backend-dev', {
        status: 'blocked',
      });
      createBead(projectRoot, bead);

      addNoteToBead(projectRoot, bead.id, {
        id: generateBeadId('note'),
        content: 'BLOCKED: Waiting for NBA API credentials from DevOps',
        author: 'backend-dev',
        timestamp: new Date().toISOString(),
      });

      const beads = readBeads(projectRoot);
      expect(beads[0].status).toBe('blocked');

      const notes = readNotesForBead(projectRoot, bead.id);
      expect(notes.some(n => n.content.includes('BLOCKED'))).toBe(true);
    });
  });

  // ==========================================================================
  // 6. Large Context Window Management
  // ==========================================================================

  describe('Large Context Window Management', () => {
    it('should handle beads with >100 notes performantly', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const bead = createImplementationBead('Long-Running Feature', 'frontend-dev');
      createBead(projectRoot, bead);

      // Add 110 notes
      for (let i = 0; i < 110; i++) {
        addNoteToBead(projectRoot, bead.id, {
          id: `note-${i}`,
          content: `Development log entry ${i + 1}: Completed task ${i + 1}`,
          author: 'frontend-dev',
          timestamp: new Date(Date.now() - (110 - i) * 60000).toISOString(),
        });
      }

      const { result: notes, duration } = measurePerformance(() =>
        readNotesForBead(projectRoot, bead.id)
      );

      expect(notes.length).toBe(110);
      expect(duration).toBeLessThan(500); // Should complete in <500ms
    });

    it('should handle JSONL with 100+ beads performantly', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      // Create 150 beads
      for (let i = 0; i < 150; i++) {
        const bead = createImplementationBead(`Feature ${i + 1}`, `dev${i % 5}`);
        createBead(projectRoot, bead);
      }

      const { result: beads, duration } = measurePerformance(() =>
        readBeads(projectRoot)
      );

      expect(beads.length).toBe(150);
      expect(duration).toBeLessThan(500); // Should complete in <500ms
    });

    it('should mock bd search with relevance scoring', async () => {
      const searchResults: BeadSearchResult[] = [
        { id: 'impl-001', title: 'PlayerCard Component', relevance: 0.95 },
        { id: 'design-001', title: 'PlayerCard Design', relevance: 0.87 },
        { id: 'req-001', title: 'Roster Page Requirements', relevance: 0.72 },
      ];

      mockBdSearch(searchResults);

      const result = await executeCommand('bd', ['search', 'player card']);
      const results = JSON.parse(result.stdout);

      expect(results.length).toBe(3);
      expect(results[0].relevance).toBeGreaterThan(results[1].relevance);
    });

    it('should mock bd deps --recursive for complex hierarchies', async () => {
      // Create deep hierarchy
      const complexTree: BeadDependencyTree = {
        id: 'epic-001',
        title: 'NY Knicks Website Epic',
        children: [
          {
            id: 'feature-001',
            title: 'Roster Section',
            children: Array.from({ length: 10 }, (_, i) => ({
              id: `task-roster-${i}`,
              title: `Roster Task ${i}`,
              children: [],
            })),
          },
          {
            id: 'feature-002',
            title: 'Schedule Section',
            children: Array.from({ length: 8 }, (_, i) => ({
              id: `task-schedule-${i}`,
              title: `Schedule Task ${i}`,
              children: [],
            })),
          },
          {
            id: 'feature-003',
            title: 'Ticketing Section',
            children: Array.from({ length: 6 }, (_, i) => ({
              id: `task-ticket-${i}`,
              title: `Ticket Task ${i}`,
              children: [],
            })),
          },
        ],
      };

      mockBdDeps(complexTree);

      const result = await executeCommand('bd', ['deps', 'epic-001', '--recursive']);
      const tree = JSON.parse(result.stdout);

      expect(tree.children.length).toBe(3);
      expect(tree.children[0].children.length).toBe(10);
    });

    it('should maintain performance with large JSONL files', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      // Create 200 beads with notes
      for (let i = 0; i < 200; i++) {
        const bead = createImplementationBead(`Feature ${i}`, 'dev');
        bead.notes = Array.from({ length: 5 }, (_, j) => ({
          id: `note-${i}-${j}`,
          content: `Note ${j} for feature ${i}`,
          author: 'dev',
          timestamp: new Date().toISOString(),
        }));
        createBead(projectRoot, bead);
      }

      const { duration } = measurePerformance(() => readBeads(projectRoot));
      expect(duration).toBeLessThan(500);
    });

    it('should search beads efficiently by keyword', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      // Create varied beads
      const keywords = ['roster', 'schedule', 'tickets', 'design', 'api', 'animation'];
      keywords.forEach(keyword => {
        for (let i = 0; i < 20; i++) {
          const bead = createImplementationBead(`${keyword} feature ${i}`, 'dev', {
            tags: [keyword],
          });
          createBead(projectRoot, bead);
        }
      });

      const allBeads = readBeads(projectRoot);

      const { result: rosterBeads, duration } = measurePerformance(() =>
        allBeads.filter(b => b.title.includes('roster') || b.tags.includes('roster'))
      );

      expect(rosterBeads.length).toBe(20);
      expect(duration).toBeLessThan(50); // Filtering should be fast
    });

    it('should handle concurrent reads without corruption', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      // Create beads
      for (let i = 0; i < 50; i++) {
        createBead(projectRoot, createImplementationBead(`Feature ${i}`, 'dev'));
      }

      // Simulate concurrent reads
      const results = Array.from({ length: 10 }, () => readBeads(projectRoot));

      // All reads should return same data
      expect(results.every(r => r.length === 50)).toBe(true);
      expect(results.every(r => JSON.stringify(r) === JSON.stringify(results[0]))).toBe(true);
    });

    it('should calculate dependency tree depth correctly', async () => {
      const deepTree: BeadDependencyTree = {
        id: 'level-0',
        title: 'Root',
        children: [{
          id: 'level-1',
          title: 'Level 1',
          children: [{
            id: 'level-2',
            title: 'Level 2',
            children: [{
              id: 'level-3',
              title: 'Level 3',
              children: [{
                id: 'level-4',
                title: 'Level 4',
                children: [],
              }],
            }],
          }],
        }],
      };

      mockBdDeps(deepTree);

      const result = await executeCommand('bd', ['deps', 'level-0', '--recursive']);
      const tree = JSON.parse(result.stdout);

      // Calculate depth
      function getDepth(node: BeadDependencyTree): number {
        if (node.children.length === 0) return 1;
        return 1 + Math.max(...node.children.map(getDepth));
      }

      expect(getDepth(tree)).toBe(5);
    });
  });

  // ==========================================================================
  // 7. Error Handling and Edge Cases
  // ==========================================================================

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing .beads/ directory gracefully', async () => {
      mockBdCommand('Error: .beads/ directory not found. Run `bd init` first.', 1);

      const result = await executeCommand('bd', ['ready']);

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('not found');
    });

    it('should handle corrupted JSONL entries', () => {
      const projectRoot = createKnicksBeadsProject(testDir);
      const beadsPath = path.join(projectRoot, '.beads', 'beads.jsonl');

      // Write valid bead
      const validBead = createImplementationBead('Valid', 'dev');
      createBead(projectRoot, validBead);

      // Append corrupted line
      writeFileSync(beadsPath, '{invalid json}\n', { flag: 'a' });

      // Write another valid bead
      writeFileSync(beadsPath, JSON.stringify(createImplementationBead('Valid 2', 'dev')) + '\n', { flag: 'a' });

      // Reading should skip invalid entries
      const content = readFileSync(beadsPath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      const validBeads = lines.filter(line => {
        try {
          JSON.parse(line);
          return true;
        } catch {
          return false;
        }
      }).map(line => JSON.parse(line));

      expect(validBeads.length).toBe(2);
    });

    it('should handle bd CLI not installed', async () => {
      vi.mocked(executeCommand).mockRejectedValueOnce(new Error('Command not found: bd'));

      await expect(executeCommand('bd', ['ready'])).rejects.toThrow('Command not found');
    });

    it('should handle empty beads.jsonl', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const beads = readBeads(projectRoot);

      expect(beads).toEqual([]);
    });

    it('should handle missing notes.jsonl', () => {
      const projectRoot = createKnicksBeadsProject(testDir);
      const notesPath = path.join(projectRoot, '.beads', 'notes.jsonl');

      // Delete notes file
      if (existsSync(notesPath)) {
        rmSync(notesPath);
      }

      const bead = createImplementationBead('Test', 'dev');
      createBead(projectRoot, bead);

      const notes = readNotesForBead(projectRoot, bead.id);
      expect(notes).toEqual([]);
    });

    it('should handle special characters in bead content', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const bead = createImplementationBead('Feature with "quotes" and \\backslashes\\', 'dev', {
        notes: [{
          id: 'note-1',
          content: 'Contains newlines\nand\ttabs',
          author: 'dev',
          timestamp: new Date().toISOString(),
        }],
      });
      createBead(projectRoot, bead);

      const beads = readBeads(projectRoot);
      expect(beads[0].title).toContain('quotes');
      expect(beads[0].notes[0].content).toContain('\n');
    });

    it('should handle very long note content', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const longContent = 'A'.repeat(10000); // 10KB note
      const bead = createImplementationBead('Feature', 'dev');
      createBead(projectRoot, bead);

      addNoteToBead(projectRoot, bead.id, {
        id: 'long-note',
        content: longContent,
        author: 'dev',
        timestamp: new Date().toISOString(),
      });

      const notes = readNotesForBead(projectRoot, bead.id);
      expect(notes[0].content.length).toBe(10000);
    });

    it('should handle duplicate bead IDs gracefully', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const bead1 = createImplementationBead('First', 'dev', { id: 'duplicate-id' });
      const bead2 = createImplementationBead('Second', 'dev', { id: 'duplicate-id' });

      createBeads(projectRoot, [bead1, bead2]);

      const beads = readBeads(projectRoot);
      // Both should be stored (JSONL allows duplicates, application handles)
      expect(beads.length).toBe(2);
    });

    it('should handle Unicode content', () => {
      const projectRoot = createKnicksBeadsProject(testDir);

      const bead = createImplementationBead('Feature 🏀 球员卡', 'dev', {
        notes: [{
          id: 'unicode-note',
          content: '添加中文支持 🎯 émojis ñ ü ö',
          author: 'dev',
          timestamp: new Date().toISOString(),
        }],
      });
      createBead(projectRoot, bead);

      const beads = readBeads(projectRoot);
      expect(beads[0].title).toContain('🏀');
      expect(beads[0].notes[0].content).toContain('中文');
    });

    it('should recover from partial write', () => {
      const projectRoot = createKnicksBeadsProject(testDir);
      const beadsPath = path.join(projectRoot, '.beads', 'beads.jsonl');

      // Write complete bead
      const bead = createImplementationBead('Complete', 'dev');
      createBead(projectRoot, bead);

      // Write partial JSON (simulating crash)
      writeFileSync(beadsPath, '{"id":"partial","title":"Inco', { flag: 'a' });

      // Reading should handle partial content
      const content = readFileSync(beadsPath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      let validCount = 0;
      for (const line of lines) {
        try {
          JSON.parse(line);
          validCount++;
        } catch {
          // Skip invalid
        }
      }

      expect(validCount).toBe(1);
    });
  });
});
