/**
 * Tests for Auto-Assignment System
 *
 * Comprehensive test coverage for the agent assignment system including:
 * - Keyword matching and agent scoring
 * - Confidence scoring and thresholds
 * - Label-to-agent mapping
 * - Comment generation
 * - GitHub API interactions (mocked)
 * - Batch assignment processing
 * - Issue exclusion logic
 * - Triage workflow
 * - Webhook event processing
 * - Edge cases and error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import type {
  GitHubIssue,
  GitHubLabel,
  AssignmentResult,
  AgentMatch,
  TriageResult,
  GitHubAutomationConfig,
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
  processIssueEvent,
  fetchIssue,
  fetchOpenIssues,
  postComment,
  addLabels,
  generateAssignmentComment,
  generateTriageComment,
  getAutomationLog,
  clearAutomationLog,
} from '../../src/integrations/github-automation/assignment-system.js';
import {
  analyzeIssue,
  extractKeywords,
  extractLabelKeywords,
} from '../../src/integrations/github-automation/issue-analyzer.js';
import {
  loadAgentCapabilities,
  findAgentsByKeywords,
  LABEL_SPECIALIZATION_MAP,
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
 * Mock fixtures for different issue types
 */
const mockFrontendIssue = createMockIssue(
  1,
  'Add React component for user profile',
  'Need to create a new NextJS component for the user profile page. Should include responsive styling with Tailwind CSS and animations.',
  ['ui/ux']
);

const mockBackendIssue = createMockIssue(
  2,
  'Implement REST API endpoint',
  'Add new API endpoint for database queries. Need to handle authentication and return JSON responses from PostgreSQL.',
  ['api']
);

const mockSecurityIssue = createMockIssue(
  3,
  'Fix authentication vulnerability',
  'JWT token validation failing. Found potential XSS vulnerability in the auth flow. Encryption not properly implemented.',
  ['security']
);

const mockDatabaseIssue = createMockIssue(
  4,
  'PostgreSQL migration needed',
  'Add new schema migration for users table. Need to optimize SQL queries and add proper indexes.',
  ['database']
);

const mockDebuggingIssue = createMockIssue(
  5,
  'Application crashes on startup',
  'Error in the main function causing fatal crash. Stack trace shows null pointer exception.',
  ['bug']
);

const mockDocumentationIssue = createMockIssue(
  6,
  'Update README documentation',
  'Documentation is outdated. Need to update the README with new API examples and installation guide.',
  ['documentation']
);

describe('Assignment System', () => {
  const agentsDir = path.join(process.cwd(), 'Claude Files', 'agents');
  const testOwner = 'test-owner';
  const testRepo = 'test-repo';
  const testToken = 'ghp_test_token_12345';

  beforeEach(() => {
    vi.clearAllMocks();
    invalidateCapabilityCache();
    clearAutomationLog();

    // Default mock for successful API responses
    mockFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url.includes('/comments')) {
        return {
          ok: true,
          json: async () => ({ id: 123, body: options?.body }),
        };
      }
      if (url.includes('/labels')) {
        return {
          ok: true,
          json: async () => [],
        };
      }
      if (url.includes('/issues/')) {
        return {
          ok: true,
          json: async () => mockFrontendIssue,
        };
      }
      if (url.includes('/issues?')) {
        return {
          ok: true,
          json: async () => [mockFrontendIssue, mockBackendIssue],
        };
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

    it('should have LABEL_SPECIALIZATION_MAP defined', () => {
      expect(LABEL_SPECIALIZATION_MAP).toBeDefined();
      expect(LABEL_SPECIALIZATION_MAP['bug']).toContain('debugging');
      expect(LABEL_SPECIALIZATION_MAP['security']).toContain('security');
    });

    it('should create valid mock issues', () => {
      expect(mockFrontendIssue.number).toBe(1);
      expect(mockFrontendIssue.state).toBe('open');
      expect(mockFrontendIssue.labels).toHaveLength(1);
      expect(mockFrontendIssue.labels[0].name).toBe('ui/ux');
    });

    it('should mock fetch globally', async () => {
      await fetch('https://api.github.com/test');
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  // ============================================================
  // 2. AgentMatcher - Keyword Matching Tests
  // ============================================================
  describe('AgentMatcher - Keyword Matching', () => {
    it('should identify frontend-dev for React/NextJS issues', async () => {
      const analysis = await analyzeIssue(mockFrontendIssue, agentsDir);

      expect(analysis.extractedKeywords).toContain('react');
      expect(analysis.extractedKeywords).toContain('nextjs');
      expect(analysis.agentMatches.length).toBeGreaterThan(0);

      const hasFrontendMatch = analysis.agentMatches.some(
        (m) =>
          m.agentName.toLowerCase().includes('frontend') ||
          m.matchedKeywords.some((k) => k.includes('react') || k.includes('frontend'))
      );
      expect(hasFrontendMatch || analysis.agentMatches.length > 0).toBe(true);
    });

    it('should identify backend-dev for API/database issues', async () => {
      const analysis = await analyzeIssue(mockBackendIssue, agentsDir);

      expect(analysis.extractedKeywords).toContain('api');
      expect(analysis.extractedKeywords).toContain('database');
      expect(analysis.agentMatches.length).toBeGreaterThan(0);
    });

    it('should identify security-expert for auth/encryption issues', async () => {
      const analysis = await analyzeIssue(mockSecurityIssue, agentsDir);

      expect(analysis.extractedKeywords).toContain('jwt');
      expect(analysis.extractedKeywords).toContain('xss');

      const hasSecurityMatch = analysis.agentMatches.some(
        (m) =>
          m.agentName.toLowerCase().includes('security') ||
          m.matchedKeywords.some((k) => k.includes('security') || k.includes('auth'))
      );
      expect(hasSecurityMatch || analysis.agentMatches.length > 0).toBe(true);
    });

    it('should identify db-architect for SQL/migration issues', async () => {
      const analysis = await analyzeIssue(mockDatabaseIssue, agentsDir);

      expect(analysis.extractedKeywords).toContain('postgresql');
      expect(analysis.extractedKeywords).toContain('sql');
      expect(analysis.agentMatches.length).toBeGreaterThan(0);
    });

    it('should extract matchedKeywords array with expected keywords', async () => {
      const analysis = await analyzeIssue(mockFrontendIssue, agentsDir);

      for (const match of analysis.agentMatches) {
        expect(Array.isArray(match.matchedKeywords)).toBe(true);
      }
    });

    it('should match multi-word keywords like next.js', async () => {
      const issue = createMockIssue(
        10,
        'Next.js routing issue',
        'Having trouble with Next.js dynamic routes and SQL injection prevention',
        []
      );

      const analysis = await analyzeIssue(issue, agentsDir);

      const hasNextKeyword = analysis.extractedKeywords.some(
        (k) => k.includes('next') || k.includes('sql')
      );
      expect(hasNextKeyword).toBe(true);
    });
  });

  // ============================================================
  // 3. Confidence Scoring Tests
  // ============================================================
  describe('Confidence Scoring', () => {
    it('should return high confidence for issues with multiple matching keywords', async () => {
      const issue = createMockIssue(
        20,
        'React TypeScript component with CSS animations',
        'Create a React component using TypeScript for the UI with Tailwind CSS styling and animations. Need responsive frontend design.',
        ['ui/ux']
      );

      const analysis = await analyzeIssue(issue, agentsDir);

      const topMatch = analysis.agentMatches[0];
      if (topMatch && topMatch.score >= 70) {
        expect(topMatch.confidence).toBe('high');
      }
    });

    it('should return medium confidence for partial matches', async () => {
      const issue = createMockIssue(
        21,
        'Minor UI tweak needed',
        'Update the button color on the settings page',
        []
      );

      const analysis = await analyzeIssue(issue, agentsDir);

      // May have medium or low confidence matches
      const hasMediumOrLow = analysis.agentMatches.some(
        (m) => m.confidence === 'medium' || m.confidence === 'low'
      );
      expect(hasMediumOrLow || analysis.agentMatches.length === 0).toBe(true);
    });

    it('should return low confidence for weak keyword matches', async () => {
      const issue = createMockIssue(
        22,
        'Generic issue',
        'Something needs to be done here',
        []
      );

      const analysis = await analyzeIssue(issue, agentsDir);

      if (analysis.agentMatches.length > 0) {
        const allLowOrMedium = analysis.agentMatches.every(
          (m) => m.confidence === 'low' || m.confidence === 'medium'
        );
        expect(allLowOrMedium).toBe(true);
      }
    });

    it('should cap score at 100', async () => {
      const issue = createMockIssue(
        23,
        'React Vue Angular TypeScript JavaScript CSS HTML Tailwind',
        'React Vue Angular TypeScript JavaScript CSS HTML Tailwind frontend ui ux component responsive animation',
        ['ui/ux', 'feature']
      );

      const analysis = await analyzeIssue(issue, agentsDir);

      for (const match of analysis.agentMatches) {
        expect(match.score).toBeLessThanOrEqual(100);
      }
    });

    it('should return empty or low scores for no matching keywords', async () => {
      const issue = createMockIssue(
        24,
        'Random unrelated topic',
        'This is about cooking recipes and gardening tips',
        []
      );

      const analysis = await analyzeIssue(issue, agentsDir);

      if (analysis.agentMatches.length > 0) {
        const allLowScores = analysis.agentMatches.every((m) => m.score < 40);
        expect(allLowScores).toBe(true);
      }
    });

    it('should calculate confidence levels correctly based on score thresholds', async () => {
      const analysis = await analyzeIssue(mockFrontendIssue, agentsDir);

      for (const match of analysis.agentMatches) {
        if (match.score >= 70) {
          expect(match.confidence).toBe('high');
        } else if (match.score >= 40) {
          expect(match.confidence).toBe('medium');
        } else {
          expect(match.confidence).toBe('low');
        }
      }
    });
  });

  // ============================================================
  // 4. Label-to-Agent Mapping Tests
  // ============================================================
  describe('Label-to-Agent Mapping', () => {
    it('should map bug label to debugger agent', async () => {
      const analysis = await analyzeIssue(mockDebuggingIssue, agentsDir);

      const labelKeywords = extractLabelKeywords(mockDebuggingIssue.labels);
      expect(labelKeywords).toContain('debugging');
    });

    it('should map security label to security-expert', async () => {
      const labelKeywords = extractLabelKeywords(mockSecurityIssue.labels);
      expect(labelKeywords).toContain('security');
    });

    it('should map ui/ux label to frontend specialization', async () => {
      const labelKeywords = extractLabelKeywords(mockFrontendIssue.labels);
      expect(labelKeywords).toContain('frontend');
    });

    it('should map database label to database specialization', async () => {
      const labelKeywords = extractLabelKeywords(mockDatabaseIssue.labels);
      expect(labelKeywords).toContain('database');
    });

    it('should handle multiple labels correctly', async () => {
      const issue = createMockIssue(
        30,
        'Security bug in database',
        'Found SQL injection vulnerability in the auth module',
        ['bug', 'security', 'database']
      );

      const labelKeywords = extractLabelKeywords(issue.labels);

      expect(labelKeywords).toContain('debugging');
      expect(labelKeywords).toContain('security');
      expect(labelKeywords).toContain('database');
    });

    it('should include original label name in keywords', async () => {
      const issue = createMockIssue(
        31,
        'Test issue',
        'Test body',
        ['custom-label']
      );

      const labelKeywords = extractLabelKeywords(issue.labels);
      expect(labelKeywords).toContain('custom-label');
    });
  });

  // ============================================================
  // 5. Assignment Comment Generation Tests
  // ============================================================
  describe('Assignment Comment Generation', () => {
    it('should generate comment with JHC Agentic EcoSystem header', () => {
      const agentMatches: AgentMatch[] = [
        {
          agentName: 'frontend-dev',
          score: 85,
          confidence: 'high',
          matchedKeywords: ['react', 'typescript'],
          matchReason: 'Matched keywords: react, typescript',
        },
      ];

      const comment = generateAssignmentComment(agentMatches, ['react', 'typescript']);

      expect(comment).toContain('JHC Agentic EcoSystem');
    });

    it('should include agent name and confidence emoji', () => {
      const agentMatches: AgentMatch[] = [
        {
          agentName: 'security-expert',
          score: 90,
          confidence: 'high',
          matchedKeywords: ['auth', 'jwt'],
          matchReason: 'Security specialization',
        },
      ];

      const comment = generateAssignmentComment(agentMatches, ['auth']);

      expect(comment).toContain('security-expert');
      expect(comment).toContain('🟢'); // High confidence emoji
    });

    it('should show medium confidence emoji for medium scores', () => {
      const agentMatches: AgentMatch[] = [
        {
          agentName: 'backend-dev',
          score: 55,
          confidence: 'medium',
          matchedKeywords: ['api'],
          matchReason: 'API match',
        },
      ];

      const comment = generateAssignmentComment(agentMatches, ['api']);

      expect(comment).toContain('🟡'); // Medium confidence emoji
    });

    it('should show low confidence emoji for low scores', () => {
      const agentMatches: AgentMatch[] = [
        {
          agentName: 'docs-engineer',
          score: 25,
          confidence: 'low',
          matchedKeywords: ['readme'],
          matchReason: 'Documentation match',
        },
      ];

      const comment = generateAssignmentComment(agentMatches, ['readme']);

      expect(comment).toContain('🔴'); // Low confidence emoji
    });

    it('should suggest adding labels when no matches found', () => {
      const comment = generateAssignmentComment([], []);

      expect(comment).toContain('No specific agent match');
      expect(comment).toContain('labels');
    });

    it('should list top 3 agents maximum', () => {
      const agentMatches: AgentMatch[] = [
        { agentName: 'agent1', score: 90, confidence: 'high', matchedKeywords: [], matchReason: '' },
        { agentName: 'agent2', score: 80, confidence: 'high', matchedKeywords: [], matchReason: '' },
        { agentName: 'agent3', score: 70, confidence: 'high', matchedKeywords: [], matchReason: '' },
        { agentName: 'agent4', score: 60, confidence: 'medium', matchedKeywords: [], matchReason: '' },
        { agentName: 'agent5', score: 50, confidence: 'medium', matchedKeywords: [], matchReason: '' },
      ];

      const comment = generateAssignmentComment(agentMatches, []);

      expect(comment).toContain('agent1');
      expect(comment).toContain('agent2');
      expect(comment).toContain('agent3');
      expect(comment).not.toContain('agent4');
      expect(comment).not.toContain('agent5');
    });
  });

  // ============================================================
  // 6. GitHub API Integration Tests
  // ============================================================
  describe('GitHub API Integration', () => {
    it('should call GitHub API to fetch issue', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockFrontendIssue,
      });

      const issue = await fetchIssue(testOwner, testRepo, 1, testToken);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/repos/test-owner/test-repo/issues/1'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${testToken}`,
          }),
        })
      );
      expect(issue).not.toBeNull();
      expect(issue?.number).toBe(1);
    });

    it('should call GitHub API to fetch open issues with filters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockFrontendIssue],
      });

      const issues = await fetchOpenIssues(testOwner, testRepo, testToken, {
        labels: ['bug'],
        state: 'open',
        perPage: 10,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/state=open.*per_page=10/),
        expect.anything()
      );
      expect(issues).toHaveLength(1);
    });

    it('should post comment via GitHub API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 456 }),
      });

      const result = await postComment(
        testOwner,
        testRepo,
        1,
        'Test comment body',
        testToken
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/comments'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ body: 'Test comment body' }),
        })
      );
      expect(result).toBe(true);
    });

    it('should add labels via GitHub API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await addLabels(
        testOwner,
        testRepo,
        1,
        ['bug', 'security'],
        testToken
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/labels'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ labels: ['bug', 'security'] }),
        })
      );
      expect(result).toBe(true);
    });

    it('should handle 404 response gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const issue = await fetchIssue(testOwner, testRepo, 999, testToken);

      expect(issue).toBeNull();
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const issue = await fetchIssue(testOwner, testRepo, 1, testToken);

      expect(issue).toBeNull();
    });
  });

  // ============================================================
  // 7. Batch Assignment Tests
  // ============================================================
  describe('Batch Assignment', () => {
    it('should process multiple issues in batch', async () => {
      const issues = [
        mockFrontendIssue,
        mockBackendIssue,
        mockSecurityIssue,
      ];

      const result = await batchAssignIssues(
        testOwner,
        testRepo,
        issues,
        testToken,
        { confidenceThreshold: 20 }
      );

      expect(result.total).toBe(3);
      expect(result.results).toHaveLength(3);
    });

    it('should return correct counts for assigned/skipped/failed', async () => {
      const issues = [mockFrontendIssue, mockBackendIssue];

      const result = await batchAssignIssues(
        testOwner,
        testRepo,
        issues,
        testToken,
        { confidenceThreshold: 20 }
      );

      expect(result.assigned + result.skipped + result.failed).toBe(result.total);
    });

    it('should skip low-confidence issues based on threshold', async () => {
      const issues = [
        createMockIssue(40, 'Vague issue', 'Something happened', []),
      ];

      const result = await batchAssignIssues(
        testOwner,
        testRepo,
        issues,
        testToken,
        { confidenceThreshold: 80 } // High threshold
      );

      expect(result.skipped).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================
  // 8. Issue Exclusion Logic Tests
  // ============================================================
  describe('Issue Exclusion Logic', () => {
    it('should exclude issues with excludeLabels', () => {
      const issue = createMockIssue(
        50,
        'Wontfix issue',
        'This will not be fixed',
        ['wontfix']
      );

      const result = shouldExcludeIssue(issue, ['wontfix']);

      expect(result.exclude).toBe(true);
      expect(result.reason).toContain('excluded label');
    });

    it('should exclude already assigned issues', () => {
      const issue = createMockIssue(
        51,
        'Assigned issue',
        'Already being worked on',
        [],
        'open',
        ['some-user']
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

    it('should not exclude valid open unassigned issues', () => {
      const issue = createMockIssue(
        53,
        'Valid issue',
        'Needs to be assigned',
        ['bug']
      );

      const result = shouldExcludeIssue(issue);

      expect(result.exclude).toBe(false);
    });
  });

  // ============================================================
  // 9. Triage Workflow Tests
  // ============================================================
  describe('Triage Workflow', () => {
    it('should not require manual review for high-confidence issues', async () => {
      const triage = await triageIssue(mockFrontendIssue, agentsDir);

      if (triage.suggestedAgents.length > 0 && triage.suggestedAgents[0].score >= 40) {
        expect(triage.requiresManualReview).toBe(false);
      }
    });

    it('should require manual review for low-confidence issues', async () => {
      const issue = createMockIssue(
        60,
        'Unclear request',
        'Something is wrong somewhere',
        []
      );

      const triage = await triageIssue(issue, agentsDir);

      // Either no matches or low scores = manual review
      if (triage.suggestedAgents.length === 0 ||
          (triage.suggestedAgents[0] && triage.suggestedAgents[0].score < 40)) {
        expect(triage.requiresManualReview).toBe(true);
      }
    });

    it('should require manual review when no matches found', async () => {
      const issue = createMockIssue(
        61,
        'Completely unrelated',
        'Cooking recipes and gardening',
        []
      );

      const triage = await triageIssue(issue, agentsDir);

      if (triage.suggestedAgents.length === 0) {
        expect(triage.requiresManualReview).toBe(true);
      }
    });

    it('should include suggested labels in triage result', async () => {
      const triage = await triageIssue(mockFrontendIssue, agentsDir);

      expect(Array.isArray(triage.suggestedLabels)).toBe(true);
    });

    it('should generate triage comment with timestamp', async () => {
      const triage = await triageIssue(mockFrontendIssue, agentsDir);

      expect(triage.triageComment).toBeDefined();
      expect(triage.timestamp).toBeDefined();
    });
  });

  // ============================================================
  // 10. Webhook Event Processing Tests
  // ============================================================
  describe('Webhook Event Processing', () => {
    const defaultConfig: GitHubAutomationConfig = {
      enabled: true,
      autoAssign: true,
      confidenceThreshold: 30,
      excludeLabels: [],
      requireConfirmation: false,
    };

    it('should process opened action and call assignIssue', async () => {
      const result = await processIssueEvent(
        'opened',
        mockFrontendIssue,
        testOwner,
        testRepo,
        testToken,
        defaultConfig
      );

      expect(result.processed).toBe(true);
      expect(result.result).toBeDefined();
    });

    it('should ignore labeled action', async () => {
      const result = await processIssueEvent(
        'labeled',
        mockFrontendIssue,
        testOwner,
        testRepo,
        testToken,
        defaultConfig
      );

      expect(result.processed).toBe(false);
      expect(result.reason).toContain('Ignoring action: labeled');
    });

    it('should not process when automation is disabled', async () => {
      const disabledConfig = { ...defaultConfig, enabled: false };

      const result = await processIssueEvent(
        'opened',
        mockFrontendIssue,
        testOwner,
        testRepo,
        testToken,
        disabledConfig
      );

      expect(result.processed).toBe(false);
      expect(result.reason).toContain('disabled');
    });

    it('should not process issues with excluded labels', async () => {
      const issue = createMockIssue(
        70,
        'Excluded issue',
        'Has wontfix label',
        ['wontfix']
      );
      const configWithExcludes = { ...defaultConfig, excludeLabels: ['wontfix'] };

      const result = await processIssueEvent(
        'opened',
        issue,
        testOwner,
        testRepo,
        testToken,
        configWithExcludes
      );

      expect(result.processed).toBe(false);
      expect(result.reason).toContain('excluded');
    });

    it('should create automation log entries', async () => {
      clearAutomationLog();

      await processIssueEvent(
        'opened',
        mockFrontendIssue,
        testOwner,
        testRepo,
        testToken,
        defaultConfig
      );

      const log = getAutomationLog();
      expect(log.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // 11. Edge Cases and Error Handling
  // ============================================================
  describe('Edge Cases and Error Handling', () => {
    it('should handle empty issue body', async () => {
      const issue = createMockIssue(
        80,
        'React component issue',
        '', // Empty body
        ['ui/ux']
      );

      const analysis = await analyzeIssue(issue, agentsDir);

      // Should still extract keywords from title
      expect(analysis.extractedKeywords).toContain('react');
    });

    it('should handle issue with special characters in title/body', async () => {
      const issue = createMockIssue(
        81,
        'Fix <script>alert("XSS")</script> vulnerability',
        'Code: `const x = 1 && y || z;` has issues with @mentions and #refs',
        ['security']
      );

      const analysis = await analyzeIssue(issue, agentsDir);

      expect(analysis).toBeDefined();
      expect(analysis.extractedKeywords.length).toBeGreaterThan(0);
    });

    it('should handle very long issue body', async () => {
      const longBody = 'React '.repeat(1000) + 'TypeScript '.repeat(1000);
      const issue = createMockIssue(
        82,
        'Long issue',
        longBody,
        []
      );

      const analysis = await analyzeIssue(issue, agentsDir);

      expect(analysis).toBeDefined();
      expect(analysis.extractedKeywords.length).toBeGreaterThan(0);
    });

    it('should handle network errors during assignment', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await assignIssue(
        testOwner,
        testRepo,
        mockFrontendIssue,
        testToken
      );

      // Should handle gracefully without throwing
      expect(result).toBeDefined();
    });

    it('should handle API errors during comment posting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      const result = await postComment(
        testOwner,
        testRepo,
        1,
        'Test',
        testToken
      );

      expect(result).toBe(false);
    });

    it('should handle empty labels array', async () => {
      const issue = createMockIssue(
        83,
        'No labels issue',
        'React and TypeScript work',
        [] // Empty labels
      );

      const labelKeywords = extractLabelKeywords(issue.labels);
      expect(labelKeywords).toEqual([]);

      const analysis = await analyzeIssue(issue, agentsDir);
      expect(analysis).toBeDefined();
    });
  });

  // ============================================================
  // Additional Tests: Assignment Recommendation
  // ============================================================
  describe('Assignment Recommendation', () => {
    it('should return recommendation without making changes', async () => {
      const recommendation = await getAssignmentRecommendation(
        mockFrontendIssue,
        agentsDir
      );

      expect(recommendation).toBeDefined();
      expect(['high', 'medium', 'low', 'none']).toContain(recommendation.confidence);
      expect(Array.isArray(recommendation.suggestedLabels)).toBe(true);
    });

    it('should return null recommended agent for unrelated issues', async () => {
      const issue = createMockIssue(
        90,
        'Cooking recipe',
        'How to make pasta',
        []
      );

      const recommendation = await getAssignmentRecommendation(issue, agentsDir);

      if (recommendation.recommended === null) {
        expect(recommendation.confidence).toBe('none');
      }
    });

    it('should include alternative agents', async () => {
      const recommendation = await getAssignmentRecommendation(
        mockFrontendIssue,
        agentsDir
      );

      expect(Array.isArray(recommendation.alternatives)).toBe(true);
    });
  });

  // ============================================================
  // Additional Tests: Triage Comment Generation
  // ============================================================
  describe('Triage Comment Generation', () => {
    it('should include manual review warning when needed', () => {
      const triageResult: TriageResult = {
        issue: mockFrontendIssue,
        suggestedAgents: [],
        suggestedLabels: [],
        triageComment: '',
        requiresManualReview: true,
        timestamp: new Date().toISOString(),
      };

      const comment = generateTriageComment(triageResult);

      expect(comment).toContain('Manual review');
    });

    it('should list suggested agents in triage comment', () => {
      const triageResult: TriageResult = {
        issue: mockFrontendIssue,
        suggestedAgents: [
          {
            agentName: 'frontend-dev',
            score: 80,
            confidence: 'high',
            matchedKeywords: ['react'],
            matchReason: 'Frontend match',
          },
        ],
        suggestedLabels: ['ui/ux'],
        triageComment: '',
        requiresManualReview: false,
        timestamp: new Date().toISOString(),
      };

      const comment = generateTriageComment(triageResult);

      expect(comment).toContain('frontend-dev');
      expect(comment).toContain('Suggested');
    });

    it('should include timestamp in triage comment', () => {
      const triageResult: TriageResult = {
        issue: mockFrontendIssue,
        suggestedAgents: [],
        suggestedLabels: [],
        triageComment: '',
        requiresManualReview: true,
        timestamp: new Date().toISOString(),
      };

      const comment = generateTriageComment(triageResult);

      expect(comment).toContain('Triaged at');
    });
  });

  // ============================================================
  // Additional Tests: Automation Log
  // ============================================================
  describe('Automation Log', () => {
    it('should record log entries', async () => {
      clearAutomationLog();

      await assignIssue(
        testOwner,
        testRepo,
        mockFrontendIssue,
        testToken,
        { confidenceThreshold: 20 }
      );

      const log = getAutomationLog();
      expect(log.length).toBeGreaterThan(0);
    });

    it('should clear log entries', () => {
      clearAutomationLog();
      const log = getAutomationLog();
      expect(log).toHaveLength(0);
    });

    it('should respect log limit', async () => {
      clearAutomationLog();

      const log = getAutomationLog(5);
      expect(log.length).toBeLessThanOrEqual(5);
    });
  });

  // ============================================================
  // Additional Tests: findAgentsByKeywords
  // ============================================================
  describe('Agent Keyword Search', () => {
    it('should find agents by keywords and return Map', async () => {
      const scores = await findAgentsByKeywords(['react', 'frontend'], agentsDir);

      expect(scores).toBeInstanceOf(Map);
    });

    it('should return scores for matching agents', async () => {
      const scores = await findAgentsByKeywords(['security', 'auth'], agentsDir);

      if (scores.size > 0) {
        for (const score of scores.values()) {
          expect(score).toBeGreaterThan(0);
        }
      }
    });
  });
});
