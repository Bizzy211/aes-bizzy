/**
 * Detection Types
 *
 * Type definitions for existing project detection and migration support.
 */

/**
 * Component count information
 */
export interface ComponentInfo {
  exists: boolean;
  count: number;
}

/**
 * MCP Servers detection info
 */
export interface MCPServersInfo {
  exists: boolean;
  servers: string[];
}

/**
 * Ecosystem detection info
 */
export interface EcosystemInfo {
  exists: boolean;
  version?: string;
}

/**
 * Beads detection info
 */
export interface BeadsInfo {
  installed: boolean;
  version?: string;
}

/**
 * Task Master detection info
 */
export interface TaskMasterInfo {
  configured: boolean;
  model?: string;
}

/**
 * Complete detection result for existing installations
 */
export interface DetectionResult {
  hasClaudeDir: boolean;
  claudeDirPath: string;
  agents: ComponentInfo;
  hooks: ComponentInfo;
  skills: ComponentInfo;
  mcpServers: MCPServersInfo;
  ecosystem: EcosystemInfo;
  beads: BeadsInfo;
  taskMaster: TaskMasterInfo;
  settingsJson: {
    exists: boolean;
    path?: string;
  };
}

/**
 * Setting conflict information
 */
export interface SettingConflict {
  key: string;
  existing: unknown;
  new: unknown;
}

/**
 * Configuration analysis result
 */
export interface ConfigAnalysis {
  existingMCPServers: string[];
  missingMCPServers: string[];
  conflictingSettings: SettingConflict[];
  tokenPresent: boolean;
  allowedTools: {
    existing: string[];
    missing: string[];
    custom: string[];
  };
}

/**
 * Conflict type enumeration
 */
export type ConflictType = 'agent' | 'hook' | 'skill' | 'mcp' | 'setting';

/**
 * Conflict resolution strategy
 */
export type ConflictResolution = 'merge' | 'skip' | 'replace' | 'backup';

/**
 * Individual conflict information
 */
export interface Conflict {
  type: ConflictType;
  name: string;
  path?: string;
  existingValue: unknown;
  newValue: unknown;
  existingHash?: string;
  newHash?: string;
  isModified: boolean;
  suggestedResolution: ConflictResolution;
  resolution?: ConflictResolution;
}

/**
 * Resolution action details
 */
export interface ResolutionAction {
  conflict: Conflict;
  action: string;
  timestamp: Date;
  result: 'success' | 'failed' | 'skipped';
  details?: string;
}

/**
 * Conflict resolution log
 */
export interface ConflictResolutionLog {
  timestamp: Date;
  conflicts: Conflict[];
  resolutions: ResolutionAction[];
}

/**
 * Merge strategy options
 */
export type MergeStrategy = 'preserve-existing' | 'prefer-new' | 'interactive';

/**
 * Migration type
 */
export type MigrationType = 'full' | 'partial' | 'selective';

/**
 * Pre-migration backup manifest
 */
export interface MigrationBackupManifest {
  id: string;
  migrationType: MigrationType;
  reason: string;
  timestamp: string;
  sourcePath: string;
  detectedComponents: DetectionResult;
  conflicts: Conflict[];
  files: string[];
}

/**
 * Migration result
 */
export interface MigrationResult {
  success: boolean;
  migrationType: MigrationType;
  componentsUpdated: string[];
  conflictsResolved: number;
  filesBackedUp: number;
  backupPath?: string;
  errors: string[];
  warnings: string[];
  timestamp: string;
}

/**
 * Legacy setup detection result
 */
export interface LegacySetupResult {
  isLegacy: boolean;
  legacyVersion?: string;
  migrationPath: string;
  oldStructure: {
    customAgentsDir?: boolean;
    oldHooksFormat?: boolean;
    noEcosystemJson: boolean;
  };
  suggestedSteps: string[];
}

/**
 * Agent detection details
 */
export interface AgentInfo {
  name: string;
  path: string;
  hash: string;
  lastModified: Date;
  size: number;
}

/**
 * Agents detection result
 */
export interface AgentsDetectionResult {
  installed: AgentInfo[];
  modified: AgentInfo[];
  unknown: AgentInfo[];
}

/**
 * Hook detection details
 */
export interface HookInfo {
  name: string;
  path: string;
  type: 'python' | 'bash' | 'powershell' | 'batch';
  hash: string;
  lastModified: Date;
  size: number;
}

/**
 * Hooks detection result
 */
export interface HooksDetectionResult {
  active: HookInfo[];
  inactive: HookInfo[];
  custom: HookInfo[];
}

/**
 * Skill detection details
 */
export interface SkillInfo {
  name: string;
  path: string;
  hash: string;
  lastModified: Date;
  size: number;
}

/**
 * Skills detection result
 */
export interface SkillsDetectionResult {
  installed: SkillInfo[];
  modified: SkillInfo[];
  unknown: SkillInfo[];
}

/**
 * MCP Server info from 'claude mcp list'
 */
export interface MCPServerInfo {
  name: string;
  status: 'active' | 'inactive' | 'error';
  command?: string;
  args?: string[];
  inEcosystem: boolean;
  isOrphaned: boolean;
}

/**
 * MCP Servers detection result
 */
export interface MCPServersDetectionResult {
  configured: MCPServerInfo[];
  orphaned: MCPServerInfo[];
  missing: string[];
}

/**
 * Validation check result
 */
export interface ValidationCheck {
  name: string;
  category: 'component' | 'config' | 'integration' | 'file';
  status: 'passed' | 'warning' | 'failed';
  message: string;
  details?: string;
  remediation?: string;
}

/**
 * Migration validation result
 */
export interface MigrationValidationResult {
  passed: ValidationCheck[];
  warnings: ValidationCheck[];
  errors: ValidationCheck[];
  overallStatus: 'success' | 'success-with-warnings' | 'failed';
  timestamp: string;
}

/**
 * Migration history entry for ecosystem.json
 */
export interface MigrationHistoryEntry {
  date: string;
  fromVersion?: string;
  toVersion: string;
  components: string[];
  conflictsCount: number;
  resolutions: ResolutionAction[];
}

/**
 * Init command CLI flags
 */
export interface InitFlags {
  dryRun?: boolean;
  force?: boolean;
  backupOnly?: boolean;
  skipBackup?: boolean;
  mergeStrategy?: MergeStrategy;
  components?: string[];
}

/**
 * Migration plan for dry-run output
 */
export interface MigrationPlan {
  mode: 'fresh' | 'update' | 'selective';
  currentState: DetectionResult;
  componentsToUpdate: string[];
  filesToAdd: string[];
  filesToUpdate: string[];
  filesToRemove: string[];
  conflicts: Conflict[];
  proposedResolutions: Map<string, ConflictResolution>;
  backupRequired: boolean;
  estimatedChanges: {
    added: number;
    updated: number;
    removed: number;
    conflictsToResolve: number;
  };
}

/**
 * User settings to preserve during migration
 */
export interface PreservedSettings {
  claudeDir?: string;
  editor?: string;
  customPaths?: Record<string, string>;
  apiTokens?: Record<string, boolean>; // Only track presence, not values
  workspaceSettings?: Record<string, unknown>;
  allowedTools?: string[];
  mcpServers?: Record<string, unknown>;
}
