/**
 * Types for agent-index.json registry
 */
/**
 * Find an agent by ID in the registry
 */
export function findAgentById(registry, id) {
    // Check core agents
    const coreAgent = registry.coreAgents.find((a) => a.id === id);
    if (coreAgent) {
        return { found: true, agent: coreAgent, category: 'core' };
    }
    // Check meta-agent
    if (registry.metaAgent.id === id) {
        return { found: true, agent: registry.metaAgent, category: 'meta' };
    }
    // Check generated agents
    const generatedAgent = registry.generatedAgents.find((a) => a.id === id);
    if (generatedAgent) {
        return { found: true, agent: generatedAgent, category: 'generated' };
    }
    return { found: false };
}
/**
 * Get all agent IDs from the registry
 */
export function getAllAgentIds(registry) {
    const ids = [];
    ids.push(...registry.coreAgents.map((a) => a.id));
    ids.push(registry.metaAgent.id);
    ids.push(...registry.generatedAgents.map((a) => a.id));
    return ids;
}
/**
 * Get agents by capability
 */
export function getAgentsByCapability(registry, capability) {
    const agents = [];
    for (const agent of registry.coreAgents) {
        if (agent.capabilities.includes(capability)) {
            agents.push(agent);
        }
    }
    if (registry.metaAgent.capabilities.includes(capability)) {
        agents.push(registry.metaAgent);
    }
    for (const agent of registry.generatedAgents) {
        if (agent.capabilities.includes(capability)) {
            agents.push(agent);
        }
    }
    return agents;
}
/**
 * Get agents by tier
 */
export function getAgentsByTier(registry, tier) {
    const tiers = ['essential', 'recommended', 'full'];
    const tierIndex = tiers.indexOf(tier);
    // Include all agents at or below the specified tier
    const includedTiers = tiers.slice(0, tierIndex + 1);
    return registry.coreAgents.filter((a) => includedTiers.includes(a.tier));
}
//# sourceMappingURL=agent-registry.js.map