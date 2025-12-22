/**
 * Tests for update command
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before imports
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
  loadConfig: vi.fn(),
  saveConfig: vi.fn(),
}));

vi.mock('../../src/installers/github.js', () => ({
  getStoredGitHubToken: vi.fn(),
}));

vi.mock('../../src/sync/repo-sync.js', () => ({
  pullLatestChanges: vi.fn(),
  syncPrivateRepo: vi.fn(),
  getSyncState: vi.fn(),
}));

vi.mock('../../src/sync/backup.js', () => ({
  createBackup: vi.fn(),
}));

vi.mock('chalk', () => ({
  default: {
    yellow: vi.fn((s: string) => s),
    bold: Object.assign(vi.fn((s: string) => s), {
      red: vi.fn((s: string) => s),
    }),
    green: vi.fn((s: string) => s),
    blue: vi.fn((s: string) => s),
    dim: vi.fn((s: string) => s),
    red: vi.fn((s: string) => s),
  },
}));

// Import after mocks
import { runUpdate } from '../../src/cli/update.js';
import { loadConfig, saveConfig } from '../../src/config/ecosystem-config.js';
import { getStoredGitHubToken } from '../../src/installers/github.js';
import { pullLatestChanges, syncPrivateRepo, getSyncState } from '../../src/sync/repo-sync.js';
import { createBackup } from '../../src/sync/backup.js';

describe('Update Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(getStoredGitHubToken).mockResolvedValue('test-token');

    vi.mocked(loadConfig).mockResolvedValue({
      success: true,
      config: {
        version: '1.0.0',
        installedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        components: {},
        mcpServers: [],
      },
    });

    vi.mocked(saveConfig).mockResolvedValue({ success: true, path: '' });

    vi.mocked(getSyncState).mockResolvedValue({
      lastSync: new Date().toISOString(),
      commitSha: 'abc123',
      repository: 'https://github.com/test/repo',
      branch: 'main',
      syncedComponents: {
        agents: [],
        hooks: [],
        skills: [],
        scripts: [],
        'slash-commands': [],
      },
      totalFiles: 0,
    });

    vi.mocked(pullLatestChanges).mockResolvedValue({
      success: true,
      updated: false,
      previousSha: 'abc123',
      currentSha: 'abc123',
      changedFiles: [],
    });

    vi.mocked(syncPrivateRepo).mockResolvedValue({
      success: true,
      synced: [],
      skipped: [],
      conflicts: [],
      errors: [],
      timestamp: new Date().toISOString(),
    });

    vi.mocked(createBackup).mockResolvedValue({
      success: true,
      backupId: 'backup-123',
      backupDir: '/tmp/backup',
      files: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('runUpdate', () => {
    it('should fail if no GitHub token is available', async () => {
      vi.mocked(getStoredGitHubToken).mockResolvedValue(null);

      const result = await runUpdate({});

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No GitHub token found. Run "claude-ecosystem init" to authenticate.');
    });

    it('should fail if ecosystem config cannot be loaded', async () => {
      vi.mocked(loadConfig).mockResolvedValue({
        success: false,
        config: null,
        error: 'Config not found',
      });

      const result = await runUpdate({});

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to load ecosystem config. Run "claude-ecosystem init" first.');
    });

    it('should succeed when already up to date', async () => {
      vi.mocked(pullLatestChanges).mockResolvedValue({
        success: true,
        updated: false,
        previousSha: 'abc123',
        currentSha: 'abc123',
        changedFiles: [],
      });

      const result = await runUpdate({});

      expect(result.success).toBe(true);
      expect(result.changesAvailable).toBe(false);
    });

    it('should check for updates using pullLatestChanges', async () => {
      await runUpdate({});

      expect(pullLatestChanges).toHaveBeenCalledWith('test-token');
    });

    it('should handle pull failure', async () => {
      vi.mocked(pullLatestChanges).mockResolvedValue({
        success: false,
        updated: false,
        previousSha: '',
        currentSha: '',
        changedFiles: [],
        error: 'Network error',
      });

      const result = await runUpdate({});

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Network error');
    });

    it('should sync components when changes are available', async () => {
      vi.mocked(pullLatestChanges).mockResolvedValue({
        success: true,
        updated: true,
        previousSha: 'abc123',
        currentSha: 'def456',
        changedFiles: ['agents/test.md'],
      });

      vi.mocked(syncPrivateRepo).mockResolvedValue({
        success: true,
        synced: [
          {
            file: {
              name: 'test.md',
              path: '/tmp/test.md',
              relativePath: 'agents/test.md',
              type: 'agents',
              size: 100,
              modified: new Date().toISOString(),
            },
            targetPath: '/home/.claude/agents/test.md',
            action: 'created',
          },
        ],
        skipped: [],
        conflicts: [],
        errors: [],
        timestamp: new Date().toISOString(),
      });

      const result = await runUpdate({});

      expect(result.success).toBe(true);
      expect(result.changesAvailable).toBe(true);
      expect(result.updated.length).toBe(1);
      expect(result.stats.created).toBe(1);
    });

    it('should create backup before updating', async () => {
      vi.mocked(pullLatestChanges).mockResolvedValue({
        success: true,
        updated: true,
        previousSha: 'abc123',
        currentSha: 'def456',
        changedFiles: ['agents/test.md'],
      });

      await runUpdate({});

      expect(createBackup).toHaveBeenCalledWith('pre-update-backup');
    });

    it('should not sync in dry-run mode', async () => {
      vi.mocked(pullLatestChanges).mockResolvedValue({
        success: true,
        updated: true,
        previousSha: 'abc123',
        currentSha: 'def456',
        changedFiles: ['agents/test.md'],
      });

      const result = await runUpdate({ dryRun: true });

      expect(result.success).toBe(true);
      expect(syncPrivateRepo).not.toHaveBeenCalled();
      expect(createBackup).not.toHaveBeenCalled();
    });

    it('should force update even when no changes', async () => {
      vi.mocked(pullLatestChanges).mockResolvedValue({
        success: true,
        updated: false,
        previousSha: 'abc123',
        currentSha: 'abc123',
        changedFiles: [],
      });

      await runUpdate({ force: true, all: true });

      expect(syncPrivateRepo).toHaveBeenCalled();
    });

    it('should filter by component type when specified', async () => {
      vi.mocked(pullLatestChanges).mockResolvedValue({
        success: true,
        updated: true,
        previousSha: 'abc123',
        currentSha: 'def456',
        changedFiles: ['agents/test.md', 'hooks/test.sh'],
      });

      await runUpdate({ component: 'agents' });

      expect(syncPrivateRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          components: ['agents'],
        })
      );
    });

    it('should handle sync errors', async () => {
      vi.mocked(pullLatestChanges).mockResolvedValue({
        success: true,
        updated: true,
        previousSha: 'abc123',
        currentSha: 'def456',
        changedFiles: ['agents/test.md'],
      });

      vi.mocked(syncPrivateRepo).mockResolvedValue({
        success: false,
        synced: [],
        skipped: [],
        conflicts: [],
        errors: ['Failed to copy file'],
        timestamp: new Date().toISOString(),
      });

      const result = await runUpdate({});

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to copy file');
    });

    it('should track skipped components', async () => {
      vi.mocked(pullLatestChanges).mockResolvedValue({
        success: true,
        updated: true,
        previousSha: 'abc123',
        currentSha: 'def456',
        changedFiles: ['agents/test.md'],
      });

      vi.mocked(syncPrivateRepo).mockResolvedValue({
        success: true,
        synced: [
          {
            file: {
              name: 'test.md',
              path: '/tmp/test.md',
              relativePath: 'agents/test.md',
              type: 'agents',
              size: 100,
              modified: new Date().toISOString(),
            },
            targetPath: '/home/.claude/agents/test.md',
            action: 'skipped',
          },
        ],
        skipped: ['test.md'],
        conflicts: [],
        errors: [],
        timestamp: new Date().toISOString(),
      });

      const result = await runUpdate({});

      expect(result.success).toBe(true);
      expect(result.skipped.length).toBe(1);
      expect(result.stats.skipped).toBe(1);
    });

    it('should handle merged action as updated', async () => {
      vi.mocked(pullLatestChanges).mockResolvedValue({
        success: true,
        updated: true,
        previousSha: 'abc123',
        currentSha: 'def456',
        changedFiles: ['agents/test.md'],
      });

      vi.mocked(syncPrivateRepo).mockResolvedValue({
        success: true,
        synced: [
          {
            file: {
              name: 'test.md',
              path: '/tmp/test.md',
              relativePath: 'agents/test.md',
              type: 'agents',
              size: 100,
              modified: new Date().toISOString(),
            },
            targetPath: '/home/.claude/agents/test.md',
            action: 'merged',
          },
        ],
        skipped: [],
        conflicts: [],
        errors: [],
        timestamp: new Date().toISOString(),
      });

      const result = await runUpdate({});

      expect(result.success).toBe(true);
      expect(result.updated.length).toBe(1);
      expect(result.updated[0]?.action).toBe('updated');
      expect(result.stats.updated).toBe(1);
    });

    it('should save config after successful update', async () => {
      vi.mocked(pullLatestChanges).mockResolvedValue({
        success: true,
        updated: true,
        previousSha: 'abc123',
        currentSha: 'def456',
        changedFiles: ['agents/test.md'],
      });

      vi.mocked(syncPrivateRepo).mockResolvedValue({
        success: true,
        synced: [
          {
            file: {
              name: 'test.md',
              path: '/tmp/test.md',
              relativePath: 'agents/test.md',
              type: 'agents',
              size: 100,
              modified: new Date().toISOString(),
            },
            targetPath: '/home/.claude/agents/test.md',
            action: 'created',
          },
        ],
        skipped: [],
        conflicts: [],
        errors: [],
        timestamp: new Date().toISOString(),
      });

      await runUpdate({});

      expect(saveConfig).toHaveBeenCalled();
    });

    it('should return correct SHA values', async () => {
      vi.mocked(getSyncState).mockResolvedValue({
        lastSync: new Date().toISOString(),
        commitSha: 'previous-sha',
        repository: 'https://github.com/test/repo',
        branch: 'main',
        syncedComponents: {
          agents: [],
          hooks: [],
          skills: [],
          scripts: [],
          'slash-commands': [],
        },
        totalFiles: 0,
      });

      vi.mocked(pullLatestChanges).mockResolvedValue({
        success: true,
        updated: true,
        previousSha: 'previous-sha',
        currentSha: 'current-sha',
        changedFiles: ['agents/test.md'],
      });

      const result = await runUpdate({ force: true, all: true });

      expect(result.previousSha).toBe('previous-sha');
      expect(result.currentSha).toBe('current-sha');
    });

    it('should handle exceptions gracefully', async () => {
      vi.mocked(pullLatestChanges).mockRejectedValue(new Error('Unexpected error'));

      const result = await runUpdate({});

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Unexpected error');
    });
  });

  describe('Component filtering', () => {
    it('should sync all component types with --all flag', async () => {
      vi.mocked(pullLatestChanges).mockResolvedValue({
        success: true,
        updated: true,
        previousSha: 'abc123',
        currentSha: 'def456',
        changedFiles: [],
      });

      await runUpdate({ all: true, force: true });

      expect(syncPrivateRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          components: ['agents', 'hooks', 'skills', 'scripts', 'slash-commands'],
        })
      );
    });
  });
});
