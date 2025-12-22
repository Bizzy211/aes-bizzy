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
export function findAgentById(registry: AgentRegistry, id: string): AgentLookupResult {
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
export function getAllAgentIds(registry: AgentRegistry): string[] {
  const ids: string[] = [];

  ids.push(...registry.coreAgents.map((a) => a.id));
  ids.push(registry.metaAgent.id);
  ids.push(...registry.generatedAgents.map((a) => a.id));

  return ids;
}

/**
 * Get agents by capability
 */
export function getAgentsByCapability(
  registry: AgentRegistry,
  capability: string
): AgentRegistryEntry[] {
  const agents: AgentRegistryEntry[] = [];

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
export function getAgentsByTier(
  registry: AgentRegistry,
  tier: AgentTier
): AgentRegistryEntry[] {
  const tiers: AgentTier[] = ['essential', 'recommended', 'full'];
  const tierIndex = tiers.indexOf(tier);

  // Include all agents at or below the specified tier
  const includedTiers = tiers.slice(0, tierIndex + 1);

  return registry.coreAgents.filter((a) =>
    includedTiers.includes(a.tier as AgentTier)
  );
}
