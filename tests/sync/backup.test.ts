/**
 * Tests for configuration backup and merge system
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { existsSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import {
  getClaudeConfigDir,
  getBackupDir,
  generateBackupId,
  createBackup,
  listBackups,
  restoreBackup,
  cleanOldBackups,
  mergeConfigs,
  mergeSettingsFile,
} from '../../src/sync/backup.js';

vi.mock('node:fs/promises', () => ({
  readdir: vi.fn(),
  mkdir: vi.fn(),
  copyFile: vi.fn(),
  writeFile: vi.fn(),
  readFile: vi.fn(),
  rm: vi.fn(),
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  statSync: vi.fn(),
}));

vi.mock('node:os', () => ({
  default: {
    homedir: () => '/home/user',
  },
  homedir: () => '/home/user',
}));

// Mock logger to avoid file system access during logging
vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Backup Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getClaudeConfigDir', () => {
    it('should return Claude config directory path', () => {
      const dir = getClaudeConfigDir();
      expect(dir).toBe(path.join('/home/user', '.claude'));
    });
  });

  describe('getBackupDir', () => {
    it('should return backup directory path', () => {
      const dir = getBackupDir();
      expect(dir).toBe(path.join('/home/user', '.claude-backups'));
    });
  });

  describe('generateBackupId', () => {
    it('should generate a backup ID with timestamp', () => {
      const id = generateBackupId();
      expect(id).toMatch(/^backup-\d{8}-\d{6}$/);
    });

    it('should generate unique IDs', async () => {
      const id1 = generateBackupId();
      await new Promise((resolve) => setTimeout(resolve, 1100));
      const id2 = generateBackupId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('createBackup', () => {
    it('should return error when Claude config does not exist', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = await createBackup('test backup');

      expect(result.success).toBe(false);
      expect(result.error).toContain('does not exist');
    });

    it('should return error when no files to backup', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readdir).mockResolvedValue([]);

      const result = await createBackup('test backup');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No files found');
    });

    it('should create backup successfully', async () => {
      vi.mocked(existsSync).mockImplementation((p: unknown) => {
        const pathStr = String(p);
        return !pathStr.includes('.claude-backups');
      });

      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'settings.json', isDirectory: () => false, isFile: () => true } as unknown as import('node:fs').Dirent,
      ]);

      vi.mocked(statSync).mockReturnValue({
        size: 100,
        mtime: new Date(),
      } as unknown as import('node:fs').Stats);

      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.copyFile).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await createBackup('test backup');

      expect(result.success).toBe(true);
      expect(result.fileCount).toBe(1);
      expect(result.manifest.reason).toBe('test backup');
    });

    it('should not create backup in dry run mode', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'settings.json', isDirectory: () => false, isFile: () => true } as unknown as import('node:fs').Dirent,
      ]);

      vi.mocked(statSync).mockReturnValue({
        size: 100,
        mtime: new Date(),
      } as unknown as import('node:fs').Stats);

      const result = await createBackup('test backup', { dryRun: true });

      expect(result.success).toBe(true);
      expect(fs.mkdir).not.toHaveBeenCalled();
      expect(fs.copyFile).not.toHaveBeenCalled();
    });
  });

  describe('listBackups', () => {
    it('should return empty array when backup dir does not exist', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const backups = await listBackups();

      expect(backups).toEqual([]);
    });

    it('should return list of backups', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'backup-20240101-120000', isDirectory: () => true } as unknown as import('node:fs').Dirent,
        { name: 'backup-20240102-120000', isDirectory: () => true } as unknown as import('node:fs').Dirent,
        { name: 'not-a-backup', isDirectory: () => true } as unknown as import('node:fs').Dirent,
      ]);

      vi.mocked(fs.readFile).mockResolvedValue(
        JSON.stringify({
          id: 'backup-20240101-120000',
          timestamp: '2024-01-01T12:00:00.000Z',
          reason: 'test',
          files: [],
          totalSize: 100,
        })
      );

      const backups = await listBackups();

      expect(backups.length).toBeGreaterThan(0);
    });
  });

  describe('restoreBackup', () => {
    it('should return error when backup not found', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = await restoreBackup('nonexistent-backup');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should restore backup in dry run mode', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'backup-20240101-120000', isDirectory: () => true } as unknown as import('node:fs').Dirent,
      ]);

      vi.mocked(fs.readFile).mockResolvedValue(
        JSON.stringify({
          id: 'backup-20240101-120000',
          timestamp: '2024-01-01T12:00:00.000Z',
          reason: 'test',
          files: [{ relativePath: 'settings.json', size: 100 }],
          totalSize: 100,
        })
      );

      const result = await restoreBackup('backup-20240101-120000', { dryRun: true });

      expect(result.success).toBe(true);
      expect(result.restoredFiles).toBe(1);
    });
  });

  describe('cleanOldBackups', () => {
    it('should return success with no backups', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = await cleanOldBackups();

      expect(result.success).toBe(true);
      expect(result.removedCount).toBe(0);
    });

    it('should keep minimum backups', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'backup-20240101-120000', isDirectory: () => true } as unknown as import('node:fs').Dirent,
        { name: 'backup-20240102-120000', isDirectory: () => true } as unknown as import('node:fs').Dirent,
      ]);

      const now = new Date();
      vi.mocked(fs.readFile).mockImplementation(async () =>
        JSON.stringify({
          id: 'backup',
          timestamp: now.toISOString(),
          reason: 'test',
          files: [],
          totalSize: 100,
        })
      );

      const result = await cleanOldBackups({ minKeepCount: 5 });

      expect(result.success).toBe(true);
      expect(result.removedCount).toBe(0);
    });

    it('should work in dry run mode', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'backup-20240101-120000', isDirectory: () => true } as unknown as import('node:fs').Dirent,
      ]);

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60); // 60 days old

      vi.mocked(fs.readFile).mockResolvedValue(
        JSON.stringify({
          id: 'backup-20240101-120000',
          timestamp: oldDate.toISOString(),
          reason: 'test',
          files: [],
          totalSize: 100,
        })
      );

      const result = await cleanOldBackups({ minKeepCount: 0, maxAgeDays: 30, dryRun: true });

      expect(result.success).toBe(true);
      expect(fs.rm).not.toHaveBeenCalled();
    });
  });

  describe('mergeConfigs', () => {
    it('should merge two configs', () => {
      const existing = { a: 1, b: 2 };
      const incoming = { b: 3, c: 4 };

      const result = mergeConfigs(existing, incoming);

      expect(result.success).toBe(true);
      expect(result.merged.a).toBe(1);
      expect(result.merged.b).toBe(2); // preferExisting is default
      expect(result.merged.c).toBe(4);
    });

    it('should track added keys', () => {
      const existing = { a: 1 };
      const incoming = { b: 2, c: 3 };

      const result = mergeConfigs(existing, incoming);

      expect(result.addedKeys).toContain('b');
      expect(result.addedKeys).toContain('c');
    });

    it('should track preserved keys', () => {
      const existing = { a: 1, b: 2 };
      const incoming = { c: 3 };

      const result = mergeConfigs(existing, incoming);

      expect(result.preservedKeys).toContain('a');
      expect(result.preservedKeys).toContain('b');
    });

    it('should track conflicts', () => {
      const existing = { a: 1 };
      const incoming = { a: 2 };

      const result = mergeConfigs(existing, incoming, { logConflicts: false });

      expect(result.conflicts.length).toBe(1);
      expect(result.conflicts[0].key).toBe('a');
      expect(result.conflicts[0].existingValue).toBe(1);
      expect(result.conflicts[0].newValue).toBe(2);
    });

    it('should use new values when preferExisting is false', () => {
      const existing = { a: 1 };
      const incoming = { a: 2 };

      const result = mergeConfigs(existing, incoming, { preferExisting: false, logConflicts: false });

      expect(result.merged.a).toBe(2);
    });

    it('should deep merge nested objects', () => {
      const existing = {
        settings: { theme: 'dark', fontSize: 14 },
      };
      const incoming = {
        settings: { theme: 'light', language: 'en' },
      };

      const result = mergeConfigs(existing, incoming, { logConflicts: false });

      expect(result.merged.settings).toEqual({
        theme: 'dark', // preserved
        fontSize: 14, // preserved
        language: 'en', // added
      });
    });

    it('should handle empty objects', () => {
      const result = mergeConfigs({}, {});

      expect(result.success).toBe(true);
      expect(result.merged).toEqual({});
    });

    it('should handle shallow merge', () => {
      const existing = { settings: { a: 1 } };
      const incoming = { settings: { b: 2 } };

      const result = mergeConfigs(existing, incoming, { deepMerge: false, logConflicts: false });

      expect(result.merged.settings).toEqual({ a: 1 }); // preferExisting wins
    });
  });

  describe('mergeSettingsFile', () => {
    it('should merge settings file', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ existing: true }));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await mergeSettingsFile({ new: true }, { logConflicts: false });

      expect(result.success).toBe(true);
      expect(result.merged.existing).toBe(true);
      expect(result.merged.new).toBe(true);
    });

    it('should create settings file if not exists', async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await mergeSettingsFile({ new: true }, { logConflicts: false });

      expect(result.success).toBe(true);
      expect(result.merged.new).toBe(true);
    });

    it('should work in dry run mode', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = await mergeSettingsFile({ new: true }, { dryRun: true, logConflicts: false });

      expect(result.success).toBe(true);
      expect(fs.writeFile).not.toHaveBeenCalled();
    });
  });
});
