/**
 * Configuration Merge Logic
 *
 * Smart merge strategies for combining existing and new configurations
 * while preserving user customizations.
 */
import type { MergeStrategy, Conflict, ConflictResolution, PreservedSettings } from '../types/detection.js';
/**
 * Merge two arrays and remove duplicates
 */
export declare function mergeArrays<T>(existing: T[], newItems: T[]): T[];
/**
 * Deep merge two objects
 */
export declare function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>, preferExisting?: boolean): Record<string, unknown>;
/**
 * Extract preserved settings from existing config
 */
export declare function extractPreservedSettings(existing: Record<string, unknown>): PreservedSettings;
/**
 * Merge MCP servers configuration
 * Keeps existing server configs, adds new servers, merges env variables
 */
export declare function mergeMCPServers(existing: Record<string, unknown>, newServers: Record<string, unknown>, preferExisting?: boolean): Record<string, unknown>;
/**
 * Merge allowed tools arrays, deduplicating
 */
export declare function mergeAllowedTools(existing: string[], newTools: string[]): string[];
/**
 * Main merge function with strategy support
 */
export declare function mergeConfigs(existingConfig: Record<string, unknown>, newConfig: Record<string, unknown>, strategy: MergeStrategy): {
    merged: Record<string, unknown>;
    conflicts: Conflict[];
};
/**
 * Apply conflict resolutions to merged config
 */
export declare function applyResolutions(baseConfig: Record<string, unknown>, conflicts: Conflict[], resolutions: Map<string, ConflictResolution>): Record<string, unknown>;
/**
 * Read and parse a JSON configuration file
 */
export declare function readConfig(filePath: string): Promise<Record<string, unknown>>;
/**
 * Write a configuration to file
 */
export declare function writeConfig(filePath: string, config: Record<string, unknown>): Promise<void>;
/**
 * Merge two settings.json files
 */
export declare function mergeSettingsFiles(existingPath: string, newPath: string, outputPath: string, strategy: MergeStrategy): Promise<{
    success: boolean;
    conflicts: Conflict[];
}>;
//# sourceMappingURL=merge-config.d.ts.map