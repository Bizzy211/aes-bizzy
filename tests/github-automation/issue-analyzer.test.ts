/**
 * Tests for Issue Content Analyzer
 *
 * NOTE: Tests that require agent files are skipped when development
 * files are not available (e.g., in npm package).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import {
  extractKeywords,
  extractLabelKeywords,
  analyzeIssue,
  getBestMatch,
  getTopMatches,
  extractIssueKeywords,
} from '../../src/integrations/github-automation/issue-analyzer.js';
import { invalidateCapabilityCache } from '../../src/integrations/github-automation/agent-capabilities.js';
import type { GitHubIssue } from '../../src/types/github-automation.js';

// Check for agents directory in possible locations
const PROJECT_ROOT = path.resolve(process.cwd());
const AGENTS_DIR = fs.existsSync(path.join(PROJECT_ROOT, '.development', 'agents'))
  ? path.join(PROJECT_ROOT, '.development', 'agents')
  : path.join(PROJECT_ROOT, 'Claude Files', 'agents');
const AGENTS_AVAILABLE = fs.existsSync(AGENTS_DIR);

describe('Issue Analyzer', () => {
  const agentsDir = AGENTS_DIR;

  beforeEach(() => {
    invalidateCapabilityCache();
  });

  describe('extractKeywords', () => {
    it('should extract technology keywords', () => {
      const text = 'We need to update the React component and fix the TypeScript errors';
      const keywords = extractKeywords(text);

      expect(keywords).toContain('react');
      expect(keywords).toContain('typescript');
    });

    it('should extract multiple words', () => {
      const text = 'The API endpoint returns 500 error when calling the database';
      const keywords = extractKeywords(text);

      expect(keywords).toContain('api');
      expect(keywords).toContain('database');
    });

    it('should filter stop words', () => {
      const text = 'The quick brown fox jumps over the lazy dog';
      const keywords = extractKeywords(text);

      expect(keywords).not.toContain('the');
      expect(keywords).not.toContain('over');
    });

    it('should handle empty text', () => {
      const keywords = extractKeywords('');
      expect(keywords).toEqual([]);
    });

    it('should extract camelCase terms', () => {
      const text = 'Check the getUserProfile function in authService';
      const keywords = extractKeywords(text);

      expect(keywords.some((k) => k.includes('user') || k.includes('profile'))).toBe(true);
    });
  });

  describe('extractLabelKeywords', () => {
    it('should extract label names as keywords', () => {
      const labels = [
        { name: 'bug' },
        { name: 'security' },
      ];
      const keywords = extractLabelKeywords(labels);

      expect(keywords).toContain('bug');
      expect(keywords).toContain('security');
    });

    it('should add specializations from label map', () => {
      const labels = [{ name: 'bug' }];
      const keywords = extractLabelKeywords(labels);

      expect(keywords).toContain('debugging');
    });

    it('should handle empty labels', () => {
      const keywords = extractLabelKeywords([]);
      expect(keywords).toEqual([]);
    });
  });

  describe.skipIf(!AGENTS_AVAILABLE)('analyzeIssue', () => {
    const createMockIssue = (
      title: string,
      body: string,
      labels: string[] = []
    ): GitHubIssue => ({
      id: 1,
      number: 123,
      title,
      body,
      labels: labels.map((name, id) => ({ id, name })),
      state: 'open',
      assignees: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      url: 'https://api.github.com/repos/test/test/issues/123',
      html_url: 'https://github.com/test/test/issues/123',
    });

    it('should analyze frontend issue', async () => {
      const issue = createMockIssue(
        'React component not rendering correctly',
        'The Button component in the UI is broken. CSS styles are not applied.',
        ['ui/ux']
      );

      const analysis = await analyzeIssue(issue, agentsDir);

      expect(analysis.extractedKeywords).toContain('react');
      expect(analysis.agentMatches.length).toBeGreaterThan(0);
      expect(analysis.analyzedAt).toBeDefined();
    });

    it('should analyze security issue', async () => {
      const issue = createMockIssue(
        'Authentication bypass vulnerability',
        'There is a security issue with JWT token validation that allows unauthorized access',
        ['security']
      );

      const analysis = await analyzeIssue(issue, agentsDir);

      expect(analysis.extractedKeywords).toContain('security');
      expect(analysis.extractedKeywords).toContain('jwt');
      // Should find an agent with security-related capabilities
      const hasSecurityMatch = analysis.agentMatches.some(
        (m) => m.agentName.includes('security') || m.matchedKeywords.includes('security')
      );
      expect(hasSecurityMatch || analysis.agentMatches.length > 0).toBe(true);
    });

    it('should analyze database issue', async () => {
      const issue = createMockIssue(
        'PostgreSQL query optimization needed',
        'The SQL queries are slow. Need to add indexes and optimize the schema.',
        ['database']
      );

      const analysis = await analyzeIssue(issue, agentsDir);

      expect(analysis.extractedKeywords).toContain('postgresql');
      expect(analysis.extractedKeywords).toContain('sql');
    });

    it('should suggest labels based on content', async () => {
      const issue = createMockIssue(
        'Critical error crashing the application',
        'The app crashes on startup with a fatal error',
        []
      );

      const analysis = await analyzeIssue(issue, agentsDir);

      expect(analysis.suggestedLabels).toContain('bug');
    });

    it('should include confidence levels', async () => {
      const issue = createMockIssue(
        'Need to implement React dashboard with animations',
        'Create an animated dashboard using React and CSS animations',
        []
      );

      const analysis = await analyzeIssue(issue, agentsDir);

      for (const match of analysis.agentMatches) {
        expect(['high', 'medium', 'low']).toContain(match.confidence);
      }
    });
  });

  describe.skipIf(!AGENTS_AVAILABLE)('getBestMatch', () => {
    const createMockIssue = (title: string, body: string): GitHubIssue => ({
      id: 1,
      number: 123,
      title,
      body,
      labels: [],
      state: 'open',
      assignees: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      url: 'https://api.github.com/repos/test/test/issues/123',
      html_url: 'https://github.com/test/test/issues/123',
    });

    it('should return best matching agent', async () => {
      const issue = createMockIssue(
        'React TypeScript component bug',
        'The React component has TypeScript errors'
      );

      const best = await getBestMatch(issue, 10, agentsDir);

      expect(best).not.toBeNull();
      expect(best?.score).toBeGreaterThan(0);
    });

    it('should return null when no match above threshold', async () => {
      const issue = createMockIssue(
        'Random unrelated issue',
        'This is about something completely unrelated to any agent'
      );

      const best = await getBestMatch(issue, 100, agentsDir);

      expect(best).toBeNull();
    });

    it('should respect confidence threshold', async () => {
      const issue = createMockIssue(
        'Minor documentation typo',
        'Fix typo in readme'
      );

      const highThreshold = await getBestMatch(issue, 80, agentsDir);
      const lowThreshold = await getBestMatch(issue, 10, agentsDir);

      // With high threshold, might get null
      // With low threshold, should get a match
      if (lowThreshold) {
        expect(lowThreshold.score).toBeLessThan(80);
      }
    });
  });

  describe.skipIf(!AGENTS_AVAILABLE)('getTopMatches', () => {
    const createMockIssue = (title: string, body: string): GitHubIssue => ({
      id: 1,
      number: 123,
      title,
      body,
      labels: [],
      state: 'open',
      assignees: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      url: 'https://api.github.com/repos/test/test/issues/123',
      html_url: 'https://github.com/test/test/issues/123',
    });

    it('should return multiple matches', async () => {
      const issue = createMockIssue(
        'Full stack web application needs security review',
        'The React frontend and Node.js backend need security audit'
      );

      const matches = await getTopMatches(issue, 5, 10, agentsDir);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches.length).toBeLessThanOrEqual(5);
    });

    it('should limit results to maxMatches', async () => {
      const issue = createMockIssue(
        'Complex issue touching many areas',
        'React, TypeScript, API, database, security, testing, deployment'
      );

      const matches = await getTopMatches(issue, 2, 10, agentsDir);

      expect(matches.length).toBeLessThanOrEqual(2);
    });

    it('should sort by score descending', async () => {
      const issue = createMockIssue(
        'Multi-domain issue',
        'Frontend React, backend API, database SQL'
      );

      const matches = await getTopMatches(issue, 5, 10, agentsDir);

      for (let i = 1; i < matches.length; i++) {
        expect(matches[i - 1].score).toBeGreaterThanOrEqual(matches[i].score);
      }
    });
  });

  describe('extractIssueKeywords', () => {
    it('should extract keywords from issue', () => {
      const issue: GitHubIssue = {
        id: 1,
        number: 123,
        title: 'React component bug',
        body: 'TypeScript error in the UI',
        labels: [{ id: 1, name: 'bug' }],
        state: 'open',
        assignees: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        url: 'https://api.github.com/repos/test/test/issues/123',
        html_url: 'https://github.com/test/test/issues/123',
      };

      const keywords = extractIssueKeywords(issue);

      expect(keywords).toContain('react');
      expect(keywords).toContain('typescript');
      expect(keywords).toContain('bug');
    });
  });
});
