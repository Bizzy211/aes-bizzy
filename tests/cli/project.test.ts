/**
 * Tests for project initialization command
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

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

vi.mock('../../src/utils/shell.js', () => ({
  executeCommand: vi.fn(),
}));

vi.mock('chalk', () => ({
  default: {
    green: Object.assign(vi.fn((s: string) => s), {
      bold: vi.fn((s: string) => s),
    }),
    red: Object.assign(vi.fn((s: string) => s), {
      bold: vi.fn((s: string) => s),
    }),
    yellow: Object.assign(vi.fn((s: string) => s), {
      bold: vi.fn((s: string) => s),
    }),
    cyan: vi.fn((s: string) => s),
    bold: vi.fn((s: string) => s),
  },
}));

// Import after mocks
import { initProject, runProject } from '../../src/cli/project.js';
import { executeCommand } from '../../src/utils/shell.js';

describe('Project Command', () => {
  const testDir = path.join(tmpdir(), 'claude-project-test');
  const originalCwd = process.cwd();

  beforeEach(() => {
    vi.clearAllMocks();

    // Create temp test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);

    // Default mock for executeCommand
    vi.mocked(executeCommand).mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: '',
      args: [],
    });
  });

  afterEach(() => {
    process.chdir(originalCwd);

    // Cleanup
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }

    vi.restoreAllMocks();
  });

  describe('initProject', () => {
    it('should create project directory', async () => {
      const result = await initProject('test-project', { skipGit: true });

      expect(result.success).toBe(true);
      expect(existsSync(path.join(testDir, 'test-project'))).toBe(true);
    });

    it('should create CLAUDE.md file', async () => {
      const result = await initProject('test-project', { skipGit: true });

      expect(result.success).toBe(true);
      const claudeMd = path.join(testDir, 'test-project', 'CLAUDE.md');
      expect(existsSync(claudeMd)).toBe(true);

      const content = await fs.readFile(claudeMd, 'utf-8');
      expect(content).toContain('test-project');
    });

    it('should create package.json file', async () => {
      const result = await initProject('test-project', { skipGit: true });

      expect(result.success).toBe(true);
      const pkgJson = path.join(testDir, 'test-project', 'package.json');
      expect(existsSync(pkgJson)).toBe(true);

      const content = await fs.readFile(pkgJson, 'utf-8');
      const pkg = JSON.parse(content);
      expect(pkg.name).toBe('test-project');
    });

    it('should create .gitignore file', async () => {
      const result = await initProject('test-project', { skipGit: true });

      expect(result.success).toBe(true);
      const gitignore = path.join(testDir, 'test-project', '.gitignore');
      expect(existsSync(gitignore)).toBe(true);

      const content = await fs.readFile(gitignore, 'utf-8');
      expect(content).toContain('node_modules');
    });

    it('should create README.md file', async () => {
      const result = await initProject('test-project', { skipGit: true });

      expect(result.success).toBe(true);
      const readme = path.join(testDir, 'test-project', 'README.md');
      expect(existsSync(readme)).toBe(true);

      const content = await fs.readFile(readme, 'utf-8');
      expect(content).toContain('test-project');
    });

    it('should create src directory', async () => {
      const result = await initProject('test-project', { skipGit: true });

      expect(result.success).toBe(true);
      expect(existsSync(path.join(testDir, 'test-project', 'src'))).toBe(true);
    });

    it('should create tests directory', async () => {
      const result = await initProject('test-project', { skipGit: true });

      expect(result.success).toBe(true);
      expect(existsSync(path.join(testDir, 'test-project', 'tests'))).toBe(true);
    });

    it('should create .project-context file', async () => {
      const result = await initProject('test-project', { skipGit: true });

      expect(result.success).toBe(true);
      const contextPath = path.join(testDir, 'test-project', '.project-context');
      expect(existsSync(contextPath)).toBe(true);

      const content = await fs.readFile(contextPath, 'utf-8');
      const context = JSON.parse(content);
      expect(context.name).toBe('test-project');
      expect(context.ecosystem).toBe(true);
    });

    it('should fail if directory exists and is not empty without --force', async () => {
      // Create non-empty directory
      const projectDir = path.join(testDir, 'existing-project');
      mkdirSync(projectDir, { recursive: true });
      await fs.writeFile(path.join(projectDir, 'file.txt'), 'content');

      const result = await initProject('existing-project', { skipGit: true });

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('already exists');
    });

    it('should overwrite with --force flag', async () => {
      // Create non-empty directory
      const projectDir = path.join(testDir, 'existing-project');
      mkdirSync(projectDir, { recursive: true });
      await fs.writeFile(path.join(projectDir, 'file.txt'), 'content');

      const result = await initProject('existing-project', {
        skipGit: true,
        force: true,
      });

      expect(result.success).toBe(true);
    });

    it('should initialize git repository by default', async () => {
      await initProject('test-project', {});

      expect(executeCommand).toHaveBeenCalledWith('git', ['init'], {
        cwd: expect.stringContaining('test-project'),
      });
    });

    it('should skip git initialization with --skip-git flag', async () => {
      await initProject('test-project', { skipGit: true });

      expect(executeCommand).not.toHaveBeenCalledWith(
        'git',
        ['init'],
        expect.anything()
      );
    });

    it('should create initial commit after git init', async () => {
      await initProject('test-project', {});

      expect(executeCommand).toHaveBeenCalledWith('git', ['add', '-A'], {
        cwd: expect.stringContaining('test-project'),
      });
      expect(executeCommand).toHaveBeenCalledWith(
        'git',
        ['commit', '-m', 'Initial commit - Created with JHC Agentic EcoSystem - Bizzy'],
        { cwd: expect.stringContaining('test-project') }
      );
    });

    it('should not make changes in dry-run mode', async () => {
      const result = await initProject('test-project', { dryRun: true });

      expect(result.success).toBe(true);
      expect(existsSync(path.join(testDir, 'test-project'))).toBe(false);
    });

    it('should provide next steps in result', async () => {
      const result = await initProject('test-project', { skipGit: true });

      expect(result.success).toBe(true);
      expect(result.nextSteps).toContain('cd test-project');
      expect(result.nextSteps).toContain('npm install');
    });

    it('should include template in CLAUDE.md', async () => {
      const result = await initProject('test-project', {
        skipGit: true,
        template: 'basic',
      });

      expect(result.success).toBe(true);
      const claudeMd = path.join(testDir, 'test-project', 'CLAUDE.md');
      const content = await fs.readFile(claudeMd, 'utf-8');
      expect(content).toContain('basic');
    });
  });

  describe('GitHub integration', () => {
    it('should create GitHub repository when --github flag is set', async () => {
      vi.mocked(executeCommand).mockResolvedValue({
        stdout: 'https://github.com/user/test-project',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: 'gh',
        args: [],
      });

      const result = await initProject('test-project', {
        skipGit: true,
        github: true,
      });

      expect(result.success).toBe(true);
      expect(executeCommand).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining(['repo', 'create']),
        expect.anything()
      );
    });

    it('should handle GitHub repository creation failure', async () => {
      vi.mocked(executeCommand).mockImplementation(async (cmd) => {
        if (cmd === 'gh') {
          return {
            stdout: '',
            stderr: 'error',
            exitCode: 1,
            duration: 100,
            command: 'gh',
            args: [],
          };
        }
        return {
          stdout: '',
          stderr: '',
          exitCode: 0,
          duration: 100,
          command: cmd,
          args: [],
        };
      });

      const result = await initProject('test-project', {
        skipGit: true,
        github: true,
      });

      expect(result.success).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.stringContaining('Failed to create GitHub repository')
      );
    });

    it('should create private repository by default', async () => {
      vi.mocked(executeCommand).mockResolvedValue({
        stdout: 'https://github.com/user/test-project',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: 'gh',
        args: [],
      });

      await initProject('test-project', {
        skipGit: true,
        github: true,
        // Note: no public option specified - should default to private
      });

      expect(executeCommand).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining(['--private']),
        expect.anything()
      );
      // Should NOT include --public flag
      expect(executeCommand).not.toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining(['--public']),
        expect.anything()
      );
    });

    it('should create public repository when --public flag is set', async () => {
      vi.mocked(executeCommand).mockResolvedValue({
        stdout: 'https://github.com/user/test-project',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: 'gh',
        args: [],
      });

      await initProject('test-project', {
        skipGit: true,
        github: true,
        public: true,
      });

      expect(executeCommand).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining(['--public']),
        expect.anything()
      );
      // Should NOT include --private flag
      expect(executeCommand).not.toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining(['--private']),
        expect.anything()
      );
    });
  });

  describe('Task Master integration', () => {
    it('should initialize Task Master when --taskmaster flag is set', async () => {
      const result = await initProject('test-project', {
        skipGit: true,
        taskmaster: true,
      });

      expect(result.success).toBe(true);
      expect(executeCommand).toHaveBeenCalledWith(
        'npx',
        ['task-master', 'init', '--yes'],
        expect.anything()
      );
    });

    it('should handle Task Master initialization failure', async () => {
      vi.mocked(executeCommand).mockImplementation(async (cmd) => {
        if (cmd === 'npx') {
          return {
            stdout: '',
            stderr: 'error',
            exitCode: 1,
            duration: 100,
            command: 'npx',
            args: [],
          };
        }
        return {
          stdout: '',
          stderr: '',
          exitCode: 0,
          duration: 100,
          command: cmd,
          args: [],
        };
      });

      const result = await initProject('test-project', {
        skipGit: true,
        taskmaster: true,
      });

      expect(result.success).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.stringContaining('Failed to initialize Task Master')
      );
    });
  });

  describe('Beads integration', () => {
    it('should initialize Beads when --beads flag is set', async () => {
      const result = await initProject('test-project', {
        skipGit: true,
        beads: true,
      });

      expect(result.success).toBe(true);
      expect(executeCommand).toHaveBeenCalledWith(
        'bd',
        ['init'],
        expect.anything()
      );
    });

    it('should handle Beads initialization failure', async () => {
      vi.mocked(executeCommand).mockImplementation(async (cmd) => {
        if (cmd === 'bd') {
          return {
            stdout: '',
            stderr: 'error',
            exitCode: 1,
            duration: 100,
            command: 'bd',
            args: [],
          };
        }
        return {
          stdout: '',
          stderr: '',
          exitCode: 0,
          duration: 100,
          command: cmd,
          args: [],
        };
      });

      const result = await initProject('test-project', {
        skipGit: true,
        beads: true,
      });

      expect(result.success).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.stringContaining('Failed to initialize Beads')
      );
    });
  });

  describe('runProject', () => {
    it('should call initProject and return result', async () => {
      const result = await runProject('test-project', { skipGit: true });

      expect(result.success).toBe(true);
      expect(result.name).toBe('test-project');
    });
  });
});
