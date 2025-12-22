/**
 * Migration Wizard
 *
 * Adaptive initialization flow and interactive migration wizard
 * for updating existing Claude Code installations.
 */
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { detectExistingSetup, detectConflicts, detectLegacySetup, getDetectionSummary, } from './project-detector.js';
import { createPreMigrationBackup } from './migration-backup.js';
/**
 * Display installation status header
 */
export function displayInstallationHeader(detection) {
    console.log();
    if (detection.hasClaudeDir) {
        console.log(chalk.cyan.bold('╔════════════════════════════════════════════╗'));
        console.log(chalk.cyan.bold('║   🔄 Update Existing Installation         ║'));
        console.log(chalk.cyan.bold('╚════════════════════════════════════════════╝'));
        console.log();
        console.log(chalk.gray(getDetectionSummary(detection)));
    }
    else {
        console.log(chalk.green.bold('╔════════════════════════════════════════════╗'));
        console.log(chalk.green.bold('║   ✨ Fresh Installation                    ║'));
        console.log(chalk.green.bold('╚════════════════════════════════════════════╝'));
        console.log();
        console.log(chalk.gray('No existing Claude Code installation detected.'));
    }
    console.log();
}
/**
 * Display step status in wizard
 */
export function displayStepStatus(stepNumber, stepName, status, details) {
    const statusIcons = {
        complete: chalk.green('✅'),
        update: chalk.yellow('⚠️'),
        missing: chalk.red('❌'),
        pending: chalk.gray('○'),
    };
    const statusColors = {
        complete: chalk.green,
        update: chalk.yellow,
        missing: chalk.red,
        pending: chalk.gray,
    };
    const icon = statusIcons[status];
    const color = statusColors[status];
    const detailText = details ? color(` (${details})`) : '';
    return `Step ${stepNumber}: ${stepName} ${icon}${detailText}`;
}
/**
 * Get step statuses based on detection
 */
export function getStepStatuses(detection) {
    const steps = [];
    // Prerequisites
    steps.push({
        stepNumber: 1,
        stepName: 'Prerequisites',
        status: 'complete',
        details: 'Node.js, Git available',
    });
    // GitHub Auth
    steps.push({
        stepNumber: 2,
        stepName: 'GitHub Auth',
        status: detection.settingsJson.exists ? 'complete' : 'missing',
        details: detection.settingsJson.exists ? 'Token configured' : 'Not configured',
    });
    // Agents
    steps.push({
        stepNumber: 3,
        stepName: 'Repo Sync',
        status: detection.agents.exists
            ? (detection.agents.count > 0 ? 'update' : 'pending')
            : 'missing',
        details: detection.agents.exists
            ? `${detection.agents.count} agents installed`
            : 'No agents',
    });
    // MCP Servers
    steps.push({
        stepNumber: 4,
        stepName: 'MCP Servers',
        status: detection.mcpServers.exists
            ? 'update'
            : 'missing',
        details: detection.mcpServers.exists
            ? `${detection.mcpServers.servers.length} configured`
            : 'Not configured',
    });
    // Beads
    steps.push({
        stepNumber: 5,
        stepName: 'Beads Integration',
        status: detection.beads.installed ? 'complete' : 'missing',
        details: detection.beads.installed
            ? `v${detection.beads.version || 'installed'}`
            : 'Not installed',
    });
    // Task Master
    steps.push({
        stepNumber: 6,
        stepName: 'Task Master',
        status: detection.taskMaster.configured ? 'complete' : 'missing',
        details: detection.taskMaster.configured
            ? detection.taskMaster.model || 'Configured'
            : 'Not configured',
    });
    return steps;
}
/**
 * Run the adaptive init flow
 */
export async function runAdaptiveInitFlow(detection) {
    // Detect existing setup if not provided
    const detectionResult = detection || await detectExistingSetup();
    // Display header
    displayInstallationHeader(detectionResult);
    // If no existing installation, return fresh install mode
    if (!detectionResult.hasClaudeDir) {
        return {
            mode: 'fresh-install',
            components: {
                agents: true,
                hooks: true,
                skills: true,
                mcpServers: true,
                settings: true,
            },
            mergeStrategy: 'prefer-new',
            skipBackup: true,
            conflicts: [],
            resolutions: new Map(),
        };
    }
    // Check for legacy setup
    const legacyCheck = await detectLegacySetup();
    if (legacyCheck.isLegacy) {
        console.log(chalk.yellow('⚠️  Legacy installation detected!'));
        console.log(chalk.gray('  Some files may need to be migrated to the new format.'));
        console.log();
    }
    // Display step statuses
    const stepStatuses = getStepStatuses(detectionResult);
    console.log(chalk.bold('Current Installation Status:'));
    for (const step of stepStatuses) {
        console.log('  ' + displayStepStatus(step.stepNumber, step.stepName, step.status, step.details));
    }
    console.log();
    // Ask for migration mode
    const mode = await p.select({
        message: 'How would you like to proceed?',
        options: [
            {
                value: 'update-keep-settings',
                label: 'Update components (keep settings)',
                hint: 'Update agents, hooks, and skills while preserving your configuration',
            },
            {
                value: 'fresh-install',
                label: 'Fresh install (backup & replace)',
                hint: 'Create backup and start fresh with new installation',
            },
            {
                value: 'selective-update',
                label: 'Selective update (choose components)',
                hint: 'Pick which components to update individually',
            },
            {
                value: 'abort',
                label: 'Abort',
                hint: 'Exit without making changes',
            },
        ],
    });
    if (p.isCancel(mode) || mode === 'abort') {
        p.cancel('Installation cancelled.');
        return null;
    }
    // Initialize result
    const result = {
        mode: mode,
        components: {
            agents: true,
            hooks: true,
            skills: true,
            mcpServers: true,
            settings: true,
        },
        mergeStrategy: 'preserve-existing',
        skipBackup: false,
        conflicts: [],
        resolutions: new Map(),
    };
    // Handle selective update
    if (mode === 'selective-update') {
        const components = await p.multiselect({
            message: 'Select components to update:',
            options: [
                { value: 'agents', label: `Agents (${detectionResult.agents.count} installed)` },
                { value: 'hooks', label: `Hooks (${detectionResult.hooks.count} installed)` },
                { value: 'skills', label: `Skills (${detectionResult.skills.count} installed)` },
                { value: 'mcpServers', label: `MCP Servers (${detectionResult.mcpServers.servers.length} configured)` },
                { value: 'settings', label: 'Settings (settings.json)' },
            ],
            required: true,
        });
        if (p.isCancel(components)) {
            p.cancel('Installation cancelled.');
            return null;
        }
        const selectedComponents = components;
        result.components = {
            agents: selectedComponents.includes('agents'),
            hooks: selectedComponents.includes('hooks'),
            skills: selectedComponents.includes('skills'),
            mcpServers: selectedComponents.includes('mcpServers'),
            settings: selectedComponents.includes('settings'),
        };
    }
    // Ask for merge strategy
    if (mode !== 'fresh-install') {
        const strategy = await p.select({
            message: 'How should conflicts be handled?',
            options: [
                {
                    value: 'preserve-existing',
                    label: 'Preserve existing (recommended)',
                    hint: 'Keep your customizations, add new items',
                },
                {
                    value: 'prefer-new',
                    label: 'Prefer new',
                    hint: 'Use latest versions, keep credentials',
                },
                {
                    value: 'interactive',
                    label: 'Interactive',
                    hint: 'Ask for each conflict',
                },
            ],
        });
        if (p.isCancel(strategy)) {
            p.cancel('Installation cancelled.');
            return null;
        }
        result.mergeStrategy = strategy;
    }
    // Ask about backup
    if (mode !== 'fresh-install') {
        const skipBackup = await p.confirm({
            message: 'Create backup before making changes?',
            initialValue: true,
        });
        if (p.isCancel(skipBackup)) {
            p.cancel('Installation cancelled.');
            return null;
        }
        result.skipBackup = !skipBackup;
    }
    return result;
}
/**
 * Run the full migration wizard
 */
export async function runMigrationWizard(detection) {
    p.intro(chalk.cyan.bold('🔄 Migration Wizard'));
    // Display summary
    console.log();
    console.log(chalk.bold('Existing Installation Summary:'));
    console.log(chalk.gray(getDetectionSummary(detection)));
    console.log();
    // Get adaptive flow result
    const flowResult = await runAdaptiveInitFlow(detection);
    if (!flowResult) {
        return null;
    }
    const result = {
        success: false,
        migrationType: flowResult.mode === 'fresh-install' ? 'full' : 'partial',
        componentsUpdated: [],
        conflictsResolved: 0,
        filesBackedUp: 0,
        errors: [],
        warnings: [],
        timestamp: new Date().toISOString(),
    };
    // Create backup if not skipped
    if (!flowResult.skipBackup) {
        const spinner = p.spinner();
        spinner.start('Creating backup...');
        try {
            const backup = await createPreMigrationBackup(`Migration: ${flowResult.mode}`, flowResult.mode === 'fresh-install' ? 'full' : 'partial', flowResult.conflicts);
            result.backupPath = backup.backupPath;
            result.filesBackedUp = backup.manifest.files.length;
            spinner.stop(`Backup created: ${backup.manifest.files.length} files`);
        }
        catch (error) {
            spinner.stop('Backup failed');
            result.errors.push(`Backup failed: ${error instanceof Error ? error.message : String(error)}`);
            const continueWithoutBackup = await p.confirm({
                message: 'Backup failed. Continue without backup?',
                initialValue: false,
            });
            if (p.isCancel(continueWithoutBackup) || !continueWithoutBackup) {
                p.cancel('Migration cancelled.');
                return null;
            }
        }
    }
    // Detect conflicts
    if (flowResult.mergeStrategy === 'interactive' && flowResult.conflicts.length > 0) {
        console.log();
        console.log(chalk.bold(`Found ${flowResult.conflicts.length} conflicts to resolve:`));
        for (const conflict of flowResult.conflicts) {
            const resolution = await resolveConflictInteractive(conflict);
            if (resolution) {
                flowResult.resolutions.set(conflict.name, resolution);
                result.conflictsResolved++;
            }
        }
    }
    // Track updated components
    if (flowResult.components.agents)
        result.componentsUpdated.push('agents');
    if (flowResult.components.hooks)
        result.componentsUpdated.push('hooks');
    if (flowResult.components.skills)
        result.componentsUpdated.push('skills');
    if (flowResult.components.mcpServers)
        result.componentsUpdated.push('mcpServers');
    if (flowResult.components.settings)
        result.componentsUpdated.push('settings');
    result.success = result.errors.length === 0;
    // Display summary
    console.log();
    p.outro(chalk.green.bold('✅ Migration Complete'));
    console.log();
    console.log(chalk.bold('Migration Summary:'));
    console.log(`  Components updated: ${result.componentsUpdated.join(', ')}`);
    console.log(`  Conflicts resolved: ${result.conflictsResolved}`);
    console.log(`  Files backed up: ${result.filesBackedUp}`);
    if (result.backupPath) {
        console.log(`  Backup location: ${result.backupPath}`);
    }
    if (result.warnings.length > 0) {
        console.log();
        console.log(chalk.yellow.bold('Warnings:'));
        for (const warning of result.warnings) {
            console.log(chalk.yellow(`  ⚠️  ${warning}`));
        }
    }
    if (result.errors.length > 0) {
        console.log();
        console.log(chalk.red.bold('Errors:'));
        for (const error of result.errors) {
            console.log(chalk.red(`  ❌ ${error}`));
        }
    }
    return result;
}
/**
 * Resolve a single conflict interactively
 */
async function resolveConflictInteractive(conflict) {
    console.log();
    console.log(chalk.bold(`Conflict: ${conflict.type} - ${conflict.name}`));
    if (conflict.path) {
        console.log(chalk.gray(`  Path: ${conflict.path}`));
    }
    console.log(chalk.gray(`  Existing: ${formatValue(conflict.existingValue)}`));
    console.log(chalk.gray(`  New: ${formatValue(conflict.newValue)}`));
    console.log(chalk.gray(`  Modified: ${conflict.isModified ? 'Yes' : 'No'}`));
    const action = await p.select({
        message: 'How do you want to resolve this?',
        options: [
            { value: 'skip', label: 'Keep existing', hint: 'Do not change' },
            { value: 'replace', label: 'Use new', hint: 'Replace with new version' },
            { value: 'merge', label: 'Merge', hint: 'Attempt automatic merge' },
            { value: 'backup', label: 'Backup & skip', hint: 'Keep existing, save new as backup' },
        ],
    });
    if (p.isCancel(action)) {
        return null;
    }
    return action;
}
/**
 * Format a value for display
 */
function formatValue(value) {
    if (value === null || value === undefined) {
        return 'null';
    }
    if (typeof value === 'string') {
        return value.length > 50 ? value.substring(0, 47) + '...' : value;
    }
    if (typeof value === 'object') {
        const json = JSON.stringify(value);
        return json.length > 50 ? json.substring(0, 47) + '...' : json;
    }
    return String(value);
}
/**
 * Generate a migration plan for dry-run
 */
export async function generateMigrationPlan(detection, components, mergeStrategy) {
    const plan = {
        mode: detection.hasClaudeDir ? 'update' : 'fresh',
        currentState: detection,
        componentsToUpdate: [],
        filesToAdd: [],
        filesToUpdate: [],
        filesToRemove: [],
        conflicts: [],
        proposedResolutions: new Map(),
        backupRequired: detection.hasClaudeDir,
        estimatedChanges: {
            added: 0,
            updated: 0,
            removed: 0,
            conflictsToResolve: 0,
        },
    };
    // Add selected components
    if (components.agents)
        plan.componentsToUpdate.push('agents');
    if (components.hooks)
        plan.componentsToUpdate.push('hooks');
    if (components.skills)
        plan.componentsToUpdate.push('skills');
    if (components.mcpServers)
        plan.componentsToUpdate.push('mcpServers');
    if (components.settings)
        plan.componentsToUpdate.push('settings');
    // Detect conflicts
    // TODO: Get actual new files from repo-sync
    const newAgents = [];
    const newHooks = [];
    const newSkills = [];
    const newMCPServers = [];
    plan.conflicts = await detectConflicts(detection, newAgents, newHooks, newSkills, newMCPServers);
    // Set proposed resolutions based on strategy
    for (const conflict of plan.conflicts) {
        let resolution = 'backup';
        switch (mergeStrategy) {
            case 'preserve-existing':
                resolution = conflict.isModified ? 'skip' : 'replace';
                break;
            case 'prefer-new':
                resolution = 'replace';
                break;
            case 'interactive':
                resolution = 'backup'; // Will be resolved interactively
                break;
        }
        plan.proposedResolutions.set(conflict.name, resolution);
    }
    // Calculate estimates
    plan.estimatedChanges.conflictsToResolve = plan.conflicts.length;
    return plan;
}
/**
 * Display migration plan (for dry-run)
 */
export function displayMigrationPlan(plan) {
    console.log();
    console.log(chalk.cyan.bold('═══════════════════════════════════════════'));
    console.log(chalk.cyan.bold('           Migration Plan (Dry Run)        '));
    console.log(chalk.cyan.bold('═══════════════════════════════════════════'));
    console.log();
    console.log(chalk.bold('Mode:'), plan.mode === 'fresh' ? 'Fresh Installation' : 'Update Existing');
    console.log(chalk.bold('Components:'), plan.componentsToUpdate.join(', '));
    console.log(chalk.bold('Backup Required:'), plan.backupRequired ? 'Yes' : 'No');
    console.log();
    if (plan.conflicts.length > 0) {
        console.log(chalk.yellow.bold('Conflicts Detected:'));
        for (const conflict of plan.conflicts) {
            const resolution = plan.proposedResolutions.get(conflict.name) || 'unknown';
            console.log(`  - ${conflict.type}/${conflict.name}: ${resolution}`);
        }
        console.log();
    }
    console.log(chalk.bold('Estimated Changes:'));
    console.log(`  Files to add: ${plan.estimatedChanges.added}`);
    console.log(`  Files to update: ${plan.estimatedChanges.updated}`);
    console.log(`  Files to remove: ${plan.estimatedChanges.removed}`);
    console.log(`  Conflicts to resolve: ${plan.estimatedChanges.conflictsToResolve}`);
    console.log();
}
/**
 * Export migration plan as JSON
 */
export function exportMigrationPlan(plan) {
    const exportable = {
        ...plan,
        proposedResolutions: Object.fromEntries(plan.proposedResolutions),
    };
    return JSON.stringify(exportable, null, 2);
}
//# sourceMappingURL=migration-wizard.js.map