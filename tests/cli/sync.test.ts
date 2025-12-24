/**
 * Tests for sync command with manifest support
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'node:path';
import * as os from 'os';

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

// Mock 'fs' module (not 'node:fs') since sync.ts uses `import fs from 'fs'`
vi.mock('fs', async () => {
  const actual = await vi.importActual('node:fs');
  const mocks = {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    copyFileSync: vi.fn(),
    readdirSync: vi.fn(),
    statSync: vi.fn(),
  };
  return {
    ...actual,
    ...mocks,
    default: {
      ...actual,
      ...mocks,
    },
  };
});

// Mock 'os' module (not 'node:os') since sync.ts uses `import os from 'os'`
vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal() as typeof import('node:os');
  return {
    ...actual,
    default: {
      ...actual,
      homedir: vi.fn(() => '/home/testuser'),
    },
    homedir: vi.fn(() => '/home/testuser'),
  };
});

vi.mock('chalk', () => ({
  default: {
    cyan: vi.fn((s: string) => s),
    green: vi.fn((s: string) => s),
    yellow: vi.fn((s: string) => s),
    red: vi.fn((s: string) => s),
    blue: Object.assign(vi.fn((s: string) => s), {
      bold: vi.fn((s: string) => s),
    }),
    dim: vi.fn((s: string) => s),
    bold: vi.fn((s: string) => s),
  },
}));

// Import after mocks
import { runSync, SyncOptions, SyncResult } from '../../src/cli/sync.js';

describe('Sync Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('runSync', () => {
    describe('with --check option', () => {
      it('should check for updates without syncing', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockImplementation((filePath: unknown) => {
          const pathStr = String(filePath);
          if (pathStr.includes('ecosystem.json')) {
            return JSON.stringify({
              lastSyncDate: '2024-01-01T00:00:00.000Z',
              version: '1.0.0',
            });
          }
          if (pathStr.includes('essential.json')) {
            return JSON.stringify({
              name: 'essential',
              version: '1.0.0',
              totalFiles: 30,
              components: {},
            });
          }
          return '{}';
        });

        const result = await runSync({ check: true, manifest: 'essential' });

        expect(result.success).toBe(true);
        expect(result.filesUpdated).toBe(0);
        expect(fs.writeFileSync).not.toHaveBeenCalled();
      });

      it('should display manifest info when checking with manifest', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockImplementation((filePath: unknown) => {
          const pathStr = String(filePath);
          if (pathStr.includes('full.json')) {
            return JSON.stringify({
              name: 'full',
              version: '1.0.0',
              description: 'Complete installation',
              totalFiles: 61,
              components: {
                agents: { count: 11 },
                hooks: { totalCount: 26 },
              },
            });
          }
          return '{}';
        });

        const result = await runSync({ check: true, manifest: 'full' });

        expect(result.success).toBe(true);
      });
    });

    describe('with --restore option', () => {
      it('should fail when backup does not exist', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        const result = await runSync({ restore: '2024-01-01-120000' });

        expect(result.success).toBe(false);
        expect(result.errors).toContain('Backup not found: 2024-01-01-120000');
      });

      it('should return success false for non-existent backup path', async () => {
        // When backup path doesn't exist
        vi.mocked(fs.existsSync).mockImplementation((p: unknown) => {
          return false; // Backup doesn't exist
        });

        const result = await runSync({ restore: '2024-01-01-120000' });

        expect(result.success).toBe(false);
        expect(result.errors[0]).toContain('Backup not found');
      });
    });

    describe('with --manifest option', () => {
      it('should fail when manifest does not exist', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        const result = await runSync({ manifest: 'nonexistent' });

        expect(result.success).toBe(false);
        expect(result.errors[0]).toContain('Failed to load manifest');
      });

      it('should load and use essential manifest', async () => {
        // Return true for all paths - we're testing logic, not actual file operations
        vi.mocked(fs.existsSync).mockReturnValue(true);

        vi.mocked(fs.readFileSync).mockImplementation((filePath: unknown) => {
          const pathStr = String(filePath);
          if (pathStr.includes('essential.json')) {
            return JSON.stringify({
              name: 'essential',
              version: '1.0.0',
              description: 'MVP installation',
              totalFiles: 30,
              components: {
                agents: {
                  path: 'agents/core/',
                  files: ['pm-lead.md', 'debugger.md'],
                  count: 2,
                },
              },
              requiredTools: ['bd', 'task-master'],
              requiredMcpServers: ['task-master-ai'],
              optionalMcpServers: [],
              postInstall: ['bd init'],
              metadata: {
                created: '2024-12-22',
                tier: 'essential',
                targetUsers: 'Individual developers',
                estimatedSetupTime: '5 minutes',
              },
            });
          }
          // Return valid JSON for ecosystem.json
          if (pathStr.includes('ecosystem.json')) {
            return JSON.stringify({ version: '1.0.0' });
          }
          return 'file content';
        });

        const result = await runSync({ manifest: 'essential', dryRun: true });

        expect(result.success).toBe(true);
      });

      it('should handle nested manifest components', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockImplementation((filePath: unknown) => {
          const pathStr = String(filePath);
          if (pathStr.includes('recommended.json')) {
            return JSON.stringify({
              name: 'recommended',
              version: '1.0.0',
              description: 'Production installation',
              totalFiles: 52,
              components: {
                hooks: {
                  essential: {
                    path: 'hooks/essential/',
                    files: ['session_start.py', 'stop.py'],
                    count: 2,
                  },
                  recommended: {
                    path: 'hooks/recommended/',
                    files: ['pre_commit_validator.py'],
                    count: 1,
                  },
                  totalCount: 3,
                },
              },
              requiredTools: [],
              requiredMcpServers: [],
              optionalMcpServers: [],
              postInstall: [],
              metadata: {
                created: '2024-12-22',
                tier: 'recommended',
                targetUsers: 'Teams',
                estimatedSetupTime: '10 minutes',
              },
            });
          }
          // Return valid JSON for ecosystem.json
          if (pathStr.includes('ecosystem.json')) {
            return JSON.stringify({ version: '1.0.0' });
          }
          return 'file content';
        });

        const result = await runSync({ manifest: 'recommended', dryRun: true });

        expect(result.success).toBe(true);
      });
    });

    describe('with --project option', () => {
      it('should sync to project directory instead of global', async () => {
        const projectPath = '/projects/myapp';

        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockImplementation((filePath: unknown) => {
          const pathStr = String(filePath);
          if (pathStr.includes('essential.json')) {
            return JSON.stringify({
              name: 'essential',
              version: '1.0.0',
              totalFiles: 1,
              components: {
                agents: {
                  path: 'agents/',
                  files: ['test.md'],
                },
              },
              requiredTools: [],
              requiredMcpServers: [],
              optionalMcpServers: [],
              postInstall: [],
              metadata: {
                created: '2024-12-22',
                tier: 'essential',
                targetUsers: 'Developers',
                estimatedSetupTime: '5 minutes',
              },
            });
          }
          // Return existing content for destination file to test update logic
          if (pathStr.includes('ecosystem.json')) {
            return JSON.stringify({ version: '0.9.0' });
          }
          return 'source content';
        });

        vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
        vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

        const result = await runSync({
          manifest: 'essential',
          project: projectPath,
        });

        expect(result.success).toBe(true);
      });
    });

    describe('with --dry-run option', () => {
      it('should not write files in dry run mode', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockImplementation((filePath: unknown) => {
          const pathStr = String(filePath);
          if (pathStr.includes('essential.json')) {
            return JSON.stringify({
              name: 'essential',
              version: '1.0.0',
              totalFiles: 1,
              components: {
                agents: {
                  path: 'agents/',
                  files: ['test.md'],
                },
              },
              requiredTools: [],
              requiredMcpServers: [],
              optionalMcpServers: [],
              postInstall: [],
              metadata: {
                created: '2024-12-22',
                tier: 'essential',
                targetUsers: 'Developers',
                estimatedSetupTime: '5 minutes',
              },
            });
          }
          // Return valid JSON for ecosystem.json (read during sync)
          if (pathStr.includes('ecosystem.json')) {
            return JSON.stringify({ version: '1.0.0' });
          }
          return 'source content';
        });

        const result = await runSync({ manifest: 'essential', dryRun: true });

        expect(result.success).toBe(true);
        expect(fs.writeFileSync).not.toHaveBeenCalled();
      });
    });

    describe('with --force option', () => {
      it('should overwrite existing files when force is set', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockImplementation((filePath: unknown) => {
          const pathStr = String(filePath);
          if (pathStr.includes('essential.json')) {
            return JSON.stringify({
              name: 'essential',
              version: '1.0.0',
              totalFiles: 1,
              components: {
                agents: {
                  path: 'agents/',
                  files: ['test.md'],
                },
              },
              requiredTools: [],
              requiredMcpServers: [],
              optionalMcpServers: [],
              postInstall: [],
              metadata: {
                created: '2024-12-22',
                tier: 'essential',
                targetUsers: 'Developers',
                estimatedSetupTime: '5 minutes',
              },
            });
          }
          // Return valid JSON for ecosystem.json (read during sync)
          if (pathStr.includes('ecosystem.json')) {
            return JSON.stringify({ version: '0.9.0' });
          }
          return 'existing content';
        });

        vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
        vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

        const result = await runSync({ manifest: 'essential', force: true });

        expect(result.success).toBe(true);
      });
    });
  });

  describe('Manifest Loading', () => {
    it('should handle malformed manifest JSON', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('{ invalid json }');

      const result = await runSync({ manifest: 'broken' });

      expect(result.success).toBe(false);
    });

    it('should load manifest with extends property', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((filePath: unknown) => {
        const pathStr = String(filePath);
        if (pathStr.includes('full.json')) {
          return JSON.stringify({
            name: 'full',
            version: '1.0.0',
            extends: 'recommended',
            totalFiles: 61,
            components: {},
            requiredTools: [],
            requiredMcpServers: [],
            optionalMcpServers: [],
            postInstall: [],
            metadata: {
              created: '2024-12-22',
              tier: 'full',
              targetUsers: 'Enterprise',
              estimatedSetupTime: '15 minutes',
            },
          });
        }
        // Return valid JSON for ecosystem.json
        if (pathStr.includes('ecosystem.json')) {
          return JSON.stringify({ version: '1.0.0' });
        }
        return 'content';
      });

      const result = await runSync({ manifest: 'full', dryRun: true });

      expect(result.success).toBe(true);
    });
  });

  describe('Backup Listing', () => {
    it('should return empty array when no backups exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await runSync({ check: true });

      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should return error when manifest parsing fails', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('{ invalid json }');

      const result = await runSync({ manifest: 'broken' });

      // Malformed JSON should result in failed load
      expect(result.success).toBe(false);
    });

    it('should handle sync with no files to sync', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((filePath: unknown) => {
        const pathStr = String(filePath);
        if (pathStr.includes('essential.json')) {
          return JSON.stringify({
            name: 'essential',
            version: '1.0.0',
            totalFiles: 0,
            components: {},  // No components to sync
            requiredTools: [],
            requiredMcpServers: [],
            optionalMcpServers: [],
            postInstall: [],
            metadata: {
              created: '2024-12-22',
              tier: 'essential',
              targetUsers: 'Developers',
              estimatedSetupTime: '5 minutes',
            },
          });
        }
        // Return valid JSON for ecosystem.json
        if (pathStr.includes('ecosystem.json')) {
          return JSON.stringify({ version: '1.0.0' });
        }
        return 'content';
      });

      const result = await runSync({ manifest: 'essential', dryRun: true });

      // Empty manifest should still succeed but sync 0 files
      expect(result.success).toBe(true);
      expect(result.filesUpdated).toBe(0);
    });
  });
});
