import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as shell from '../../src/utils/shell.js';
import * as platform from '../../src/utils/platform.js';
import {
  checkNode,
  checkNpm,
  checkGit,
  checkClaudeCode,
  checkPrerequisites,
  hasMinimumPrerequisites,
  formatPrerequisitesReport,
} from '../../src/installers/prerequisites.js';

// Mock shell module
vi.mock('../../src/utils/shell.js', () => ({
  executeCommand: vi.fn(),
}));

// Mock platform module
vi.mock('../../src/utils/platform.js', () => ({
  getPlatform: vi.fn(() => ({
    os: 'windows',
    arch: 'x64',
    claudeDir: 'C:\\Users\\test\\.claude',
    tempDir: 'C:\\temp',
    shell: 'powershell.exe',
  })),
}));

describe('checkNode', () => {
  it('returns Node.js version from process.version', async () => {
    const result = await checkNode();
    expect(result.installed).toBe(true);
    expect(result.version).toBeDefined();
    // Should match semver format
    expect(result.version).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe('checkNpm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns npm version when installed', async () => {
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: '10.2.4',
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: 'npm',
      args: ['--version'],
    });

    const result = await checkNpm();
    expect(result.installed).toBe(true);
    expect(result.version).toBe('10.2.4');
  });

  it('returns error when npm is not installed', async () => {
    vi.mocked(shell.executeCommand).mockRejectedValue(new Error('Command not found'));

    const result = await checkNpm();
    expect(result.installed).toBe(false);
    expect(result.error).toContain('Command not found');
  });

  it('handles non-zero exit code', async () => {
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: '',
      stderr: 'npm: command not found',
      exitCode: 1,
      duration: 100,
      command: 'npm',
      args: ['--version'],
    });

    const result = await checkNpm();
    expect(result.installed).toBe(false);
    expect(result.error).toBe('npm: command not found');
  });
});

describe('checkGit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns Git version when installed', async () => {
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: 'git version 2.40.0.windows.1',
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: 'git',
      args: ['--version'],
    });

    const result = await checkGit();
    expect(result.installed).toBe(true);
    expect(result.version).toBe('2.40.0');
  });

  it('returns error when Git is not installed', async () => {
    vi.mocked(shell.executeCommand).mockRejectedValue(new Error('Command not found'));

    const result = await checkGit();
    expect(result.installed).toBe(false);
    expect(result.error).toContain('Command not found');
  });

  it('handles different version formats', async () => {
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: 'git version 2.39.2',
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: 'git',
      args: ['--version'],
    });

    const result = await checkGit();
    expect(result.installed).toBe(true);
    expect(result.version).toBe('2.39.2');
  });
});

describe('checkClaudeCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns Claude Code version when installed', async () => {
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: 'claude-code v1.0.3',
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: 'claude',
      args: ['--version'],
    });

    const result = await checkClaudeCode();
    expect(result.installed).toBe(true);
    expect(result.version).toBe('1.0.3');
  });

  it('returns error when Claude Code is not installed', async () => {
    vi.mocked(shell.executeCommand).mockRejectedValue(new Error('Command not found'));

    const result = await checkClaudeCode();
    expect(result.installed).toBe(false);
    expect(result.error).toContain('Command not found');
  });
});

describe('checkPrerequisites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all statuses when everything is installed', async () => {
    vi.mocked(shell.executeCommand).mockImplementation(async (cmd) => {
      if (cmd === 'npm') {
        return {
          stdout: '10.2.4',
          stderr: '',
          exitCode: 0,
          duration: 100,
          command: 'npm',
          args: ['--version'],
        };
      }
      if (cmd === 'git') {
        return {
          stdout: 'git version 2.40.0',
          stderr: '',
          exitCode: 0,
          duration: 100,
          command: 'git',
          args: ['--version'],
        };
      }
      if (cmd === 'claude') {
        return {
          stdout: 'claude-code v1.0.0',
          stderr: '',
          exitCode: 0,
          duration: 100,
          command: 'claude',
          args: ['--version'],
        };
      }
      throw new Error('Unknown command');
    });

    const result = await checkPrerequisites();
    expect(result.node.installed).toBe(true);
    expect(result.npm.installed).toBe(true);
    expect(result.git.installed).toBe(true);
    expect(result.claudeCode.installed).toBe(true);
    expect(result.allMet).toBe(true);
  });

  it('returns allMet false when required tool is missing', async () => {
    vi.mocked(shell.executeCommand).mockImplementation(async (cmd) => {
      if (cmd === 'npm') {
        return {
          stdout: '10.2.4',
          stderr: '',
          exitCode: 0,
          duration: 100,
          command: 'npm',
          args: ['--version'],
        };
      }
      if (cmd === 'git') {
        throw new Error('Command not found');
      }
      if (cmd === 'claude') {
        throw new Error('Command not found');
      }
      throw new Error('Unknown command');
    });

    const result = await checkPrerequisites();
    expect(result.node.installed).toBe(true);
    expect(result.npm.installed).toBe(true);
    expect(result.git.installed).toBe(false);
    expect(result.allMet).toBe(false);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('adds suggestions for missing tools', async () => {
    vi.mocked(shell.executeCommand).mockImplementation(async (cmd) => {
      if (cmd === 'npm') {
        throw new Error('Command not found');
      }
      if (cmd === 'git') {
        throw new Error('Command not found');
      }
      if (cmd === 'claude') {
        throw new Error('Command not found');
      }
      throw new Error('Unknown command');
    });

    const result = await checkPrerequisites();
    expect(result.suggestions.some((s) => s.includes('npm'))).toBe(true);
    expect(result.suggestions.some((s) => s.includes('Git') || s.includes('git'))).toBe(true);
    expect(result.suggestions.some((s) => s.includes('Claude'))).toBe(true);
  });

  it('checks version requirements', async () => {
    vi.mocked(shell.executeCommand).mockImplementation(async (cmd) => {
      if (cmd === 'npm') {
        return {
          stdout: '6.0.0', // Below default minimum
          stderr: '',
          exitCode: 0,
          duration: 100,
          command: 'npm',
          args: ['--version'],
        };
      }
      if (cmd === 'git') {
        return {
          stdout: 'git version 2.40.0',
          stderr: '',
          exitCode: 0,
          duration: 100,
          command: 'git',
          args: ['--version'],
        };
      }
      if (cmd === 'claude') {
        return {
          stdout: 'claude-code v1.0.0',
          stderr: '',
          exitCode: 0,
          duration: 100,
          command: 'claude',
          args: ['--version'],
        };
      }
      throw new Error('Unknown command');
    });

    const result = await checkPrerequisites();
    expect(result.npm.installed).toBe(true);
    expect(result.allMet).toBe(false);
    expect(result.suggestions.some((s) => s.includes('below minimum'))).toBe(true);
  });
});

describe('hasMinimumPrerequisites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when Node, npm, and Git are installed', async () => {
    vi.mocked(shell.executeCommand).mockImplementation(async (cmd) => ({
      stdout: cmd === 'npm' ? '10.0.0' : cmd === 'git' ? 'git version 2.40.0' : 'v1.0.0',
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: cmd,
      args: ['--version'],
    }));

    const result = await hasMinimumPrerequisites();
    expect(result).toBe(true);
  });

  it('returns false when Git is missing', async () => {
    vi.mocked(shell.executeCommand).mockImplementation(async (cmd) => {
      if (cmd === 'git') {
        throw new Error('Command not found');
      }
      return {
        stdout: cmd === 'npm' ? '10.0.0' : 'v1.0.0',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: cmd,
        args: ['--version'],
      };
    });

    const result = await hasMinimumPrerequisites();
    expect(result).toBe(false);
  });
});

describe('formatPrerequisitesReport', () => {
  it('formats report with all tools installed', () => {
    const result = formatPrerequisitesReport({
      node: { installed: true, version: '20.0.0' },
      npm: { installed: true, version: '10.0.0' },
      git: { installed: true, version: '2.40.0' },
      claudeCode: { installed: true, version: '1.0.0' },
      allMet: true,
      suggestions: [],
    });

    expect(result).toContain('Node.js');
    expect(result).toContain('v20.0.0');
    expect(result).toContain('npm');
    expect(result).toContain('Git');
    expect(result).toContain('Claude Code');
    expect(result).toContain('All required prerequisites are met');
  });

  it('formats report with missing tools', () => {
    const result = formatPrerequisitesReport({
      node: { installed: true, version: '20.0.0' },
      npm: { installed: true, version: '10.0.0' },
      git: { installed: false, error: 'Not found' },
      claudeCode: { installed: false, error: 'Not found' },
      allMet: false,
      suggestions: ['Install Git from https://git-scm.com'],
    });

    expect(result).toContain('Missing or outdated prerequisites');
    expect(result).toContain('Install Git');
  });

  it('marks Claude Code as optional', () => {
    const result = formatPrerequisitesReport({
      node: { installed: true, version: '20.0.0' },
      npm: { installed: true, version: '10.0.0' },
      git: { installed: true, version: '2.40.0' },
      claudeCode: { installed: false },
      allMet: true,
      suggestions: [],
    });

    expect(result).toContain('(optional)');
  });
});

describe('platform-specific suggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('provides Windows-specific suggestions', async () => {
    vi.mocked(platform.getPlatform).mockReturnValue({
      os: 'windows',
      arch: 'x64',
      claudeDir: 'C:\\Users\\test\\.claude',
      tempDir: 'C:\\temp',
      shell: 'powershell.exe',
    });

    vi.mocked(shell.executeCommand).mockImplementation(async (cmd) => {
      if (cmd === 'git') {
        throw new Error('Command not found');
      }
      return {
        stdout: cmd === 'npm' ? '10.0.0' : 'v1.0.0',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: cmd,
        args: ['--version'],
      };
    });

    const result = await checkPrerequisites();
    expect(result.suggestions.some((s) => s.includes('winget'))).toBe(true);
  });

  it('provides macOS-specific suggestions', async () => {
    vi.mocked(platform.getPlatform).mockReturnValue({
      os: 'macos',
      arch: 'arm64',
      claudeDir: '/Users/test/.claude',
      tempDir: '/tmp',
      shell: '/bin/zsh',
    });

    vi.mocked(shell.executeCommand).mockImplementation(async (cmd) => {
      if (cmd === 'git') {
        throw new Error('Command not found');
      }
      return {
        stdout: cmd === 'npm' ? '10.0.0' : 'v1.0.0',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: cmd,
        args: ['--version'],
      };
    });

    const result = await checkPrerequisites();
    expect(result.suggestions.some((s) => s.includes('brew') || s.includes('xcode'))).toBe(true);
  });

  it('provides Linux-specific suggestions', async () => {
    vi.mocked(platform.getPlatform).mockReturnValue({
      os: 'linux',
      arch: 'x64',
      claudeDir: '/home/test/.claude',
      tempDir: '/tmp',
      shell: '/bin/bash',
    });

    vi.mocked(shell.executeCommand).mockImplementation(async (cmd) => {
      if (cmd === 'git') {
        throw new Error('Command not found');
      }
      return {
        stdout: cmd === 'npm' ? '10.0.0' : 'v1.0.0',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: cmd,
        args: ['--version'],
      };
    });

    const result = await checkPrerequisites();
    expect(result.suggestions.some((s) => s.includes('apt'))).toBe(true);
  });
});
