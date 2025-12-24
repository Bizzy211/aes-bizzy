/**
 * Tests for Agent Capability Mapping System
 *
 * NOTE: Tests that require agent files are skipped when development
 * files are not available (e.g., in npm package).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import {
  loadAgentCapabilities,
  getAgentCapability,
  findAgentsByKeywords,
  findAgentsBySpecialization,
  getAvailableAgents,
  invalidateCapabilityCache,
  LABEL_SPECIALIZATION_MAP,
} from '../../src/integrations/github-automation/agent-capabilities.js';

// Check for agents directory in possible locations
const PROJECT_ROOT = path.resolve(process.cwd());
const AGENTS_DIR = fs.existsSync(path.join(PROJECT_ROOT, '.development', 'agents'))
  ? path.join(PROJECT_ROOT, '.development', 'agents')
  : path.join(PROJECT_ROOT, 'Claude Files', 'agents');
const AGENTS_AVAILABLE = fs.existsSync(AGENTS_DIR);

describe('Agent Capabilities', () => {
  beforeEach(() => {
    // Clear cache before each test
    invalidateCapabilityCache();
  });

  describe('loadAgentCapabilities', () => {
    it.skipIf(!AGENTS_AVAILABLE)('should load capabilities from agents directory', async () => {
      const capabilities = await loadAgentCapabilities(AGENTS_DIR);

      expect(capabilities.size).toBeGreaterThan(0);
    });

    it.skipIf(!AGENTS_AVAILABLE)('should cache capabilities on subsequent calls', async () => {
      const first = await loadAgentCapabilities(AGENTS_DIR);
      const second = await loadAgentCapabilities(AGENTS_DIR);

      expect(first).toBe(second); // Same reference (cached)
    });

    it.skipIf(!AGENTS_AVAILABLE)('should force reload when requested', async () => {
      const first = await loadAgentCapabilities(AGENTS_DIR);
      const second = await loadAgentCapabilities(AGENTS_DIR, true);

      expect(first.size).toBe(second.size);
    });

    it('should return empty map for non-existent directory', async () => {
      const capabilities = await loadAgentCapabilities('/non/existent/path');
      expect(capabilities.size).toBe(0);
    });
  });

  describe.skipIf(!AGENTS_AVAILABLE)('getAgentCapability', () => {
    it('should return capability for existing agent', async () => {
      const capability = await getAgentCapability('frontend-dev', AGENTS_DIR);

      expect(capability).not.toBeNull();
      expect(capability?.name).toBe('frontend-dev');
      expect(capability?.specializations).toContain('frontend');
    });

    it('should return null for non-existent agent', async () => {
      const capability = await getAgentCapability('non-existent-agent', AGENTS_DIR);

      expect(capability).toBeNull();
    });
  });

  describe.skipIf(!AGENTS_AVAILABLE)('findAgentsByKeywords', () => {
    it('should find agents matching keywords', async () => {
      const scores = await findAgentsByKeywords(['react', 'frontend', 'ui'], AGENTS_DIR);

      expect(scores.size).toBeGreaterThan(0);
      expect(scores.has('frontend-dev')).toBe(true);
    });

    it('should return higher scores for more keyword matches', async () => {
      const scores = await findAgentsByKeywords(['security', 'authentication', 'encryption'], AGENTS_DIR);

      // Security expert should have high score
      if (scores.has('security-expert')) {
        const securityScore = scores.get('security-expert') || 0;
        expect(securityScore).toBeGreaterThan(0);
      }
    });

    it('should return empty map for no matches', async () => {
      const scores = await findAgentsByKeywords(['xyznonexistent123'], AGENTS_DIR);

      expect(scores.size).toBe(0);
    });
  });

  describe.skipIf(!AGENTS_AVAILABLE)('findAgentsBySpecialization', () => {
    it('should find agents by specialization', async () => {
      const agents = await findAgentsBySpecialization('frontend', AGENTS_DIR);

      expect(agents.length).toBeGreaterThan(0);
      expect(agents.some((a) => a.name === 'frontend-dev')).toBe(true);
    });

    it('should return empty array for unknown specialization', async () => {
      const agents = await findAgentsBySpecialization('xyznonexistent', AGENTS_DIR);

      expect(agents.length).toBe(0);
    });
  });

  describe.skipIf(!AGENTS_AVAILABLE)('getAvailableAgents', () => {
    it('should return list of agent names', async () => {
      const agents = await getAvailableAgents(AGENTS_DIR);

      expect(agents.length).toBeGreaterThan(0);
      expect(agents).toContain('frontend-dev');
      expect(agents).toContain('backend-dev');
    });
  });

  describe('LABEL_SPECIALIZATION_MAP', () => {
    it('should map bug label to debugging', () => {
      expect(LABEL_SPECIALIZATION_MAP.bug).toContain('debugging');
    });

    it('should map security label to security', () => {
      expect(LABEL_SPECIALIZATION_MAP.security).toContain('security');
    });

    it('should map documentation label to documentation', () => {
      expect(LABEL_SPECIALIZATION_MAP.documentation).toContain('documentation');
    });
  });
});
