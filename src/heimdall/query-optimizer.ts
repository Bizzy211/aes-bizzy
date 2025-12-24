/**
 * Query Optimizer for Heimdall
 *
 * Optimizes memory retrieval and formatting to minimize token usage
 * while maximizing context relevance for Claude agents.
 */

import {
  HeimdallMemory,
  HeimdallMemoryType,
  QueryMemoriesRequest,
} from '../types/heimdall.js';
import { queryMemories } from './storage-manager.js';
import { analyzeTags } from './tagging.js';

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Token Estimation
// ============================================================================

/**
 * Rough token estimation (4 chars per token average)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Estimate tokens for a memory
 */
export function estimateMemoryTokens(memory: HeimdallMemory, includeMetadata: boolean = true): number {
  let text = memory.content;

  if (includeMetadata) {
    text += memory.tags.join(' ');
    text += memory.agentName || '';
    text += memory.taskId || '';
    text += memory.memoryType || '';
  }

  return estimateTokens(text);
}

// ============================================================================
// Content Compression
// ============================================================================

/**
 * Compress memory content to reduce tokens
 */
export function compressContent(content: string, maxLength: number = 500): string {
  if (content.length <= maxLength) {
    return content;
  }

  // Try to preserve key information
  const lines = content.split('\n');

  // Always keep first line (usually title/summary)
  const firstLine = lines[0] || '';

  // Try to keep code blocks intact if possible
  const codeBlockMatch = content.match(/```[\s\S]*?```/);
  const codeBlock = codeBlockMatch?.[0] || '';

  // Calculate remaining space
  const remainingLength = maxLength - firstLine.length - codeBlock.length - 50;

  if (remainingLength <= 0) {
    // Just truncate if too long
    return content.slice(0, maxLength - 3) + '...';
  }

  // Extract key sentences (those with keywords)
  const keywords = ['important', 'note', 'key', 'must', 'should', 'always', 'never', 'error', 'fix'];
  const keyLines = lines.filter(line =>
    keywords.some(kw => line.toLowerCase().includes(kw))
  ).slice(0, 3);

  // Combine
  const parts = [firstLine];
  if (keyLines.length > 0) {
    parts.push(...keyLines);
  }
  if (codeBlock && codeBlock.length < remainingLength) {
    parts.push(codeBlock);
  }

  const result = parts.join('\n');

  if (result.length > maxLength) {
    return result.slice(0, maxLength - 3) + '...';
  }

  return result;
}

// ============================================================================
// Deduplication
// ============================================================================

/**
 * Simple text similarity using Jaccard index on words
 */
function textSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Deduplicate memories based on content similarity
 */
export function deduplicateMemories(
  memories: HeimdallMemory[],
  threshold: number = 0.7
): HeimdallMemory[] {
  if (memories.length <= 1) {
    return memories;
  }

  const result: HeimdallMemory[] = [];
  const seen: string[] = [];

  for (const memory of memories) {
    // Check if this memory is too similar to any we've already kept
    const isDuplicate = seen.some(existing =>
      textSimilarity(existing, memory.content) > threshold
    );

    if (!isDuplicate) {
      result.push(memory);
      seen.push(memory.content);
    }
  }

  return result;
}

// ============================================================================
// Prioritization
// ============================================================================

/**
 * Priority scores for memory types
 */
const TYPE_PRIORITY: Record<HeimdallMemoryType, number> = {
  error: 10,       // Errors are most urgent
  decision: 9,     // Decisions inform choices
  pattern: 8,      // Patterns guide implementation
  lesson: 7,       // Lessons prevent repeated mistakes
  context: 6,      // Context provides background
  snippet: 5,      // Snippets are reusable
  reference: 4,    // References are supplementary
  interaction: 3,  // Interactions are historical
  preference: 2,   // Preferences are personal
};

/**
 * Calculate priority score for a memory
 */
function calculatePriorityScore(
  memory: HeimdallMemory,
  priorityTypes?: HeimdallMemoryType[]
): number {
  let score = memory.relevanceScore || 0;

  // Boost based on type priority
  const typeScore = TYPE_PRIORITY[memory.memoryType || 'context'] || 5;
  score += typeScore * 0.1;

  // Extra boost for priority types
  if (priorityTypes && memory.memoryType && priorityTypes.includes(memory.memoryType)) {
    score += 0.2;
  }

  // Boost for pinned memories
  if (memory.tags.includes('pinned')) {
    score += 0.3;
  }

  // Slight penalty for archived
  if (memory.tags.includes('archived')) {
    score -= 0.1;
  }

  return Math.min(1.0, Math.max(0, score));
}

/**
 * Sort memories by priority
 */
export function prioritizeMemories(
  memories: HeimdallMemory[],
  priorityTypes?: HeimdallMemoryType[]
): HeimdallMemory[] {
  return [...memories].sort((a, b) =>
    calculatePriorityScore(b, priorityTypes) - calculatePriorityScore(a, priorityTypes)
  );
}

// ============================================================================
// Optimized Query
// ============================================================================

/**
 * Execute an optimized query with token efficiency
 */
export async function optimizedQuery(
  query: string,
  options: OptimizedQueryOptions = {}
): Promise<OptimizedQueryResult> {
  const {
    maxTokens = 2000,
    priorityTypes,
    minRelevance = 0.6,
    maxMemories = 10,
    deduplicate = true,
    deduplicationThreshold = 0.7,
    compressContent: shouldCompress = true,
    maxContentLength = 500,
    includeMetadata = false,
    outputFormat = 'compact',
  } = options;

  // Execute base query with higher limit for filtering
  const queryRequest: QueryMemoriesRequest = {
    query,
    limit: maxMemories * 3, // Get more for filtering
    minRelevance,
    memoryTypes: priorityTypes,
  };

  const response = await queryMemories(queryRequest);

  if (!response.success) {
    return {
      success: false,
      memories: [],
      formattedOutput: '',
      tokenEstimate: 0,
      stats: {
        totalQueried: 0,
        afterDedup: 0,
        afterFilter: 0,
        returned: 0,
        compressionRatio: 1,
      },
      error: response.error,
    };
  }

  let memories = response.memories;
  const totalQueried = memories.length;

  // Deduplicate if enabled
  if (deduplicate) {
    memories = deduplicateMemories(memories, deduplicationThreshold);
  }
  const afterDedup = memories.length;

  // Prioritize
  memories = prioritizeMemories(memories, priorityTypes);

  // Compress content if needed
  if (shouldCompress) {
    memories = memories.map(m => ({
      ...m,
      content: compressContent(m.content, maxContentLength),
    }));
  }

  // Select memories within token budget
  const selectedMemories: HeimdallMemory[] = [];
  let currentTokens = 0;

  for (const memory of memories) {
    const memoryTokens = estimateMemoryTokens(memory, includeMetadata);

    if (currentTokens + memoryTokens <= maxTokens && selectedMemories.length < maxMemories) {
      selectedMemories.push(memory);
      currentTokens += memoryTokens;
    }
  }

  // Format output
  const formattedOutput = formatMemories(selectedMemories, outputFormat, includeMetadata);
  const tokenEstimate = estimateTokens(formattedOutput);

  // Calculate compression ratio
  const originalTokens = response.memories.reduce(
    (sum, m) => sum + estimateMemoryTokens(m, includeMetadata),
    0
  );
  const compressionRatio = originalTokens > 0 ? tokenEstimate / originalTokens : 1;

  return {
    success: true,
    memories: selectedMemories,
    formattedOutput,
    tokenEstimate,
    stats: {
      totalQueried,
      afterDedup,
      afterFilter: memories.length,
      returned: selectedMemories.length,
      compressionRatio,
    },
  };
}

// ============================================================================
// Output Formatting
// ============================================================================

/**
 * Format memories for agent consumption
 */
export function formatMemories(
  memories: HeimdallMemory[],
  format: 'full' | 'compact' | 'minimal' = 'compact',
  includeMetadata: boolean = false
): string {
  if (memories.length === 0) {
    return 'No relevant memories found.';
  }

  switch (format) {
    case 'full':
      return formatFull(memories, includeMetadata);
    case 'compact':
      return formatCompact(memories, includeMetadata);
    case 'minimal':
      return formatMinimal(memories);
    default:
      return formatCompact(memories, includeMetadata);
  }
}

/**
 * Full format with all details
 */
function formatFull(memories: HeimdallMemory[], includeMetadata: boolean): string {
  const lines: string[] = ['# Relevant Memories', ''];

  for (const memory of memories) {
    lines.push(`## ${memory.memoryType?.toUpperCase() || 'MEMORY'}`);

    if (includeMetadata) {
      const analysis = analyzeTags(memory.tags);
      if (analysis.agent) lines.push(`Agent: ${analysis.agent}`);
      if (analysis.taskId) lines.push(`Task: ${analysis.taskId}`);
      if (memory.relevanceScore) {
        lines.push(`Relevance: ${(memory.relevanceScore * 100).toFixed(0)}%`);
      }
      lines.push(`Timestamp: ${memory.timestamp}`);
      lines.push('');
    }

    lines.push(memory.content);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Compact format for efficient token usage
 */
function formatCompact(memories: HeimdallMemory[], includeMetadata: boolean): string {
  const lines: string[] = [];

  for (let i = 0; i < memories.length; i++) {
    const memory = memories[i];
    if (!memory) continue;

    const prefix = memory.memoryType
      ? `[${memory.memoryType.toUpperCase()}]`
      : `[${i + 1}]`;

    lines.push(`${prefix} ${memory.content}`);

    if (includeMetadata && memory.relevanceScore) {
      lines.push(`  (relevance: ${(memory.relevanceScore * 100).toFixed(0)}%)`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Minimal format - just the content
 */
function formatMinimal(memories: HeimdallMemory[]): string {
  return memories.map(m => m.content).join('\n\n');
}

// ============================================================================
// Specialized Queries
// ============================================================================

/**
 * Get context for a specific agent starting a task
 */
export async function getAgentContext(
  agentName: string,
  taskDescription: string,
  maxTokens: number = 1500
): Promise<OptimizedQueryResult> {
  return optimizedQuery(
    `${agentName} agent context: ${taskDescription}`,
    {
      maxTokens,
      priorityTypes: ['lesson', 'decision', 'pattern'],
      outputFormat: 'compact',
      includeMetadata: false,
      deduplicate: true,
    }
  );
}

/**
 * Get error-related context
 */
export async function getErrorContext(
  errorDescription: string,
  maxTokens: number = 1000
): Promise<OptimizedQueryResult> {
  return optimizedQuery(
    `error resolution: ${errorDescription}`,
    {
      maxTokens,
      priorityTypes: ['error', 'lesson'],
      outputFormat: 'full',
      includeMetadata: true,
      deduplicate: true,
    }
  );
}

/**
 * Get implementation patterns
 */
export async function getPatternContext(
  feature: string,
  technology?: string,
  maxTokens: number = 1200
): Promise<OptimizedQueryResult> {
  const query = technology
    ? `${technology} pattern for ${feature}`
    : `implementation pattern: ${feature}`;

  return optimizedQuery(query, {
    maxTokens,
    priorityTypes: ['pattern', 'snippet'],
    outputFormat: 'full',
    includeMetadata: false,
    deduplicate: true,
  });
}

/**
 * Build context prompt for agent injection
 */
export async function buildContextPrompt(
  agentName: string,
  taskTitle: string,
  taskDescription: string,
  maxTokens: number = 2000
): Promise<string> {
  const result = await getAgentContext(
    agentName,
    `${taskTitle}: ${taskDescription}`,
    maxTokens
  );

  if (!result.success || result.memories.length === 0) {
    return '';
  }

  return `
## Relevant Context from Previous Sessions

${result.formattedOutput}

---
Use the above context to inform your implementation. Build on existing patterns and avoid repeating past mistakes.
`.trim();
}
