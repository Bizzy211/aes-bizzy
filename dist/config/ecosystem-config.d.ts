/**
 * Ecosystem.json configuration management
 * Provides CRUD operations, validation, and migration support
 */
import type { EcosystemConfig, EcosystemComponentType, InstalledComponent, McpServerEntry, EcosystemSettings, ConfigValidationResult, ConfigLoadResult, ConfigSaveResult, ComponentOperationResult, SemanticVersion } from '../types/ecosystem.js';
/**
 * Get Claude config directory path
 */
export declare function getClaudeConfigDir(): string;
/**
 * Get ecosystem.json file path
 */
export declare function getEcosystemConfigPath(): string;
/**
 * Create a default ecosystem configuration
 */
export declare function createDefaultConfig(): EcosystemConfig;
/**
 * Validate a configuration object
 */
export declare function validateConfig(config: unknown): ConfigValidationResult;
/**
 * Compare semantic versions
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
export declare function compareVersions(a: SemanticVersion, b: SemanticVersion): number;
/**
 * Check if config version is outdated
 */
export declare function isConfigOutdated(config: EcosystemConfig): boolean;
/**
 * Get current config version
 */
export declare function getConfigVersion(): SemanticVersion;
/**
 * Migrate config to current version
 */
export declare function migrateConfig(config: unknown): EcosystemConfig;
/**
 * Load ecosystem configuration
 */
export declare function loadConfig(): Promise<ConfigLoadResult>;
/**
 * Save ecosystem configuration
 */
export declare function saveConfig(config: EcosystemConfig): Promise<ConfigSaveResult>;
/**
 * Initialize ecosystem config if not exists
 */
export declare function initConfig(): Promise<ConfigLoadResult>;
/**
 * Get a component by name and type
 */
export declare function getComponent(name: string, type: EcosystemComponentType): Promise<InstalledComponent | null>;
/**
 * Get all components of a type
 */
export declare function getComponents(type: EcosystemComponentType): Promise<InstalledComponent[]>;
/**
 * Add or update a component
 */
export declare function updateComponent(component: InstalledComponent): Promise<ComponentOperationResult>;
/**
 * Remove a component
 */
export declare function removeComponent(name: string, type: EcosystemComponentType): Promise<ComponentOperationResult>;
/**
 * Update settings
 */
export declare function updateSettings(settings: Partial<EcosystemSettings>): Promise<ConfigSaveResult>;
/**
 * Add MCP server
 */
export declare function addMcpServer(server: McpServerEntry): Promise<ComponentOperationResult>;
/**
 * Remove MCP server
 */
export declare function removeMcpServer(name: string): Promise<ComponentOperationResult>;
/**
 * Get all MCP servers
 */
export declare function getMcpServers(): Promise<McpServerEntry[]>;
//# sourceMappingURL=ecosystem-config.d.ts.map