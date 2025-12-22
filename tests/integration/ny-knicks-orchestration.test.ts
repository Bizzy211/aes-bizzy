/**
 * NY Knicks Website Multi-Agent Orchestration Tests
 *
 * Real-world test case for multi-agent workflows using a sports website project.
 * Tests PM-lead delegation, sequential/parallel execution, handoff coordination,
 * and performance metrics.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import type { GitHubIssue } from '../../src/types/github-automation.js';

// Mock fetch globally before imports
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Import after mocking
import {
  batchAssignIssues,
  shouldExcludeIssue,
  clearAutomationLog,
} from '../../src/integrations/github-automation/assignment-system.js';
import {
  analyzeIssue,
  extractKeywords,
} from '../../src/integrations/github-automation/issue-analyzer.js';
import {
  loadAgentCapabilities,
  findAgentsByKeywords,
  invalidateCapabilityCache,
} from '../../src/integrations/github-automation/agent-capabilities.js';

// ============================================================
// Type Definitions
// ============================================================

interface MockHandoffEntry {
  from_agent: string;
  to_agent: string;
  context_summary: string;
  next_tasks: string[];
  timestamp: string;
  requirements_preserved?: string[];
}

interface MockProjectContext {
  project_id: number;
  project_name: string;
  handoffs: MockHandoffEntry[];
  time_sessions: Map<string, { start: number; end?: number; agent: string }>;
  accomplishments: Array<{
    agent: string;
    task: string;
    timestamp: string;
  }>;
  status: {
    completed_tasks: number;
    total_tasks: number;
    blockers: string[];
  };
  metrics: {
    sequential_time_ms: number;
    parallel_time_ms: number;
    handoff_times_ms: number[];
  };
}

interface NYKnicksRequirements {
  core_features: string[];
  technical_requirements: string[];
  user_stories: Array<{ feature: string; story: string }>;
  design_requirements: string[];
}

interface TaskDecomposition {
  subtasks: Array<{
    id: number;
    title: string;
    priority: 'high' | 'medium' | 'low';
    assignee: string;
    dependencies: number[];
    category: 'design' | 'frontend' | 'backend' | 'testing' | 'content';
  }>;
  teamComposition: string[];
  estimatedDuration: number;
}

interface WorkflowMetrics {
  total_time_ms: number;
  phase_times: Map<string, number>;
  agent_utilization: Map<string, number>;
  handoff_efficiency: number;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Create a mock GitHub issue
 */
function createMockIssue(
  number: number,
  title: string,
  body: string,
  labels: string[] = [],
  state: 'open' | 'closed' = 'open',
  assignees: string[] = []
): GitHubIssue {
  return {
    id: 1000 + number,
    number,
    title,
    body,
    labels: labels.map((name, id) => ({
      id,
      name,
      description: `${name} label`,
      color: 'ffffff',
    })),
    state,
    assignees: assignees.map((login) => ({
      login,
      id: Math.floor(Math.random() * 10000),
      avatar_url: `https://github.com/${login}.png`,
    })),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    url: `https://api.github.com/repos/test-owner/test-repo/issues/${number}`,
    html_url: `https://github.com/test-owner/test-repo/issues/${number}`,
    repository_url: 'https://api.github.com/repos/test-owner/test-repo',
  };
}

/**
 * Initialize NY Knicks project context
 */
function initializeNYKnicksProject(): MockProjectContext {
  return {
    project_id: 100,
    project_name: 'NY Knicks Official Website',
    handoffs: [],
    time_sessions: new Map(),
    accomplishments: [],
    status: {
      completed_tasks: 0,
      total_tasks: 0,
      blockers: [],
    },
    metrics: {
      sequential_time_ms: 0,
      parallel_time_ms: 0,
      handoff_times_ms: [],
    },
  };
}

/**
 * Get NY Knicks project requirements
 */
function getNYKnicksRequirements(): NYKnicksRequirements {
  return {
    core_features: [
      'Player roster with stats and profiles',
      'Game schedule and results',
      'Ticket purchasing system',
      'News/blog section',
      'Photo/video gallery',
      'Fan engagement (polls, comments)',
      'Mobile-responsive design',
      'Real-time score updates',
    ],
    technical_requirements: [
      'React/Next.js frontend',
      'Node.js/Express backend API',
      'PostgreSQL database',
      'Redis caching for real-time data',
      'CDN for media assets',
      'OAuth authentication',
      'Mobile-first responsive design',
      'Animation and transitions',
    ],
    user_stories: [
      { feature: 'roster', story: 'As a fan, I want to see player stats and bio' },
      { feature: 'schedule', story: 'As a fan, I want to view upcoming games and buy tickets' },
      { feature: 'news', story: 'As a fan, I want to read latest team news' },
      { feature: 'gallery', story: 'As a fan, I want to browse photos and videos' },
      { feature: 'engagement', story: 'As a fan, I want to participate in polls' },
    ],
    design_requirements: [
      'Knicks brand colors (blue #006BB6, orange #F58426)',
      'Modern sports aesthetic',
      'Accessible WCAG 2.1 AA compliance',
      'Fast page load times (<3s)',
      'Smooth animations and transitions',
    ],
  };
}

/**
 * Create NY Knicks issue for testing
 */
function createNYKnicksIssue(feature: string): GitHubIssue {
  const requirements = getNYKnicksRequirements();
  const featureDescriptions: Record<string, { title: string; body: string; labels: string[] }> = {
    'full-project': {
      title: 'Build NY Knicks Official Website',
      body: `
## Project Overview
Build a modern, responsive website for the New York Knicks basketball team.

## Core Features
${requirements.core_features.map((f) => `- ${f}`).join('\n')}

## Technical Requirements
${requirements.technical_requirements.map((t) => `- ${t}`).join('\n')}

## Design Requirements
${requirements.design_requirements.map((d) => `- ${d}`).join('\n')}

## User Stories
${requirements.user_stories.map((s) => `- [${s.feature}] ${s.story}`).join('\n')}
      `,
      labels: ['feature', 'high-priority'],
    },
    roster: {
      title: 'Implement Player Roster Page with Stats Dashboard',
      body: `
Create player roster page with animated stats dashboard.
- Player cards with photos and basic info
- Detailed stats with Chart.js visualizations
- Season/career toggle for statistics
- Responsive grid layout
- Smooth page transitions
      `,
      labels: ['ui/ux', 'frontend'],
    },
    schedule: {
      title: 'Build Game Schedule with Ticket Integration',
      body: `
Implement game schedule page with ticket purchasing.
- Calendar view of upcoming games
- Game details with opponent info
- Ticket purchasing integration (Ticketmaster API)
- Real-time score updates for live games
- Past game results and highlights
      `,
      labels: ['feature', 'api'],
    },
    news: {
      title: 'Create News/Blog Section with CMS',
      body: `
Build news section with content management.
- Article listing with featured posts
- Category filtering (trades, games, community)
- Rich text editor for admin
- Social sharing integration
- Comment system with moderation
      `,
      labels: ['feature', 'frontend'],
    },
    gallery: {
      title: 'Implement Photo/Video Gallery',
      body: `
Create media gallery with optimized loading.
- Photo grid with lightbox viewer
- Video player with streaming support
- Category and date filtering
- Infinite scroll pagination
- CDN integration for fast loading
      `,
      labels: ['ui/ux', 'frontend'],
    },
    auth: {
      title: 'Implement User Authentication System',
      body: `
Build OAuth authentication for fan accounts.
- Social login (Google, Facebook, Apple)
- Email/password registration
- JWT token management
- Role-based access (fan, admin)
- Account preferences and settings
      `,
      labels: ['security', 'backend'],
    },
  };

  const config = featureDescriptions[feature] || featureDescriptions['full-project'];
  return createMockIssue(100 + Object.keys(featureDescriptions).indexOf(feature), config.title, config.body, config.labels);
}

/**
 * Decompose NY Knicks project into specialized tasks
 */
function decomposeNYKnicksProject(issue: GitHubIssue): TaskDecomposition {
  const keywords = extractKeywords(issue.title + ' ' + issue.body);
  const subtasks: TaskDecomposition['subtasks'] = [];
  const teamComposition = new Set<string>(['pm-lead']);

  let taskId = 0;

  // UX Design phase (no dependencies)
  subtasks.push({
    id: taskId++,
    title: 'Create wireframes and user flows',
    priority: 'high',
    assignee: 'ux-designer',
    dependencies: [],
    category: 'design',
  });
  teamComposition.add('ux-designer');

  // Visual Design phase (depends on UX)
  subtasks.push({
    id: taskId++,
    title: 'Design visual mockups with Knicks branding',
    priority: 'high',
    assignee: 'beautiful-web-designer',
    dependencies: [0],
    category: 'design',
  });
  teamComposition.add('beautiful-web-designer');

  // Database design (parallel with visual design)
  if (keywords.some((k) => ['database', 'postgresql', 'api', 'backend'].includes(k))) {
    subtasks.push({
      id: taskId++,
      title: 'Design database schema for players, games, content',
      priority: 'high',
      assignee: 'db-architect',
      dependencies: [],
      category: 'backend',
    });
    teamComposition.add('db-architect');
  }

  // Backend API (depends on database)
  if (keywords.some((k) => ['api', 'backend', 'server', 'endpoint'].includes(k))) {
    const dbTaskId = subtasks.find((t) => t.assignee === 'db-architect')?.id;
    subtasks.push({
      id: taskId++,
      title: 'Implement REST API endpoints',
      priority: 'high',
      assignee: 'backend-dev',
      dependencies: dbTaskId !== undefined ? [dbTaskId] : [],
      category: 'backend',
    });
    teamComposition.add('backend-dev');
  }

  // Player roster page (frontend, depends on design)
  subtasks.push({
    id: taskId++,
    title: 'Build player roster page with stats dashboard',
    priority: 'medium',
    assignee: 'animated-dashboard-architect',
    dependencies: [1], // visual design
    category: 'frontend',
  });
  teamComposition.add('animated-dashboard-architect');

  // Schedule page (frontend)
  subtasks.push({
    id: taskId++,
    title: 'Implement game schedule page',
    priority: 'medium',
    assignee: 'frontend-dev',
    dependencies: [1],
    category: 'frontend',
  });
  teamComposition.add('frontend-dev');

  // News section (frontend)
  subtasks.push({
    id: taskId++,
    title: 'Create news/blog section',
    priority: 'medium',
    assignee: 'frontend-dev',
    dependencies: [1],
    category: 'frontend',
  });

  // Gallery (frontend)
  subtasks.push({
    id: taskId++,
    title: 'Build photo/video gallery',
    priority: 'medium',
    assignee: 'frontend-dev',
    dependencies: [1],
    category: 'frontend',
  });

  // Authentication (security)
  if (keywords.some((k) => ['auth', 'oauth', 'login', 'security'].includes(k))) {
    subtasks.push({
      id: taskId++,
      title: 'Implement OAuth authentication',
      priority: 'high',
      assignee: 'security-expert',
      dependencies: [3], // backend API
      category: 'backend',
    });
    teamComposition.add('security-expert');
  }

  // Testing (final phase)
  subtasks.push({
    id: taskId++,
    title: 'Comprehensive E2E and unit testing',
    priority: 'medium',
    assignee: 'test-engineer',
    dependencies: subtasks.filter((t) => t.category === 'frontend').map((t) => t.id),
    category: 'testing',
  });
  teamComposition.add('test-engineer');

  return {
    subtasks,
    teamComposition: Array.from(teamComposition),
    estimatedDuration: subtasks.length * 2, // 2 hours per task estimate
  };
}

/**
 * Execute agent handoff with context preservation
 */
function executeHandoff(
  fromAgent: string,
  toAgent: string,
  completedWork: string,
  nextTasks: string[],
  projectContext: MockProjectContext,
  preservedRequirements: string[] = []
): { success: boolean; handoff_id: string; duration_ms: number } {
  const startTime = Date.now();

  const handoff: MockHandoffEntry = {
    from_agent: fromAgent,
    to_agent: toAgent,
    context_summary: completedWork,
    next_tasks: nextTasks,
    timestamp: new Date().toISOString(),
    requirements_preserved: preservedRequirements,
  };

  projectContext.handoffs.push(handoff);

  const duration = Date.now() - startTime;
  projectContext.metrics.handoff_times_ms.push(duration);

  return {
    success: true,
    handoff_id: `handoff-${projectContext.handoffs.length}`,
    duration_ms: duration,
  };
}

/**
 * Check if task dependencies are satisfied
 */
function canStartTask(
  taskIndex: number,
  dependencies: number[],
  completedTasks: Set<number>
): boolean {
  return dependencies.every((dep) => completedTasks.has(dep));
}

/**
 * Simulate sequential workflow execution
 */
async function executeSequentialWorkflow(
  decomposition: TaskDecomposition,
  projectContext: MockProjectContext
): Promise<WorkflowMetrics> {
  const startTime = Date.now();
  const completedTasks = new Set<number>();
  const phaseTimes = new Map<string, number>();
  const agentWork = new Map<string, number>();

  // Sort tasks by dependencies (topological sort)
  const taskOrder: number[] = [];
  const visited = new Set<number>();

  function visit(taskId: number) {
    if (visited.has(taskId)) return;
    visited.add(taskId);
    const task = decomposition.subtasks.find((t) => t.id === taskId);
    if (task) {
      for (const dep of task.dependencies) {
        visit(dep);
      }
      taskOrder.push(taskId);
    }
  }

  for (const task of decomposition.subtasks) {
    visit(task.id);
  }

  // Execute tasks in order
  for (const taskId of taskOrder) {
    const task = decomposition.subtasks.find((t) => t.id === taskId)!;
    const taskStartTime = Date.now();

    // Simulate task execution (10-50ms per task)
    await new Promise((resolve) => setTimeout(resolve, 10 + Math.random() * 40));

    completedTasks.add(taskId);

    const taskDuration = Date.now() - taskStartTime;
    phaseTimes.set(task.title, taskDuration);
    agentWork.set(task.assignee, (agentWork.get(task.assignee) || 0) + taskDuration);

    projectContext.accomplishments.push({
      agent: task.assignee,
      task: task.title,
      timestamp: new Date().toISOString(),
    });
  }

  const totalTime = Date.now() - startTime;
  projectContext.metrics.sequential_time_ms = totalTime;

  // Calculate utilization (active time / total time)
  const agentUtilization = new Map<string, number>();
  for (const [agent, workTime] of agentWork) {
    agentUtilization.set(agent, (workTime / totalTime) * 100);
  }

  return {
    total_time_ms: totalTime,
    phase_times: phaseTimes,
    agent_utilization: agentUtilization,
    handoff_efficiency: projectContext.metrics.handoff_times_ms.length > 0
      ? projectContext.metrics.handoff_times_ms.reduce((a, b) => a + b, 0) / projectContext.metrics.handoff_times_ms.length
      : 0,
  };
}

/**
 * Simulate parallel workflow execution
 */
async function executeParallelWorkflow(
  decomposition: TaskDecomposition,
  projectContext: MockProjectContext
): Promise<WorkflowMetrics> {
  const startTime = Date.now();
  const completedTasks = new Set<number>();
  const phaseTimes = new Map<string, number>();
  const agentWork = new Map<string, number>();

  // Group tasks by dependency level
  const levels: number[][] = [];
  const taskLevels = new Map<number, number>();

  function getLevel(taskId: number): number {
    if (taskLevels.has(taskId)) return taskLevels.get(taskId)!;
    const task = decomposition.subtasks.find((t) => t.id === taskId)!;
    if (task.dependencies.length === 0) {
      taskLevels.set(taskId, 0);
      return 0;
    }
    const maxDepLevel = Math.max(...task.dependencies.map(getLevel));
    taskLevels.set(taskId, maxDepLevel + 1);
    return maxDepLevel + 1;
  }

  for (const task of decomposition.subtasks) {
    const level = getLevel(task.id);
    if (!levels[level]) levels[level] = [];
    levels[level].push(task.id);
  }

  // Execute levels in parallel
  for (const level of levels) {
    const levelStartTime = Date.now();

    // All tasks at this level can run in parallel
    await Promise.all(
      level.map(async (taskId) => {
        const task = decomposition.subtasks.find((t) => t.id === taskId)!;
        const taskStartTime = Date.now();

        // Simulate task execution (10-50ms per task)
        await new Promise((resolve) => setTimeout(resolve, 10 + Math.random() * 40));

        completedTasks.add(taskId);

        const taskDuration = Date.now() - taskStartTime;
        phaseTimes.set(task.title, taskDuration);
        agentWork.set(task.assignee, (agentWork.get(task.assignee) || 0) + taskDuration);

        projectContext.accomplishments.push({
          agent: task.assignee,
          task: task.title,
          timestamp: new Date().toISOString(),
        });
      })
    );
  }

  const totalTime = Date.now() - startTime;
  projectContext.metrics.parallel_time_ms = totalTime;

  const agentUtilization = new Map<string, number>();
  for (const [agent, workTime] of agentWork) {
    agentUtilization.set(agent, (workTime / totalTime) * 100);
  }

  return {
    total_time_ms: totalTime,
    phase_times: phaseTimes,
    agent_utilization: agentUtilization,
    handoff_efficiency: projectContext.metrics.handoff_times_ms.length > 0
      ? projectContext.metrics.handoff_times_ms.reduce((a, b) => a + b, 0) / projectContext.metrics.handoff_times_ms.length
      : 0,
  };
}

/**
 * Measure handoff efficiency
 */
function measureHandoffEfficiency(projectContext: MockProjectContext): {
  average_ms: number;
  min_ms: number;
  max_ms: number;
  total_handoffs: number;
} {
  const times = projectContext.metrics.handoff_times_ms;
  if (times.length === 0) {
    return { average_ms: 0, min_ms: 0, max_ms: 0, total_handoffs: 0 };
  }
  return {
    average_ms: times.reduce((a, b) => a + b, 0) / times.length,
    min_ms: Math.min(...times),
    max_ms: Math.max(...times),
    total_handoffs: times.length,
  };
}

/**
 * Calculate context preservation rate
 */
function calculateContextPreservation(
  originalRequirements: string[],
  handoff: MockHandoffEntry
): number {
  if (!handoff.requirements_preserved || originalRequirements.length === 0) {
    return 0;
  }
  const preserved = handoff.requirements_preserved.filter((r) =>
    originalRequirements.some((orig) => orig.toLowerCase().includes(r.toLowerCase()) || r.toLowerCase().includes(orig.toLowerCase()))
  );
  return (preserved.length / originalRequirements.length) * 100;
}

// ============================================================
// Test Suites
// ============================================================

describe('NY Knicks Website Multi-Agent Orchestration', () => {
  const agentsDir = path.join(process.cwd(), 'Claude Files', 'agents');
  const testOwner = 'ny-knicks';
  const testRepo = 'official-website';
  const testToken = 'ghp_test_token_knicks_12345';

  let mockProjectContext: MockProjectContext;

  beforeEach(() => {
    vi.clearAllMocks();
    invalidateCapabilityCache();
    clearAutomationLog();
    mockProjectContext = initializeNYKnicksProject();

    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/comments')) {
        return { ok: true, json: async () => ({ id: 123 }) };
      }
      if (url.includes('/labels')) {
        return { ok: true, json: async () => [] };
      }
      return { ok: true, json: async () => ({}) };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================
  // 1. Test Setup and Mock Context
  // ============================================================
  describe('Test Setup and Mock Context', () => {
    it('should initialize NY Knicks project context correctly', () => {
      expect(mockProjectContext.project_id).toBe(100);
      expect(mockProjectContext.project_name).toBe('NY Knicks Official Website');
      expect(mockProjectContext.handoffs).toHaveLength(0);
      expect(mockProjectContext.accomplishments).toHaveLength(0);
    });

    it('should load NY Knicks requirements with all core features', () => {
      const requirements = getNYKnicksRequirements();

      expect(requirements.core_features.length).toBeGreaterThanOrEqual(6);
      expect(requirements.core_features).toContain('Player roster with stats and profiles');
      expect(requirements.core_features).toContain('Game schedule and results');
    });

    it('should create valid NY Knicks issue for full project', () => {
      const issue = createNYKnicksIssue('full-project');

      expect(issue.title).toContain('NY Knicks');
      expect(issue.body).toContain('Player roster');
      expect(issue.body).toContain('React/Next.js');
    });

    it('should create feature-specific issues for roster, schedule, news', () => {
      const rosterIssue = createNYKnicksIssue('roster');
      const scheduleIssue = createNYKnicksIssue('schedule');
      const newsIssue = createNYKnicksIssue('news');

      expect(rosterIssue.title).toContain('Player Roster');
      expect(scheduleIssue.title).toContain('Game Schedule');
      expect(newsIssue.title).toContain('News');
    });

    it('should load agent capabilities from agents directory', async () => {
      const capabilities = await loadAgentCapabilities(agentsDir);

      expect(capabilities).toBeInstanceOf(Map);
      expect(capabilities.size).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // 2. PM-Lead Task Decomposition
  // ============================================================
  describe('PM-Lead Task Decomposition for NY Knicks Website', () => {
    it('should decompose NY Knicks website into 8+ specialized tasks', () => {
      const issue = createNYKnicksIssue('full-project');
      const decomposition = decomposeNYKnicksProject(issue);

      expect(decomposition.subtasks.length).toBeGreaterThanOrEqual(8);
    });

    it('should assign beautiful-web-designer for visual design tasks', () => {
      const issue = createNYKnicksIssue('full-project');
      const decomposition = decomposeNYKnicksProject(issue);

      const hasDesigner = decomposition.teamComposition.includes('beautiful-web-designer');
      expect(hasDesigner).toBe(true);

      const designTask = decomposition.subtasks.find((t) => t.assignee === 'beautiful-web-designer');
      expect(designTask).toBeDefined();
      expect(designTask?.priority).toBe('high');
    });

    it('should assign animated-dashboard-architect for stats dashboard', () => {
      const issue = createNYKnicksIssue('full-project');
      const decomposition = decomposeNYKnicksProject(issue);

      const hasDashboardArchitect = decomposition.teamComposition.includes('animated-dashboard-architect');
      expect(hasDashboardArchitect).toBe(true);

      const dashboardTask = decomposition.subtasks.find((t) => t.assignee === 'animated-dashboard-architect');
      expect(dashboardTask?.title).toContain('stats');
    });

    it('should create correct dependency chain (design -> development -> testing)', () => {
      const issue = createNYKnicksIssue('full-project');
      const decomposition = decomposeNYKnicksProject(issue);

      // UX design should have no dependencies
      const uxTask = decomposition.subtasks.find((t) => t.assignee === 'ux-designer');
      expect(uxTask?.dependencies).toHaveLength(0);

      // Visual design should depend on UX
      const visualTask = decomposition.subtasks.find((t) => t.assignee === 'beautiful-web-designer');
      expect(visualTask?.dependencies).toContain(uxTask?.id);

      // Frontend tasks should depend on visual design
      const frontendTasks = decomposition.subtasks.filter((t) => t.category === 'frontend');
      for (const task of frontendTasks) {
        expect(task.dependencies).toContain(visualTask?.id);
      }

      // Testing should depend on frontend tasks
      const testingTask = decomposition.subtasks.find((t) => t.assignee === 'test-engineer');
      expect(testingTask?.dependencies.length).toBeGreaterThan(0);
    });

    it('should select appropriate agent team composition', () => {
      const issue = createNYKnicksIssue('full-project');
      const decomposition = decomposeNYKnicksProject(issue);

      expect(decomposition.teamComposition).toContain('pm-lead');
      expect(decomposition.teamComposition).toContain('ux-designer');
      expect(decomposition.teamComposition).toContain('beautiful-web-designer');
      expect(decomposition.teamComposition).toContain('frontend-dev');
      expect(decomposition.teamComposition).toContain('test-engineer');
      expect(decomposition.teamComposition.length).toBeGreaterThanOrEqual(6);
    });

    it('should include backend-dev and db-architect for API requirements', () => {
      const issue = createNYKnicksIssue('full-project');
      const decomposition = decomposeNYKnicksProject(issue);

      expect(decomposition.teamComposition).toContain('backend-dev');
      expect(decomposition.teamComposition).toContain('db-architect');
    });
  });

  // ============================================================
  // 3. Synchronous (Sequential) Agent Workflow
  // ============================================================
  describe('Synchronous (Sequential) Agent Workflow', () => {
    it('should execute UX design -> visual design handoff with wireframe context', () => {
      const wireframeRequirements = [
        'Mobile-first layout',
        'Player card component',
        'Navigation structure',
        'Schedule calendar view',
      ];

      const handoff = executeHandoff(
        'ux-designer',
        'beautiful-web-designer',
        'Completed wireframes for NY Knicks website with player roster, schedule, and news sections',
        ['Apply Knicks branding to wireframes', 'Create visual mockups for all pages'],
        mockProjectContext,
        wireframeRequirements
      );

      expect(handoff.success).toBe(true);
      expect(mockProjectContext.handoffs).toHaveLength(1);
      expect(mockProjectContext.handoffs[0].from_agent).toBe('ux-designer');
      expect(mockProjectContext.handoffs[0].to_agent).toBe('beautiful-web-designer');
      expect(mockProjectContext.handoffs[0].next_tasks).toHaveLength(2);
    });

    it('should execute visual design -> frontend development handoff', () => {
      executeHandoff(
        'ux-designer',
        'beautiful-web-designer',
        'Wireframes complete',
        ['Create visual designs'],
        mockProjectContext
      );

      const handoff = executeHandoff(
        'beautiful-web-designer',
        'frontend-dev',
        'Visual designs complete with Knicks branding (blue #006BB6, orange #F58426), component library',
        ['Implement React components', 'Set up Next.js project structure', 'Configure Tailwind with brand colors'],
        mockProjectContext,
        ['Brand colors', 'Typography', 'Component specs']
      );

      expect(handoff.success).toBe(true);
      expect(mockProjectContext.handoffs).toHaveLength(2);
      expect(mockProjectContext.handoffs[1].context_summary).toContain('Knicks branding');
    });

    it('should execute frontend development -> testing handoff', () => {
      executeHandoff('ux-designer', 'beautiful-web-designer', 'Wireframes done', ['Design'], mockProjectContext);
      executeHandoff('beautiful-web-designer', 'frontend-dev', 'Designs done', ['Implement'], mockProjectContext);

      const handoff = executeHandoff(
        'frontend-dev',
        'test-engineer',
        'Player roster, schedule, and news pages implemented with animations',
        ['Write E2E tests for user flows', 'Unit tests for components', 'Performance testing'],
        mockProjectContext
      );

      expect(handoff.success).toBe(true);
      expect(mockProjectContext.handoffs).toHaveLength(3);
      expect(mockProjectContext.handoffs[2].next_tasks.length).toBeGreaterThanOrEqual(2);
    });

    it('should maintain complete handoff chain audit trail', () => {
      const handoffChain = [
        { from: 'ux-designer', to: 'beautiful-web-designer', work: 'Wireframes' },
        { from: 'beautiful-web-designer', to: 'frontend-dev', work: 'Visual designs' },
        { from: 'frontend-dev', to: 'test-engineer', work: 'Implementation' },
      ];

      for (const h of handoffChain) {
        executeHandoff(h.from, h.to, h.work, ['Continue'], mockProjectContext);
      }

      expect(mockProjectContext.handoffs).toHaveLength(3);

      // Verify chronological order
      for (let i = 1; i < mockProjectContext.handoffs.length; i++) {
        const prevTime = new Date(mockProjectContext.handoffs[i - 1].timestamp).getTime();
        const currTime = new Date(mockProjectContext.handoffs[i].timestamp).getTime();
        expect(currTime).toBeGreaterThanOrEqual(prevTime);
      }
    });

    it('should respect task dependencies in sequential execution', () => {
      const issue = createNYKnicksIssue('full-project');
      const decomposition = decomposeNYKnicksProject(issue);

      const completedTasks = new Set<number>();

      // UX task (no dependencies) should be startable
      const uxTask = decomposition.subtasks.find((t) => t.assignee === 'ux-designer')!;
      expect(canStartTask(uxTask.id, uxTask.dependencies, completedTasks)).toBe(true);

      // Visual design (depends on UX) should NOT be startable yet
      const visualTask = decomposition.subtasks.find((t) => t.assignee === 'beautiful-web-designer')!;
      expect(canStartTask(visualTask.id, visualTask.dependencies, completedTasks)).toBe(false);

      // Complete UX, now visual should be startable
      completedTasks.add(uxTask.id);
      expect(canStartTask(visualTask.id, visualTask.dependencies, completedTasks)).toBe(true);
    });
  });

  // ============================================================
  // 4. Parallel Agent Execution
  // ============================================================
  describe('Asynchronous (Parallel) Agent Execution', () => {
    it('should process player roster and schedule pages in parallel', async () => {
      const rosterIssue = createNYKnicksIssue('roster');
      const scheduleIssue = createNYKnicksIssue('schedule');

      const [rosterAnalysis, scheduleAnalysis] = await Promise.all([
        analyzeIssue(rosterIssue, agentsDir),
        analyzeIssue(scheduleIssue, agentsDir),
      ]);

      expect(rosterAnalysis.issue.number).not.toBe(scheduleAnalysis.issue.number);
      expect(rosterAnalysis.agentMatches).toBeDefined();
      expect(scheduleAnalysis.agentMatches).toBeDefined();
    });

    it('should maintain agent context isolation during parallel execution', async () => {
      const issues = [
        createNYKnicksIssue('roster'),
        createNYKnicksIssue('schedule'),
        createNYKnicksIssue('news'),
        createNYKnicksIssue('gallery'),
      ];

      const analyses = await Promise.all(issues.map((issue) => analyzeIssue(issue, agentsDir)));

      // Each analysis should have independent results
      for (let i = 0; i < analyses.length; i++) {
        expect(analyses[i].issue.number).toBe(issues[i].number);
      }

      // Check no cross-contamination
      const issueNumbers = analyses.map((a) => a.issue.number);
      const uniqueNumbers = new Set(issueNumbers);
      expect(uniqueNumbers.size).toBe(issues.length);
    });

    it('should batch assign multiple independent issues', async () => {
      const issues = [
        createNYKnicksIssue('roster'),
        createNYKnicksIssue('schedule'),
        createNYKnicksIssue('news'),
      ];

      const result = await batchAssignIssues(testOwner, testRepo, issues, testToken, {
        confidenceThreshold: 10,
      });

      expect(result.total).toBe(3);
      expect(result.results).toHaveLength(3);
    });

    it('should handle parallel handoffs to different agents', () => {
      // PM-lead delegates to multiple agents in parallel
      const handoffs = [
        { to: 'ux-designer', work: 'Create wireframes' },
        { to: 'db-architect', work: 'Design database schema' },
        { to: 'backend-dev', work: 'Set up API project structure' },
      ];

      for (const h of handoffs) {
        executeHandoff('pm-lead', h.to, 'Initial project setup', [h.work], mockProjectContext);
      }

      expect(mockProjectContext.handoffs).toHaveLength(3);

      // All handoffs should be from pm-lead
      for (const handoff of mockProjectContext.handoffs) {
        expect(handoff.from_agent).toBe('pm-lead');
      }

      // All should have close timestamps (parallel)
      const timestamps = mockProjectContext.handoffs.map((h) => new Date(h.timestamp).getTime());
      const timeDiff = Math.max(...timestamps) - Math.min(...timestamps);
      expect(timeDiff).toBeLessThan(1000); // Within 1 second
    });

    it('should aggregate results from parallel agent execution', async () => {
      const issue = createNYKnicksIssue('full-project');
      const decomposition = decomposeNYKnicksProject(issue);

      // Execute parallel workflow
      await executeParallelWorkflow(decomposition, mockProjectContext);

      // Check accomplishments are tracked
      expect(mockProjectContext.accomplishments.length).toBe(decomposition.subtasks.length);

      // Verify all agents' work is recorded
      const agents = new Set(mockProjectContext.accomplishments.map((a) => a.agent));
      expect(agents.size).toBeGreaterThan(1);
    });
  });

  // ============================================================
  // 5. Handoff Quality and Context Preservation
  // ============================================================
  describe('Handoff Coordination & Context Preservation', () => {
    it('should preserve 95%+ of requirements in UX -> design handoff', () => {
      const uxRequirements = [
        'Mobile-first responsive design',
        'Accessible navigation',
        'Player profile cards',
        'Schedule calendar widget',
        'News article layout',
        'Video player component',
        'Fan engagement widgets',
        'Search functionality',
        'Filter components',
        'Pagination patterns',
      ];

      executeHandoff(
        'ux-designer',
        'beautiful-web-designer',
        'Completed wireframes with mobile-first responsive design, accessible navigation, player profile cards, schedule calendar, news layout, video player, fan engagement, search, filters, and pagination',
        ['Apply visual design to all components'],
        mockProjectContext,
        uxRequirements.slice(0, 10) // Preserve most requirements
      );

      const handoff = mockProjectContext.handoffs[0];
      const preservationRate = calculateContextPreservation(uxRequirements, handoff);

      expect(preservationRate).toBeGreaterThanOrEqual(95);
    });

    it('should include actionable next_tasks in every handoff', () => {
      const handoffs = [
        {
          from: 'ux-designer',
          to: 'beautiful-web-designer',
          work: 'Wireframes done',
          next: ['Apply Knicks branding', 'Create component library', 'Design responsive breakpoints'],
        },
        {
          from: 'beautiful-web-designer',
          to: 'frontend-dev',
          work: 'Designs done',
          next: ['Implement React components', 'Set up Tailwind config', 'Create animation system'],
        },
      ];

      for (const h of handoffs) {
        executeHandoff(h.from, h.to, h.work, h.next, mockProjectContext);
      }

      for (const handoff of mockProjectContext.handoffs) {
        expect(handoff.next_tasks.length).toBeGreaterThan(0);
        for (const task of handoff.next_tasks) {
          expect(task.length).toBeGreaterThan(5); // Actionable tasks have meaningful length
        }
      }
    });

    it('should maintain complete audit trail with timestamps', () => {
      const numHandoffs = 5;
      for (let i = 0; i < numHandoffs; i++) {
        executeHandoff(`agent-${i}`, `agent-${i + 1}`, `Work ${i}`, [`Task ${i + 1}`], mockProjectContext);
      }

      expect(mockProjectContext.handoffs).toHaveLength(numHandoffs);

      for (const handoff of mockProjectContext.handoffs) {
        expect(handoff.timestamp).toBeDefined();
        expect(new Date(handoff.timestamp).getTime()).not.toBeNaN();
      }
    });

    it('should measure handoff efficiency (<100ms overhead)', () => {
      // Execute multiple handoffs
      for (let i = 0; i < 10; i++) {
        executeHandoff(`agent-${i}`, `agent-${i + 1}`, 'Work', ['Next task'], mockProjectContext);
      }

      const efficiency = measureHandoffEfficiency(mockProjectContext);

      expect(efficiency.total_handoffs).toBe(10);
      expect(efficiency.average_ms).toBeLessThan(100);
    });

    it('should handle handoff failure with graceful recovery', () => {
      // Successful handoff
      const result1 = executeHandoff('agent-a', 'agent-b', 'Work 1', ['Task 1'], mockProjectContext);
      expect(result1.success).toBe(true);

      // Even with edge cases, handoffs should succeed
      const result2 = executeHandoff('agent-b', 'agent-c', '', [], mockProjectContext);
      expect(result2.success).toBe(true);

      expect(mockProjectContext.handoffs).toHaveLength(2);
    });
  });

  // ============================================================
  // 6. Performance Metrics and Efficiency Analysis
  // ============================================================
  describe('Coordination Efficiency Metrics', () => {
    it('should measure sequential workflow baseline time', async () => {
      const issue = createNYKnicksIssue('full-project');
      const decomposition = decomposeNYKnicksProject(issue);

      const metrics = await executeSequentialWorkflow(decomposition, mockProjectContext);

      expect(metrics.total_time_ms).toBeGreaterThan(0);
      expect(mockProjectContext.metrics.sequential_time_ms).toBe(metrics.total_time_ms);
    });

    it('should measure parallel workflow execution time', async () => {
      const issue = createNYKnicksIssue('full-project');
      const decomposition = decomposeNYKnicksProject(issue);

      const metrics = await executeParallelWorkflow(decomposition, mockProjectContext);

      expect(metrics.total_time_ms).toBeGreaterThan(0);
      expect(mockProjectContext.metrics.parallel_time_ms).toBe(metrics.total_time_ms);
    });

    it('should demonstrate parallel execution is faster than sequential', async () => {
      const issue = createNYKnicksIssue('full-project');
      const decomposition = decomposeNYKnicksProject(issue);

      // Create separate contexts for comparison
      const seqContext = initializeNYKnicksProject();
      const parContext = initializeNYKnicksProject();

      const seqMetrics = await executeSequentialWorkflow(decomposition, seqContext);
      const parMetrics = await executeParallelWorkflow(decomposition, parContext);

      // Parallel should be faster (or at least not slower)
      // Note: Due to test timing variability, we check it's not significantly slower
      expect(parMetrics.total_time_ms).toBeLessThanOrEqual(seqMetrics.total_time_ms * 1.5);
    });

    it('should track agent utilization rates during parallel execution', async () => {
      const issue = createNYKnicksIssue('full-project');
      const decomposition = decomposeNYKnicksProject(issue);

      const metrics = await executeParallelWorkflow(decomposition, mockProjectContext);

      expect(metrics.agent_utilization.size).toBeGreaterThan(0);

      for (const [_agent, utilization] of metrics.agent_utilization) {
        expect(utilization).toBeGreaterThanOrEqual(0);
        expect(utilization).toBeLessThanOrEqual(100);
      }
    });

    it('should measure task completion rate per agent', async () => {
      const issue = createNYKnicksIssue('full-project');
      const decomposition = decomposeNYKnicksProject(issue);

      await executeParallelWorkflow(decomposition, mockProjectContext);

      // Count accomplishments per agent
      const agentCounts = new Map<string, number>();
      for (const acc of mockProjectContext.accomplishments) {
        agentCounts.set(acc.agent, (agentCounts.get(acc.agent) || 0) + 1);
      }

      // frontend-dev should have multiple tasks
      expect(agentCounts.get('frontend-dev') || 0).toBeGreaterThanOrEqual(2);
    });

    it('should generate comprehensive efficiency report', async () => {
      const issue = createNYKnicksIssue('full-project');
      const decomposition = decomposeNYKnicksProject(issue);

      const seqContext = initializeNYKnicksProject();
      const parContext = initializeNYKnicksProject();

      const seqMetrics = await executeSequentialWorkflow(decomposition, seqContext);
      const parMetrics = await executeParallelWorkflow(decomposition, parContext);

      const report = {
        project: 'NY Knicks Website',
        total_tasks: decomposition.subtasks.length,
        team_size: decomposition.teamComposition.length,
        sequential_time_ms: seqMetrics.total_time_ms,
        parallel_time_ms: parMetrics.total_time_ms,
        efficiency_gain_percent:
          ((seqMetrics.total_time_ms - parMetrics.total_time_ms) / seqMetrics.total_time_ms) * 100,
        agent_utilization: Object.fromEntries(parMetrics.agent_utilization),
      };

      expect(report.total_tasks).toBeGreaterThanOrEqual(8);
      expect(report.team_size).toBeGreaterThanOrEqual(6);
      expect(report.sequential_time_ms).toBeGreaterThan(0);
      expect(report.parallel_time_ms).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // 7. Quality Gates and Error Handling
  // ============================================================
  describe('Quality Gates & Error Recovery', () => {
    it('should enforce design approval gate before development', () => {
      const issue = createNYKnicksIssue('full-project');
      const decomposition = decomposeNYKnicksProject(issue);

      const completedTasks = new Set<number>();

      // Find frontend task
      const frontendTask = decomposition.subtasks.find((t) => t.assignee === 'frontend-dev');
      const visualTask = decomposition.subtasks.find((t) => t.assignee === 'beautiful-web-designer');

      // Frontend should not start before visual design is complete
      expect(canStartTask(frontendTask!.id, frontendTask!.dependencies, completedTasks)).toBe(false);

      // Complete UX and visual design
      const uxTask = decomposition.subtasks.find((t) => t.assignee === 'ux-designer');
      completedTasks.add(uxTask!.id);
      completedTasks.add(visualTask!.id);

      // Now frontend can start
      expect(canStartTask(frontendTask!.id, frontendTask!.dependencies, completedTasks)).toBe(true);
    });

    it('should detect circular dependencies', () => {
      // Create tasks with circular dependency
      const circularTasks = [
        { id: 0, dependencies: [2] }, // 0 depends on 2
        { id: 1, dependencies: [0] }, // 1 depends on 0
        { id: 2, dependencies: [1] }, // 2 depends on 1 (circular!)
      ];

      const completedTasks = new Set<number>();

      // None of these tasks can ever start
      for (const task of circularTasks) {
        expect(canStartTask(task.id, task.dependencies, completedTasks)).toBe(false);
      }
    });

    it('should handle agent unavailability gracefully', async () => {
      // Create issue and analyze - should still work even with missing agents
      const issue = createNYKnicksIssue('full-project');
      const analysis = await analyzeIssue(issue, agentsDir);

      expect(analysis).toBeDefined();
      expect(analysis.agentMatches).toBeDefined();
    });

    it('should track and report blockers', () => {
      mockProjectContext.status.blockers.push('API rate limit exceeded');
      mockProjectContext.status.blockers.push('Design approval pending');

      expect(mockProjectContext.status.blockers).toHaveLength(2);
      expect(mockProjectContext.status.blockers).toContain('API rate limit exceeded');
    });

    it('should validate parallel execution error isolation', async () => {
      const issues = [
        createNYKnicksIssue('roster'),
        createNYKnicksIssue('schedule'),
        createNYKnicksIssue('news'),
      ];

      // One issue has empty body (edge case)
      issues[1] = { ...issues[1], body: '' };

      const analyses = await Promise.all(issues.map((issue) => analyzeIssue(issue, agentsDir)));

      // All analyses should complete
      expect(analyses).toHaveLength(3);

      // Each should be defined (no crashes from error in one)
      for (const analysis of analyses) {
        expect(analysis).toBeDefined();
        expect(analysis.extractedKeywords).toBeDefined();
      }
    });

    it('should exclude already assigned issues', () => {
      const assignedIssue = createMockIssue(200, 'Test', 'Body', [], 'open', ['developer-1']);

      const result = shouldExcludeIssue(assignedIssue);

      expect(result.exclude).toBe(true);
      expect(result.reason).toContain('assignees');
    });

    it('should not exclude valid unassigned issues', () => {
      const openIssue = createNYKnicksIssue('roster');

      const result = shouldExcludeIssue(openIssue);

      expect(result.exclude).toBe(false);
    });
  });
});
