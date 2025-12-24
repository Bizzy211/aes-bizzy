/**
 * Tests for Label-to-Agent Mapping System
 *
 * NOTE: Tests that require agent files are skipped when development
 * files are not available (e.g., in npm package).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import {
  getAllLabelMappings,
  getAgentsForLabel,
  getAgentsForLabels,
  addCustomMapping,
  removeCustomMapping,
  setCustomMappings,
  clearCustomMappings,
  getCustomMappings,
  getDefaultMappings,
  validateMappings,
  suggestMappingsForLabel,
  getBestAgentForLabels,
  exportMappings,
  importMappings,
  getMappingStats,
} from '../../src/integrations/github-automation/label-mapping.js';
import { invalidateCapabilityCache } from '../../src/integrations/github-automation/agent-capabilities.js';

// Check for agents directory in possible locations
const PROJECT_ROOT = path.resolve(process.cwd());
const AGENTS_DIR = fs.existsSync(path.join(PROJECT_ROOT, '.development', 'agents'))
  ? path.join(PROJECT_ROOT, '.development', 'agents')
  : path.join(PROJECT_ROOT, 'Claude Files', 'agents');
const AGENTS_AVAILABLE = fs.existsSync(AGENTS_DIR);

describe('Label Mapping', () => {
  const agentsDir = AGENTS_DIR;

  beforeEach(() => {
    clearCustomMappings();
    invalidateCapabilityCache();
  });

  describe('getDefaultMappings', () => {
    it('should return default mappings', () => {
      const mappings = getDefaultMappings();

      expect(mappings.length).toBeGreaterThan(0);
      expect(mappings.some((m) => m.label === 'bug')).toBe(true);
      expect(mappings.some((m) => m.label === 'security')).toBe(true);
    });

    it('should have priority values', () => {
      const mappings = getDefaultMappings();

      for (const mapping of mappings) {
        expect(typeof mapping.priority).toBe('number');
        expect(mapping.priority).toBeGreaterThan(0);
        expect(mapping.priority).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('getAgentsForLabel', () => {
    it('should return agents for bug label', () => {
      const agents = getAgentsForLabel('bug');

      expect(agents).toContain('debugger');
    });

    it('should return agents for security label', () => {
      const agents = getAgentsForLabel('security');

      expect(agents).toContain('security-expert');
    });

    it('should be case-insensitive', () => {
      const lowercase = getAgentsForLabel('bug');
      const uppercase = getAgentsForLabel('BUG');

      expect(lowercase).toEqual(uppercase);
    });

    it('should return empty array for unknown label', () => {
      const agents = getAgentsForLabel('xyznonexistent');

      expect(agents).toEqual([]);
    });
  });

  describe('getAgentsForLabels', () => {
    it('should aggregate agents from multiple labels', () => {
      const scores = getAgentsForLabels(['bug', 'security']);

      expect(scores.has('debugger')).toBe(true);
      expect(scores.has('security-expert')).toBe(true);
    });

    it('should give higher scores for matching multiple labels', () => {
      const singleLabel = getAgentsForLabels(['frontend']);
      const multipleLabels = getAgentsForLabels(['frontend', 'ui', 'css']);

      const frontendDevSingle = singleLabel.get('frontend-dev') || 0;
      const frontendDevMultiple = multipleLabels.get('frontend-dev') || 0;

      expect(frontendDevMultiple).toBeGreaterThanOrEqual(frontendDevSingle);
    });

    it('should return empty map for empty labels', () => {
      const scores = getAgentsForLabels([]);

      expect(scores.size).toBe(0);
    });
  });

  describe('Custom Mappings', () => {
    it('should add custom mapping', () => {
      addCustomMapping({
        label: 'custom-label',
        agents: ['frontend-dev'],
        priority: 1,
      });

      const custom = getCustomMappings();
      expect(custom.some((m) => m.label === 'custom-label')).toBe(true);
    });

    it('should override existing custom mapping', () => {
      addCustomMapping({
        label: 'test-label',
        agents: ['agent1'],
        priority: 1,
      });

      addCustomMapping({
        label: 'test-label',
        agents: ['agent2'],
        priority: 2,
      });

      const custom = getCustomMappings();
      const testMapping = custom.find((m) => m.label === 'test-label');

      expect(testMapping?.agents).toEqual(['agent2']);
    });

    it('should remove custom mapping', () => {
      addCustomMapping({
        label: 'to-remove',
        agents: ['agent1'],
        priority: 1,
      });

      const removed = removeCustomMapping('to-remove');

      expect(removed).toBe(true);
      expect(getCustomMappings().some((m) => m.label === 'to-remove')).toBe(false);
    });

    it('should return false when removing non-existent mapping', () => {
      const removed = removeCustomMapping('non-existent');

      expect(removed).toBe(false);
    });

    it('should set all custom mappings', () => {
      setCustomMappings([
        { label: 'a', agents: ['agent1'], priority: 1 },
        { label: 'b', agents: ['agent2'], priority: 2 },
      ]);

      const custom = getCustomMappings();
      expect(custom.length).toBe(2);
    });

    it('should clear all custom mappings', () => {
      addCustomMapping({ label: 'test', agents: ['agent1'], priority: 1 });
      clearCustomMappings();

      expect(getCustomMappings().length).toBe(0);
    });

    it('should prioritize custom mappings over defaults', () => {
      addCustomMapping({
        label: 'bug',
        agents: ['custom-debugger'],
        priority: 1,
      });

      const agents = getAgentsForLabel('bug');
      expect(agents).toContain('custom-debugger');
    });
  });

  describe('getAllLabelMappings', () => {
    it('should combine custom and default mappings', () => {
      addCustomMapping({
        label: 'custom',
        agents: ['agent1'],
        priority: 1,
      });

      const all = getAllLabelMappings();

      expect(all.some((m) => m.label === 'custom')).toBe(true);
      expect(all.some((m) => m.label === 'bug')).toBe(true);
    });
  });

  describe.skipIf(!AGENTS_AVAILABLE)('validateMappings', () => {
    it('should validate mappings with existing agents', async () => {
      const mappings = [
        { label: 'test', agents: ['frontend-dev'], priority: 1 },
      ];

      const result = await validateMappings(mappings, agentsDir);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should report errors for non-existent agents', async () => {
      const mappings = [
        { label: 'test', agents: ['non-existent-agent'], priority: 1 },
      ];

      const result = await validateMappings(mappings, agentsDir);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe.skipIf(!AGENTS_AVAILABLE)('suggestMappingsForLabel', () => {
    it('should suggest agents for frontend label', async () => {
      const suggestions = await suggestMappingsForLabel('frontend', agentsDir);

      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should suggest agents for security label', async () => {
      const suggestions = await suggestMappingsForLabel('security', agentsDir);

      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should limit suggestions', async () => {
      const suggestions = await suggestMappingsForLabel('api', agentsDir);

      expect(suggestions.length).toBeLessThanOrEqual(5);
    });
  });

  describe.skipIf(!AGENTS_AVAILABLE)('getBestAgentForLabels', () => {
    it('should return best agent for labels', async () => {
      const best = await getBestAgentForLabels(['frontend', 'ui'], agentsDir);

      expect(best).not.toBeNull();
    });

    it('should return null for unknown labels', async () => {
      const best = await getBestAgentForLabels(['xyznonexistent'], agentsDir);

      expect(best).toBeNull();
    });
  });

  describe('Export/Import', () => {
    it('should export mappings as JSON', () => {
      const json = exportMappings();
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
    });

    it('should import valid mappings', () => {
      const mappings = [
        { label: 'imported', agents: ['agent1'], priority: 1 },
      ];

      const result = importMappings(JSON.stringify(mappings));

      expect(result.success).toBe(true);
      expect(getCustomMappings().some((m) => m.label === 'imported')).toBe(true);
    });

    it('should reject invalid JSON', () => {
      const result = importMappings('not valid json');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject invalid structure', () => {
      const result = importMappings(JSON.stringify([{ invalid: 'structure' }]));

      expect(result.success).toBe(false);
    });
  });

  describe('getMappingStats', () => {
    it('should return mapping statistics', () => {
      const stats = getMappingStats();

      expect(stats.totalMappings).toBeGreaterThan(0);
      expect(stats.defaultMappings).toBeGreaterThan(0);
      expect(stats.customMappings).toBe(0);
      expect(stats.uniqueAgents).toBeGreaterThan(0);
      expect(stats.uniqueLabels).toBeGreaterThan(0);
    });

    it('should include custom mappings in count', () => {
      addCustomMapping({ label: 'custom', agents: ['new-agent'], priority: 1 });

      const stats = getMappingStats();

      expect(stats.customMappings).toBe(1);
    });
  });
});
