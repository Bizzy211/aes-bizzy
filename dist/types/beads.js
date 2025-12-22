/**
 * Beads CLI types for agent assignment workflow
 *
 * These types support the --assign flag functionality:
 * - bd create --assign <agent-name> - Assign task to agent during creation
 * - bd ready --assigned <agent-name> - Filter tasks by assigned agent
 */
/**
 * Agent tag prefix used for assignment tracking
 * Format: agent:<agent-name>
 */
export const AGENT_TAG_PREFIX = 'agent:';
/**
 * Extract agent name from agent tag
 */
export function extractAgentFromTag(tag) {
    if (tag.startsWith(AGENT_TAG_PREFIX)) {
        return tag.slice(AGENT_TAG_PREFIX.length);
    }
    return null;
}
/**
 * Create agent tag from agent name
 */
export function createAgentTag(agentName) {
    return `${AGENT_TAG_PREFIX}${agentName}`;
}
/**
 * Check if a bead is assigned to a specific agent
 */
export function isAssignedTo(bead, agentName) {
    const agentTag = createAgentTag(agentName);
    return bead.tags.includes(agentTag);
}
/**
 * Get assigned agent from bead tags
 */
export function getAssignedAgent(bead) {
    for (const tag of bead.tags) {
        const agent = extractAgentFromTag(tag);
        if (agent)
            return agent;
    }
    return null;
}
//# sourceMappingURL=beads.js.map