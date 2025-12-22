/**
 * Tests for doctor diagnostic command
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import {
  runDiagnostics,
  runFixes,
  printReport,
  runDoctor,
} from '../../src/cli/doctor.js';
import type { DiagnosticReport } from '../../src/types/doctor.js';

// Mock child_process
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

// Mock node:fs
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
}));

// Mock node:fs/promises
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

// Mock node:os
vi.mock('node:os', () => ({
  default: {
    homedir: () => '/home/user',
  },
  homedir: () => '/home/user',
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

// Mock ecosystem config
vi.mock('../../src/config/ecosystem-config.js', () => ({
  loadConfig: vi.fn(),
  getEcosystemConfigPath: vi.fn(),
  createDefaultConfig: vi.fn(),
}));

// Import the mocked module
import { loadConfig, getEcosystemConfigPath } from '../../src/config/ecosystem-config.js';

describe('Doctor Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks for successful checks
    vi.mocked(execSync).mockImplementation((cmd: string) => {
      if (cmd.includes('node --version')) return 'v20.10.0';
      if (cmd.includes('git --version')) return 'git version 2.42.0';
      if (cmd.includes('claude --version')) return '1.0.0';
      if (cmd.includes('gh auth status')) return 'Logged in';
      if (cmd.includes('gh api user')) return '{}';
      if (cmd.includes('task-master --version')) return '0.40.0';
      throw new Error('Unknown command');
    });

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readdirSync).mockReturnValue(['file1.md', 'file2.md'] as unknown as ReturnType<typeof readdirSync>);

    // Mock ecosystem config
    vi.mocked(getEcosystemConfigPath).mockReturnValue('/home/user/.claude/ecosystem.json');
    vi.mocked(loadConfig).mockResolvedValue({
      success: true,
      config: {
        version: '1.0.0',
        installedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        components: {},
        mcpServers: [{ name: 'test-server', command: 'npx', installedAt: new Date().toISOString(), enabled: true }],
        sync: {
          lastSync: new Date().toISOString(),
          commitSha: 'abc123',
          repository: 'https://github.com/test/repo',
          branch: 'main',
          syncedComponents: {},
          totalFiles: 0,
        },
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('runDiagnostics', () => {
    it('should run all diagnostic checks', async () => {
      const report = await runDiagnostics();

      expect(report.categories.length).toBeGreaterThan(0);
      expect(report.summary.total).toBeGreaterThan(0);
      expect(report.timestamp).toBeDefined();
      expect(report.duration).toBeGreaterThanOrEqual(0);
    });

    it('should report overall status as ok when all checks pass', async () => {
      const report = await runDiagnostics();

      expect(report.overallStatus).toBe('ok');
    });

    it('should report error status when a check fails', async () => {
      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (cmd.includes('node --version')) {
          throw new Error('Node not found');
        }
        if (cmd.includes('git --version')) return 'git version 2.42.0';
        if (cmd.includes('claude --version')) return '1.0.0';
        if (cmd.includes('gh auth status')) return 'Logged in';
        if (cmd.includes('gh api user')) return '{}';
        if (cmd.includes('task-master --version')) return '0.40.0';
        throw new Error('Unknown command');
      });

      const report = await runDiagnostics();

      expect(report.overallStatus).toBe('error');
      expect(report.summary.error).toBeGreaterThan(0);
    });

    it('should report warning when Node version is low', async () => {
      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (cmd.includes('node --version')) return 'v16.0.0';
        if (cmd.includes('git --version')) return 'git version 2.42.0';
        if (cmd.includes('claude --version')) return '1.0.0';
        if (cmd.includes('gh auth status')) return 'Logged in';
        if (cmd.includes('gh api user')) return '{}';
        if (cmd.includes('task-master --version')) return '0.40.0';
        throw new Error('Unknown command');
      });

      const report = await runDiagnostics();

      const nodeCheck = report.categories
        .flatMap((c) => c.checks)
        .find((c) => c.name === 'Node.js');

      expect(nodeCheck?.status).toBe('warn');
    });

    it('should filter by categories when specified', async () => {
      const report = await runDiagnostics({
        categories: ['prerequisites'],
      });

      expect(report.categories.length).toBe(1);
      expect(report.categories[0].category).toBe('prerequisites');
    });

    it('should include verbose output when specified', async () => {
      const { logger } = await import('../../src/utils/logger.js');

      await runDiagnostics({ verbose: true });

      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe('runFixes', () => {
    it('should attempt to fix errors with fix commands', async () => {
      const report: DiagnosticReport = {
        timestamp: new Date().toISOString(),
        duration: 100,
        categories: [
          {
            category: 'prerequisites',
            label: 'Prerequisites',
            status: 'error',
            checks: [
              {
                name: 'Test Check',
                category: 'prerequisites',
                status: 'error',
                message: 'Failed',
                fixCommand: 'echo "fixing"',
                fixDescription: 'Fix test',
              },
            ],
          },
        ],
        summary: { total: 1, ok: 0, warn: 0, error: 1 },
        overallStatus: 'error',
      };

      vi.mocked(execSync).mockReturnValue('fixed' as unknown as ReturnType<typeof execSync>);

      const fixes = await runFixes(report);

      expect(fixes.length).toBe(1);
      expect(fixes[0].success).toBe(true);
    });

    it('should handle fix failures', async () => {
      const report: DiagnosticReport = {
        timestamp: new Date().toISOString(),
        duration: 100,
        categories: [
          {
            category: 'prerequisites',
            label: 'Prerequisites',
            status: 'error',
            checks: [
              {
                name: 'Test Check',
                category: 'prerequisites',
                status: 'error',
                message: 'Failed',
                fixCommand: 'failing-command',
                fixDescription: 'Fix test',
              },
            ],
          },
        ],
        summary: { total: 1, ok: 0, warn: 0, error: 1 },
        overallStatus: 'error',
      };

      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Fix failed');
      });

      const fixes = await runFixes(report);

      expect(fixes.length).toBe(1);
      expect(fixes[0].success).toBe(false);
    });

    it('should skip checks without fix commands', async () => {
      const report: DiagnosticReport = {
        timestamp: new Date().toISOString(),
        duration: 100,
        categories: [
          {
            category: 'prerequisites',
            label: 'Prerequisites',
            status: 'error',
            checks: [
              {
                name: 'Test Check',
                category: 'prerequisites',
                status: 'error',
                message: 'Failed',
                // No fixCommand
              },
            ],
          },
        ],
        summary: { total: 1, ok: 0, warn: 0, error: 1 },
        overallStatus: 'error',
      };

      const fixes = await runFixes(report);

      expect(fixes.length).toBe(0);
    });
  });

  describe('printReport', () => {
    it('should print report to console', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const report: DiagnosticReport = {
        timestamp: new Date().toISOString(),
        duration: 100,
        categories: [
          {
            category: 'prerequisites',
            label: 'Prerequisites',
            status: 'ok',
            checks: [
              {
                name: 'Node.js',
                category: 'prerequisites',
                status: 'ok',
                message: 'v20.10.0',
              },
            ],
          },
        ],
        summary: { total: 1, ok: 1, warn: 0, error: 0 },
        overallStatus: 'ok',
      };

      printReport(report);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('runDoctor', () => {
    it('should return success when no errors', async () => {
      const result = await runDoctor();

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    it('should return failure when errors exist', async () => {
      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (cmd.includes('node --version')) {
          throw new Error('Node not found');
        }
        if (cmd.includes('git --version')) return 'git version 2.42.0';
        if (cmd.includes('claude --version')) return '1.0.0';
        if (cmd.includes('gh auth status')) return 'Logged in';
        if (cmd.includes('gh api user')) return '{}';
        if (cmd.includes('task-master --version')) return '0.40.0';
        throw new Error('Unknown command');
      });

      const result = await runDoctor();

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
    });

    it('should output JSON when json option is set', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await runDoctor({ json: true });

      const calls = consoleSpy.mock.calls;
      // Should output valid JSON
      expect(calls.some((c) => {
        try {
          JSON.parse(c[0] as string);
          return true;
        } catch {
          return false;
        }
      })).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should run fixes when fix option is set and errors exist', async () => {
      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (cmd.includes('node --version')) {
          throw new Error('Node not found');
        }
        if (cmd.includes('git --version')) return 'git version 2.42.0';
        if (cmd.includes('claude --version')) return '1.0.0';
        if (cmd.includes('gh auth status')) return 'Logged in';
        if (cmd.includes('gh api user')) return '{}';
        if (cmd.includes('task-master --version')) return '0.40.0';
        throw new Error('Unknown command');
      });

      const result = await runDoctor({ fix: true });

      expect(result.fixes).toBeDefined();
    });
  });

  describe('Individual Checks', () => {
    it('should detect missing Claude config directory', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const report = await runDiagnostics({ categories: ['ecosystem'] });

      const dirCheck = report.categories
        .flatMap((c) => c.checks)
        .find((c) => c.name === 'Claude Config Directory');

      expect(dirCheck?.status).toBe('error');
    });

    it('should detect missing GitHub auth', async () => {
      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (cmd.includes('node --version')) return 'v20.10.0';
        if (cmd.includes('git --version')) return 'git version 2.42.0';
        if (cmd.includes('claude --version')) return '1.0.0';
        if (cmd.includes('gh auth status')) {
          throw new Error('Not logged in');
        }
        if (cmd.includes('gh api user')) return '{}';
        if (cmd.includes('task-master --version')) return '0.40.0';
        throw new Error('Unknown command');
      });

      const report = await runDiagnostics({ categories: ['github'] });

      const authCheck = report.categories
        .flatMap((c) => c.checks)
        .find((c) => c.name === 'GitHub Auth');

      expect(authCheck?.status).toBe('error');
      expect(authCheck?.fixCommand).toBeDefined();
    });

    it('should count agents in directory', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdirSync).mockReturnValue(['agent1.md', 'agent2.md', '.hidden'] as unknown as ReturnType<typeof readdirSync>);

      const report = await runDiagnostics({ categories: ['repository'] });

      const agentCheck = report.categories
        .flatMap((c) => c.checks)
        .find((c) => c.name === 'Agents Directory');

      expect(agentCheck?.status).toBe('ok');
      expect(agentCheck?.message).toContain('2'); // Should count 2, not 3 (excludes hidden)
    });
  });
});
