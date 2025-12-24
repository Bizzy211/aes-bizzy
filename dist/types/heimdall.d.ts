/**
 * Heimdall MCP Types
 *
 * Type definitions for Heimdall persistent agent memory system.
 * Heimdall provides vector-based memory storage using Qdrant for
 * semantic search and context retrieval across agent sessions.
 */
/**
 * Memory entry stored in Heimdall/Qdrant
 */
export interface HeimdallMemory {
    /** Unique identifier for the memory */
    id: string;
    /** The actual content/text being stored */
    content: string;
    /** Tags for categorization and filtering */
    tags: string[];
    /** ISO timestamp when memory was created */
    timestamp: string;
    /** Relevance score from semantic search (0-1) */
    relevanceScore?: number;
    /** Vector embedding (typically not returned in queries) */
    embedding?: number[];
    /** Source agent that created this memory */
    agentName?: string;
    /** Associated task ID */
    taskId?: string;
    /** Memory type classification */
    memoryType?: HeimdallMemoryType;
    /** TTL in seconds (optional, for expiring memories) */
    ttl?: number;
}
/**
 * Types of memories that can be stored
 */
export type HeimdallMemoryType = 'lesson' | 'pattern' | 'decision' | 'context' | 'error' | 'interaction' | 'preference' | 'snippet' | 'reference';
/**
 * A lesson learned during an agent session
 */
export interface SessionLesson {
    /** Agent that learned this lesson */
    agentName: string;
    /** Task title or description */
    taskTitle: string;
    /** The approach taken to solve the problem */
    approach: string;
    /** Patterns identified or used */
    patterns: string[];
    /** Dependencies involved */
    dependencies: string[];
    /** Challenges encountered */
    challenges: string[];
    /** Success level of the approach */
    successLevel?: 'high' | 'medium' | 'low' | 'failed';
    /** Time spent (in minutes) */
    timeSpent?: number;
    /** Whether this lesson should be shared globally */
    shareGlobally?: boolean;
    /** Associated project name */
    projectName?: string;
}
/**
 * Convert SessionLesson to HeimdallMemory for storage
 */
export declare function sessionLessonToMemory(lesson: SessionLesson): Omit<HeimdallMemory, 'id' | 'timestamp' | 'embedding'>;
/**
 * Context for a task being worked on
 */
export interface HeimdallTaskContext {
    /** Task Master task ID */
    taskId: string;
    /** Project name */
    projectName: string;
    /** Task category (feature, bugfix, refactor, etc.) */
    category: HeimdallTaskCategory;
    /** Tech stack being used */
    techStack: string[];
    /** Agent currently working on this task */
    agentName: string;
    /** Current status of the task */
    status?: 'pending' | 'in-progress' | 'blocked' | 'completed';
    /** Parent task ID if this is a subtask */
    parentTaskId?: string;
    /** Task dependencies */
    dependencies?: string[];
    /** Priority level */
    priority?: 'low' | 'medium' | 'high' | 'critical';
}
/**
 * Categories for task classification
 */
export type HeimdallTaskCategory = 'feature' | 'bugfix' | 'refactor' | 'documentation' | 'testing' | 'infrastructure' | 'security' | 'performance' | 'maintenance' | 'research';
/**
 * Convert TaskContext to HeimdallMemory for storage
 */
export declare function taskContextToMemory(context: HeimdallTaskContext): Omit<HeimdallMemory, 'id' | 'timestamp' | 'embedding'>;
/**
 * Qdrant container configuration
 */
export interface QdrantConfig {
    /** Container name */
    containerName: string;
    /** Host port mapping */
    port: number;
    /** gRPC port mapping */
    grpcPort: number;
    /** Data volume path */
    dataPath: string;
    /** Docker image tag */
    imageTag: string;
    /** Memory limit for container */
    memoryLimit?: string;
    /** CPU limit for container */
    cpuLimit?: string;
}
/**
 * Default Qdrant configuration
 */
export declare const DEFAULT_QDRANT_CONFIG: QdrantConfig;
/**
 * Qdrant container status
 */
export interface QdrantStatus {
    /** Whether the container is running */
    running: boolean;
    /** Container ID */
    containerId?: string;
    /** Container health status */
    health?: 'healthy' | 'unhealthy' | 'starting';
    /** Qdrant version */
    version?: string;
    /** Number of collections */
    collectionCount?: number;
    /** Total vectors stored */
    totalVectors?: number;
    /** Error message if not running */
    error?: string;
}
/**
 * Heimdall MCP server configuration
 */
export interface HeimdallConfig {
    /** Qdrant connection URL */
    qdrantUrl: string;
    /** Collection name for memories */
    collectionName: string;
    /** Embedding model to use */
    embeddingModel: HeimdallEmbeddingModel;
    /** Maximum memories to return per query */
    maxResults: number;
    /** Minimum relevance score threshold */
    minRelevance: number;
    /** Whether to auto-store lessons on task completion */
    autoStoreLessons: boolean;
    /** Whether to auto-retrieve context on task start */
    autoRetrieveContext: boolean;
    /** Tags to always include in queries */
    defaultTags?: string[];
}
/**
 * Supported embedding models
 */
export type HeimdallEmbeddingModel = 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002' | 'voyage-3' | 'voyage-3-lite' | 'local-sentence-transformers';
/**
 * Default Heimdall configuration
 */
export declare const DEFAULT_HEIMDALL_CONFIG: HeimdallConfig;
/**
 * Store memory request
 */
export interface StoreMemoryRequest {
    /** Content to store */
    content: string;
    /** Tags for categorization */
    tags: string[];
    /** Memory type */
    memoryType?: HeimdallMemoryType;
    /** Agent name */
    agentName?: string;
    /** Task ID */
    taskId?: string;
    /** TTL in seconds (optional) */
    ttl?: number;
}
/**
 * Store memory response
 */
export interface StoreMemoryResponse {
    /** Whether the operation succeeded */
    success: boolean;
    /** ID of the stored memory */
    memoryId?: string;
    /** Error message if failed */
    error?: string;
}
/**
 * Query memories request
 */
export interface QueryMemoriesRequest {
    /** Query text for semantic search */
    query: string;
    /** Optional tag filters */
    tags?: string[];
    /** Maximum results to return */
    limit?: number;
    /** Minimum relevance score */
    minRelevance?: number;
    /** Memory types to include */
    memoryTypes?: HeimdallMemoryType[];
    /** Agent filter */
    agentName?: string;
    /** Task filter */
    taskId?: string;
}
/**
 * Query memories response
 */
export interface QueryMemoriesResponse {
    /** Whether the query succeeded */
    success: boolean;
    /** Retrieved memories */
    memories: HeimdallMemory[];
    /** Total matches found */
    totalMatches: number;
    /** Query duration in ms */
    queryDuration?: number;
    /** Error message if failed */
    error?: string;
}
/**
 * Delete memory request
 */
export interface DeleteMemoryRequest {
    /** Memory ID to delete */
    memoryId?: string;
    /** Delete all memories matching tags */
    tags?: string[];
    /** Delete memories older than this timestamp */
    olderThan?: string;
}
/**
 * Delete memory response
 */
export interface DeleteMemoryResponse {
    /** Whether the operation succeeded */
    success: boolean;
    /** Number of memories deleted */
    deletedCount: number;
    /** Error message if failed */
    error?: string;
}
/**
 * Heimdall health status
 */
export interface HeimdallHealthStatus {
    /** Overall health status */
    status: 'healthy' | 'degraded' | 'unhealthy';
    /** Qdrant connection status */
    qdrant: QdrantStatus;
    /** Embedding service status */
    embedding: {
        available: boolean;
        model: HeimdallEmbeddingModel;
        error?: string;
    };
    /** Memory statistics */
    stats: {
        totalMemories: number;
        memoryTypes: Record<HeimdallMemoryType, number>;
        oldestMemory?: string;
        newestMemory?: string;
    };
    /** Last check timestamp */
    checkedAt: string;
}
/**
 * Heimdall installation status
 */
export interface HeimdallInstallStatus {
    /** Whether Heimdall is installed */
    installed: boolean;
    /** Whether Qdrant is running */
    qdrantRunning: boolean;
    /** Whether Heimdall MCP is configured */
    mcpConfigured: boolean;
    /** Detected issues */
    issues: string[];
    /** Recommended actions */
    recommendations: string[];
}
/**
 * Heimdall installation options
 */
export interface HeimdallInstallOptions {
    /** Custom Qdrant configuration */
    qdrantConfig?: Partial<QdrantConfig>;
    /** Custom Heimdall configuration */
    heimdallConfig?: Partial<HeimdallConfig>;
    /** Skip Docker installation check */
    skipDockerCheck?: boolean;
    /** Force reinstall even if already installed */
    force?: boolean;
    /** Skip MCP configuration */
    skipMcpConfig?: boolean;
}
/**
 * Heimdall installation result
 */
export interface HeimdallInstallResult {
    /** Whether installation succeeded */
    success: boolean;
    /** Steps that were completed */
    completedSteps: string[];
    /** Steps that failed */
    failedSteps: {
        step: string;
        error: string;
    }[];
    /** Final configuration */
    config?: HeimdallConfig;
    /** Error message if failed */
    error?: string;
}
/**
 * Validate HeimdallMemory structure
 */
export declare function validateMemory(data: unknown): data is HeimdallMemory;
/**
 * Validate SessionLesson structure
 */
export declare function validateSessionLesson(data: unknown): data is SessionLesson;
/**
 * Validate HeimdallTaskContext structure
 */
export declare function validateTaskContext(data: unknown): data is HeimdallTaskContext;
//# sourceMappingURL=heimdall.d.ts.map