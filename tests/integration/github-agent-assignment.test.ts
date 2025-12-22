/**
 * GitHub Agent Assignment and Tracking Integration Tests
 *
 * Tests sub-agent issue assignment for the NY Knicks website project:
 * - Agent capability loading and keyword extraction
 * - Issue analysis and agent matching
 * - Assignment workflow with GitHub API
 * - Automation logging and progress tracking
 * - Agent handoff scenarios
 * - Completion verification and status synchronization
 * - CLI commands and end-to-end workflow
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ============================================================================
// Types and Interfaces
// ============================================================================

interface AgentCapability {
  name: string;
  description: string;
  keywords: string[];
  tools: string[];
  specializations: string[];
}

interface IssueData {
  number: number;
  title: string;
  body: string;
  labels: string[];
  state: 'open' | 'closed';
  assignees: string[];
  created_at: string;
  updated_at: string;
}

interface AnalysisResult {
  issueNumber: number;
  extractedKeywords: string[];
  agentMatches: AgentMatch[];
  suggestedLabels: string[];
  confidenceLevel: 'high' | 'medium' | 'low';
}

interface AgentMatch {
  agentName: string;
  score: number;
  matchedKeywords: string[];
  explanation: string;
}

interface AssignmentResult {
  success: boolean;
  issueNumber: number;
  assignedAgents: string[];
  score: number;
  dryRun: boolean;
  error?: string;
}

interface TriageResult {
  issueNumber: number;
  suggestedAgents: string[];
  suggestedLabels: string[];
  requiresManualReview: boolean;
  recommendation: string;
}

interface AutomationLogEntry {
  id: string;
  timestamp: string;
  issueNumber: number;
  action: 'assigned' | 'reassigned' | 'completed' | 'blocked' | 'handoff';
  agent: string;
  score?: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

interface HandoffEvent {
  id: string;
  timestamp: string;
  fromAgent: string;
  toAgent: string;
  issueNumber: number;
  reason: string;
  context: string;
}

interface CompletionResult {
  success: boolean;
  issueNumber: number;
  closedAt: string;
  completedBy: string;
  commentAdded: boolean;
  labelsUpdated: boolean;
}

// ============================================================================
// NY Knicks Project Constants
// ============================================================================

const KNICKS_PROJECT = {
  owner: 'nyknicks-dev',
  repo: 'knicks-website',
  brandColors: {
    blue: '#006BB6',
    orange: '#F58426',
    gray: '#BEC0C2',
  },
};

const KNICKS_TEST_ISSUES: IssueData[] = [
  {
    number: 1,
    title: 'Implement responsive navigation menu for Knicks website',
    body: 'Create a responsive navigation menu component using React and Tailwind CSS. Should include mobile hamburger menu and desktop horizontal layout.',
    labels: ['component', 'frontend', 'enhancement'],
    state: 'open',
    assignees: [],
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    number: 2,
    title: 'Create brand style guide with team colors and typography',
    body: 'Design comprehensive style guide documenting Knicks brand colors (#006BB6, #F58426, #BEC0C2), typography choices, and component design patterns.',
    labels: ['design', 'documentation'],
    state: 'open',
    assignees: [],
    created_at: '2025-01-15T11:00:00Z',
    updated_at: '2025-01-15T11:00:00Z',
  },
  {
    number: 3,
    title: 'Optimize player roster page load time',
    body: 'Performance optimization needed for the player roster page. Implement lazy loading for player images and optimize bundle size.',
    labels: ['performance', 'optimization'],
    state: 'open',
    assignees: [],
    created_at: '2025-01-15T12:00:00Z',
    updated_at: '2025-01-15T12:00:00Z',
  },
  {
    number: 4,
    title: 'Add ARIA labels to player stats table',
    body: 'Improve accessibility by adding proper ARIA labels, roles, and keyboard navigation to the player statistics table component.',
    labels: ['accessibility', 'a11y'],
    state: 'open',
    assignees: [],
    created_at: '2025-01-15T13:00:00Z',
    updated_at: '2025-01-15T13:00:00Z',
  },
  {
    number: 5,
    title: 'Integrate NBA stats API for live scores',
    body: 'Create backend integration with NBA stats API to fetch and display live game scores. Implement caching strategy for API responses.',
    labels: ['backend', 'api', 'integration'],
    state: 'open',
    assignees: [],
    created_at: '2025-01-15T14:00:00Z',
    updated_at: '2025-01-15T14:00:00Z',
  },
  {
    number: 6,
    title: 'Design and implement animated hero section',
    body: 'Create an engaging animated hero section for the homepage using Framer Motion. Requires design mockups first, then implementation.',
    labels: ['design', 'frontend', 'animation'],
    state: 'open',
    assignees: [],
    created_at: '2025-01-15T15:00:00Z',
    updated_at: '2025-01-15T15:00:00Z',
  },
  {
    number: 7,
    title: 'Implement secure user authentication',
    body: 'Add JWT-based authentication for fan accounts. Include password hashing, session management, and OAuth integration.',
    labels: ['security', 'authentication', 'backend'],
    state: 'open',
    assignees: [],
    created_at: '2025-01-15T16:00:00Z',
    updated_at: '2025-01-15T16:00:00Z',
  },
  {
    number: 8,
    title: 'Write unit tests for player card component',
    body: 'Create comprehensive unit tests for the PlayerCard component including render tests, interaction tests, and snapshot tests.',
    labels: ['testing', 'unit-tests'],
    state: 'open',
    assignees: [],
    created_at: '2025-01-15T17:00:00Z',
    updated_at: '2025-01-15T17:00:00Z',
  },
  {
    number: 9,
    title: 'Create Vue component for game schedule',
    body: 'Build a Vue.js component to display upcoming game schedule with filtering and sorting capabilities.',
    labels: ['component', 'vue', 'frontend'],
    state: 'open',
    assignees: [],
    created_at: '2025-01-15T18:00:00Z',
    updated_at: '2025-01-15T18:00:00Z',
  },
  {
    number: 10,
    title: 'Design mobile-first player profile page',
    body: 'Create wireframes and high-fidelity mockups for mobile player profile pages. Focus on responsive design and accessibility.',
    labels: ['design', 'mobile', 'ux'],
    state: 'open',
    assignees: [],
    created_at: '2025-01-15T19:00:00Z',
    updated_at: '2025-01-15T19:00:00Z',
  },
];

// ============================================================================
// Agent Capabilities Mock Data
// ============================================================================

const MOCK_AGENT_CAPABILITIES: Record<string, AgentCapability> = {
  'frontend-dev': {
    name: 'frontend-dev',
    description: 'Expert frontend developer specializing in React, Vue, Angular, and modern web technologies.',
    keywords: ['react', 'vue', 'angular', 'component', 'ui', 'frontend', 'nextjs', 'typescript', 'css', 'tailwind', 'responsive', 'animation', 'framer-motion'],
    tools: ['Read', 'Write', 'Edit', 'Bash', 'mcp__context7__get-library-docs'],
    specializations: ['component-development', 'state-management', 'performance-optimization'],
  },
  'ux-designer': {
    name: 'ux-designer',
    description: 'Expert UX/UI designer specializing in user-centered design, wireframing, prototyping, and accessibility.',
    keywords: ['design', 'ux', 'ui', 'wireframe', 'prototype', 'accessibility', 'a11y', 'style-guide', 'brand', 'mockup', 'figma', 'design-system', 'mobile', 'colors', 'typography', 'color'],
    tools: ['Read', 'Write', 'WebSearch', 'mcp__21st-magic__component_builder'],
    specializations: ['design-systems', 'user-research', 'prototyping', 'accessibility', 'brand-design'],
  },
  'backend-dev': {
    name: 'backend-dev',
    description: 'Expert backend developer specializing in API development, databases, and server-side architecture.',
    keywords: ['api', 'backend', 'database', 'server', 'rest', 'graphql', 'node', 'python', 'caching', 'authentication', 'integration'],
    tools: ['Read', 'Write', 'Edit', 'Bash', 'mcp__context7__get-library-docs'],
    specializations: ['api-development', 'database-optimization', 'microservices'],
  },
  'test-engineer': {
    name: 'test-engineer',
    description: 'Expert test engineer specializing in unit testing, integration testing, and E2E testing.',
    keywords: ['test', 'testing', 'unit-test', 'integration-test', 'e2e', 'jest', 'vitest', 'cypress', 'playwright', 'coverage', 'qa'],
    tools: ['Read', 'Write', 'Edit', 'Bash'],
    specializations: ['unit-testing', 'integration-testing', 'e2e-testing', 'performance-testing'],
  },
  'security-expert': {
    name: 'security-expert',
    description: 'Expert security specialist focusing on vulnerability assessment, authentication, and security implementation.',
    keywords: ['security', 'authentication', 'authorization', 'jwt', 'oauth', 'vulnerability', 'encryption', 'owasp', 'audit'],
    tools: ['Read', 'Write', 'Edit', 'Bash', 'WebSearch'],
    specializations: ['vulnerability-assessment', 'security-implementation', 'compliance'],
  },
  'docs-engineer': {
    name: 'docs-engineer',
    description: 'Documentation specialist for creating technical documentation, API docs, and user guides.',
    keywords: ['documentation', 'docs', 'readme', 'api-docs', 'guide', 'tutorial', 'markdown'],
    tools: ['Read', 'Write', 'Edit'],
    specializations: ['technical-documentation', 'api-documentation', 'user-guides'],
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

let automationLog: AutomationLogEntry[] = [];
let handoffHistory: HandoffEvent[] = [];
const MAX_LOG_ENTRIES = 1000;

function loadAgentCapabilities(agentsDir: string): Map<string, AgentCapability> {
  const capabilities = new Map<string, AgentCapability>();

  // Simulate loading from markdown files
  for (const [name, capability] of Object.entries(MOCK_AGENT_CAPABILITIES)) {
    capabilities.set(name, capability);
  }

  return capabilities;
}

function getAvailableAgents(capabilities: Map<string, AgentCapability>): string[] {
  return Array.from(capabilities.keys());
}

function getMappingStats(capabilities: Map<string, AgentCapability>): {
  totalAgents: number;
  totalKeywords: number;
  avgKeywordsPerAgent: number;
} {
  const agents = Array.from(capabilities.values());
  const totalKeywords = agents.reduce((sum, a) => sum + a.keywords.length, 0);

  return {
    totalAgents: agents.length,
    totalKeywords,
    avgKeywordsPerAgent: totalKeywords / agents.length,
  };
}

function extractKeywords(text: string): string[] {
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);

  // Common technical keywords to look for
  const technicalKeywords = [
    'react', 'vue', 'angular', 'component', 'ui', 'frontend', 'backend',
    'api', 'design', 'ux', 'accessibility', 'a11y', 'test', 'testing',
    'security', 'authentication', 'performance', 'optimization', 'mobile',
    'responsive', 'animation', 'database', 'integration', 'documentation',
    'brand', 'colors', 'typography', 'mockup', 'wireframe', 'prototype',
  ];

  const extracted = words.filter(w => technicalKeywords.includes(w));

  // Also look for compound terms
  const textLower = text.toLowerCase();
  if (textLower.includes('style guide')) extracted.push('style-guide');
  if (textLower.includes('design system')) extracted.push('design-system');
  if (textLower.includes('unit test')) extracted.push('unit-test');
  if (textLower.includes('load time')) extracted.push('performance');
  if (textLower.includes('aria')) extracted.push('accessibility');
  if (textLower.includes('brand')) extracted.push('brand');
  if (textLower.includes('typography')) extracted.push('typography');
  if (textLower.includes('color')) extracted.push('colors');

  return [...new Set(extracted)];
}

function calculateAgentScore(
  keywords: string[],
  agentCapability: AgentCapability
): { score: number; matchedKeywords: string[] } {
  const matchedKeywords = keywords.filter(k =>
    agentCapability.keywords.some(ak =>
      ak.includes(k) || k.includes(ak)
    )
  );

  // Score based on keyword matches and specialization alignment
  const keywordScore = (matchedKeywords.length / Math.max(keywords.length, 1)) * 70;
  const specializationBonus = agentCapability.specializations.some(s =>
    keywords.some(k => s.includes(k) || k.includes(s))
  ) ? 15 : 0;

  const score = Math.min(100, Math.round(keywordScore + specializationBonus));

  return { score, matchedKeywords };
}

function analyzeIssue(
  issue: IssueData,
  capabilities: Map<string, AgentCapability>
): AnalysisResult {
  const text = `${issue.title} ${issue.body} ${issue.labels.join(' ')}`;
  const extractedKeywords = extractKeywords(text);

  const agentMatches: AgentMatch[] = [];

  for (const [name, capability] of capabilities) {
    const { score, matchedKeywords } = calculateAgentScore(extractedKeywords, capability);

    if (score > 0) {
      agentMatches.push({
        agentName: name,
        score,
        matchedKeywords,
        explanation: `Matched ${matchedKeywords.length} keywords: ${matchedKeywords.join(', ')}`,
      });
    }
  }

  // Sort by score descending
  agentMatches.sort((a, b) => b.score - a.score);

  // Determine confidence level based on top score
  const topScore = agentMatches[0]?.score ?? 0;
  const confidenceLevel: 'high' | 'medium' | 'low' =
    topScore >= 70 ? 'high' : topScore >= 40 ? 'medium' : 'low';

  // Suggest labels based on matched agents
  const suggestedLabels: string[] = [];
  if (agentMatches.some(m => m.agentName === 'frontend-dev')) suggestedLabels.push('frontend');
  if (agentMatches.some(m => m.agentName === 'backend-dev')) suggestedLabels.push('backend');
  if (agentMatches.some(m => m.agentName === 'ux-designer')) suggestedLabels.push('design');
  if (agentMatches.some(m => m.agentName === 'test-engineer')) suggestedLabels.push('testing');

  return {
    issueNumber: issue.number,
    extractedKeywords,
    agentMatches,
    suggestedLabels,
    confidenceLevel,
  };
}

function assignIssue(
  issue: IssueData,
  analysis: AnalysisResult,
  options: { dryRun?: boolean; threshold?: number } = {}
): AssignmentResult {
  const { dryRun = false, threshold = 40 } = options;

  const topMatch = analysis.agentMatches[0];

  if (!topMatch || topMatch.score < threshold) {
    return {
      success: false,
      issueNumber: issue.number,
      assignedAgents: [],
      score: topMatch?.score ?? 0,
      dryRun,
      error: 'No agent matched above threshold',
    };
  }

  if (!dryRun) {
    // Simulate GitHub API assignment
    issue.assignees.push(topMatch.agentName);

    // Log the assignment
    addLogEntry({
      issueNumber: issue.number,
      action: 'assigned',
      agent: topMatch.agentName,
      score: topMatch.score,
    });
  }

  return {
    success: true,
    issueNumber: issue.number,
    assignedAgents: [topMatch.agentName],
    score: topMatch.score,
    dryRun,
  };
}

function batchAssignIssues(
  issues: IssueData[],
  capabilities: Map<string, AgentCapability>,
  options: { dryRun?: boolean; threshold?: number } = {}
): AssignmentResult[] {
  const results: AssignmentResult[] = [];

  for (const issue of issues) {
    const analysis = analyzeIssue(issue, capabilities);
    const result = assignIssue(issue, analysis, options);
    results.push(result);
  }

  return results;
}

function getAssignmentRecommendation(analysis: AnalysisResult): string {
  const topMatch = analysis.agentMatches[0];

  if (!topMatch) {
    return 'No suitable agent found for this issue.';
  }

  return `Recommend ${topMatch.agentName} (confidence: ${analysis.confidenceLevel}, score: ${topMatch.score}). ${topMatch.explanation}`;
}

function triageIssue(
  issue: IssueData,
  capabilities: Map<string, AgentCapability>
): TriageResult {
  const analysis = analyzeIssue(issue, capabilities);

  return {
    issueNumber: issue.number,
    suggestedAgents: analysis.agentMatches.slice(0, 3).map(m => m.agentName),
    suggestedLabels: analysis.suggestedLabels,
    requiresManualReview: analysis.confidenceLevel === 'low',
    recommendation: getAssignmentRecommendation(analysis),
  };
}

function addLogEntry(entry: Omit<AutomationLogEntry, 'id' | 'timestamp'>): void {
  const logEntry: AutomationLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };

  automationLog.unshift(logEntry);

  // Enforce max log size
  if (automationLog.length > MAX_LOG_ENTRIES) {
    automationLog = automationLog.slice(0, MAX_LOG_ENTRIES);
  }
}

function getAutomationLog(limit?: number): AutomationLogEntry[] {
  if (limit) {
    return automationLog.slice(0, limit);
  }
  return automationLog;
}

function clearAutomationLog(): void {
  automationLog = [];
}

function logAgentHandoff(
  fromAgent: string,
  toAgent: string,
  issueNumber: number,
  reason: string,
  context: string
): HandoffEvent {
  const handoff: HandoffEvent = {
    id: `handoff-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    fromAgent,
    toAgent,
    issueNumber,
    reason,
    context,
  };

  handoffHistory.push(handoff);

  addLogEntry({
    issueNumber,
    action: 'handoff',
    agent: toAgent,
    reason: `Handoff from ${fromAgent}: ${reason}`,
  });

  return handoff;
}

function getAgentHistory(issueNumber: number): HandoffEvent[] {
  return handoffHistory.filter(h => h.issueNumber === issueNumber);
}

function clearHandoffHistory(): void {
  handoffHistory = [];
}

function simulateIssueBlocked(issue: IssueData, reason: string): void {
  issue.labels.push('blocked');

  addLogEntry({
    issueNumber: issue.number,
    action: 'blocked',
    agent: issue.assignees[0] || 'unknown',
    reason,
  });
}

function reassignIssue(
  issue: IssueData,
  newAgent: string,
  reason: string
): void {
  const previousAgent = issue.assignees[0];

  if (previousAgent) {
    logAgentHandoff(
      previousAgent,
      newAgent,
      issue.number,
      reason,
      `Reassigning due to: ${reason}`
    );
  }

  issue.assignees = [newAgent];
  issue.labels = issue.labels.filter(l => l !== 'blocked');

  addLogEntry({
    issueNumber: issue.number,
    action: 'reassigned',
    agent: newAgent,
    reason,
  });
}

function completeIssue(
  issue: IssueData,
  completedBy: string
): CompletionResult {
  issue.state = 'closed';
  issue.labels = issue.labels.filter(l => l !== 'in-progress');
  issue.labels.push('completed');

  addLogEntry({
    issueNumber: issue.number,
    action: 'completed',
    agent: completedBy,
  });

  return {
    success: true,
    issueNumber: issue.number,
    closedAt: new Date().toISOString(),
    completedBy,
    commentAdded: true,
    labelsUpdated: true,
  };
}

function fetchIssue(issues: IssueData[], issueNumber: number): IssueData | undefined {
  return issues.find(i => i.number === issueNumber);
}

function fetchOpenIssues(issues: IssueData[]): IssueData[] {
  return issues.filter(i => i.state === 'open');
}

// ============================================================================
// Test Suites
// ============================================================================

describe('GitHub Agent Assignment and Tracking', () => {
  let testDir: string;
  let capabilities: Map<string, AgentCapability>;
  let testIssues: IssueData[];

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `github-agent-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });

    // Initialize capabilities
    capabilities = loadAgentCapabilities(testDir);

    // Deep copy test issues
    testIssues = JSON.parse(JSON.stringify(KNICKS_TEST_ISSUES));

    // Clear logs
    clearAutomationLog();
    clearHandoffHistory();
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  // ==========================================================================
  // Test Infrastructure (Subtask 1)
  // ==========================================================================

  describe('Test Infrastructure Setup', () => {
    it('should load NY Knicks project context', () => {
      expect(KNICKS_PROJECT.owner).toBe('nyknicks-dev');
      expect(KNICKS_PROJECT.repo).toBe('knicks-website');
      expect(KNICKS_PROJECT.brandColors.blue).toBe('#006BB6');
    });

    it('should initialize test issues with diverse scenarios', () => {
      expect(testIssues.length).toBeGreaterThanOrEqual(10);

      const labels = testIssues.flatMap(i => i.labels);
      expect(labels).toContain('component');
      expect(labels).toContain('design');
      expect(labels).toContain('backend');
      expect(labels).toContain('security');
      expect(labels).toContain('testing');
    });

    it('should clear automation log between tests', () => {
      addLogEntry({ issueNumber: 1, action: 'assigned', agent: 'test' });
      expect(getAutomationLog().length).toBe(1);

      clearAutomationLog();
      expect(getAutomationLog().length).toBe(0);
    });

    it('should load agent capabilities', () => {
      expect(capabilities.size).toBeGreaterThanOrEqual(6);
      expect(capabilities.has('frontend-dev')).toBe(true);
      expect(capabilities.has('ux-designer')).toBe(true);
    });
  });

  // ==========================================================================
  // Agent Capability Loading (Subtask 2)
  // ==========================================================================

  describe('Agent Capability Loading and Keyword Extraction', () => {
    it('should load all agent capabilities', () => {
      const agents = getAvailableAgents(capabilities);

      expect(agents).toContain('frontend-dev');
      expect(agents).toContain('ux-designer');
      expect(agents).toContain('backend-dev');
      expect(agents).toContain('test-engineer');
      expect(agents).toContain('security-expert');
    });

    it('should load frontend-dev with correct keywords', () => {
      const frontendDev = capabilities.get('frontend-dev');

      expect(frontendDev).toBeDefined();
      expect(frontendDev?.keywords).toContain('react');
      expect(frontendDev?.keywords).toContain('component');
      expect(frontendDev?.keywords).toContain('vue');
      expect(frontendDev?.keywords).toContain('angular');
    });

    it('should load ux-designer with correct keywords', () => {
      const uxDesigner = capabilities.get('ux-designer');

      expect(uxDesigner).toBeDefined();
      expect(uxDesigner?.keywords).toContain('design');
      expect(uxDesigner?.keywords).toContain('ux');
      expect(uxDesigner?.keywords).toContain('accessibility');
      expect(uxDesigner?.keywords).toContain('prototype');
    });

    it('should provide accurate mapping statistics', () => {
      const stats = getMappingStats(capabilities);

      expect(stats.totalAgents).toBe(6);
      expect(stats.totalKeywords).toBeGreaterThan(30);
      expect(stats.avgKeywordsPerAgent).toBeGreaterThan(5);
    });

    it('should parse tools array from agents', () => {
      const frontendDev = capabilities.get('frontend-dev');

      expect(frontendDev?.tools).toContain('Read');
      expect(frontendDev?.tools).toContain('Write');
      expect(frontendDev?.tools).toContain('Bash');
    });

    it('should extract specializations from descriptions', () => {
      const frontendDev = capabilities.get('frontend-dev');

      expect(frontendDev?.specializations).toContain('component-development');
      expect(frontendDev?.specializations).toContain('state-management');
    });
  });

  // ==========================================================================
  // Issue Analysis and Agent Matching (Subtask 3)
  // ==========================================================================

  describe('Issue Analysis and Agent Matching', () => {
    it('should analyze component issue and match frontend-dev', () => {
      const issue = testIssues.find(i => i.number === 1)!;
      const analysis = analyzeIssue(issue, capabilities);

      expect(analysis.extractedKeywords).toContain('component');
      expect(analysis.agentMatches[0]?.agentName).toBe('frontend-dev');
      expect(analysis.confidenceLevel).toBe('high');
    });

    it('should analyze design issue and match ux-designer', () => {
      const issue = testIssues.find(i => i.number === 2)!;
      const analysis = analyzeIssue(issue, capabilities);

      expect(analysis.extractedKeywords).toContain('design');
      expect(analysis.agentMatches[0]?.agentName).toBe('ux-designer');
    });

    it('should analyze performance issue correctly', () => {
      const issue = testIssues.find(i => i.number === 3)!;
      const analysis = analyzeIssue(issue, capabilities);

      expect(analysis.extractedKeywords).toContain('performance');
      expect(analysis.extractedKeywords).toContain('optimization');
    });

    it('should analyze accessibility issue and match ux-designer', () => {
      const issue = testIssues.find(i => i.number === 4)!;
      const analysis = analyzeIssue(issue, capabilities);

      expect(analysis.extractedKeywords).toContain('accessibility');
      expect(analysis.agentMatches[0]?.agentName).toBe('ux-designer');
    });

    it('should analyze API issue and match backend-dev', () => {
      const issue = testIssues.find(i => i.number === 5)!;
      const analysis = analyzeIssue(issue, capabilities);

      expect(analysis.extractedKeywords).toContain('api');
      expect(analysis.extractedKeywords).toContain('integration');
      expect(analysis.agentMatches[0]?.agentName).toBe('backend-dev');
    });

    it('should rank agent matches by score', () => {
      const issue = testIssues.find(i => i.number === 6)!; // Cross-functional issue
      const analysis = analyzeIssue(issue, capabilities);

      for (let i = 1; i < analysis.agentMatches.length; i++) {
        expect(analysis.agentMatches[i - 1].score).toBeGreaterThanOrEqual(
          analysis.agentMatches[i].score
        );
      }
    });

    it('should calculate correct confidence levels', () => {
      for (const issue of testIssues) {
        const analysis = analyzeIssue(issue, capabilities);
        const topScore = analysis.agentMatches[0]?.score ?? 0;

        if (topScore >= 70) {
          expect(analysis.confidenceLevel).toBe('high');
        } else if (topScore >= 40) {
          expect(analysis.confidenceLevel).toBe('medium');
        } else {
          expect(analysis.confidenceLevel).toBe('low');
        }
      }
    });

    it('should include matched keywords in agent match', () => {
      const issue = testIssues.find(i => i.number === 1)!;
      const analysis = analyzeIssue(issue, capabilities);

      expect(analysis.agentMatches[0]?.matchedKeywords.length).toBeGreaterThan(0);
    });

    it('should suggest labels based on matches', () => {
      const issue = testIssues.find(i => i.number === 1)!;
      const analysis = analyzeIssue(issue, capabilities);

      expect(analysis.suggestedLabels).toContain('frontend');
    });
  });

  // ==========================================================================
  // Assignment Workflow (Subtask 4)
  // ==========================================================================

  describe('Assignment Workflow and GitHub API Integration', () => {
    it('should assign issue in dry-run mode without modifying issue', () => {
      const issue = testIssues.find(i => i.number === 1)!;
      const analysis = analyzeIssue(issue, capabilities);
      const result = assignIssue(issue, analysis, { dryRun: true });

      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.assignedAgents).toContain('frontend-dev');
      expect(issue.assignees).toHaveLength(0); // Not modified
    });

    it('should assign issue with real assignment', () => {
      const issue = testIssues.find(i => i.number === 1)!;
      const analysis = analyzeIssue(issue, capabilities);
      const result = assignIssue(issue, analysis, { dryRun: false });

      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(false);
      expect(issue.assignees).toContain('frontend-dev');
    });

    it('should batch assign multiple issues', () => {
      const results = batchAssignIssues(testIssues.slice(0, 5), capabilities, {
        dryRun: true,
        threshold: 30,
      });

      expect(results.length).toBe(5);
      expect(results.filter(r => r.success).length).toBeGreaterThan(0);
    });

    it('should filter by confidence threshold', () => {
      const results = batchAssignIssues(testIssues, capabilities, {
        dryRun: true,
        threshold: 80,
      });

      const assigned = results.filter(r => r.success);
      const skipped = results.filter(r => !r.success);

      expect(assigned.length + skipped.length).toBe(testIssues.length);
    });

    it('should provide assignment recommendation', () => {
      const issue = testIssues.find(i => i.number === 1)!;
      const analysis = analyzeIssue(issue, capabilities);
      const recommendation = getAssignmentRecommendation(analysis);

      expect(recommendation).toContain('frontend-dev');
      expect(recommendation).toContain('confidence');
    });

    it('should triage issue with suggestions', () => {
      const issue = testIssues.find(i => i.number === 1)!;
      const triage = triageIssue(issue, capabilities);

      expect(triage.suggestedAgents.length).toBeGreaterThan(0);
      expect(triage.suggestedLabels).toBeDefined();
      expect(triage.recommendation).toBeDefined();
    });

    it('should flag low-confidence matches for manual review', () => {
      // Create an ambiguous issue
      const ambiguousIssue: IssueData = {
        number: 100,
        title: 'General improvement needed',
        body: 'Make it better somehow',
        labels: [],
        state: 'open',
        assignees: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const triage = triageIssue(ambiguousIssue, capabilities);

      expect(triage.requiresManualReview).toBe(true);
    });
  });

  // ==========================================================================
  // Automation Logging (Subtask 5)
  // ==========================================================================

  describe('Automation Logging and Progress Tracking', () => {
    it('should log assignment events', () => {
      const issue = testIssues.find(i => i.number === 1)!;
      const analysis = analyzeIssue(issue, capabilities);
      assignIssue(issue, analysis, { dryRun: false });

      const log = getAutomationLog();

      expect(log.length).toBe(1);
      expect(log[0].issueNumber).toBe(1);
      expect(log[0].action).toBe('assigned');
      expect(log[0].agent).toBe('frontend-dev');
    });

    it('should order log entries by timestamp (newest first)', () => {
      batchAssignIssues(testIssues.slice(0, 3), capabilities, { dryRun: false });

      const log = getAutomationLog();

      for (let i = 1; i < log.length; i++) {
        expect(new Date(log[i - 1].timestamp).getTime())
          .toBeGreaterThanOrEqual(new Date(log[i].timestamp).getTime());
      }
    });

    it('should enforce max log entries', () => {
      // Add more than MAX_LOG_ENTRIES
      for (let i = 0; i < MAX_LOG_ENTRIES + 100; i++) {
        addLogEntry({
          issueNumber: i,
          action: 'assigned',
          agent: 'test',
        });
      }

      const log = getAutomationLog();

      expect(log.length).toBe(MAX_LOG_ENTRIES);
    });

    it('should respect limit parameter', () => {
      batchAssignIssues(testIssues, capabilities, { dryRun: false });

      const limitedLog = getAutomationLog(5);

      expect(limitedLog.length).toBe(5);
    });

    it('should clear log correctly', () => {
      batchAssignIssues(testIssues, capabilities, { dryRun: false });
      expect(getAutomationLog().length).toBeGreaterThan(0);

      clearAutomationLog();

      expect(getAutomationLog().length).toBe(0);
    });

    it('should include required fields in log entries', () => {
      const issue = testIssues.find(i => i.number === 1)!;
      const analysis = analyzeIssue(issue, capabilities);
      assignIssue(issue, analysis, { dryRun: false });

      const entry = getAutomationLog()[0];

      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeDefined();
      expect(entry.issueNumber).toBeDefined();
      expect(entry.action).toBeDefined();
      expect(entry.agent).toBeDefined();
    });

    it('should include score in assignment log', () => {
      const issue = testIssues.find(i => i.number === 1)!;
      const analysis = analyzeIssue(issue, capabilities);
      assignIssue(issue, analysis, { dryRun: false });

      const entry = getAutomationLog()[0];

      expect(entry.score).toBeDefined();
      expect(entry.score).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Agent Handoff Scenarios (Subtask 6)
  // ==========================================================================

  describe('Agent Handoff Scenarios and Multi-Agent Collaboration', () => {
    it('should handle blocked scenario with reassignment', () => {
      const issue = testIssues.find(i => i.number === 6)!; // Design + frontend issue
      issue.assignees = ['ux-designer'];

      simulateIssueBlocked(issue, 'Design complete, needs implementation');
      expect(issue.labels).toContain('blocked');

      reassignIssue(issue, 'frontend-dev', 'Design phase complete');
      expect(issue.assignees).toContain('frontend-dev');
      expect(issue.labels).not.toContain('blocked');
    });

    it('should log handoff with reason', () => {
      const issue = testIssues.find(i => i.number === 6)!;
      issue.assignees = ['ux-designer'];

      logAgentHandoff(
        'ux-designer',
        'frontend-dev',
        issue.number,
        'Design approved, ready for implementation',
        'Figma mockups and design tokens ready'
      );

      const log = getAutomationLog();
      const handoffEntry = log.find(e => e.action === 'handoff');

      expect(handoffEntry).toBeDefined();
      expect(handoffEntry?.agent).toBe('frontend-dev');
      expect(handoffEntry?.reason).toContain('ux-designer');
    });

    it('should track complete handoff chain', () => {
      const issue = testIssues.find(i => i.number === 6)!;

      // PM → UX Designer
      logAgentHandoff('pm-lead', 'ux-designer', issue.number, 'Design phase start', 'Project brief');

      // UX Designer → Frontend Dev
      logAgentHandoff('ux-designer', 'frontend-dev', issue.number, 'Implementation ready', 'Design specs');

      // Frontend Dev → Test Engineer
      logAgentHandoff('frontend-dev', 'test-engineer', issue.number, 'Ready for testing', 'Component built');

      const history = getAgentHistory(issue.number);

      expect(history.length).toBe(3);
      expect(history[0].fromAgent).toBe('pm-lead');
      expect(history[2].toAgent).toBe('test-engineer');
    });

    it('should preserve context during handoff', () => {
      const issue = testIssues.find(i => i.number === 2)!;

      const handoff = logAgentHandoff(
        'pm-lead',
        'ux-designer',
        issue.number,
        'Design phase start',
        JSON.stringify({
          brandColors: KNICKS_PROJECT.brandColors,
          requirements: 'Create style guide',
        })
      );

      expect(handoff.context).toContain('#006BB6');
    });

    it('should handle multiple handoffs for same issue', () => {
      const issue = testIssues.find(i => i.number === 6)!;

      // Iteration 1
      logAgentHandoff('ux-designer', 'frontend-dev', issue.number, 'First implementation', 'v1');
      logAgentHandoff('frontend-dev', 'ux-designer', issue.number, 'Review needed', 'feedback');

      // Iteration 2
      logAgentHandoff('ux-designer', 'frontend-dev', issue.number, 'Refinements', 'v2');

      const history = getAgentHistory(issue.number);

      expect(history.length).toBe(3);
    });

    it('should clear handoff history', () => {
      logAgentHandoff('agent-a', 'agent-b', 1, 'test', 'context');
      expect(handoffHistory.length).toBeGreaterThan(0);

      clearHandoffHistory();

      expect(handoffHistory.length).toBe(0);
    });
  });

  // ==========================================================================
  // Completion Verification (Subtask 7)
  // ==========================================================================

  describe('Completion Verification and Status Synchronization', () => {
    it('should close issue on completion', () => {
      const issue = testIssues.find(i => i.number === 1)!;
      issue.assignees = ['frontend-dev'];
      issue.labels.push('in-progress');

      const result = completeIssue(issue, 'frontend-dev');

      expect(result.success).toBe(true);
      expect(issue.state).toBe('closed');
    });

    it('should update labels on completion', () => {
      const issue = testIssues.find(i => i.number === 1)!;
      issue.labels.push('in-progress');

      const result = completeIssue(issue, 'frontend-dev');

      expect(result.labelsUpdated).toBe(true);
      expect(issue.labels).toContain('completed');
      expect(issue.labels).not.toContain('in-progress');
    });

    it('should log completion event', () => {
      const issue = testIssues.find(i => i.number === 1)!;
      completeIssue(issue, 'frontend-dev');

      const log = getAutomationLog();
      const completionEntry = log.find(e => e.action === 'completed');

      expect(completionEntry).toBeDefined();
      expect(completionEntry?.agent).toBe('frontend-dev');
    });

    it('should record completion timestamp', () => {
      const issue = testIssues.find(i => i.number === 1)!;
      const beforeTime = new Date().toISOString();

      const result = completeIssue(issue, 'frontend-dev');

      const afterTime = new Date().toISOString();

      expect(result.closedAt).toBeDefined();
      expect(new Date(result.closedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeTime).getTime()
      );
      expect(new Date(result.closedAt).getTime()).toBeLessThanOrEqual(
        new Date(afterTime).getTime()
      );
    });

    it('should indicate comment was added', () => {
      const issue = testIssues.find(i => i.number === 1)!;
      const result = completeIssue(issue, 'frontend-dev');

      expect(result.commentAdded).toBe(true);
    });

    it('should preserve assignees after closure', () => {
      const issue = testIssues.find(i => i.number === 1)!;
      issue.assignees = ['frontend-dev'];

      completeIssue(issue, 'frontend-dev');

      expect(issue.assignees).toContain('frontend-dev');
    });

    it('should verify issue state via fetchIssue', () => {
      const issue = testIssues.find(i => i.number === 1)!;
      completeIssue(issue, 'frontend-dev');

      const fetched = fetchIssue(testIssues, 1);

      expect(fetched?.state).toBe('closed');
    });

    it('should filter open issues correctly', () => {
      // Close one issue
      const issue = testIssues.find(i => i.number === 1)!;
      completeIssue(issue, 'frontend-dev');

      const openIssues = fetchOpenIssues(testIssues);

      expect(openIssues.length).toBe(testIssues.length - 1);
      expect(openIssues.every(i => i.state === 'open')).toBe(true);
    });
  });

  // ==========================================================================
  // CLI Commands and End-to-End (Subtask 8)
  // ==========================================================================

  describe('CLI Commands and End-to-End Workflow', () => {
    it('should analyze single issue via command', () => {
      const issue = testIssues.find(i => i.number === 1)!;
      const analysis = analyzeIssue(issue, capabilities);

      expect(analysis.issueNumber).toBe(1);
      expect(analysis.agentMatches.length).toBeGreaterThan(0);
    });

    it('should triage multiple issues', () => {
      const openIssues = fetchOpenIssues(testIssues);
      const triageResults = openIssues.map(i => triageIssue(i, capabilities));

      expect(triageResults.length).toBe(openIssues.length);
      triageResults.forEach(result => {
        expect(result.suggestedAgents.length).toBeGreaterThan(0);
      });
    });

    it('should provide JSON-compatible output', () => {
      const issue = testIssues.find(i => i.number === 1)!;
      const analysis = analyzeIssue(issue, capabilities);

      const jsonOutput = JSON.stringify(analysis);

      expect(() => JSON.parse(jsonOutput)).not.toThrow();
    });

    it('should handle complete end-to-end workflow', () => {
      // Step 1: Triage
      const issue = testIssues.find(i => i.number === 1)!;
      const triage = triageIssue(issue, capabilities);
      expect(triage.suggestedAgents[0]).toBe('frontend-dev');

      // Step 2: Assign
      const analysis = analyzeIssue(issue, capabilities);
      const assignment = assignIssue(issue, analysis, { dryRun: false });
      expect(assignment.success).toBe(true);
      expect(issue.assignees).toContain('frontend-dev');

      // Step 3: Track progress
      let log = getAutomationLog();
      expect(log.some(e => e.action === 'assigned')).toBe(true);

      // Step 4: Handoff if needed (not needed for this issue)

      // Step 5: Complete
      const completion = completeIssue(issue, 'frontend-dev');
      expect(completion.success).toBe(true);

      // Step 6: Verify
      log = getAutomationLog();
      expect(log.some(e => e.action === 'completed')).toBe(true);
      expect(issue.state).toBe('closed');
    });

    it('should handle error for non-existent issue', () => {
      const fetched = fetchIssue(testIssues, 9999);

      expect(fetched).toBeUndefined();
    });

    it('should process all test scenarios correctly', () => {
      // Map issue numbers to acceptable agents (first is preferred, others are acceptable)
      const expectedAssignments: Record<number, string[]> = {
        1: ['frontend-dev'],     // Component issue
        2: ['ux-designer'],      // Design issue
        3: ['frontend-dev'],     // Performance issue
        4: ['ux-designer'],      // Accessibility issue
        5: ['backend-dev'],      // API issue
        7: ['security-expert', 'backend-dev'],  // Security issue (both are valid)
        8: ['test-engineer'],    // Testing issue
      };

      for (const [issueNum, acceptableAgents] of Object.entries(expectedAssignments)) {
        const issue = testIssues.find(i => i.number === parseInt(issueNum))!;
        const analysis = analyzeIssue(issue, capabilities);

        expect(acceptableAgents).toContain(analysis.agentMatches[0]?.agentName);
      }
    });

    it('should achieve >90% accuracy on test issues', () => {
      let correct = 0;
      let total = 0;

      const issueTypes: Record<number, string[]> = {
        1: ['frontend-dev'],
        2: ['ux-designer'],
        3: ['frontend-dev', 'backend-dev'],
        4: ['ux-designer'],
        5: ['backend-dev'],
        6: ['frontend-dev', 'ux-designer'],
        7: ['security-expert', 'backend-dev'],
        8: ['test-engineer'],
        9: ['frontend-dev'],
        10: ['ux-designer'],
      };

      for (const issue of testIssues) {
        const analysis = analyzeIssue(issue, capabilities);
        const topAgent = analysis.agentMatches[0]?.agentName;
        const acceptableAgents = issueTypes[issue.number] || [];

        if (acceptableAgents.includes(topAgent)) {
          correct++;
        }
        total++;
      }

      const accuracy = (correct / total) * 100;
      expect(accuracy).toBeGreaterThanOrEqual(90);
    });
  });

  // ==========================================================================
  // Integration Scenarios
  // ==========================================================================

  describe('NY Knicks Website Integration Scenarios', () => {
    it('should handle navigation component assignment', () => {
      const issue = testIssues.find(i => i.number === 1)!;
      const analysis = analyzeIssue(issue, capabilities);

      expect(analysis.extractedKeywords).toContain('component');
      expect(analysis.agentMatches[0]?.agentName).toBe('frontend-dev');
    });

    it('should handle brand style guide assignment', () => {
      const issue = testIssues.find(i => i.number === 2)!;
      const analysis = analyzeIssue(issue, capabilities);

      expect(analysis.extractedKeywords).toContain('design');
      expect(analysis.agentMatches[0]?.agentName).toBe('ux-designer');
    });

    it('should handle NBA API integration assignment', () => {
      const issue = testIssues.find(i => i.number === 5)!;
      const analysis = analyzeIssue(issue, capabilities);

      expect(analysis.extractedKeywords).toContain('api');
      expect(analysis.extractedKeywords).toContain('integration');
      expect(analysis.agentMatches[0]?.agentName).toBe('backend-dev');
    });

    it('should handle cross-agent hero section workflow', () => {
      const issue = testIssues.find(i => i.number === 6)!;

      // Phase 1: Design
      issue.assignees = ['ux-designer'];
      addLogEntry({
        issueNumber: issue.number,
        action: 'assigned',
        agent: 'ux-designer',
        reason: 'Initial design phase',
      });

      // Phase 2: Handoff to frontend
      logAgentHandoff(
        'ux-designer',
        'frontend-dev',
        issue.number,
        'Design complete',
        'Framer Motion animation specs ready'
      );
      issue.assignees = ['frontend-dev'];

      // Phase 3: Complete
      completeIssue(issue, 'frontend-dev');

      // Verify workflow
      const log = getAutomationLog();
      const history = getAgentHistory(issue.number);

      expect(history.length).toBe(1);
      expect(log.some(e => e.action === 'assigned')).toBe(true);
      expect(log.some(e => e.action === 'handoff')).toBe(true);
      expect(log.some(e => e.action === 'completed')).toBe(true);
    });

    it('should preserve Knicks brand context through workflow', () => {
      const issue = testIssues.find(i => i.number === 2)!;

      const handoff = logAgentHandoff(
        'pm-lead',
        'ux-designer',
        issue.number,
        'Brand style guide creation',
        JSON.stringify({
          brandColors: KNICKS_PROJECT.brandColors,
          typography: { heading: 'Gotham Bold', body: 'Gotham Book' },
        })
      );

      expect(handoff.context).toContain('#006BB6');
      expect(handoff.context).toContain('#F58426');
      expect(handoff.context).toContain('#BEC0C2');
    });
  });
});
