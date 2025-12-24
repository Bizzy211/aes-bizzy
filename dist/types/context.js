/**
 * Context management types for Beads integration
 *
 * These types support the context command functionality:
 * - aes-bizzy context add - Add new context beads
 * - aes-bizzy context search - Search by keywords, tags, type
 * - aes-bizzy context prime - Export context for agent consumption
 */
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
};
/**
 * Generate context tags from options
 */
export function generateContextTags(options) {
    const tags = [];
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
export function parseTag(tag) {
    for (const [key, prefix] of Object.entries(CONTEXT_TAG_PREFIXES)) {
        if (tag.startsWith(prefix)) {
            return {
                prefix: key,
                value: tag.slice(prefix.length),
            };
        }
    }
    return { prefix: null, value: tag };
}
/**
 * Create a tag with prefix
 */
export function createTag(prefix, value) {
    return `${CONTEXT_TAG_PREFIXES[prefix]}${value}`;
}
// ============================================================================
// Utility Functions
// ============================================================================
/**
 * Check if a bead is a context bead
 */
export function isContextBead(bead) {
    return 'contextType' in bead && 'scope' in bead;
}
/**
 * Extract context type from bead tags
 */
export function getContextType(bead) {
    for (const tag of bead.tags) {
        const parsed = parseTag(tag);
        if (parsed.prefix === 'type') {
            const validTypes = ['decision', 'learning', 'architecture', 'pattern', 'blocker', 'handoff'];
            if (validTypes.includes(parsed.value)) {
                return parsed.value;
            }
        }
    }
    return null;
}
/**
 * Extract task ID from bead tags
 */
export function getTaskId(bead) {
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
export function getProjectName(bead) {
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
export function filterByType(beads, type) {
    return beads.filter(b => b.contextType === type);
}
/**
 * Filter beads by agent
 */
export function filterByAgent(beads, agent) {
    const agentTag = createTag('agent', agent);
    return beads.filter(b => b.tags.includes(agentTag));
}
/**
 * Sort beads by relevance to a task and agent
 */
export function sortByRelevance(beads, taskId, agentType) {
    return [...beads].sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;
        // Exact task match = highest priority
        if (taskId) {
            if (getTaskId(a) === taskId)
                scoreA += 100;
            if (getTaskId(b) === taskId)
                scoreB += 100;
        }
        // Same agent = high priority
        if (agentType) {
            const agentTag = createTag('agent', agentType);
            if (a.tags.includes(agentTag))
                scoreA += 50;
            if (b.tags.includes(agentTag))
                scoreB += 50;
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
export function estimateTokens(text) {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
}
/**
 * Truncate context to fit within token limit
 */
export function truncateToTokenLimit(beads, maxTokens) {
    let totalTokens = 0;
    const result = [];
    for (const bead of beads) {
        const beadText = JSON.stringify(bead);
        const tokens = estimateTokens(beadText);
        if (totalTokens + tokens <= maxTokens) {
            result.push(bead);
            totalTokens += tokens;
        }
        else {
            break;
        }
    }
    return result;
}
//# sourceMappingURL=context.js.map