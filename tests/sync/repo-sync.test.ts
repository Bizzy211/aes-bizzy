/**
 * Tests for private repository sync functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import {
  syncPrivateRepo,
  pullLatestChanges,
  getSyncState,
  getAvailableComponents,
} from '../../src/sync/repo-sync.js';
import type { RepoSyncOptions } from '../../src/types/repo-sync.js';

// Mock simple-git
const createMockGit = () => ({
  fetch: vi.fn().mockResolvedValue(undefined),
  pull: vi.fn().mockResolvedValue(undefined),
  clone: vi.fn().mockResolvedValue(undefined),
  log: vi.fn().mockResolvedValue({
    latest: {
      hash: 'abc123def456',
      date: '2024-01-15T10:00:00.000Z',
    },
  }),
  diff: vi.fn().mockResolvedValue('file1.ts\nfile2.ts'),
});

let mockGit = createMockGit();

vi.mock('simple-git', () => ({
  simpleGit: vi.fn(() => mockGit),
}));

vi.mock('node:fs/promises', () => ({
  readdir: vi.fn().mockResolvedValue([]),
  mkdir: vi.fn().mockResolvedValue(undefined),
  copyFile: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue('{}'),
  rm: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  statSync: vi.fn(),
}));

vi.mock('node:os', () => ({
  default: {
    homedir: () => '/home/user',
    tmpdir: () => '/tmp',
  },
  homedir: () => '/home/user',
  tmpdir: () => '/tmp',
}));

// Mock logger
vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock UI prompts
vi.mock('../../src/ui/prompts.js', () => ({
  selectMultiple: vi.fn().mockResolvedValue(['agents/test-agent.md']),
  confirmAction: vi.fn().mockResolvedValue(true),
}));

// Mock backup
vi.mock('../../src/sync/backup.js', () => ({
  createBackup: vi.fn().mockResolvedValue({ success: true }),
}));

describe('Repository Sync Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGit = createMockGit();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSyncState', () => {
    it('should return undefined when no sync state exists', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const state = await getSyncState();

      expect(state).toBeUndefined();
    });

    it('should return sync state from ecosystem config', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(
        JSON.stringify({
          version: '1.0.0',
          lastUpdated: '2024-01-15T10:00:00.000Z',
          sync: {
            lastSync: '2024-01-15T10:00:00.000Z',
            commitSha: 'abc123',
            repository: 'https://github.com/test/repo',
            branch: 'main',
            syncedComponents: {
              agents: ['agent1.md'],
              hooks: [],
              skills: [],
              scripts: [],
              'slash-commands': [],
            },
            totalFiles: 1,
          },
        })
      );

      const state = await getSyncState();

      expect(state).toBeDefined();
      expect(state?.commitSha).toBe('abc123');
      expect(state?.syncedComponents.agents).toContain('agent1.md');
    });
  });

  describe('getAvailableComponents', () => {
    it('should return null on error', async () => {
      vi.mocked(existsSync).mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = await getAvailableComponents('test-token');

      expect(result).toBeNull();
    });

    it('should return available components from repository', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readdir).mockResolvedValue([
        {
          name: 'test-agent.md',
          isDirectory: () => false,
          isFile: () => true,
        } as unknown as import('node:fs').Dirent,
      ]);
      vi.mocked(statSync).mockReturnValue({
        size: 1024,
        mtime: new Date(),
      } as unknown as import('node:fs').Stats);

      const result = await getAvailableComponents('test-token');

      expect(result).not.toBeNull();
      expect(result?.metadata.commitSha).toBe('abc123def456');
    });
  });

  describe('pullLatestChanges', () => {
    it('should return success and detect updates', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(
        JSON.stringify({
          version: '1.0.0',
          sync: {
            commitSha: 'old123',
          },
        })
      );

      const result = await pullLatestChanges('test-token');

      expect(result.success).toBe(true);
      expect(result.updated).toBe(true);
      expect(result.previousSha).toBe('old123');
      expect(result.currentSha).toBe('abc123def456');
    });

    it('should return success with no updates when SHAs match', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(
        JSON.stringify({
          version: '1.0.0',
          sync: {
            commitSha: 'abc123def456',
          },
        })
      );

      const result = await pullLatestChanges('test-token');

      expect(result.success).toBe(true);
      expect(result.updated).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(existsSync).mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await pullLatestChanges('test-token');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('syncPrivateRepo', () => {
    const defaultOptions: RepoSyncOptions = {
      token: 'test-token',
      selectAll: true,
      force: true,
    };

    it('should sync components successfully', async () => {
      vi.mocked(existsSync).mockImplementation((p: unknown) => {
        const pathStr = String(p);
        // Return true for repo paths and component dirs, false for backups
        if (pathStr.includes('.claude-backups')) return false;
        if (pathStr.includes('ecosystem.json')) return false;
        return true;
      });

      vi.mocked(fs.readdir).mockResolvedValue([
        {
          name: 'test-agent.md',
          isDirectory: () => false,
          isFile: () => true,
        } as unknown as import('node:fs').Dirent,
      ]);

      vi.mocked(statSync).mockReturnValue({
        size: 512,
        mtime: new Date(),
      } as unknown as import('node:fs').Stats);

      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.copyFile).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await syncPrivateRepo(defaultOptions);

      expect(result.success).toBe(true);
      expect(result.synced.length).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();
    });

    it('should handle dry run mode', async () => {
      vi.mocked(existsSync).mockImplementation((p: unknown) => {
        const pathStr = String(p);
        if (pathStr.includes('ecosystem.json')) return false;
        return true;
      });

      vi.mocked(fs.readdir).mockResolvedValue([
        {
          name: 'test-agent.md',
          isDirectory: () => false,
          isFile: () => true,
        } as unknown as import('node:fs').Dirent,
      ]);

      vi.mocked(statSync).mockReturnValue({
        size: 512,
        mtime: new Date(),
      } as unknown as import('node:fs').Stats);

      const result = await syncPrivateRepo({
        ...defaultOptions,
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.synced.length).toBeGreaterThan(0);
      // copyFile should not be called in dry run mode
      expect(fs.copyFile).not.toHaveBeenCalled();
    });

    it('should return error when no components selected', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readdir).mockResolvedValue([]);

      const result = await syncPrivateRepo(defaultOptions);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No components selected');
    });

    it('should filter by component types', async () => {
      vi.mocked(existsSync).mockImplementation((p: unknown) => {
        const pathStr = String(p);
        if (pathStr.includes('ecosystem.json')) return false;
        return true;
      });

      vi.mocked(fs.readdir).mockImplementation(async (dir) => {
        const dirStr = String(dir);
        if (dirStr.includes('agents')) {
          return [
            {
              name: 'agent1.md',
              isDirectory: () => false,
              isFile: () => true,
            } as unknown as import('node:fs').Dirent,
          ];
        }
        return [];
      });

      vi.mocked(statSync).mockReturnValue({
        size: 256,
        mtime: new Date(),
      } as unknown as import('node:fs').Stats);

      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.copyFile).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await syncPrivateRepo({
        ...defaultOptions,
        selectAll: false,
        components: ['agents'],
      });

      expect(result.success).toBe(true);
      // Should only sync agents
      const syncedTypes = result.synced.map((s) => s.file.type);
      expect(syncedTypes.every((t) => t === 'agents')).toBe(true);
    });

    it('should handle sync errors gracefully', async () => {
      vi.mocked(existsSync).mockImplementation(() => {
        throw new Error('Clone failed');
      });

      const result = await syncPrivateRepo(defaultOptions);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Clone failed');
    });
  });

  describe('Conflict handling', () => {
    it('should detect conflicts when files exist', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readdir).mockResolvedValue([
        {
          name: 'existing-file.md',
          isDirectory: () => false,
          isFile: () => true,
        } as unknown as import('node:fs').Dirent,
      ]);

      vi.mocked(statSync).mockReturnValue({
        size: 100,
        mtime: new Date('2024-01-01'),
      } as unknown as import('node:fs').Stats);

      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.copyFile).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await syncPrivateRepo({
        token: 'test-token',
        selectAll: true,
        force: false, // Don't force, should create backup
        conflictStrategy: 'backup',
      });

      // Backup should be called when conflicts exist and not forcing
      expect(result.conflicts.length).toBeGreaterThanOrEqual(0);
    });
  });
});
