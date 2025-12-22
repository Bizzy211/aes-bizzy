/**
 * Task Master AI MCP server installer
 *
 * Installs and configures task-master-ai as an MCP server with AI model selection.
 */
import type { TaskMasterModel, ToolTier, ModelProvider, TaskMasterInstallResult, MCPServerStatus, ModelConfig } from '../types/task-master.js';
import { TOOL_TIERS } from '../types/task-master.js';
/**
 * Get model configuration by ID
 */
export declare function getModelConfig(modelId: TaskMasterModel): ModelConfig | undefined;
/**
 * Get provider for a model
 */
export declare function getModelProvider(modelId: TaskMasterModel): ModelProvider | undefined;
/**
 * Get environment variable name for provider
 */
export declare function getProviderEnvVar(provider: ModelProvider): string;
/**
 * Check if API key is available for a provider
 */
export declare function hasApiKey(provider: ModelProvider): boolean;
/**
 * Check if Task Master MCP server is installed
 */
export declare function isTaskMasterInstalled(): Promise<MCPServerStatus>;
/**
 * Select AI model interactively
 */
export declare function selectModel(skipPrompt?: boolean): Promise<TaskMasterModel | undefined>;
/**
 * Select tool tier interactively
 */
export declare function selectToolTier(skipPrompt?: boolean): Promise<ToolTier>;
/**
 * Build environment variables for MCP server
 */
export declare function buildEnvVars(provider: ModelProvider, tier: ToolTier, apiKey?: string): Record<string, string>;
/**
 * Install Task Master MCP server
 */
export declare function installTaskMaster(options: {
    model?: TaskMasterModel;
    tier?: ToolTier;
    skipPrompt?: boolean;
    showSpinner?: boolean;
}): Promise<TaskMasterInstallResult>;
/**
 * Upgrade tool tier
 */
export declare function upgradeToolTier(tier: ToolTier): Promise<boolean>;
/**
 * Uninstall Task Master MCP server
 */
export declare function uninstallTaskMaster(options: {
    showSpinner?: boolean;
}): Promise<TaskMasterInstallResult>;
/**
 * Validate Task Master MCP server is working
 */
export declare function validateTaskMaster(): Promise<{
    valid: boolean;
    error?: string;
}>;
/**
 * Get available models for selection
 */
export declare function getAvailableModels(): ModelConfig[];
/**
 * Get tool tier information
 */
export declare function getToolTierInfo(tier: ToolTier): typeof TOOL_TIERS[ToolTier];
//# sourceMappingURL=task-master.d.ts.map