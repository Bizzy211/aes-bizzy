/**
 * Types for agent-index.json registry
 */
/**
 * Agent tier for installation categorization
 */
export type AgentTier = 'essential' | 'recommended' | 'full';
/**
 * Agent registry entry
 */
export interface AgentRegistryEntry {
    /** Unique agent identifier (kebab-case) */
    id: string;
    /** Display name */
    name: string;
    /** Brief description of agent's purpose */
    description: string;
    /** Path to agent definition file relative to repository root */
    path: string;
    /** List of agent capabilities for matching tasks */
    capabilities: string[];
    /** Claude Code tools this agent can use */
    tools: string[];
    /** MCP servers required by this agent */
    mcpServers: string[];
    /** Priority level (1 = highest) */
    priority: number;
    /** Whether this is an essential core agent */
    essential: boolean;
    /** Installation tier */
    tier: AgentTier;
}
/**
 * Meta agent entry (special agent for generating other agents)
 */
export interface MetaAgentEntry extends AgentRegistryEntry {
    /** Generated agents created by this meta-agent */
    generatedCount?: number;
}
/**
 * Agent registry statistics
 */
export interface AgentRegistryStats {
    totalCoreAgents: number;
    totalMetaAgents: number;
    totalGeneratedAgents: number;
    totalAgents: number;
}
/**
 * Complete agent registry schema
 */
export interface AgentRegistry {
    /** Schema version */
    version: string;
    /** Last updated timestamp */
    lastUpdated: string;
    /** Core agents (manually maintained) */
    coreAgents: AgentRegistryEntry[];
    /** Meta-agent for generating new agents */
    metaAgent: MetaAgentEntry;
    /** Dynamically generated agents */
    generatedAgents: AgentRegistryEntry[];
    /** Registry statistics */
    stats: AgentRegistryStats;
}
/**
 * Agent lookup result
 */
export interface AgentLookupResult {
    found: boolean;
    agent?: AgentRegistryEntry;
    category?: 'core' | 'meta' | 'generated';
}
/**
 * Find an agent by ID in the registry
 */
export declare function findAgentById(registry: AgentRegistry, id: string): AgentLookupResult;
/**
 * Get all agent IDs from the registry
 */
export declare function getAllAgentIds(registry: AgentRegistry): string[];
/**
 * Get agents by capability
 */
export declare function getAgentsByCapability(registry: AgentRegistry, capability: string): AgentRegistryEntry[];
/**
 * Get agents by tier
 */
export declare function getAgentsByTier(registry: AgentRegistry, tier: AgentTier): AgentRegistryEntry[];
//# sourceMappingURL=agent-registry.d.ts.map