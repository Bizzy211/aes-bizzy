/**
 * Storage Manager for Heimdall
 *
 * Provides memory storage, retrieval, and management operations using Qdrant
 * vector database. Includes MCP tool wrapper functions for agent integration.
 */
import * as crypto from 'crypto';
import { DEFAULT_HEIMDALL_CONFIG, } from '../types/heimdall.js';
import { generateTags, validateTags, normalizeTag } from './tagging.js';
import { loadHeimdallConfig } from './installer.js';
// ============================================================================
// Configuration
// ============================================================================
/**
 * Get active Heimdall configuration
 */
function getConfig() {
    return loadHeimdallConfig() || DEFAULT_HEIMDALL_CONFIG;
}
// ============================================================================
// Embedding Generation
// ============================================================================
/**
 * Generate embeddings for text using OpenAI API
 */
export async function generateEmbedding(text, model = 'text-embedding-3-small') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY not configured');
    }
    const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            input: text.slice(0, 8000), // Limit input length
        }),
        signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Embedding API error: ${response.status} - ${error}`);
    }
    const data = await response.json();
    if (!data.data || !data.data[0]) {
        throw new Error('No embedding returned from API');
    }
    return {
        embedding: data.data[0].embedding,
        tokensUsed: data.usage.total_tokens,
    };
}
// ============================================================================
// Core Storage Operations
// ============================================================================
/**
 * Store a memory in Qdrant
 */
export async function storeMemory(request) {
    const config = getConfig();
    try {
        // Generate embedding
        const { embedding } = await generateEmbedding(request.content, config.embeddingModel);
        // Generate memory ID
        const memoryId = crypto.randomUUID();
        // Validate and normalize tags
        const tagValidation = validateTags(request.tags);
        if (!tagValidation.valid) {
            return {
                success: false,
                error: `Invalid tags: ${tagValidation.errors.join('; ')}`,
            };
        }
        // Create point for Qdrant
        const point = {
            id: memoryId,
            vector: embedding,
            payload: {
                content: request.content,
                tags: tagValidation.normalized,
                memoryType: request.memoryType || 'context',
                agentName: request.agentName,
                taskId: request.taskId,
                timestamp: new Date().toISOString(),
                ttl: request.ttl,
            },
        };
        // Upsert point to Qdrant
        const upsertResponse = await fetch(`${config.qdrantUrl}/collections/${config.collectionName}/points`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                points: [point],
            }),
            signal: AbortSignal.timeout(10000),
        });
        if (!upsertResponse.ok) {
            const error = await upsertResponse.text();
            return {
                success: false,
                error: `Qdrant error: ${error}`,
            };
        }
        return {
            success: true,
            memoryId,
        };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
/**
 * Query memories from Qdrant using semantic search
 */
export async function queryMemories(request) {
    const config = getConfig();
    const startTime = Date.now();
    try {
        // Generate embedding for query
        const { embedding } = await generateEmbedding(request.query, config.embeddingModel);
        // Build filter conditions
        const must = [];
        if (request.tags && request.tags.length > 0) {
            for (const tag of request.tags) {
                must.push({
                    key: 'tags',
                    match: { value: normalizeTag(tag) },
                });
            }
        }
        if (request.memoryTypes && request.memoryTypes.length > 0) {
            must.push({
                key: 'memoryType',
                match: { any: request.memoryTypes },
            });
        }
        if (request.agentName) {
            must.push({
                key: 'agentName',
                match: { value: request.agentName },
            });
        }
        if (request.taskId) {
            must.push({
                key: 'taskId',
                match: { value: request.taskId },
            });
        }
        // Search Qdrant
        const searchBody = {
            vector: embedding,
            limit: request.limit || config.maxResults,
            score_threshold: request.minRelevance || config.minRelevance,
            with_payload: true,
        };
        if (must.length > 0) {
            searchBody.filter = { must };
        }
        const searchResponse = await fetch(`${config.qdrantUrl}/collections/${config.collectionName}/points/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(searchBody),
            signal: AbortSignal.timeout(10000),
        });
        if (!searchResponse.ok) {
            const error = await searchResponse.text();
            return {
                success: false,
                memories: [],
                totalMatches: 0,
                error: `Qdrant search error: ${error}`,
            };
        }
        const data = await searchResponse.json();
        // Convert results to HeimdallMemory objects
        const memories = data.result.map(result => ({
            id: String(result.id),
            content: String(result.payload.content),
            tags: result.payload.tags,
            timestamp: String(result.payload.timestamp),
            relevanceScore: result.score,
            agentName: result.payload.agentName,
            taskId: result.payload.taskId,
            memoryType: result.payload.memoryType,
            ttl: result.payload.ttl,
        }));
        return {
            success: true,
            memories,
            totalMatches: memories.length,
            queryDuration: Date.now() - startTime,
        };
    }
    catch (error) {
        return {
            success: false,
            memories: [],
            totalMatches: 0,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
/**
 * Delete memories from Qdrant
 */
export async function deleteMemories(request) {
    const config = getConfig();
    try {
        if (request.memoryId) {
            // Delete by ID
            const response = await fetch(`${config.qdrantUrl}/collections/${config.collectionName}/points/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    points: [request.memoryId],
                }),
                signal: AbortSignal.timeout(10000),
            });
            if (!response.ok) {
                const error = await response.text();
                return { success: false, deletedCount: 0, error };
            }
            return { success: true, deletedCount: 1 };
        }
        if (request.tags && request.tags.length > 0) {
            // Delete by tags
            const must = request.tags.map(tag => ({
                key: 'tags',
                match: { value: normalizeTag(tag) },
            }));
            const response = await fetch(`${config.qdrantUrl}/collections/${config.collectionName}/points/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filter: { must },
                }),
                signal: AbortSignal.timeout(10000),
            });
            if (!response.ok) {
                const error = await response.text();
                return { success: false, deletedCount: 0, error };
            }
            // We don't know exact count without additional query
            return { success: true, deletedCount: -1 };
        }
        if (request.olderThan) {
            // Delete by timestamp
            const response = await fetch(`${config.qdrantUrl}/collections/${config.collectionName}/points/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filter: {
                        must: [{
                                key: 'timestamp',
                                range: { lt: request.olderThan },
                            }],
                    },
                }),
                signal: AbortSignal.timeout(10000),
            });
            if (!response.ok) {
                const error = await response.text();
                return { success: false, deletedCount: 0, error };
            }
            return { success: true, deletedCount: -1 };
        }
        return { success: false, deletedCount: 0, error: 'No delete criteria specified' };
    }
    catch (error) {
        return {
            success: false,
            deletedCount: 0,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
// ============================================================================
// Convenience Functions
// ============================================================================
/**
 * Store a lesson learned during a task
 */
export async function storeLesson(content, agentName, taskId, additionalTags = []) {
    const tags = generateTags({
        agentName,
        taskId,
        memoryType: 'lesson',
        additionalTags,
    });
    return storeMemory({
        content,
        tags,
        memoryType: 'lesson',
        agentName,
        taskId,
    });
}
/**
 * Store a decision made during implementation
 */
export async function storeDecision(decision, rationale, agentName, taskId, additionalTags = []) {
    const content = `Decision: ${decision}\n\nRationale: ${rationale}`;
    const tags = generateTags({
        agentName,
        taskId,
        memoryType: 'decision',
        additionalTags,
    });
    return storeMemory({
        content,
        tags,
        memoryType: 'decision',
        agentName,
        taskId,
    });
}
/**
 * Store an error and its resolution
 */
export async function storeErrorResolution(error, resolution, agentName, taskId, additionalTags = []) {
    const content = `Error: ${error}\n\nResolution: ${resolution}`;
    const tags = generateTags({
        agentName,
        taskId,
        memoryType: 'error',
        additionalTags,
    });
    return storeMemory({
        content,
        tags,
        memoryType: 'error',
        agentName,
        taskId,
    });
}
/**
 * Store a code pattern for reuse
 */
export async function storePattern(patternName, description, codeExample, agentName, techStack = [], additionalTags = []) {
    const content = `# ${patternName}\n\n${description}\n\n\`\`\`\n${codeExample}\n\`\`\``;
    const tags = generateTags({
        agentName,
        memoryType: 'pattern',
        patterns: [patternName],
        techStack,
        additionalTags,
    });
    return storeMemory({
        content,
        tags,
        memoryType: 'pattern',
        agentName,
    });
}
/**
 * Query for relevant context for a task
 */
export async function getTaskContext(taskDescription, agentName, taskId, limit = 5) {
    return queryMemories({
        query: taskDescription,
        agentName,
        taskId,
        limit,
        memoryTypes: ['lesson', 'decision', 'pattern', 'context'],
    });
}
/**
 * Query for similar errors and resolutions
 */
export async function findSimilarErrors(errorMessage, limit = 3) {
    return queryMemories({
        query: errorMessage,
        limit,
        memoryTypes: ['error'],
    });
}
/**
 * Query for patterns related to a technology
 */
export async function findPatterns(technology, description, limit = 5) {
    const query = description
        ? `${technology} pattern: ${description}`
        : `${technology} patterns and best practices`;
    return queryMemories({
        query,
        limit,
        tags: [`tech:${technology.toLowerCase()}`],
        memoryTypes: ['pattern'],
    });
}
// ============================================================================
// Memory Management
// ============================================================================
/**
 * Get memory statistics
 */
export async function getMemoryStats() {
    const config = getConfig();
    try {
        // Get collection info
        const response = await fetch(`${config.qdrantUrl}/collections/${config.collectionName}`, { signal: AbortSignal.timeout(5000) });
        if (!response.ok) {
            return { totalMemories: 0, byType: {}, byAgent: {} };
        }
        const data = await response.json();
        const totalMemories = data.result?.points_count || data.result?.vectors_count || 0;
        // For detailed breakdown, we would need to scroll through all points
        // This is a simplified version
        return {
            totalMemories,
            byType: {},
            byAgent: {},
        };
    }
    catch {
        return { totalMemories: 0, byType: {}, byAgent: {} };
    }
}
/**
 * Clean up expired memories (by TTL)
 */
export async function cleanupExpiredMemories() {
    const config = getConfig();
    try {
        // This requires custom logic to check TTL against current time
        // For now, we'll rely on a simple time-based deletion
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days ago
        const response = await fetch(`${config.qdrantUrl}/collections/${config.collectionName}/points/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filter: {
                    must: [
                        {
                            key: 'memoryType',
                            match: { value: 'temporary' },
                        },
                        {
                            key: 'timestamp',
                            range: { lt: cutoffDate.toISOString() },
                        },
                    ],
                },
            }),
            signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) {
            const error = await response.text();
            return { success: false, deletedCount: 0, error };
        }
        return { success: true, deletedCount: -1 };
    }
    catch (error) {
        return {
            success: false,
            deletedCount: 0,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
/**
 * Archive old memories (add archived tag)
 */
export async function archiveOldMemories(_olderThanDays = 90) {
    // Note: This would require fetching, modifying, and re-upserting points
    // The olderThanDays parameter will be used when full archive support is implemented
    return {
        success: false,
        count: 0,
        error: 'Archive functionality requires point modification support',
    };
}
//# sourceMappingURL=storage-manager.js.map