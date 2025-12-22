/**
 * Configuration Merge Logic
 *
 * Smart merge strategies for combining existing and new configurations
 * while preserving user customizations.
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
/**
 * Settings keys that should always be preserved from existing config
 */
const PRESERVED_KEYS = [
    'claudeDir',
    'editor',
    'customPaths',
    'GITHUB_TOKEN',
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
    'PERPLEXITY_API_KEY',
];
/**
 * Settings keys that contain arrays and should be merged
 */
const ARRAY_MERGE_KEYS = ['allowedTools'];
/**
 * Settings keys that contain objects and should be deep merged
 */
const OBJECT_MERGE_KEYS = ['mcpServers', 'env'];
/**
 * Merge two arrays and remove duplicates
 */
export function mergeArrays(existing, newItems) {
    const combined = [...existing, ...newItems];
    return [...new Set(combined)];
}
/**
 * Deep merge two objects
 */
export function deepMerge(target, source, preferExisting = true) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
        const targetValue = target[key];
        const sourceValue = source[key];
        if (targetValue !== undefined &&
            typeof targetValue === 'object' &&
            targetValue !== null &&
            typeof sourceValue === 'object' &&
            sourceValue !== null &&
            !Array.isArray(targetValue) &&
            !Array.isArray(sourceValue)) {
            // Recursively merge objects
            result[key] = deepMerge(targetValue, sourceValue, preferExisting);
        }
        else if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
            // Merge arrays
            result[key] = mergeArrays(targetValue, sourceValue);
        }
        else if (targetValue === undefined || !preferExisting) {
            // Add new value or override if not preferring existing
            result[key] = sourceValue;
        }
        // If preferExisting and targetValue exists, keep it
    }
    return result;
}
/**
 * Extract preserved settings from existing config
 */
export function extractPreservedSettings(existing) {
    const preserved = {};
    // Extract claudeDir
    if (typeof existing.claudeDir === 'string') {
        preserved.claudeDir = existing.claudeDir;
    }
    // Extract editor
    if (typeof existing.editor === 'string') {
        preserved.editor = existing.editor;
    }
    // Extract custom paths
    if (typeof existing.customPaths === 'object' && existing.customPaths !== null) {
        preserved.customPaths = existing.customPaths;
    }
    // Track API token presence (not values)
    const apiTokens = {};
    const envObj = existing.env;
    if (existing.GITHUB_TOKEN || envObj?.GITHUB_TOKEN) {
        apiTokens.GITHUB_TOKEN = true;
    }
    if (existing.ANTHROPIC_API_KEY || envObj?.ANTHROPIC_API_KEY) {
        apiTokens.ANTHROPIC_API_KEY = true;
    }
    if (existing.OPENAI_API_KEY || envObj?.OPENAI_API_KEY) {
        apiTokens.OPENAI_API_KEY = true;
    }
    if (existing.PERPLEXITY_API_KEY || envObj?.PERPLEXITY_API_KEY) {
        apiTokens.PERPLEXITY_API_KEY = true;
    }
    if (Object.keys(apiTokens).length > 0) {
        preserved.apiTokens = apiTokens;
    }
    // Extract allowed tools
    if (Array.isArray(existing.allowedTools)) {
        preserved.allowedTools = existing.allowedTools;
    }
    // Extract MCP servers
    if (typeof existing.mcpServers === 'object' && existing.mcpServers !== null) {
        preserved.mcpServers = existing.mcpServers;
    }
    return preserved;
}
/**
 * Merge MCP servers configuration
 * Keeps existing server configs, adds new servers, merges env variables
 */
export function mergeMCPServers(existing, newServers, preferExisting = true) {
    const result = {};
    // Start with existing servers
    for (const [name, config] of Object.entries(existing)) {
        result[name] = config;
    }
    // Add or update from new servers
    for (const [name, newConfig] of Object.entries(newServers)) {
        const existingConfig = result[name];
        if (!existingConfig) {
            // New server - add it
            result[name] = newConfig;
        }
        else if (!preferExisting) {
            // Prefer new - but preserve env credentials
            const newConfigObj = newConfig;
            const mergedEnv = mergeEnvVariables(existingConfig.env, newConfigObj.env);
            result[name] = {
                ...newConfigObj,
                env: mergedEnv,
            };
        }
        else {
            // Prefer existing - but add any new env variables
            const newConfigObj = newConfig;
            const mergedEnv = mergeEnvVariables(existingConfig.env, newConfigObj.env, true);
            result[name] = {
                ...existingConfig,
                env: mergedEnv,
            };
        }
    }
    return result;
}
/**
 * Merge environment variables, preserving credentials
 */
function mergeEnvVariables(existing, newEnv, preferExisting = true) {
    if (!existing && !newEnv)
        return {};
    if (!existing)
        return newEnv || {};
    if (!newEnv)
        return existing;
    const result = { ...existing };
    for (const [key, value] of Object.entries(newEnv)) {
        // Credential keys should always be preserved from existing
        if (isCredentialKey(key) && existing[key]) {
            continue;
        }
        // Add new non-credential keys or update if not preferring existing
        if (!result[key] || !preferExisting) {
            result[key] = value;
        }
    }
    return result;
}
/**
 * Check if a key is a credential key
 */
function isCredentialKey(key) {
    const credentialPatterns = [
        'TOKEN',
        'KEY',
        'SECRET',
        'PASSWORD',
        'CREDENTIAL',
        'AUTH',
    ];
    const upperKey = key.toUpperCase();
    return credentialPatterns.some((pattern) => upperKey.includes(pattern));
}
/**
 * Merge allowed tools arrays, deduplicating
 */
export function mergeAllowedTools(existing, newTools) {
    // Normalize tool names (trim whitespace, consistent casing)
    const normalizedExisting = existing.map((t) => t.trim());
    const normalizedNew = newTools.map((t) => t.trim());
    // Combine and deduplicate
    const combined = new Set([...normalizedExisting, ...normalizedNew]);
    return Array.from(combined).sort();
}
/**
 * Main merge function with strategy support
 */
export function mergeConfigs(existingConfig, newConfig, strategy) {
    const conflicts = [];
    let merged;
    switch (strategy) {
        case 'preserve-existing':
            merged = mergePreserveExisting(existingConfig, newConfig, conflicts);
            break;
        case 'prefer-new':
            merged = mergePreferNew(existingConfig, newConfig, conflicts);
            break;
        case 'interactive':
            // Return conflicts for user resolution
            merged = { ...existingConfig };
            detectSettingConflicts(existingConfig, newConfig, conflicts);
            break;
        default:
            merged = { ...existingConfig };
    }
    return { merged, conflicts };
}
/**
 * Merge with preserve-existing strategy
 */
function mergePreserveExisting(existing, newConfig, _conflicts) {
    const result = { ...existing };
    // Merge allowedTools
    if (Array.isArray(existing.allowedTools) || Array.isArray(newConfig.allowedTools)) {
        result.allowedTools = mergeAllowedTools(existing.allowedTools || [], newConfig.allowedTools || []);
    }
    // Merge MCP servers
    if (existing.mcpServers || newConfig.mcpServers) {
        result.mcpServers = mergeMCPServers(existing.mcpServers || {}, newConfig.mcpServers || {}, true // prefer existing
        );
    }
    // Add new keys that don't exist
    for (const key of Object.keys(newConfig)) {
        if (!(key in result) && !PRESERVED_KEYS.includes(key)) {
            result[key] = newConfig[key];
        }
    }
    return result;
}
/**
 * Merge with prefer-new strategy
 */
function mergePreferNew(existing, newConfig, _conflicts) {
    // Start with new config
    const result = { ...newConfig };
    // Preserve user-specific settings
    for (const key of PRESERVED_KEYS) {
        if (key in existing) {
            result[key] = existing[key];
        }
    }
    // Preserve environment variables with credentials
    const existingEnv = existing.env;
    const newEnv = newConfig.env;
    if (existingEnv) {
        result.env = mergeEnvVariables(existingEnv, newEnv, false);
    }
    // Merge allowedTools (combine both)
    if (Array.isArray(existing.allowedTools) || Array.isArray(newConfig.allowedTools)) {
        result.allowedTools = mergeAllowedTools(existing.allowedTools || [], newConfig.allowedTools || []);
    }
    // Merge MCP servers (prefer new but keep credentials)
    if (existing.mcpServers || newConfig.mcpServers) {
        result.mcpServers = mergeMCPServers(existing.mcpServers || {}, newConfig.mcpServers || {}, false // prefer new
        );
    }
    return result;
}
/**
 * Detect settings conflicts for interactive resolution
 */
function detectSettingConflicts(existing, newConfig, conflicts) {
    for (const key of Object.keys(newConfig)) {
        // Skip preserved keys
        if (PRESERVED_KEYS.includes(key))
            continue;
        const existingValue = existing[key];
        const newValue = newConfig[key];
        if (existingValue !== undefined && JSON.stringify(existingValue) !== JSON.stringify(newValue)) {
            conflicts.push({
                type: 'setting',
                name: key,
                existingValue,
                newValue,
                isModified: true,
                suggestedResolution: ARRAY_MERGE_KEYS.includes(key) || OBJECT_MERGE_KEYS.includes(key)
                    ? 'merge'
                    : 'backup',
            });
        }
    }
}
/**
 * Apply conflict resolutions to merged config
 */
export function applyResolutions(baseConfig, conflicts, resolutions) {
    const result = { ...baseConfig };
    for (const conflict of conflicts) {
        const resolution = resolutions.get(conflict.name) || conflict.suggestedResolution;
        switch (resolution) {
            case 'replace':
                result[conflict.name] = conflict.newValue;
                break;
            case 'skip':
                result[conflict.name] = conflict.existingValue;
                break;
            case 'merge':
                if (Array.isArray(conflict.existingValue) && Array.isArray(conflict.newValue)) {
                    result[conflict.name] = mergeArrays(conflict.existingValue, conflict.newValue);
                }
                else if (typeof conflict.existingValue === 'object' &&
                    typeof conflict.newValue === 'object' &&
                    conflict.existingValue !== null &&
                    conflict.newValue !== null) {
                    result[conflict.name] = deepMerge(conflict.existingValue, conflict.newValue);
                }
                else {
                    result[conflict.name] = conflict.newValue;
                }
                break;
            case 'backup':
                // Keep existing, new value will be backed up elsewhere
                result[conflict.name] = conflict.existingValue;
                break;
        }
    }
    return result;
}
/**
 * Read and parse a JSON configuration file
 */
export async function readConfig(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    }
    catch {
        return {};
    }
}
/**
 * Write a configuration to file
 */
export async function writeConfig(filePath, config) {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(config, null, 2), 'utf-8');
}
/**
 * Merge two settings.json files
 */
export async function mergeSettingsFiles(existingPath, newPath, outputPath, strategy) {
    try {
        const existing = await readConfig(existingPath);
        const newConfig = await readConfig(newPath);
        const { merged, conflicts } = mergeConfigs(existing, newConfig, strategy);
        if (strategy !== 'interactive' || conflicts.length === 0) {
            await writeConfig(outputPath, merged);
        }
        return { success: true, conflicts };
    }
    catch {
        return {
            success: false,
            conflicts: [{
                    type: 'setting',
                    name: 'file',
                    existingValue: existingPath,
                    newValue: newPath,
                    isModified: true,
                    suggestedResolution: 'backup',
                }],
        };
    }
}
//# sourceMappingURL=merge-config.js.map