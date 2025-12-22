/**
 * Types for update command functionality
 */

import type { ComponentType, ManifestTier, ComponentCategory } from './repo-sync.js';

/**
 * Update options from CLI
 */
export interface UpdateOptions {
  /** Only update specific component type */
  component?: ComponentType;
  /** Show what would be updated without making changes */
  dryRun?: boolean;
  /** Force update even if no changes detected */
  force?: boolean;
  /** Update all components */
  all?: boolean;
  /** Show verbose output */
  verbose?: boolean;
  /** Path to manifest file for component selection */
  manifestPath?: string;
  /** Manifest tier for quick selection */
  manifestTier?: ManifestTier;
  /** Categories to filter from manifest */
  categories?: ComponentCategory[];
}

/**
 * Single component update info
 */
export interface ComponentUpdate {
  /** Component type */
  type: ComponentType;
  /** Component name */
  name: string;
  /** Path to component file */
  path: string;
  /** Current version/commit SHA */
  currentVersion?: string;
  /** New version/commit SHA */
  newVersion?: string;
  /** Update action taken */
  action: 'created' | 'updated' | 'unchanged' | 'skipped';
  /** Size difference in bytes */
  sizeDelta?: number;
}

/**
 * Changed file from git diff
 */
export interface ChangedFile {
  /** File path relative to repo root */
  path: string;
  /** Change type */
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  /** Component type if applicable */
  componentType?: ComponentType;
}

/**
 * Changelog entry
 */
export interface ChangelogEntry {
  /** Commit SHA */
  sha: string;
  /** Commit message */
  message: string;
  /** Commit author */
  author: string;
  /** Commit date */
  date: string;
  /** Files changed in this commit */
  files: string[];
}

/**
 * Update result
 */
export interface UpdateResult {
  /** Whether update was successful */
  success: boolean;
  /** Components that were updated */
  updated: ComponentUpdate[];
  /** Components that were skipped */
  skipped: ComponentUpdate[];
  /** Errors encountered */
  errors: string[];
  /** Previous commit SHA */
  previousSha?: string;
  /** Current commit SHA */
  currentSha?: string;
  /** Changelog of commits since last update */
  changelog: ChangelogEntry[];
  /** Whether any changes were available */
  changesAvailable: boolean;
  /** Summary statistics */
  stats: UpdateStats;
  /** Timestamp of update */
  timestamp: string;
}

/**
 * Update statistics
 */
export interface UpdateStats {
  /** Total components checked */
  total: number;
  /** Components created */
  created: number;
  /** Components updated */
  updated: number;
  /** Components unchanged */
  unchanged: number;
  /** Components skipped */
  skipped: number;
  /** Errors encountered */
  errors: number;
}
