/**
 * Generic MCP server installer
 *
 * Installs and configures multiple MCP servers with validation.
 */

import * as prompts from '@clack/prompts';
import { executeCommand, execCommandWithSpinner } from '../utils/shell.js';
import { createLogger } from '../utils/logger.js';
import type {
  MCPServerId,
  MCPServerConfig,
  MCPServerInstallResult,
  InstallationSummary,
  MCPInstallOptions,
  GenericMCPServerStatus,
  MCPHttpHeader,
} from '../types/mcp-servers.js';
import { MCP_SERVERS, getMCPServerConfig, getRecommendedServers } from '../types/mcp-servers.js';

const logger = createLogger({ context: { module: 'mcp-servers-installer' } });

/**
 * Check if required environment variables are available
 */
export function checkEnvVars(serverId: MCPServerId): { valid: boolean; missing: string[] } {
  const config = getMCPServerConfig(serverId);
  if (!config) {
    return { valid: false, missing: ['Unknown server'] };
  }

  const missing: string[] = [];
  for (const envVar of config.envVars) {
    if (envVar.required && !process.env[envVar.envKey]) {
      missing.push(envVar.envKey);
    }
  }

  return { valid: missing.length === 0, missing };
}

/**
 * Check if an MCP server is installed
 */
export async function isMCPServerInstalled(serverId: MCPServerId): Promise<GenericMCPServerStatus> {
  const config = getMCPServerConfig(serverId);
  if (!config) {
    return {
      serverId,
      installed: false,
      error: 'Unknown server',
    };
  }

  try {
    const result = await executeCommand('claude', ['mcp', 'list']);

    if (result.exitCode !== 0) {
      return {
        serverId,
        installed: false,
        error: 'Failed to list MCP servers',
      };
    }

    // Check if server name appears in the list
    const isInstalled = result.stdout.includes(serverId);
    return {
      serverId,
      installed: isInstalled,
    };
  } catch (error) {
    return {
      serverId,
      installed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Build environment variable arguments for MCP add command
 */
export function buildEnvArgs(
  serverId: MCPServerId,
  customEnvVars?: Record<string, string>
): string[] {
  const config = getMCPServerConfig(serverId);
  if (!config) return [];

  const envArgs: string[] = [];

  for (const envVar of config.envVars) {
    // Use custom value, then process.env, then skip
    const value = customEnvVars?.[envVar.envKey] || process.env[envVar.envKey];
    if (value) {
      envArgs.push('-e', `${envVar.envKey}=${value}`);
    }
  }

  return envArgs;
}

/**
 * Resolve header value template with environment variables
 * e.g., "Bearer ${GITHUB_TOKEN}" -> "Bearer ghp_xxxxx"
 */
export function resolveHeaderValue(
  template: string,
  customEnvVars?: Record<string, string>
): string {
  return template.replace(/\$\{([^}]+)\}/g, (_, envKey) => {
    return customEnvVars?.[envKey] || process.env[envKey] || '';
  });
}

/**
 * Build HTTP header arguments for MCP add command
 * Returns array of ['-H', 'HeaderName: HeaderValue'] pairs
 */
export function buildHttpHeaderArgs(
  headers: MCPHttpHeader[],
  customEnvVars?: Record<string, string>
): string[] {
  const headerArgs: string[] = [];

  for (const header of headers) {
    const value = resolveHeaderValue(header.valueTemplate, customEnvVars);
    if (value) {
      headerArgs.push('-H', `${header.name}: ${value}`);
    }
  }

  return headerArgs;
}

/**
 * Build command arguments for installing an MCP server
 * Handles both stdio (npx) and http transport types
 */
export function buildInstallArgs(
  config: MCPServerConfig,
  customEnvVars?: Record<string, string>
): string[] {
  const transport = config.transport || 'stdio';

  if (transport === 'http') {
    // HTTP transport: claude mcp add --transport http <name> <url> [-H "Header: Value"]
    if (!config.url) {
      throw new Error(`HTTP transport requires url for server ${config.id}`);
    }

    const args = ['mcp', 'add', '--transport', 'http', config.id, config.url, '-s', 'user'];

    // Add HTTP headers
    if (config.headers && config.headers.length > 0) {
      const headerArgs = buildHttpHeaderArgs(config.headers, customEnvVars);
      args.push(...headerArgs);
    }

    return args;
  }

  // Default: stdio transport with npx
  // claude mcp add <server-name> -s user [-e KEY=VALUE...] -- npx -y <package>
  if (!config.package) {
    throw new Error(`stdio transport requires package for server ${config.id}`);
  }

  const args = ['mcp', 'add', config.id, '-s', 'user'];

  // Add environment variable arguments
  const envArgsList = buildEnvArgs(config.id, customEnvVars);
  args.push(...envArgsList);

  // Add npx command
  args.push('--', 'npx', '-y', config.package);

  return args;
}

/**
 * Install a single MCP server
 */
export async function installMCPServer(
  serverId: MCPServerId,
  options: MCPInstallOptions = {}
): Promise<MCPServerInstallResult> {
  const { showSpinner = true, envVars } = options;

  const config = getMCPServerConfig(serverId);
  if (!config) {
    return {
      serverId,
      success: false,
      error: `Unknown server: ${serverId}`,
    };
  }

  // Check if already installed
  const status = await isMCPServerInstalled(serverId);
  if (status.installed) {
    logger.info(`${config.name} is already installed`);
    return { serverId, success: true };
  }

  // Check required environment variables
  const envCheck = checkEnvVars(serverId);
  if (!envCheck.valid && !envVars) {
    return {
      serverId,
      success: false,
      error: `Missing required environment variables: ${envCheck.missing.join(', ')}`,
    };
  }

  // Build command arguments based on transport type
  let args: string[];
  try {
    args = buildInstallArgs(config, envVars);
  } catch (error) {
    return {
      serverId,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  try {
    const transport = config.transport || 'stdio';
    logger.debug(`Installing ${config.name} (${transport} transport)...`);

    let result;
    if (showSpinner) {
      result = await execCommandWithSpinner('claude', args, {
        spinnerText: `Installing ${config.name}...`,
      });
    } else {
      result = await executeCommand('claude', args);
    }

    if (result.exitCode !== 0) {
      return {
        serverId,
        success: false,
        error: result.stderr || 'Installation failed',
      };
    }

    // Verify installation
    const verification = await isMCPServerInstalled(serverId);
    if (!verification.installed) {
      return {
        serverId,
        success: false,
        error: 'Installation completed but server not found',
      };
    }

    logger.success(`${config.name} installed successfully`);
    return { serverId, success: true };
  } catch (error) {
    return {
      serverId,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Uninstall an MCP server
 */
export async function uninstallMCPServer(
  serverId: MCPServerId,
  options: { showSpinner?: boolean } = {}
): Promise<MCPServerInstallResult> {
  const { showSpinner = true } = options;

  const config = getMCPServerConfig(serverId);
  if (!config) {
    return {
      serverId,
      success: false,
      error: `Unknown server: ${serverId}`,
    };
  }

  // Check if installed
  const status = await isMCPServerInstalled(serverId);
  if (!status.installed) {
    logger.info(`${config.name} is not installed`);
    return { serverId, success: true };
  }

  try {
    const args = ['mcp', 'remove', serverId];

    let result;
    if (showSpinner) {
      result = await execCommandWithSpinner('claude', args, {
        spinnerText: `Removing ${config.name}...`,
      });
    } else {
      result = await executeCommand('claude', args);
    }

    if (result.exitCode !== 0) {
      return {
        serverId,
        success: false,
        error: result.stderr || 'Removal failed',
      };
    }

    logger.success(`${config.name} removed successfully`);
    return { serverId, success: true };
  } catch (error) {
    return {
      serverId,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Verify an MCP server is working
 */
export async function verifyMCPServer(serverId: MCPServerId): Promise<GenericMCPServerStatus> {
  const config = getMCPServerConfig(serverId);
  if (!config) {
    return {
      serverId,
      installed: false,
      healthy: false,
      error: 'Unknown server',
    };
  }

  try {
    // First check if installed
    const status = await isMCPServerInstalled(serverId);
    if (!status.installed) {
      return {
        serverId,
        installed: false,
        healthy: false,
        error: 'Server not installed',
      };
    }

    // Try to get server info using claude mcp which
    const result = await executeCommand('claude', ['mcp', 'which', serverId]);

    if (result.exitCode === 0) {
      return {
        serverId,
        installed: true,
        healthy: true,
      };
    }

    return {
      serverId,
      installed: true,
      healthy: false,
      error: result.stderr || 'Verification failed',
    };
  } catch (error) {
    return {
      serverId,
      installed: false,
      healthy: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Interactive MCP server selection
 */
export async function selectMCPServers(
  skipPrompt = false
): Promise<MCPServerId[] | undefined> {
  if (skipPrompt) {
    // Return recommended servers
    return getRecommendedServers().map((s) => s.id);
  }

  // Group servers by category for display
  const options = MCP_SERVERS.map((server) => ({
    value: server.id,
    label: server.name,
    hint: `${server.description}${server.estimatedTokenCost ? ` (${server.estimatedTokenCost})` : ''}${server.recommended ? ' [recommended]' : ''}`,
  }));

  const selected = await prompts.multiselect({
    message: 'Select MCP servers to install:',
    options,
    initialValues: getRecommendedServers().map((s) => s.id),
    required: false,
  });

  if (prompts.isCancel(selected)) {
    return undefined;
  }

  return selected as MCPServerId[];
}

/**
 * Install multiple MCP servers
 */
export async function installMCPServers(
  serverIds: MCPServerId[],
  options: MCPInstallOptions = {}
): Promise<InstallationSummary> {
  const startTime = Date.now();
  const summary: InstallationSummary = {
    installed: [],
    failed: [],
    skipped: [],
    totalTime: 0,
  };

  for (const serverId of serverIds) {
    const config = getMCPServerConfig(serverId);
    if (!config) {
      summary.skipped.push(serverId);
      continue;
    }

    // Check environment variables
    const envCheck = checkEnvVars(serverId);
    if (!envCheck.valid && !options.envVars) {
      logger.warn(`Skipping ${config.name}: missing ${envCheck.missing.join(', ')}`);
      summary.skipped.push(serverId);
      continue;
    }

    const result = await installMCPServer(serverId, options);

    if (result.success) {
      summary.installed.push(serverId);
    } else {
      summary.failed.push({
        serverId,
        error: result.error || 'Unknown error',
      });
    }
  }

  summary.totalTime = Date.now() - startTime;
  return summary;
}

/**
 * Get all available MCP servers
 */
export function getAvailableMCPServers(): MCPServerConfig[] {
  return MCP_SERVERS;
}

/**
 * Get installation status for all servers
 */
export async function getMCPServersStatus(): Promise<GenericMCPServerStatus[]> {
  const statuses: GenericMCPServerStatus[] = [];

  for (const server of MCP_SERVERS) {
    const status = await isMCPServerInstalled(server.id);
    statuses.push(status);
  }

  return statuses;
}
