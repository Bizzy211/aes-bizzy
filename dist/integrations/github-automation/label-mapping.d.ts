/**
 * Label-to-Agent Mapping System
 *
 * Manages mappings between GitHub issue labels and Claude sub-agents
 * for intelligent automated assignment.
 */
import type { LabelMapping } from '../../types/github-automation.js';
/**
 * Get all label mappings (default + custom)
 */
export declare function getAllLabelMappings(): LabelMapping[];
/**
 * Get agents for a specific label
 */
export declare function getAgentsForLabel(label: string): string[];
/**
 * Get agents for multiple labels, sorted by priority
 */
export declare function getAgentsForLabels(labels: string[]): Map<string, number>;
/**
 * Add a custom label mapping
 */
export declare function addCustomMapping(mapping: LabelMapping): void;
/**
 * Remove a custom label mapping
 */
export declare function removeCustomMapping(label: string): boolean;
/**
 * Set all custom mappings at once
 */
export declare function setCustomMappings(mappings: LabelMapping[]): void;
/**
 * Clear all custom mappings
 */
export declare function clearCustomMappings(): void;
/**
 * Get custom mappings only
 */
export declare function getCustomMappings(): LabelMapping[];
/**
 * Get default mappings only
 */
export declare function getDefaultMappings(): LabelMapping[];
/**
 * Validate agent names in mappings against available agents
 */
export declare function validateMappings(mappings: LabelMapping[], agentsDir?: string): Promise<{
    valid: boolean;
    errors: string[];
}>;
/**
 * Generate mapping suggestions based on agent capabilities
 */
export declare function suggestMappingsForLabel(label: string, agentsDir?: string): Promise<string[]>;
/**
 * Get the best agent for a set of labels
 */
export declare function getBestAgentForLabels(labels: string[], agentsDir?: string): Promise<string | null>;
/**
 * Export mappings as JSON for configuration
 */
export declare function exportMappings(): string;
/**
 * Import mappings from JSON configuration
 */
export declare function importMappings(json: string): {
    success: boolean;
    error?: string;
};
/**
 * Get statistics about label mappings
 */
export declare function getMappingStats(): {
    totalMappings: number;
    customMappings: number;
    defaultMappings: number;
    uniqueAgents: number;
    uniqueLabels: number;
};
//# sourceMappingURL=label-mapping.d.ts.map