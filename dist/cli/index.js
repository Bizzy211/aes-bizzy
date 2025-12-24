#!/usr/bin/env node
/**
 * A.E.S - Bizzy CLI
 *
 * Bootstrap Claude Code AI agent development environments
 */
import { Command } from 'commander';
import chalk from 'chalk';
import gradientString from 'gradient-string';
import { createLogger, setLogLevel, setSilentMode } from '../utils/logger.js';
import { runInitWizard } from './init.js';
import { runDoctor } from './doctor.js';
import { runUpdate } from './update.js';
import { runSync } from './sync.js';
import { createBeadsCommand } from './beads.js';
import { createContextCommand } from './context.js';
import { createMemoryCommand } from './memory.js';
import { createTestCommand } from './test.js';
// Read version from package.json at runtime
const VERSION = '1.0.2';
const BANNER = `
     _    _____ ____       ____  _
    / \\  | ____/ ___|     | __ )(_)_________ _   _
   / _ \\ |  _| \\___ \\ ___ |  _ \\| |_  /_  / | | | |
  / ___ \\| |___ ___) |___|| |_) | |/ / / /| |_| |
 /_/   \\_\\_____|____/     |____/|_/___/___|\\__, |
                                           |___/
`;
const logger = createLogger({ context: { command: 'cli' } });
/**
 * Display the welcome banner
 */
export function showBanner() {
    console.log(gradientString.pastel.multiline(BANNER));
    console.log(chalk.dim(`  v${VERSION} - Multi-Agent Orchestration Platform`));
    console.log(chalk.cyan(`  Ship 10x faster with coordinated AI agent teams\n`));
}
/**
 * Create and configure the CLI program
 */
export function createProgram() {
    const program = new Command();
    // Main program configuration
    program
        .name('aes-bizzy')
        .description('Bootstrap Claude Code AI agent development environments')
        .version(VERSION, '-V, --version', 'Output the version number')
        .option('-v, --verbose', 'Enable verbose output')
        .option('-s, --silent', 'Suppress all output except errors')
        .option('--no-color', 'Disable colored output')
        .hook('preAction', (thisCommand) => {
        const opts = thisCommand.opts();
        // Configure logging based on global options
        if (opts.verbose) {
            setLogLevel('debug');
        }
        if (opts.silent) {
            setSilentMode(true);
        }
        if (opts.color === false) {
            chalk.level = 0;
        }
    });
    // === INIT COMMAND ===
    program
        .command('init [name]')
        .description('Initialize Claude Code development environment (project-level by default)')
        .option('-g, --global', 'Use global ~/.claude config (legacy behavior)')
        .option('--skip-prerequisites', 'Skip prerequisites check')
        .option('--skip-github', 'Skip GitHub authentication')
        .option('--skip-api-keys', 'Skip API keys configuration')
        .option('--skip-sync', 'Skip private repository sync')
        .option('--skip-beads', 'Skip Beads installation')
        .option('--skip-taskmaster', 'Skip Task Master installation')
        .option('--skip-mcp', 'Skip MCP servers configuration')
        .option('--skip-git', 'Skip git repository initialization')
        .option('-y, --yes', 'Accept all defaults without prompting')
        .option('--force', 'Force operations even on errors')
        .option('--no-backup', 'Skip automatic backup before sync')
        .option('--beads-method <method>', 'Beads installation method (npm, winget, brew, cargo, binary)')
        .option('--taskmaster-model <model>', 'TaskMaster AI model (e.g., claude-sonnet-4-20250514)')
        .option('--non-interactive', 'Run in non-interactive mode (auto-select defaults)')
        .option('--github-token <token>', 'GitHub personal access token')
        .option('--anthropic-key <key>', 'Anthropic API key')
        .option('--perplexity-key <key>', 'Perplexity API key')
        .option('--supabase-url <url>', 'Supabase project URL')
        .option('--supabase-key <key>', 'Supabase service role key')
        .option('--taskmaster', 'Initialize Task Master in project')
        .option('--beads', 'Initialize Beads in project')
        .option('--github', 'Create GitHub repository for new project')
        .option('--public', 'Make GitHub repository public (default: private)')
        .option('-d, --description <description>', 'Project description for PRD generation')
        .action(async (name, options) => {
        const result = await runInitWizard({
            projectName: name,
            projectDescription: options.description,
            global: options.global,
            skipPrerequisites: options.skipPrerequisites,
            skipGithub: options.skipGithub,
            skipApiKeys: options.skipApiKeys,
            skipSync: options.skipSync,
            skipBeads: options.skipBeads,
            skipTaskmaster: options.skipTaskmaster,
            skipMcp: options.skipMcp,
            skipGit: options.skipGit,
            yes: options.yes,
            force: options.force,
            noBackup: options.noBackup,
            beadsMethod: options.beadsMethod,
            taskmasterModel: options.taskmasterModel,
            nonInteractive: options.nonInteractive,
            githubToken: options.githubToken,
            anthropicApiKey: options.anthropicKey,
            perplexityApiKey: options.perplexityKey,
            supabaseUrl: options.supabaseUrl,
            supabaseKey: options.supabaseKey,
            taskmaster: options.taskmaster,
            beads: options.beads,
            github: options.github,
            public: options.public,
        });
        if (!result.success) {
            process.exit(1);
        }
    });
    // === DOCTOR COMMAND ===
    program
        .command('doctor')
        .description('Check project health and diagnose issues')
        .option('--fix', 'Attempt to fix detected issues')
        .option('--json', 'Output results as JSON')
        .option('--verbose', 'Show verbose output')
        .option('--categories <categories>', 'Only run specific categories (comma-separated)')
        .action(async (options) => {
        const categories = options.categories
            ? options.categories.split(',').map((c) => c.trim())
            : undefined;
        const result = await runDoctor({
            fix: options.fix,
            json: options.json,
            verbose: options.verbose,
            categories,
        });
        process.exit(result.exitCode);
    });
    // === UPDATE COMMAND ===
    program
        .command('update')
        .description('Update ecosystem components to latest versions')
        .option('-c, --component <type>', 'Update specific component type (agents, hooks, skills, scripts, slash-commands)')
        .option('--all', 'Update all components')
        .option('--dry-run', 'Show what would be updated without making changes')
        .option('--force', 'Force update even if no changes detected')
        .option('-m, --manifest <path>', 'Use manifest file for component selection')
        .option('-t, --tier <tier>', 'Use manifest tier (essential, recommended, full)')
        .option('--categories <categories>', 'Filter manifest by categories (comma-separated)')
        .action(async (options) => {
        const categories = options.categories
            ? options.categories.split(',').map((c) => c.trim())
            : undefined;
        const result = await runUpdate({
            component: options.component,
            all: options.all,
            dryRun: options.dryRun,
            force: options.force,
            verbose: program.opts().verbose,
            manifestPath: options.manifest,
            manifestTier: options.tier,
            categories,
        });
        if (!result.success) {
            process.exit(1);
        }
    });
    // === SYNC COMMAND ===
    program
        .command('sync')
        .description('Sync ecosystem components (project-level by default)')
        .option('-m, --manifest <name>', 'Select installation manifest (essential, recommended, full)')
        .option('-p, --project <path>', 'Sync to specific project directory')
        .option('-g, --global', 'Sync to global ~/.claude instead of project')
        .option('-c, --check', 'Check for updates without syncing')
        .option('-r, --restore <timestamp>', 'Restore from a backup by timestamp')
        .option('--dry-run', 'Show what would be synced without making changes')
        .option('--force', 'Overwrite local changes')
        .option('--verbose', 'Show detailed sync progress')
        .action(async (options) => {
        const result = await runSync({
            manifest: options.manifest,
            project: options.project,
            global: options.global,
            check: options.check,
            restore: options.restore,
            dryRun: options.dryRun,
            force: options.force,
            verbose: options.verbose || program.opts().verbose,
        });
        if (!result.success) {
            process.exit(1);
        }
    });
    // === PROJECT COMMAND (DEPRECATED - redirects to init) ===
    program
        .command('project <name>')
        .description('[DEPRECATED] Use "aes-bizzy init <name>" instead')
        .option('-t, --template <template>', 'Project template (basic, web, api, fullstack)', 'basic')
        .option('--github', 'Create GitHub repository')
        .option('--public', 'Make GitHub repository public (default: private)')
        .option('--taskmaster', 'Initialize Task Master for task management')
        .option('--beads', 'Initialize Beads for context tracking')
        .option('--skip-git', 'Skip git repository initialization')
        .option('--force', 'Overwrite existing files')
        .option('--dry-run', 'Show what would be created without making changes')
        .action(async (name, options) => {
        logger.warn('The "project" command is deprecated. Use "aes-bizzy init <name>" instead.');
        console.log('');
        // Forward to init with project name
        const result = await runInitWizard({
            projectName: name,
            github: options.github,
            public: options.public,
            taskmaster: options.taskmaster,
            beads: options.beads,
            skipGit: options.skipGit,
            force: options.force,
        });
        if (!result.success) {
            process.exit(1);
        }
    });
    // === MIGRATE COMMAND ===
    program
        .command('migrate')
        .description('Migrate from ProjectMgr-Context to Beads/GitHub/TaskMaster')
        .option('--dry-run', 'Show what would be migrated')
        .option('--backup', 'Create backup before migration')
        .action(async (options) => {
        logger.info('Starting migration...');
        logger.warn('Migrate command not yet implemented');
        logger.debug('Options:', options);
    });
    // === AGENTS COMMAND ===
    program
        .command('agents')
        .description('Manage Claude Code agents')
        .option('-l, --list', 'List all installed agents')
        .option('-a, --add <name>', 'Add a new agent')
        .option('-r, --remove <name>', 'Remove an agent')
        .option('--sync', 'Sync agents from private repository')
        .action(async (options) => {
        logger.info('Managing agents...');
        logger.warn('Agents command not yet implemented');
        logger.debug('Options:', options);
    });
    // === HOOKS COMMAND ===
    program
        .command('hooks')
        .description('Manage Claude Code hooks')
        .option('-l, --list', 'List all installed hooks')
        .option('-a, --add <name>', 'Add a new hook')
        .option('-r, --remove <name>', 'Remove a hook')
        .option('--enable <name>', 'Enable a hook')
        .option('--disable <name>', 'Disable a hook')
        .action(async (options) => {
        logger.info('Managing hooks...');
        logger.warn('Hooks command not yet implemented');
        logger.debug('Options:', options);
    });
    // === ADD COMMAND ===
    program
        .command('add <component>')
        .description('Add a component to an existing project (agent, hook, skill, mcp)')
        .option('-t, --template <template>', 'Template to use')
        .option('-n, --name <name>', 'Component name')
        .action(async (component, options) => {
        logger.info(`Adding ${component}...`);
        logger.warn('Add command not yet implemented');
        logger.debug('Options:', options);
    });
    // === CONFIG COMMAND ===
    program
        .command('config')
        .description('View or modify ecosystem configuration')
        .option('-g, --get <key>', 'Get a configuration value')
        .option('-s, --set <key=value>', 'Set a configuration value')
        .option('-l, --list', 'List all configuration values')
        .option('--reset', 'Reset configuration to defaults')
        .action(async (options) => {
        logger.info('Managing configuration...');
        logger.warn('Config command not yet implemented');
        logger.debug('Options:', options);
    });
    // === BEADS COMMAND ===
    // Task management with agent assignment
    program.addCommand(createBeadsCommand());
    // === CONTEXT COMMAND ===
    // Context management for agent orchestration
    program.addCommand(createContextCommand());
    // === MEMORY COMMAND ===
    // Heimdall persistent memory management
    program.addCommand(createMemoryCommand());
    // === TEST COMMAND ===
    // E2E test runner with credential validation
    program.addCommand(createTestCommand());
    return program;
}
/**
 * Run the CLI with error handling
 */
export async function run() {
    const program = createProgram();
    try {
        await program.parseAsync(process.argv);
    }
    catch (error) {
        if (error instanceof Error) {
            logger.error(`Command failed: ${error.message}`);
            if (process.env['DEBUG']) {
                console.error(error.stack);
            }
        }
        else {
            logger.error('An unexpected error occurred');
        }
        process.exit(1);
    }
}
// Run CLI when executed directly
run();
//# sourceMappingURL=index.js.map