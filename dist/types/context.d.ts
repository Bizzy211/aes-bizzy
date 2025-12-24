/**
 * Context management types for Beads integration
 *
 * These types support the context command functionality:
 * - aes-bizzy context add - Add new context beads
 * - aes-bizzy context search - Search by keywords, tags, type
 * - aes-bizzy context prime - Export context for agent consumption
 */
import { Bead } from './beads.js';
import { HandoffData } from './handoff-data.js';
/**
 * Context type categories for organizing beads
 */
export type ContextType = 'decision' | 'learning' | 'architecture' | 'pattern' | 'blocker' | 'handoff';
/**
 * Context scope (project-local or global)
 */
export type ContextScope = 'project' | 'global';
/**
 * Tag prefixes for context taxonomy
 */
export declare const CONTEXT_TAG_PREFIXES: {
    readonly project: "project:";
    readonly task: "task:";
    readonly agent: "agent:";
    readonly type: "type:";
    readonly component: "component:";
    readonly feature: "feature:";
    readonly tech: "tech:";
};
export type TagPrefix = keyof typeof CONTEXT_TAG_PREFIXES;
/**
 * Required and semantic tags for context organization
 */
export interface ContextTags {
    /**
     * Required tags - automatically generated
     */
    required: {
        project: string;
        agent: string;
        type: ContextType;
        task?: string;
    };
    /**
     * Semantic tags - user-provided for additional categorization
     */
    semantic: {
        component?: string[];
        feature?: string[];
        tech?: string[];
        [key: string]: string[] | undefined;
    };
}
/**
 * Options for generating context tags
 */
export interface GenerateTagsOptions {
    projectName: string;
    agentType: string;
    contextType: ContextType;
    taskId?: string;
    components?: string[];
    features?: string[];
    technologies?: string[];
    customTags?: string[];
}
/**
 * Generate context tags from options
 */
export declare function generateContextTags(options: GenerateTagsOptions): string[];
/**
 * Parse tag to extract prefix and value
 */
export declare function parseTag(tag: string): {
    prefix: TagPrefix | null;
    value: string;
};
/**
 * Create a tag with prefix
 */
export declare function createTag(prefix: TagPrefix, value: string): string;
/**
 * Context bead extending base Bead with context-specific metadata
 */
export interface ContextBead extends Bead {
    /**
     * Context type category
     */
    contextType: ContextType;
    /**
     * Scope (project or global)
     */
    scope: ContextScope;
    /**
     * Content body (detailed context information)
     */
    content?: string;
    /**
     * Linked handoff data (for type: handoff)
     */
    handoffData?: HandoffData;
    /**
     * Source file if context was imported
     */
    sourceFile?: string;
    /**
     * Related bead IDs
     */
    relatedBeads?: string[];
}
/**
 * Task Master task context for context assembly
 */
export interface TaskContext {
    taskId: string;
    title: string;
    description?: string;
    details?: string;
    subtasks?: Array<{
        id: string;
        title: string;
        status: string;
        notes?: string;
    }>;
    dependencies?: string[];
    status: string;
}
/**
 * Assembled context bundle for agent consumption
 */
export interface ContextBundle {
    /**
     * Task Master task context
     */
    taskMasterContext?: TaskContext;
    /**
     * Relevant Beads context entries
     */
    beadsContext: ContextBead[];
    /**
     * Combined prompt formatted for agent consumption
     */
    combinedPrompt: string;
    /**
     * Metadata about the bundle
     */
    metadata: {
        assembledAt: string;
        agentType?: string;
        taskId?: string;
        scope: ContextScope;
        beadCount: number;
        tokenEstimate?: number;
    };
}
/**
 * Options for creating a context bead
 */
export interface CreateContextOptions {
    title: string;
    type: ContextType;
    agentType: string;
    projectName?: string;
    taskId?: string;
    description?: string;
    content?: string;
    handoffData?: HandoffData;
    tags?: string[];
    scope?: ContextScope;
}
/**
 * Options for searching context
 */
export interface SearchContextOptions {
    query?: string;
    tags?: string[];
    type?: ContextType;
    agent?: string;
    task?: string;
    scope?: ContextScope;
    includeGlobal?: boolean;
    limit?: number;
    offset?: number;
}
/**
 * Options for listing context
 */
export interface ListContextOptions {
    type?: ContextType;
    agent?: string;
    task?: string;
    dateRange?: 'last-day' | 'last-week' | 'last-month' | 'all';
    scope?: ContextScope;
    sortBy?: 'createdAt' | 'updatedAt' | 'priority';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}
/**
 * Options for priming context
 */
export interface PrimeContextOptions {
    agentType?: string;
    taskId?: string;
    format?: 'prompt' | 'json' | 'markdown';
    maxTokens?: number;
    scope?: ContextScope;
    includeGlobal?: boolean;
}
/**
 * Options for syncing context from Task Master
 */
export interface SyncContextOptions {
    taskId?: string;
    scope?: ContextScope;
    skipDuplicates?: boolean;
}
/**
 * Options for exporting context
 */
export interface ExportContextOptions {
    format: 'json' | 'markdown';
    output?: string;
    scope?: ContextScope;
    type?: ContextType;
    agent?: string;
}
/**
 * Options for importing context
 */
export interface ImportContextOptions {
    file: string;
    merge?: boolean;
    scope?: ContextScope;
}
/**
 * Result from context operations
 */
export interface ContextResult {
    success: boolean;
    error?: string;
}
/**
 * Result from creating context
 */
export interface CreateContextResult extends ContextResult {
    bead?: ContextBead;
    id?: string;
}
/**
 * Result from searching/listing context
 */
export interface ListContextResult extends ContextResult {
    beads: ContextBead[];
    total: number;
    hasMore: boolean;
}
/**
 * Result from priming context
 */
export interface PrimeContextResult extends ContextResult {
    bundle?: ContextBundle;
    output?: string;
}
/**
 * Result from syncing context
 */
export interface SyncContextResult extends ContextResult {
    imported: number;
    skipped: number;
    errors: string[];
}
/**
 * Result from exporting context
 */
export interface ExportContextResult extends ContextResult {
    exported: number;
    output?: string;
}
/**
 * Result from importing context
 */
export interface ImportContextResult extends ContextResult {
    imported: number;
    skipped: number;
    merged: number;
    errors: string[];
}
/**
 * Tag statistics
 */
export interface TagStats {
    tag: string;
    count: number;
    percentage: number;
}
/**
 * Result from listing tags
 */
export interface ListTagsResult extends ContextResult {
    tags: TagStats[];
    total: number;
}
/**
 * Check if a bead is a context bead
 */
export declare function isContextBead(bead: Bead): bead is ContextBead;
/**
 * Extract context type from bead tags
 */
export declare function getContextType(bead: Bead): ContextType | null;
/**
 * Extract task ID from bead tags
 */
export declare function getTaskId(bead: Bead): string | null;
/**
 * Extract project name from bead tags
 */
export declare function getProjectName(bead: Bead): string | null;
/**
 * Filter beads by context type
 */
export declare function filterByType(beads: ContextBead[], type: ContextType): ContextBead[];
/**
 * Filter beads by agent
 */
export declare function filterByAgent(beads: ContextBead[], agent: string): ContextBead[];
/**
 * Sort beads by relevance to a task and agent
 */
export declare function sortByRelevance(beads: ContextBead[], taskId?: string, agentType?: string): ContextBead[];
/**
 * Estimate token count for text (rough approximation)
 */
export declare function estimateTokens(text: string): number;
/**
 * Truncate context to fit within token limit
 */
export declare function truncateToTokenLimit(beads: ContextBead[], maxTokens: number): ContextBead[];
//# sourceMappingURL=context.d.ts.map