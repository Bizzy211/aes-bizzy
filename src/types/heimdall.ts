/**
 * Heimdall MCP Types
 *
 * Type definitions for Heimdall persistent agent memory system.
 * Heimdall provides vector-based memory storage using Qdrant for
 * semantic search and context retrieval across agent sessions.
 */

// ============================================================================
// Memory Core Types
// ============================================================================

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
export type HeimdallMemoryType =
  | 'lesson'        // Learned insight from task completion
  | 'pattern'       // Code or workflow pattern
  | 'decision'      // Architectural or design decision
  | 'context'       // Task or project context
  | 'error'         // Error encountered and resolution
  | 'interaction'   // Agent interaction record
  | 'preference'    // User or project preference
  | 'snippet'       // Code snippet for reuse
  | 'reference';    // External reference or documentation

// ============================================================================
// Session Lesson Types
// ============================================================================

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
export function sessionLessonToMemory(lesson: SessionLesson): Omit<HeimdallMemory, 'id' | 'timestamp' | 'embedding'> {
  const content = formatSessionLessonContent(lesson);
  const tags = [
    `agent:${lesson.agentName}`,
    `type:lesson`,
    ...lesson.patterns.map(p => `pattern:${p.toLowerCase().replace(/\s+/g, '-')}`),
    ...lesson.dependencies.map(d => `dep:${d.toLowerCase()}`),
  ];

  if (lesson.projectName) {
    tags.push(`project:${lesson.projectName}`);
  }
  if (lesson.successLevel) {
    tags.push(`success:${lesson.successLevel}`);
  }

  return {
    content,
    tags,
    agentName: lesson.agentName,
    memoryType: 'lesson',
  };
}

/**
 * Format SessionLesson as readable content
 */
function formatSessionLessonContent(lesson: SessionLesson): string {
  const lines: string[] = [
    `Task: ${lesson.taskTitle}`,
    `Agent: ${lesson.agentName}`,
    '',
    '## Approach',
    lesson.approach,
  ];

  if (lesson.patterns.length > 0) {
    lines.push('', '## Patterns Used');
    lesson.patterns.forEach(p => lines.push(`- ${p}`));
  }

  if (lesson.dependencies.length > 0) {
    lines.push('', '## Dependencies');
    lesson.dependencies.forEach(d => lines.push(`- ${d}`));
  }

  if (lesson.challenges.length > 0) {
    lines.push('', '## Challenges');
    lesson.challenges.forEach(c => lines.push(`- ${c}`));
  }

  if (lesson.successLevel) {
    lines.push('', `Success Level: ${lesson.successLevel}`);
  }

  return lines.join('\n');
}

// ============================================================================
// Task Context Types
// ============================================================================

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
export type HeimdallTaskCategory =
  | 'feature'
  | 'bugfix'
  | 'refactor'
  | 'documentation'
  | 'testing'
  | 'infrastructure'
  | 'security'
  | 'performance'
  | 'maintenance'
  | 'research';

/**
 * Convert TaskContext to HeimdallMemory for storage
 */
export function taskContextToMemory(context: HeimdallTaskContext): Omit<HeimdallMemory, 'id' | 'timestamp' | 'embedding'> {
  const content = formatTaskContextContent(context);
  const tags = [
    `task:${context.taskId}`,
    `project:${context.projectName}`,
    `category:${context.category}`,
    `agent:${context.agentName}`,
    `type:context`,
    ...context.techStack.map(t => `tech:${t.toLowerCase()}`),
  ];

  if (context.status) {
    tags.push(`status:${context.status}`);
  }
  if (context.priority) {
    tags.push(`priority:${context.priority}`);
  }

  return {
    content,
    tags,
    agentName: context.agentName,
    taskId: context.taskId,
    memoryType: 'context',
  };
}

/**
 * Format TaskContext as readable content
 */
function formatTaskContextContent(context: HeimdallTaskContext): string {
  const lines: string[] = [
    `Task: ${context.taskId}`,
    `Project: ${context.projectName}`,
    `Category: ${context.category}`,
    `Agent: ${context.agentName}`,
    `Tech Stack: ${context.techStack.join(', ')}`,
  ];

  if (context.status) {
    lines.push(`Status: ${context.status}`);
  }
  if (context.priority) {
    lines.push(`Priority: ${context.priority}`);
  }
  if (context.dependencies && context.dependencies.length > 0) {
    lines.push(`Dependencies: ${context.dependencies.join(', ')}`);
  }

  return lines.join('\n');
}

// ============================================================================
// Qdrant/Docker Configuration Types
// ============================================================================

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
export const DEFAULT_QDRANT_CONFIG: QdrantConfig = {
  containerName: 'qdrant-heimdall',
  port: 6333,
  grpcPort: 6334,
  dataPath: '~/.heimdall/qdrant-data',
  imageTag: 'qdrant/qdrant:latest',
  memoryLimit: '512m',
};

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

// ============================================================================
// Heimdall Server Configuration
// ============================================================================

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
export type HeimdallEmbeddingModel =
  | 'text-embedding-3-small'
  | 'text-embedding-3-large'
  | 'text-embedding-ada-002'
  | 'voyage-3'
  | 'voyage-3-lite'
  | 'local-sentence-transformers';

/**
 * Default Heimdall configuration
 */
export const DEFAULT_HEIMDALL_CONFIG: HeimdallConfig = {
  qdrantUrl: 'http://localhost:6333',
  collectionName: 'claude-memories',
  embeddingModel: 'text-embedding-3-small',
  maxResults: 10,
  minRelevance: 0.7,
  autoStoreLessons: true,
  autoRetrieveContext: true,
};

// ============================================================================
// MCP Tool Types
// ============================================================================

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

// ============================================================================
// Health Check Types
// ============================================================================

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

// ============================================================================
// Installation Types
// ============================================================================

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
  failedSteps: { step: string; error: string }[];
  /** Final configuration */
  config?: HeimdallConfig;
  /** Error message if failed */
  error?: string;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate HeimdallMemory structure
 */
export function validateMemory(data: unknown): data is HeimdallMemory {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Required fields
  if (typeof obj.id !== 'string' || typeof obj.content !== 'string') {
    return false;
  }

  // Tags must be array of strings
  if (!Array.isArray(obj.tags) || !obj.tags.every(t => typeof t === 'string')) {
    return false;
  }

  // Timestamp must be string
  if (typeof obj.timestamp !== 'string') {
    return false;
  }

  return true;
}

/**
 * Validate SessionLesson structure
 */
export function validateSessionLesson(data: unknown): data is SessionLesson {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Required string fields
  const requiredStrings = ['agentName', 'taskTitle', 'approach'];
  for (const field of requiredStrings) {
    if (typeof obj[field] !== 'string') {
      return false;
    }
  }

  // Required arrays
  const requiredArrays = ['patterns', 'dependencies', 'challenges'];
  for (const field of requiredArrays) {
    if (!Array.isArray(obj[field])) {
      return false;
    }
  }

  return true;
}

/**
 * Validate HeimdallTaskContext structure
 */
export function validateTaskContext(data: unknown): data is HeimdallTaskContext {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Required string fields
  const requiredStrings = ['taskId', 'projectName', 'category', 'agentName'];
  for (const field of requiredStrings) {
    if (typeof obj[field] !== 'string') {
      return false;
    }
  }

  // techStack must be array
  if (!Array.isArray(obj.techStack)) {
    return false;
  }

  return true;
}
