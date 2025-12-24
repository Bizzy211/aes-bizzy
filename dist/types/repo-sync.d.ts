/**
 * Types for private repository sync functionality
 */
/**
 * Component types available for sync
 */
export type ComponentType = 'agents' | 'hooks' | 'skills' | 'scripts' | 'slash-commands';
/**
 * All available component types
 */
export declare const COMPONENT_TYPES: ComponentType[];
/**
 * Mapping of component types to directories
 */
export declare const COMPONENT_DIRS: Record<ComponentType, string>;
/**
 * A component file to be synced
 */
export interface ComponentFile {
    name: string;
    path: string;
    relativePath: string;
    type: ComponentType;
    size: number;
    modified: string;
}
/**
 * Conflict detected during sync
 */
export interface SyncConflict {
    file: ComponentFile;
    existingPath: string;
    existingModified: string;
    strategy?: ConflictStrategy;
}
/**
 * Strategy for resolving conflicts
 */
export type ConflictStrategy = 'overwrite' | 'skip' | 'merge' | 'backup';
/**
 * Options for repository sync
 */
export interface RepoSyncOptions {
    /** GitHub token for authentication */
    token: string;
    /** Component types to sync */
    components?: ComponentType[];
    /** Force overwrite without prompting */
    force?: boolean;
    /** Conflict resolution strategy */
    conflictStrategy?: ConflictStrategy;
    /** Dry run mode */
    dryRun?: boolean;
    /** Skip component selection prompt */
    selectAll?: boolean;
    /** Interactive mode - set to false for non-interactive (CI/automation) */
    interactive?: boolean;
    /** Path to manifest file for manifest-based installation */
    manifestPath?: string;
    /** Manifest tier for quick selection */
    manifestTier?: ManifestTier;
    /** Categories to filter from manifest */
    categories?: ComponentCategory[];
    /** Target path for sync (defaults to ~/.claude) */
    targetPath?: string;
}
/**
 * Result of a sync operation
 */
export interface SyncResult {
    success: boolean;
    synced: SyncedComponent[];
    skipped: string[];
    conflicts: SyncConflict[];
    errors: string[];
    commitSha?: string;
    timestamp: string;
}
/**
 * A successfully synced component
 */
export interface SyncedComponent {
    file: ComponentFile;
    targetPath: string;
    action: 'created' | 'updated' | 'skipped' | 'merged';
}
/**
 * Sync state stored in ecosystem.json
 */
export interface SyncState {
    lastSync: string;
    commitSha: string;
    repository: string;
    branch: string;
    syncedComponents: Record<ComponentType, string[]>;
    totalFiles: number;
}
/**
 * Repository metadata
 */
export interface RepoMetadata {
    owner: string;
    repo: string;
    branch: string;
    url: string;
    commitSha: string;
    lastCommit: string;
}
/**
 * Available components discovered in repository
 */
export interface AvailableComponents {
    agents: ComponentFile[];
    hooks: ComponentFile[];
    skills: ComponentFile[];
    scripts: ComponentFile[];
    'slash-commands': ComponentFile[];
    metadata: RepoMetadata;
}
/**
 * Pull result for updates
 */
export interface PullResult {
    success: boolean;
    updated: boolean;
    previousSha: string;
    currentSha: string;
    changedFiles: string[];
    error?: string;
}
/**
 * Default repository URL
 */
export declare const DEFAULT_REPO_URL = "https://github.com/bizzy211/claude-subagents";
/**
 * Default repository owner
 */
export declare const DEFAULT_REPO_OWNER = "bizzy211";
/**
 * Default repository name
 */
export declare const DEFAULT_REPO_NAME = "claude-subagents";
/**
 * Default branch
 */
export declare const DEFAULT_BRANCH = "main";
/**
 * Categories for manifest-based component organization
 */
export type ComponentCategory = 'core-agents' | 'specialized-agents' | 'meta-agents' | 'core-hooks' | 'integration-hooks' | 'core-skills' | 'advanced-skills' | 'utility-scripts' | 'workflow-scripts' | 'core-commands' | 'advanced-commands';
/**
 * A file entry in a manifest with category
 */
export interface ManifestFile {
    /** Relative path from repository root */
    path: string;
    /** Category for filtering */
    category: ComponentCategory;
    /** File description */
    description?: string;
    /** Whether this file is required (essential) */
    required?: boolean;
    /** Dependencies on other manifest files */
    dependencies?: string[];
}
/**
 * Manifest configuration for installation tiers
 */
export interface ManifestConfig {
    /** Manifest name (e.g., 'essential', 'recommended', 'full') */
    name: string;
    /** Manifest version */
    version: string;
    /** Human-readable description */
    description: string;
    /** Categories included in this manifest */
    categories: ComponentCategory[];
    /** Files to install */
    files: ManifestFile[];
    /** Manifest metadata */
    metadata?: {
        createdAt: string;
        updatedAt: string;
        author?: string;
    };
}
/**
 * Available manifests in the repository
 */
export interface AvailableManifests {
    essential: ManifestConfig | null;
    recommended: ManifestConfig | null;
    full: ManifestConfig | null;
    custom: ManifestConfig[];
}
/**
 * Manifest tier for quick selection
 */
export type ManifestTier = 'essential' | 'recommended' | 'full' | 'custom';
/**
 * Default manifest paths
 */
export declare const MANIFEST_PATHS: Record<ManifestTier, string>;
//# sourceMappingURL=repo-sync.d.ts.map