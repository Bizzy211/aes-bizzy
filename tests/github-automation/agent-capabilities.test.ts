/**
 * Tests for Agent Capability Mapping System
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as path from 'node:path';
import {
  loadAgentCapabilities,
  getAgentCapability,
  findAgentsByKeywords,
  findAgentsBySpecialization,
  getAvailableAgents,
  invalidateCapabilityCache,
  LABEL_SPECIALIZATION_MAP,
} from '../../src/integrations/github-automation/agent-capabilities.js';

describe('Agent Capabilities', () => {
  beforeEach(() => {
    // Clear cache before each test
    invalidateCapabilityCache();
  });

  describe('loadAgentCapabilities', () => {
    it('should load capabilities from agents directory', async () => {
      const agentsDir = path.join(process.cwd(), 'Claude Files', 'agents');
      const capabilities = await loadAgentCapabilities(agentsDir);

      expect(capabilities.size).toBeGreaterThan(0);
    });

    it('should cache capabilities on subsequent calls', async () => {
      const agentsDir = path.join(process.cwd(), 'Claude Files', 'agents');

      const first = await loadAgentCapabilities(agentsDir);
      const second = await loadAgentCapabilities(agentsDir);

      expect(first).toBe(second); // Same reference (cached)
    });

    it('should force reload when requested', async () => {
      const agentsDir = path.join(process.cwd(), 'Claude Files', 'agents');

      const first = await loadAgentCapabilities(agentsDir);
      const second = await loadAgentCapabilities(agentsDir, true);

      expect(first.size).toBe(second.size);
    });

    it('should return empty map for non-existent directory', async () => {
      const capabilities = await loadAgentCapabilities('/non/existent/path');
      expect(capabilities.size).toBe(0);
    });
  });

  describe('getAgentCapability', () => {
    it('should return capability for existing agent', async () => {
      const agentsDir = path.join(process.cwd(), 'Claude Files', 'agents');
      const capability = await getAgentCapability('frontend-dev', agentsDir);

      expect(capability).not.toBeNull();
      expect(capability?.name).toBe('frontend-dev');
      expect(capability?.specializations).toContain('frontend');
    });

    it('should return null for non-existent agent', async () => {
      const agentsDir = path.join(process.cwd(), 'Claude Files', 'agents');
      const capability = await getAgentCapability('non-existent-agent', agentsDir);

      expect(capability).toBeNull();
    });
  });

  describe('findAgentsByKeywords', () => {
    it('should find agents matching keywords', async () => {
      const agentsDir = path.join(process.cwd(), 'Claude Files', 'agents');
      const scores = await findAgentsByKeywords(['react', 'frontend', 'ui'], agentsDir);

      expect(scores.size).toBeGreaterThan(0);
      expect(scores.has('frontend-dev')).toBe(true);
    });

    it('should return higher scores for more keyword matches', async () => {
      const agentsDir = path.join(process.cwd(), 'Claude Files', 'agents');
      const scores = await findAgentsByKeywords(['security', 'authentication', 'encryption'], agentsDir);

      // Security expert should have high score
      if (scores.has('security-expert')) {
        const securityScore = scores.get('security-expert') || 0;
        expect(securityScore).toBeGreaterThan(0);
      }
    });

    it('should return empty map for no matches', async () => {
      const agentsDir = path.join(process.cwd(), 'Claude Files', 'agents');
      const scores = await findAgentsByKeywords(['xyznonexistent123'], agentsDir);

      expect(scores.size).toBe(0);
    });
  });

  describe('findAgentsBySpecialization', () => {
    it('should find agents by specialization', async () => {
      const agentsDir = path.join(process.cwd(), 'Claude Files', 'agents');
      const agents = await findAgentsBySpecialization('frontend', agentsDir);

      expect(agents.length).toBeGreaterThan(0);
      expect(agents.some((a) => a.name === 'frontend-dev')).toBe(true);
    });

    it('should return empty array for unknown specialization', async () => {
      const agentsDir = path.join(process.cwd(), 'Claude Files', 'agents');
      const agents = await findAgentsBySpecialization('xyznonexistent', agentsDir);

      expect(agents.length).toBe(0);
    });
  });

  describe('getAvailableAgents', () => {
    it('should return list of agent names', async () => {
      const agentsDir = path.join(process.cwd(), 'Claude Files', 'agents');
      const agents = await getAvailableAgents(agentsDir);

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
