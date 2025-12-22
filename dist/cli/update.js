/**
 * Update command implementation
 * Synchronizes ecosystem components with latest from private repository
 */
import chalk from 'chalk';
import { createLogger } from '../utils/logger.js';
import { loadConfig, saveConfig } from '../config/ecosystem-config.js';
import { getStoredGitHubToken } from '../installers/github.js';
import { pullLatestChanges, syncPrivateRepo, getSyncState } from '../sync/repo-sync.js';
import { createBackup } from '../sync/backup.js';
const logger = createLogger({ context: { command: 'update' } });
/**
 * Map changed files to component types
 */
function categorizeChangedFiles(files) {
    const componentDirs = {
        'agents/': 'agents',
        'hooks/': 'hooks',
        'skills/': 'skills',
        'scripts/': 'scripts',
        'commands/': 'slash-commands',
    };
    return files.map((filePath) => {
        let componentType;
        let status = 'modified';
        // Determine component type from path
        for (const [dir, type] of Object.entries(componentDirs)) {
            if (filePath.startsWith(dir)) {
                componentType = type;
                break;
            }
        }
        // Try to determine status from git diff format (A/M/D prefix)
        if (filePath.startsWith('A\t')) {
            status = 'added';
            filePath = filePath.substring(2);
        }
        else if (filePath.startsWith('M\t')) {
            status = 'modified';
            filePath = filePath.substring(2);
        }
        else if (filePath.startsWith('D\t')) {
            status = 'deleted';
            filePath = filePath.substring(2);
        }
        return {
            path: filePath,
            status,
            componentType,
        };
    });
}
/**
 * Filter changed files by component type
 */
function filterByComponent(files, componentType) {
    if (!componentType) {
        return files;
    }
    return files.filter((f) => f.componentType === componentType);
}
/**
 * Create changelog summary
 */
function createChangelogSummary(changedFiles) {
    const summary = [];
    const byType = {};
    for (const file of changedFiles) {
        const type = file.componentType || 'other';
        byType[type] = (byType[type] || 0) + 1;
    }
    for (const [type, count] of Object.entries(byType)) {
        summary.push(`${count} ${type} file(s)`);
    }
    return summary;
}
/**
 * Print update summary
 */
function printUpdateSummary(result, options) {
    console.log();
    if (options.dryRun) {
        console.log(chalk.yellow('🔍 Dry Run Mode - No changes made\n'));
    }
    // Changelog
    if (result.changelog.length > 0) {
        console.log(chalk.bold('📋 Recent Changes:'));
        for (const entry of result.changelog.slice(0, 5)) {
            const shortSha = entry.sha.substring(0, 7);
            console.log(`  ${chalk.dim(shortSha)} ${entry.message}`);
        }
        if (result.changelog.length > 5) {
            console.log(chalk.dim(`  ... and ${result.changelog.length - 5} more commits`));
        }
        console.log();
    }
    // Updated components
    if (result.updated.length > 0) {
        console.log(chalk.bold('✅ Updated Components:'));
        for (const comp of result.updated) {
            const action = comp.action === 'created' ? chalk.green('created') : chalk.blue('updated');
            console.log(`  ${action} [${comp.type}] ${comp.name}`);
        }
        console.log();
    }
    // Skipped components
    if (result.skipped.length > 0 && options.verbose) {
        console.log(chalk.bold('⏭️  Skipped Components:'));
        for (const comp of result.skipped) {
            console.log(`  ${chalk.dim(`[${comp.type}]`)} ${comp.name}`);
        }
        console.log();
    }
    // Errors
    if (result.errors.length > 0) {
        console.log(chalk.bold.red('❌ Errors:'));
        for (const error of result.errors) {
            console.log(`  ${chalk.red(error)}`);
        }
        console.log();
    }
    // Summary stats
    const { stats } = result;
    console.log(chalk.bold('📊 Summary:'));
    console.log(`  Total: ${stats.total}, Created: ${stats.created}, Updated: ${stats.updated}, Unchanged: ${stats.unchanged}`);
    if (result.previousSha && result.currentSha) {
        console.log(`  ${chalk.dim(`${result.previousSha.substring(0, 7)} → ${result.currentSha.substring(0, 7)}`)}`);
    }
}
/**
 * Run the update command
 */
export async function runUpdate(options = {}) {
    const result = {
        success: false,
        updated: [],
        skipped: [],
        errors: [],
        changelog: [],
        changesAvailable: false,
        stats: {
            total: 0,
            created: 0,
            updated: 0,
            unchanged: 0,
            skipped: 0,
            errors: 0,
        },
        timestamp: new Date().toISOString(),
    };
    try {
        // Check for GitHub token
        const token = await getStoredGitHubToken();
        if (!token) {
            result.errors.push('No GitHub token found. Run "aes-bizzy init" to authenticate.');
            logger.error('No GitHub token found');
            return result;
        }
        // Load current ecosystem config
        const configResult = await loadConfig();
        if (!configResult.success || !configResult.config) {
            result.errors.push('Failed to load ecosystem config. Run "aes-bizzy init" first.');
            logger.error('Failed to load ecosystem config');
            return result;
        }
        const config = configResult.config;
        const syncState = await getSyncState();
        result.previousSha = syncState?.commitSha;
        logger.info('Checking for updates...');
        // Pull latest changes
        const pullResult = await pullLatestChanges(token);
        if (!pullResult.success) {
            result.errors.push(pullResult.error || 'Failed to pull latest changes');
            return result;
        }
        result.currentSha = pullResult.currentSha;
        result.changesAvailable = pullResult.updated;
        // If no changes and not forcing, we're done
        if (!pullResult.updated && !options.force) {
            logger.info('Already up to date');
            result.success = true;
            result.stats.unchanged = result.stats.total;
            if (!options.dryRun) {
                printUpdateSummary(result, options);
            }
            return result;
        }
        // Categorize changed files
        const changedFiles = categorizeChangedFiles(pullResult.changedFiles);
        const relevantChanges = filterByComponent(changedFiles, options.component);
        if (relevantChanges.length === 0 && !options.force && !options.all) {
            logger.info('No relevant component changes found');
            result.success = true;
            if (!options.dryRun) {
                printUpdateSummary(result, options);
            }
            return result;
        }
        // Create changelog entries from changed files
        result.changelog = [{
                sha: result.currentSha || 'unknown',
                message: `${relevantChanges.length} file(s) changed`,
                author: 'unknown',
                date: new Date().toISOString(),
                files: relevantChanges.map((f) => f.path),
            }];
        // Log what we're about to do
        const changeSummary = createChangelogSummary(relevantChanges);
        logger.info(`Changes available: ${changeSummary.join(', ')}`);
        if (options.dryRun) {
            logger.info('[Dry Run] Would sync the following changes:');
            for (const file of relevantChanges) {
                logger.info(`  ${file.status}: ${file.path}`);
            }
            result.success = true;
            result.stats.total = relevantChanges.length;
            printUpdateSummary(result, options);
            return result;
        }
        // Create backup before updating
        logger.info('Creating backup...');
        await createBackup('pre-update-backup');
        // Determine which components to sync
        const componentsToSync = options.component
            ? [options.component]
            : options.all
                ? ['agents', 'hooks', 'skills', 'scripts', 'slash-commands']
                : [...new Set(relevantChanges.map((f) => f.componentType).filter(Boolean))];
        // Sync components
        logger.info('Syncing components...');
        const syncResult = await syncPrivateRepo({
            token,
            components: componentsToSync,
            force: options.force,
            conflictStrategy: 'backup',
            selectAll: !options.manifestPath && !options.manifestTier, // Use selectAll only if not using manifest
            manifestPath: options.manifestPath,
            manifestTier: options.manifestTier,
            categories: options.categories,
        });
        if (!syncResult.success) {
            result.errors.push(...syncResult.errors);
        }
        // Process sync results
        for (const synced of syncResult.synced) {
            // Map 'merged' action to 'updated' for our update result
            const action = synced.action === 'merged' ? 'updated' : synced.action;
            const update = {
                type: synced.file.type,
                name: synced.file.name,
                path: synced.targetPath,
                action,
            };
            if (synced.action === 'skipped') {
                result.skipped.push(update);
                result.stats.skipped++;
            }
            else {
                result.updated.push(update);
                if (synced.action === 'created') {
                    result.stats.created++;
                }
                else {
                    result.stats.updated++;
                }
            }
            result.stats.total++;
        }
        // Update ecosystem config with new sync state
        config.lastUpdated = new Date().toISOString();
        await saveConfig(config);
        result.success = result.errors.length === 0;
        // Print summary
        printUpdateSummary(result, options);
        if (result.success) {
            logger.success('Update complete!');
        }
        return result;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result.errors.push(message);
        logger.error(`Update failed: ${message}`);
        return result;
    }
}
//# sourceMappingURL=update.js.map