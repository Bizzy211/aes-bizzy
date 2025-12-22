/**
 * Migration Backup Management
 *
 * Creates and restores pre-migration backups with comprehensive
 * metadata for safe migration with rollback capability.
 */
import type { MigrationBackupManifest, MigrationType, Conflict } from '../types/detection.js';
/**
 * Create a pre-migration backup
 */
export declare function createPreMigrationBackup(reason: string, migrationType?: MigrationType, conflicts?: Conflict[]): Promise<{
    backupId: string;
    backupPath: string;
    manifest: MigrationBackupManifest;
}>;
/**
 * List available migration backups
 */
export declare function listMigrationBackups(): Promise<MigrationBackupManifest[]>;
/**
 * Get a specific backup by ID
 */
export declare function getMigrationBackup(backupId: string): Promise<MigrationBackupManifest | null>;
/**
 * Restore component types
 */
export type RestoreComponent = 'all' | 'agents' | 'hooks' | 'skills' | 'settings' | 'ecosystem';
/**
 * Restore from a migration backup
 */
export declare function restoreFromMigrationBackup(backupId: string, components?: RestoreComponent[]): Promise<{
    success: boolean;
    restoredFiles: string[];
    errors: string[];
}>;
/**
 * Delete a migration backup
 */
export declare function deleteMigrationBackup(backupId: string): Promise<boolean>;
/**
 * Clean up old migration backups, keeping only the most recent N
 */
export declare function cleanupOldBackups(keepCount?: number): Promise<{
    deleted: string[];
    errors: string[];
}>;
/**
 * Get backup statistics
 */
export declare function getBackupStats(backupId: string): Promise<{
    id: string;
    timestamp: string;
    reason: string;
    fileCount: number;
    sizeBytes: number;
    sizeMB: string;
} | null>;
/**
 * Verify backup integrity
 */
export declare function verifyBackup(backupId: string): Promise<{
    valid: boolean;
    missingFiles: string[];
    errors: string[];
}>;
/**
 * Create a selective backup of specific components
 */
export declare function createSelectiveBackup(reason: string, components: RestoreComponent[]): Promise<{
    backupId: string;
    backupPath: string;
    manifest: MigrationBackupManifest;
}>;
//# sourceMappingURL=migration-backup.d.ts.map