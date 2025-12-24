/**
 * Agent Type Matcher Utility
 *
 * Analyzes project context to recommend appropriate sub-agents
 * for task orchestration. Used by pm-lead and other orchestration systems.
 */
/**
 * Available agent types in the system
 */
export declare const AVAILABLE_AGENTS: readonly ["pm-lead", "general-purpose", "Explore", "Plan", "frontend-dev", "backend-dev", "mobile-dev", "fullstack-dev", "beautiful-web-designer", "animated-dashboard-architect", "enhanced-splunk-ui-dev", "splunk-xml-dev", "splunk-ui-dev", "nextjs-senior-sme", "ue5-sme", "db-architect", "ux-designer", "visual-consistency-guardian", "integration-expert", "n8n-engineer", "code-reviewer", "test-engineer", "typescript-validator", "lint-agent", "security-expert", "debugger", "devops-engineer", "docs-engineer", "meta-agent", "work-completion-summary", "claude-code-guide", "statusline-setup"];
export type AgentType = (typeof AVAILABLE_AGENTS)[number];
/**
 * Agent category for grouping
 */
export type AgentCategory = 'orchestration' | 'frontend' | 'backend' | 'mobile' | 'database' | 'design' | 'integration' | 'security' | 'testing' | 'infrastructure' | 'specialized' | 'meta';
/**
 * Agent definition with metadata
 */
export interface AgentDefinition {
    type: AgentType;
    category: AgentCategory;
    description: string;
    keywords: string[];
    /** Agents that commonly work together with this one */
    relatedAgents: AgentType[];
    /** Priority when multiple agents match (higher = more likely to be selected) */
    priority: number;
}
/**
 * Agent definitions registry
 */
export declare const AGENT_DEFINITIONS: Record<AgentType, AgentDefinition>;
/**
 * Match result with score
 */
export interface AgentMatch {
    agent: AgentType;
    score: number;
    matchedKeywords: string[];
    reason: string;
}
/**
 * Options for agent matching
 */
export interface AgentMatchOptions {
    /** Text to analyze (project description, task, etc.) */
    text: string;
    /** Maximum number of agents to return */
    maxAgents?: number;
    /** Minimum score threshold (0-100) */
    minScore?: number;
    /** Categories to include (if empty, all categories) */
    categories?: AgentCategory[];
    /** Agents to exclude */
    excludeAgents?: AgentType[];
    /** Always include pm-lead as first agent */
    includePmLead?: boolean;
}
/**
 * Analyze text and match to appropriate agents
 */
export declare function matchAgents(options: AgentMatchOptions): AgentMatch[];
/**
 * Get agents for a specific category
 */
export declare function getAgentsByCategory(category: AgentCategory): AgentType[];
/**
 * Get related agents for a given agent
 */
export declare function getRelatedAgents(agent: AgentType): AgentType[];
/**
 * Simple function to get recommended agents from a project description
 * (Used by kickoff-context.ts)
 */
export declare function getRecommendedAgents(projectDescription: string): AgentType[];
/**
 * Get agent definition
 */
export declare function getAgentDefinition(agent: AgentType): AgentDefinition | undefined;
//# sourceMappingURL=agent-matcher.d.ts.map