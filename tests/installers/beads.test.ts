import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getAvailableMethods,
  getPreferredMethod,
  installBeads,
  installBeadsMCP,
  getBeadsVersion,
  isBeadsInstalled,
  getBeadsConfig,
} from '../../src/installers/beads.js';
import * as platform from '../../src/utils/platform.js';
import * as shell from '../../src/utils/shell.js';

// Mock shell utilities
vi.mock('../../src/utils/shell.js', () => ({
  executeCommand: vi.fn(),
  execCommandWithSpinner: vi.fn(),
  checkCommandExists: vi.fn(),
}));

describe('getAvailableMethods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns binary as preferred on Windows', async () => {
    vi.spyOn(platform, 'isWindows').mockReturnValue(true);
    vi.spyOn(platform, 'isMacOS').mockReturnValue(false);
    vi.spyOn(platform, 'isLinux').mockReturnValue(false);

    vi.mocked(shell.checkCommandExists)
      .mockResolvedValueOnce(true) // npm
      .mockResolvedValueOnce(false); // cargo

    const methods = await getAvailableMethods();

    // Windows: binary (preferred), npm (available), cargo (not available)
    expect(methods.length).toBeGreaterThanOrEqual(2);
    expect(methods[0]).toEqual(
      expect.objectContaining({
        method: 'binary',
        available: true,
        preferred: true,
      })
    );
  });

  it('returns brew as preferred on macOS when available', async () => {
    vi.spyOn(platform, 'isWindows').mockReturnValue(false);
    vi.spyOn(platform, 'isMacOS').mockReturnValue(true);
    vi.spyOn(platform, 'isLinux').mockReturnValue(false);

    vi.mocked(shell.checkCommandExists)
      .mockResolvedValueOnce(true) // brew
      .mockResolvedValueOnce(true) // npm
      .mockResolvedValueOnce(true); // cargo

    const methods = await getAvailableMethods();

    expect(methods).toHaveLength(3);
    expect(methods[0]).toEqual(
      expect.objectContaining({
        method: 'brew',
        available: true,
        preferred: true,
      })
    );
  });

  it('returns cargo as preferred on Linux', async () => {
    vi.spyOn(platform, 'isWindows').mockReturnValue(false);
    vi.spyOn(platform, 'isMacOS').mockReturnValue(false);
    vi.spyOn(platform, 'isLinux').mockReturnValue(true);

    vi.mocked(shell.checkCommandExists)
      .mockResolvedValueOnce(true) // cargo
      .mockResolvedValueOnce(true); // npm

    const methods = await getAvailableMethods();

    expect(methods).toHaveLength(3);
    expect(methods[0]).toEqual(
      expect.objectContaining({
        method: 'cargo',
        available: true,
        preferred: true,
      })
    );
    // Binary is always available as fallback on Linux
    expect(methods[2]).toEqual(
      expect.objectContaining({
        method: 'binary',
        available: true,
        preferred: false,
      })
    );
  });
});

describe('getPreferredMethod', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.skip('returns preferred method when available', async () => {
    vi.spyOn(platform, 'isWindows').mockReturnValue(true);
    vi.spyOn(platform, 'isMacOS').mockReturnValue(false);
    vi.spyOn(platform, 'isLinux').mockReturnValue(false);

    vi.mocked(shell.checkCommandExists)
      .mockResolvedValueOnce(true) // winget
      .mockResolvedValueOnce(true) // npm
      .mockResolvedValueOnce(false); // cargo

    const method = await getPreferredMethod();

    expect(method).toEqual(
      expect.objectContaining({
        method: 'winget',
        preferred: true,
        available: true,
      })
    );
  });

  it.skip('returns first available when preferred not available', async () => {
    vi.spyOn(platform, 'isWindows').mockReturnValue(true);
    vi.spyOn(platform, 'isMacOS').mockReturnValue(false);
    vi.spyOn(platform, 'isLinux').mockReturnValue(false);

    vi.mocked(shell.checkCommandExists)
      .mockResolvedValueOnce(false) // winget not available
      .mockResolvedValueOnce(true) // npm
      .mockResolvedValueOnce(false); // cargo

    const method = await getPreferredMethod();

    expect(method).toEqual(
      expect.objectContaining({
        method: 'npm',
        available: true,
      })
    );
  });
});

describe('installBeads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.skip('installs successfully with preferred binary method on Windows', async () => {
    vi.spyOn(platform, 'isWindows').mockReturnValue(true);
    vi.spyOn(platform, 'isMacOS').mockReturnValue(false);
    vi.spyOn(platform, 'isLinux').mockReturnValue(false);

    vi.mocked(shell.checkCommandExists)
      .mockResolvedValueOnce(true) // npm
      .mockResolvedValueOnce(false) // cargo
      .mockResolvedValueOnce(true); // bd exists after install

    vi.mocked(shell.execCommandWithSpinner).mockResolvedValueOnce({
      success: true,
      result: {
        stdout: '',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: 'powershell',
        args: [],
      },
    });

    vi.mocked(shell.executeCommand).mockResolvedValueOnce({
      stdout: 'beads 0.32.1',
      stderr: '',
      exitCode: 0,
      duration: 50,
      command: 'bd',
      args: ['version'],
    });

    const result = await installBeads({ silent: true });

    expect(result.success).toBe(true);
    expect(result.method).toBe('binary');
    expect(result.version).toBe('0.32.1');
  });

  it.skip('falls back to npm when binary fails on Windows', async () => {
    vi.spyOn(platform, 'isWindows').mockReturnValue(true);
    vi.spyOn(platform, 'isMacOS').mockReturnValue(false);
    vi.spyOn(platform, 'isLinux').mockReturnValue(false);

    vi.mocked(shell.checkCommandExists)
      .mockResolvedValueOnce(true) // npm
      .mockResolvedValueOnce(false) // cargo
      .mockResolvedValueOnce(false) // bd not found after binary
      .mockResolvedValueOnce(true); // bd found after npm

    // Binary install fails
    vi.mocked(shell.execCommandWithSpinner).mockResolvedValueOnce({
      success: false,
      error: 'Binary download failed',
    });

    // npm install succeeds
    vi.mocked(shell.executeCommand)
      .mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: 'npm',
        args: ['install', '-g', '@anthropic-ai/beads'],
      })
      .mockResolvedValueOnce({
        stdout: '0.32.1',
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'bd',
        args: ['version'],
      });

    const result = await installBeads({ silent: true });

    expect(result.success).toBe(true);
    expect(result.method).toBe('npm');
  });

  it('returns error when all methods fail', async () => {
    vi.spyOn(platform, 'isWindows').mockReturnValue(true);
    vi.spyOn(platform, 'isMacOS').mockReturnValue(false);
    vi.spyOn(platform, 'isLinux').mockReturnValue(false);

    vi.mocked(shell.checkCommandExists)
      .mockResolvedValueOnce(false) // npm
      .mockResolvedValueOnce(false); // cargo

    // Binary install fails
    vi.mocked(shell.execCommandWithSpinner).mockResolvedValueOnce({
      success: false,
      error: 'Binary download failed',
    });

    const result = await installBeads({ silent: true });

    expect(result.success).toBe(false);
    expect(result.error).toContain('All installation methods failed');
  });
});

describe('getBeadsVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses version from bd output', async () => {
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: 'beads 0.32.1',
      stderr: '',
      exitCode: 0,
      duration: 50,
      command: 'bd',
      args: ['version'],
    });

    const version = await getBeadsVersion();

    expect(version).toBe('0.32.1');
  });

  it('parses standalone version number', async () => {
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: '0.32.1',
      stderr: '',
      exitCode: 0,
      duration: 50,
      command: 'bd',
      args: ['version'],
    });

    const version = await getBeadsVersion();

    expect(version).toBe('0.32.1');
  });

  it('returns null when command fails', async () => {
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: '',
      stderr: 'command not found',
      exitCode: 1,
      duration: 50,
      command: 'bd',
      args: ['version'],
    });

    const version = await getBeadsVersion();

    expect(version).toBeNull();
  });
});

describe('isBeadsInstalled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when bd command exists', async () => {
    vi.mocked(shell.checkCommandExists).mockResolvedValue(true);

    const installed = await isBeadsInstalled();

    expect(installed).toBe(true);
    expect(shell.checkCommandExists).toHaveBeenCalledWith('bd');
  });

  it('returns false when bd command does not exist', async () => {
    vi.mocked(shell.checkCommandExists).mockResolvedValue(false);

    const installed = await isBeadsInstalled();

    expect(installed).toBe(false);
  });
});

describe('installBeadsMCP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('installs beads-mcp via npm', async () => {
    vi.mocked(shell.checkCommandExists).mockResolvedValue(true);
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: 'npm',
      args: ['install', '-g', 'beads-mcp'],
    });

    const result = await installBeadsMCP(true);

    expect(result.success).toBe(true);
    expect(result.method).toBe('npm');
  });

  it('returns error when npm not available', async () => {
    vi.mocked(shell.checkCommandExists).mockResolvedValue(false);

    const result = await installBeadsMCP(true);

    expect(result.success).toBe(false);
    expect(result.error).toContain('npm is required');
  });
});

describe('getBeadsConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns installed: false when not installed', async () => {
    vi.spyOn(platform, 'isWindows').mockReturnValue(true);
    vi.spyOn(platform, 'isMacOS').mockReturnValue(false);

    // bd command not found in PATH
    vi.mocked(shell.checkCommandExists).mockResolvedValue(false);

    // binary path check fails (for isBeadsInstalled)
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: '',
      stderr: 'Command not found',
      exitCode: 1,
      duration: 50,
      command: 'bd.exe',
      args: ['--version'],
    });

    const config = await getBeadsConfig();

    expect(config.installed).toBe(false);
  });

  it('returns config with version when installed via binary on Windows', async () => {
    vi.spyOn(platform, 'isWindows').mockReturnValue(true);
    vi.spyOn(platform, 'isMacOS').mockReturnValue(false);

    // bd not in PATH but found via binary install path
    vi.mocked(shell.checkCommandExists).mockResolvedValue(false);

    // All executeCommand calls succeed for binary path
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: '0.32.1',
      stderr: '',
      exitCode: 0,
      duration: 50,
      command: 'bd.exe',
      args: ['--version'],
    });

    const config = await getBeadsConfig();

    expect(config.installed).toBe(true);
    expect(config.version).toBe('0.32.1');
    expect(config.method).toBe('binary');
  });
});
