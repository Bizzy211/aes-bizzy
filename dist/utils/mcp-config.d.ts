/**
 * MCP configuration file utilities
 *
 * Creates and manages project-level .mcp.json files with
 * environment variable placeholders for credentials.
 */
import type { MCPServerId, MCPServerConfig } from '../types/mcp-servers.js';
/**
 * MCP server entry in .mcp.json
 */
export interface MCPJsonServerEntry {
    command?: string;
    args?: string[];
    transport?: 'stdio' | 'http';
    url?: string;
    headers?: Record<string, string>;
    env?: Record<string, string>;
}
/**
 * Structure of .mcp.json file
 */
export interface MCPJsonConfig {
    mcpServers: Record<string, MCPJsonServerEntry>;
}
/**
 * Build MCP server entry from config
 * Uses environment variable placeholders instead of actual values
 */
export declare function buildMcpServerEntry(config: MCPServerConfig): MCPJsonServerEntry;
/**
 * Create .mcp.json content for selected servers
 */
export declare function createMcpJsonContent(serverIds: MCPServerId[]): MCPJsonConfig;
/**
 * Get path to project .mcp.json
 */
export declare function getMcpConfigPath(projectPath: string): string;
/**
 * Check if .mcp.json exists in project
 */
export declare function mcpConfigExists(projectPath: string): boolean;
/**
 * Read existing .mcp.json from project
 */
export declare function readMcpConfig(projectPath: string): Promise<MCPJsonConfig | null>;
/**
 * Write .mcp.json to project
 */
export declare function writeMcpConfig(projectPath: string, config: MCPJsonConfig): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * Create .mcp.json with selected servers
 * Main entry point for init command
 */
export declare function createMcpConfig(projectPath: string, serverIds: MCPServerId[]): Promise<{
    success: boolean;
    created: boolean;
    serversAdded: number;
    error?: string;
}>;
/**
 * Get list of servers configured in .mcp.json
 */
export declare function getConfiguredServers(projectPath: string): Promise<string[]>;
/**
 * Add a single server to existing .mcp.json
 */
export declare function addServerToConfig(projectPath: string, serverId: MCPServerId): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * Remove a server from .mcp.json
 */
export declare function removeServerFromConfig(projectPath: string, serverId: string): Promise<{
    success: boolean;
    removed: boolean;
    error?: string;
}>;
//# sourceMappingURL=mcp-config.d.ts.map