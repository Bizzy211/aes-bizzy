import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import {
  getPlatform,
  getClaudeDir,
  getAgentsDir,
  getHooksDir,
  getSkillsDir,
  getSettingsPath,
  getEcosystemConfigPath,
  getMcpConfigPath,
  getClaudePaths,
  isWindows,
  isMacOS,
  isLinux,
  getPathSeparator,
  normalizePath,
  joinPaths,
} from '../../src/utils/platform.js';

describe('getPlatform', () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('detects Windows correctly', () => {
    vi.spyOn(os, 'platform').mockReturnValue('win32');
    vi.spyOn(os, 'arch').mockReturnValue('x64');
    vi.spyOn(os, 'homedir').mockReturnValue('C:\\Users\\TestUser');
    vi.spyOn(os, 'tmpdir').mockReturnValue('C:\\Temp');

    const platform = getPlatform();

    expect(platform.os).toBe('windows');
    expect(platform.arch).toBe('x64');
    expect(platform.claudeDir).toContain('.claude');
    expect(platform.shell).toBe('powershell.exe');
  });

  it('detects macOS correctly', () => {
    vi.spyOn(os, 'platform').mockReturnValue('darwin');
    vi.spyOn(os, 'arch').mockReturnValue('arm64');
    vi.spyOn(os, 'homedir').mockReturnValue('/Users/testuser');
    vi.spyOn(os, 'tmpdir').mockReturnValue('/tmp');

    const platform = getPlatform();

    expect(platform.os).toBe('macos');
    expect(platform.arch).toBe('arm64');
    expect(platform.claudeDir).toContain('.claude');
    expect(platform.shell).toBe('/bin/zsh');
  });

  it('detects Linux correctly', () => {
    vi.spyOn(os, 'platform').mockReturnValue('linux');
    vi.spyOn(os, 'arch').mockReturnValue('x64');
    vi.spyOn(os, 'homedir').mockReturnValue('/home/testuser');
    vi.spyOn(os, 'tmpdir').mockReturnValue('/tmp');

    const platform = getPlatform();

    expect(platform.os).toBe('linux');
    expect(platform.arch).toBe('x64');
    expect(platform.claudeDir).toContain('.claude');
    expect(platform.shell).toBe('/bin/bash');
  });

  it('includes tempDir from os.tmpdir()', () => {
    vi.spyOn(os, 'platform').mockReturnValue('linux');
    vi.spyOn(os, 'tmpdir').mockReturnValue('/custom/temp');
    vi.spyOn(os, 'homedir').mockReturnValue('/home/testuser');
    vi.spyOn(os, 'arch').mockReturnValue('x64');

    const platform = getPlatform();

    expect(platform.tempDir).toBe('/custom/temp');
  });
});

describe('path utilities', () => {
  beforeEach(() => {
    vi.spyOn(os, 'homedir').mockReturnValue('/home/testuser');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getClaudeDir returns ~/.claude', () => {
    const claudeDir = getClaudeDir();
    expect(claudeDir).toBe(path.join('/home/testuser', '.claude'));
  });

  it('getAgentsDir returns ~/.claude/agents', () => {
    const agentsDir = getAgentsDir();
    expect(agentsDir).toBe(path.join('/home/testuser', '.claude', 'agents'));
  });

  it('getHooksDir returns ~/.claude/hooks', () => {
    const hooksDir = getHooksDir();
    expect(hooksDir).toBe(path.join('/home/testuser', '.claude', 'hooks'));
  });

  it('getSkillsDir returns ~/.claude/skills', () => {
    const skillsDir = getSkillsDir();
    expect(skillsDir).toBe(path.join('/home/testuser', '.claude', 'skills'));
  });

  it('getSettingsPath returns ~/.claude/settings.json', () => {
    const settingsPath = getSettingsPath();
    expect(settingsPath).toBe(path.join('/home/testuser', '.claude', 'settings.json'));
  });

  it('getEcosystemConfigPath returns ~/.claude/ecosystem.json', () => {
    const configPath = getEcosystemConfigPath();
    expect(configPath).toBe(path.join('/home/testuser', '.claude', 'ecosystem.json'));
  });

  it('getMcpConfigPath returns ~/.claude/mcp.json by default', () => {
    const mcpPath = getMcpConfigPath();
    expect(mcpPath).toBe(path.join('/home/testuser', '.claude', 'mcp.json'));
  });

  it('getMcpConfigPath returns project/.mcp.json when projectPath provided', () => {
    const mcpPath = getMcpConfigPath('/path/to/project');
    expect(mcpPath).toBe(path.join('/path/to/project', '.mcp.json'));
  });

  it('getClaudePaths returns all paths', () => {
    const paths = getClaudePaths();
    expect(paths).toHaveProperty('claudeDir');
    expect(paths).toHaveProperty('agentsDir');
    expect(paths).toHaveProperty('hooksDir');
    expect(paths).toHaveProperty('skillsDir');
    expect(paths).toHaveProperty('settingsPath');
    expect(paths).toHaveProperty('ecosystemConfigPath');
    expect(paths).toHaveProperty('mcpConfigPath');
  });
});

describe('platform detection helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('isWindows returns true on Windows', () => {
    vi.spyOn(os, 'platform').mockReturnValue('win32');
    expect(isWindows()).toBe(true);
    expect(isMacOS()).toBe(false);
    expect(isLinux()).toBe(false);
  });

  it('isMacOS returns true on macOS', () => {
    vi.spyOn(os, 'platform').mockReturnValue('darwin');
    expect(isWindows()).toBe(false);
    expect(isMacOS()).toBe(true);
    expect(isLinux()).toBe(false);
  });

  it('isLinux returns true on Linux', () => {
    vi.spyOn(os, 'platform').mockReturnValue('linux');
    expect(isWindows()).toBe(false);
    expect(isMacOS()).toBe(false);
    expect(isLinux()).toBe(true);
  });
});

describe('path manipulation utilities', () => {
  it('getPathSeparator returns platform separator', () => {
    const sep = getPathSeparator();
    expect(sep).toBe(path.sep);
  });

  it('normalizePath normalizes paths', () => {
    const normalized = normalizePath('/foo//bar/../baz');
    expect(normalized).toBe(path.normalize('/foo//bar/../baz'));
  });

  it('joinPaths joins paths correctly', () => {
    const joined = joinPaths('/foo', 'bar', 'baz');
    expect(joined).toBe(path.join('/foo', 'bar', 'baz'));
  });
});
