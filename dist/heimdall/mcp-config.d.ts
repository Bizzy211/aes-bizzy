/**
 * MCP Configuration Manager for Heimdall
 *
 * Manages MCP server configuration for Heimdall integration
 * with Claude Code and Claude Desktop.
 */
import { HeimdallConfig } from '../types/heimdall.js';
export interface MCPServerEntry {
    command: string;
    args: string[];
    env?: Record<string, string>;
    disabled?: boolean;
}
export interface MCPConfigFile {
    mcpServers?: Record<string, MCPServerEntry>;
    globalShortcut?: string;
    [key: string]: unknown;
}
export interface ConfigLocation {
    path: string;
    exists: boolean;
    type: 'claude-desktop' | 'claude-code' | 'project';
    hasHeimdall: boolean;
}
/**
 * Find all MCP configuration files
 */
export declare function findAllConfigLocations(): ConfigLocation[];
/**
 * Get the primary config location (prefer project, then claude-code, then desktop)
 */
export declare function getPrimaryConfigLocation(): ConfigLocation | null;
/**
 * Read MCP config file
 */
export declare function readMcpConfig(configPath: string): MCPConfigFile | null;
/**
 * Write MCP config file
 */
export declare function writeMcpConfig(configPath: string, config: MCPConfigFile): void;
/**
 * Generate Heimdall MCP server entry
 */
export declare function generateHeimdallMcpEntry(heimdallConfig?: HeimdallConfig): MCPServerEntry;
/**
 * Add Heimdall to MCP configuration
 */
export declare function addHeimdallToConfig(configPath: string, heimdallConfig?: HeimdallConfig, serverName?: string): {
    success: boolean;
    error?: string;
};
/**
 * Remove Heimdall from MCP configuration
 */
export declare function removeHeimdallFromConfig(configPath: string): {
    success: boolean;
    error?: string;
};
/**
 * Update Heimdall configuration in MCP config
 */
export declare function updateHeimdallConfig(configPath: string, updates: Partial<HeimdallConfig>): {
    success: boolean;
    error?: string;
};
/**
 * Enable or disable Heimdall MCP server
 */
export declare function setHeimdallEnabled(configPath: string, enabled: boolean): {
    success: boolean;
    error?: string;
};
/**
 * Sync Heimdall configuration across all Claude config files
 */
export declare function syncHeimdallAcrossConfigs(heimdallConfig?: HeimdallConfig): {
    synced: string[];
    failed: {
        path: string;
        error: string;
    }[];
};
/**
 * Get Heimdall configuration status across all configs
 */
export declare function getHeimdallConfigStatus(): {
    configured: ConfigLocation[];
    notConfigured: ConfigLocation[];
    missingConfigs: ConfigLocation[];
};
/**
 * Validate Heimdall MCP configuration
 */
export declare function validateHeimdallMcpConfig(configPath: string): {
    valid: boolean;
    errors: string[];
    warnings: string[];
};
//# sourceMappingURL=mcp-config.d.ts.map