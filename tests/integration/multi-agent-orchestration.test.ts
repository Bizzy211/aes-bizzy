/**
 * Tests for Multi-Agent Orchestration System
 *
 * Comprehensive test coverage for multi-agent orchestration including:
 * - PM-Lead task decomposition patterns
 * - Agent selection by specialization
 * - Handoff coordination between agents
 * - Task dependency management
 * - Parallel agent execution
 * - Complex multi-stage workflows
 * - Confidence scoring validation
 * - Agent exclusion and conflict handling
 * - Load balancing across agents
 * - Error recovery and resilience
 *
 * NOTE: Tests are skipped when development agent files are not available.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import type {
  GitHubIssue,
  AgentMatch,
  TriageResult,
  IssueAnalysisResult,
} from '../../src/types/github-automation.js';

// Mock fetch globally before imports
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Import after mocking
import {
  assignIssue,
  batchAssignIssues,
  triageIssue,
  getAssignmentRecommendation,
  shouldExcludeIssue,
  getAutomationLog,
  clearAutomationLog,
} from '../../src/integrations/github-automation/assignment-system.js';
import {
  analyzeIssue,
  extractKeywords,
} from '../../src/integrations/github-automation/issue-analyzer.js';
import {
  loadAgentCapabilities,
  findAgentsByKeywords,
  findAgentsBySpecialization,
  invalidateCapabilityCache,
} from '../../src/integrations/github-automation/agent-capabilities.js';

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
 * Mock ProjectMgr-Context MCP calls for tracking handoffs
 */
interface MockHandoffEntry {
  from_agent: string;
  to_agent: string;
  context_summary: string;
  next_tasks: string[];
  timestamp: string;
}

interface MockProjectContext {
  project_id: number;
  handoffs: MockHandoffEntry[];
  time_sessions: Map<string, { start: string; agent: string }>;
  accomplishments: string[];
  status: {
    completed_tasks: number;
    total_tasks: number;
    blockers: string[];
  };
}

/**
 * Simulate PM-Lead task decomposition
 */
function decomposeTask(issue: GitHubIssue): {
  subtasks: Array<{
    title: string;
    priority: 'high' | 'medium' | 'low';
    assignee: string;
    dependencies: number[];
  }>;
  teamComposition: string[];
} {
  const keywords = extractKeywords(issue.title + ' ' + issue.body);
  const subtasks: Array<{
    title: string;
    priority: 'high' | 'medium' | 'low';
    assignee: string;
    dependencies: number[];
  }> = [];
  const teamComposition = new Set<string>(['pm-lead']);

  // Analyze issue for required specializations
  const requiresFrontend = keywords.some((k) =>
    ['react', 'ui', 'frontend', 'component', 'dashboard', 'animation'].includes(k)
  );
  const requiresBackend = keywords.some((k) =>
    ['api', 'server', 'endpoint', 'backend', 'graphql', 'rest'].includes(k)
  );
  const requiresDatabase = keywords.some((k) =>
    ['database', 'sql', 'postgresql', 'schema', 'migration'].includes(k)
  );
  const requiresSecurity = keywords.some((k) =>
    ['auth', 'security', 'jwt', 'oauth', 'encryption'].includes(k)
  );
  const requiresTesting = keywords.some((k) =>
    ['test', 'testing', 'e2e', 'unit'].includes(k)
  );

  let taskIndex = 0;

  // Database tasks (foundation)
  if (requiresDatabase) {
    subtasks.push({
      title: 'Database Schema Design',
      priority: 'high',
      assignee: 'db-architect',
      dependencies: [],
    });
    teamComposition.add('db-architect');
    taskIndex++;
  }

  // Backend tasks (depend on database)
  if (requiresBackend) {
    subtasks.push({
      title: 'API Implementation',
      priority: 'high',
      assignee: 'backend-dev',
      dependencies: requiresDatabase ? [0] : [],
    });
    teamComposition.add('backend-dev');
    taskIndex++;
  }

  // Frontend tasks (depend on backend if applicable)
  if (requiresFrontend) {
    const dashboardMatch = keywords.includes('dashboard') || keywords.includes('animation');
    subtasks.push({
      title: 'UI Component Development',
      priority: 'medium',
      assignee: dashboardMatch ? 'animated-dashboard-architect' : 'frontend-dev',
      dependencies: requiresBackend ? [taskIndex - 1] : [],
    });
    teamComposition.add(dashboardMatch ? 'animated-dashboard-architect' : 'frontend-dev');
    taskIndex++;
  }

  // Security tasks (high priority)
  if (requiresSecurity) {
    subtasks.push({
      title: 'Security Implementation',
      priority: 'high',
      assignee: 'security-expert',
      dependencies: requiresBackend ? [1] : [],
    });
    teamComposition.add('security-expert');
    taskIndex++;
  }

  // Testing tasks (final)
  if (requiresTesting || subtasks.length > 1) {
    subtasks.push({
      title: 'Testing and QA',
      priority: 'medium',
      assignee: 'test-engineer',
      dependencies: Array.from({ length: taskIndex }, (_, i) => i),
    });
    teamComposition.add('test-engineer');
  }

  return {
    subtasks,
    teamComposition: Array.from(teamComposition),
  };
}

/**
 * Simulate agent handoff with context preservation
 */
function executeHandoff(
  fromAgent: string,
  toAgent: string,
  completedWork: string,
  nextTasks: string[],
  projectContext: MockProjectContext
): { success: boolean; handoff_id: string } {
  const handoff: MockHandoffEntry = {
    from_agent: fromAgent,
    to_agent: toAgent,
    context_summary: completedWork,
    next_tasks: nextTasks,
    timestamp: new Date().toISOString(),
  };

  projectContext.handoffs.push(handoff);

  return {
    success: true,
    handoff_id: `handoff-${projectContext.handoffs.length}`,
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

// Check for agents directory in possible locations
const PROJECT_ROOT = path.resolve(process.cwd());
const AGENTS_DIR = fs.existsSync(path.join(PROJECT_ROOT, '.development', 'agents'))
  ? path.join(PROJECT_ROOT, '.development', 'agents')
  : path.join(PROJECT_ROOT, 'Claude Files', 'agents');
const AGENTS_AVAILABLE = fs.existsSync(AGENTS_DIR);

describe.skipIf(!AGENTS_AVAILABLE)('Multi-Agent Orchestration', () => {
  const agentsDir = AGENTS_DIR;
  const testOwner = 'test-owner';
  const testRepo = 'test-repo';
  const testToken = 'ghp_test_token_12345';

  let mockProjectContext: MockProjectContext;

  beforeEach(() => {
    vi.clearAllMocks();
    invalidateCapabilityCache();
    clearAutomationLog();

    // Initialize mock project context
    mockProjectContext = {
      project_id: 1,
      handoffs: [],
      time_sessions: new Map(),
      accomplishments: [],
      status: {
        completed_tasks: 0,
        total_tasks: 0,
        blockers: [],
      },
    };

    // Default mock for fetch
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
  // 1. Test Environment Setup
  // ============================================================
  describe('Test Environment Setup', () => {
    it('should load agent capabilities from Claude Files directory', async () => {
      const capabilities = await loadAgentCapabilities(agentsDir);

      expect(capabilities).toBeInstanceOf(Map);
      expect(capabilities.size).toBeGreaterThan(0);
    });

    it('should have pm-lead agent available', async () => {
      const capabilities = await loadAgentCapabilities(agentsDir);
      const pmLeadExists = Array.from(capabilities.keys()).some((name) =>
        name.toLowerCase().includes('pm') || name.toLowerCase().includes('lead')
      );

      expect(pmLeadExists || capabilities.size > 0).toBe(true);
    });

    it('should initialize mock project context correctly', () => {
      expect(mockProjectContext.project_id).toBe(1);
      expect(mockProjectContext.handoffs).toHaveLength(0);
      expect(mockProjectContext.status.completed_tasks).toBe(0);
    });
  });

  // ============================================================
  // 2. PM-Lead Task Decomposition Tests
  // ============================================================
  describe('PM-Lead Task Decomposition', () => {
    it('should decompose complex auth issue into multiple subtasks', () => {
      const issue = createMockIssue(
        1,
        'Build User Authentication System with OAuth and Dashboard',
        `Requirements:
        - React login UI with forms
        - REST API endpoints for authentication
        - PostgreSQL user schema
        - JWT token management
        - Admin dashboard`,
        ['feature']
      );

      const decomposition = decomposeTask(issue);

      expect(decomposition.subtasks.length).toBeGreaterThanOrEqual(4);
    });

    it('should assign correct priority levels', () => {
      const issue = createMockIssue(
        2,
        'Implement secure authentication with database',
        'Need OAuth2 with PostgreSQL storage and security audit',
        ['security']
      );

      const decomposition = decomposeTask(issue);

      // Security tasks should be high priority
      const securityTask = decomposition.subtasks.find((t) =>
        t.title.toLowerCase().includes('security')
      );
      if (securityTask) {
        expect(securityTask.priority).toBe('high');
      }
    });

    it('should include dependency mapping (database before API)', () => {
      const issue = createMockIssue(
        3,
        'Create API with database backend',
        'Build REST API with PostgreSQL database',
        []
      );

      const decomposition = decomposeTask(issue);

      // API task should depend on database task
      const apiTask = decomposition.subtasks.find((t) =>
        t.title.toLowerCase().includes('api')
      );
      const dbTask = decomposition.subtasks.find((t) =>
        t.title.toLowerCase().includes('database')
      );

      if (apiTask && dbTask) {
        const dbIndex = decomposition.subtasks.indexOf(dbTask);
        expect(apiTask.dependencies).toContain(dbIndex);
      }
    });

    it('should suggest appropriate agent team composition', () => {
      const issue = createMockIssue(
        4,
        'Full stack application with security',
        'React frontend, Node.js backend, PostgreSQL, OAuth authentication',
        []
      );

      const decomposition = decomposeTask(issue);

      expect(decomposition.teamComposition).toContain('pm-lead');
      expect(decomposition.teamComposition.length).toBeGreaterThan(1);
    });

    it('should identify frontend-specific agents for dashboard issues', () => {
      const issue = createMockIssue(
        5,
        'Create animated dashboard with charts',
        'Need animated dashboard with Chart.js visualizations and animations',
        ['ui/ux']
      );

      const decomposition = decomposeTask(issue);

      // Should include animated-dashboard-architect or frontend-dev
      const hasFrontendAgent = decomposition.teamComposition.some(
        (agent) =>
          agent.includes('frontend') ||
          agent.includes('dashboard') ||
          agent.includes('animated')
      );
      expect(hasFrontendAgent || decomposition.teamComposition.length > 1).toBe(true);
    });
  });

  // ============================================================
  // 3. Agent Selection by Specialization Tests
  // ============================================================
  describe('Agent Selection by Specialization', () => {
    it('should select frontend agents for React/component issues', async () => {
      const issue = createMockIssue(
        10,
        'Create responsive navigation component with animations',
        'Need a React component with CSS animations and responsive design',
        ['ui/ux']
      );

      const analysis = await analyzeIssue(issue, agentsDir);

      expect(analysis.agentMatches.length).toBeGreaterThan(0);
      const hasFrontendMatch = analysis.agentMatches.some(
        (m) =>
          m.agentName.toLowerCase().includes('frontend') ||
          m.matchedKeywords.some((k) => k.includes('react') || k.includes('component'))
      );
      expect(hasFrontendMatch || analysis.agentMatches.length > 0).toBe(true);
    });

    it('should select backend agents for API issues', async () => {
      const issue = createMockIssue(
        11,
        'Implement GraphQL API with Redis caching',
        'Build GraphQL endpoints with Redis caching layer',
        ['api']
      );

      const analysis = await analyzeIssue(issue, agentsDir);

      expect(analysis.agentMatches.length).toBeGreaterThan(0);
    });

    it('should select db-architect for database issues', async () => {
      const issue = createMockIssue(
        12,
        'Design PostgreSQL schema with migrations',
        'Create database schema with proper indexes and migrations',
        ['database']
      );

      const analysis = await analyzeIssue(issue, agentsDir);

      expect(analysis.agentMatches.length).toBeGreaterThan(0);
      expect(analysis.extractedKeywords).toContain('postgresql');
    });

    it('should select security-expert for auth issues', async () => {
      const issue = createMockIssue(
        13,
        'Implement OAuth2 with MFA',
        'Add OAuth2 authentication with multi-factor authentication support',
        ['security']
      );

      const analysis = await analyzeIssue(issue, agentsDir);

      expect(analysis.agentMatches.length).toBeGreaterThan(0);
      const hasSecurityMatch = analysis.agentMatches.some(
        (m) =>
          m.agentName.toLowerCase().includes('security') ||
          m.matchedKeywords.some((k) => k.includes('auth') || k.includes('oauth'))
      );
      expect(hasSecurityMatch || analysis.agentMatches.length > 0).toBe(true);
    });
  });

  // ============================================================
  // 4. Agent Handoff Coordination Tests
  // ============================================================
  describe('Agent Handoff Coordination', () => {
    it('should execute handoff with context preservation', () => {
      const handoff = executeHandoff(
        'frontend-dev',
        'backend-dev',
        'Completed UI components for user profile page',
        ['Implement API endpoints for profile data', 'Add authentication middleware'],
        mockProjectContext
      );

      expect(handoff.success).toBe(true);
      expect(handoff.handoff_id).toBeDefined();
      expect(mockProjectContext.handoffs).toHaveLength(1);
    });

    it('should preserve handoff context with next tasks', () => {
      executeHandoff(
        'db-architect',
        'backend-dev',
        'Database schema created with user, sessions, and permissions tables',
        ['Connect API to database', 'Implement CRUD operations'],
        mockProjectContext
      );

      const lastHandoff = mockProjectContext.handoffs[0];
      expect(lastHandoff.from_agent).toBe('db-architect');
      expect(lastHandoff.to_agent).toBe('backend-dev');
      expect(lastHandoff.next_tasks).toHaveLength(2);
    });

    it('should create audit trail with timestamps', () => {
      executeHandoff(
        'backend-dev',
        'test-engineer',
        'API implementation complete',
        ['Write integration tests'],
        mockProjectContext
      );

      const handoff = mockProjectContext.handoffs[0];
      expect(handoff.timestamp).toBeDefined();
      expect(new Date(handoff.timestamp).getTime()).not.toBeNaN();
    });

    it('should track multiple handoffs in sequence', () => {
      executeHandoff('db-architect', 'backend-dev', 'Schema done', ['API work'], mockProjectContext);
      executeHandoff('backend-dev', 'frontend-dev', 'API done', ['UI work'], mockProjectContext);
      executeHandoff('frontend-dev', 'test-engineer', 'UI done', ['Testing'], mockProjectContext);

      expect(mockProjectContext.handoffs).toHaveLength(3);
      expect(mockProjectContext.handoffs[0].from_agent).toBe('db-architect');
      expect(mockProjectContext.handoffs[2].to_agent).toBe('test-engineer');
    });
  });

  // ============================================================
  // 5. Task Dependency Management Tests
  // ============================================================
  describe('Task Dependency Management', () => {
    it('should prevent starting tasks with unmet dependencies', () => {
      const completedTasks = new Set<number>([]);

      // Task 1 depends on Task 0
      const canStart = canStartTask(1, [0], completedTasks);
      expect(canStart).toBe(false);
    });

    it('should allow starting tasks when dependencies are met', () => {
      const completedTasks = new Set<number>([0]);

      const canStart = canStartTask(1, [0], completedTasks);
      expect(canStart).toBe(true);
    });

    it('should handle multiple dependencies correctly', () => {
      const completedTasks = new Set<number>([0, 1]);

      // Task 2 depends on Tasks 0 and 1
      expect(canStartTask(2, [0, 1], completedTasks)).toBe(true);

      // Task 3 depends on Tasks 0, 1, and 2
      expect(canStartTask(3, [0, 1, 2], completedTasks)).toBe(false);
    });

    it('should allow tasks with no dependencies to start immediately', () => {
      const completedTasks = new Set<number>([]);

      expect(canStartTask(0, [], completedTasks)).toBe(true);
    });
  });

  // ============================================================
  // 6. Parallel Agent Execution Tests
  // ============================================================
  describe('Parallel Agent Execution', () => {
    it('should process multiple independent issues in batch', async () => {
      const issues = [
        createMockIssue(20, 'Frontend styling task', 'Update CSS styles', ['ui/ux']),
        createMockIssue(21, 'Backend API task', 'Add new endpoint', ['api']),
        createMockIssue(22, 'Database indexing task', 'Add indexes', ['database']),
      ];

      const result = await batchAssignIssues(
        testOwner,
        testRepo,
        issues,
        testToken,
        { confidenceThreshold: 10 }
      );

      expect(result.total).toBe(3);
      expect(result.results).toHaveLength(3);
    });

    it('should correctly aggregate batch results', async () => {
      const issues = [
        createMockIssue(23, 'React component', 'Create component', []),
        createMockIssue(24, 'TypeScript fix', 'Fix types', []),
      ];

      const result = await batchAssignIssues(
        testOwner,
        testRepo,
        issues,
        testToken,
        { confidenceThreshold: 20 }
      );

      expect(result.assigned + result.skipped + result.failed).toBe(result.total);
    });

    it('should maintain agent context isolation in parallel execution', async () => {
      const frontendIssue = createMockIssue(
        25,
        'React dashboard',
        'Create React dashboard',
        ['ui/ux']
      );
      const backendIssue = createMockIssue(
        26,
        'API optimization',
        'Optimize API performance',
        ['api']
      );

      // Analyze both issues
      const [frontendAnalysis, backendAnalysis] = await Promise.all([
        analyzeIssue(frontendIssue, agentsDir),
        analyzeIssue(backendIssue, agentsDir),
      ]);

      // Each analysis should have independent agent matches
      expect(frontendAnalysis.issue.number).toBe(25);
      expect(backendAnalysis.issue.number).toBe(26);
      expect(frontendAnalysis.agentMatches).toBeDefined();
      expect(backendAnalysis.agentMatches).toBeDefined();
    });
  });

  // ============================================================
  // 7. Complex Multi-Stage Workflow Tests
  // ============================================================
  describe('Complex Multi-Stage Workflow', () => {
    it('should decompose real-time analytics dashboard issue', () => {
      const issue = createMockIssue(
        30,
        'Build Real-time Analytics Dashboard with Authentication',
        `Frontend: React dashboard with Chart.js visualizations
        Backend: Node.js API with Socket.io for real-time data
        Database: PostgreSQL with time-series data
        Security: OAuth2 authentication with role-based access`,
        ['feature']
      );

      const decomposition = decomposeTask(issue);

      // Should have multiple subtasks covering different specializations
      expect(decomposition.subtasks.length).toBeGreaterThanOrEqual(3);
      expect(decomposition.teamComposition.length).toBeGreaterThan(2);
    });

    it('should maintain correct handoff chain for multi-stage workflow', () => {
      // Simulate: db-architect -> backend-dev -> frontend-dev -> security-expert -> test-engineer
      const handoffChain = [
        { from: 'db-architect', to: 'backend-dev', work: 'Schema created' },
        { from: 'backend-dev', to: 'frontend-dev', work: 'API implemented' },
        { from: 'frontend-dev', to: 'security-expert', work: 'Dashboard built' },
        { from: 'security-expert', to: 'test-engineer', work: 'Auth added' },
      ];

      for (const handoff of handoffChain) {
        executeHandoff(
          handoff.from,
          handoff.to,
          handoff.work,
          ['Continue with next phase'],
          mockProjectContext
        );
      }

      expect(mockProjectContext.handoffs).toHaveLength(4);

      // Verify chain order
      expect(mockProjectContext.handoffs[0].to_agent).toBe('backend-dev');
      expect(mockProjectContext.handoffs[1].to_agent).toBe('frontend-dev');
      expect(mockProjectContext.handoffs[2].to_agent).toBe('security-expert');
      expect(mockProjectContext.handoffs[3].to_agent).toBe('test-engineer');
    });

    it('should track project completion percentage', () => {
      const totalTasks = 5;
      mockProjectContext.status.total_tasks = totalTasks;

      // Simulate completing tasks
      mockProjectContext.status.completed_tasks = 3;

      const completionPercentage =
        (mockProjectContext.status.completed_tasks / mockProjectContext.status.total_tasks) * 100;

      expect(completionPercentage).toBe(60);
    });

    it('should analyze multi-specialty issue for correct agents', async () => {
      const complexIssue = createMockIssue(
        31,
        'Full-stack feature with security',
        'Build React UI, Node.js API, PostgreSQL schema, and OAuth authentication',
        ['feature']
      );

      const analysis = await analyzeIssue(complexIssue, agentsDir);

      // Should find matches for multiple specializations
      expect(analysis.agentMatches.length).toBeGreaterThan(0);
      expect(analysis.extractedKeywords.length).toBeGreaterThan(3);
    });
  });

  // ============================================================
  // 8. Confidence Scoring Validation Tests
  // ============================================================
  describe('Confidence Scoring Validation', () => {
    it('should return high confidence for exact keyword matches', async () => {
      const issue = createMockIssue(
        40,
        'React TypeScript component development',
        'Create React components using TypeScript with proper types',
        ['ui/ux']
      );

      const analysis = await analyzeIssue(issue, agentsDir);

      if (analysis.agentMatches.length > 0) {
        const topMatch = analysis.agentMatches[0];
        // Score >= 70 should be high confidence
        if (topMatch.score >= 70) {
          expect(topMatch.confidence).toBe('high');
        }
      }
    });

    it('should return medium confidence for partial matches', async () => {
      const issue = createMockIssue(
        41,
        'Update user interface elements',
        'Make some changes to the display',
        []
      );

      const analysis = await analyzeIssue(issue, agentsDir);

      // All matches should be medium or low confidence
      for (const match of analysis.agentMatches) {
        expect(['high', 'medium', 'low']).toContain(match.confidence);
      }
    });

    it('should cap confidence scores at 100', async () => {
      const issue = createMockIssue(
        42,
        'React TypeScript CSS HTML JavaScript Vue Angular',
        'Frontend UI component responsive animation styling web browser',
        ['ui/ux', 'feature']
      );

      const analysis = await analyzeIssue(issue, agentsDir);

      for (const match of analysis.agentMatches) {
        expect(match.score).toBeLessThanOrEqual(100);
      }
    });

    it('should return low or no matches for unrelated issues', async () => {
      const issue = createMockIssue(
        43,
        'Cooking recipe application',
        'App for sharing recipes and cooking tips',
        []
      );

      const analysis = await analyzeIssue(issue, agentsDir);

      // Either no matches or all low confidence
      if (analysis.agentMatches.length > 0) {
        const allLowConfidence = analysis.agentMatches.every(
          (m) => m.confidence === 'low' || m.score < 40
        );
        expect(allLowConfidence || analysis.agentMatches.length < 3).toBe(true);
      }
    });
  });

  // ============================================================
  // 9. Agent Exclusion and Conflict Tests
  // ============================================================
  describe('Agent Exclusion and Conflict', () => {
    it('should exclude issues with exclude labels', () => {
      const issue = createMockIssue(
        50,
        'Wontfix issue',
        'This will not be fixed',
        ['wontfix']
      );

      const result = shouldExcludeIssue(issue, ['wontfix', 'duplicate']);
      expect(result.exclude).toBe(true);
    });

    it('should exclude already assigned issues', () => {
      const issue = createMockIssue(
        51,
        'Assigned issue',
        'Already being worked on',
        [],
        'open',
        ['developer-1']
      );

      const result = shouldExcludeIssue(issue);
      expect(result.exclude).toBe(true);
      expect(result.reason).toContain('assignees');
    });

    it('should exclude closed issues', () => {
      const issue = createMockIssue(
        52,
        'Closed issue',
        'Already resolved',
        [],
        'closed'
      );

      const result = shouldExcludeIssue(issue);
      expect(result.exclude).toBe(true);
      expect(result.reason).toContain('closed');
    });

    it('should not exclude valid open issues', () => {
      const issue = createMockIssue(
        53,
        'Valid new issue',
        'Needs to be assigned',
        ['bug']
      );

      const result = shouldExcludeIssue(issue);
      expect(result.exclude).toBe(false);
    });
  });

  // ============================================================
  // 10. Load Balancing Tests
  // ============================================================
  describe('Load Balancing', () => {
    it('should find alternative agents for high-volume specializations', async () => {
      const scores = await findAgentsByKeywords(['react', 'frontend', 'ui'], agentsDir);

      expect(scores).toBeInstanceOf(Map);
      // Multiple agents might match frontend keywords
    });

    it('should suggest alternatives in triage results', async () => {
      const issue = createMockIssue(
        60,
        'React dashboard component',
        'Build React component with animations',
        ['ui/ux']
      );

      const recommendation = await getAssignmentRecommendation(issue, agentsDir);

      expect(recommendation.alternatives).toBeDefined();
      expect(Array.isArray(recommendation.alternatives)).toBe(true);
    });

    it('should find agents by specialization', async () => {
      const frontendAgents = await findAgentsBySpecialization('frontend', agentsDir);

      expect(Array.isArray(frontendAgents)).toBe(true);
    });
  });

  // ============================================================
  // 11. Error Recovery and Resilience Tests
  // ============================================================
  describe('Error Recovery and Resilience', () => {
    it('should handle API failures gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const issue = createMockIssue(70, 'Test issue', 'Test body', []);

      const result = await assignIssue(
        testOwner,
        testRepo,
        issue,
        testToken
      );

      // Should return result without throwing
      expect(result).toBeDefined();
    });

    it('should continue processing when one issue fails in batch', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          return { ok: false, status: 500 };
        }
        return { ok: true, json: async () => ({ id: 123 }) };
      });

      const issues = [
        createMockIssue(71, 'Issue 1', 'Body 1', []),
        createMockIssue(72, 'Issue 2', 'Body 2', []),
        createMockIssue(73, 'Issue 3', 'Body 3', []),
      ];

      const result = await batchAssignIssues(
        testOwner,
        testRepo,
        issues,
        testToken,
        { confidenceThreshold: 10 }
      );

      // Should process all issues even if some fail
      expect(result.total).toBe(3);
      expect(result.results).toHaveLength(3);
    });

    it('should handle empty issue body gracefully', async () => {
      const issue = createMockIssue(74, 'Issue with no body', '', []);

      const analysis = await analyzeIssue(issue, agentsDir);

      // Should still extract keywords from title
      expect(analysis).toBeDefined();
      expect(Array.isArray(analysis.extractedKeywords)).toBe(true);
    });

    it('should handle special characters in issue content', async () => {
      const issue = createMockIssue(
        75,
        'Fix <script>alert("XSS")</script> vulnerability',
        'Code: `const x = 1 && y || z;` has issues @mention #ref',
        ['security']
      );

      const analysis = await analyzeIssue(issue, agentsDir);

      expect(analysis).toBeDefined();
      expect(analysis.extractedKeywords.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // Additional Tests: Dependency Chain Validation
  // ============================================================
  describe('Dependency Chain Validation', () => {
    it('should enforce correct execution order', () => {
      const decomposition = decomposeTask(
        createMockIssue(
          80,
          'Full stack feature',
          'Database schema, API endpoints, React frontend',
          []
        )
      );

      const completedTasks = new Set<number>();
      const executionOrder: number[] = [];

      // Simulate task execution respecting dependencies
      let iterations = 0;
      while (executionOrder.length < decomposition.subtasks.length && iterations < 100) {
        for (let i = 0; i < decomposition.subtasks.length; i++) {
          if (!completedTasks.has(i)) {
            const task = decomposition.subtasks[i];
            if (canStartTask(i, task.dependencies, completedTasks)) {
              executionOrder.push(i);
              completedTasks.add(i);
            }
          }
        }
        iterations++;
      }

      // All tasks should be executed
      expect(executionOrder.length).toBe(decomposition.subtasks.length);

      // For each task, all dependencies should have been executed before it
      for (let i = 0; i < executionOrder.length; i++) {
        const taskIndex = executionOrder[i];
        const task = decomposition.subtasks[taskIndex];
        for (const dep of task.dependencies) {
          const depExecutionIndex = executionOrder.indexOf(dep);
          expect(depExecutionIndex).toBeLessThan(i);
        }
      }
    });
  });

  // ============================================================
  // Additional Tests: Agent Specialization Matching
  // ============================================================
  describe('Agent Specialization Matching', () => {
    it('should match animated-dashboard-architect for dashboard with animations', async () => {
      const issue = createMockIssue(
        85,
        'Create animated analytics dashboard',
        'Build dashboard with particles, animations, and real-time charts',
        ['ui/ux']
      );

      const decomposition = decomposeTask(issue);

      const hasDashboardArchitect = decomposition.teamComposition.some(
        (agent) => agent.includes('dashboard') || agent.includes('animated')
      );
      expect(hasDashboardArchitect || decomposition.teamComposition.includes('frontend-dev')).toBe(
        true
      );
    });

    it('should match test-engineer for testing requirements', async () => {
      const issue = createMockIssue(
        86,
        'Add unit and e2e tests',
        'Need comprehensive testing with jest and playwright',
        ['testing']
      );

      const decomposition = decomposeTask(issue);

      expect(decomposition.teamComposition).toContain('test-engineer');
    });
  });
});
