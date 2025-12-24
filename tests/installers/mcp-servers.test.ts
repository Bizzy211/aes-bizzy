import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as shell from '../../src/utils/shell.js';
import {
  checkEnvVars,
  isMCPServerInstalled,
  buildEnvArgs,
  installMCPServer,
  uninstallMCPServer,
  verifyMCPServer,
  selectMCPServers,
  installMCPServers,
  getAvailableMCPServers,
  getMCPServersStatus,
} from '../../src/installers/mcp-servers.js';
import {
  MCP_SERVERS,
  getMCPServerConfig,
  getRecommendedServers,
  getServersByCategory,
} from '../../src/types/mcp-servers.js';

// Mock shell module
vi.mock('../../src/utils/shell.js', () => ({
  executeCommand: vi.fn(),
  execCommandWithSpinner: vi.fn(),
}));

describe('MCP_SERVERS configuration', () => {
  it('has all expected servers', () => {
    const serverIds = MCP_SERVERS.map((s) => s.id);
    expect(serverIds).toContain('github');
    expect(serverIds).toContain('task-master-ai');
    expect(serverIds).toContain('context7');
    expect(serverIds).toContain('sequential-thinking');
    expect(serverIds).toContain('firecrawl');
    expect(serverIds).toContain('desktop-commander');
    expect(serverIds).toContain('beads-mcp');
    expect(serverIds).toContain('supabase');
    expect(serverIds).toContain('n8n');
  });

  it('all servers have required fields', () => {
    MCP_SERVERS.forEach((server) => {
      expect(server.id).toBeDefined();
      expect(server.name).toBeDefined();
      expect(server.description).toBeDefined();
      // Servers use either 'package' (stdio transport) or 'url' (http transport)
      expect(server.package || server.url).toBeDefined();
      expect(server.category).toBeDefined();
      expect(server.envVars).toBeDefined();
    });
  });

  it('has recommended servers', () => {
    const recommended = getRecommendedServers();
    expect(recommended.length).toBeGreaterThan(0);
    expect(recommended.some((s) => s.id === 'github')).toBe(true);
    expect(recommended.some((s) => s.id === 'task-master-ai')).toBe(true);
  });
});

describe('getMCPServerConfig', () => {
  it('returns config for valid server', () => {
    const config = getMCPServerConfig('github');
    expect(config).toBeDefined();
    expect(config?.name).toBe('GitHub MCP');
    // GitHub MCP uses HTTP transport, so it has url instead of package
    expect(config?.transport).toBe('http');
    expect(config?.url).toBeDefined();
  });

  it('returns config for stdio transport server', () => {
    const config = getMCPServerConfig('context7');
    expect(config).toBeDefined();
    expect(config?.name).toBe('Context7');
    expect(config?.package).toBe('@upstash/context7-mcp');
  });

  it('returns undefined for invalid server', () => {
    const config = getMCPServerConfig('invalid' as any);
    expect(config).toBeUndefined();
  });
});

describe('getServersByCategory', () => {
  it('returns servers by category', () => {
    const essential = getServersByCategory('essential');
    expect(essential.length).toBeGreaterThan(0);
    expect(essential.every((s) => s.category === 'essential')).toBe(true);

    const research = getServersByCategory('research');
    expect(research.length).toBeGreaterThan(0);
    expect(research.every((s) => s.category === 'research')).toBe(true);
  });
});

describe('checkEnvVars', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns valid when no env vars required', () => {
    const result = checkEnvVars('context7');
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it('returns valid when required env vars exist', () => {
    process.env.GITHUB_TOKEN = 'test-token';
    const result = checkEnvVars('github');
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it('returns invalid when required env vars missing', () => {
    delete process.env.GITHUB_TOKEN;
    const result = checkEnvVars('github');
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('GITHUB_TOKEN');
  });

  it('returns invalid for unknown server', () => {
    const result = checkEnvVars('invalid' as any);
    expect(result.valid).toBe(false);
  });
});

describe('buildEnvArgs', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns empty array when no env vars', () => {
    const args = buildEnvArgs('context7');
    expect(args).toHaveLength(0);
  });

  it('builds args from process.env', () => {
    process.env.GITHUB_TOKEN = 'test-token';
    const args = buildEnvArgs('github');
    expect(args).toContain('-e');
    expect(args).toContain('GITHUB_TOKEN=test-token');
  });

  it('uses custom env vars over process.env', () => {
    process.env.GITHUB_TOKEN = 'env-token';
    const args = buildEnvArgs('github', { GITHUB_TOKEN: 'custom-token' });
    expect(args).toContain('GITHUB_TOKEN=custom-token');
    expect(args).not.toContain('GITHUB_TOKEN=env-token');
  });

  it('returns empty array for unknown server', () => {
    const args = buildEnvArgs('invalid' as any);
    expect(args).toHaveLength(0);
  });
});

describe('isMCPServerInstalled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns installed true when server found', async () => {
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: 'github (user)\ncontext7 (user)',
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: 'claude',
      args: ['mcp', 'list'],
    });

    const result = await isMCPServerInstalled('github');
    expect(result.installed).toBe(true);
    expect(result.serverId).toBe('github');
  });

  it('returns installed false when server not found', async () => {
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: 'other-server (user)',
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: 'claude',
      args: ['mcp', 'list'],
    });

    const result = await isMCPServerInstalled('github');
    expect(result.installed).toBe(false);
  });

  it('handles errors', async () => {
    vi.mocked(shell.executeCommand).mockRejectedValue(new Error('Command failed'));

    const result = await isMCPServerInstalled('github');
    expect(result.installed).toBe(false);
    expect(result.error).toContain('Command failed');
  });

  it('returns error for unknown server', async () => {
    const result = await isMCPServerInstalled('invalid' as any);
    expect(result.installed).toBe(false);
    expect(result.error).toBe('Unknown server');
  });
});

describe('installMCPServer', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.GITHUB_TOKEN = 'test-token';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns success when already installed', async () => {
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: 'github (user)',
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: 'claude',
      args: ['mcp', 'list'],
    });

    const result = await installMCPServer('github', { showSpinner: false });
    expect(result.success).toBe(true);
  });

  it('installs successfully', async () => {
    vi.mocked(shell.executeCommand)
      .mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: 'claude',
        args: ['mcp', 'list'],
      })
      .mockResolvedValueOnce({
        stdout: 'Added github',
        stderr: '',
        exitCode: 0,
        duration: 5000,
        command: 'claude',
        args: ['mcp', 'add'],
      })
      .mockResolvedValueOnce({
        stdout: 'github (user)',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: 'claude',
        args: ['mcp', 'list'],
      });

    const result = await installMCPServer('github', { showSpinner: false });
    expect(result.success).toBe(true);
    expect(result.serverId).toBe('github');
  });

  it('fails when missing env vars', async () => {
    delete process.env.GITHUB_TOKEN;

    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: 'claude',
      args: ['mcp', 'list'],
    });

    const result = await installMCPServer('github', { showSpinner: false });
    expect(result.success).toBe(false);
    expect(result.error).toContain('GITHUB_TOKEN');
  });

  it('fails for unknown server', async () => {
    const result = await installMCPServer('invalid' as any);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown server');
  });
});

describe('uninstallMCPServer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success when not installed', async () => {
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: 'claude',
      args: ['mcp', 'list'],
    });

    const result = await uninstallMCPServer('github', { showSpinner: false });
    expect(result.success).toBe(true);
  });

  it('uninstalls successfully', async () => {
    vi.mocked(shell.executeCommand)
      .mockResolvedValueOnce({
        stdout: 'github (user)',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: 'claude',
        args: ['mcp', 'list'],
      })
      .mockResolvedValueOnce({
        stdout: 'Removed github',
        stderr: '',
        exitCode: 0,
        duration: 1000,
        command: 'claude',
        args: ['mcp', 'remove'],
      });

    const result = await uninstallMCPServer('github', { showSpinner: false });
    expect(result.success).toBe(true);
  });

  it('fails for unknown server', async () => {
    const result = await uninstallMCPServer('invalid' as any);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown server');
  });
});

describe('verifyMCPServer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns healthy when verification succeeds', async () => {
    vi.mocked(shell.executeCommand)
      .mockResolvedValueOnce({
        stdout: 'github (user)',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: 'claude',
        args: ['mcp', 'list'],
      })
      .mockResolvedValueOnce({
        stdout: 'server info...',
        stderr: '',
        exitCode: 0,
        duration: 200,
        command: 'claude',
        args: ['mcp', 'which', 'github'],
      });

    const result = await verifyMCPServer('github');
    expect(result.installed).toBe(true);
    expect(result.healthy).toBe(true);
  });

  it('returns not installed when server missing', async () => {
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: 'claude',
      args: ['mcp', 'list'],
    });

    const result = await verifyMCPServer('github');
    expect(result.installed).toBe(false);
    expect(result.healthy).toBe(false);
  });

  it('returns error for unknown server', async () => {
    const result = await verifyMCPServer('invalid' as any);
    expect(result.installed).toBe(false);
    expect(result.error).toBe('Unknown server');
  });
});

describe('installMCPServers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('installs multiple servers', async () => {
    // context7 has no required env vars
    vi.mocked(shell.executeCommand)
      .mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: 'claude',
        args: ['mcp', 'list'],
      })
      .mockResolvedValueOnce({
        stdout: 'Added context7',
        stderr: '',
        exitCode: 0,
        duration: 5000,
        command: 'claude',
        args: ['mcp', 'add'],
      })
      .mockResolvedValueOnce({
        stdout: 'context7 (user)',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: 'claude',
        args: ['mcp', 'list'],
      });

    const summary = await installMCPServers(['context7'], { showSpinner: false });
    expect(summary.installed).toContain('context7');
    expect(summary.failed).toHaveLength(0);
    expect(summary.totalTime).toBeGreaterThan(0);
  });

  it('skips servers with missing env vars', async () => {
    delete process.env.GITHUB_TOKEN;

    const summary = await installMCPServers(['github'], { showSpinner: false });
    expect(summary.installed).toHaveLength(0);
    expect(summary.skipped).toContain('github');
  });

  it('skips unknown servers', async () => {
    const summary = await installMCPServers(['invalid' as any], { showSpinner: false });
    expect(summary.skipped).toContain('invalid');
  });
});

describe('getAvailableMCPServers', () => {
  it('returns all servers', () => {
    const servers = getAvailableMCPServers();
    expect(servers).toEqual(MCP_SERVERS);
  });
});

describe('getMCPServersStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns status for all servers', async () => {
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: 'github (user)\ncontext7 (user)',
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: 'claude',
      args: ['mcp', 'list'],
    });

    const statuses = await getMCPServersStatus();
    expect(statuses).toHaveLength(MCP_SERVERS.length);

    const githubStatus = statuses.find((s) => s.serverId === 'github');
    expect(githubStatus?.installed).toBe(true);

    const firecrawlStatus = statuses.find((s) => s.serverId === 'firecrawl');
    expect(firecrawlStatus?.installed).toBe(false);
  });
});

describe('selectMCPServers', () => {
  it('returns recommended servers when skipPrompt is true', async () => {
    const selected = await selectMCPServers(true);
    expect(selected).toBeDefined();
    expect(selected?.length).toBeGreaterThan(0);

    const recommended = getRecommendedServers();
    expect(selected).toEqual(recommended.map((s) => s.id));
  });
});
