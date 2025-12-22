/**
 * Tests for PR Linking and Status Sync
 */

import { describe, it, expect } from 'vitest';
import {
  extractIssueReferences,
  parsePRForIssues,
  determineLinkType,
  createPRLinkEvent,
  generatePRSummary,
} from '../../src/integrations/github-automation/pr-linking.js';

describe('PR Linking', () => {
  describe('extractIssueReferences', () => {
    it('should extract fix references', () => {
      const text = 'This fixes #123';
      const refs = extractIssueReferences(text);

      expect(refs.get(123)).toBe('fixes');
    });

    it('should extract close references', () => {
      const text = 'Closes #456';
      const refs = extractIssueReferences(text);

      expect(refs.get(456)).toBe('fixes');
    });

    it('should extract resolve references', () => {
      const text = 'Resolves #789';
      const refs = extractIssueReferences(text);

      expect(refs.get(789)).toBe('fixes');
    });

    it('should extract relates references', () => {
      const text = 'This relates to #111';
      const refs = extractIssueReferences(text);

      expect(refs.get(111)).toBe('relates');
    });

    it('should extract multiple references', () => {
      const text = 'Fixes #1, closes #2, relates to #3';
      const refs = extractIssueReferences(text);

      expect(refs.size).toBe(3);
      expect(refs.get(1)).toBe('fixes');
      expect(refs.get(2)).toBe('fixes');
      expect(refs.get(3)).toBe('relates');
    });

    it('should handle URL references', () => {
      const text = 'See https://github.com/owner/repo/issues/555';
      const refs = extractIssueReferences(text);

      expect(refs.has(555)).toBe(true);
    });

    it('should prefer fixes over relates for same issue', () => {
      const text = 'Relates to #123, actually this fixes #123';
      const refs = extractIssueReferences(text);

      expect(refs.get(123)).toBe('fixes');
    });

    it('should handle empty text', () => {
      const refs = extractIssueReferences('');
      expect(refs.size).toBe(0);
    });

    it('should handle text without references', () => {
      const refs = extractIssueReferences('Just some regular text');
      expect(refs.size).toBe(0);
    });

    it('should handle various fix patterns', () => {
      const patterns = [
        ['fix #1', 'fixes'],
        ['fixes #2', 'fixes'],
        ['fixed #3', 'fixes'],
        ['close #4', 'fixes'],
        ['closes #5', 'fixes'],
        ['closed #6', 'fixes'],
        ['resolve #7', 'fixes'],
        ['resolves #8', 'fixes'],
        ['resolved #9', 'fixes'],
      ];

      for (const [text, expectedType] of patterns) {
        const refs = extractIssueReferences(text);
        const issueNum = parseInt(text.match(/#(\d+)/)?.[1] || '0', 10);
        expect(refs.get(issueNum)).toBe(expectedType);
      }
    });
  });

  describe('parsePRForIssues', () => {
    it('should parse PR title and body', () => {
      const title = 'Fix login bug #100';
      const body = 'This PR fixes #100 and relates to #200';

      const issues = parsePRForIssues(title, body);

      expect(issues).toContain(100);
      expect(issues).toContain(200);
    });

    it('should handle empty body', () => {
      const title = 'Fixes #123';
      const body = '';

      const issues = parsePRForIssues(title, body);

      expect(issues).toContain(123);
    });

    it('should deduplicate issues', () => {
      const title = 'Fixes #123';
      const body = 'Also fixes #123';

      const issues = parsePRForIssues(title, body);

      expect(issues.filter((n) => n === 123)).toHaveLength(1);
    });
  });

  describe('determineLinkType', () => {
    it('should return fixes for fix keywords', () => {
      expect(determineLinkType('Fixes #1', 1)).toBe('fixes');
      expect(determineLinkType('Closes #1', 1)).toBe('fixes');
      expect(determineLinkType('Resolves #1', 1)).toBe('fixes');
    });

    it('should return relates for relate keywords', () => {
      expect(determineLinkType('Relates to #1', 1)).toBe('relates');
      expect(determineLinkType('See #1', 1)).toBe('relates');
    });

    it('should return relates for unknown issues', () => {
      expect(determineLinkType('Random text', 999)).toBe('relates');
    });
  });

  describe('createPRLinkEvent', () => {
    it('should create PR link event', () => {
      const event = createPRLinkEvent(
        42,
        'Fix authentication bug',
        'This PR fixes #100 and #200',
        'https://github.com/owner/repo/pull/42'
      );

      expect(event.prNumber).toBe(42);
      expect(event.prTitle).toBe('Fix authentication bug');
      expect(event.prUrl).toBe('https://github.com/owner/repo/pull/42');
      expect(event.linkedIssues).toContain(100);
      expect(event.linkedIssues).toContain(200);
      expect(event.linkType).toBe('fixes');
      expect(event.timestamp).toBeDefined();
    });

    it('should handle PR with no linked issues', () => {
      const event = createPRLinkEvent(
        1,
        'Minor refactor',
        'Just cleaning up code',
        'https://github.com/owner/repo/pull/1'
      );

      expect(event.linkedIssues).toHaveLength(0);
      expect(event.linkType).toBe('relates');
    });
  });

  describe('generatePRSummary', () => {
    it('should generate summary', () => {
      const event = createPRLinkEvent(
        42,
        'Fix bug',
        'Fixes #100',
        'https://github.com/owner/repo/pull/42'
      );

      const summary = generatePRSummary(event);

      expect(summary).toContain('PR #42');
      expect(summary).toContain('Fix bug');
      expect(summary).toContain('fixes');
      expect(summary).toContain('#100');
    });

    it('should handle no linked issues', () => {
      const event = createPRLinkEvent(
        1,
        'Refactor',
        'No issues',
        'https://github.com/owner/repo/pull/1'
      );

      const summary = generatePRSummary(event);

      expect(summary).toContain('None');
    });
  });
});
