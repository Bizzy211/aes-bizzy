/**
 * Types for ecosystem.json configuration management
 */

/**
 * Semantic version string
 */
export type SemanticVersion = `${number}.${number}.${number}`;

/**
 * Component type in the ecosystem
 */
export type EcosystemComponentType = 'agents' | 'hooks' | 'skills' | 'scripts' | 'slash-commands' | 'mcp-servers';

/**
 * Current config version
 */
export const CURRENT_CONFIG_VERSION: SemanticVersion = '1.0.0';

/**
 * Installed component information
 */
export interface InstalledComponent {
  name: string;
  type: EcosystemComponentType;
  version?: string;
  installedAt: string;
  updatedAt?: string;
  source?: 'local' | 'repository' | 'manual';
  path?: string;
  enabled?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * MCP server configuration
 */
export interface McpServerEntry {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  installedAt: string;
  enabled: boolean;
}

/**
 * Repository sync state
 */
export interface EcosystemSyncState {
  lastSync: string;
  commitSha: string;
  repository: string;
  branch: string;
  syncedComponents: Record<EcosystemComponentType, string[]>;
  totalFiles: number;
}

/**
 * User settings in ecosystem config
 */
export interface EcosystemSettings {
  autoSync?: boolean;
  syncInterval?: number;
  defaultConflictStrategy?: 'backup' | 'overwrite' | 'skip' | 'merge';
  backupEnabled?: boolean;
  maxBackups?: number;
  theme?: 'light' | 'dark' | 'auto';
}

/**
 * Full ecosystem configuration schema
 */
export interface EcosystemConfig {
  /** Schema version for migrations */
  version: SemanticVersion;
  /** When the config was created */
  installedAt: string;
  /** When the config was last modified */
  lastUpdated: string;
  /** Installed components by type */
  components: Partial<Record<EcosystemComponentType, InstalledComponent[]>>;
  /** MCP servers configuration */
  mcpServers?: McpServerEntry[];
  /** Sync state from repository */
  sync?: EcosystemSyncState;
  /** User preferences */
  settings?: EcosystemSettings;
  /** Extension data from plugins */
  extensions?: Record<string, unknown>;
}

/**
 * Validation error details
 */
export interface ConfigValidationError {
  path: string;
  message: string;
  expected?: string;
  received?: unknown;
}

/**
 * Validation result
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigValidationError[];
  warnings?: string[];
}

/**
 * Migration function type
 */
export type ConfigMigration = (config: unknown) => EcosystemConfig;

/**
 * Migration registry entry
 */
export interface MigrationEntry {
  fromVersion: SemanticVersion;
  toVersion: SemanticVersion;
  migrate: ConfigMigration;
  description: string;
}

/**
 * Load result
 */
export interface ConfigLoadResult {
  success: boolean;
  config: EcosystemConfig | null;
  migrated?: boolean;
  previousVersion?: SemanticVersion;
  error?: string;
}

/**
 * Save result
 */
export interface ConfigSaveResult {
  success: boolean;
  path: string;
  error?: string;
}

/**
 * Component operation result
 */
export interface ComponentOperationResult {
  success: boolean;
  component?: InstalledComponent;
  error?: string;
}
