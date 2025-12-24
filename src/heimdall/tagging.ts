/**
 * Tagging Strategy and Validation System for Heimdall
 *
 * Provides a structured tagging taxonomy for organizing and retrieving
 * memories in the Heimdall vector store.
 */

import { HeimdallMemoryType } from '../types/heimdall.js';

// ============================================================================
// Tag Prefixes and Taxonomy
// ============================================================================

/**
 * Standard tag prefixes for categorization
 */
export const TAG_PREFIXES = {
  /** Agent that created/owns the memory */
  AGENT: 'agent:',
  /** Project the memory belongs to */
  PROJECT: 'project:',
  /** Task Master task ID */
  TASK: 'task:',
  /** Memory type classification */
  TYPE: 'type:',
  /** Technology/framework */
  TECH: 'tech:',
  /** Component or module */
  COMPONENT: 'component:',
  /** Feature area */
  FEATURE: 'feature:',
  /** Error or issue type */
  ERROR: 'error:',
  /** Pattern name */
  PATTERN: 'pattern:',
  /** Dependency package */
  DEPENDENCY: 'dep:',
  /** Success/outcome level */
  SUCCESS: 'success:',
  /** Priority level */
  PRIORITY: 'priority:',
  /** Time-based category */
  TIMEFRAME: 'timeframe:',
  /** Custom user-defined prefix */
  CUSTOM: 'custom:',
} as const;

export type TagPrefix = typeof TAG_PREFIXES[keyof typeof TAG_PREFIXES];

/**
 * Reserved tags that have special meaning
 */
export const RESERVED_TAGS = [
  'global',      // Memory applies globally
  'archived',    // Memory has been archived
  'pinned',      // Memory is pinned/important
  'temporary',   // Memory should be auto-expired
  'verified',    // Memory has been verified
  'deprecated',  // Memory is outdated
] as const;

export type ReservedTag = typeof RESERVED_TAGS[number];

// ============================================================================
// Tag Parsing and Construction
// ============================================================================

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
export function parseTag(tag: string): ParsedTag {
  const normalized = normalizeTag(tag);

  // Check for prefix
  for (const prefix of Object.values(TAG_PREFIXES)) {
    if (normalized.startsWith(prefix)) {
      return {
        prefix,
        value: normalized.slice(prefix.length),
        raw: normalized,
        isReserved: false,
      };
    }
  }

  // Check if reserved
  const isReserved = RESERVED_TAGS.includes(normalized as ReservedTag);

  return {
    prefix: null,
    value: normalized,
    raw: normalized,
    isReserved,
  };
}

/**
 * Construct a tag from prefix and value
 */
export function constructTag(prefix: TagPrefix, value: string): string {
  return `${prefix}${normalizeTagValue(value)}`;
}

/**
 * Normalize a tag (lowercase, trim, replace spaces)
 */
export function normalizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_:-]/g, '');
}

/**
 * Normalize just the value portion
 */
function normalizeTagValue(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');
}

// ============================================================================
// Tag Validation
// ============================================================================

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
export function validateTag(tag: string): TagValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if empty
  if (!tag || tag.trim().length === 0) {
    errors.push('Tag cannot be empty');
    return { valid: false, normalized: '', errors, warnings };
  }

  const normalized = normalizeTag(tag);

  // Check length
  if (normalized.length < 2) {
    errors.push('Tag must be at least 2 characters');
  }

  if (normalized.length > 64) {
    errors.push('Tag must be 64 characters or less');
  }

  // Check for invalid characters after normalization
  if (normalized !== tag.toLowerCase().trim()) {
    warnings.push('Tag was normalized (spaces and special characters replaced)');
  }

  // Check for common mistakes
  if (normalized.includes('--')) {
    warnings.push('Tag contains consecutive hyphens');
  }

  if (normalized.startsWith('-') || normalized.endsWith('-')) {
    warnings.push('Tag should not start or end with hyphen');
  }

  return {
    valid: errors.length === 0,
    normalized,
    errors,
    warnings,
  };
}

/**
 * Validate a list of tags
 */
export function validateTags(tags: string[]): {
  valid: boolean;
  normalized: string[];
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const tag of tags) {
    const result = validateTag(tag);
    errors.push(...result.errors.map(e => `Tag "${tag}": ${e}`));
    warnings.push(...result.warnings.map(w => `Tag "${tag}": ${w}`));

    if (result.valid) {
      if (seen.has(result.normalized)) {
        warnings.push(`Duplicate tag: "${result.normalized}"`);
      } else {
        seen.add(result.normalized);
        normalized.push(result.normalized);
      }
    }
  }

  // Check for conflicting tags
  const agentTags = normalized.filter(t => t.startsWith(TAG_PREFIXES.AGENT));
  if (agentTags.length > 1) {
    warnings.push('Multiple agent tags detected - memory may have ambiguous ownership');
  }

  return {
    valid: errors.length === 0,
    normalized,
    errors,
    warnings,
  };
}

// ============================================================================
// Tag Generation
// ============================================================================

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
export function generateTags(options: TagGenerationOptions): string[] {
  const tags: string[] = [];

  // Add agent tag
  if (options.agentName) {
    tags.push(constructTag(TAG_PREFIXES.AGENT, options.agentName));
  }

  // Add project tag
  if (options.projectName) {
    tags.push(constructTag(TAG_PREFIXES.PROJECT, options.projectName));
  }

  // Add task tag
  if (options.taskId) {
    tags.push(constructTag(TAG_PREFIXES.TASK, options.taskId));
  }

  // Add type tag
  if (options.memoryType) {
    tags.push(constructTag(TAG_PREFIXES.TYPE, options.memoryType));
  }

  // Add tech tags
  if (options.techStack) {
    for (const tech of options.techStack) {
      tags.push(constructTag(TAG_PREFIXES.TECH, tech));
    }
  }

  // Add component tags
  if (options.components) {
    for (const component of options.components) {
      tags.push(constructTag(TAG_PREFIXES.COMPONENT, component));
    }
  }

  // Add feature tags
  if (options.features) {
    for (const feature of options.features) {
      tags.push(constructTag(TAG_PREFIXES.FEATURE, feature));
    }
  }

  // Add pattern tags
  if (options.patterns) {
    for (const pattern of options.patterns) {
      tags.push(constructTag(TAG_PREFIXES.PATTERN, pattern));
    }
  }

  // Add additional custom tags
  if (options.additionalTags) {
    for (const tag of options.additionalTags) {
      const normalized = normalizeTag(tag);
      if (normalized && !tags.includes(normalized)) {
        tags.push(normalized);
      }
    }
  }

  return tags;
}

/**
 * Extract tags from content using patterns
 */
export function extractTagsFromContent(content: string): string[] {
  const tags: string[] = [];

  // Common technology patterns
  const techPatterns: Record<string, string[]> = {
    typescript: ['typescript', 'ts', '.ts', 'tsc'],
    javascript: ['javascript', 'js', '.js', 'node'],
    react: ['react', 'jsx', 'tsx', 'component', 'useState', 'useEffect'],
    python: ['python', 'py', '.py', 'pip'],
    docker: ['docker', 'dockerfile', 'container', 'compose'],
    postgres: ['postgres', 'postgresql', 'pg_', 'psql'],
    supabase: ['supabase', '@supabase'],
    qdrant: ['qdrant', 'vector', 'embedding'],
  };

  const lowerContent = content.toLowerCase();

  for (const [tech, patterns] of Object.entries(techPatterns)) {
    if (patterns.some(p => lowerContent.includes(p))) {
      tags.push(constructTag(TAG_PREFIXES.TECH, tech));
    }
  }

  // Extract potential component names (PascalCase words)
  const componentMatches = content.match(/\b[A-Z][a-z]+[A-Z][A-Za-z]*\b/g);
  if (componentMatches) {
    for (const match of componentMatches.slice(0, 3)) {
      tags.push(constructTag(TAG_PREFIXES.COMPONENT, match));
    }
  }

  // Look for error patterns
  if (lowerContent.includes('error') || lowerContent.includes('exception')) {
    const errorTypeMatch = content.match(/(\w+Error|\w+Exception)/);
    if (errorTypeMatch && errorTypeMatch[1]) {
      tags.push(constructTag(TAG_PREFIXES.ERROR, errorTypeMatch[1]));
    }
  }

  return [...new Set(tags)]; // Deduplicate
}

// ============================================================================
// Tag Filtering
// ============================================================================

/**
 * Filter configuration
 */
export interface TagFilter {
  include?: string[];
  exclude?: string[];
  prefixes?: TagPrefix[];
  matchAll?: boolean; // If true, all include tags must match
}

/**
 * Filter tags based on criteria
 */
export function filterTags(tags: string[], filter: TagFilter): string[] {
  let result = [...tags];

  // Filter by prefix
  if (filter.prefixes && filter.prefixes.length > 0) {
    result = result.filter(tag =>
      filter.prefixes!.some(prefix => tag.startsWith(prefix))
    );
  }

  // Include filter
  if (filter.include && filter.include.length > 0) {
    const includeNormalized = filter.include.map(normalizeTag);

    if (filter.matchAll) {
      // All include tags must be present
      const hasAll = includeNormalized.every(inc =>
        result.some(tag => tag.includes(inc))
      );
      if (!hasAll) {
        return [];
      }
    } else {
      // Any include tag matches
      result = result.filter(tag =>
        includeNormalized.some(inc => tag.includes(inc))
      );
    }
  }

  // Exclude filter
  if (filter.exclude && filter.exclude.length > 0) {
    const excludeNormalized = filter.exclude.map(normalizeTag);
    result = result.filter(tag =>
      !excludeNormalized.some(exc => tag.includes(exc))
    );
  }

  return result;
}

/**
 * Check if tags match a filter
 */
export function tagsMatchFilter(tags: string[], filter: TagFilter): boolean {
  const filtered = filterTags(tags, filter);
  return filtered.length > 0;
}

// ============================================================================
// Tag Analysis
// ============================================================================

/**
 * Analyze tags to extract metadata
 */
export function analyzeTags(tags: string[]): {
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
} {
  const parsed = tags.map(parseTag);

  const getValueByPrefix = (prefix: TagPrefix): string | undefined => {
    const tag = parsed.find(p => p.prefix === prefix);
    return tag?.value;
  };

  const getValuesByPrefix = (prefix: TagPrefix): string[] => {
    return parsed.filter(p => p.prefix === prefix).map(p => p.value);
  };

  return {
    agent: getValueByPrefix(TAG_PREFIXES.AGENT),
    project: getValueByPrefix(TAG_PREFIXES.PROJECT),
    taskId: getValueByPrefix(TAG_PREFIXES.TASK),
    memoryType: getValueByPrefix(TAG_PREFIXES.TYPE),
    technologies: getValuesByPrefix(TAG_PREFIXES.TECH),
    components: getValuesByPrefix(TAG_PREFIXES.COMPONENT),
    features: getValuesByPrefix(TAG_PREFIXES.FEATURE),
    patterns: getValuesByPrefix(TAG_PREFIXES.PATTERN),
    errors: getValuesByPrefix(TAG_PREFIXES.ERROR),
    isGlobal: tags.includes('global'),
    isArchived: tags.includes('archived'),
    isPinned: tags.includes('pinned'),
  };
}

/**
 * Get tag statistics from a collection of tag arrays
 */
export function getTagStatistics(tagArrays: string[][]): {
  totalTags: number;
  uniqueTags: number;
  byPrefix: Record<string, number>;
  topTags: { tag: string; count: number }[];
} {
  const allTags = tagArrays.flat();
  const tagCounts = new Map<string, number>();
  const prefixCounts: Record<string, number> = {};

  for (const tag of allTags) {
    tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);

    const parsed = parseTag(tag);
    if (parsed.prefix) {
      prefixCounts[parsed.prefix] = (prefixCounts[parsed.prefix] || 0) + 1;
    } else {
      prefixCounts['unprefixed'] = (prefixCounts['unprefixed'] || 0) + 1;
    }
  }

  const sortedTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([tag, count]) => ({ tag, count }));

  return {
    totalTags: allTags.length,
    uniqueTags: tagCounts.size,
    byPrefix: prefixCounts,
    topTags: sortedTags,
  };
}
