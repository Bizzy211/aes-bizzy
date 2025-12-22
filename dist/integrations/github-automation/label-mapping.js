/**
 * Label-to-Agent Mapping System
 *
 * Manages mappings between GitHub issue labels and Claude sub-agents
 * for intelligent automated assignment.
 */
import { loadAgentCapabilities, LABEL_SPECIALIZATION_MAP } from './agent-capabilities.js';
/**
 * Default label-to-agent mappings
 * Priority: 1 = highest, 10 = lowest
 */
const DEFAULT_LABEL_MAPPINGS = [
    // Bug-related labels
    { label: 'bug', agents: ['debugger'], priority: 1 },
    { label: 'error', agents: ['debugger'], priority: 1 },
    { label: 'crash', agents: ['debugger', 'devops-engineer'], priority: 1 },
    // Frontend labels
    { label: 'ui', agents: ['frontend-dev', 'ux-designer'], priority: 2 },
    { label: 'ux', agents: ['ux-designer', 'frontend-dev'], priority: 2 },
    { label: 'ui/ux', agents: ['frontend-dev', 'ux-designer'], priority: 2 },
    { label: 'frontend', agents: ['frontend-dev'], priority: 2 },
    { label: 'css', agents: ['frontend-dev'], priority: 3 },
    { label: 'styling', agents: ['frontend-dev', 'beautiful-web-designer'], priority: 3 },
    { label: 'animation', agents: ['animated-dashboard-architect', 'frontend-dev'], priority: 3 },
    { label: 'dashboard', agents: ['animated-dashboard-architect', 'splunk-xml-dev'], priority: 2 },
    { label: 'component', agents: ['frontend-dev'], priority: 3 },
    { label: 'responsive', agents: ['frontend-dev'], priority: 3 },
    // Backend labels
    { label: 'api', agents: ['backend-dev', 'integration-expert'], priority: 2 },
    { label: 'backend', agents: ['backend-dev'], priority: 2 },
    { label: 'server', agents: ['backend-dev', 'devops-engineer'], priority: 2 },
    { label: 'rest', agents: ['backend-dev', 'integration-expert'], priority: 3 },
    { label: 'graphql', agents: ['backend-dev'], priority: 3 },
    // Database labels
    { label: 'database', agents: ['db-architect'], priority: 2 },
    { label: 'db', agents: ['db-architect'], priority: 2 },
    { label: 'sql', agents: ['db-architect'], priority: 3 },
    { label: 'migration', agents: ['db-architect'], priority: 3 },
    { label: 'schema', agents: ['db-architect'], priority: 3 },
    // Security labels
    { label: 'security', agents: ['security-expert'], priority: 1 },
    { label: 'vulnerability', agents: ['security-expert'], priority: 1 },
    { label: 'auth', agents: ['security-expert', 'backend-dev'], priority: 2 },
    { label: 'authentication', agents: ['security-expert', 'backend-dev'], priority: 2 },
    { label: 'authorization', agents: ['security-expert'], priority: 2 },
    // Testing labels
    { label: 'testing', agents: ['test-engineer'], priority: 2 },
    { label: 'test', agents: ['test-engineer'], priority: 2 },
    { label: 'tests', agents: ['test-engineer'], priority: 2 },
    { label: 'qa', agents: ['test-engineer'], priority: 2 },
    { label: 'coverage', agents: ['test-engineer'], priority: 3 },
    { label: 'e2e', agents: ['test-engineer'], priority: 3 },
    // DevOps/Infrastructure labels
    { label: 'devops', agents: ['devops-engineer'], priority: 2 },
    { label: 'infrastructure', agents: ['devops-engineer'], priority: 2 },
    { label: 'ci/cd', agents: ['devops-engineer'], priority: 2 },
    { label: 'cicd', agents: ['devops-engineer'], priority: 2 },
    { label: 'deployment', agents: ['devops-engineer'], priority: 2 },
    { label: 'docker', agents: ['devops-engineer'], priority: 3 },
    { label: 'kubernetes', agents: ['devops-engineer'], priority: 3 },
    { label: 'k8s', agents: ['devops-engineer'], priority: 3 },
    // Documentation labels
    { label: 'documentation', agents: ['docs-engineer'], priority: 2 },
    { label: 'docs', agents: ['docs-engineer'], priority: 2 },
    { label: 'readme', agents: ['docs-engineer'], priority: 3 },
    // Mobile labels
    { label: 'mobile', agents: ['mobile-dev'], priority: 2 },
    { label: 'ios', agents: ['mobile-dev'], priority: 2 },
    { label: 'android', agents: ['mobile-dev'], priority: 2 },
    { label: 'react-native', agents: ['mobile-dev'], priority: 2 },
    // Integration labels
    { label: 'integration', agents: ['integration-expert'], priority: 2 },
    { label: 'webhook', agents: ['integration-expert'], priority: 3 },
    { label: 'third-party', agents: ['integration-expert'], priority: 3 },
    // Splunk labels
    { label: 'splunk', agents: ['splunk-ui-dev', 'enhanced-splunk-ui-dev', 'splunk-xml-dev'], priority: 2 },
    { label: 'spl', agents: ['splunk-xml-dev'], priority: 3 },
    // Workflow/Automation labels
    { label: 'automation', agents: ['n8n-engineer'], priority: 2 },
    { label: 'workflow', agents: ['n8n-engineer'], priority: 2 },
    { label: 'n8n', agents: ['n8n-engineer'], priority: 2 },
    // Code quality labels
    { label: 'code-review', agents: ['code-reviewer'], priority: 2 },
    { label: 'review', agents: ['code-reviewer'], priority: 3 },
    { label: 'refactor', agents: ['code-reviewer'], priority: 3 },
    { label: 'lint', agents: ['lint-agent', 'typescript-validator'], priority: 3 },
    { label: 'typescript', agents: ['typescript-validator'], priority: 3 },
    // Design labels
    { label: 'design', agents: ['ux-designer', 'beautiful-web-designer'], priority: 2 },
    { label: 'visual', agents: ['visual-consistency-guardian', 'beautiful-web-designer'], priority: 3 },
    // Project management labels
    { label: 'planning', agents: ['pm-lead'], priority: 2 },
    { label: 'epic', agents: ['pm-lead'], priority: 2 },
    { label: 'project', agents: ['pm-lead'], priority: 3 },
    // Game development
    { label: 'ue5', agents: ['ue5-sme'], priority: 2 },
    { label: 'unreal', agents: ['ue5-sme'], priority: 2 },
    { label: 'gamedev', agents: ['ue5-sme'], priority: 3 },
    // Next.js specific
    { label: 'nextjs', agents: ['nextjs-senior-sme', 'frontend-dev'], priority: 2 },
    { label: 'next.js', agents: ['nextjs-senior-sme', 'frontend-dev'], priority: 2 },
];
/**
 * Custom label mappings cache
 */
let customMappings = [];
/**
 * Get all label mappings (default + custom)
 */
export function getAllLabelMappings() {
    // Merge custom mappings with defaults, custom takes priority
    const customLabels = new Set(customMappings.map((m) => m.label.toLowerCase()));
    const defaults = DEFAULT_LABEL_MAPPINGS.filter((m) => !customLabels.has(m.label.toLowerCase()));
    return [...customMappings, ...defaults];
}
/**
 * Get agents for a specific label
 */
export function getAgentsForLabel(label) {
    const normalizedLabel = label.toLowerCase();
    const allMappings = getAllLabelMappings();
    const mapping = allMappings.find((m) => m.label.toLowerCase() === normalizedLabel);
    return mapping?.agents || [];
}
/**
 * Get agents for multiple labels, sorted by priority
 */
export function getAgentsForLabels(labels) {
    const agentScores = new Map();
    const allMappings = getAllLabelMappings();
    for (const label of labels) {
        const normalizedLabel = label.toLowerCase();
        const mapping = allMappings.find((m) => m.label.toLowerCase() === normalizedLabel);
        if (mapping) {
            // Higher priority (lower number) = higher score
            const priorityScore = 11 - mapping.priority;
            for (let i = 0; i < mapping.agents.length; i++) {
                const agent = mapping.agents[i];
                if (!agent)
                    continue;
                // First agent in list gets higher score
                const positionBonus = mapping.agents.length - i;
                const totalScore = priorityScore + positionBonus;
                const existing = agentScores.get(agent) || 0;
                agentScores.set(agent, existing + totalScore);
            }
        }
    }
    return agentScores;
}
/**
 * Add a custom label mapping
 */
export function addCustomMapping(mapping) {
    // Remove existing custom mapping for this label if exists
    customMappings = customMappings.filter((m) => m.label.toLowerCase() !== mapping.label.toLowerCase());
    customMappings.push(mapping);
}
/**
 * Remove a custom label mapping
 */
export function removeCustomMapping(label) {
    const initialLength = customMappings.length;
    customMappings = customMappings.filter((m) => m.label.toLowerCase() !== label.toLowerCase());
    return customMappings.length < initialLength;
}
/**
 * Set all custom mappings at once
 */
export function setCustomMappings(mappings) {
    customMappings = [...mappings];
}
/**
 * Clear all custom mappings
 */
export function clearCustomMappings() {
    customMappings = [];
}
/**
 * Get custom mappings only
 */
export function getCustomMappings() {
    return [...customMappings];
}
/**
 * Get default mappings only
 */
export function getDefaultMappings() {
    return [...DEFAULT_LABEL_MAPPINGS];
}
/**
 * Validate agent names in mappings against available agents
 */
export async function validateMappings(mappings, agentsDir) {
    const capabilities = await loadAgentCapabilities(agentsDir);
    const availableAgents = new Set(capabilities.keys());
    const errors = [];
    for (const mapping of mappings) {
        for (const agent of mapping.agents) {
            if (!availableAgents.has(agent)) {
                errors.push(`Label '${mapping.label}' references unknown agent '${agent}'`);
            }
        }
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
/**
 * Generate mapping suggestions based on agent capabilities
 */
export async function suggestMappingsForLabel(label, agentsDir) {
    const capabilities = await loadAgentCapabilities(agentsDir);
    const normalizedLabel = label.toLowerCase();
    const suggestions = [];
    // Check specialization map first
    const specializations = LABEL_SPECIALIZATION_MAP[normalizedLabel];
    for (const [agentName, capability] of capabilities) {
        let score = 0;
        // Check if label matches specializations from map
        if (specializations) {
            for (const spec of specializations) {
                if (capability.specializations.includes(spec)) {
                    score += 10;
                }
            }
        }
        // Check if label appears in agent keywords
        if (capability.keywords.some((k) => k.toLowerCase().includes(normalizedLabel))) {
            score += 5;
        }
        // Check if label appears in agent description
        if (capability.description.toLowerCase().includes(normalizedLabel)) {
            score += 3;
        }
        if (score > 0) {
            suggestions.push({ agent: agentName, score });
        }
    }
    // Sort by score and return agent names
    return suggestions
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((s) => s.agent);
}
/**
 * Get the best agent for a set of labels
 */
export async function getBestAgentForLabels(labels, agentsDir) {
    const agentScores = getAgentsForLabels(labels);
    if (agentScores.size === 0) {
        return null;
    }
    // Verify agents exist
    const capabilities = await loadAgentCapabilities(agentsDir);
    const availableAgents = new Set(capabilities.keys());
    // Find highest scoring available agent
    let bestAgent = null;
    let bestScore = 0;
    for (const [agent, score] of agentScores) {
        if (availableAgents.has(agent) && score > bestScore) {
            bestAgent = agent;
            bestScore = score;
        }
    }
    return bestAgent;
}
/**
 * Export mappings as JSON for configuration
 */
export function exportMappings() {
    return JSON.stringify(getAllLabelMappings(), null, 2);
}
/**
 * Import mappings from JSON configuration
 */
export function importMappings(json) {
    try {
        const mappings = JSON.parse(json);
        // Validate structure
        for (const mapping of mappings) {
            if (!mapping.label || !Array.isArray(mapping.agents) || typeof mapping.priority !== 'number') {
                return {
                    success: false,
                    error: `Invalid mapping structure: ${JSON.stringify(mapping)}`,
                };
            }
        }
        setCustomMappings(mappings);
        return { success: true };
    }
    catch (error) {
        return {
            success: false,
            error: `Failed to parse mappings: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}
/**
 * Get statistics about label mappings
 */
export function getMappingStats() {
    const allMappings = getAllLabelMappings();
    const uniqueAgents = new Set();
    const uniqueLabels = new Set();
    for (const mapping of allMappings) {
        uniqueLabels.add(mapping.label.toLowerCase());
        for (const agent of mapping.agents) {
            uniqueAgents.add(agent);
        }
    }
    return {
        totalMappings: allMappings.length,
        customMappings: customMappings.length,
        defaultMappings: DEFAULT_LABEL_MAPPINGS.length,
        uniqueAgents: uniqueAgents.size,
        uniqueLabels: uniqueLabels.size,
    };
}
//# sourceMappingURL=label-mapping.js.map