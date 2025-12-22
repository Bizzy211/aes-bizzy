/**
 * Platform detection and path utilities
 *
 * Provides OS-agnostic utilities for detecting the current platform,
 * architecture, and common paths used by Claude Code ecosystem.
 */
import type { Platform, ClaudePaths } from '../types/platform.js';
/**
 * Detect the current platform and return platform-specific information
 */
export declare function getPlatform(): Platform;
/**
 * Get the Claude home directory (~/.claude)
 */
export declare function getClaudeDir(): string;
/**
 * Get the agents directory (~/.claude/agents)
 */
export declare function getAgentsDir(): string;
/**
 * Get the hooks directory (~/.claude/hooks)
 */
export declare function getHooksDir(): string;
/**
 * Get the skills directory (~/.claude/skills)
 */
export declare function getSkillsDir(): string;
/**
 * Get the Claude settings file path (~/.claude/settings.json)
 */
export declare function getSettingsPath(): string;
/**
 * Get the ecosystem configuration file path (~/.claude/ecosystem.json)
 */
export declare function getEcosystemConfigPath(): string;
/**
 * Get the MCP configuration file path (~/.claude/mcp.json or project .mcp.json)
 */
export declare function getMcpConfigPath(projectPath?: string): string;
/**
 * Get all Claude-related paths in a single object
 */
export declare function getClaudePaths(): ClaudePaths;
/**
 * Check if running on Windows
 */
export declare function isWindows(): boolean;
/**
 * Check if running on macOS
 */
export declare function isMacOS(): boolean;
/**
 * Check if running on Linux
 */
export declare function isLinux(): boolean;
/**
 * Get the path separator for the current platform
 */
export declare function getPathSeparator(): string;
/**
 * Normalize a path for the current platform
 */
export declare function normalizePath(filePath: string): string;
/**
 * Join paths using the current platform's separator
 */
export declare function joinPaths(...paths: string[]): string;
//# sourceMappingURL=platform.d.ts.map