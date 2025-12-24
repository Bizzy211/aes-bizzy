/**
 * Sync Command - Sync ecosystem components with manifest support
 *
 * Provides manifest-based installation, project-level sync, and rollback capabilities.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { createLogger } from '../utils/logger.js';
const logger = createLogger({ context: { command: 'sync' } });
/**
 * Get the path to ecosystem files directory
 * Checks for local project structure first, then falls back to global installation
 */
function getClaudeFilesPath() {
    const projectRoot = process.cwd();
    // Check for local project structure (agents/, manifests/, etc. at root)
    const manifestsPath = path.join(projectRoot, 'manifests');
    if (fs.existsSync(manifestsPath)) {
        return projectRoot;
    }
    // Check for templates directory (NPM package structure)
    const templatesPath = path.join(projectRoot, 'templates');
    if (fs.existsSync(templatesPath)) {
        return templatesPath;
    }
    // Fall back to global installation
    const globalPath = path.join(os.homedir(), '.claude', 'claude-subagents');
    return globalPath;
}
/**
 * Get the target directory for sync
 * Default: Project-level (.claude in cwd)
 * --global: User-level (~/.claude)
 * --project <path>: Specific project path
 */
function getTargetPath(options) {
    if (options.project) {
        return path.join(options.project, '.claude');
    }
    if (options.global) {
        return path.join(os.homedir(), '.claude');
    }
    // Default: project-level in current directory
    return path.join(process.cwd(), '.claude');
}
/**
 * Load a manifest file
 */
function loadManifest(manifestName) {
    const claudeFiles = getClaudeFilesPath();
    const manifestPath = path.join(claudeFiles, 'manifests', `${manifestName}.json`);
    if (!fs.existsSync(manifestPath)) {
        logger.error(`Manifest not found: ${manifestPath}`);
        return null;
    }
    try {
        const content = fs.readFileSync(manifestPath, 'utf-8');
        return JSON.parse(content);
    }
    catch (error) {
        logger.error(`Failed to parse manifest: ${error}`);
        return null;
    }
}
/**
 * Get all files from a manifest
 */
function getManifestFiles(manifest) {
    const files = [];
    for (const [, component] of Object.entries(manifest.components)) {
        if (component.files && component.path) {
            for (const file of component.files) {
                files.push(path.join(component.path, file));
            }
        }
        // Handle nested categories (e.g., hooks.essential, hooks.recommended)
        for (const [, value] of Object.entries(component)) {
            if (typeof value === 'object' && value !== null && 'files' in value && 'path' in value) {
                const nested = value;
                for (const file of nested.files) {
                    files.push(path.join(nested.path, file));
                }
            }
        }
    }
    return files;
}
/**
 * List available backups
 */
function listBackups() {
    const backupDir = path.join(os.homedir(), '.claude', 'backups');
    if (!fs.existsSync(backupDir)) {
        return [];
    }
    const backups = [];
    try {
        const entries = fs.readdirSync(backupDir);
        for (const entry of entries) {
            const entryPath = path.join(backupDir, entry);
            if (fs.statSync(entryPath).isDirectory()) {
                backups.push({
                    timestamp: entry,
                    path: entryPath,
                });
            }
        }
    }
    catch {
        logger.error('Failed to list backups');
    }
    return backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
/**
 * Restore from a backup
 */
async function restoreFromBackup(timestamp) {
    const backupPath = path.join(os.homedir(), '.claude', 'backups', timestamp);
    if (!fs.existsSync(backupPath)) {
        return {
            success: false,
            filesUpdated: 0,
            filesSynced: [],
            errors: [`Backup not found: ${timestamp}`],
        };
    }
    const targetPath = path.join(os.homedir(), '.claude');
    const files = [];
    const errors = [];
    try {
        // Copy backup files to target
        const copyRecursive = (src, dest) => {
            const entries = fs.readdirSync(src, { withFileTypes: true });
            for (const entry of entries) {
                const srcPath = path.join(src, entry.name);
                const destPath = path.join(dest, entry.name);
                if (entry.isDirectory()) {
                    if (!fs.existsSync(destPath)) {
                        fs.mkdirSync(destPath, { recursive: true });
                    }
                    copyRecursive(srcPath, destPath);
                }
                else {
                    fs.copyFileSync(srcPath, destPath);
                    files.push(destPath);
                }
            }
        };
        copyRecursive(backupPath, targetPath);
        logger.info(chalk.green(`✓ Restored ${files.length} files from backup ${timestamp}`));
        return {
            success: true,
            filesUpdated: files.length,
            filesSynced: files,
            errors: [],
        };
    }
    catch (error) {
        errors.push(`Restore failed: ${error}`);
        return {
            success: false,
            filesUpdated: 0,
            filesSynced: [],
            errors,
        };
    }
}
/**
 * Check for available updates
 */
async function checkForUpdates(manifest, options) {
    logger.info(chalk.cyan('Checking for updates...\n'));
    const claudeFiles = getClaudeFilesPath();
    const targetPath = getTargetPath({ global: options?.global });
    // Load manifest if specified
    let manifestData = null;
    if (manifest) {
        manifestData = loadManifest(manifest);
        if (manifestData) {
            logger.info(chalk.blue(`Manifest: ${manifestData.name} (${manifestData.totalFiles} files)`));
        }
    }
    // Check ecosystem.json for last sync
    const ecosystemPath = path.join(targetPath, 'ecosystem.json');
    if (fs.existsSync(ecosystemPath)) {
        try {
            const ecosystem = JSON.parse(fs.readFileSync(ecosystemPath, 'utf-8'));
            logger.info(chalk.dim(`Last sync: ${ecosystem.lastSyncDate || 'Unknown'}`));
            logger.info(chalk.dim(`Version: ${ecosystem.version || 'Unknown'}`));
        }
        catch {
            logger.warn('Could not read ecosystem.json');
        }
    }
    // Count files that would be updated
    if (manifestData) {
        const files = getManifestFiles(manifestData);
        let newFiles = 0;
        let modifiedFiles = 0;
        for (const file of files) {
            const sourcePath = path.join(claudeFiles, file);
            const destPath = path.join(targetPath, file);
            if (!fs.existsSync(destPath)) {
                newFiles++;
            }
            else if (fs.existsSync(sourcePath)) {
                const sourceContent = fs.readFileSync(sourcePath, 'utf-8');
                const destContent = fs.readFileSync(destPath, 'utf-8');
                if (sourceContent !== destContent) {
                    modifiedFiles++;
                }
            }
        }
        console.log('');
        logger.info(chalk.yellow(`New files: ${newFiles}`));
        logger.info(chalk.yellow(`Modified files: ${modifiedFiles}`));
        logger.info(chalk.dim(`Total in manifest: ${files.length}`));
    }
    // List available backups
    const backups = listBackups();
    if (backups.length > 0) {
        console.log('');
        logger.info(chalk.cyan('Available backups:'));
        for (const backup of backups.slice(0, 5)) {
            logger.info(chalk.dim(`  ${backup.timestamp}`));
        }
        if (backups.length > 5) {
            logger.info(chalk.dim(`  ... and ${backups.length - 5} more`));
        }
    }
    console.log('');
    logger.info(chalk.green('Run `aes-bizzy sync` to apply updates'));
}
/**
 * Display manifest summary
 */
function displayManifestSummary(manifest) {
    console.log('');
    logger.info(chalk.blue.bold(`📦 ${manifest.name} manifest`));
    logger.info(chalk.dim(manifest.description));
    console.log('');
    // Count components
    const counts = {};
    for (const [category, component] of Object.entries(manifest.components)) {
        if (component.count) {
            counts[category] = component.count;
        }
        else if (component.totalCount) {
            counts[category] = component.totalCount;
        }
    }
    logger.info(chalk.cyan('Components to sync:'));
    for (const [category, count] of Object.entries(counts)) {
        const icon = category === 'agents' ? '🤖' :
            category === 'hooks' ? '🪝' :
                category === 'skills' ? '⚡' :
                    category === 'commands' ? '📝' :
                        category === 'utils' ? '🔧' :
                            category === 'templates' ? '📋' : '📁';
        logger.info(`  ${icon} ${category}: ${count} files`);
    }
    console.log('');
    logger.info(chalk.cyan('Required tools:'));
    for (const tool of manifest.requiredTools) {
        logger.info(chalk.dim(`  - ${tool}`));
    }
    console.log('');
    logger.info(chalk.cyan('Required MCP servers:'));
    for (const server of manifest.requiredMcpServers) {
        logger.info(chalk.dim(`  - ${server}`));
    }
    console.log('');
}
/**
 * Run the sync command
 */
export async function runSync(options) {
    // Handle restore option
    if (options.restore) {
        logger.info(chalk.cyan(`Restoring from backup: ${options.restore}`));
        return restoreFromBackup(options.restore);
    }
    // Handle check option
    if (options.check) {
        await checkForUpdates(options.manifest, { global: options.global });
        return {
            success: true,
            filesUpdated: 0,
            filesSynced: [],
            errors: [],
        };
    }
    // Load manifest if specified
    let manifest = null;
    if (options.manifest) {
        manifest = loadManifest(options.manifest);
        if (!manifest) {
            return {
                success: false,
                filesUpdated: 0,
                filesSynced: [],
                errors: [`Failed to load manifest: ${options.manifest}`],
            };
        }
        displayManifestSummary(manifest);
    }
    const claudeFiles = getClaudeFilesPath();
    const targetPath = getTargetPath({ project: options.project, global: options.global });
    // Ensure target directory exists
    if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
    }
    const filesSynced = [];
    const errors = [];
    // Get files to sync
    const filesToSync = manifest ? getManifestFiles(manifest) : [];
    if (options.dryRun) {
        logger.info(chalk.yellow('Dry run mode - no changes will be made\n'));
    }
    // Sync files
    for (const file of filesToSync) {
        const sourcePath = path.join(claudeFiles, file);
        const destPath = path.join(targetPath, file);
        try {
            if (!fs.existsSync(sourcePath)) {
                logger.warn(chalk.yellow(`Source not found: ${file}`));
                continue;
            }
            // Check if file needs updating
            const sourceContent = fs.readFileSync(sourcePath, 'utf-8');
            let needsUpdate = true;
            if (fs.existsSync(destPath) && !options.force) {
                const destContent = fs.readFileSync(destPath, 'utf-8');
                needsUpdate = sourceContent !== destContent;
            }
            if (needsUpdate) {
                if (!options.dryRun) {
                    // Ensure directory exists
                    const destDir = path.dirname(destPath);
                    if (!fs.existsSync(destDir)) {
                        fs.mkdirSync(destDir, { recursive: true });
                    }
                    fs.writeFileSync(destPath, sourceContent);
                }
                filesSynced.push(file);
                if (options.verbose) {
                    logger.info(chalk.green(`  ✓ ${file}`));
                }
            }
        }
        catch (error) {
            errors.push(`Failed to sync ${file}: ${error}`);
        }
    }
    // Update ecosystem.json
    if (!options.dryRun && filesSynced.length > 0) {
        const ecosystemPath = path.join(targetPath, 'ecosystem.json');
        const ecosystem = fs.existsSync(ecosystemPath)
            ? JSON.parse(fs.readFileSync(ecosystemPath, 'utf-8'))
            : {};
        ecosystem.lastSyncDate = new Date().toISOString();
        ecosystem.version = manifest?.version || '1.0.0';
        ecosystem.manifest = options.manifest || 'custom';
        ecosystem.syncedFiles = filesSynced.length;
        fs.writeFileSync(ecosystemPath, JSON.stringify(ecosystem, null, 2));
    }
    // Summary
    console.log('');
    if (options.dryRun) {
        logger.info(chalk.yellow(`Would sync ${filesSynced.length} files`));
    }
    else {
        logger.info(chalk.green(`✓ Synced ${filesSynced.length} files`));
    }
    if (errors.length > 0) {
        logger.warn(chalk.yellow(`${errors.length} errors occurred`));
        for (const error of errors) {
            logger.error(chalk.red(`  ${error}`));
        }
    }
    // Post-install steps
    if (!options.dryRun && manifest && filesSynced.length > 0) {
        console.log('');
        logger.info(chalk.cyan('Post-install steps:'));
        for (const step of manifest.postInstall) {
            logger.info(chalk.dim(`  $ ${step}`));
        }
    }
    return {
        success: errors.length === 0,
        filesUpdated: filesSynced.length,
        filesSynced,
        errors,
    };
}
//# sourceMappingURL=sync.js.map