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

// ============================================================================
// Context Types
// ============================================================================

/**
 * Context type categories for organizing beads
 */
export type ContextType =
  | 'decision'      // Architectural or technical decisions made
  | 'learning'      // Lessons learned during development
  | 'architecture'  // System architecture documentation
  | 'pattern'       // Code patterns or conventions established
  | 'blocker'       // Blocking issues encountered
  | 'handoff';      // Agent handoff context from Task Master

/**
 * Context scope (project-local or global)
 */
export type ContextScope = 'project' | 'global';

// ============================================================================
// Tag Prefixes
// ============================================================================

/**
 * Tag prefixes for context taxonomy
 */
export const CONTEXT_TAG_PREFIXES = {
  project: 'project:',
  task: 'task:',
  agent: 'agent:',
  type: 'type:',
  component: 'component:',
  feature: 'feature:',
  tech: 'tech:',
} as const;

export type TagPrefix = keyof typeof CONTEXT_TAG_PREFIXES;

// ============================================================================
// Context Tags
// ============================================================================

/**
 * Required and semantic tags for context organization
 */
export interface ContextTags {
  /**
   * Required tags - automatically generated
   */
  required: {
    project: string;          // project:{name}
    agent: string;            // agent:{type}
    type: ContextType;        // type:{category}
    task?: string;            // task:{id} - optional, added when task-related
  };

  /**
   * Semantic tags - user-provided for additional categorization
   */
  semantic: {
    component?: string[];     // component:{name} - UI/backend components
    feature?: string[];       // feature:{name} - Feature areas
    tech?: string[];          // tech:{name} - Technologies used
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
export function generateContextTags(options: GenerateTagsOptions): string[] {
  const tags: string[] = [];

  // Required tags
  tags.push(`${CONTEXT_TAG_PREFIXES.project}${options.projectName}`);
  tags.push(`${CONTEXT_TAG_PREFIXES.agent}${options.agentType}`);
  tags.push(`${CONTEXT_TAG_PREFIXES.type}${options.contextType}`);

  // Optional task tag
  if (options.taskId) {
    tags.push(`${CONTEXT_TAG_PREFIXES.task}${options.taskId}`);
  }

  // Semantic tags
  if (options.components) {
    options.components.forEach(c => tags.push(`${CONTEXT_TAG_PREFIXES.component}${c}`));
  }
  if (options.features) {
    options.features.forEach(f => tags.push(`${CONTEXT_TAG_PREFIXES.feature}${f}`));
  }
  if (options.technologies) {
    options.technologies.forEach(t => tags.push(`${CONTEXT_TAG_PREFIXES.tech}${t}`));
  }

  // Custom tags (without prefix)
  if (options.customTags) {
    tags.push(...options.customTags);
  }

  return tags;
}

/**
 * Parse tag to extract prefix and value
 */
export function parseTag(tag: string): { prefix: TagPrefix | null; value: string } {
  for (const [key, prefix] of Object.entries(CONTEXT_TAG_PREFIXES)) {
    if (tag.startsWith(prefix)) {
      return {
        prefix: key as TagPrefix,
        value: tag.slice(prefix.length),
      };
    }
  }
  return { prefix: null, value: tag };
}

/**
 * Create a tag with prefix
 */
export function createTag(prefix: TagPrefix, value: string): string {
  return `${CONTEXT_TAG_PREFIXES[prefix]}${value}`;
}

// ============================================================================
// Context Bead
// ============================================================================

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

// ============================================================================
// Context Bundle
// ============================================================================

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

// ============================================================================
// Context Operations
// ============================================================================

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
  query?: string;           // Full-text search query
  tags?: string[];          // Filter by tags (AND logic)
  type?: ContextType;       // Filter by context type
  agent?: string;           // Filter by agent type
  task?: string;            // Filter by task ID
  scope?: ContextScope;     // Filter by scope
  includeGlobal?: boolean;  // Include global context when in project scope
  limit?: number;           // Max results (default 10)
  offset?: number;          // Pagination offset
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
  taskId?: string;          // Sync specific task, or all if not provided
  scope?: ContextScope;
  skipDuplicates?: boolean;
}

/**
 * Options for exporting context
 */
export interface ExportContextOptions {
  format: 'json' | 'markdown';
  output?: string;          // File path, or stdout if not provided
  scope?: ContextScope;
  type?: ContextType;
  agent?: string;
}

/**
 * Options for importing context
 */
export interface ImportContextOptions {
  file: string;
  merge?: boolean;          // True = merge with existing, false = replace
  scope?: ContextScope;
}

// ============================================================================
// Context Results
// ============================================================================

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

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a bead is a context bead
 */
export function isContextBead(bead: Bead): bead is ContextBead {
  return 'contextType' in bead && 'scope' in bead;
}

/**
 * Extract context type from bead tags
 */
export function getContextType(bead: Bead): ContextType | null {
  for (const tag of bead.tags) {
    const parsed = parseTag(tag);
    if (parsed.prefix === 'type') {
      const validTypes: ContextType[] = ['decision', 'learning', 'architecture', 'pattern', 'blocker', 'handoff'];
      if (validTypes.includes(parsed.value as ContextType)) {
        return parsed.value as ContextType;
      }
    }
  }
  return null;
}

/**
 * Extract task ID from bead tags
 */
export function getTaskId(bead: Bead): string | null {
  for (const tag of bead.tags) {
    const parsed = parseTag(tag);
    if (parsed.prefix === 'task') {
      return parsed.value;
    }
  }
  return null;
}

/**
 * Extract project name from bead tags
 */
export function getProjectName(bead: Bead): string | null {
  for (const tag of bead.tags) {
    const parsed = parseTag(tag);
    if (parsed.prefix === 'project') {
      return parsed.value;
    }
  }
  return null;
}

/**
 * Filter beads by context type
 */
export function filterByType(beads: ContextBead[], type: ContextType): ContextBead[] {
  return beads.filter(b => b.contextType === type);
}

/**
 * Filter beads by agent
 */
export function filterByAgent(beads: ContextBead[], agent: string): ContextBead[] {
  const agentTag = createTag('agent', agent);
  return beads.filter(b => b.tags.includes(agentTag));
}

/**
 * Sort beads by relevance to a task and agent
 */
export function sortByRelevance(
  beads: ContextBead[],
  taskId?: string,
  agentType?: string
): ContextBead[] {
  return [...beads].sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    // Exact task match = highest priority
    if (taskId) {
      if (getTaskId(a) === taskId) scoreA += 100;
      if (getTaskId(b) === taskId) scoreB += 100;
    }

    // Same agent = high priority
    if (agentType) {
      const agentTag = createTag('agent', agentType);
      if (a.tags.includes(agentTag)) scoreA += 50;
      if (b.tags.includes(agentTag)) scoreB += 50;
    }

    // More recent = higher priority
    const dateA = new Date(a.updatedAt || a.createdAt).getTime();
    const dateB = new Date(b.updatedAt || b.createdAt).getTime();
    scoreA += dateA / 1e12; // Small boost for recency
    scoreB += dateB / 1e12;

    return scoreB - scoreA; // Descending order
  });
}

/**
 * Estimate token count for text (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

/**
 * Truncate context to fit within token limit
 */
export function truncateToTokenLimit(beads: ContextBead[], maxTokens: number): ContextBead[] {
  let totalTokens = 0;
  const result: ContextBead[] = [];

  for (const bead of beads) {
    const beadText = JSON.stringify(bead);
    const tokens = estimateTokens(beadText);

    if (totalTokens + tokens <= maxTokens) {
      result.push(bead);
      totalTokens += tokens;
    } else {
      break;
    }
  }

  return result;
}
