/**
 * Generic MCP server installer
 *
 * Installs and configures multiple MCP servers with validation.
 */
import type { MCPServerId, MCPServerConfig, MCPServerInstallResult, InstallationSummary, MCPInstallOptions, GenericMCPServerStatus } from '../types/mcp-servers.js';
/**
 * Check if required environment variables are available
 */
export declare function checkEnvVars(serverId: MCPServerId): {
    valid: boolean;
    missing: string[];
};
/**
 * Check if an MCP server is installed
 */
export declare function isMCPServerInstalled(serverId: MCPServerId): Promise<GenericMCPServerStatus>;
/**
 * Build environment variable arguments for MCP add command
 */
export declare function buildEnvArgs(serverId: MCPServerId, customEnvVars?: Record<string, string>): string[];
/**
 * Install a single MCP server
 */
export declare function installMCPServer(serverId: MCPServerId, options?: MCPInstallOptions): Promise<MCPServerInstallResult>;
/**
 * Uninstall an MCP server
 */
export declare function uninstallMCPServer(serverId: MCPServerId, options?: {
    showSpinner?: boolean;
}): Promise<MCPServerInstallResult>;
/**
 * Verify an MCP server is working
 */
export declare function verifyMCPServer(serverId: MCPServerId): Promise<GenericMCPServerStatus>;
/**
 * Interactive MCP server selection
 */
export declare function selectMCPServers(skipPrompt?: boolean): Promise<MCPServerId[] | undefined>;
/**
 * Install multiple MCP servers
 */
export declare function installMCPServers(serverIds: MCPServerId[], options?: MCPInstallOptions): Promise<InstallationSummary>;
/**
 * Get all available MCP servers
 */
export declare function getAvailableMCPServers(): MCPServerConfig[];
/**
 * Get installation status for all servers
 */
export declare function getMCPServersStatus(): Promise<GenericMCPServerStatus[]>;
//# sourceMappingURL=mcp-servers.d.ts.map