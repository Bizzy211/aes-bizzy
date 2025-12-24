/**
 * Storage Manager for Heimdall
 *
 * Provides memory storage, retrieval, and management operations using Qdrant
 * vector database. Includes MCP tool wrapper functions for agent integration.
 */
import { StoreMemoryRequest, StoreMemoryResponse, QueryMemoriesRequest, QueryMemoriesResponse, DeleteMemoryRequest, DeleteMemoryResponse } from '../types/heimdall.js';
/**
 * Generate embeddings for text using OpenAI API
 */
export declare function generateEmbedding(text: string, model?: string): Promise<{
    embedding: number[];
    tokensUsed: number;
}>;
/**
 * Store a memory in Qdrant
 */
export declare function storeMemory(request: StoreMemoryRequest): Promise<StoreMemoryResponse>;
/**
 * Query memories from Qdrant using semantic search
 */
export declare function queryMemories(request: QueryMemoriesRequest): Promise<QueryMemoriesResponse>;
/**
 * Delete memories from Qdrant
 */
export declare function deleteMemories(request: DeleteMemoryRequest): Promise<DeleteMemoryResponse>;
/**
 * Store a lesson learned during a task
 */
export declare function storeLesson(content: string, agentName: string, taskId?: string, additionalTags?: string[]): Promise<StoreMemoryResponse>;
/**
 * Store a decision made during implementation
 */
export declare function storeDecision(decision: string, rationale: string, agentName: string, taskId?: string, additionalTags?: string[]): Promise<StoreMemoryResponse>;
/**
 * Store an error and its resolution
 */
export declare function storeErrorResolution(error: string, resolution: string, agentName: string, taskId?: string, additionalTags?: string[]): Promise<StoreMemoryResponse>;
/**
 * Store a code pattern for reuse
 */
export declare function storePattern(patternName: string, description: string, codeExample: string, agentName: string, techStack?: string[], additionalTags?: string[]): Promise<StoreMemoryResponse>;
/**
 * Query for relevant context for a task
 */
export declare function getTaskContext(taskDescription: string, agentName?: string, taskId?: string, limit?: number): Promise<QueryMemoriesResponse>;
/**
 * Query for similar errors and resolutions
 */
export declare function findSimilarErrors(errorMessage: string, limit?: number): Promise<QueryMemoriesResponse>;
/**
 * Query for patterns related to a technology
 */
export declare function findPatterns(technology: string, description?: string, limit?: number): Promise<QueryMemoriesResponse>;
/**
 * Get memory statistics
 */
export declare function getMemoryStats(): Promise<{
    totalMemories: number;
    byType: Record<string, number>;
    byAgent: Record<string, number>;
    oldestMemory?: string;
    newestMemory?: string;
}>;
/**
 * Clean up expired memories (by TTL)
 */
export declare function cleanupExpiredMemories(): Promise<DeleteMemoryResponse>;
/**
 * Archive old memories (add archived tag)
 */
export declare function archiveOldMemories(_olderThanDays?: number): Promise<{
    success: boolean;
    count: number;
    error?: string;
}>;
//# sourceMappingURL=storage-manager.d.ts.map