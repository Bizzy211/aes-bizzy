/**
 * Task Master AI MCP server installer
 *
 * Installs and configures task-master-ai as an MCP server with AI model selection.
 */
import * as prompts from '@clack/prompts';
import { executeCommand, execCommandWithSpinner } from '../utils/shell.js';
import { createLogger } from '../utils/logger.js';
import { AVAILABLE_MODELS, TOOL_TIERS, PROVIDER_ENV_VARS, } from '../types/task-master.js';
const logger = createLogger({ context: { module: 'task-master-installer' } });
const TASK_MASTER_PACKAGE = 'task-master-ai';
/**
 * Get model configuration by ID
 */
export function getModelConfig(modelId) {
    return AVAILABLE_MODELS.find((m) => m.id === modelId);
}
/**
 * Get provider for a model
 */
export function getModelProvider(modelId) {
    return getModelConfig(modelId)?.provider;
}
/**
 * Get environment variable name for provider
 */
export function getProviderEnvVar(provider) {
    return PROVIDER_ENV_VARS[provider];
}
/**
 * Check if API key is available for a provider
 */
export function hasApiKey(provider) {
    const envVar = PROVIDER_ENV_VARS[provider];
    return !!process.env[envVar];
}
/**
 * Check if Task Master MCP server is installed
 */
export async function isTaskMasterInstalled() {
    try {
        const result = await executeCommand('claude', ['mcp', 'list']);
        if (result.exitCode !== 0) {
            return {
                available: false,
                name: TASK_MASTER_PACKAGE,
                error: 'Failed to list MCP servers',
            };
        }
        const isInstalled = result.stdout.includes(TASK_MASTER_PACKAGE);
        return {
            available: isInstalled,
            name: TASK_MASTER_PACKAGE,
        };
    }
    catch (error) {
        return {
            available: false,
            name: TASK_MASTER_PACKAGE,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
/**
 * Select AI model interactively
 */
export async function selectModel(skipPrompt = false) {
    if (skipPrompt) {
        // Return recommended model
        const recommended = AVAILABLE_MODELS.find((m) => m.recommended);
        return recommended?.id;
    }
    const modelOptions = AVAILABLE_MODELS.map((model) => ({
        value: model.id,
        label: model.name,
        hint: model.description + (model.recommended ? ' (recommended)' : ''),
    }));
    const selected = await prompts.select({
        message: 'Select the AI model for Task Master:',
        options: modelOptions,
        initialValue: AVAILABLE_MODELS.find((m) => m.recommended)?.id,
    });
    if (prompts.isCancel(selected)) {
        return undefined;
    }
    return selected;
}
/**
 * Select tool tier interactively
 */
export async function selectToolTier(skipPrompt = false) {
    if (skipPrompt) {
        return 'core';
    }
    const tierOptions = Object.entries(TOOL_TIERS).map(([tier, config]) => ({
        value: tier,
        label: `${tier.charAt(0).toUpperCase() + tier.slice(1)} (${config.toolCount} tools)`,
        hint: config.description,
    }));
    const selected = await prompts.select({
        message: 'Select the tool tier:',
        options: tierOptions,
        initialValue: 'core',
    });
    if (prompts.isCancel(selected)) {
        return 'core';
    }
    return selected;
}
/**
 * Build environment variables for MCP server
 */
export function buildEnvVars(provider, tier, apiKey) {
    const env = {
        TASK_MASTER_TOOLS: tier,
    };
    // Add API key if provided
    if (apiKey) {
        env[PROVIDER_ENV_VARS[provider]] = apiKey;
    }
    return env;
}
/**
 * Install Task Master MCP server
 */
export async function installTaskMaster(options) {
    const { skipPrompt = false, showSpinner = true } = options;
    let { model, tier } = options;
    // Check if already installed
    const status = await isTaskMasterInstalled();
    if (status.available) {
        logger.info('Task Master MCP server is already installed');
        return {
            success: true,
            model,
            tier: tier || 'core',
        };
    }
    // Select model if not provided
    if (!model) {
        model = await selectModel(skipPrompt);
        if (!model) {
            return {
                success: false,
                error: 'Model selection cancelled',
            };
        }
    }
    // Select tier if not provided
    if (!tier) {
        tier = await selectToolTier(skipPrompt);
    }
    // Get provider for model
    const provider = getModelProvider(model);
    if (!provider) {
        return {
            success: false,
            error: `Unknown model: ${model}`,
        };
    }
    // Check for API key
    if (!hasApiKey(provider)) {
        const envVar = getProviderEnvVar(provider);
        logger.warn(`${envVar} not found in environment`);
        if (!skipPrompt) {
            const apiKey = await prompts.password({
                message: `Enter your ${envVar}:`,
            });
            if (prompts.isCancel(apiKey) || !apiKey) {
                return {
                    success: false,
                    error: 'API key not provided',
                };
            }
            // Set for this process
            process.env[envVar] = apiKey;
        }
        else {
            return {
                success: false,
                error: `${envVar} is required but not set`,
            };
        }
    }
    // Build MCP add command
    // claude mcp add task-master-ai -s user -- npx -y task-master-ai
    const args = ['mcp', 'add', TASK_MASTER_PACKAGE, '-s', 'user', '--', 'npx', '-y', TASK_MASTER_PACKAGE];
    try {
        logger.debug(`Installing Task Master with model: ${model}, tier: ${tier}`);
        let result;
        if (showSpinner) {
            result = await execCommandWithSpinner('claude', args, {
                spinnerText: 'Installing Task Master MCP server...',
            });
        }
        else {
            result = await executeCommand('claude', args);
        }
        if (result.exitCode !== 0) {
            return {
                success: false,
                error: result.stderr || 'MCP server installation failed',
            };
        }
        // Verify installation
        const verification = await isTaskMasterInstalled();
        if (!verification.available) {
            return {
                success: false,
                error: 'Installation completed but MCP server not found',
            };
        }
        logger.success(`Task Master installed with ${model} (${tier} tier)`);
        return {
            success: true,
            model,
            tier,
        };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
/**
 * Upgrade tool tier
 */
export async function upgradeToolTier(tier) {
    try {
        // This would modify the MCP server configuration
        // The actual implementation depends on how Claude Code stores MCP env vars
        logger.info(`Upgrading Task Master to ${tier} tier (${TOOL_TIERS[tier].toolCount} tools)`);
        // For now, we just log the change
        // Full implementation would modify .mcp.json or Claude Code settings
        logger.warn('Tool tier upgrade requires manual configuration update');
        logger.info(`Set TASK_MASTER_TOOLS=${tier} in your MCP server configuration`);
        return true;
    }
    catch (error) {
        logger.error(`Failed to upgrade tool tier: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
}
/**
 * Uninstall Task Master MCP server
 */
export async function uninstallTaskMaster(options) {
    const { showSpinner = true } = options;
    // Check if installed
    const status = await isTaskMasterInstalled();
    if (!status.available) {
        logger.info('Task Master MCP server is not installed');
        return { success: true };
    }
    try {
        const args = ['mcp', 'remove', TASK_MASTER_PACKAGE];
        let result;
        if (showSpinner) {
            result = await execCommandWithSpinner('claude', args, {
                spinnerText: 'Removing Task Master MCP server...',
            });
        }
        else {
            result = await executeCommand('claude', args);
        }
        if (result.exitCode !== 0) {
            return {
                success: false,
                error: result.stderr || 'Failed to remove MCP server',
            };
        }
        logger.success('Task Master MCP server removed');
        return { success: true };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
/**
 * Validate Task Master MCP server is working
 */
export async function validateTaskMaster() {
    try {
        // Try to call a simple MCP tool
        const result = await executeCommand('claude', ['mcp', 'call', TASK_MASTER_PACKAGE, 'get_tasks']);
        // Even if get_tasks returns an error (no tasks), the call should succeed
        if (result.exitCode === 0 || result.stdout.includes('tasks')) {
            return { valid: true };
        }
        return {
            valid: false,
            error: result.stderr || 'MCP server validation failed',
        };
    }
    catch (error) {
        return {
            valid: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
/**
 * Get available models for selection
 */
export function getAvailableModels() {
    return AVAILABLE_MODELS;
}
/**
 * Get tool tier information
 */
export function getToolTierInfo(tier) {
    return TOOL_TIERS[tier];
}
//# sourceMappingURL=task-master.js.map