/**
 * Query Optimizer for Heimdall
 *
 * Optimizes memory retrieval and formatting to minimize token usage
 * while maximizing context relevance for Claude agents.
 */
import { HeimdallMemory, HeimdallMemoryType } from '../types/heimdall.js';
/**
 * Optimized query options
 */
export interface OptimizedQueryOptions {
    /** Maximum tokens for the response */
    maxTokens?: number;
    /** Prioritize certain memory types */
    priorityTypes?: HeimdallMemoryType[];
    /** Minimum relevance score threshold */
    minRelevance?: number;
    /** Maximum memories to return */
    maxMemories?: number;
    /** Whether to deduplicate similar memories */
    deduplicate?: boolean;
    /** Similarity threshold for deduplication (0-1) */
    deduplicationThreshold?: number;
    /** Whether to compress content */
    compressContent?: boolean;
    /** Maximum content length per memory */
    maxContentLength?: number;
    /** Include metadata in output */
    includeMetadata?: boolean;
    /** Format for output */
    outputFormat?: 'full' | 'compact' | 'minimal';
}
/**
 * Optimized query result
 */
export interface OptimizedQueryResult {
    success: boolean;
    memories: HeimdallMemory[];
    formattedOutput: string;
    tokenEstimate: number;
    stats: {
        totalQueried: number;
        afterDedup: number;
        afterFilter: number;
        returned: number;
        compressionRatio: number;
    };
    error?: string;
}
/**
 * Rough token estimation (4 chars per token average)
 */
export declare function estimateTokens(text: string): number;
/**
 * Estimate tokens for a memory
 */
export declare function estimateMemoryTokens(memory: HeimdallMemory, includeMetadata?: boolean): number;
/**
 * Compress memory content to reduce tokens
 */
export declare function compressContent(content: string, maxLength?: number): string;
/**
 * Deduplicate memories based on content similarity
 */
export declare function deduplicateMemories(memories: HeimdallMemory[], threshold?: number): HeimdallMemory[];
/**
 * Sort memories by priority
 */
export declare function prioritizeMemories(memories: HeimdallMemory[], priorityTypes?: HeimdallMemoryType[]): HeimdallMemory[];
/**
 * Execute an optimized query with token efficiency
 */
export declare function optimizedQuery(query: string, options?: OptimizedQueryOptions): Promise<OptimizedQueryResult>;
/**
 * Format memories for agent consumption
 */
export declare function formatMemories(memories: HeimdallMemory[], format?: 'full' | 'compact' | 'minimal', includeMetadata?: boolean): string;
/**
 * Get context for a specific agent starting a task
 */
export declare function getAgentContext(agentName: string, taskDescription: string, maxTokens?: number): Promise<OptimizedQueryResult>;
/**
 * Get error-related context
 */
export declare function getErrorContext(errorDescription: string, maxTokens?: number): Promise<OptimizedQueryResult>;
/**
 * Get implementation patterns
 */
export declare function getPatternContext(feature: string, technology?: string, maxTokens?: number): Promise<OptimizedQueryResult>;
/**
 * Build context prompt for agent injection
 */
export declare function buildContextPrompt(agentName: string, taskTitle: string, taskDescription: string, maxTokens?: number): Promise<string>;
//# sourceMappingURL=query-optimizer.d.ts.map