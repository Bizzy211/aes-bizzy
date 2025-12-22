import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as shell from '../../src/utils/shell.js';
import * as platform from '../../src/utils/platform.js';
import {
  isClaudeCodeInstalled,
  getNpmGlobalPrefix,
  installClaudeCode,
  uninstallClaudeCode,
  getClaudeCodeVersion,
  runClaudeCode,
  canUseNpx,
  getInstallRecommendation,
} from '../../src/installers/claude-code.js';

// Mock shell module
vi.mock('../../src/utils/shell.js', () => ({
  executeCommand: vi.fn(),
  execCommandWithSpinner: vi.fn(),
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
  getClaudeDir: vi.fn(() => 'C:\\Users\\test\\.claude'),
}));

describe('isClaudeCodeInstalled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true with version when installed', async () => {
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: 'claude-code v1.0.3',
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: 'claude',
      args: ['--version'],
    });

    const result = await isClaudeCodeInstalled();
    expect(result.installed).toBe(true);
    expect(result.version).toBe('1.0.3');
  });

  it('returns false when not installed', async () => {
    vi.mocked(shell.executeCommand).mockRejectedValue(new Error('Command not found'));

    const result = await isClaudeCodeInstalled();
    expect(result.installed).toBe(false);
    expect(result.version).toBeUndefined();
  });

  it('returns false when command fails', async () => {
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: '',
      stderr: 'command not found',
      exitCode: 1,
      duration: 100,
      command: 'claude',
      args: ['--version'],
    });

    const result = await isClaudeCodeInstalled();
    expect(result.installed).toBe(false);
  });

  it('parses version from different formats', async () => {
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: 'v2.1.0',
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: 'claude',
      args: ['--version'],
    });

    const result = await isClaudeCodeInstalled();
    expect(result.installed).toBe(true);
    expect(result.version).toBe('2.1.0');
  });
});

describe('getNpmGlobalPrefix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns npm prefix when available', async () => {
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: '/usr/local',
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: 'npm',
      args: ['config', 'get', 'prefix'],
    });

    const result = await getNpmGlobalPrefix();
    expect(result).toBe('/usr/local');
  });

  it('returns undefined on error', async () => {
    vi.mocked(shell.executeCommand).mockRejectedValue(new Error('npm not found'));

    const result = await getNpmGlobalPrefix();
    expect(result).toBeUndefined();
  });
});

describe('installClaudeCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns success when already installed', async () => {
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: 'claude-code v1.0.0',
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: 'claude',
      args: ['--version'],
    });

    const result = await installClaudeCode({ showSpinner: false });
    expect(result.success).toBe(true);
    expect(result.version).toBe('1.0.0');
    // Should not call npm install if already installed
    expect(shell.executeCommand).toHaveBeenCalledWith('claude', ['--version']);
    expect(shell.executeCommand).not.toHaveBeenCalledWith('npm', expect.arrayContaining(['install']));
  });

  it('installs successfully via npm', async () => {
    // First call: check if installed (not installed)
    // Second call: npm install (success)
    // Third call: verify installation
    vi.mocked(shell.executeCommand)
      .mockResolvedValueOnce({
        stdout: '',
        stderr: 'command not found',
        exitCode: 1,
        duration: 100,
        command: 'claude',
        args: ['--version'],
      })
      .mockResolvedValueOnce({
        stdout: 'added 1 package',
        stderr: '',
        exitCode: 0,
        duration: 5000,
        command: 'npm',
        args: ['install', '-g', '@anthropic-ai/claude-code'],
      })
      .mockResolvedValueOnce({
        stdout: 'claude-code v1.0.0',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: 'claude',
        args: ['--version'],
      });

    const result = await installClaudeCode({ showSpinner: false });
    expect(result.success).toBe(true);
    expect(result.method).toBe('npm');
    expect(result.version).toBe('1.0.0');
  });

  it('uses sudo on Unix when specified', async () => {
    vi.mocked(platform.getPlatform).mockReturnValue({
      os: 'linux',
      arch: 'x64',
      claudeDir: '/home/test/.claude',
      tempDir: '/tmp',
      shell: '/bin/bash',
    });

    vi.mocked(shell.executeCommand)
      .mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 1,
        duration: 100,
        command: 'claude',
        args: ['--version'],
      })
      .mockResolvedValueOnce({
        stdout: 'added 1 package',
        stderr: '',
        exitCode: 0,
        duration: 5000,
        command: 'sudo',
        args: ['npm', 'install', '-g', '@anthropic-ai/claude-code'],
      })
      .mockResolvedValueOnce({
        stdout: 'claude-code v1.0.0',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: 'claude',
        args: ['--version'],
      });

    const result = await installClaudeCode({ useSudo: true, showSpinner: false });
    expect(result.success).toBe(true);
    expect(shell.executeCommand).toHaveBeenCalledWith(
      'sudo',
      ['npm', 'install', '-g', '@anthropic-ai/claude-code']
    );
  });

  it('returns error on permission denied', async () => {
    vi.mocked(platform.getPlatform).mockReturnValue({
      os: 'linux',
      arch: 'x64',
      claudeDir: '/home/test/.claude',
      tempDir: '/tmp',
      shell: '/bin/bash',
    });

    vi.mocked(shell.executeCommand)
      .mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 1,
        duration: 100,
        command: 'claude',
        args: ['--version'],
      })
      .mockResolvedValueOnce({
        stdout: '',
        stderr: 'Error: EACCES: permission denied',
        exitCode: 1,
        duration: 100,
        command: 'npm',
        args: ['install', '-g', '@anthropic-ai/claude-code'],
      });

    const result = await installClaudeCode({ showSpinner: false });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Permission denied');
  });

  it('retries on failure with exponential backoff', async () => {
    vi.mocked(shell.executeCommand)
      .mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 1,
        duration: 100,
        command: 'claude',
        args: ['--version'],
      })
      // First attempt fails
      .mockResolvedValueOnce({
        stdout: '',
        stderr: 'network error',
        exitCode: 1,
        duration: 100,
        command: 'npm',
        args: ['install', '-g', '@anthropic-ai/claude-code'],
      })
      // After retry check
      .mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 1,
        duration: 100,
        command: 'claude',
        args: ['--version'],
      })
      // Second attempt succeeds
      .mockResolvedValueOnce({
        stdout: 'added 1 package',
        stderr: '',
        exitCode: 0,
        duration: 5000,
        command: 'npm',
        args: ['install', '-g', '@anthropic-ai/claude-code'],
      })
      .mockResolvedValueOnce({
        stdout: 'claude-code v1.0.0',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: 'claude',
        args: ['--version'],
      });

    const promise = installClaudeCode({ retries: 3, showSpinner: false });

    // Fast-forward through the retry delay
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;
    expect(result.success).toBe(true);
  });

  it('fails after max retries', async () => {
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: '',
      stderr: 'network error',
      exitCode: 1,
      duration: 100,
      command: 'npm',
      args: ['install', '-g', '@anthropic-ai/claude-code'],
    });

    const promise = installClaudeCode({ retries: 2, showSpinner: false });

    // Fast-forward through retry delays
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);

    const result = await promise;
    expect(result.success).toBe(false);
    expect(result.error).toContain('network error');
  });
});

describe('uninstallClaudeCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success when not installed', async () => {
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: '',
      stderr: 'command not found',
      exitCode: 1,
      duration: 100,
      command: 'claude',
      args: ['--version'],
    });

    const result = await uninstallClaudeCode({ showSpinner: false });
    expect(result.success).toBe(true);
  });

  it('uninstalls successfully', async () => {
    vi.mocked(shell.executeCommand)
      .mockResolvedValueOnce({
        stdout: 'claude-code v1.0.0',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: 'claude',
        args: ['--version'],
      })
      .mockResolvedValueOnce({
        stdout: 'removed 1 package',
        stderr: '',
        exitCode: 0,
        duration: 1000,
        command: 'npm',
        args: ['uninstall', '-g', '@anthropic-ai/claude-code'],
      })
      .mockResolvedValueOnce({
        stdout: '',
        stderr: 'command not found',
        exitCode: 1,
        duration: 100,
        command: 'claude',
        args: ['--version'],
      });

    const result = await uninstallClaudeCode({ showSpinner: false });
    expect(result.success).toBe(true);
    expect(result.method).toBe('npm');
  });

  it('reports error when uninstall fails', async () => {
    vi.mocked(shell.executeCommand)
      .mockResolvedValueOnce({
        stdout: 'claude-code v1.0.0',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: 'claude',
        args: ['--version'],
      })
      .mockResolvedValueOnce({
        stdout: '',
        stderr: 'uninstall failed',
        exitCode: 1,
        duration: 100,
        command: 'npm',
        args: ['uninstall', '-g', '@anthropic-ai/claude-code'],
      });

    const result = await uninstallClaudeCode({ showSpinner: false });
    expect(result.success).toBe(false);
    expect(result.error).toBe('uninstall failed');
  });
});

describe('getClaudeCodeVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns version when installed', async () => {
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: 'claude-code v1.2.3',
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: 'claude',
      args: ['--version'],
    });

    const result = await getClaudeCodeVersion();
    expect(result).toBe('1.2.3');
  });

  it('returns undefined when not installed', async () => {
    vi.mocked(shell.executeCommand).mockRejectedValue(new Error('not found'));

    const result = await getClaudeCodeVersion();
    expect(result).toBeUndefined();
  });
});

describe('runClaudeCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs claude command with arguments', async () => {
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: 'output',
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: 'claude',
      args: ['--help'],
    });

    const result = await runClaudeCode(['--help']);
    expect(result.success).toBe(true);
    expect(result.stdout).toBe('output');
    expect(shell.executeCommand).toHaveBeenCalledWith('claude', ['--help']);
  });

  it('returns error on failure', async () => {
    vi.mocked(shell.executeCommand).mockRejectedValue(new Error('command failed'));

    const result = await runClaudeCode(['invalid']);
    expect(result.success).toBe(false);
    expect(result.stderr).toContain('command failed');
  });
});

describe('canUseNpx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when npx is available', async () => {
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: '10.2.4',
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: 'npx',
      args: ['--version'],
    });

    const result = await canUseNpx();
    expect(result).toBe(true);
  });

  it('returns false when npx is not available', async () => {
    vi.mocked(shell.executeCommand).mockRejectedValue(new Error('not found'));

    const result = await canUseNpx();
    expect(result).toBe(false);
  });
});

describe('getInstallRecommendation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recommends global install on Windows', async () => {
    vi.mocked(platform.getPlatform).mockReturnValue({
      os: 'windows',
      arch: 'x64',
      claudeDir: 'C:\\Users\\test\\.claude',
      tempDir: 'C:\\temp',
      shell: 'powershell.exe',
    });

    const result = await getInstallRecommendation();
    expect(result.method).toBe('global');
  });

  it('recommends npx when global install not writable', async () => {
    vi.mocked(platform.getPlatform).mockReturnValue({
      os: 'linux',
      arch: 'x64',
      claudeDir: '/home/test/.claude',
      tempDir: '/tmp',
      shell: '/bin/bash',
    });

    vi.mocked(shell.executeCommand)
      .mockResolvedValueOnce({
        stdout: '/usr/local',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: 'npm',
        args: ['config', 'get', 'prefix'],
      })
      .mockResolvedValueOnce({
        stdout: '',
        stderr: 'permission denied',
        exitCode: 1,
        duration: 100,
        command: 'npm',
        args: ['config', 'list'],
      })
      .mockResolvedValueOnce({
        stdout: '10.2.4',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: 'npx',
        args: ['--version'],
      });

    const result = await getInstallRecommendation();
    expect(result.method).toBe('npx');
  });

  it('recommends sudo as fallback', async () => {
    vi.mocked(platform.getPlatform).mockReturnValue({
      os: 'linux',
      arch: 'x64',
      claudeDir: '/home/test/.claude',
      tempDir: '/tmp',
      shell: '/bin/bash',
    });

    vi.mocked(shell.executeCommand)
      .mockResolvedValueOnce({
        stdout: '/usr/local',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: 'npm',
        args: ['config', 'get', 'prefix'],
      })
      .mockResolvedValueOnce({
        stdout: '',
        stderr: 'permission denied',
        exitCode: 1,
        duration: 100,
        command: 'npm',
        args: ['config', 'list'],
      })
      .mockRejectedValueOnce(new Error('npx not found'));

    const result = await getInstallRecommendation();
    expect(result.method).toBe('sudo');
  });
});
