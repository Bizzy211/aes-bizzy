import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as shell from '../../src/utils/shell.js';
import * as platform from '../../src/utils/platform.js';

// Mock node:fs
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

// Mock node:os
vi.mock('node:os', () => ({
  homedir: vi.fn(() => 'C:\\Users\\test'),
}));

// Mock logger
vi.mock('../../src/utils/logger.js', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
  })),
}));
import {
  buildTokenGenerationUrl,
  validateGitHubToken,
  openInBrowser,
  storeGitHubToken,
  getStoredGitHubToken,
  isAuthenticated,
  getCurrentUser,
  clearAuthentication,
} from '../../src/installers/github.js';
import { REQUIRED_SCOPES } from '../../src/types/github.js';

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
  getClaudeDir: vi.fn(() => 'C:\\Users\\test\\.claude'),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('buildTokenGenerationUrl', () => {
  it('builds URL with default scopes', () => {
    const url = buildTokenGenerationUrl();
    expect(url).toContain('https://github.com/settings/tokens/new');
    expect(url).toContain('description=Claude+Ecosystem+CLI');
    expect(url).toContain('scopes=repo%2Cread%3Aorg%2Cworkflow');
  });

  it('builds URL with custom scopes', () => {
    const url = buildTokenGenerationUrl(['repo', 'gist']);
    expect(url).toContain('scopes=repo%2Cgist');
  });
});

describe('validateGitHubToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns valid result for valid token', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        login: 'testuser',
        id: 12345,
        name: 'Test User',
        type: 'User',
      }),
      headers: new Map([['x-oauth-scopes', 'repo, read:org, workflow']]),
    });

    const result = await validateGitHubToken('ghp_validtoken');
    expect(result.valid).toBe(true);
    expect(result.username).toBe('testuser');
    expect(result.scopes).toContain('repo');
    expect(result.hasRequiredScopes).toBe(true);
    expect(result.missingScopes).toHaveLength(0);
  });

  it('returns invalid for 401 response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    const result = await validateGitHubToken('invalid_token');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid or expired token');
  });

  it('returns invalid for other error responses', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const result = await validateGitHubToken('some_token');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('500');
  });

  it('handles network errors', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await validateGitHubToken('some_token');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Network error');
  });

  it('detects missing required scopes', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        login: 'testuser',
        id: 12345,
        type: 'User',
      }),
      headers: new Map([['x-oauth-scopes', 'repo']]),
    });

    const result = await validateGitHubToken('limited_token');
    expect(result.valid).toBe(true);
    expect(result.hasRequiredScopes).toBe(false);
    expect(result.missingScopes).toContain('read:org');
    expect(result.missingScopes).toContain('workflow');
  });

  it('handles empty scopes header', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        login: 'testuser',
        id: 12345,
        type: 'User',
      }),
      headers: new Map([['x-oauth-scopes', '']]),
    });

    const result = await validateGitHubToken('no_scope_token');
    expect(result.valid).toBe(true);
    expect(result.hasRequiredScopes).toBe(false);
    expect(result.missingScopes).toEqual([...REQUIRED_SCOPES]);
  });
});

describe('openInBrowser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens URL on Windows', async () => {
    vi.mocked(platform.getPlatform).mockReturnValue({
      os: 'windows',
      arch: 'x64',
      claudeDir: 'C:\\Users\\test\\.claude',
      tempDir: 'C:\\temp',
      shell: 'powershell.exe',
    });

    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: 'cmd',
      args: ['/c', 'start', '""', 'https://github.com'],
    });

    const result = await openInBrowser('https://github.com');
    expect(result).toBe(true);
    expect(shell.executeCommand).toHaveBeenCalledWith('cmd', [
      '/c',
      'start',
      '""',
      'https://github.com',
    ]);
  });

  it('opens URL on macOS', async () => {
    vi.mocked(platform.getPlatform).mockReturnValue({
      os: 'macos',
      arch: 'arm64',
      claudeDir: '/Users/test/.claude',
      tempDir: '/tmp',
      shell: '/bin/zsh',
    });

    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: 'open',
      args: ['https://github.com'],
    });

    const result = await openInBrowser('https://github.com');
    expect(result).toBe(true);
    expect(shell.executeCommand).toHaveBeenCalledWith('open', ['https://github.com']);
  });

  it('opens URL on Linux', async () => {
    vi.mocked(platform.getPlatform).mockReturnValue({
      os: 'linux',
      arch: 'x64',
      claudeDir: '/home/test/.claude',
      tempDir: '/tmp',
      shell: '/bin/bash',
    });

    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: 'xdg-open',
      args: ['https://github.com'],
    });

    const result = await openInBrowser('https://github.com');
    expect(result).toBe(true);
    expect(shell.executeCommand).toHaveBeenCalledWith('xdg-open', ['https://github.com']);
  });

  it('returns false on error', async () => {
    vi.mocked(shell.executeCommand).mockRejectedValue(new Error('Command not found'));

    const result = await openInBrowser('https://github.com');
    expect(result).toBe(false);
  });
});

describe('storeGitHubToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stores token to file with correct permissions', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

    const result = await storeGitHubToken('test_token');
    expect(result).toBe(true);
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('github_token'),
      'test_token',
      { mode: 0o600 }
    );
  });

  it('creates .claude directory if missing', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
    vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

    const result = await storeGitHubToken('test_token');
    expect(result).toBe(true);
    expect(fs.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('.claude'),
      { recursive: true, mode: 0o700 }
    );
  });

  it('returns false on error', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.writeFileSync).mockImplementation(() => {
      throw new Error('Write error');
    });

    const result = await storeGitHubToken('test_token');
    expect(result).toBe(false);
  });
});

describe('getStoredGitHubToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retrieves token from gh auth first', async () => {
    // Token must be > 20 chars to pass validation
    const validToken = 'ghp_validTokenFromGitHubCLI123456';
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: validToken,
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: 'gh',
      args: ['auth', 'token'],
    });

    const result = await getStoredGitHubToken();
    expect(result).toBe(validToken);
    expect(shell.executeCommand).toHaveBeenCalledWith('gh', ['auth', 'token'], { silent: true });
  });

  it('falls back to file when gh auth fails', async () => {
    const validToken = 'ghp_validFileTokenForTesting123';
    vi.mocked(shell.executeCommand).mockRejectedValue(new Error('gh not found'));
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(validToken);

    const result = await getStoredGitHubToken();
    expect(result).toBe(validToken);
  });

  it('returns undefined when no token stored anywhere', async () => {
    vi.mocked(shell.executeCommand).mockRejectedValue(new Error('gh not found'));
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = await getStoredGitHubToken();
    expect(result).toBeUndefined();
  });

  it('returns undefined on all errors', async () => {
    vi.mocked(shell.executeCommand).mockRejectedValue(new Error('Command failed'));
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error('Read error');
    });

    const result = await getStoredGitHubToken();
    expect(result).toBeUndefined();
  });
});

describe('isAuthenticated', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when valid token exists via gh auth', async () => {
    const validToken = 'ghp_validTokenFromGitHubCLI123456';
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: validToken,
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: 'gh',
      args: ['auth', 'token'],
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ login: 'testuser', id: 12345, type: 'User' }),
      headers: new Map([['x-oauth-scopes', 'repo']]),
    });

    const result = await isAuthenticated();
    expect(result).toBe(true);
  });

  it('returns true when valid token exists in file', async () => {
    const validToken = 'ghp_validFileTokenForTesting123';
    vi.mocked(shell.executeCommand).mockRejectedValue(new Error('gh not found'));
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(validToken);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ login: 'testuser', id: 12345, type: 'User' }),
      headers: new Map([['x-oauth-scopes', 'repo']]),
    });

    const result = await isAuthenticated();
    expect(result).toBe(true);
  });

  it('returns false when no token stored', async () => {
    vi.mocked(shell.executeCommand).mockRejectedValue(new Error('gh not found'));
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = await isAuthenticated();
    expect(result).toBe(false);
  });

  it('returns false when token is invalid', async () => {
    const invalidToken = 'ghp_invalidTokenThatWillFail123';
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: invalidToken,
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: 'gh',
      args: ['auth', 'token'],
    });

    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    const result = await isAuthenticated();
    expect(result).toBe(false);
  });
});

describe('getCurrentUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns user when authenticated via gh auth', async () => {
    const validToken = 'ghp_validTokenFromGitHubCLI123456';
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: validToken,
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: 'gh',
      args: ['auth', 'token'],
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        login: 'testuser',
        id: 12345,
        name: 'Test User',
        type: 'User',
      }),
      headers: new Map([['x-oauth-scopes', 'repo']]),
    });

    const result = await getCurrentUser();
    expect(result).toBeDefined();
    expect(result?.login).toBe('testuser');
  });

  it('returns undefined when not authenticated', async () => {
    vi.mocked(shell.executeCommand).mockRejectedValue(new Error('gh not found'));
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = await getCurrentUser();
    expect(result).toBeUndefined();
  });
});

describe('clearAuthentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears stored token file', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.unlinkSync).mockReturnValue(undefined);

    const result = await clearAuthentication();
    expect(result).toBe(true);
    expect(fs.unlinkSync).toHaveBeenCalledWith(
      expect.stringContaining('github_token')
    );
  });

  it('returns true when no token file exists', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = await clearAuthentication();
    expect(result).toBe(true);
  });

  it('returns false on error', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.unlinkSync).mockImplementation(() => {
      throw new Error('Delete error');
    });

    const result = await clearAuthentication();
    expect(result).toBe(false);
  });
});

describe('REQUIRED_SCOPES', () => {
  it('includes required scopes', () => {
    expect(REQUIRED_SCOPES).toContain('repo');
    expect(REQUIRED_SCOPES).toContain('read:org');
    expect(REQUIRED_SCOPES).toContain('workflow');
  });
});
