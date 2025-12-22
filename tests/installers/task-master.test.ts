import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as shell from '../../src/utils/shell.js';
import * as platform from '../../src/utils/platform.js';
import {
  getModelConfig,
  getModelProvider,
  getProviderEnvVar,
  hasApiKey,
  isTaskMasterInstalled,
  buildEnvVars,
  installTaskMaster,
  uninstallTaskMaster,
  validateTaskMaster,
  getAvailableModels,
  getToolTierInfo,
  upgradeToolTier,
} from '../../src/installers/task-master.js';
import {
  AVAILABLE_MODELS,
  TOOL_TIERS,
  PROVIDER_ENV_VARS,
} from '../../src/types/task-master.js';

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

describe('getModelConfig', () => {
  it('returns config for valid model', () => {
    const config = getModelConfig('claude-sonnet-4-5');
    expect(config).toBeDefined();
    expect(config?.name).toBe('Claude Sonnet 4.5');
    expect(config?.provider).toBe('anthropic');
  });

  it('returns undefined for invalid model', () => {
    const config = getModelConfig('invalid-model' as any);
    expect(config).toBeUndefined();
  });
});

describe('getModelProvider', () => {
  it('returns anthropic for Claude models', () => {
    expect(getModelProvider('claude-sonnet-4-5')).toBe('anthropic');
    expect(getModelProvider('claude-opus-4-5')).toBe('anthropic');
  });

  it('returns openai for GPT models', () => {
    expect(getModelProvider('gpt-4o')).toBe('openai');
    expect(getModelProvider('gpt-4o-mini')).toBe('openai');
  });

  it('returns google for Gemini models', () => {
    expect(getModelProvider('gemini-2.0-flash')).toBe('google');
  });
});

describe('getProviderEnvVar', () => {
  it('returns correct env var for each provider', () => {
    expect(getProviderEnvVar('anthropic')).toBe('ANTHROPIC_API_KEY');
    expect(getProviderEnvVar('openai')).toBe('OPENAI_API_KEY');
    expect(getProviderEnvVar('google')).toBe('GOOGLE_API_KEY');
    expect(getProviderEnvVar('perplexity')).toBe('PERPLEXITY_API_KEY');
  });
});

describe('hasApiKey', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns true when API key exists', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    expect(hasApiKey('anthropic')).toBe(true);
  });

  it('returns false when API key missing', () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(hasApiKey('anthropic')).toBe(false);
  });
});

describe('isTaskMasterInstalled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns available true when installed', async () => {
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: 'task-master-ai (user)\n  command: npx -y task-master-ai',
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: 'claude',
      args: ['mcp', 'list'],
    });

    const result = await isTaskMasterInstalled();
    expect(result.available).toBe(true);
    expect(result.name).toBe('task-master-ai');
  });

  it('returns available false when not installed', async () => {
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: 'other-server (user)',
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: 'claude',
      args: ['mcp', 'list'],
    });

    const result = await isTaskMasterInstalled();
    expect(result.available).toBe(false);
  });

  it('handles errors', async () => {
    vi.mocked(shell.executeCommand).mockRejectedValue(new Error('Command failed'));

    const result = await isTaskMasterInstalled();
    expect(result.available).toBe(false);
    expect(result.error).toContain('Command failed');
  });
});

describe('buildEnvVars', () => {
  it('builds env vars with tier', () => {
    const env = buildEnvVars('anthropic', 'core');
    expect(env.TASK_MASTER_TOOLS).toBe('core');
  });

  it('includes API key when provided', () => {
    const env = buildEnvVars('anthropic', 'standard', 'test-api-key');
    expect(env.TASK_MASTER_TOOLS).toBe('standard');
    expect(env.ANTHROPIC_API_KEY).toBe('test-api-key');
  });

  it('builds for different tiers', () => {
    expect(buildEnvVars('openai', 'all').TASK_MASTER_TOOLS).toBe('all');
    expect(buildEnvVars('google', 'core').TASK_MASTER_TOOLS).toBe('core');
  });
});

describe('installTaskMaster', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  it('returns success when already installed', async () => {
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: 'task-master-ai (user)',
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: 'claude',
      args: ['mcp', 'list'],
    });

    const result = await installTaskMaster({
      model: 'claude-sonnet-4-5',
      tier: 'core',
      skipPrompt: true,
      showSpinner: false,
    });

    expect(result.success).toBe(true);
  });

  it('installs successfully', async () => {
    // First call: check if installed (not installed)
    // Second call: install
    // Third call: verify
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
        stdout: 'Added task-master-ai',
        stderr: '',
        exitCode: 0,
        duration: 5000,
        command: 'claude',
        args: ['mcp', 'add', 'task-master-ai', '-s', 'user', '--', 'npx', '-y', 'task-master-ai'],
      })
      .mockResolvedValueOnce({
        stdout: 'task-master-ai (user)',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: 'claude',
        args: ['mcp', 'list'],
      });

    const result = await installTaskMaster({
      model: 'claude-sonnet-4-5',
      tier: 'core',
      skipPrompt: true,
      showSpinner: false,
    });

    expect(result.success).toBe(true);
    expect(result.model).toBe('claude-sonnet-4-5');
    expect(result.tier).toBe('core');
  });

  it('fails when installation fails', async () => {
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
        stdout: '',
        stderr: 'Installation failed',
        exitCode: 1,
        duration: 1000,
        command: 'claude',
        args: ['mcp', 'add'],
      });

    const result = await installTaskMaster({
      model: 'claude-sonnet-4-5',
      tier: 'core',
      skipPrompt: true,
      showSpinner: false,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Installation failed');
  });

  it('fails when API key not available', async () => {
    delete process.env.ANTHROPIC_API_KEY;

    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: 'claude',
      args: ['mcp', 'list'],
    });

    const result = await installTaskMaster({
      model: 'claude-sonnet-4-5',
      tier: 'core',
      skipPrompt: true,
      showSpinner: false,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('ANTHROPIC_API_KEY');
  });
});

describe('uninstallTaskMaster', () => {
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

    const result = await uninstallTaskMaster({ showSpinner: false });
    expect(result.success).toBe(true);
  });

  it('uninstalls successfully', async () => {
    vi.mocked(shell.executeCommand)
      .mockResolvedValueOnce({
        stdout: 'task-master-ai (user)',
        stderr: '',
        exitCode: 0,
        duration: 100,
        command: 'claude',
        args: ['mcp', 'list'],
      })
      .mockResolvedValueOnce({
        stdout: 'Removed task-master-ai',
        stderr: '',
        exitCode: 0,
        duration: 1000,
        command: 'claude',
        args: ['mcp', 'remove', 'task-master-ai'],
      });

    const result = await uninstallTaskMaster({ showSpinner: false });
    expect(result.success).toBe(true);
  });
});

describe('validateTaskMaster', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns valid when MCP call succeeds', async () => {
    vi.mocked(shell.executeCommand).mockResolvedValue({
      stdout: '{"tasks": []}',
      stderr: '',
      exitCode: 0,
      duration: 500,
      command: 'claude',
      args: ['mcp', 'call', 'task-master-ai', 'get_tasks'],
    });

    const result = await validateTaskMaster();
    expect(result.valid).toBe(true);
  });

  it('returns invalid on error', async () => {
    vi.mocked(shell.executeCommand).mockRejectedValue(new Error('MCP call failed'));

    const result = await validateTaskMaster();
    expect(result.valid).toBe(false);
    expect(result.error).toContain('MCP call failed');
  });
});

describe('getAvailableModels', () => {
  it('returns all available models', () => {
    const models = getAvailableModels();
    expect(models.length).toBe(AVAILABLE_MODELS.length);
    expect(models.some((m) => m.recommended)).toBe(true);
  });
});

describe('getToolTierInfo', () => {
  it('returns correct tier info', () => {
    const core = getToolTierInfo('core');
    expect(core.toolCount).toBe(7);
    expect(core.tools).toContain('get_tasks');

    const standard = getToolTierInfo('standard');
    expect(standard.toolCount).toBe(14);

    const all = getToolTierInfo('all');
    expect(all.toolCount).toBe(44);
  });
});

describe('upgradeToolTier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true for upgrade', async () => {
    const result = await upgradeToolTier('standard');
    expect(result).toBe(true);
  });
});

describe('AVAILABLE_MODELS', () => {
  it('has at least one recommended model', () => {
    expect(AVAILABLE_MODELS.some((m) => m.recommended)).toBe(true);
  });

  it('all models have required fields', () => {
    AVAILABLE_MODELS.forEach((model) => {
      expect(model.id).toBeDefined();
      expect(model.name).toBeDefined();
      expect(model.provider).toBeDefined();
    });
  });
});

describe('TOOL_TIERS', () => {
  it('has all three tiers', () => {
    expect(TOOL_TIERS.core).toBeDefined();
    expect(TOOL_TIERS.standard).toBeDefined();
    expect(TOOL_TIERS.all).toBeDefined();
  });

  it('core has 7 tools', () => {
    expect(TOOL_TIERS.core.toolCount).toBe(7);
    expect(TOOL_TIERS.core.tools.length).toBe(7);
  });

  it('standard includes core tools', () => {
    TOOL_TIERS.core.tools.forEach((tool) => {
      expect(TOOL_TIERS.standard.tools).toContain(tool);
    });
  });
});

describe('PROVIDER_ENV_VARS', () => {
  it('has all providers', () => {
    expect(PROVIDER_ENV_VARS.anthropic).toBe('ANTHROPIC_API_KEY');
    expect(PROVIDER_ENV_VARS.openai).toBe('OPENAI_API_KEY');
    expect(PROVIDER_ENV_VARS.google).toBe('GOOGLE_API_KEY');
    expect(PROVIDER_ENV_VARS.perplexity).toBe('PERPLEXITY_API_KEY');
  });
});
