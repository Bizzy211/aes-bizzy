/**
 * Types for configuration backup and merge system
 */

/**
 * Backup manifest containing metadata about a backup
 */
export interface BackupManifest {
  id: string;
  timestamp: string;
  reason: string;
  files: BackupFileInfo[];
  totalSize: number;
  claudeVersion?: string;
}

/**
 * Information about a backed-up file
 */
export interface BackupFileInfo {
  path: string;
  relativePath: string;
  size: number;
  modified: string;
}

/**
 * Result of a backup operation
 */
export interface BackupResult {
  success: boolean;
  path: string;
  fileCount: number;
  totalSize: number;
  manifest: BackupManifest;
  error?: string;
}

/**
 * Result of a restore operation
 */
export interface RestoreResult {
  success: boolean;
  backupId: string;
  restoredFiles: number;
  error?: string;
}

/**
 * Result of a cleanup operation
 */
export interface CleanupResult {
  success: boolean;
  removedCount: number;
  removedBackups: string[];
  keptCount: number;
  freedSpace: number;
  error?: string;
}

/**
 * Configuration merge conflict
 */
export interface MergeConflict {
  key: string;
  existingValue: unknown;
  newValue: unknown;
  resolution: 'keep_existing' | 'use_new' | 'merged';
}

/**
 * Result of a config merge operation
 */
export interface MergeResult {
  success: boolean;
  merged: Record<string, unknown>;
  conflicts: MergeConflict[];
  addedKeys: string[];
  preservedKeys: string[];
  error?: string;
}

/**
 * Options for backup operations
 */
export interface BackupOptions {
  /** Include hidden files */
  includeHidden?: boolean;
  /** Maximum backup age in days */
  maxAgeDays?: number;
  /** Minimum backups to keep */
  minKeepCount?: number;
  /** Dry run mode - don't actually create backup */
  dryRun?: boolean;
}

/**
 * Options for merge operations
 */
export interface MergeOptions {
  /** Prefer existing values on conflict */
  preferExisting?: boolean;
  /** Deep merge nested objects */
  deepMerge?: boolean;
  /** Log conflicts */
  logConflicts?: boolean;
  /** Dry run mode - don't actually merge */
  dryRun?: boolean;
}

/**
 * Available backup information
 */
export interface AvailableBackup {
  id: string;
  path: string;
  manifest: BackupManifest;
  age: number; // in days
}
