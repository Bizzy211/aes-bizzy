/**
 * Private repository sync functionality
 */
import type { RepoSyncOptions, SyncResult, SyncState, AvailableComponents, PullResult } from '../types/repo-sync.js';
/**
 * Sync a private repository
 */
export declare function syncPrivateRepo(options: RepoSyncOptions): Promise<SyncResult>;
/**
 * Pull latest changes from the repository
 */
export declare function pullLatestChanges(token: string): Promise<PullResult>;
/**
 * Get current sync state
 */
export declare function getSyncState(): Promise<SyncState | undefined>;
/**
 * Get available components without syncing
 */
export declare function getAvailableComponents(token: string): Promise<AvailableComponents | null>;
//# sourceMappingURL=repo-sync.d.ts.map