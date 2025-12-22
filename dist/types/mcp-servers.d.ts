/**
 * MCP Server types and configurations
 *
 * Types and configurations for multiple MCP servers that can be installed.
 */
/**
 * Available MCP server identifiers
 */
export type MCPServerId = 'github' | 'task-master-ai' | 'context7' | 'sequential-thinking' | 'firecrawl' | 'desktop-commander' | 'beads-mcp' | 'supabase' | 'n8n' | 'exa' | 'ref';
/**
 * Environment variable requirement
 */
export interface EnvVarRequirement {
    name: string;
    description: string;
    required: boolean;
    envKey: string;
}
/**
 * MCP server configuration
 */
export interface MCPServerConfig {
    id: MCPServerId;
    name: string;
    description: string;
    package: string;
    recommended?: boolean;
    envVars: EnvVarRequirement[];
    estimatedTokenCost?: string;
    category: 'essential' | 'productivity' | 'research' | 'automation';
}
/**
 * Result of installing a single MCP server
 */
export interface MCPServerInstallResult {
    serverId: MCPServerId;
    success: boolean;
    error?: string;
}
/**
 * Summary of MCP server installation batch
 */
export interface InstallationSummary {
    installed: MCPServerId[];
    failed: {
        serverId: MCPServerId;
        error: string;
    }[];
    skipped: MCPServerId[];
    totalTime: number;
}
/**
 * Options for MCP server installation
 */
export interface MCPInstallOptions {
    skipPrompt?: boolean;
    showSpinner?: boolean;
    envVars?: Record<string, string>;
}
/**
 * Generic MCP server status for multi-server management
 */
export interface GenericMCPServerStatus {
    serverId: MCPServerId;
    installed: boolean;
    healthy?: boolean;
    version?: string;
    error?: string;
}
/**
 * Available MCP server configurations
 */
export declare const MCP_SERVERS: MCPServerConfig[];
/**
 * Get server configuration by ID
 */
export declare function getMCPServerConfig(serverId: MCPServerId): MCPServerConfig | undefined;
/**
 * Get recommended servers
 */
export declare function getRecommendedServers(): MCPServerConfig[];
/**
 * Get servers by category
 */
export declare function getServersByCategory(category: MCPServerConfig['category']): MCPServerConfig[];
//# sourceMappingURL=mcp-servers.d.ts.map