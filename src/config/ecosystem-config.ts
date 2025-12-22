/**
 * Ecosystem.json configuration management
 * Provides CRUD operations, validation, and migration support
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { existsSync, writeFileSync, renameSync, unlinkSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { logger } from '../utils/logger.js';
import type {
  EcosystemConfig,
  EcosystemComponentType,
  InstalledComponent,
  McpServerEntry,
  EcosystemSettings,
  ConfigValidationResult,
  ConfigValidationError,
  ConfigLoadResult,
  ConfigSaveResult,
  ComponentOperationResult,
  MigrationEntry,
  SemanticVersion,
} from '../types/ecosystem.js';
import { CURRENT_CONFIG_VERSION } from '../types/ecosystem.js';

/**
 * Get Claude config directory path
 */
export function getClaudeConfigDir(): string {
  return path.join(homedir(), '.claude');
}

/**
 * Get ecosystem.json file path
 */
export function getEcosystemConfigPath(): string {
  return path.join(getClaudeConfigDir(), 'ecosystem.json');
}

/**
 * Create a default ecosystem configuration
 */
export function createDefaultConfig(): EcosystemConfig {
  const now = new Date().toISOString();
  return {
    version: CURRENT_CONFIG_VERSION,
    installedAt: now,
    lastUpdated: now,
    components: {},
    mcpServers: [],
    settings: {
      autoSync: false,
      syncInterval: 3600,
      defaultConflictStrategy: 'backup',
      backupEnabled: true,
      maxBackups: 10,
    },
  };
}

/**
 * Validate a configuration object
 */
export function validateConfig(config: unknown): ConfigValidationResult {
  const errors: ConfigValidationError[] = [];
  const warnings: string[] = [];

  if (!config || typeof config !== 'object') {
    return {
      valid: false,
      errors: [{ path: '', message: 'Config must be an object', received: typeof config }],
    };
  }

  const c = config as Record<string, unknown>;

  // Check version
  if (!c.version || typeof c.version !== 'string') {
    errors.push({
      path: 'version',
      message: 'Version is required and must be a string',
      expected: 'semver string (e.g., "1.0.0")',
      received: c.version,
    });
  } else if (!/^\d+\.\d+\.\d+$/.test(c.version)) {
    errors.push({
      path: 'version',
      message: 'Version must be a valid semver string',
      expected: 'e.g., "1.0.0"',
      received: c.version,
    });
  }

  // Check installedAt
  if (!c.installedAt || typeof c.installedAt !== 'string') {
    errors.push({
      path: 'installedAt',
      message: 'installedAt is required and must be an ISO date string',
      received: c.installedAt,
    });
  }

  // Check lastUpdated
  if (!c.lastUpdated || typeof c.lastUpdated !== 'string') {
    errors.push({
      path: 'lastUpdated',
      message: 'lastUpdated is required and must be an ISO date string',
      received: c.lastUpdated,
    });
  }

  // Check components
  if (c.components !== undefined && typeof c.components !== 'object') {
    errors.push({
      path: 'components',
      message: 'components must be an object if provided',
      received: typeof c.components,
    });
  }

  // Check settings
  if (c.settings !== undefined && typeof c.settings !== 'object') {
    errors.push({
      path: 'settings',
      message: 'settings must be an object if provided',
      received: typeof c.settings,
    });
  }

  // Check mcpServers
  if (c.mcpServers !== undefined && !Array.isArray(c.mcpServers)) {
    errors.push({
      path: 'mcpServers',
      message: 'mcpServers must be an array if provided',
      received: typeof c.mcpServers,
    });
  }

  // Add warnings for missing optional fields
  if (!c.components || Object.keys(c.components as object).length === 0) {
    warnings.push('No components installed');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Compare semantic versions
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
export function compareVersions(a: SemanticVersion, b: SemanticVersion): number {
  const [aMajor, aMinor, aPatch] = a.split('.').map(Number);
  const [bMajor, bMinor, bPatch] = b.split('.').map(Number);

  if (aMajor !== bMajor) return aMajor! < bMajor! ? -1 : 1;
  if (aMinor !== bMinor) return aMinor! < bMinor! ? -1 : 1;
  if (aPatch !== bPatch) return aPatch! < bPatch! ? -1 : 1;
  return 0;
}

/**
 * Check if config version is outdated
 */
export function isConfigOutdated(config: EcosystemConfig): boolean {
  return compareVersions(config.version, CURRENT_CONFIG_VERSION) < 0;
}

/**
 * Get current config version
 */
export function getConfigVersion(): SemanticVersion {
  return CURRENT_CONFIG_VERSION;
}

/**
 * Migration registry
 */
const migrations: MigrationEntry[] = [
  // Future migrations will be added here
  // Example:
  // {
  //   fromVersion: '1.0.0',
  //   toVersion: '1.1.0',
  //   description: 'Add new settings field',
  //   migrate: (config) => {
  //     const c = config as EcosystemConfig;
  //     return { ...c, version: '1.1.0', newField: 'default' };
  //   },
  // },
];

/**
 * Migrate config to current version
 */
export function migrateConfig(config: unknown): EcosystemConfig {
  let current = config as EcosystemConfig;

  // Apply migrations in order
  while (compareVersions(current.version, CURRENT_CONFIG_VERSION) < 0) {
    const migration = migrations.find((m) => m.fromVersion === current.version);

    if (!migration) {
      logger.warn(`No migration path from version ${current.version}`);
      // Force update to current version if no migration path
      current = { ...current, version: CURRENT_CONFIG_VERSION };
      break;
    }

    logger.info(`Migrating config from ${migration.fromVersion} to ${migration.toVersion}`);
    current = migration.migrate(current);
  }

  return current;
}

/**
 * Write config atomically using temp file and rename
 */
async function atomicWriteConfig(
  configPath: string,
  config: EcosystemConfig
): Promise<void> {
  const tempPath = path.join(tmpdir(), `ecosystem-${Date.now()}.json.tmp`);

  try {
    // Write to temp file
    writeFileSync(tempPath, JSON.stringify(config, null, 2), 'utf-8');

    // Rename to target (atomic on most filesystems)
    renameSync(tempPath, configPath);
  } catch (error) {
    // Clean up temp file if rename failed
    try {
      if (existsSync(tempPath)) {
        unlinkSync(tempPath);
      }
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Load ecosystem configuration
 */
export async function loadConfig(): Promise<ConfigLoadResult> {
  const configPath = getEcosystemConfigPath();

  try {
    if (!existsSync(configPath)) {
      return {
        success: false,
        config: null,
        error: 'Config file does not exist',
      };
    }

    const content = await fs.readFile(configPath, 'utf-8');
    const parsed = JSON.parse(content);

    // Validate
    const validation = validateConfig(parsed);
    if (!validation.valid) {
      return {
        success: false,
        config: null,
        error: `Invalid config: ${validation.errors.map((e) => e.message).join(', ')}`,
      };
    }

    let config = parsed as EcosystemConfig;
    let migrated = false;
    const previousVersion = config.version;

    // Migrate if needed
    if (isConfigOutdated(config)) {
      config = migrateConfig(config);
      migrated = true;

      // Save migrated config
      await saveConfig(config);
    }

    return {
      success: true,
      config,
      migrated,
      previousVersion: migrated ? previousVersion : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      config: null,
      error: message,
    };
  }
}

/**
 * Save ecosystem configuration
 */
export async function saveConfig(config: EcosystemConfig): Promise<ConfigSaveResult> {
  const configPath = getEcosystemConfigPath();
  const configDir = getClaudeConfigDir();

  try {
    // Validate before saving
    const validation = validateConfig(config);
    if (!validation.valid) {
      return {
        success: false,
        path: configPath,
        error: `Invalid config: ${validation.errors.map((e) => e.message).join(', ')}`,
      };
    }

    // Update lastUpdated timestamp
    config.lastUpdated = new Date().toISOString();

    // Ensure directory exists
    await fs.mkdir(configDir, { recursive: true });

    // Atomic write
    await atomicWriteConfig(configPath, config);

    return {
      success: true,
      path: configPath,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      path: configPath,
      error: message,
    };
  }
}

/**
 * Initialize ecosystem config if not exists
 */
export async function initConfig(): Promise<ConfigLoadResult> {
  const configPath = getEcosystemConfigPath();

  if (existsSync(configPath)) {
    return loadConfig();
  }

  const config = createDefaultConfig();
  const saveResult = await saveConfig(config);

  if (!saveResult.success) {
    return {
      success: false,
      config: null,
      error: saveResult.error,
    };
  }

  return {
    success: true,
    config,
  };
}

/**
 * Get a component by name and type
 */
export async function getComponent(
  name: string,
  type: EcosystemComponentType
): Promise<InstalledComponent | null> {
  const result = await loadConfig();

  if (!result.success || !result.config) {
    return null;
  }

  const components = result.config.components[type] || [];
  return components.find((c) => c.name === name) || null;
}

/**
 * Get all components of a type
 */
export async function getComponents(
  type: EcosystemComponentType
): Promise<InstalledComponent[]> {
  const result = await loadConfig();

  if (!result.success || !result.config) {
    return [];
  }

  return result.config.components[type] || [];
}

/**
 * Add or update a component
 */
export async function updateComponent(
  component: InstalledComponent
): Promise<ComponentOperationResult> {
  const result = await loadConfig();

  if (!result.success || !result.config) {
    return {
      success: false,
      error: result.error || 'Failed to load config',
    };
  }

  const config = result.config;
  const type = component.type;

  // Initialize array if needed
  if (!config.components[type]) {
    config.components[type] = [];
  }

  // Find existing component
  const components = config.components[type]!;
  const existingIndex = components.findIndex((c) => c.name === component.name);

  if (existingIndex >= 0) {
    // Update existing
    component.updatedAt = new Date().toISOString();
    components[existingIndex] = component;
  } else {
    // Add new
    component.installedAt = component.installedAt || new Date().toISOString();
    components.push(component);
  }

  const saveResult = await saveConfig(config);

  if (!saveResult.success) {
    return {
      success: false,
      error: saveResult.error,
    };
  }

  return {
    success: true,
    component,
  };
}

/**
 * Remove a component
 */
export async function removeComponent(
  name: string,
  type: EcosystemComponentType
): Promise<ComponentOperationResult> {
  const result = await loadConfig();

  if (!result.success || !result.config) {
    return {
      success: false,
      error: result.error || 'Failed to load config',
    };
  }

  const config = result.config;
  const components = config.components[type] || [];
  const componentIndex = components.findIndex((c) => c.name === name);

  if (componentIndex < 0) {
    return {
      success: false,
      error: `Component ${name} not found`,
    };
  }

  const removed = components.splice(componentIndex, 1)[0];
  config.components[type] = components;

  const saveResult = await saveConfig(config);

  if (!saveResult.success) {
    return {
      success: false,
      error: saveResult.error,
    };
  }

  return {
    success: true,
    component: removed,
  };
}

/**
 * Update settings
 */
export async function updateSettings(
  settings: Partial<EcosystemSettings>
): Promise<ConfigSaveResult> {
  const result = await loadConfig();

  if (!result.success || !result.config) {
    return {
      success: false,
      path: getEcosystemConfigPath(),
      error: result.error || 'Failed to load config',
    };
  }

  result.config.settings = {
    ...result.config.settings,
    ...settings,
  };

  return saveConfig(result.config);
}

/**
 * Add MCP server
 */
export async function addMcpServer(
  server: McpServerEntry
): Promise<ComponentOperationResult> {
  const result = await loadConfig();

  if (!result.success || !result.config) {
    return {
      success: false,
      error: result.error || 'Failed to load config',
    };
  }

  const config = result.config;

  if (!config.mcpServers) {
    config.mcpServers = [];
  }

  const existingIndex = config.mcpServers.findIndex((s) => s.name === server.name);

  if (existingIndex >= 0) {
    config.mcpServers[existingIndex] = server;
  } else {
    config.mcpServers.push(server);
  }

  const saveResult = await saveConfig(config);

  if (!saveResult.success) {
    return {
      success: false,
      error: saveResult.error,
    };
  }

  return {
    success: true,
  };
}

/**
 * Remove MCP server
 */
export async function removeMcpServer(name: string): Promise<ComponentOperationResult> {
  const result = await loadConfig();

  if (!result.success || !result.config) {
    return {
      success: false,
      error: result.error || 'Failed to load config',
    };
  }

  const config = result.config;
  const servers = config.mcpServers || [];
  const serverIndex = servers.findIndex((s) => s.name === name);

  if (serverIndex < 0) {
    return {
      success: false,
      error: `MCP server ${name} not found`,
    };
  }

  servers.splice(serverIndex, 1);
  config.mcpServers = servers;

  const saveResult = await saveConfig(config);

  if (!saveResult.success) {
    return {
      success: false,
      error: saveResult.error,
    };
  }

  return {
    success: true,
  };
}

/**
 * Get all MCP servers
 */
export async function getMcpServers(): Promise<McpServerEntry[]> {
  const result = await loadConfig();

  if (!result.success || !result.config) {
    return [];
  }

  return result.config.mcpServers || [];
}
