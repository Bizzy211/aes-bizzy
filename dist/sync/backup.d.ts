/**
 * Configuration backup and merge system
 */
import type { BackupResult, RestoreResult, CleanupResult, MergeResult, BackupOptions, MergeOptions, AvailableBackup } from '../types/backup.js';
/**
 * Get the Claude config directory path
 */
export declare function getClaudeConfigDir(): string;
/**
 * Get the backup directory path
 */
export declare function getBackupDir(): string;
/**
 * Generate a backup ID from timestamp
 */
export declare function generateBackupId(): string;
/**
 * Create a backup of the Claude config directory
 */
export declare function createBackup(reason: string, options?: BackupOptions): Promise<BackupResult>;
/**
 * Get list of available backups
 */
export declare function listBackups(): Promise<AvailableBackup[]>;
/**
 * Restore a backup
 */
export declare function restoreBackup(backupId: string, options?: BackupOptions): Promise<RestoreResult>;
/**
 * Clean old backups
 */
export declare function cleanOldBackups(options?: BackupOptions): Promise<CleanupResult>;
/**
 * Merge two configuration objects
 */
export declare function mergeConfigs(existing: Record<string, unknown>, incoming: Record<string, unknown>, options?: MergeOptions): MergeResult;
/**
 * Merge settings.json files
 */
export declare function mergeSettingsFile(newSettings: Record<string, unknown>, options?: MergeOptions): Promise<MergeResult>;
//# sourceMappingURL=backup.d.ts.map