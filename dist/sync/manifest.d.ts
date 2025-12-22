/**
 * Manifest loading and filtering utilities for repo-sync
 */
import type { ManifestConfig, ManifestFile, ManifestTier, ComponentCategory, AvailableManifests, ComponentFile, ComponentType } from '../types/repo-sync.js';
/**
 * Load a manifest file from a path
 */
export declare function loadManifest(manifestPath: string): Promise<ManifestConfig | null>;
/**
 * Load a manifest by tier name
 */
export declare function loadManifestByTier(repoPath: string, tier: ManifestTier): Promise<ManifestConfig | null>;
/**
 * Discover all available manifests in the repository
 */
export declare function discoverManifests(repoPath: string): Promise<AvailableManifests>;
/**
 * Filter manifest files by categories
 */
export declare function filterByCategories(manifest: ManifestConfig, categories: ComponentCategory[]): ManifestFile[];
/**
 * Filter manifest files to only required/essential ones
 */
export declare function filterRequired(manifest: ManifestConfig): ManifestFile[];
/**
 * Convert manifest files to ComponentFile format for sync
 */
export declare function manifestFilesToComponentFiles(manifestFiles: ManifestFile[], repoPath: string): ComponentFile[];
/**
 * Infer component type from file path
 */
export declare function inferComponentType(filePath: string): ComponentType;
/**
 * Get summary of manifest contents
 */
export declare function getManifestSummary(manifest: ManifestConfig): {
    totalFiles: number;
    byCategory: Record<ComponentCategory, number>;
    requiredCount: number;
};
/**
 * Resolve dependencies for a set of manifest files
 * Returns files in dependency order with all dependencies included
 */
export declare function resolveDependencies(selectedFiles: ManifestFile[], manifest: ManifestConfig): ManifestFile[];
/**
 * Validate manifest structure
 */
export declare function validateManifest(manifest: ManifestConfig): {
    valid: boolean;
    errors: string[];
};
/**
 * Merge multiple manifests into one
 */
export declare function mergeManifests(manifests: ManifestConfig[]): ManifestConfig;
//# sourceMappingURL=manifest.d.ts.map