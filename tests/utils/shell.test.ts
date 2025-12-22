import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execa } from 'execa';
import ora from 'ora';
import {
  executeCommand,
  execCommandWithSpinner,
  checkCommandExists,
  runPowershell,
  runBash,
  runShellScript,
  execOrThrow,
  getCommandVersion,
} from '../../src/utils/shell.js';
import { CommandError } from '../../src/types/shell.js';
import * as platform from '../../src/utils/platform.js';

// Mock execa
vi.mock('execa', () => ({
  execa: vi.fn(),
}));

// Mock ora
vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
  })),
}));

describe('executeCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('executes a command and returns result', async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: 'hello world',
      stderr: '',
      exitCode: 0,
      command: 'echo',
      escapedCommand: 'echo "hello"',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false,
    } as any);

    const result = await executeCommand('echo', ['hello']);

    expect(result.stdout).toBe('hello world');
    expect(result.stderr).toBe('');
    expect(result.exitCode).toBe(0);
    expect(result.command).toBe('echo');
    expect(result.args).toEqual(['hello']);
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('handles command failure with non-zero exit code', async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: '',
      stderr: 'error message',
      exitCode: 1,
      command: 'failing-command',
      escapedCommand: 'failing-command',
      failed: true,
      timedOut: false,
      isCanceled: false,
      killed: false,
    } as any);

    const result = await executeCommand('failing-command', []);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('error message');
  });

  it('handles command not found error', async () => {
    const error = new Error('Command not found');
    (error as any).exitCode = 127;
    (error as any).stdout = '';
    (error as any).stderr = 'command not found';
    vi.mocked(execa).mockRejectedValue(error);

    const result = await executeCommand('nonexistent-command', []);

    expect(result.exitCode).toBe(127);
    expect(result.stderr).toContain('command not found');
  });

  it('includes custom environment variables', async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: 'output',
      stderr: '',
      exitCode: 0,
      command: 'test',
      escapedCommand: 'test',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false,
    } as any);

    await executeCommand('test', [], {
      env: { CUSTOM_VAR: 'value' },
    });

    expect(execa).toHaveBeenCalledWith(
      'test',
      [],
      expect.objectContaining({
        env: expect.objectContaining({ CUSTOM_VAR: 'value' }),
      })
    );
  });

  it('uses custom working directory', async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 0,
      command: 'test',
      escapedCommand: 'test',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false,
    } as any);

    await executeCommand('test', [], { cwd: '/custom/path' });

    expect(execa).toHaveBeenCalledWith(
      'test',
      [],
      expect.objectContaining({ cwd: '/custom/path' })
    );
  });

  it('respects timeout option', async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 0,
      command: 'test',
      escapedCommand: 'test',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false,
    } as any);

    await executeCommand('test', [], { timeout: 10000 });

    expect(execa).toHaveBeenCalledWith(
      'test',
      [],
      expect.objectContaining({ timeout: 10000 })
    );
  });
});

describe('execCommandWithSpinner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows spinner during command execution', async () => {
    const mockSpinner = {
      start: vi.fn().mockReturnThis(),
      succeed: vi.fn().mockReturnThis(),
      fail: vi.fn().mockReturnThis(),
      stop: vi.fn().mockReturnThis(),
    };
    vi.mocked(ora).mockReturnValue(mockSpinner as any);

    vi.mocked(execa).mockResolvedValue({
      stdout: 'output',
      stderr: '',
      exitCode: 0,
      command: 'test',
      escapedCommand: 'test',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false,
    } as any);

    await execCommandWithSpinner('test', [], { spinnerText: 'Testing...' });

    expect(ora).toHaveBeenCalledWith('Testing...');
    expect(mockSpinner.start).toHaveBeenCalled();
    expect(mockSpinner.succeed).toHaveBeenCalled();
  });

  it('shows failure spinner on non-zero exit', async () => {
    const mockSpinner = {
      start: vi.fn().mockReturnThis(),
      succeed: vi.fn().mockReturnThis(),
      fail: vi.fn().mockReturnThis(),
      stop: vi.fn().mockReturnThis(),
    };
    vi.mocked(ora).mockReturnValue(mockSpinner as any);

    vi.mocked(execa).mockResolvedValue({
      stdout: '',
      stderr: 'error',
      exitCode: 1,
      command: 'test',
      escapedCommand: 'test',
      failed: true,
      timedOut: false,
      isCanceled: false,
      killed: false,
    } as any);

    await execCommandWithSpinner('test', []);

    expect(mockSpinner.fail).toHaveBeenCalled();
  });
});

describe('checkCommandExists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when command exists', async () => {
    vi.spyOn(platform, 'isWindows').mockReturnValue(false);
    vi.mocked(execa).mockResolvedValue({
      stdout: '/usr/bin/node',
      stderr: '',
      exitCode: 0,
      command: 'which',
      escapedCommand: 'which node',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false,
    } as any);

    const exists = await checkCommandExists('node');

    expect(exists).toBe(true);
    expect(execa).toHaveBeenCalledWith('which', ['node'], expect.anything());
  });

  it('returns false when command does not exist', async () => {
    vi.spyOn(platform, 'isWindows').mockReturnValue(false);
    vi.mocked(execa).mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 1,
      command: 'which',
      escapedCommand: 'which nonexistent',
      failed: true,
      timedOut: false,
      isCanceled: false,
      killed: false,
    } as any);

    const exists = await checkCommandExists('nonexistent');

    expect(exists).toBe(false);
  });

  it('uses "where" command on Windows', async () => {
    vi.spyOn(platform, 'isWindows').mockReturnValue(true);
    vi.mocked(execa).mockResolvedValue({
      stdout: 'C:\\Program Files\\nodejs\\node.exe',
      stderr: '',
      exitCode: 0,
      command: 'where',
      escapedCommand: 'where node',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false,
    } as any);

    await checkCommandExists('node');

    expect(execa).toHaveBeenCalledWith('where', ['node'], expect.anything());
  });
});

describe('runPowershell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('executes PowerShell script', async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: 'output',
      stderr: '',
      exitCode: 0,
      command: 'powershell.exe',
      escapedCommand: 'powershell.exe',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false,
    } as any);

    const result = await runPowershell('Get-Process');

    expect(execa).toHaveBeenCalledWith(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', 'Get-Process'],
      expect.anything()
    );
    expect(result.exitCode).toBe(0);
  });
});

describe('runBash', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('executes Bash script', async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: 'output',
      stderr: '',
      exitCode: 0,
      command: 'bash',
      escapedCommand: 'bash',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false,
    } as any);

    const result = await runBash('ls -la');

    expect(execa).toHaveBeenCalledWith(
      'bash',
      ['-c', 'ls -la'],
      expect.anything()
    );
    expect(result.exitCode).toBe(0);
  });
});

describe('runShellScript', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses PowerShell on Windows', async () => {
    vi.spyOn(platform, 'isWindows').mockReturnValue(true);
    vi.mocked(execa).mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 0,
      command: 'powershell.exe',
      escapedCommand: 'powershell.exe',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false,
    } as any);

    await runShellScript('echo test');

    expect(execa).toHaveBeenCalledWith(
      'powershell.exe',
      expect.arrayContaining(['-Command', 'echo test']),
      expect.anything()
    );
  });

  it('uses Bash on Unix', async () => {
    vi.spyOn(platform, 'isWindows').mockReturnValue(false);
    vi.mocked(execa).mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 0,
      command: 'bash',
      escapedCommand: 'bash',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false,
    } as any);

    await runShellScript('echo test');

    expect(execa).toHaveBeenCalledWith(
      'bash',
      ['-c', 'echo test'],
      expect.anything()
    );
  });
});

describe('execOrThrow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns result on success', async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: 'success',
      stderr: '',
      exitCode: 0,
      command: 'test',
      escapedCommand: 'test',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false,
    } as any);

    const result = await execOrThrow('test', []);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('success');
  });

  it('throws CommandError on failure', async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: '',
      stderr: 'error',
      exitCode: 1,
      command: 'test',
      escapedCommand: 'test',
      failed: true,
      timedOut: false,
      isCanceled: false,
      killed: false,
    } as any);

    await expect(execOrThrow('test', [])).rejects.toThrow(CommandError);
  });
});

describe('getCommandVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns version string from command output', async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: 'node v18.17.0\nMore info here',
      stderr: '',
      exitCode: 0,
      command: 'node',
      escapedCommand: 'node --version',
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false,
    } as any);

    const version = await getCommandVersion('node');

    expect(version).toBe('node v18.17.0');
  });

  it('returns null when command fails', async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: '',
      stderr: 'error',
      exitCode: 1,
      command: 'unknown',
      escapedCommand: 'unknown --version',
      failed: true,
      timedOut: false,
      isCanceled: false,
      killed: false,
    } as any);

    const version = await getCommandVersion('unknown');

    expect(version).toBeNull();
  });
});

describe('CommandError', () => {
  it('contains command result information', () => {
    const result = {
      stdout: 'out',
      stderr: 'err',
      exitCode: 42,
      command: 'failing-cmd',
      args: ['--flag'],
      duration: 100,
    };

    const error = new CommandError(result);

    expect(error.name).toBe('CommandError');
    expect(error.exitCode).toBe(42);
    expect(error.stdout).toBe('out');
    expect(error.stderr).toBe('err');
    expect(error.command).toBe('failing-cmd');
    expect(error.args).toEqual(['--flag']);
    expect(error.duration).toBe(100);
    expect(error.message).toContain('exit code 42');
  });
});
