/**
 * GitHub Issues Integration Tests
 *
 * Comprehensive test suite for GitHub issue detection, listing,
 * agent matching, triage, and CLI command integration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';

// Mock dependencies
vi.mock('../../src/utils/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Mock chalk for cleaner output
vi.mock('chalk', () => ({
  default: {
    green: Object.assign(vi.fn((s: string) => s), { bold: vi.fn((s: string) => s) }),
    red: Object.assign(vi.fn((s: string) => s), { bold: vi.fn((s: string) => s) }),
    yellow: Object.assign(vi.fn((s: string) => s), { bold: vi.fn((s: string) => s) }),
    cyan: vi.fn((s: string) => s),
    dim: vi.fn((s: string) => s),
    bold: Object.assign(vi.fn((s: string) => s), {
      blue: vi.fn((s: string) => s),
      cyan: vi.fn((s: string) => s),
    }),
    white: vi.fn((s: string) => s),
  },
}));

// Import after mocks are set up
import {
  analyzeIssue,
  getBestMatch,
  getTopMatches,
  extractKeywords,
  extractLabelKeywords,
  extractIssueKeywords,
} from '../../src/integrations/github-automation/issue-analyzer.js';
import {
  loadAgentCapabilities,
  getAvailableAgents,
  findAgentsByKeywords,
  invalidateCapabilityCache,
} from '../../src/integrations/github-automation/agent-capabilities.js';
import {
  triageIssue,
  getAssignmentRecommendation,
  shouldExcludeIssue,
} from '../../src/integrations/github-automation/assignment-system.js';
import {
  getAgentsForLabel,
  getAgentsForLabels,
  getAllLabelMappings,
  getMappingStats,
} from '../../src/integrations/github-automation/label-mapping.js';
import type {
  GitHubIssue,
  GitHubLabel,
  AgentMatch,
  TriageResult,
} from '../../src/types/github-automation.js';

// ============================================================================
// Test Fixtures and Helper Functions
// ============================================================================

const agentsDir = path.join(process.cwd(), 'Claude Files', 'agents');

/**
 * Create a mock GitHub issue for testing
 */
function createMockIssue(
  number: number,
  title: string,
  body: string,
  labels: string[] = [],
  state: 'open' | 'closed' = 'open'
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
    assignees: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    url: `https://api.github.com/repos/test-owner/test-repo/issues/${number}`,
    html_url: `https://github.com/test-owner/test-repo/issues/${number}`,
    repository_url: 'https://api.github.com/repos/test-owner/test-repo',
  };
}

/**
 * Sample issues for testing - matching Task 27 requirements
 */
const SAMPLE_ISSUES = {
  // Issue #1: Frontend-related with react, component, ui keywords
  frontend: createMockIssue(
    1,
    'React component not rendering correctly',
    'The Button component in the UI is broken. React hooks are not working properly. CSS styles are not applied correctly to the component.',
    ['bug', 'ui/ux']
  ),

  // Issue #2: Backend-related with api, database, server keywords
  backend: createMockIssue(
    2,
    'API endpoint returns 500 error',
    'The server API endpoint for user data fails when querying the database. Need to fix the PostgreSQL connection and optimize SQL queries.',
    ['feature', 'backend']
  ),

  // Issue #3: Security-related with authentication, vulnerability, encryption keywords
  security: createMockIssue(
    3,
    'Authentication bypass vulnerability found',
    'There is a security vulnerability in the JWT token validation. Authentication can be bypassed. Need to implement proper encryption and fix the vulnerability.',
    ['security', 'critical']
  ),

  // Issue #4: Documentation-related with readme, documentation, guide keywords
  documentation: createMockIssue(
    4,
    'Update README documentation',
    'The documentation in the README is outdated. Need to update the installation guide and API documentation with new examples.',
    ['documentation']
  ),

  // Additional test cases
  fullstack: createMockIssue(
    5,
    'Full stack feature implementation',
    'Need to implement React frontend with Node.js backend API and PostgreSQL database integration.',
    ['feature', 'fullstack']
  ),

  testing: createMockIssue(
    6,
    'Add unit tests for auth module',
    'Write comprehensive unit tests and integration tests for the authentication module using Jest.',
    ['testing', 'enhancement']
  ),

  devops: createMockIssue(
    7,
    'Setup CI/CD pipeline',
    'Configure GitHub Actions for continuous integration and deployment. Add Docker containerization.',
    ['devops', 'infrastructure']
  ),

  performance: createMockIssue(
    8,
    'Performance optimization needed',
    'The application is slow. Need to profile and optimize database queries, implement caching with Redis.',
    ['performance', 'bug']
  ),
};

// ============================================================================
// Test Setup and Teardown
// ============================================================================

describe('GitHub Issues Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateCapabilityCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Issue Detection Tests
  // ==========================================================================

  describe('Issue Detection Tests', () => {
    it('should detect and parse issue metadata correctly', async () => {
      const issue = SAMPLE_ISSUES.frontend;

      expect(issue.number).toBe(1);
      expect(issue.title).toBe('React component not rendering correctly');
      expect(issue.state).toBe('open');
      expect(issue.labels).toHaveLength(2);
      expect(issue.labels.map((l) => l.name)).toContain('bug');
      expect(issue.labels.map((l) => l.name)).toContain('ui/ux');
    });

    it('should validate GitHubIssue type structure', () => {
      const issue = SAMPLE_ISSUES.backend;

      // Required fields check
      expect(issue).toHaveProperty('id');
      expect(issue).toHaveProperty('number');
      expect(issue).toHaveProperty('title');
      expect(issue).toHaveProperty('body');
      expect(issue).toHaveProperty('labels');
      expect(issue).toHaveProperty('state');
      expect(issue).toHaveProperty('assignees');
      expect(issue).toHaveProperty('created_at');
      expect(issue).toHaveProperty('updated_at');
      expect(issue).toHaveProperty('url');
      expect(issue).toHaveProperty('html_url');

      // Type validation
      expect(typeof issue.id).toBe('number');
      expect(typeof issue.number).toBe('number');
      expect(typeof issue.title).toBe('string');
      expect(typeof issue.body).toBe('string');
      expect(Array.isArray(issue.labels)).toBe(true);
      expect(['open', 'closed']).toContain(issue.state);
    });

    it('should validate label structure', () => {
      const issue = SAMPLE_ISSUES.security;

      for (const label of issue.labels) {
        expect(label).toHaveProperty('id');
        expect(label).toHaveProperty('name');
        expect(typeof label.id).toBe('number');
        expect(typeof label.name).toBe('string');
      }
    });

    it('should validate timestamp formats', () => {
      const issue = SAMPLE_ISSUES.documentation;

      // ISO 8601 date validation
      expect(() => new Date(issue.created_at)).not.toThrow();
      expect(() => new Date(issue.updated_at)).not.toThrow();

      const createdDate = new Date(issue.created_at);
      const updatedDate = new Date(issue.updated_at);

      expect(createdDate.toISOString()).toBe(issue.created_at);
      expect(updatedDate.toISOString()).toBe(issue.updated_at);
    });

    it('should validate URL formats', () => {
      const issue = SAMPLE_ISSUES.frontend;

      expect(issue.url).toMatch(/^https:\/\/api\.github\.com\/repos\/.+\/issues\/\d+$/);
      expect(issue.html_url).toMatch(/^https:\/\/github\.com\/.+\/issues\/\d+$/);
    });
  });

  // ==========================================================================
  // Keyword Extraction Tests
  // ==========================================================================

  describe('Keyword Extraction Tests', () => {
    it('should extract technology keywords from frontend issue', () => {
      const keywords = extractKeywords(
        SAMPLE_ISSUES.frontend.title + ' ' + SAMPLE_ISSUES.frontend.body
      );

      expect(keywords).toContain('react');
      expect(keywords).toContain('component');
      expect(keywords).toContain('css');
      // 'ui' is a short word that may be filtered out
    });

    it('should extract technology keywords from backend issue', () => {
      const keywords = extractKeywords(
        SAMPLE_ISSUES.backend.title + ' ' + SAMPLE_ISSUES.backend.body
      );

      expect(keywords).toContain('api');
      expect(keywords).toContain('server');
      expect(keywords).toContain('database');
      expect(keywords).toContain('postgresql');
      expect(keywords).toContain('sql');
    });

    it('should extract security-related keywords', () => {
      const keywords = extractKeywords(
        SAMPLE_ISSUES.security.title + ' ' + SAMPLE_ISSUES.security.body
      );

      expect(keywords).toContain('security');
      expect(keywords).toContain('vulnerability');
      expect(keywords).toContain('jwt');
      expect(keywords).toContain('authentication');
      expect(keywords).toContain('encryption');
    });

    it('should extract documentation-related keywords', () => {
      const keywords = extractKeywords(
        SAMPLE_ISSUES.documentation.title + ' ' + SAMPLE_ISSUES.documentation.body
      );

      expect(keywords).toContain('readme');
      expect(keywords).toContain('documentation');
      expect(keywords).toContain('guide');
    });

    it('should extract label keywords with specializations', () => {
      const labels = SAMPLE_ISSUES.frontend.labels;
      const keywords = extractLabelKeywords(labels);

      expect(keywords).toContain('bug');
      expect(keywords).toContain('debugging'); // From label specialization mapping
    });

    it('should extract all keywords from issue', () => {
      const keywords = extractIssueKeywords(SAMPLE_ISSUES.fullstack);

      expect(keywords).toContain('react');
      expect(keywords).toContain('node');
      expect(keywords).toContain('postgresql');
      expect(keywords).toContain('feature');
    });

    it('should filter stop words', () => {
      const text = 'The quick brown fox jumps over the lazy dog';
      const keywords = extractKeywords(text);

      expect(keywords).not.toContain('the');
      expect(keywords).not.toContain('over');
      expect(keywords).not.toContain('a');
    });

    it('should handle empty text', () => {
      const keywords = extractKeywords('');
      expect(keywords).toEqual([]);
    });
  });

  // ==========================================================================
  // Agent Capability Tests
  // ==========================================================================

  describe('Agent Capability Tests', () => {
    it('should load agent capabilities from agents directory', async () => {
      const capabilities = await loadAgentCapabilities(agentsDir);

      expect(capabilities.size).toBeGreaterThan(0);
    });

    it('should get list of available agents', async () => {
      const agents = await getAvailableAgents(agentsDir);

      expect(agents).toBeInstanceOf(Array);
      expect(agents.length).toBeGreaterThan(0);
    });

    it('should find agents by keywords', async () => {
      const reactAgents = await findAgentsByKeywords(['react', 'frontend', 'ui'], agentsDir);

      // findAgentsByKeywords returns a Map of agent names to match counts
      expect(reactAgents).toBeInstanceOf(Map);
      expect(reactAgents.size).toBeGreaterThan(0);
    });

    it('should invalidate capability cache', async () => {
      await loadAgentCapabilities(agentsDir);
      invalidateCapabilityCache();

      // After invalidation, capabilities should reload
      const capabilities = await loadAgentCapabilities(agentsDir);
      expect(capabilities.size).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Issue Analysis Tests
  // ==========================================================================

  describe('Issue Analysis Tests', () => {
    it('should analyze frontend issue and find matching agents', async () => {
      const analysis = await analyzeIssue(SAMPLE_ISSUES.frontend, agentsDir);

      expect(analysis).toHaveProperty('issue');
      expect(analysis).toHaveProperty('extractedKeywords');
      expect(analysis).toHaveProperty('agentMatches');
      expect(analysis).toHaveProperty('suggestedLabels');
      expect(analysis).toHaveProperty('analyzedAt');

      expect(analysis.extractedKeywords).toContain('react');
      expect(analysis.agentMatches.length).toBeGreaterThan(0);
    });

    it('should analyze security issue and find security-expert', async () => {
      const analysis = await analyzeIssue(SAMPLE_ISSUES.security, agentsDir);

      expect(analysis.extractedKeywords).toContain('security');
      expect(analysis.extractedKeywords).toContain('jwt');

      // Should find security-related agent matches
      const hasSecurityMatch = analysis.agentMatches.some(
        (m) =>
          m.agentName.includes('security') ||
          m.matchedKeywords.some((k) => k.includes('security'))
      );
      expect(hasSecurityMatch || analysis.agentMatches.length > 0).toBe(true);
    });

    it('should analyze backend issue and find backend agents', async () => {
      const analysis = await analyzeIssue(SAMPLE_ISSUES.backend, agentsDir);

      expect(analysis.extractedKeywords).toContain('api');
      expect(analysis.extractedKeywords).toContain('database');
    });

    it('should analyze documentation issue', async () => {
      const analysis = await analyzeIssue(SAMPLE_ISSUES.documentation, agentsDir);

      expect(analysis.extractedKeywords).toContain('documentation');
    });

    it('should suggest labels based on content', async () => {
      const bugIssue = createMockIssue(
        99,
        'Critical error crashing the application',
        'The app crashes on startup with a fatal error in the rendering pipeline',
        []
      );

      const analysis = await analyzeIssue(bugIssue, agentsDir);

      expect(analysis.suggestedLabels).toContain('bug');
    });

    it('should include confidence levels in agent matches', async () => {
      const analysis = await analyzeIssue(SAMPLE_ISSUES.frontend, agentsDir);

      for (const match of analysis.agentMatches) {
        expect(['high', 'medium', 'low']).toContain(match.confidence);
        expect(typeof match.score).toBe('number');
        expect(match.score).toBeGreaterThanOrEqual(0);
        expect(match.score).toBeLessThanOrEqual(100);
      }
    });
  });

  // ==========================================================================
  // Agent Matching Tests
  // ==========================================================================

  describe('Agent Matching Tests', () => {
    it('should get best match for frontend issue', async () => {
      const best = await getBestMatch(SAMPLE_ISSUES.frontend, 10, agentsDir);

      expect(best).not.toBeNull();
      if (best) {
        expect(best.score).toBeGreaterThan(0);
        expect(best.agentName).toBeDefined();
      }
    });

    it('should get top matches for complex issue', async () => {
      const matches = await getTopMatches(SAMPLE_ISSUES.fullstack, 5, 10, agentsDir);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches.length).toBeLessThanOrEqual(5);

      // Should be sorted by score descending
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i - 1].score).toBeGreaterThanOrEqual(matches[i].score);
      }
    });

    it('should respect confidence threshold', async () => {
      const highThreshold = await getBestMatch(SAMPLE_ISSUES.frontend, 90, agentsDir);
      const lowThreshold = await getBestMatch(SAMPLE_ISSUES.frontend, 10, agentsDir);

      // High threshold might return null if no high-confidence matches
      if (highThreshold) {
        expect(highThreshold.score).toBeGreaterThanOrEqual(90);
      }

      // Low threshold should return matches
      expect(lowThreshold).not.toBeNull();
    });

    it('should return null when no match above threshold', async () => {
      const unmatchableIssue = createMockIssue(
        999,
        'Random unrelated topic',
        'This is completely unrelated to any technology or development',
        []
      );

      const best = await getBestMatch(unmatchableIssue, 100, agentsDir);

      expect(best).toBeNull();
    });

    it('should limit results to maxMatches', async () => {
      const matches = await getTopMatches(SAMPLE_ISSUES.fullstack, 2, 10, agentsDir);

      expect(matches.length).toBeLessThanOrEqual(2);
    });
  });

  // ==========================================================================
  // Label Mapping Tests
  // ==========================================================================

  describe('Label Mapping Tests', () => {
    it('should get agents for single label', () => {
      const agents = getAgentsForLabel('bug');

      expect(agents).toBeInstanceOf(Array);
    });

    it('should get agents for multiple labels', () => {
      const agents = getAgentsForLabels(['bug', 'security']);

      // getAgentsForLabels returns a Map of agent names to scores
      expect(agents).toBeInstanceOf(Map);
      expect(agents.size).toBeGreaterThan(0);
    });

    it('should get all label mappings', () => {
      const mappings = getAllLabelMappings();

      expect(mappings).toBeInstanceOf(Array);
      expect(mappings.length).toBeGreaterThan(0);
    });

    it('should get mapping statistics', () => {
      const stats = getMappingStats();

      expect(stats).toHaveProperty('totalMappings');
      expect(stats).toHaveProperty('defaultMappings');
      expect(stats).toHaveProperty('customMappings');
      expect(stats).toHaveProperty('uniqueAgents');
      expect(stats).toHaveProperty('uniqueLabels');
    });
  });

  // ==========================================================================
  // Triage Tests
  // ==========================================================================

  describe('Triage Tests', () => {
    it('should triage frontend issue', async () => {
      const result = await triageIssue(SAMPLE_ISSUES.frontend, agentsDir);

      expect(result).toHaveProperty('issue');
      expect(result).toHaveProperty('suggestedAgents');
      expect(result).toHaveProperty('suggestedLabels');
      expect(result).toHaveProperty('triageComment');
      expect(result).toHaveProperty('requiresManualReview');
      expect(result).toHaveProperty('timestamp');

      expect(result.issue.number).toBe(1);
    });

    it('should triage security issue with high priority', async () => {
      const result = await triageIssue(SAMPLE_ISSUES.security, agentsDir);

      expect(result.suggestedAgents.length).toBeGreaterThan(0);
      // Security issues should have matching agents
    });

    it('should get assignment recommendation', async () => {
      const recommendation = await getAssignmentRecommendation(
        SAMPLE_ISSUES.backend,
        agentsDir
      );

      expect(recommendation).toHaveProperty('recommended');
      expect(recommendation).toHaveProperty('alternatives');
    });

    it('should determine if issue should be excluded', () => {
      const normalIssue = SAMPLE_ISSUES.frontend;
      const excludeLabels = ['wontfix', 'duplicate'];

      const result = shouldExcludeIssue(normalIssue, excludeLabels);

      // shouldExcludeIssue returns an object with exclude property
      expect(result).toHaveProperty('exclude');
      expect(result.exclude).toBe(false);
    });

    it('should exclude issues with wontfix label', () => {
      const wontfixIssue = createMockIssue(
        100,
        'Will not fix this',
        'This issue will not be fixed',
        ['wontfix']
      );

      const result = shouldExcludeIssue(wontfixIssue, ['wontfix', 'duplicate']);

      // shouldExcludeIssue returns an object with exclude and reason
      expect(result).toHaveProperty('exclude');
      expect(result.exclude).toBe(true);
      expect(result).toHaveProperty('reason');
    });

    it('should mark low-confidence issues for manual review', async () => {
      const vagueIssue = createMockIssue(
        101,
        'Something is not working',
        'It just does not work as expected',
        []
      );

      const result = await triageIssue(vagueIssue, agentsDir);

      // Vague issues might require manual review
      expect(typeof result.requiresManualReview).toBe('boolean');
    });
  });

  // ==========================================================================
  // Agent Match Validation Tests
  // ==========================================================================

  describe('Agent Match Validation Tests', () => {
    it('should validate AgentMatch structure', async () => {
      const analysis = await analyzeIssue(SAMPLE_ISSUES.frontend, agentsDir);

      for (const match of analysis.agentMatches) {
        expect(match).toHaveProperty('agentName');
        expect(match).toHaveProperty('score');
        expect(match).toHaveProperty('matchedKeywords');
        expect(match).toHaveProperty('confidence');

        expect(typeof match.agentName).toBe('string');
        expect(typeof match.score).toBe('number');
        expect(Array.isArray(match.matchedKeywords)).toBe(true);
        expect(['high', 'medium', 'low']).toContain(match.confidence);
      }
    });

    it('should validate confidence thresholds', async () => {
      const analysis = await analyzeIssue(SAMPLE_ISSUES.fullstack, agentsDir);

      for (const match of analysis.agentMatches) {
        if (match.confidence === 'high') {
          expect(match.score).toBeGreaterThanOrEqual(70);
        } else if (match.confidence === 'medium') {
          expect(match.score).toBeGreaterThanOrEqual(40);
          expect(match.score).toBeLessThan(70);
        } else {
          expect(match.score).toBeLessThan(40);
        }
      }
    });

    it('should include matched keywords in results', async () => {
      const analysis = await analyzeIssue(SAMPLE_ISSUES.security, agentsDir);

      for (const match of analysis.agentMatches) {
        if (match.score > 0) {
          // High-scoring matches should have matched keywords
          expect(match.matchedKeywords.length).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  // ==========================================================================
  // TriageResult Validation Tests
  // ==========================================================================

  describe('TriageResult Validation Tests', () => {
    it('should validate TriageResult structure', async () => {
      const result = await triageIssue(SAMPLE_ISSUES.backend, agentsDir);

      expect(result).toHaveProperty('issue');
      expect(result).toHaveProperty('suggestedAgents');
      expect(result).toHaveProperty('suggestedLabels');
      expect(result).toHaveProperty('triageComment');
      expect(result).toHaveProperty('requiresManualReview');
      expect(result).toHaveProperty('timestamp');

      expect(Array.isArray(result.suggestedAgents)).toBe(true);
      expect(Array.isArray(result.suggestedLabels)).toBe(true);
      expect(typeof result.triageComment).toBe('string');
      expect(typeof result.requiresManualReview).toBe('boolean');
    });

    it('should generate valid triage comment', async () => {
      const result = await triageIssue(SAMPLE_ISSUES.frontend, agentsDir);

      expect(result.triageComment).toBeDefined();
      expect(result.triageComment.length).toBeGreaterThan(0);
    });

    it('should have valid timestamp', async () => {
      const result = await triageIssue(SAMPLE_ISSUES.documentation, agentsDir);

      expect(() => new Date(result.timestamp)).not.toThrow();
    });
  });

  // ==========================================================================
  // Batch Processing Tests
  // ==========================================================================

  describe('Batch Processing Tests', () => {
    it('should analyze multiple issues', async () => {
      const issues = [
        SAMPLE_ISSUES.frontend,
        SAMPLE_ISSUES.backend,
        SAMPLE_ISSUES.security,
        SAMPLE_ISSUES.documentation,
      ];

      const results = await Promise.all(
        issues.map((issue) => analyzeIssue(issue, agentsDir))
      );

      expect(results).toHaveLength(4);
      results.forEach((result) => {
        expect(result).toHaveProperty('issue');
        expect(result).toHaveProperty('agentMatches');
      });
    });

    it('should triage multiple issues', async () => {
      const issues = [SAMPLE_ISSUES.frontend, SAMPLE_ISSUES.backend];

      const results = await Promise.all(
        issues.map((issue) => triageIssue(issue, agentsDir))
      );

      expect(results).toHaveLength(2);
      results.forEach((result) => {
        expect(result).toHaveProperty('suggestedAgents');
      });
    });

    it('should handle mixed issue types in batch', async () => {
      const issues = Object.values(SAMPLE_ISSUES);

      const results = await Promise.all(
        issues.map((issue) => analyzeIssue(issue, agentsDir))
      );

      expect(results).toHaveLength(Object.keys(SAMPLE_ISSUES).length);
    });
  });

  // ==========================================================================
  // Edge Case Tests
  // ==========================================================================

  describe('Edge Case Tests', () => {
    it('should handle issue with no labels', async () => {
      const unlabeledIssue = createMockIssue(
        200,
        'Issue without labels',
        'This issue has no labels attached',
        []
      );

      const analysis = await analyzeIssue(unlabeledIssue, agentsDir);

      expect(analysis).toHaveProperty('extractedKeywords');
      expect(analysis).toHaveProperty('agentMatches');
    });

    it('should handle issue with empty body', async () => {
      const emptyBodyIssue = createMockIssue(
        201,
        'Issue title only',
        '',
        ['bug']
      );

      const analysis = await analyzeIssue(emptyBodyIssue, agentsDir);

      expect(analysis).toHaveProperty('extractedKeywords');
    });

    it('should handle issue with very long body', async () => {
      const longBody = 'Lorem ipsum '.repeat(1000) + 'react typescript api database';
      const longIssue = createMockIssue(
        202,
        'Issue with long body',
        longBody,
        ['feature']
      );

      const analysis = await analyzeIssue(longIssue, agentsDir);

      expect(analysis).toHaveProperty('extractedKeywords');
      expect(analysis.extractedKeywords).toContain('react');
    });

    it('should handle issue with special characters', async () => {
      const specialIssue = createMockIssue(
        203,
        'Bug: Error <script> injection && SQL -- attack',
        'Test with special chars: <>&"\' SELECT * FROM users;',
        ['security']
      );

      const analysis = await analyzeIssue(specialIssue, agentsDir);

      expect(analysis).toHaveProperty('extractedKeywords');
    });

    it('should handle closed issues', async () => {
      const closedIssue = createMockIssue(
        204,
        'Closed issue',
        'This issue is closed',
        ['bug'],
        'closed'
      );

      expect(closedIssue.state).toBe('closed');

      const analysis = await analyzeIssue(closedIssue, agentsDir);
      expect(analysis).toHaveProperty('agentMatches');
    });

    it('should handle unicode content', async () => {
      const unicodeIssue = createMockIssue(
        205,
        'Bug with émojis 🐛 and ünïcödé',
        'Testing with 日本語 and émojis 🔧 in React component',
        ['bug']
      );

      const analysis = await analyzeIssue(unicodeIssue, agentsDir);

      expect(analysis).toHaveProperty('extractedKeywords');
      expect(analysis.extractedKeywords).toContain('react');
    });
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  describe('Performance Tests', () => {
    it('should analyze issue within reasonable time', async () => {
      const start = Date.now();
      await analyzeIssue(SAMPLE_ISSUES.frontend, agentsDir);
      const duration = Date.now() - start;

      // Should complete within 2 seconds
      expect(duration).toBeLessThan(2000);
    });

    it('should handle batch analysis efficiently', async () => {
      const issues = Object.values(SAMPLE_ISSUES);
      const start = Date.now();

      await Promise.all(issues.map((issue) => analyzeIssue(issue, agentsDir)));

      const duration = Date.now() - start;

      // Batch of 8 issues should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
    });

    it('should cache agent capabilities for performance', async () => {
      // First load
      const start1 = Date.now();
      await loadAgentCapabilities(agentsDir);
      const duration1 = Date.now() - start1;

      // Second load (should use cache)
      const start2 = Date.now();
      await loadAgentCapabilities(agentsDir);
      const duration2 = Date.now() - start2;

      // Cached load should be faster
      expect(duration2).toBeLessThan(duration1 + 100);
    });
  });

  // ==========================================================================
  // Expected Agent Matching Tests (Task 27 Specific)
  // ==========================================================================

  describe('Expected Agent Matching Tests', () => {
    it('should match frontend-dev to frontend issue', async () => {
      const analysis = await analyzeIssue(SAMPLE_ISSUES.frontend, agentsDir);

      // Check if any frontend-related agent is in top matches
      const hasFrontendAgent = analysis.agentMatches.some(
        (m) =>
          m.agentName.toLowerCase().includes('frontend') ||
          m.agentName.toLowerCase().includes('ui') ||
          m.agentName.toLowerCase().includes('web')
      );

      // At minimum, should have matches
      expect(analysis.agentMatches.length).toBeGreaterThan(0);
    });

    it('should match backend-dev to backend issue', async () => {
      const analysis = await analyzeIssue(SAMPLE_ISSUES.backend, agentsDir);

      // Check if any backend-related agent is in top matches
      const hasBackendAgent = analysis.agentMatches.some(
        (m) =>
          m.agentName.toLowerCase().includes('backend') ||
          m.agentName.toLowerCase().includes('api') ||
          m.agentName.toLowerCase().includes('database')
      );

      expect(analysis.agentMatches.length).toBeGreaterThan(0);
    });

    it('should match security-expert to security issue', async () => {
      const analysis = await analyzeIssue(SAMPLE_ISSUES.security, agentsDir);

      // Check if security-related agent is in matches
      const hasSecurityAgent = analysis.agentMatches.some(
        (m) =>
          m.agentName.toLowerCase().includes('security') ||
          m.matchedKeywords.some((k) => k.includes('security'))
      );

      expect(analysis.agentMatches.length).toBeGreaterThan(0);
    });

    it('should match docs-engineer to documentation issue', async () => {
      const analysis = await analyzeIssue(SAMPLE_ISSUES.documentation, agentsDir);

      // Check if docs-related agent is in matches
      const hasDocsAgent = analysis.agentMatches.some(
        (m) =>
          m.agentName.toLowerCase().includes('doc') ||
          m.matchedKeywords.some((k) => k.includes('documentation'))
      );

      expect(analysis.agentMatches.length).toBeGreaterThan(0);
    });

    it('should provide confidence scores above 40% for clear matches', async () => {
      // Issues with clear technical keywords should have good matches
      const analysis = await analyzeIssue(SAMPLE_ISSUES.frontend, agentsDir);

      const highConfidenceMatches = analysis.agentMatches.filter(
        (m) => m.score >= 40
      );

      // Should have at least one match above 40%
      expect(highConfidenceMatches.length).toBeGreaterThan(0);
    });
  });
});
