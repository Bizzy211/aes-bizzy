/**
 * Tests for ecosystem configuration management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { existsSync, writeFileSync, renameSync, unlinkSync } from 'node:fs';
import {
  getClaudeConfigDir,
  getEcosystemConfigPath,
  createDefaultConfig,
  validateConfig,
  compareVersions,
  isConfigOutdated,
  getConfigVersion,
  migrateConfig,
  loadConfig,
  saveConfig,
  initConfig,
  getComponent,
  getComponents,
  updateComponent,
  removeComponent,
  updateSettings,
  addMcpServer,
  removeMcpServer,
  getMcpServers,
} from '../../src/config/ecosystem-config.js';
import type { EcosystemConfig, InstalledComponent } from '../../src/types/ecosystem.js';
import { CURRENT_CONFIG_VERSION } from '../../src/types/ecosystem.js';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  writeFileSync: vi.fn(),
  renameSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

vi.mock('node:os', () => ({
  default: {
    homedir: () => '/home/user',
    tmpdir: () => '/tmp',
  },
  homedir: () => '/home/user',
  tmpdir: () => '/tmp',
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Ecosystem Config Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Path helpers', () => {
    it('should return correct config directory', () => {
      expect(getClaudeConfigDir()).toBe(path.join('/home/user', '.claude'));
    });

    it('should return correct config file path', () => {
      expect(getEcosystemConfigPath()).toBe(path.join('/home/user', '.claude', 'ecosystem.json'));
    });
  });

  describe('createDefaultConfig', () => {
    it('should create a valid default config', () => {
      const config = createDefaultConfig();

      expect(config.version).toBe(CURRENT_CONFIG_VERSION);
      expect(config.installedAt).toBeDefined();
      expect(config.lastUpdated).toBeDefined();
      expect(config.components).toEqual({});
      expect(config.mcpServers).toEqual([]);
      expect(config.settings).toBeDefined();
    });
  });

  describe('validateConfig', () => {
    it('should validate a correct config', () => {
      const config = createDefaultConfig();
      const result = validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-object config', () => {
      const result = validateConfig('not an object');

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('object');
    });

    it('should reject missing version', () => {
      const result = validateConfig({ installedAt: '', lastUpdated: '', components: {} });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === 'version')).toBe(true);
    });

    it('should reject invalid version format', () => {
      const result = validateConfig({
        version: 'invalid',
        installedAt: '',
        lastUpdated: '',
        components: {},
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === 'version')).toBe(true);
    });

    it('should add warnings for empty components', () => {
      const config = createDefaultConfig();
      const result = validateConfig(config);

      expect(result.warnings).toContain('No components installed');
    });
  });

  describe('Version helpers', () => {
    it('should compare versions correctly', () => {
      expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
      expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
      expect(compareVersions('1.1.0', '1.0.0')).toBe(1);
      expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
    });

    it('should detect outdated config', () => {
      const config = createDefaultConfig();
      config.version = '0.0.1';

      expect(isConfigOutdated(config)).toBe(true);
    });

    it('should not mark current version as outdated', () => {
      const config = createDefaultConfig();

      expect(isConfigOutdated(config)).toBe(false);
    });

    it('should return current version', () => {
      expect(getConfigVersion()).toBe(CURRENT_CONFIG_VERSION);
    });
  });

  describe('migrateConfig', () => {
    it('should update version if no migration path', () => {
      const oldConfig = {
        ...createDefaultConfig(),
        version: '0.0.1' as const,
      };

      const migrated = migrateConfig(oldConfig);

      expect(migrated.version).toBe(CURRENT_CONFIG_VERSION);
    });
  });

  describe('loadConfig', () => {
    it('should return error when config does not exist', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = await loadConfig();

      expect(result.success).toBe(false);
      expect(result.error).toContain('does not exist');
    });

    it('should load and validate config', async () => {
      const config = createDefaultConfig();
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(config));

      const result = await loadConfig();

      expect(result.success).toBe(true);
      expect(result.config).not.toBeNull();
    });

    it('should reject invalid config', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ invalid: true }));

      const result = await loadConfig();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid config');
    });

    it('should migrate outdated config', async () => {
      const config = { ...createDefaultConfig(), version: '0.0.1' as const };
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(config));

      const result = await loadConfig();

      expect(result.success).toBe(true);
      expect(result.migrated).toBe(true);
      expect(result.previousVersion).toBe('0.0.1');
    });
  });

  describe('saveConfig', () => {
    it('should save valid config', async () => {
      const config = createDefaultConfig();
      vi.mocked(existsSync).mockReturnValue(true);

      const result = await saveConfig(config);

      expect(result.success).toBe(true);
      expect(writeFileSync).toHaveBeenCalled();
      expect(renameSync).toHaveBeenCalled();
    });

    it('should reject invalid config', async () => {
      const invalidConfig = { version: 'bad' } as unknown as EcosystemConfig;

      const result = await saveConfig(invalidConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid config');
    });
  });

  describe('initConfig', () => {
    it('should load existing config', async () => {
      const config = createDefaultConfig();
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(config));

      const result = await initConfig();

      expect(result.success).toBe(true);
    });

    it('should create new config if not exists', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = await initConfig();

      expect(result.success).toBe(true);
      expect(result.config?.version).toBe(CURRENT_CONFIG_VERSION);
    });
  });

  describe('Component operations', () => {
    const testComponent: InstalledComponent = {
      name: 'test-agent',
      type: 'agents',
      installedAt: new Date().toISOString(),
      source: 'local',
      enabled: true,
    };

    beforeEach(() => {
      const config = createDefaultConfig();
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(config));
    });

    it('should return null for non-existent component', async () => {
      const result = await getComponent('nonexistent', 'agents');

      expect(result).toBeNull();
    });

    it('should add a new component', async () => {
      const result = await updateComponent(testComponent);

      expect(result.success).toBe(true);
      expect(result.component?.name).toBe('test-agent');
    });

    it('should get all components of a type', async () => {
      const components = await getComponents('agents');

      expect(Array.isArray(components)).toBe(true);
    });

    it('should remove a component', async () => {
      // First add
      await updateComponent(testComponent);

      // Setup mock to return config with component
      const configWithComponent = createDefaultConfig();
      configWithComponent.components.agents = [testComponent];
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(configWithComponent));

      const result = await removeComponent('test-agent', 'agents');

      expect(result.success).toBe(true);
    });

    it('should return error removing non-existent component', async () => {
      const result = await removeComponent('nonexistent', 'agents');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('Settings operations', () => {
    beforeEach(() => {
      const config = createDefaultConfig();
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(config));
    });

    it('should update settings', async () => {
      const result = await updateSettings({ autoSync: true });

      expect(result.success).toBe(true);
    });
  });

  describe('MCP Server operations', () => {
    beforeEach(() => {
      const config = createDefaultConfig();
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(config));
    });

    it('should add MCP server', async () => {
      const result = await addMcpServer({
        name: 'test-server',
        command: 'npx',
        args: ['test'],
        installedAt: new Date().toISOString(),
        enabled: true,
      });

      expect(result.success).toBe(true);
    });

    it('should get MCP servers', async () => {
      const servers = await getMcpServers();

      expect(Array.isArray(servers)).toBe(true);
    });

    it('should remove MCP server', async () => {
      // Setup with existing server
      const configWithServer = createDefaultConfig();
      configWithServer.mcpServers = [
        {
          name: 'test-server',
          command: 'npx',
          installedAt: new Date().toISOString(),
          enabled: true,
        },
      ];
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(configWithServer));

      const result = await removeMcpServer('test-server');

      expect(result.success).toBe(true);
    });

    it('should return error removing non-existent server', async () => {
      const result = await removeMcpServer('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });
});
