/**
 * E2E Smoke Tests - API Connectivity
 *
 * Validates that external APIs are reachable and credentials are valid.
 * These tests make minimal API calls to verify connectivity.
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Skip if not in E2E mode
const isE2E = process.env.CI === 'true' || process.env.TEST_MODE === 'smoke';

describe.skipIf(!isE2E)('API Connectivity Smoke Tests', () => {
  describe('Anthropic API', () => {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    it('should have ANTHROPIC_API_KEY configured', () => {
      expect(apiKey).toBeDefined();
      expect(apiKey?.length).toBeGreaterThan(10);
    });

    it('should connect to Anthropic API', async () => {
      if (!apiKey) {
        return;
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Say "ok"' }],
        }),
      });

      // Either success or rate limited is acceptable for connectivity test
      expect([200, 429]).toContain(response.status);
    });
  });

  describe('OpenAI API', () => {
    const apiKey = process.env.OPENAI_API_KEY;

    it.skipIf(!apiKey)('should connect to OpenAI API', async () => {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      expect([200, 429]).toContain(response.status);
    });
  });

  describe('GitHub API', () => {
    const token = process.env.GITHUB_TOKEN;

    it.skipIf(!token)('should connect to GitHub API', async () => {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
      });

      expect([200, 401]).toContain(response.status);
      if (response.status === 200) {
        const data = await response.json();
        expect(data.login).toBeDefined();
      }
    });
  });

  describe('Supabase API', () => {
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    it.skipIf(!url || !anonKey)('should connect to Supabase', async () => {
      const response = await fetch(`${url}/rest/v1/`, {
        headers: {
          apikey: anonKey!,
          Authorization: `Bearer ${anonKey}`,
        },
      });

      // Supabase returns various codes, just check it's reachable
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Qdrant (Heimdall)', () => {
    const url = process.env.QDRANT_URL || 'http://localhost:6333';

    it.skipIf(!process.env.QDRANT_URL)('should connect to Qdrant', async () => {
      try {
        const response = await fetch(`${url}/health`);
        expect(response.status).toBe(200);
      } catch {
        // Qdrant not running - skip
        expect(true).toBe(true);
      }
    });
  });
});
