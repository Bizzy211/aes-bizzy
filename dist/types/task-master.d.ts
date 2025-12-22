/**
 * Task Master AI types
 *
 * Types for Task Master AI MCP server configuration.
 */
/**
 * Available AI models for Task Master
 */
export type TaskMasterModel = 'claude-sonnet-4-5' | 'claude-opus-4-5' | 'gpt-4o' | 'gpt-4o-mini' | 'gemini-2.0-flash' | 'perplexity-sonar';
/**
 * Model provider type
 */
export type ModelProvider = 'anthropic' | 'openai' | 'google' | 'perplexity';
/**
 * Tool tier levels for Task Master
 */
export type ToolTier = 'core' | 'standard' | 'all';
/**
 * Model configuration
 */
export interface ModelConfig {
    id: TaskMasterModel;
    name: string;
    provider: ModelProvider;
    recommended?: boolean;
    description?: string;
}
/**
 * Available model configurations
 */
export declare const AVAILABLE_MODELS: ModelConfig[];
/**
 * Tool tier configuration
 */
export interface ToolTierConfig {
    tier: ToolTier;
    toolCount: number;
    tools: string[];
    description: string;
}
/**
 * Tool tier definitions from Task Master documentation
 */
export declare const TOOL_TIERS: Record<ToolTier, ToolTierConfig>;
/**
 * Environment variables required per provider
 */
export declare const PROVIDER_ENV_VARS: Record<ModelProvider, string>;
/**
 * Result of Task Master installation
 */
export interface TaskMasterInstallResult {
    success: boolean;
    model?: TaskMasterModel;
    tier?: ToolTier;
    error?: string;
}
/**
 * Task Master configuration stored in ecosystem.json
 */
export interface TaskMasterConfig {
    installed: boolean;
    model?: TaskMasterModel;
    provider?: ModelProvider;
    tier: ToolTier;
    installedAt?: string;
}
/**
 * MCP server status
 */
export interface MCPServerStatus {
    available: boolean;
    name: string;
    version?: string;
    error?: string;
}
//# sourceMappingURL=task-master.d.ts.map