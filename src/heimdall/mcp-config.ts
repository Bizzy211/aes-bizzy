/**
 * MCP Configuration Manager for Heimdall
 *
 * Manages MCP server configuration for Heimdall integration
 * with Claude Code and Claude Desktop.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  HeimdallConfig,
  DEFAULT_HEIMDALL_CONFIG,
} from '../types/heimdall.js';

// ============================================================================
// Types
// ============================================================================

export interface MCPServerEntry {
  command: string;
  args: string[];
  env?: Record<string, string>;
  disabled?: boolean;
}

export interface MCPConfigFile {
  mcpServers?: Record<string, MCPServerEntry>;
  globalShortcut?: string;
  // Allow other properties
  [key: string]: unknown;
}

export interface ConfigLocation {
  path: string;
  exists: boolean;
  type: 'claude-desktop' | 'claude-code' | 'project';
  hasHeimdall: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const CLAUDE_DESKTOP_PATHS = {
  win32: path.join(os.homedir(), 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json'),
  darwin: path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
  linux: path.join(os.homedir(), '.config', 'claude', 'config.json'),
};

const CLAUDE_CODE_PATHS = [
  path.join(os.homedir(), '.claude', 'claude_desktop_config.json'),
  path.join(os.homedir(), '.claude', 'settings.json'),
];

// ============================================================================
// Config Detection
// ============================================================================

/**
 * Find all MCP configuration files
 */
export function findAllConfigLocations(): ConfigLocation[] {
  const locations: ConfigLocation[] = [];

  // Check Claude Desktop config
  const platform = process.platform as 'win32' | 'darwin' | 'linux';
  const desktopPath = CLAUDE_DESKTOP_PATHS[platform] || CLAUDE_DESKTOP_PATHS.linux;

  locations.push({
    path: desktopPath,
    exists: fs.existsSync(desktopPath),
    type: 'claude-desktop',
    hasHeimdall: checkConfigHasHeimdall(desktopPath),
  });

  // Check Claude Code configs
  for (const codePath of CLAUDE_CODE_PATHS) {
    locations.push({
      path: codePath,
      exists: fs.existsSync(codePath),
      type: 'claude-code',
      hasHeimdall: checkConfigHasHeimdall(codePath),
    });
  }

  // Check project-level config
  const projectMcp = path.join(process.cwd(), '.mcp.json');
  locations.push({
    path: projectMcp,
    exists: fs.existsSync(projectMcp),
    type: 'project',
    hasHeimdall: checkConfigHasHeimdall(projectMcp),
  });

  return locations;
}

/**
 * Check if a config file contains Heimdall configuration
 */
function checkConfigHasHeimdall(configPath: string): boolean {
  try {
    if (!fs.existsSync(configPath)) {
      return false;
    }

    const content = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content) as MCPConfigFile;

    return !!(
      config.mcpServers?.heimdall ||
      config.mcpServers?.['heimdall-mcp'] ||
      config.mcpServers?.['@anthropic/heimdall-mcp']
    );
  } catch {
    return false;
  }
}

/**
 * Get the primary config location (prefer project, then claude-code, then desktop)
 */
export function getPrimaryConfigLocation(): ConfigLocation | null {
  const locations = findAllConfigLocations();

  // Prefer project-level config if it exists
  const projectConfig = locations.find(l => l.type === 'project' && l.exists);
  if (projectConfig) {
    return projectConfig;
  }

  // Then Claude Code config
  const codeConfig = locations.find(l => l.type === 'claude-code' && l.exists);
  if (codeConfig) {
    return codeConfig;
  }

  // Then Claude Desktop config
  const desktopConfig = locations.find(l => l.type === 'claude-desktop' && l.exists);
  if (desktopConfig) {
    return desktopConfig;
  }

  // Return project path as default (will be created)
  return locations.find(l => l.type === 'project') || null;
}

// ============================================================================
// Config Reading/Writing
// ============================================================================

/**
 * Read MCP config file
 */
export function readMcpConfig(configPath: string): MCPConfigFile | null {
  try {
    if (!fs.existsSync(configPath)) {
      return null;
    }

    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as MCPConfigFile;
  } catch {
    return null;
  }
}

/**
 * Write MCP config file
 */
export function writeMcpConfig(configPath: string, config: MCPConfigFile): void {
  // Ensure directory exists
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// ============================================================================
// Heimdall Configuration
// ============================================================================

/**
 * Generate Heimdall MCP server entry
 */
export function generateHeimdallMcpEntry(
  heimdallConfig: HeimdallConfig = DEFAULT_HEIMDALL_CONFIG
): MCPServerEntry {
  return {
    command: 'npx',
    args: ['-y', '@anthropic/heimdall-mcp'],
    env: {
      QDRANT_URL: heimdallConfig.qdrantUrl,
      COLLECTION_NAME: heimdallConfig.collectionName,
      EMBEDDING_MODEL: heimdallConfig.embeddingModel,
      MAX_RESULTS: String(heimdallConfig.maxResults),
      MIN_RELEVANCE: String(heimdallConfig.minRelevance),
      // These will be substituted from environment
      OPENAI_API_KEY: '${OPENAI_API_KEY}',
    },
  };
}

/**
 * Add Heimdall to MCP configuration
 */
export function addHeimdallToConfig(
  configPath: string,
  heimdallConfig: HeimdallConfig = DEFAULT_HEIMDALL_CONFIG,
  serverName: string = 'heimdall'
): { success: boolean; error?: string } {
  try {
    let config = readMcpConfig(configPath) || { mcpServers: {} };

    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    // Add Heimdall entry
    config.mcpServers[serverName] = generateHeimdallMcpEntry(heimdallConfig);

    writeMcpConfig(configPath, config);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Remove Heimdall from MCP configuration
 */
export function removeHeimdallFromConfig(
  configPath: string
): { success: boolean; error?: string } {
  try {
    const config = readMcpConfig(configPath);
    if (!config?.mcpServers) {
      return { success: true }; // Nothing to remove
    }

    // Remove all Heimdall-related entries
    delete config.mcpServers.heimdall;
    delete config.mcpServers['heimdall-mcp'];
    delete config.mcpServers['@anthropic/heimdall-mcp'];

    writeMcpConfig(configPath, config);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Update Heimdall configuration in MCP config
 */
export function updateHeimdallConfig(
  configPath: string,
  updates: Partial<HeimdallConfig>
): { success: boolean; error?: string } {
  try {
    const config = readMcpConfig(configPath);
    if (!config?.mcpServers) {
      return { success: false, error: 'No MCP configuration found' };
    }

    // Find Heimdall entry
    const heimdallKey = Object.keys(config.mcpServers).find(key =>
      key === 'heimdall' || key === 'heimdall-mcp' || key.includes('heimdall')
    );

    if (!heimdallKey) {
      return { success: false, error: 'Heimdall not found in configuration' };
    }

    // Merge updates into existing config
    const existingEntry = config.mcpServers[heimdallKey];
    if (!existingEntry) {
      return { success: false, error: 'Heimdall entry not found' };
    }

    const newHeimdallConfig: HeimdallConfig = {
      ...DEFAULT_HEIMDALL_CONFIG,
      ...updates,
    };

    config.mcpServers[heimdallKey] = {
      command: existingEntry.command,
      args: existingEntry.args,
      disabled: existingEntry.disabled,
      env: {
        ...existingEntry.env,
        QDRANT_URL: newHeimdallConfig.qdrantUrl,
        COLLECTION_NAME: newHeimdallConfig.collectionName,
        EMBEDDING_MODEL: newHeimdallConfig.embeddingModel,
        MAX_RESULTS: String(newHeimdallConfig.maxResults),
        MIN_RELEVANCE: String(newHeimdallConfig.minRelevance),
      },
    };

    writeMcpConfig(configPath, config);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Enable or disable Heimdall MCP server
 */
export function setHeimdallEnabled(
  configPath: string,
  enabled: boolean
): { success: boolean; error?: string } {
  try {
    const config = readMcpConfig(configPath);
    if (!config?.mcpServers) {
      return { success: false, error: 'No MCP configuration found' };
    }

    const heimdallKey = Object.keys(config.mcpServers).find(key =>
      key.includes('heimdall')
    );

    if (!heimdallKey) {
      return { success: false, error: 'Heimdall not found in configuration' };
    }

    const heimdallEntry = config.mcpServers[heimdallKey];
    if (!heimdallEntry) {
      return { success: false, error: 'Heimdall entry not found' };
    }

    if (enabled) {
      delete heimdallEntry.disabled;
    } else {
      heimdallEntry.disabled = true;
    }

    writeMcpConfig(configPath, config);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// Multi-Config Sync
// ============================================================================

/**
 * Sync Heimdall configuration across all Claude config files
 */
export function syncHeimdallAcrossConfigs(
  heimdallConfig: HeimdallConfig = DEFAULT_HEIMDALL_CONFIG
): { synced: string[]; failed: { path: string; error: string }[] } {
  const locations = findAllConfigLocations();
  const synced: string[] = [];
  const failed: { path: string; error: string }[] = [];

  for (const location of locations) {
    if (location.exists || location.type === 'project') {
      const result = addHeimdallToConfig(location.path, heimdallConfig);
      if (result.success) {
        synced.push(location.path);
      } else {
        failed.push({ path: location.path, error: result.error || 'Unknown error' });
      }
    }
  }

  return { synced, failed };
}

/**
 * Get Heimdall configuration status across all configs
 */
export function getHeimdallConfigStatus(): {
  configured: ConfigLocation[];
  notConfigured: ConfigLocation[];
  missingConfigs: ConfigLocation[];
} {
  const locations = findAllConfigLocations();

  return {
    configured: locations.filter(l => l.exists && l.hasHeimdall),
    notConfigured: locations.filter(l => l.exists && !l.hasHeimdall),
    missingConfigs: locations.filter(l => !l.exists),
  };
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate Heimdall MCP configuration
 */
export function validateHeimdallMcpConfig(
  configPath: string
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const config = readMcpConfig(configPath);

  if (!config) {
    errors.push('Could not read configuration file');
    return { valid: false, errors, warnings };
  }

  if (!config.mcpServers) {
    errors.push('No mcpServers section found');
    return { valid: false, errors, warnings };
  }

  const heimdallKey = Object.keys(config.mcpServers).find(key =>
    key.includes('heimdall')
  );

  if (!heimdallKey) {
    errors.push('Heimdall server not found in configuration');
    return { valid: false, errors, warnings };
  }

  const heimdallEntry = config.mcpServers[heimdallKey];

  if (!heimdallEntry) {
    errors.push('Heimdall entry is empty');
    return { valid: false, errors, warnings };
  }

  // Check required fields
  if (!heimdallEntry.command) {
    errors.push('Missing command field');
  }

  if (!heimdallEntry.args || !Array.isArray(heimdallEntry.args)) {
    errors.push('Missing or invalid args field');
  }

  // Check env variables
  if (!heimdallEntry.env?.OPENAI_API_KEY) {
    warnings.push('OPENAI_API_KEY not configured (required for embeddings)');
  }

  if (!heimdallEntry.env?.QDRANT_URL) {
    warnings.push('QDRANT_URL not configured (using default)');
  }

  // Check if disabled
  if (heimdallEntry.disabled) {
    warnings.push('Heimdall is currently disabled');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
