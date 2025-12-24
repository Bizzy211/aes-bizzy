/**
 * Tests for interactive init wizard
 *
 * Note: These tests verify the wizard's skip flag behavior.
 * Full integration tests are challenging due to signal handlers and async state.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock all dependencies before imports
vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  cancel: vi.fn(),
  log: {
    step: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  note: vi.fn(),
  confirm: vi.fn().mockResolvedValue(true),
  select: vi.fn().mockResolvedValue('npm'),
  multiselect: vi.fn().mockResolvedValue(['agents', 'hooks']),
  isCancel: vi.fn().mockReturnValue(false),
}));

vi.mock('gradient-string', () => ({
  default: {
    pastel: {
      multiline: vi.fn((str: string) => str),
    },
  },
}));

vi.mock('ora', () => ({
  default: vi.fn().mockReturnValue({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
  }),
}));

vi.mock('../../src/utils/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('../../src/config/ecosystem-config.js', () => ({
  initConfig: vi.fn(),
  saveConfig: vi.fn(),
}));

vi.mock('../../src/installers/prerequisites.js', () => ({
  checkPrerequisites: vi.fn(),
}));

vi.mock('../../src/installers/claude-code.js', () => ({
  installClaudeCode: vi.fn(),
}));

vi.mock('../../src/installers/github.js', () => ({
  authenticateGitHub: vi.fn(),
  getStoredGitHubToken: vi.fn(),
}));

vi.mock('../../src/sync/repo-sync.js', () => ({
  syncPrivateRepo: vi.fn(),
}));

vi.mock('../../src/installers/beads.js', () => ({
  getAvailableMethods: vi.fn(),
  installBeads: vi.fn(),
  isBeadsInstalled: vi.fn(),
  getBeadsVersion: vi.fn(),
}));

vi.mock('../../src/installers/task-master.js', () => ({
  installTaskMaster: vi.fn(),
  selectModel: vi.fn(),
  isTaskMasterInstalled: vi.fn(),
}));

vi.mock('../../src/installers/mcp-servers.js', () => ({
  selectMCPServers: vi.fn(),
  installMCPServers: vi.fn(),
}));

// Import after mocks
import { runInitWizard, type InitOptions } from '../../src/cli/init.js';
import * as prompts from '@clack/prompts';
import { initConfig, saveConfig } from '../../src/config/ecosystem-config.js';
import { checkPrerequisites } from '../../src/installers/prerequisites.js';
import { authenticateGitHub, getStoredGitHubToken } from '../../src/installers/github.js';
import { syncPrivateRepo } from '../../src/sync/repo-sync.js';
import { isBeadsInstalled, getBeadsVersion } from '../../src/installers/beads.js';
import { isTaskMasterInstalled } from '../../src/installers/task-master.js';
import { selectMCPServers, installMCPServers } from '../../src/installers/mcp-servers.js';

// Store original process.on to restore later
const originalOn = process.on.bind(process);

describe('Init Wizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock process.on to prevent listener accumulation
    process.on = vi.fn(() => process) as typeof process.on;

    // Setup default successful mocks
    vi.mocked(prompts.isCancel).mockReturnValue(false);
    vi.mocked(prompts.confirm).mockResolvedValue(true);
    vi.mocked(prompts.select).mockResolvedValue('npm');
    vi.mocked(prompts.multiselect).mockResolvedValue(['agents', 'hooks']);

    vi.mocked(checkPrerequisites).mockResolvedValue({
      node: { installed: true, version: '20.10.0', satisfies: true },
      npm: { installed: true, version: '10.2.0', satisfies: true },
      git: { installed: true, version: '2.42.0', satisfies: true },
      claudeCode: { installed: true, version: '1.0.0', satisfies: true },
      allSatisfied: true,
    });

    vi.mocked(authenticateGitHub).mockResolvedValue({
      authenticated: true,
      method: 'device-flow',
      username: 'testuser',
    });

    vi.mocked(getStoredGitHubToken).mockResolvedValue('test-token');

    vi.mocked(syncPrivateRepo).mockResolvedValue({
      success: true,
      synced: [{ path: 'agents/test.md', action: 'created', type: 'agents' }],
      skipped: [],
      errors: [],
      stats: { total: 1, created: 1, updated: 0, skipped: 0, errors: 0 },
    });

    vi.mocked(isBeadsInstalled).mockResolvedValue(true);
    vi.mocked(getBeadsVersion).mockResolvedValue('2.0.0');

    vi.mocked(isTaskMasterInstalled).mockResolvedValue({
      available: true,
      version: '0.40.0',
      path: '/usr/local/bin/task-master',
    });

    vi.mocked(selectMCPServers).mockResolvedValue(['task-master-ai']);
    vi.mocked(installMCPServers).mockResolvedValue({
      installed: ['task-master-ai'],
      skipped: [],
      failed: [],
    });

    vi.mocked(initConfig).mockResolvedValue({
      success: true,
      config: {
        version: '1.0.0',
        installedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        components: {},
        mcpServers: [],
      },
    });

    vi.mocked(saveConfig).mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.on = originalOn;
  });

  describe('Skip flags', () => {
    it('should skip installer steps when all skip flags are set', async () => {
      const options: InitOptions = {
        skipPrerequisites: true,
        skipGithub: true,
        skipSync: true,
        skipBeads: true,
        skipTaskmaster: true,
        skipMcp: true,
      };

      await runInitWizard(options);

      // Verify installer functions were NOT called
      expect(checkPrerequisites).not.toHaveBeenCalled();
      expect(authenticateGitHub).not.toHaveBeenCalled();
      expect(syncPrivateRepo).not.toHaveBeenCalled();
      expect(isBeadsInstalled).not.toHaveBeenCalled();
      expect(isTaskMasterInstalled).not.toHaveBeenCalled();
      expect(selectMCPServers).not.toHaveBeenCalled();
    });

    it('should call initConfig and saveConfig for summary step', async () => {
      const options: InitOptions = {
        skipPrerequisites: true,
        skipGithub: true,
        skipSync: true,
        skipBeads: true,
        skipTaskmaster: true,
        skipMcp: true,
      };

      await runInitWizard(options);

      expect(initConfig).toHaveBeenCalled();
      expect(saveConfig).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should fail if config save fails', async () => {
      vi.mocked(saveConfig).mockResolvedValue({
        success: false,
        error: 'Save failed',
      });

      const result = await runInitWizard({
        skipPrerequisites: true,
        skipGithub: true,
        skipSync: true,
        skipBeads: true,
        skipTaskmaster: true,
        skipMcp: true,
      });

      expect(result.success).toBe(false);
    });

    it('should fail if initConfig fails', async () => {
      vi.mocked(initConfig).mockResolvedValue({
        success: false,
        error: 'Init failed',
      });

      const result = await runInitWizard({
        skipPrerequisites: true,
        skipGithub: true,
        skipSync: true,
        skipBeads: true,
        skipTaskmaster: true,
        skipMcp: true,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('Wizard state', () => {
    it('should track current step correctly', async () => {
      const result = await runInitWizard({
        skipPrerequisites: true,
        skipGithub: true,
        skipSync: true,
        skipBeads: true,
        skipTaskmaster: true,
        skipMcp: true,
      });

      expect(result.state.currentStep).toBe(8);
      expect(result.state.cancelled).toBe(false);
    });

    it('should have startTime set', async () => {
      const beforeTime = Date.now();
      const result = await runInitWizard({
        skipPrerequisites: true,
        skipGithub: true,
        skipSync: true,
        skipBeads: true,
        skipTaskmaster: true,
        skipMcp: true,
      });
      const afterTime = Date.now();

      expect(result.state.startTime).toBeGreaterThanOrEqual(beforeTime);
      expect(result.state.startTime).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Prerequisites step', () => {
    it('should skip prerequisites check when flag is set', async () => {
      await runInitWizard({
        skipPrerequisites: true,
        skipGithub: true,
        skipSync: true,
        skipBeads: true,
        skipTaskmaster: true,
        skipMcp: true,
      });

      expect(checkPrerequisites).not.toHaveBeenCalled();
    });
  });

  describe('GitHub step', () => {
    it('should skip GitHub auth when flag is set', async () => {
      await runInitWizard({
        skipPrerequisites: true,
        skipGithub: true,
        skipSync: true,
        skipBeads: true,
        skipTaskmaster: true,
        skipMcp: true,
      });

      expect(authenticateGitHub).not.toHaveBeenCalled();
    });
  });

  describe('Sync step', () => {
    it('should skip sync when flag is set', async () => {
      await runInitWizard({
        skipPrerequisites: true,
        skipGithub: true,
        skipSync: true,
        skipBeads: true,
        skipTaskmaster: true,
        skipMcp: true,
      });

      expect(syncPrivateRepo).not.toHaveBeenCalled();
    });

    it('should skip sync when no GitHub token available', async () => {
      vi.mocked(getStoredGitHubToken).mockResolvedValue(null);

      await runInitWizard({
        skipPrerequisites: true,
        skipGithub: true,
        skipSync: false,
        skipBeads: true,
        skipTaskmaster: true,
        skipMcp: true,
      });

      expect(syncPrivateRepo).not.toHaveBeenCalled();
    });
  });

  describe('Beads step', () => {
    it('should skip Beads check when flag is set', async () => {
      await runInitWizard({
        skipPrerequisites: true,
        skipGithub: true,
        skipSync: true,
        skipBeads: true,
        skipTaskmaster: true,
        skipMcp: true,
      });

      expect(isBeadsInstalled).not.toHaveBeenCalled();
    });
  });

  describe('Task Master step', () => {
    it('should skip Task Master check when flag is set', async () => {
      await runInitWizard({
        skipPrerequisites: true,
        skipGithub: true,
        skipSync: true,
        skipBeads: true,
        skipTaskmaster: true,
        skipMcp: true,
      });

      expect(isTaskMasterInstalled).not.toHaveBeenCalled();
    });
  });

  describe('MCP Servers step', () => {
    it('should skip MCP server selection when flag is set', async () => {
      await runInitWizard({
        skipPrerequisites: true,
        skipGithub: true,
        skipSync: true,
        skipBeads: true,
        skipTaskmaster: true,
        skipMcp: true,
      });

      expect(selectMCPServers).not.toHaveBeenCalled();
      expect(installMCPServers).not.toHaveBeenCalled();
    });
  });
});
