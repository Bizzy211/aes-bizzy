/**
 * Agent Capability Mapping System
 *
 * Parses agent markdown files to extract capabilities, keywords,
 * and specializations for intelligent issue assignment.
 */
import type { AgentCapability } from '../../types/github-automation.js';
/**
 * Label to specialization mapping for label-based matching
 */
export declare const LABEL_SPECIALIZATION_MAP: Record<string, string[]>;
/**
 * Get the agents directory path
 */
export declare function getAgentsDirectory(): string;
/**
 * Load all agent capabilities from markdown files
 */
export declare function loadAgentCapabilities(agentsDir?: string, forceReload?: boolean): Promise<Map<string, AgentCapability>>;
/**
 * Get capability for a specific agent
 */
export declare function getAgentCapability(agentName: string, agentsDir?: string): Promise<AgentCapability | null>;
/**
 * Find agents matching given keywords
 */
export declare function findAgentsByKeywords(keywords: string[], agentsDir?: string): Promise<Map<string, number>>;
/**
 * Find agents by specialization
 */
export declare function findAgentsBySpecialization(specialization: string, agentsDir?: string): Promise<AgentCapability[]>;
/**
 * Get all available agent names
 */
export declare function getAvailableAgents(agentsDir?: string): Promise<string[]>;
/**
 * Invalidate the capability cache
 */
export declare function invalidateCapabilityCache(): void;
/**
 * Build a capability map for quick lookups
 */
export declare function buildCapabilityMap(agentsDir?: string): Promise<Record<string, AgentCapability>>;
//# sourceMappingURL=agent-capabilities.d.ts.map