/**
 * Beads Context Store
 *
 * Manages context beads in .beads/interactions.jsonl with CRUD operations,
 * tagging, search, and dual-scope support (project vs global).
 */
import { ContextBead, ContextScope, ContextType, CreateContextOptions, CreateContextResult, ListContextOptions, ListContextResult, SearchContextOptions, ListTagsResult } from '../types/context.js';
/**
 * Get the beads directory path based on scope
 */
export declare function getBeadsPath(scope: ContextScope, projectPath?: string): string;
/**
 * Get the interactions file path
 */
export declare function getInteractionsPath(scope: ContextScope, projectPath?: string): string;
/**
 * Get the trash directory path
 */
export declare function getTrashPath(scope: ContextScope, projectPath?: string): string;
/**
 * Ensure the beads directory exists with proper structure
 */
export declare function ensureBeadsDir(scope: ContextScope, projectPath?: string): Promise<void>;
/**
 * Check if beads is initialized
 */
export declare function isBeadsInitialized(scope: ContextScope, projectPath?: string): boolean;
/**
 * Create a new context bead
 */
export declare function createContext(options: CreateContextOptions): Promise<CreateContextResult>;
/**
 * Get a context bead by ID
 */
export declare function getContext(beadId: string, scope?: ContextScope, projectPath?: string): Promise<ContextBead | null>;
/**
 * Update a context bead
 */
export declare function updateContext(beadId: string, updates: Partial<ContextBead>, scope?: ContextScope, projectPath?: string): Promise<CreateContextResult>;
/**
 * Remove a context bead (soft delete - moves to trash)
 */
export declare function removeContext(beadId: string, scope?: ContextScope, projectPath?: string): Promise<CreateContextResult>;
/**
 * Load all beads from JSONL file
 */
export declare function loadAllBeads(scope?: ContextScope, projectPath?: string): Promise<ContextBead[]>;
/**
 * Write all beads to JSONL file
 */
export declare function writeAllBeads(beads: ContextBead[], scope?: ContextScope, projectPath?: string): Promise<void>;
/**
 * Search context beads with filters
 */
export declare function searchContext(options: SearchContextOptions): Promise<ListContextResult>;
/**
 * List context beads with filters and sorting
 */
export declare function listContext(options: ListContextOptions): Promise<ListContextResult>;
/**
 * List all tags with usage counts
 */
export declare function listTags(prefix?: string, scope?: ContextScope, projectPath?: string): Promise<ListTagsResult>;
/**
 * Find related beads by shared tags
 */
export declare function findRelated(beadId: string, scope?: ContextScope, projectPath?: string, limit?: number): Promise<ContextBead[]>;
/**
 * Export beads to JSON
 */
export declare function exportBeadsToJson(scope?: ContextScope, projectPath?: string, filters?: {
    type?: ContextType;
    agent?: string;
}): Promise<{
    version: string;
    exportedAt: string;
    scope: ContextScope;
    count: number;
    beads: ContextBead[];
}>;
/**
 * Import beads from JSON export
 */
export declare function importBeadsFromJson(data: {
    beads: ContextBead[];
}, options: {
    merge?: boolean;
    scope?: ContextScope;
}): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
}>;
//# sourceMappingURL=context-store.d.ts.map