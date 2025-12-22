/**
 * Migration Backup Management
 *
 * Creates and restores pre-migration backups with comprehensive
 * metadata for safe migration with rollback capability.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { getClaudeDir, detectExistingSetup } from './project-detector.js';
import type {
  MigrationBackupManifest,
  MigrationType,
  Conflict,
} from '../types/detection.js';

/**
 * Generate a unique backup ID
 */
function generateBackupId(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `migration-${timestamp}`;
}

/**
 * Get the backup directory path
 */
function getBackupPath(backupId: string): string {
  const claudeDir = getClaudeDir();
  const parentDir = path.dirname(claudeDir);
  return path.join(parentDir, `.claude.backup-${backupId}`);
}

/**
 * List all files recursively in a directory
 */
async function listFilesRecursive(dir: string, base: string = ''): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const relativePath = base ? path.join(base, entry.name) : entry.name;

      if (entry.isDirectory()) {
        const subFiles = await listFilesRecursive(path.join(dir, entry.name), relativePath);
        files.push(...subFiles);
      } else {
        files.push(relativePath);
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return files;
}

/**
 * Copy directory recursively
 */
async function copyDirectory(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });

  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Create a pre-migration backup
 */
export async function createPreMigrationBackup(
  reason: string,
  migrationType: MigrationType = 'full',
  conflicts: Conflict[] = []
): Promise<{ backupId: string; backupPath: string; manifest: MigrationBackupManifest }> {
  const backupId = generateBackupId();
  const backupPath = getBackupPath(backupId);
  const claudeDir = getClaudeDir();

  // Detect current state
  const detectedComponents = await detectExistingSetup();

  // List all files to backup
  const files = await listFilesRecursive(claudeDir);

  // Create manifest
  const manifest: MigrationBackupManifest = {
    id: backupId,
    migrationType,
    reason,
    timestamp: new Date().toISOString(),
    sourcePath: claudeDir,
    detectedComponents,
    conflicts,
    files,
  };

  // Create backup directory
  await fs.mkdir(backupPath, { recursive: true });

  // Copy all files from .claude directory
  try {
    await copyDirectory(claudeDir, path.join(backupPath, 'claude'));
  } catch {
    // If .claude doesn't exist, just create an empty backup
    await fs.mkdir(path.join(backupPath, 'claude'), { recursive: true });
  }

  // Write manifest
  await fs.writeFile(
    path.join(backupPath, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );

  return { backupId, backupPath, manifest };
}

/**
 * List available migration backups
 */
export async function listMigrationBackups(): Promise<MigrationBackupManifest[]> {
  const claudeDir = getClaudeDir();
  const parentDir = path.dirname(claudeDir);
  const manifests: MigrationBackupManifest[] = [];

  try {
    const entries = await fs.readdir(parentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('.claude.backup-migration-')) {
        const manifestPath = path.join(parentDir, entry.name, 'manifest.json');

        try {
          const content = await fs.readFile(manifestPath, 'utf-8');
          const manifest = JSON.parse(content) as MigrationBackupManifest;
          manifests.push(manifest);
        } catch {
          // Invalid or missing manifest
        }
      }
    }
  } catch {
    // Parent directory doesn't exist
  }

  // Sort by timestamp descending (newest first)
  manifests.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return manifests;
}

/**
 * Get a specific backup by ID
 */
export async function getMigrationBackup(
  backupId: string
): Promise<MigrationBackupManifest | null> {
  const backupPath = getBackupPath(backupId);
  const manifestPath = path.join(backupPath, 'manifest.json');

  try {
    const content = await fs.readFile(manifestPath, 'utf-8');
    return JSON.parse(content) as MigrationBackupManifest;
  } catch {
    return null;
  }
}

/**
 * Restore component types
 */
export type RestoreComponent = 'all' | 'agents' | 'hooks' | 'skills' | 'settings' | 'ecosystem';

/**
 * Restore from a migration backup
 */
export async function restoreFromMigrationBackup(
  backupId: string,
  components: RestoreComponent[] = ['all']
): Promise<{
  success: boolean;
  restoredFiles: string[];
  errors: string[];
}> {
  const result = {
    success: false,
    restoredFiles: [] as string[],
    errors: [] as string[],
  };

  const manifest = await getMigrationBackup(backupId);
  if (!manifest) {
    result.errors.push(`Backup not found: ${backupId}`);
    return result;
  }

  const backupPath = getBackupPath(backupId);
  const claudeDir = getClaudeDir();
  const backupClaudeDir = path.join(backupPath, 'claude');

  const shouldRestoreAll = components.includes('all');

  // Determine which files to restore
  const filesToRestore: string[] = [];

  for (const file of manifest.files) {
    const shouldRestore =
      shouldRestoreAll ||
      (components.includes('agents') && file.startsWith('agents/')) ||
      (components.includes('hooks') && file.startsWith('hooks/')) ||
      (components.includes('skills') && file.startsWith('skills/')) ||
      (components.includes('settings') && file === 'settings.json') ||
      (components.includes('ecosystem') && file === 'ecosystem.json');

    if (shouldRestore) {
      filesToRestore.push(file);
    }
  }

  // Restore files
  for (const file of filesToRestore) {
    const srcPath = path.join(backupClaudeDir, file);
    const destPath = path.join(claudeDir, file);

    try {
      // Ensure destination directory exists
      await fs.mkdir(path.dirname(destPath), { recursive: true });

      // Copy file
      await fs.copyFile(srcPath, destPath);
      result.restoredFiles.push(file);
    } catch (error) {
      result.errors.push(`Failed to restore ${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

/**
 * Delete a migration backup
 */
export async function deleteMigrationBackup(backupId: string): Promise<boolean> {
  const backupPath = getBackupPath(backupId);

  try {
    await fs.rm(backupPath, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Clean up old migration backups, keeping only the most recent N
 */
export async function cleanupOldBackups(keepCount: number = 5): Promise<{
  deleted: string[];
  errors: string[];
}> {
  const result = {
    deleted: [] as string[],
    errors: [] as string[],
  };

  const backups = await listMigrationBackups();

  // Delete backups beyond keepCount
  for (let i = keepCount; i < backups.length; i++) {
    const backup = backups[i];
    if (backup) {
      const success = await deleteMigrationBackup(backup.id);
      if (success) {
        result.deleted.push(backup.id);
      } else {
        result.errors.push(`Failed to delete backup: ${backup.id}`);
      }
    }
  }

  return result;
}

/**
 * Get backup size in bytes
 */
async function getDirectorySize(dir: string): Promise<number> {
  let size = 0;

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        size += await getDirectorySize(entryPath);
      } else {
        const stats = await fs.stat(entryPath);
        size += stats.size;
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return size;
}

/**
 * Get backup statistics
 */
export async function getBackupStats(backupId: string): Promise<{
  id: string;
  timestamp: string;
  reason: string;
  fileCount: number;
  sizeBytes: number;
  sizeMB: string;
} | null> {
  const manifest = await getMigrationBackup(backupId);
  if (!manifest) return null;

  const backupPath = getBackupPath(backupId);
  const sizeBytes = await getDirectorySize(backupPath);

  return {
    id: backupId,
    timestamp: manifest.timestamp,
    reason: manifest.reason,
    fileCount: manifest.files.length,
    sizeBytes,
    sizeMB: (sizeBytes / (1024 * 1024)).toFixed(2),
  };
}

/**
 * Verify backup integrity
 */
export async function verifyBackup(backupId: string): Promise<{
  valid: boolean;
  missingFiles: string[];
  errors: string[];
}> {
  const result = {
    valid: false,
    missingFiles: [] as string[],
    errors: [] as string[],
  };

  const manifest = await getMigrationBackup(backupId);
  if (!manifest) {
    result.errors.push('Manifest not found');
    return result;
  }

  const backupPath = getBackupPath(backupId);
  const backupClaudeDir = path.join(backupPath, 'claude');

  // Check each file in manifest
  for (const file of manifest.files) {
    const filePath = path.join(backupClaudeDir, file);

    try {
      await fs.access(filePath);
    } catch {
      result.missingFiles.push(file);
    }
  }

  result.valid = result.missingFiles.length === 0 && result.errors.length === 0;
  return result;
}

/**
 * Create a selective backup of specific components
 */
export async function createSelectiveBackup(
  reason: string,
  components: RestoreComponent[]
): Promise<{ backupId: string; backupPath: string; manifest: MigrationBackupManifest }> {
  const backupId = generateBackupId();
  const backupPath = getBackupPath(backupId);
  const claudeDir = getClaudeDir();

  // Detect current state
  const detectedComponents = await detectExistingSetup();

  // List files based on selected components
  const allFiles = await listFilesRecursive(claudeDir);
  const files: string[] = [];

  for (const file of allFiles) {
    const shouldInclude =
      components.includes('all') ||
      (components.includes('agents') && file.startsWith('agents/')) ||
      (components.includes('hooks') && file.startsWith('hooks/')) ||
      (components.includes('skills') && file.startsWith('skills/')) ||
      (components.includes('settings') && file === 'settings.json') ||
      (components.includes('ecosystem') && file === 'ecosystem.json');

    if (shouldInclude) {
      files.push(file);
    }
  }

  // Create manifest
  const manifest: MigrationBackupManifest = {
    id: backupId,
    migrationType: 'selective',
    reason,
    timestamp: new Date().toISOString(),
    sourcePath: claudeDir,
    detectedComponents,
    conflicts: [],
    files,
  };

  // Create backup directory
  const backupClaudeDir = path.join(backupPath, 'claude');
  await fs.mkdir(backupClaudeDir, { recursive: true });

  // Copy selected files
  for (const file of files) {
    const srcPath = path.join(claudeDir, file);
    const destPath = path.join(backupClaudeDir, file);

    try {
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.copyFile(srcPath, destPath);
    } catch {
      // File might not exist, skip it
    }
  }

  // Write manifest
  await fs.writeFile(
    path.join(backupPath, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );

  return { backupId, backupPath, manifest };
}
