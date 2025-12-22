/**
 * Sync Command - Sync ecosystem components with manifest support
 *
 * Provides manifest-based installation, project-level sync, and rollback capabilities.
 */
/**
 * Sync command options
 */
export interface SyncOptions {
    manifest?: string;
    project?: string;
    check?: boolean;
    restore?: string;
    dryRun?: boolean;
    force?: boolean;
    verbose?: boolean;
}
/**
 * Sync command result
 */
export interface SyncResult {
    success: boolean;
    filesUpdated: number;
    filesSynced: string[];
    errors: string[];
}
/**
 * Run the sync command
 */
export declare function runSync(options: SyncOptions): Promise<SyncResult>;
//# sourceMappingURL=sync.d.ts.map