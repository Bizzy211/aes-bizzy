/**
 * Private repository sync functionality
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { existsSync, statSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { simpleGit } from 'simple-git';
import { logger } from '../utils/logger.js';
import { selectMultiple, confirmAction } from '../ui/prompts.js';
import { createBackup } from './backup.js';
import { createDefaultConfig } from '../config/ecosystem-config.js';
import { COMPONENT_TYPES, COMPONENT_DIRS, DEFAULT_REPO_URL, DEFAULT_REPO_OWNER, DEFAULT_REPO_NAME, DEFAULT_BRANCH, } from '../types/repo-sync.js';
import { loadManifest, loadManifestByTier, filterByCategories, manifestFilesToComponentFiles, resolveDependencies, getManifestSummary, } from './manifest.js';
/**
 * Get the relative path within a component type directory.
 * Preserves subdirectory structure for proper installation.
 *
 * Examples:
 *   - relativePath: 'skills/orchestration/bizzy.md' -> 'orchestration/bizzy.md'
 *   - relativePath: 'agents/pm-lead.md' -> 'pm-lead.md'
 *   - relativePath: 'hooks/pre-commit/lint.md' -> 'pre-commit/lint.md'
 */
function getRelativeComponentPath(component) {
    const componentTypeDir = COMPONENT_DIRS[component.type];
    // Normalize path separators for cross-platform compatibility
    const normalizedRelative = component.relativePath.replace(/\\/g, '/');
    const normalizedTypeDir = componentTypeDir.replace(/\\/g, '/');
    // If relativePath starts with the component type directory, strip it
    if (normalizedRelative.startsWith(normalizedTypeDir + '/')) {
        return normalizedRelative.slice(normalizedTypeDir.length + 1);
    }
    // Fallback to just the filename
    return path.basename(component.path);
}
/**
 * Get the Claude config directory
 */
function getClaudeDir() {
    return path.join(homedir(), '.claude');
}
/**
 * Get the ecosystem.json path
 */
function getEcosystemConfigPath() {
    return path.join(getClaudeDir(), 'ecosystem.json');
}
/**
 * Get temporary clone directory
 */
function getTempCloneDir() {
    return path.join(tmpdir(), 'claude-ecosystem-sync');
}
/**
 * Load ecosystem configuration
 */
async function loadEcosystemConfig() {
    const configPath = getEcosystemConfigPath();
    if (!existsSync(configPath)) {
        return createDefaultConfig();
    }
    try {
        const content = await fs.readFile(configPath, 'utf-8');
        const parsed = JSON.parse(content);
        // Merge with defaults to ensure all fields exist
        return { ...createDefaultConfig(), ...parsed };
    }
    catch {
        return createDefaultConfig();
    }
}
/**
 * Save ecosystem configuration
 */
async function saveEcosystemConfig(config) {
    const configPath = getEcosystemConfigPath();
    const claudeDir = getClaudeDir();
    await fs.mkdir(claudeDir, { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}
/**
 * Clone or update the repository
 */
async function cloneOrUpdateRepo(token) {
    const repoPath = getTempCloneDir();
    const repoUrl = `https://${token}@github.com/${DEFAULT_REPO_OWNER}/${DEFAULT_REPO_NAME}.git`;
    // Clean up existing clone if present
    if (existsSync(repoPath)) {
        const git = simpleGit(repoPath);
        try {
            // Try to pull updates
            await git.fetch();
            await git.pull();
            logger.info('Updated existing repository clone');
            return { git, repoPath };
        }
        catch {
            // If pull fails, remove and re-clone
            await fs.rm(repoPath, { recursive: true, force: true });
        }
    }
    // Clone fresh
    logger.info('Cloning private repository...');
    await fs.mkdir(repoPath, { recursive: true });
    const git = simpleGit();
    await git.clone(repoUrl, repoPath, ['--depth', '1', '--branch', DEFAULT_BRANCH]);
    return { git: simpleGit(repoPath), repoPath };
}
/**
 * Get repository metadata
 */
async function getRepoMetadata(git) {
    const log = await git.log({ maxCount: 1 });
    const latestCommit = log.latest;
    return {
        owner: DEFAULT_REPO_OWNER,
        repo: DEFAULT_REPO_NAME,
        branch: DEFAULT_BRANCH,
        url: DEFAULT_REPO_URL,
        commitSha: latestCommit?.hash || 'unknown',
        lastCommit: latestCommit?.date || new Date().toISOString(),
    };
}
/**
 * Discover available components in the repository
 */
async function discoverComponents(repoPath) {
    const result = {
        agents: [],
        hooks: [],
        skills: [],
        scripts: [],
        'slash-commands': [],
        metadata: {
            owner: DEFAULT_REPO_OWNER,
            repo: DEFAULT_REPO_NAME,
            branch: DEFAULT_BRANCH,
            url: DEFAULT_REPO_URL,
            commitSha: '',
            lastCommit: '',
        },
    };
    for (const componentType of COMPONENT_TYPES) {
        const componentDir = path.join(repoPath, COMPONENT_DIRS[componentType]);
        if (!existsSync(componentDir)) {
            continue;
        }
        const files = await scanDirectory(componentDir, componentType, repoPath);
        result[componentType] = files;
    }
    return result;
}
/**
 * Scan a directory for component files
 */
async function scanDirectory(dirPath, componentType, basePath) {
    const files = [];
    if (!existsSync(dirPath)) {
        return files;
    }
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        // Skip hidden files and directories
        if (entry.name.startsWith('.')) {
            continue;
        }
        if (entry.isFile()) {
            const stats = statSync(fullPath);
            files.push({
                name: entry.name,
                path: fullPath,
                relativePath: path.relative(basePath, fullPath),
                type: componentType,
                size: stats.size,
                modified: stats.mtime.toISOString(),
            });
        }
        else if (entry.isDirectory()) {
            // Recursively scan subdirectories
            const subFiles = await scanDirectory(fullPath, componentType, basePath);
            files.push(...subFiles);
        }
    }
    return files;
}
/**
 * Check for conflicts with existing files
 */
async function checkConflicts(components, targetDir) {
    const conflicts = [];
    for (const component of components) {
        const destDir = COMPONENT_DIRS[component.type];
        // Use relative component path to preserve subdirectory structure
        const relPath = getRelativeComponentPath(component);
        const targetPath = path.join(targetDir, destDir, relPath);
        if (existsSync(targetPath)) {
            const stats = statSync(targetPath);
            conflicts.push({
                file: component,
                existingPath: targetPath,
                existingModified: stats.mtime.toISOString(),
            });
        }
    }
    return conflicts;
}
/**
 * Copy a component file to the target directory
 */
async function copyComponent(component, targetDir, strategy = 'backup') {
    const destDir = path.join(targetDir, COMPONENT_DIRS[component.type]);
    // Use relative component path to preserve subdirectory structure
    const relPath = getRelativeComponentPath(component);
    const targetPath = path.join(destDir, relPath);
    // Create destination directory (including any subdirectories)
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    const exists = existsSync(targetPath);
    let action = 'created';
    if (exists) {
        switch (strategy) {
            case 'skip':
                return {
                    file: component,
                    targetPath,
                    action: 'skipped',
                };
            case 'backup': {
                // Create backup of existing file
                const backupPath = `${targetPath}.backup.${Date.now()}`;
                await fs.copyFile(targetPath, backupPath);
                action = 'updated';
                break;
            }
            case 'overwrite':
                action = 'updated';
                break;
            case 'merge':
                // For now, merge just overwrites - could be enhanced later
                action = 'merged';
                break;
        }
    }
    // Copy the file
    await fs.copyFile(component.path, targetPath);
    return {
        file: component,
        targetPath,
        action,
    };
}
/**
 * Present component selection UI
 */
async function selectComponents(available) {
    const allFiles = [
        ...available.agents,
        ...available.hooks,
        ...available.skills,
        ...available.scripts,
        ...available['slash-commands'],
    ];
    if (allFiles.length === 0) {
        logger.warn('No components found in repository');
        return undefined;
    }
    // Group by type for display
    const choices = allFiles.map((file) => ({
        value: file.relativePath,
        label: `[${file.type}] ${file.name}`,
        hint: `${(file.size / 1024).toFixed(1)} KB`,
    }));
    logger.info(`Found ${allFiles.length} components:`);
    logger.info(`  - ${available.agents.length} agents`);
    logger.info(`  - ${available.hooks.length} hooks`);
    logger.info(`  - ${available.skills.length} skills`);
    logger.info(`  - ${available.scripts.length} scripts`);
    logger.info(`  - ${available['slash-commands'].length} slash-commands`);
    const selected = await selectMultiple('Select components to sync:', choices, undefined, true);
    if (!selected) {
        return undefined;
    }
    // Map selected paths back to files
    return allFiles.filter((f) => selected.includes(f.relativePath));
}
/**
 * Resolve conflicts - uses default strategy in non-interactive mode
 */
async function resolveConflicts(conflicts, defaultStrategy, interactive = true) {
    for (const conflict of conflicts) {
        if (interactive) {
            try {
                const confirm = await confirmAction(`Conflict: ${conflict.file.name} already exists. Overwrite?`);
                conflict.strategy = confirm ? 'overwrite' : 'skip';
            }
            catch {
                // TTY not available, fall back to default strategy
                logger.debug(`Using default strategy '${defaultStrategy}' for ${conflict.file.name}`);
                conflict.strategy = defaultStrategy;
            }
        }
        else {
            // Non-interactive mode - use default strategy
            conflict.strategy = defaultStrategy;
        }
    }
    return conflicts;
}
/**
 * Sync a private repository
 */
export async function syncPrivateRepo(options) {
    const result = {
        success: false,
        synced: [],
        skipped: [],
        conflicts: [],
        errors: [],
        timestamp: new Date().toISOString(),
    };
    try {
        // Clone or update repository
        const { git, repoPath } = await cloneOrUpdateRepo(options.token);
        // Get metadata
        const metadata = await getRepoMetadata(git);
        result.commitSha = metadata.commitSha;
        // Discover available components
        const available = await discoverComponents(repoPath);
        available.metadata = metadata;
        // Select components - manifest-based or traditional selection
        let selectedComponents;
        // Check for manifest-based installation
        if (options.manifestPath || options.manifestTier) {
            // Load manifest
            let manifest = null;
            if (options.manifestPath) {
                manifest = await loadManifest(path.join(repoPath, options.manifestPath));
            }
            else if (options.manifestTier) {
                manifest = await loadManifestByTier(repoPath, options.manifestTier);
            }
            if (!manifest) {
                result.errors.push('Failed to load manifest');
                return result;
            }
            logger.info(`Using manifest: ${manifest.name} (${manifest.description})`);
            const summary = getManifestSummary(manifest);
            logger.info(`  Total files: ${summary.totalFiles}, Required: ${summary.requiredCount}`);
            // Filter by categories if specified
            let manifestFiles = options.categories && options.categories.length > 0
                ? filterByCategories(manifest, options.categories)
                : manifest.files;
            // Resolve dependencies to ensure all required files are included
            manifestFiles = resolveDependencies(manifestFiles, manifest);
            // Convert manifest files to component files
            selectedComponents = manifestFilesToComponentFiles(manifestFiles, repoPath);
            logger.info(`Selected ${selectedComponents.length} components from manifest`);
        }
        else if (options.selectAll) {
            selectedComponents = [
                ...available.agents,
                ...available.hooks,
                ...available.skills,
                ...available.scripts,
                ...available['slash-commands'],
            ];
        }
        else if (options.components && options.components.length > 0) {
            // Filter by specified types
            selectedComponents = [];
            for (const type of options.components) {
                selectedComponents.push(...available[type]);
            }
        }
        else {
            // Interactive selection
            const selected = await selectComponents(available);
            if (!selected) {
                result.errors.push('Selection cancelled');
                return result;
            }
            selectedComponents = selected;
        }
        if (selectedComponents.length === 0) {
            result.errors.push('No components selected');
            return result;
        }
        const claudeDir = getClaudeDir();
        // Check for conflicts
        const conflicts = await checkConflicts(selectedComponents, claudeDir);
        result.conflicts = conflicts;
        if (conflicts.length > 0 && !options.force) {
            if (options.dryRun) {
                logger.info(`[Dry Run] Would have ${conflicts.length} conflicts`);
            }
            else {
                // Backup existing files
                await createBackup('pre-sync-backup');
                // Resolve conflicts
                const strategy = options.conflictStrategy || 'backup';
                const interactive = options.interactive !== false; // Default to true
                await resolveConflicts(conflicts, strategy, interactive);
            }
        }
        // Sync components
        if (options.dryRun) {
            logger.info(`[Dry Run] Would sync ${selectedComponents.length} components`);
            for (const component of selectedComponents) {
                const relPath = getRelativeComponentPath(component);
                result.synced.push({
                    file: component,
                    targetPath: path.join(claudeDir, COMPONENT_DIRS[component.type], relPath),
                    action: 'created',
                });
            }
        }
        else {
            const conflictStrategy = options.force
                ? 'overwrite'
                : (options.conflictStrategy || 'backup');
            for (const component of selectedComponents) {
                try {
                    const synced = await copyComponent(component, claudeDir, conflictStrategy);
                    result.synced.push(synced);
                    if (synced.action === 'skipped') {
                        result.skipped.push(component.name);
                    }
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    result.errors.push(`Failed to sync ${component.name}: ${message}`);
                }
            }
        }
        // Update ecosystem config
        if (!options.dryRun && result.synced.length > 0) {
            const config = await loadEcosystemConfig();
            const syncedByType = {
                agents: [],
                hooks: [],
                skills: [],
                scripts: [],
                'slash-commands': [],
                'mcp-servers': [],
            };
            for (const synced of result.synced) {
                if (synced.action !== 'skipped') {
                    syncedByType[synced.file.type].push(synced.file.name);
                }
            }
            config.sync = {
                lastSync: new Date().toISOString(),
                commitSha: metadata.commitSha,
                repository: DEFAULT_REPO_URL,
                branch: DEFAULT_BRANCH,
                syncedComponents: syncedByType,
                totalFiles: result.synced.filter((s) => s.action !== 'skipped').length,
            };
            config.lastUpdated = new Date().toISOString();
            await saveEcosystemConfig(config);
        }
        result.success = result.errors.length === 0;
        if (result.success) {
            const syncedCount = result.synced.filter((s) => s.action !== 'skipped').length;
            logger.success(`Synced ${syncedCount} components from repository`);
        }
        return result;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result.errors.push(message);
        logger.error(`Sync failed: ${message}`);
        return result;
    }
}
/**
 * Pull latest changes from the repository
 */
export async function pullLatestChanges(token) {
    const result = {
        success: false,
        updated: false,
        previousSha: '',
        currentSha: '',
        changedFiles: [],
    };
    try {
        const config = await loadEcosystemConfig();
        result.previousSha = config.sync?.commitSha || '';
        const { git } = await cloneOrUpdateRepo(token);
        const metadata = await getRepoMetadata(git);
        result.currentSha = metadata.commitSha;
        result.updated = result.previousSha !== result.currentSha;
        result.success = true;
        if (result.updated) {
            // Get changed files since last sync
            if (result.previousSha) {
                try {
                    const diff = await git.diff([
                        '--name-only',
                        result.previousSha,
                        result.currentSha,
                    ]);
                    result.changedFiles = diff.split('\n').filter(Boolean);
                }
                catch {
                    // If diff fails (e.g., shallow clone), just note that files changed
                    result.changedFiles = ['(unable to determine changed files)'];
                }
            }
            logger.info(`Repository updated: ${result.changedFiles.length} changed files`);
        }
        else {
            logger.info('Repository is up to date');
        }
        return result;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result.error = message;
        logger.error(`Pull failed: ${message}`);
        return result;
    }
}
/**
 * Get current sync state
 */
export async function getSyncState() {
    const config = await loadEcosystemConfig();
    return config.sync;
}
/**
 * Get available components without syncing
 */
export async function getAvailableComponents(token) {
    try {
        const { git, repoPath } = await cloneOrUpdateRepo(token);
        const metadata = await getRepoMetadata(git);
        const available = await discoverComponents(repoPath);
        available.metadata = metadata;
        return available;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to get available components: ${message}`);
        return null;
    }
}
//# sourceMappingURL=repo-sync.js.map