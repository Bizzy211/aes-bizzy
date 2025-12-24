/**
 * Tagging Strategy and Validation System for Heimdall
 *
 * Provides a structured tagging taxonomy for organizing and retrieving
 * memories in the Heimdall vector store.
 */
import { HeimdallMemoryType } from '../types/heimdall.js';
/**
 * Standard tag prefixes for categorization
 */
export declare const TAG_PREFIXES: {
    /** Agent that created/owns the memory */
    readonly AGENT: "agent:";
    /** Project the memory belongs to */
    readonly PROJECT: "project:";
    /** Task Master task ID */
    readonly TASK: "task:";
    /** Memory type classification */
    readonly TYPE: "type:";
    /** Technology/framework */
    readonly TECH: "tech:";
    /** Component or module */
    readonly COMPONENT: "component:";
    /** Feature area */
    readonly FEATURE: "feature:";
    /** Error or issue type */
    readonly ERROR: "error:";
    /** Pattern name */
    readonly PATTERN: "pattern:";
    /** Dependency package */
    readonly DEPENDENCY: "dep:";
    /** Success/outcome level */
    readonly SUCCESS: "success:";
    /** Priority level */
    readonly PRIORITY: "priority:";
    /** Time-based category */
    readonly TIMEFRAME: "timeframe:";
    /** Custom user-defined prefix */
    readonly CUSTOM: "custom:";
};
export type TagPrefix = typeof TAG_PREFIXES[keyof typeof TAG_PREFIXES];
/**
 * Reserved tags that have special meaning
 */
export declare const RESERVED_TAGS: readonly ["global", "archived", "pinned", "temporary", "verified", "deprecated"];
export type ReservedTag = typeof RESERVED_TAGS[number];
/**
 * Parsed tag structure
 */
export interface ParsedTag {
    prefix: TagPrefix | null;
    value: string;
    raw: string;
    isReserved: boolean;
}
/**
 * Parse a single tag into its components
 */
export declare function parseTag(tag: string): ParsedTag;
/**
 * Construct a tag from prefix and value
 */
export declare function constructTag(prefix: TagPrefix, value: string): string;
/**
 * Normalize a tag (lowercase, trim, replace spaces)
 */
export declare function normalizeTag(tag: string): string;
/**
 * Tag validation result
 */
export interface TagValidationResult {
    valid: boolean;
    normalized: string;
    errors: string[];
    warnings: string[];
}
/**
 * Validate a single tag
 */
export declare function validateTag(tag: string): TagValidationResult;
/**
 * Validate a list of tags
 */
export declare function validateTags(tags: string[]): {
    valid: boolean;
    normalized: string[];
    errors: string[];
    warnings: string[];
};
/**
 * Options for automatic tag generation
 */
export interface TagGenerationOptions {
    agentName?: string;
    projectName?: string;
    taskId?: string;
    memoryType?: HeimdallMemoryType;
    techStack?: string[];
    components?: string[];
    features?: string[];
    patterns?: string[];
    additionalTags?: string[];
}
/**
 * Generate standard tags for a memory
 */
export declare function generateTags(options: TagGenerationOptions): string[];
/**
 * Extract tags from content using patterns
 */
export declare function extractTagsFromContent(content: string): string[];
/**
 * Filter configuration
 */
export interface TagFilter {
    include?: string[];
    exclude?: string[];
    prefixes?: TagPrefix[];
    matchAll?: boolean;
}
/**
 * Filter tags based on criteria
 */
export declare function filterTags(tags: string[], filter: TagFilter): string[];
/**
 * Check if tags match a filter
 */
export declare function tagsMatchFilter(tags: string[], filter: TagFilter): boolean;
/**
 * Analyze tags to extract metadata
 */
export declare function analyzeTags(tags: string[]): {
    agent?: string;
    project?: string;
    taskId?: string;
    memoryType?: string;
    technologies: string[];
    components: string[];
    features: string[];
    patterns: string[];
    errors: string[];
    isGlobal: boolean;
    isArchived: boolean;
    isPinned: boolean;
};
/**
 * Get tag statistics from a collection of tag arrays
 */
export declare function getTagStatistics(tagArrays: string[][]): {
    totalTags: number;
    uniqueTags: number;
    byPrefix: Record<string, number>;
    topTags: {
        tag: string;
        count: number;
    }[];
};
//# sourceMappingURL=tagging.d.ts.map