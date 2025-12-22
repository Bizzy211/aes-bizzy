/**
 * Configuration backup and merge system
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { existsSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { logger } from '../utils/logger.js';
import type {
  BackupManifest,
  BackupFileInfo,
  BackupResult,
  RestoreResult,
  CleanupResult,
  MergeConflict,
  MergeResult,
  BackupOptions,
  MergeOptions,
  AvailableBackup,
} from '../types/backup.js';

/**
 * Default backup options
 */
const DEFAULT_BACKUP_OPTIONS: Required<BackupOptions> = {
  includeHidden: true,
  maxAgeDays: 30,
  minKeepCount: 3,
  dryRun: false,
};

/**
 * Default merge options
 */
const DEFAULT_MERGE_OPTIONS: Required<MergeOptions> = {
  preferExisting: true,
  deepMerge: true,
  logConflicts: true,
  dryRun: false,
};

/**
 * Get the Claude config directory path
 */
export function getClaudeConfigDir(): string {
  return path.join(homedir(), '.claude');
}

/**
 * Get the backup directory path
 */
export function getBackupDir(): string {
  return path.join(homedir(), '.claude-backups');
}

/**
 * Generate a backup ID from timestamp
 */
export function generateBackupId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `backup-${year}${month}${day}-${hours}${minutes}${seconds}`;
}

/**
 * Recursively get all files in a directory
 */
async function getAllFiles(
  dirPath: string,
  basePath: string = dirPath,
  includeHidden: boolean = true
): Promise<BackupFileInfo[]> {
  const files: BackupFileInfo[] = [];

  if (!existsSync(dirPath)) {
    return files;
  }

  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    // Skip hidden files if not included
    if (!includeHidden && entry.name.startsWith('.')) {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      const subFiles = await getAllFiles(fullPath, basePath, includeHidden);
      files.push(...subFiles);
    } else if (entry.isFile()) {
      const stats = statSync(fullPath);
      files.push({
        path: fullPath,
        relativePath: path.relative(basePath, fullPath),
        size: stats.size,
        modified: stats.mtime.toISOString(),
      });
    }
  }

  return files;
}

/**
 * Copy a file preserving directory structure
 */
async function copyFile(
  sourcePath: string,
  destDir: string,
  relativePath: string
): Promise<void> {
  const destPath = path.join(destDir, relativePath);
  const destDirPath = path.dirname(destPath);

  // Create destination directory if needed
  await fs.mkdir(destDirPath, { recursive: true });

  // Copy file
  await fs.copyFile(sourcePath, destPath);
}

/**
 * Create a backup of the Claude config directory
 */
export async function createBackup(
  reason: string,
  options: BackupOptions = {}
): Promise<BackupResult> {
  const opts = { ...DEFAULT_BACKUP_OPTIONS, ...options };
  const claudeDir = getClaudeConfigDir();
  const backupBaseDir = getBackupDir();

  // Check if Claude config exists
  if (!existsSync(claudeDir)) {
    return {
      success: false,
      path: '',
      fileCount: 0,
      totalSize: 0,
      manifest: {
        id: '',
        timestamp: new Date().toISOString(),
        reason,
        files: [],
        totalSize: 0,
      },
      error: 'Claude config directory does not exist',
    };
  }

  // Get all files to backup
  const files = await getAllFiles(claudeDir, claudeDir, opts.includeHidden);

  if (files.length === 0) {
    return {
      success: false,
      path: '',
      fileCount: 0,
      totalSize: 0,
      manifest: {
        id: '',
        timestamp: new Date().toISOString(),
        reason,
        files: [],
        totalSize: 0,
      },
      error: 'No files found to backup',
    };
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const backupId = generateBackupId();
  const backupPath = path.join(backupBaseDir, backupId);

  const manifest: BackupManifest = {
    id: backupId,
    timestamp: new Date().toISOString(),
    reason,
    files,
    totalSize,
  };

  if (opts.dryRun) {
    logger.info(`[Dry Run] Would create backup at: ${backupPath}`);
    logger.info(`[Dry Run] Would backup ${files.length} files (${formatSize(totalSize)})`);
    return {
      success: true,
      path: backupPath,
      fileCount: files.length,
      totalSize,
      manifest,
    };
  }

  try {
    // Create backup directory
    await fs.mkdir(backupPath, { recursive: true });

    // Copy all files
    for (const file of files) {
      await copyFile(file.path, backupPath, file.relativePath);
    }

    // Write manifest
    const manifestPath = path.join(backupPath, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

    logger.success(`Backup created: ${backupId} (${files.length} files, ${formatSize(totalSize)})`);

    return {
      success: true,
      path: backupPath,
      fileCount: files.length,
      totalSize,
      manifest,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to create backup: ${message}`);

    // Clean up partial backup
    try {
      await fs.rm(backupPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    return {
      success: false,
      path: backupPath,
      fileCount: 0,
      totalSize: 0,
      manifest,
      error: message,
    };
  }
}

/**
 * Get list of available backups
 */
export async function listBackups(): Promise<AvailableBackup[]> {
  const backupDir = getBackupDir();

  if (!existsSync(backupDir)) {
    return [];
  }

  const entries = await fs.readdir(backupDir, { withFileTypes: true });
  const backups: AvailableBackup[] = [];
  const now = Date.now();

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith('backup-')) {
      continue;
    }

    const backupPath = path.join(backupDir, entry.name);
    const manifestPath = path.join(backupPath, 'manifest.json');

    if (!existsSync(manifestPath)) {
      continue;
    }

    try {
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest: BackupManifest = JSON.parse(manifestContent);
      const backupTime = new Date(manifest.timestamp).getTime();
      const ageMs = now - backupTime;
      const ageDays = ageMs / (1000 * 60 * 60 * 24);

      backups.push({
        id: manifest.id,
        path: backupPath,
        manifest,
        age: Math.floor(ageDays),
      });
    } catch {
      // Skip invalid backups
    }
  }

  // Sort by timestamp, newest first
  backups.sort((a, b) => {
    const timeA = new Date(a.manifest.timestamp).getTime();
    const timeB = new Date(b.manifest.timestamp).getTime();
    return timeB - timeA;
  });

  return backups;
}

/**
 * Restore a backup
 */
export async function restoreBackup(
  backupId: string,
  options: BackupOptions = {}
): Promise<RestoreResult> {
  const opts = { ...DEFAULT_BACKUP_OPTIONS, ...options };
  const backups = await listBackups();
  const backup = backups.find((b) => b.id === backupId);

  if (!backup) {
    return {
      success: false,
      backupId,
      restoredFiles: 0,
      error: `Backup not found: ${backupId}`,
    };
  }

  const claudeDir = getClaudeConfigDir();

  if (opts.dryRun) {
    logger.info(`[Dry Run] Would restore backup ${backupId} to ${claudeDir}`);
    logger.info(`[Dry Run] Would restore ${backup.manifest.files.length} files`);
    return {
      success: true,
      backupId,
      restoredFiles: backup.manifest.files.length,
    };
  }

  try {
    // Create a backup of current state before restore
    const preRestoreBackup = await createBackup('pre-restore-backup');
    if (!preRestoreBackup.success) {
      logger.warn('Could not create pre-restore backup');
    }

    // Remove current Claude directory
    if (existsSync(claudeDir)) {
      await fs.rm(claudeDir, { recursive: true, force: true });
    }

    // Create Claude directory
    await fs.mkdir(claudeDir, { recursive: true });

    // Copy all files from backup (excluding manifest)
    let restoredCount = 0;
    for (const file of backup.manifest.files) {
      const sourcePath = path.join(backup.path, file.relativePath);
      if (existsSync(sourcePath)) {
        await copyFile(sourcePath, claudeDir, file.relativePath);
        restoredCount++;
      }
    }

    logger.success(`Restored backup ${backupId} (${restoredCount} files)`);

    return {
      success: true,
      backupId,
      restoredFiles: restoredCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to restore backup: ${message}`);

    return {
      success: false,
      backupId,
      restoredFiles: 0,
      error: message,
    };
  }
}

/**
 * Clean old backups
 */
export async function cleanOldBackups(
  options: BackupOptions = {}
): Promise<CleanupResult> {
  const opts = { ...DEFAULT_BACKUP_OPTIONS, ...options };
  const backups = await listBackups();

  if (backups.length === 0) {
    return {
      success: true,
      removedCount: 0,
      removedBackups: [],
      keptCount: 0,
      freedSpace: 0,
    };
  }

  // Determine which backups to remove
  const toRemove: AvailableBackup[] = [];
  const toKeep: AvailableBackup[] = [];

  for (const backup of backups) {
    // Always keep minimum count of newest backups
    if (toKeep.length < opts.minKeepCount) {
      toKeep.push(backup);
    } else if (backup.age > opts.maxAgeDays) {
      toRemove.push(backup);
    } else {
      toKeep.push(backup);
    }
  }

  if (toRemove.length === 0) {
    return {
      success: true,
      removedCount: 0,
      removedBackups: [],
      keptCount: toKeep.length,
      freedSpace: 0,
    };
  }

  let freedSpace = 0;

  if (opts.dryRun) {
    for (const backup of toRemove) {
      logger.info(`[Dry Run] Would remove backup: ${backup.id} (${backup.age} days old)`);
      freedSpace += backup.manifest.totalSize;
    }

    return {
      success: true,
      removedCount: toRemove.length,
      removedBackups: toRemove.map((b) => b.id),
      keptCount: toKeep.length,
      freedSpace,
    };
  }

  const removedBackups: string[] = [];

  for (const backup of toRemove) {
    try {
      await fs.rm(backup.path, { recursive: true, force: true });
      removedBackups.push(backup.id);
      freedSpace += backup.manifest.totalSize;
      logger.info(`Removed old backup: ${backup.id}`);
    } catch (error) {
      logger.warn(`Failed to remove backup ${backup.id}: ${error}`);
    }
  }

  logger.success(
    `Cleaned up ${removedBackups.length} old backups, freed ${formatSize(freedSpace)}`
  );

  return {
    success: true,
    removedCount: removedBackups.length,
    removedBackups,
    keptCount: toKeep.length,
    freedSpace,
  };
}

/**
 * Deep merge two objects
 */
function deepMergeObjects(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
  preferExisting: boolean,
  conflicts: MergeConflict[],
  path: string = ''
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...existing };

  for (const key of Object.keys(incoming)) {
    const fullKey = path ? `${path}.${key}` : key;
    const existingVal = existing[key];
    const incomingVal = incoming[key];

    if (!(key in existing)) {
      // New key - add it
      result[key] = incomingVal;
    } else if (
      typeof existingVal === 'object' &&
      existingVal !== null &&
      !Array.isArray(existingVal) &&
      typeof incomingVal === 'object' &&
      incomingVal !== null &&
      !Array.isArray(incomingVal)
    ) {
      // Both are objects - recursively merge
      result[key] = deepMergeObjects(
        existingVal as Record<string, unknown>,
        incomingVal as Record<string, unknown>,
        preferExisting,
        conflicts,
        fullKey
      );
    } else if (JSON.stringify(existingVal) !== JSON.stringify(incomingVal)) {
      // Conflict - use preference
      conflicts.push({
        key: fullKey,
        existingValue: existingVal,
        newValue: incomingVal,
        resolution: preferExisting ? 'keep_existing' : 'use_new',
      });

      result[key] = preferExisting ? existingVal : incomingVal;
    }
    // If values are equal, keep existing (already in result)
  }

  return result;
}

/**
 * Merge two configuration objects
 */
export function mergeConfigs(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
  options: MergeOptions = {}
): MergeResult {
  const opts = { ...DEFAULT_MERGE_OPTIONS, ...options };
  const conflicts: MergeConflict[] = [];
  const addedKeys: string[] = [];
  const preservedKeys: string[] = [];

  try {
    // Track which keys are new
    const existingKeys = new Set(Object.keys(existing));
    for (const key of Object.keys(incoming)) {
      if (!existingKeys.has(key)) {
        addedKeys.push(key);
      }
    }

    // Track preserved keys (in existing but not in incoming, or kept on conflict)
    for (const key of Object.keys(existing)) {
      if (!(key in incoming)) {
        preservedKeys.push(key);
      }
    }

    let merged: Record<string, unknown>;

    if (opts.deepMerge) {
      merged = deepMergeObjects(existing, incoming, opts.preferExisting, conflicts);
    } else {
      // Shallow merge
      merged = { ...existing };
      for (const key of Object.keys(incoming)) {
        if (!(key in existing)) {
          merged[key] = incoming[key];
        } else if (JSON.stringify(existing[key]) !== JSON.stringify(incoming[key])) {
          conflicts.push({
            key,
            existingValue: existing[key],
            newValue: incoming[key],
            resolution: opts.preferExisting ? 'keep_existing' : 'use_new',
          });

          merged[key] = opts.preferExisting ? existing[key] : incoming[key];
        }
      }
    }

    // Log conflicts if enabled
    if (opts.logConflicts && conflicts.length > 0) {
      logger.warn(`Config merge had ${conflicts.length} conflicts:`);
      for (const conflict of conflicts) {
        logger.info(`  ${conflict.key}: ${conflict.resolution}`);
      }
    }

    return {
      success: true,
      merged,
      conflicts,
      addedKeys,
      preservedKeys,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      merged: existing,
      conflicts: [],
      addedKeys: [],
      preservedKeys: [],
      error: message,
    };
  }
}

/**
 * Merge settings.json files
 */
export async function mergeSettingsFile(
  newSettings: Record<string, unknown>,
  options: MergeOptions = {}
): Promise<MergeResult> {
  const opts = { ...DEFAULT_MERGE_OPTIONS, ...options };
  const claudeDir = getClaudeConfigDir();
  const settingsPath = path.join(claudeDir, 'settings.json');

  // Load existing settings
  let existingSettings: Record<string, unknown> = {};

  if (existsSync(settingsPath)) {
    try {
      const content = await fs.readFile(settingsPath, 'utf-8');
      existingSettings = JSON.parse(content);
    } catch (error) {
      logger.warn(`Failed to parse existing settings.json: ${error}`);
    }
  }

  // Merge
  const result = mergeConfigs(existingSettings, newSettings, opts);

  if (!result.success || opts.dryRun) {
    if (opts.dryRun) {
      logger.info('[Dry Run] Would merge settings.json');
      logger.info(`[Dry Run] Added keys: ${result.addedKeys.join(', ') || 'none'}`);
      logger.info(`[Dry Run] Conflicts: ${result.conflicts.length}`);
    }
    return result;
  }

  // Write merged settings
  try {
    await fs.mkdir(claudeDir, { recursive: true });
    await fs.writeFile(settingsPath, JSON.stringify(result.merged, null, 2), 'utf-8');
    logger.success('Settings merged successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ...result,
      success: false,
      error: message,
    };
  }

  return result;
}

/**
 * Format file size for display
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
}
