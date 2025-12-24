/**
 * Tagging Strategy and Validation System for Heimdall
 *
 * Provides a structured tagging taxonomy for organizing and retrieving
 * memories in the Heimdall vector store.
 */
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
};
/**
 * Reserved tags that have special meaning
 */
export const RESERVED_TAGS = [
    'global', // Memory applies globally
    'archived', // Memory has been archived
    'pinned', // Memory is pinned/important
    'temporary', // Memory should be auto-expired
    'verified', // Memory has been verified
    'deprecated', // Memory is outdated
];
/**
 * Parse a single tag into its components
 */
export function parseTag(tag) {
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
    const isReserved = RESERVED_TAGS.includes(normalized);
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
export function constructTag(prefix, value) {
    return `${prefix}${normalizeTagValue(value)}`;
}
/**
 * Normalize a tag (lowercase, trim, replace spaces)
 */
export function normalizeTag(tag) {
    return tag
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9_:-]/g, '');
}
/**
 * Normalize just the value portion
 */
function normalizeTagValue(value) {
    return value
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9_-]/g, '');
}
/**
 * Validate a single tag
 */
export function validateTag(tag) {
    const errors = [];
    const warnings = [];
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
export function validateTags(tags) {
    const errors = [];
    const warnings = [];
    const normalized = [];
    const seen = new Set();
    for (const tag of tags) {
        const result = validateTag(tag);
        errors.push(...result.errors.map(e => `Tag "${tag}": ${e}`));
        warnings.push(...result.warnings.map(w => `Tag "${tag}": ${w}`));
        if (result.valid) {
            if (seen.has(result.normalized)) {
                warnings.push(`Duplicate tag: "${result.normalized}"`);
            }
            else {
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
/**
 * Generate standard tags for a memory
 */
export function generateTags(options) {
    const tags = [];
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
export function extractTagsFromContent(content) {
    const tags = [];
    // Common technology patterns
    const techPatterns = {
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
/**
 * Filter tags based on criteria
 */
export function filterTags(tags, filter) {
    let result = [...tags];
    // Filter by prefix
    if (filter.prefixes && filter.prefixes.length > 0) {
        result = result.filter(tag => filter.prefixes.some(prefix => tag.startsWith(prefix)));
    }
    // Include filter
    if (filter.include && filter.include.length > 0) {
        const includeNormalized = filter.include.map(normalizeTag);
        if (filter.matchAll) {
            // All include tags must be present
            const hasAll = includeNormalized.every(inc => result.some(tag => tag.includes(inc)));
            if (!hasAll) {
                return [];
            }
        }
        else {
            // Any include tag matches
            result = result.filter(tag => includeNormalized.some(inc => tag.includes(inc)));
        }
    }
    // Exclude filter
    if (filter.exclude && filter.exclude.length > 0) {
        const excludeNormalized = filter.exclude.map(normalizeTag);
        result = result.filter(tag => !excludeNormalized.some(exc => tag.includes(exc)));
    }
    return result;
}
/**
 * Check if tags match a filter
 */
export function tagsMatchFilter(tags, filter) {
    const filtered = filterTags(tags, filter);
    return filtered.length > 0;
}
// ============================================================================
// Tag Analysis
// ============================================================================
/**
 * Analyze tags to extract metadata
 */
export function analyzeTags(tags) {
    const parsed = tags.map(parseTag);
    const getValueByPrefix = (prefix) => {
        const tag = parsed.find(p => p.prefix === prefix);
        return tag?.value;
    };
    const getValuesByPrefix = (prefix) => {
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
export function getTagStatistics(tagArrays) {
    const allTags = tagArrays.flat();
    const tagCounts = new Map();
    const prefixCounts = {};
    for (const tag of allTags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        const parsed = parseTag(tag);
        if (parsed.prefix) {
            prefixCounts[parsed.prefix] = (prefixCounts[parsed.prefix] || 0) + 1;
        }
        else {
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
//# sourceMappingURL=tagging.js.map