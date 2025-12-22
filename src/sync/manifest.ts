/**
 * Manifest loading and filtering utilities for repo-sync
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { existsSync } from 'node:fs';
import { logger } from '../utils/logger.js';
import type {
  ManifestConfig,
  ManifestFile,
  ManifestTier,
  ComponentCategory,
  AvailableManifests,
  ComponentFile,
  ComponentType,
} from '../types/repo-sync.js';
import { MANIFEST_PATHS } from '../types/repo-sync.js';

/**
 * Load a manifest file from a path
 */
export async function loadManifest(manifestPath: string): Promise<ManifestConfig | null> {
  try {
    if (!existsSync(manifestPath)) {
      logger.debug(`Manifest not found at: ${manifestPath}`);
      return null;
    }

    const content = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(content) as ManifestConfig;

    // Validate required fields
    if (!manifest.name || !manifest.files || !Array.isArray(manifest.files)) {
      logger.warn(`Invalid manifest at ${manifestPath}: missing required fields`);
      return null;
    }

    logger.debug(`Loaded manifest '${manifest.name}' with ${manifest.files.length} files`);
    return manifest;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to load manifest from ${manifestPath}: ${message}`);
    return null;
  }
}

/**
 * Load a manifest by tier name
 */
export async function loadManifestByTier(
  repoPath: string,
  tier: ManifestTier
): Promise<ManifestConfig | null> {
  const manifestPath = path.join(repoPath, MANIFEST_PATHS[tier]);
  return loadManifest(manifestPath);
}

/**
 * Discover all available manifests in the repository
 */
export async function discoverManifests(repoPath: string): Promise<AvailableManifests> {
  const result: AvailableManifests = {
    essential: null,
    recommended: null,
    full: null,
    custom: [],
  };

  // Load standard manifests
  result.essential = await loadManifestByTier(repoPath, 'essential');
  result.recommended = await loadManifestByTier(repoPath, 'recommended');
  result.full = await loadManifestByTier(repoPath, 'full');

  // Discover custom manifests
  const manifestsDir = path.join(repoPath, 'manifests');
  if (existsSync(manifestsDir)) {
    try {
      const entries = await fs.readdir(manifestsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.json')) {
          // Skip standard manifests
          if (['essential.json', 'recommended.json', 'full.json'].includes(entry.name)) {
            continue;
          }

          const customManifest = await loadManifest(path.join(manifestsDir, entry.name));
          if (customManifest) {
            result.custom.push(customManifest);
          }
        }
      }
    } catch (error) {
      logger.debug(`Error scanning manifests directory: ${error}`);
    }
  }

  return result;
}

/**
 * Filter manifest files by categories
 */
export function filterByCategories(
  manifest: ManifestConfig,
  categories: ComponentCategory[]
): ManifestFile[] {
  if (categories.length === 0) {
    return manifest.files;
  }

  return manifest.files.filter((file) => categories.includes(file.category));
}

/**
 * Filter manifest files to only required/essential ones
 */
export function filterRequired(manifest: ManifestConfig): ManifestFile[] {
  return manifest.files.filter((file) => file.required === true);
}

/**
 * Convert manifest files to ComponentFile format for sync
 */
export function manifestFilesToComponentFiles(
  manifestFiles: ManifestFile[],
  repoPath: string
): ComponentFile[] {
  return manifestFiles.map((mf) => {
    const fullPath = path.join(repoPath, mf.path);
    const componentType = inferComponentType(mf.path);

    // Use default values - actual file stats will be obtained during sync
    const size = 0;
    const modified = new Date().toISOString();

    return {
      name: path.basename(mf.path),
      path: fullPath,
      relativePath: mf.path,
      type: componentType,
      size,
      modified,
    };
  });
}

/**
 * Infer component type from file path
 */
export function inferComponentType(filePath: string): ComponentType {
  const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();

  if (normalizedPath.includes('agents/')) {
    return 'agents';
  }
  if (normalizedPath.includes('hooks/')) {
    return 'hooks';
  }
  if (normalizedPath.includes('skills/')) {
    return 'skills';
  }
  if (normalizedPath.includes('scripts/')) {
    return 'scripts';
  }
  if (normalizedPath.includes('commands/') || normalizedPath.includes('slash-commands/')) {
    return 'slash-commands';
  }

  // Default based on extension
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.md') {
    return 'agents'; // Most .md files are agent definitions
  }
  if (ext === '.py') {
    return 'hooks';
  }
  if (ext === '.ts' || ext === '.js') {
    return 'scripts';
  }

  return 'agents'; // Default fallback
}

/**
 * Get summary of manifest contents
 */
export function getManifestSummary(manifest: ManifestConfig): {
  totalFiles: number;
  byCategory: Record<ComponentCategory, number>;
  requiredCount: number;
} {
  const byCategory = {} as Record<ComponentCategory, number>;

  for (const file of manifest.files) {
    byCategory[file.category] = (byCategory[file.category] || 0) + 1;
  }

  return {
    totalFiles: manifest.files.length,
    byCategory,
    requiredCount: manifest.files.filter((f) => f.required).length,
  };
}

/**
 * Resolve dependencies for a set of manifest files
 * Returns files in dependency order with all dependencies included
 */
export function resolveDependencies(
  selectedFiles: ManifestFile[],
  manifest: ManifestConfig
): ManifestFile[] {
  const allFiles = new Map(manifest.files.map((f) => [f.path, f]));
  const resolved = new Set<string>();
  const result: ManifestFile[] = [];

  function addWithDependencies(file: ManifestFile): void {
    if (resolved.has(file.path)) {
      return;
    }

    // Add dependencies first
    if (file.dependencies) {
      for (const depPath of file.dependencies) {
        const dep = allFiles.get(depPath);
        if (dep) {
          addWithDependencies(dep);
        }
      }
    }

    resolved.add(file.path);
    result.push(file);
  }

  for (const file of selectedFiles) {
    addWithDependencies(file);
  }

  return result;
}

/**
 * Validate manifest structure
 */
export function validateManifest(manifest: ManifestConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!manifest.name || typeof manifest.name !== 'string') {
    errors.push('Missing or invalid "name" field');
  }

  if (!manifest.version || typeof manifest.version !== 'string') {
    errors.push('Missing or invalid "version" field');
  }

  if (!Array.isArray(manifest.files)) {
    errors.push('"files" must be an array');
  } else {
    manifest.files.forEach((file, i) => {
      if (!file || !file.path || typeof file.path !== 'string') {
        errors.push(`File at index ${i}: missing or invalid "path"`);
      }
      if (!file || !file.category || typeof file.category !== 'string') {
        errors.push(`File at index ${i}: missing or invalid "category"`);
      }
    });
  }

  if (!Array.isArray(manifest.categories)) {
    errors.push('"categories" must be an array');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Merge multiple manifests into one
 */
export function mergeManifests(manifests: ManifestConfig[]): ManifestConfig {
  const merged: ManifestConfig = {
    name: 'merged',
    version: '1.0.0',
    description: `Merged from: ${manifests.map((m) => m.name).join(', ')}`,
    categories: [],
    files: [],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  const seenPaths = new Set<string>();
  const seenCategories = new Set<ComponentCategory>();

  for (const manifest of manifests) {
    // Add unique files
    for (const file of manifest.files) {
      if (!seenPaths.has(file.path)) {
        seenPaths.add(file.path);
        merged.files.push(file);
      }
    }

    // Add unique categories
    for (const category of manifest.categories) {
      seenCategories.add(category);
    }
  }

  merged.categories = Array.from(seenCategories);

  return merged;
}
