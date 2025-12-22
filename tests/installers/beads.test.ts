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

  it('returns winget as preferred on Windows when available', async () => {
    vi.spyOn(platform, 'isWindows').mockReturnValue(true);
    vi.spyOn(platform, 'isMacOS').mockReturnValue(false);
    vi.spyOn(platform, 'isLinux').mockReturnValue(false);

    vi.mocked(shell.checkCommandExists)
      .mockResolvedValueOnce(true) // winget
      .mockResolvedValueOnce(true) // npm
      .mockResolvedValueOnce(false); // cargo

    const methods = await getAvailableMethods();

    expect(methods).toHaveLength(3);
    expect(methods[0]).toEqual(
      expect.objectContaining({
        method: 'winget',
        available: true,
        preferred: true,
      })
    );
    expect(methods[1]).toEqual(
      expect.objectContaining({
        method: 'npm',
        available: true,
        preferred: false,
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

  it('returns preferred method when available', async () => {
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

  it('returns first available when preferred not available', async () => {
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

  it('installs successfully with preferred method', async () => {
    vi.spyOn(platform, 'isWindows').mockReturnValue(true);
    vi.spyOn(platform, 'isMacOS').mockReturnValue(false);
    vi.spyOn(platform, 'isLinux').mockReturnValue(false);

    vi.mocked(shell.checkCommandExists)
      .mockResolvedValueOnce(true) // winget available
      .mockResolvedValueOnce(true) // npm
      .mockResolvedValueOnce(false) // cargo
      .mockResolvedValueOnce(true); // bd exists after install

    vi.mocked(shell.executeCommand)
      .mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: 'winget',
        args: ['install', 'steveyegge.beads', '--silent'],
      })
      .mockResolvedValueOnce({
        stdout: 'beads 0.32.1',
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'bd',
        args: ['version'],
      });

    const result = await installBeads({ silent: true });

    expect(result.success).toBe(true);
    expect(result.method).toBe('winget');
    expect(result.version).toBe('0.32.1');
  });

  it('falls back to next method on failure', async () => {
    vi.spyOn(platform, 'isWindows').mockReturnValue(true);
    vi.spyOn(platform, 'isMacOS').mockReturnValue(false);
    vi.spyOn(platform, 'isLinux').mockReturnValue(false);

    vi.mocked(shell.checkCommandExists)
      .mockResolvedValueOnce(true) // winget available
      .mockResolvedValueOnce(true) // npm
      .mockResolvedValueOnce(false) // cargo
      .mockResolvedValueOnce(false) // bd not found after winget
      .mockResolvedValueOnce(true); // bd found after npm

    vi.mocked(shell.executeCommand)
      .mockResolvedValueOnce({
        stdout: '',
        stderr: 'winget failed',
        exitCode: 1,
        duration: 100,
        command: 'winget',
        args: ['install', 'steveyegge.beads', '--silent'],
      })
      .mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: 'npm',
        args: ['install', '-g', '@beads/bd'],
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
      .mockResolvedValueOnce(false) // winget
      .mockResolvedValueOnce(false) // npm
      .mockResolvedValueOnce(false); // cargo

    const result = await installBeads({ silent: true });

    expect(result.success).toBe(false);
    expect(result.error).toContain('No installation methods available');
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
    vi.mocked(shell.checkCommandExists).mockResolvedValue(false);

    const config = await getBeadsConfig();

    expect(config).toEqual({ installed: false });
  });

  it('returns config with version when installed', async () => {
    vi.spyOn(platform, 'isWindows').mockReturnValue(true);
    vi.spyOn(platform, 'isMacOS').mockReturnValue(false);

    vi.mocked(shell.checkCommandExists).mockResolvedValue(true);
    vi.mocked(shell.executeCommand)
      .mockResolvedValueOnce({
        stdout: '0.32.1',
        stderr: '',
        exitCode: 0,
        duration: 50,
        command: 'bd',
        args: ['version'],
      })
      .mockResolvedValueOnce({
        stdout: 'steveyegge.beads',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: 'winget',
        args: ['list', 'steveyegge.beads'],
      });

    const config = await getBeadsConfig();

    expect(config.installed).toBe(true);
    expect(config.version).toBe('0.32.1');
    expect(config.method).toBe('winget');
  });
});
