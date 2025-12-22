/**
 * Platform detection and path utilities
 *
 * Provides OS-agnostic utilities for detecting the current platform,
 * architecture, and common paths used by Claude Code ecosystem.
 */
import os from 'node:os';
import path from 'node:path';
/**
 * Detect the current platform and return platform-specific information
 */
export function getPlatform() {
    const platform = os.platform();
    const arch = os.arch();
    const claudeDir = path.join(os.homedir(), '.claude');
    const tempDir = os.tmpdir();
    let osType;
    let shell;
    switch (platform) {
        case 'win32':
            osType = 'windows';
            shell = 'powershell.exe';
            break;
        case 'darwin':
            osType = 'macos';
            shell = '/bin/zsh';
            break;
        default:
            osType = 'linux';
            shell = '/bin/bash';
            break;
    }
    return {
        os: osType,
        arch,
        claudeDir,
        tempDir,
        shell,
    };
}
/**
 * Get the Claude home directory (~/.claude)
 */
export function getClaudeDir() {
    return path.join(os.homedir(), '.claude');
}
/**
 * Get the agents directory (~/.claude/agents)
 */
export function getAgentsDir() {
    return path.join(getClaudeDir(), 'agents');
}
/**
 * Get the hooks directory (~/.claude/hooks)
 */
export function getHooksDir() {
    return path.join(getClaudeDir(), 'hooks');
}
/**
 * Get the skills directory (~/.claude/skills)
 */
export function getSkillsDir() {
    return path.join(getClaudeDir(), 'skills');
}
/**
 * Get the Claude settings file path (~/.claude/settings.json)
 */
export function getSettingsPath() {
    return path.join(getClaudeDir(), 'settings.json');
}
/**
 * Get the ecosystem configuration file path (~/.claude/ecosystem.json)
 */
export function getEcosystemConfigPath() {
    return path.join(getClaudeDir(), 'ecosystem.json');
}
/**
 * Get the MCP configuration file path (~/.claude/mcp.json or project .mcp.json)
 */
export function getMcpConfigPath(projectPath) {
    if (projectPath) {
        return path.join(projectPath, '.mcp.json');
    }
    return path.join(getClaudeDir(), 'mcp.json');
}
/**
 * Get all Claude-related paths in a single object
 */
export function getClaudePaths() {
    const claudeDir = getClaudeDir();
    return {
        claudeDir,
        agentsDir: getAgentsDir(),
        hooksDir: getHooksDir(),
        skillsDir: getSkillsDir(),
        settingsPath: getSettingsPath(),
        ecosystemConfigPath: getEcosystemConfigPath(),
        mcpConfigPath: getMcpConfigPath(),
    };
}
/**
 * Check if running on Windows
 */
export function isWindows() {
    return os.platform() === 'win32';
}
/**
 * Check if running on macOS
 */
export function isMacOS() {
    return os.platform() === 'darwin';
}
/**
 * Check if running on Linux
 */
export function isLinux() {
    return os.platform() === 'linux';
}
/**
 * Get the path separator for the current platform
 */
export function getPathSeparator() {
    return path.sep;
}
/**
 * Normalize a path for the current platform
 */
export function normalizePath(filePath) {
    return path.normalize(filePath);
}
/**
 * Join paths using the current platform's separator
 */
export function joinPaths(...paths) {
    return path.join(...paths);
}
//# sourceMappingURL=platform.js.map