/**
 * MCP configuration file utilities
 *
 * Creates and manages project-level .mcp.json files with
 * environment variable placeholders for credentials.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { existsSync } from 'node:fs';
import type { MCPServerId, MCPServerConfig } from '../types/mcp-servers.js';
import { getMCPServerConfig } from '../types/mcp-servers.js';

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
 * Convert env var name to placeholder format
 * e.g., "GITHUB_TOKEN" -> "${GITHUB_TOKEN}"
 */
function toEnvPlaceholder(envKey: string): string {
  return `\${${envKey}}`;
}

/**
 * Build MCP server entry from config
 * Uses environment variable placeholders instead of actual values
 */
export function buildMcpServerEntry(config: MCPServerConfig): MCPJsonServerEntry {
  const transport = config.transport || 'stdio';

  if (transport === 'http') {
    // HTTP transport configuration
    const entry: MCPJsonServerEntry = {
      transport: 'http',
      url: config.url,
    };

    // Add headers with env var placeholders
    if (config.headers && config.headers.length > 0) {
      entry.headers = {};
      for (const header of config.headers) {
        // Replace ${VAR} in template - keep as placeholder
        entry.headers[header.name] = header.valueTemplate;
      }
    }

    return entry;
  }

  // Stdio transport configuration (npx)
  const entry: MCPJsonServerEntry = {
    command: 'npx',
    args: ['-y', config.package!],
  };

  // Add env vars as placeholders
  if (config.envVars && config.envVars.length > 0) {
    entry.env = {};
    for (const envVar of config.envVars) {
      entry.env[envVar.envKey] = toEnvPlaceholder(envVar.envKey);
    }
  }

  return entry;
}

/**
 * Create .mcp.json content for selected servers
 */
export function createMcpJsonContent(serverIds: MCPServerId[]): MCPJsonConfig {
  const config: MCPJsonConfig = {
    mcpServers: {},
  };

  for (const serverId of serverIds) {
    const serverConfig = getMCPServerConfig(serverId);
    if (serverConfig) {
      config.mcpServers[serverId] = buildMcpServerEntry(serverConfig);
    }
  }

  return config;
}

/**
 * Get path to project .mcp.json
 */
export function getMcpConfigPath(projectPath: string): string {
  return path.join(projectPath, '.mcp.json');
}

/**
 * Check if .mcp.json exists in project
 */
export function mcpConfigExists(projectPath: string): boolean {
  return existsSync(getMcpConfigPath(projectPath));
}

/**
 * Read existing .mcp.json from project
 */
export async function readMcpConfig(
  projectPath: string
): Promise<MCPJsonConfig | null> {
  const configPath = getMcpConfigPath(projectPath);

  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content) as MCPJsonConfig;
  } catch {
    return null;
  }
}

/**
 * Write .mcp.json to project
 */
export async function writeMcpConfig(
  projectPath: string,
  config: MCPJsonConfig
): Promise<{ success: boolean; error?: string }> {
  const configPath = getMcpConfigPath(projectPath);

  try {
    const content = JSON.stringify(config, null, 2);
    await fs.writeFile(configPath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Create .mcp.json with selected servers
 * Main entry point for init command
 */
export async function createMcpConfig(
  projectPath: string,
  serverIds: MCPServerId[]
): Promise<{
  success: boolean;
  created: boolean;
  serversAdded: number;
  error?: string;
}> {
  try {
    // Check for existing config
    const existing = await readMcpConfig(projectPath);

    if (existing) {
      // Merge with existing - add new servers
      let added = 0;
      for (const serverId of serverIds) {
        if (!existing.mcpServers[serverId]) {
          const serverConfig = getMCPServerConfig(serverId);
          if (serverConfig) {
            existing.mcpServers[serverId] = buildMcpServerEntry(serverConfig);
            added++;
          }
        }
      }

      if (added > 0) {
        const result = await writeMcpConfig(projectPath, existing);
        return {
          success: result.success,
          created: false,
          serversAdded: added,
          error: result.error,
        };
      }

      return {
        success: true,
        created: false,
        serversAdded: 0,
      };
    }

    // Create new config
    const config = createMcpJsonContent(serverIds);
    const result = await writeMcpConfig(projectPath, config);

    return {
      success: result.success,
      created: true,
      serversAdded: serverIds.length,
      error: result.error,
    };
  } catch (error) {
    return {
      success: false,
      created: false,
      serversAdded: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get list of servers configured in .mcp.json
 */
export async function getConfiguredServers(
  projectPath: string
): Promise<string[]> {
  const config = await readMcpConfig(projectPath);
  if (!config) {
    return [];
  }
  return Object.keys(config.mcpServers);
}

/**
 * Add a single server to existing .mcp.json
 */
export async function addServerToConfig(
  projectPath: string,
  serverId: MCPServerId
): Promise<{ success: boolean; error?: string }> {
  const result = await createMcpConfig(projectPath, [serverId]);
  return { success: result.success, error: result.error };
}

/**
 * Remove a server from .mcp.json
 */
export async function removeServerFromConfig(
  projectPath: string,
  serverId: string
): Promise<{ success: boolean; removed: boolean; error?: string }> {
  try {
    const config = await readMcpConfig(projectPath);

    if (!config || !config.mcpServers[serverId]) {
      return { success: true, removed: false };
    }

    delete config.mcpServers[serverId];

    const result = await writeMcpConfig(projectPath, config);
    return {
      success: result.success,
      removed: true,
      error: result.error,
    };
  } catch (error) {
    return {
      success: false,
      removed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
