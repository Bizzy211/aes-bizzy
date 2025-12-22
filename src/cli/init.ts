/**
 * Interactive init wizard with 8-step flow
 *
 * Provides a guided setup experience for the Claude Ecosystem
 * with progress tracking, skip flags, and graceful Ctrl+C handling.
 */

import * as prompts from '@clack/prompts';
import gradientString from 'gradient-string';
import ora from 'ora';
import { createLogger } from '../utils/logger.js';
import { initConfig, saveConfig } from '../config/ecosystem-config.js';
import { checkPrerequisites } from '../installers/prerequisites.js';
import { installClaudeCode } from '../installers/claude-code.js';
import { authenticateGitHub, getStoredGitHubToken } from '../installers/github.js';
import { syncPrivateRepo } from '../sync/repo-sync.js';
import {
  getAvailableMethods,
  installBeads,
  isBeadsInstalled,
  getBeadsVersion,
} from '../installers/beads.js';
import {
  installTaskMaster,
  selectModel,
  isTaskMasterInstalled,
} from '../installers/task-master.js';
import {
  selectMCPServers,
  installMCPServers,
} from '../installers/mcp-servers.js';
import type { PrerequisitesResult } from '../types/prerequisites.js';
import type { GitHubAuthResult } from '../types/github.js';
import type { InstallResult, InstallMethod } from '../types/installer.js';
import type { TaskMasterModel, ToolTier } from '../types/task-master.js';
import type { InstallationSummary, MCPServerId } from '../types/mcp-servers.js';
import type { SyncResult } from '../types/repo-sync.js';
import type { InstalledComponent } from '../types/ecosystem.js';
import type { BackupResult } from '../types/backup.js';
import {
  setupApiKeys,
  type ApiKeys,
  type ApiKeyResult,
} from '../installers/api-keys.js';
import { createBackup, getClaudeConfigDir } from '../sync/backup.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { existsSync } from 'node:fs';

const logger = createLogger({ context: { module: 'init-wizard' } });

/**
 * Check if running in an interactive TTY environment
 */
function isTTY(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

/**
 * Init wizard options with skip flags
 */
export interface InitOptions {
  skipPrerequisites?: boolean;
  skipGithub?: boolean;
  skipSync?: boolean;
  skipBeads?: boolean;
  skipTaskmaster?: boolean;
  skipMcp?: boolean;
  skipApiKeys?: boolean;
  force?: boolean;
  yes?: boolean;
  /** Skip backup before repo sync */
  noBackup?: boolean;
  /** Beads installation method (npm, winget, brew, cargo, binary) - bypasses interactive selection */
  beadsMethod?: InstallMethod;
  /** TaskMaster model (claude-sonnet-4-20250514, gpt-4o, etc.) - bypasses interactive selection */
  taskmasterModel?: string;
  /** Auto-select defaults when not in TTY (non-interactive mode) */
  nonInteractive?: boolean;
  /** API Keys - can be provided via CLI flags */
  githubToken?: string;
  exaApiKey?: string;
  refApiKey?: string;
  anthropicApiKey?: string;
  perplexityApiKey?: string;
}

/**
 * Wizard state to track progress
 */
interface WizardState {
  currentStep: number;
  totalSteps: number;
  prerequisites?: PrerequisitesResult;
  githubAuth?: GitHubAuthResult;
  apiKeysResult?: ApiKeyResult;
  backupResult?: BackupResult;
  syncResult?: SyncResult;
  beadsInstall?: InstallResult;
  beadsMethod?: InstallMethod;
  taskMasterInstall?: { success: boolean; model?: TaskMasterModel; tier?: ToolTier };
  mcpInstall?: InstallationSummary;
  startTime: number;
  cancelled: boolean;
}

/**
 * Customization stats for backup decision
 */
interface CustomizationStats {
  hasCustomizations: boolean;
  agentCount: number;
  hookCount: number;
  skillCount: number;
  commandCount: number;
  totalFiles: number;
}

/**
 * Detect existing customizations in ~/.claude directory
 */
async function detectExistingCustomizations(claudeDir: string): Promise<CustomizationStats> {
  const agentDir = path.join(claudeDir, 'agents');
  const hookDir = path.join(claudeDir, 'hooks');
  const skillDir = path.join(claudeDir, 'skills');
  const commandDir = path.join(claudeDir, 'commands');

  const countFiles = async (dir: string): Promise<number> => {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      let count = 0;
      for (const entry of entries) {
        if (entry.isFile()) {
          count++;
        } else if (entry.isDirectory()) {
          count += await countFiles(path.join(dir, entry.name));
        }
      }
      return count;
    } catch {
      return 0;
    }
  };

  const agentCount = await countFiles(agentDir);
  const hookCount = await countFiles(hookDir);
  const skillCount = await countFiles(skillDir);
  const commandCount = await countFiles(commandDir);
  const totalFiles = agentCount + hookCount + skillCount + commandCount;

  return {
    hasCustomizations: totalFiles > 0,
    agentCount,
    hookCount,
    skillCount,
    commandCount,
    totalFiles,
  };
}

/**
 * Global state for cleanup on Ctrl+C
 */
let wizardState: WizardState | null = null;
let spinner: ReturnType<typeof ora> | null = null;

/**
 * Setup signal handlers for graceful shutdown
 */
function setupSignalHandlers(): void {
  const cleanup = async () => {
    if (spinner) {
      spinner.stop();
      spinner = null;
    }

    if (wizardState && !wizardState.cancelled) {
      wizardState.cancelled = true;
      prompts.cancel('Setup cancelled by user');
      console.log('\nCleaning up...\n');

      // Log what step we were on
      logger.debug(`Cancelled at step ${wizardState.currentStep}/${wizardState.totalSteps}`);

      process.exit(130); // Standard SIGINT exit code
    }
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

/**
 * Display welcome banner
 */
function showWelcomeBanner(): void {
  const title = `
      _    _____ ____       ____  _
     / \\  | ____/ ___|     | __ )(_)_________ _   _
    / _ \\ |  _| \\___ \\ ___ |  _ \\| |_  /_  / | | | |
   / ___ \\| |___ ___) |___|| |_) | |/ / / /| |_| |
  /_/   \\_\\_____|____/     |____/|_/___/___|\\__, |
                                            |___/
`;

  console.log(gradientString.pastel.multiline(title));
}

/**
 * Step 1: Prerequisites check
 */
async function stepPrerequisites(state: WizardState, options: InitOptions): Promise<boolean> {
  prompts.log.step('Step 1/8: Checking Prerequisites');

  spinner = ora('Checking installed tools...').start();

  try {
    const result = await checkPrerequisites();
    state.prerequisites = result;
    spinner.succeed('Prerequisites checked');

    // Display results
    const icons = {
      installed: '\u2705',
      missing: '\u274c',
      optional: '\u26a0\ufe0f',
    };

    console.log('');
    console.log(`  ${result.node.installed ? icons.installed : icons.missing} Node.js ${result.node.version || '(not found)'}`);
    console.log(`  ${result.npm.installed ? icons.installed : icons.missing} npm ${result.npm.version || '(not found)'}`);
    console.log(`  ${result.git.installed ? icons.installed : icons.missing} Git ${result.git.version || '(not found)'}`);
    console.log(`  ${result.claudeCode.installed ? icons.installed : icons.optional} Claude Code ${result.claudeCode.version || '(not found)'}`);
    console.log('');

    // Check critical prerequisites
    if (!result.node.installed || !result.npm.installed || !result.git.installed) {
      prompts.log.error('Missing critical prerequisites. Please install them before continuing.');
      return false;
    }

    // Offer to install Claude Code if missing
    if (!result.claudeCode.installed) {
      let installClaude = false;

      if (options.nonInteractive || options.yes || !isTTY()) {
        // Non-interactive mode: auto-install Claude Code
        installClaude = true;
        prompts.log.info('Non-interactive mode: auto-installing Claude Code CLI');
      } else {
        // Interactive mode: ask user
        const confirm = await prompts.confirm({
          message: 'Claude Code CLI not found. Install now?',
          initialValue: true,
        });

        if (prompts.isCancel(confirm)) {
          return false;
        }

        installClaude = confirm;
      }

      if (installClaude) {
        spinner = ora('Installing Claude Code CLI...').start();
        const installResult = await installClaudeCode({ showSpinner: false });

        if (installResult.success) {
          spinner.succeed(`Claude Code installed (v${installResult.version})`);
        } else {
          spinner.fail(`Failed to install Claude Code: ${installResult.error}`);
          prompts.log.warn('You can install manually: npm install -g @anthropic-ai/claude-code');
        }
      }
    }

    return true;
  } catch (error) {
    if (spinner) spinner.fail('Prerequisites check failed');
    logger.error(`Prerequisites check error: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Step 2: GitHub authentication
 */
async function stepGitHubAuth(state: WizardState): Promise<boolean> {
  prompts.log.step('Step 2/8: GitHub Authentication');

  try {
    const result = await authenticateGitHub({ allowSkip: true });
    state.githubAuth = result;

    if (result.authenticated) {
      prompts.log.success(`Authenticated as ${result.username}`);
    } else if (result.method === 'skipped') {
      prompts.log.warn('GitHub authentication skipped. Repository sync will be unavailable.');
    } else {
      prompts.log.warn(`Authentication failed: ${result.error}`);
    }

    return true;
  } catch (error) {
    logger.error(`GitHub auth error: ${error instanceof Error ? error.message : String(error)}`);
    prompts.log.warn('GitHub authentication failed. Continuing without it.');
    return true;
  }
}

/**
 * Step 3: API Keys Configuration
 */
async function stepApiKeys(state: WizardState, options: InitOptions): Promise<boolean> {
  prompts.log.step('Step 3/8: API Keys Configuration');

  try {
    // Build provided keys from CLI options
    const providedKeys: Partial<ApiKeys> = {};
    if (options.githubToken) providedKeys.GITHUB_TOKEN = options.githubToken;
    if (options.exaApiKey) providedKeys.EXA_API_KEY = options.exaApiKey;
    if (options.refApiKey) providedKeys.REF_API_KEY = options.refApiKey;
    if (options.anthropicApiKey) providedKeys.ANTHROPIC_API_KEY = options.anthropicApiKey;
    if (options.perplexityApiKey) providedKeys.PERPLEXITY_API_KEY = options.perplexityApiKey;

    // Also try to get GitHub token from gh CLI (auto-detect)
    if (!providedKeys.GITHUB_TOKEN && state.githubAuth?.authenticated) {
      const storedToken = await getStoredGitHubToken();
      if (storedToken) {
        providedKeys.GITHUB_TOKEN = storedToken;
      }
    }

    const result = await setupApiKeys({
      nonInteractive: options.nonInteractive || !isTTY(),
      providedKeys,
    });

    state.apiKeysResult = result;

    if (!result.success) {
      prompts.log.warn(`API keys setup incomplete: ${result.error}`);
      return true; // Continue anyway
    }

    // Show summary
    const configured = Object.entries(result.keys)
      .filter(([_, v]) => v)
      .map(([k]) => k);

    if (configured.length > 0) {
      prompts.log.success(`Configured ${configured.length} API keys`);
      console.log(`  Saved to: ${result.envPath}`);
    }

    return true;
  } catch (error) {
    logger.error(`API keys error: ${error instanceof Error ? error.message : String(error)}`);
    prompts.log.warn('API keys configuration failed. You can configure later.');
    return true;
  }
}

/**
 * Step 4: Repository sync
 */
async function stepRepoSync(state: WizardState, options: InitOptions): Promise<boolean> {
  prompts.log.step('Step 4/8: Repository Sync');

  // Need GitHub token for sync
  const token = await getStoredGitHubToken();
  if (!token && !state.githubAuth?.authenticated) {
    prompts.log.warn('Skipping repository sync (no GitHub authentication)');
    return true;
  }

  if (!token) {
    prompts.log.warn('Skipping repository sync (token not available)');
    return true;
  }

  try {
    let componentTypes: string[];

    if (options.nonInteractive || options.yes || !isTTY()) {
      // Non-interactive mode: use default components
      componentTypes = ['agents', 'hooks', 'skills'];
      prompts.log.info(`Non-interactive mode: syncing default components (${componentTypes.join(', ')})`);
    } else {
      // Interactive mode: component selection
      const selected = await prompts.multiselect({
        message: 'Select components to sync:',
        options: [
          { value: 'agents', label: 'Agents', hint: 'AI agent definitions (11 available)' },
          { value: 'hooks', label: 'Hooks', hint: 'Event handlers (36 available)' },
          { value: 'skills', label: 'Skills', hint: 'Reusable skill definitions (10 available)' },
          { value: 'scripts', label: 'Scripts', hint: 'Utility scripts' },
          { value: 'slash-commands', label: 'Slash Commands', hint: 'Custom / commands (6 available)' },
        ],
        initialValues: ['agents', 'hooks', 'skills'],
        required: false,
      });

      if (prompts.isCancel(selected)) {
        prompts.log.warn('Repository sync cancelled');
        return true;
      }

      componentTypes = selected as string[];
    }

    if (componentTypes.length === 0) {
      prompts.log.info('No components selected for sync');
      return true;
    }

    // Check for existing customizations and offer backup
    const claudeDir = getClaudeConfigDir();
    if (existsSync(claudeDir) && !options.noBackup) {
      const stats = await detectExistingCustomizations(claudeDir);

      if (stats.hasCustomizations) {
        prompts.log.warn('Existing ~/.claude folder detected:');
        if (stats.agentCount > 0) console.log(`  - Agents: ${stats.agentCount} files`);
        if (stats.hookCount > 0) console.log(`  - Hooks: ${stats.hookCount} files`);
        if (stats.skillCount > 0) console.log(`  - Skills: ${stats.skillCount} files`);
        if (stats.commandCount > 0) console.log(`  - Commands: ${stats.commandCount} files`);
        console.log('');

        // Create backup
        spinner = ora('Creating backup...').start();
        const backupResult = await createBackup('pre-repo-sync');
        state.backupResult = backupResult;

        if (backupResult.success) {
          spinner.succeed(`Backup created: ${path.basename(backupResult.path)}`);
          prompts.log.info(`Restore with: aes-bizzy restore ${backupResult.manifest.id}`);
        } else {
          spinner.fail(`Backup failed: ${backupResult.error}`);

          // Ask user if they want to continue without backup
          if (!options.force && !options.nonInteractive && isTTY()) {
            const proceed = await prompts.confirm({
              message: 'Continue sync without backup?',
              initialValue: false,
            });

            if (prompts.isCancel(proceed) || !proceed) {
              prompts.log.warn('Repository sync cancelled');
              return true;
            }
          } else if (!options.force) {
            prompts.log.warn('Use --force to continue without backup');
            return true;
          }
        }
      }
    }

    spinner = ora('Syncing components from repository...').start();

    const result = await syncPrivateRepo({
      token,
      components: componentTypes as ('agents' | 'hooks' | 'skills' | 'scripts' | 'slash-commands')[],
      force: options.force,
      dryRun: false,
    });

    state.syncResult = result;

    if (result.success) {
      const syncedCount = result.synced.filter(s => s.action !== 'skipped').length;
      spinner.succeed(`Synced ${syncedCount} components`);
    } else {
      spinner.fail(`Sync completed with errors: ${result.errors.join(', ')}`);
    }

    return true;
  } catch (error) {
    if (spinner) spinner.fail('Repository sync failed');
    logger.error(`Sync error: ${error instanceof Error ? error.message : String(error)}`);
    prompts.log.warn('Repository sync failed. You can run it later with: aes-bizzy sync');
    return true;
  }
}

/**
 * Step 5: Beads installation
 */
async function stepBeadsInstall(state: WizardState, options: InitOptions): Promise<boolean> {
  prompts.log.step('Step 5/8: Beads Installation');

  // Check if already installed
  if (await isBeadsInstalled()) {
    const version = await getBeadsVersion();
    prompts.log.success(`Beads already installed (v${version})`);
    state.beadsInstall = { success: true, method: 'npm', version: version || undefined };
    return true;
  }

  try {
    // Get available methods
    const methods = await getAvailableMethods();
    const availableMethods = methods.filter(m => m.available);

    if (availableMethods.length === 0) {
      prompts.log.warn('No installation methods available for Beads');
      return true;
    }

    let selectedMethod: InstallMethod;

    // Check for explicit method from options or environment variable
    const envMethod = process.env['AES_BEADS_METHOD'] as InstallMethod | undefined;
    const explicitMethod = options.beadsMethod || envMethod;

    // Helper to get the preferred or first available method
    const getDefaultMethod = (): InstallMethod => {
      const preferred = availableMethods.find(m => m.preferred);
      return preferred?.method ?? availableMethods[0]!.method;
    };

    if (explicitMethod) {
      // Validate the method is available
      const methodConfig = availableMethods.find(m => m.method === explicitMethod);
      if (methodConfig) {
        selectedMethod = explicitMethod;
        prompts.log.info(`Using specified Beads installation method: ${selectedMethod}`);
      } else {
        prompts.log.warn(`Specified method '${explicitMethod}' not available, using preferred method`);
        selectedMethod = getDefaultMethod();
      }
    } else if (options.nonInteractive || options.yes || !isTTY()) {
      // Non-interactive mode: use preferred method automatically
      selectedMethod = getDefaultMethod();
      prompts.log.info(`Non-interactive mode: using ${selectedMethod} for Beads installation`);
    } else {
      // Interactive mode: present method selection
      const methodOptions = availableMethods.map(m => ({
        value: m.method,
        label: m.method.charAt(0).toUpperCase() + m.method.slice(1),
        hint: m.preferred ? '(recommended)' : undefined,
      }));

      const userSelection = await prompts.select({
        message: 'Select Beads installation method:',
        options: methodOptions,
        initialValue: availableMethods.find(m => m.preferred)?.method,
      });

      if (prompts.isCancel(userSelection)) {
        prompts.log.warn('Beads installation skipped');
        return true;
      }

      selectedMethod = userSelection as InstallMethod;
    }

    state.beadsMethod = selectedMethod;

    spinner = ora(`Installing Beads via ${selectedMethod}...`).start();

    const result = await installBeads({
      preferredMethod: selectedMethod,
      silent: true,
    });

    state.beadsInstall = result;

    if (result.success) {
      spinner.succeed(`Beads installed via ${selectedMethod} (v${result.version})`);
    } else {
      spinner.fail(`Beads installation failed: ${result.error}`);
      prompts.log.warn('You can install Beads manually later');
    }

    return true;
  } catch (error) {
    if (spinner) spinner.fail('Beads installation failed');
    logger.error(`Beads install error: ${error instanceof Error ? error.message : String(error)}`);
    return true;
  }
}

/**
 * Step 6: Task Master installation
 */
async function stepTaskMasterInstall(state: WizardState, options: InitOptions): Promise<boolean> {
  prompts.log.step('Step 6/8: Task Master Installation');

  // Check if already installed
  const status = await isTaskMasterInstalled();
  if (status.available) {
    prompts.log.success('Task Master already installed');
    state.taskMasterInstall = { success: true };
    return true;
  }

  try {
    let model: TaskMasterModel | undefined;

    // Check for explicit model from options or environment variable
    const envModel = process.env['AES_TASKMASTER_MODEL'] as TaskMasterModel | undefined;
    const explicitModel = options.taskmasterModel || envModel;

    if (explicitModel) {
      model = explicitModel as TaskMasterModel;
      prompts.log.info(`Using specified TaskMaster model: ${model}`);
    } else if (options.nonInteractive || options.yes || !isTTY()) {
      // Non-interactive mode: use default model
      model = 'claude-sonnet-4-20250514' as TaskMasterModel;
      prompts.log.info(`Non-interactive mode: using ${model} for TaskMaster`);
    } else {
      // Interactive mode: select model
      model = await selectModel(false) ?? undefined;
    }

    if (!model) {
      prompts.log.warn('Task Master installation skipped');
      return true;
    }

    spinner = ora('Installing Task Master MCP server...').start();

    const result = await installTaskMaster({
      model,
      tier: 'core',
      showSpinner: false,
    });

    state.taskMasterInstall = result;

    if (result.success) {
      spinner.succeed(`Task Master installed with ${model}`);
    } else {
      spinner.fail(`Task Master installation failed: ${result.error}`);
      prompts.log.warn('You can install Task Master later with: aes-bizzy add task-master');
    }

    return true;
  } catch (error) {
    if (spinner) spinner.fail('Task Master installation failed');
    logger.error(`Task Master install error: ${error instanceof Error ? error.message : String(error)}`);
    return true;
  }
}

/**
 * Step 7: MCP servers installation
 */
async function stepMcpServersInstall(state: WizardState, options: InitOptions): Promise<boolean> {
  prompts.log.step('Step 7/8: MCP Servers');

  try {
    let selectedServers: MCPServerId[] | undefined;

    if (options.nonInteractive || options.yes || !isTTY()) {
      // Non-interactive mode: skip MCP server selection (can be configured later)
      prompts.log.info('Non-interactive mode: skipping MCP server selection');
      prompts.log.info('You can configure MCP servers later with: aes-bizzy config');
      return true;
    } else {
      // Interactive mode: select servers
      selectedServers = await selectMCPServers(false) ?? undefined;
    }

    if (!selectedServers || selectedServers.length === 0) {
      prompts.log.info('No MCP servers selected');
      return true;
    }

    spinner = ora(`Installing ${selectedServers.length} MCP server(s)...`).start();

    const summary = await installMCPServers(selectedServers, { showSpinner: false });
    state.mcpInstall = summary;

    if (summary.installed.length > 0) {
      spinner.succeed(`Installed ${summary.installed.length} MCP server(s)`);
    }

    if (summary.skipped.length > 0) {
      prompts.log.warn(`Skipped ${summary.skipped.length} server(s) (missing API keys)`);
    }

    if (summary.failed.length > 0) {
      prompts.log.error(`Failed to install ${summary.failed.length} server(s)`);
    }

    return true;
  } catch (error) {
    if (spinner) spinner.fail('MCP server installation failed');
    logger.error(`MCP install error: ${error instanceof Error ? error.message : String(error)}`);
    return true;
  }
}

/**
 * Step 8: Summary and ecosystem.json creation
 */
async function stepSummary(state: WizardState): Promise<boolean> {
  prompts.log.step('Step 8/8: Saving Configuration');

  try {
    // Initialize or load existing config
    const configResult = await initConfig();
    if (!configResult.success || !configResult.config) {
      prompts.log.error('Failed to initialize configuration');
      return false;
    }

    const config = configResult.config;
    const now = new Date().toISOString();

    // Update config with installation results
    config.lastUpdated = now;

    // Add Beads info if installed
    if (state.beadsInstall?.success) {
      const beadsComponent: InstalledComponent = {
        name: 'beads',
        type: 'scripts',
        installedAt: now,
        source: 'local',
        enabled: true,
        version: state.beadsInstall.version,
        metadata: { method: state.beadsMethod },
      };
      if (!config.components.scripts) {
        config.components.scripts = [];
      }
      config.components.scripts.push(beadsComponent);
    }

    // Add MCP server info
    if (state.mcpInstall?.installed) {
      for (const serverId of state.mcpInstall.installed) {
        config.mcpServers = config.mcpServers || [];
        if (!config.mcpServers.find(s => s.name === serverId)) {
          config.mcpServers.push({
            name: serverId,
            command: 'npx',
            args: ['-y', serverId],
            installedAt: now,
            enabled: true,
          });
        }
      }
    }

    // Save configuration
    const saveResult = await saveConfig(config);
    if (!saveResult.success) {
      prompts.log.error(`Failed to save configuration: ${saveResult.error}`);
      return false;
    }

    prompts.log.success('Configuration saved');

    // Calculate duration
    const duration = Math.round((Date.now() - state.startTime) / 1000);

    // Display summary
    console.log('');
    console.log(gradientString.pastel('Setup Complete!'));
    console.log('');
    console.log('Summary:');
    console.log('--------');

    if (state.prerequisites) {
      console.log(`  Prerequisites: All critical tools installed`);
    }

    if (state.githubAuth?.authenticated) {
      console.log(`  GitHub: Authenticated as ${state.githubAuth.username}`);
    } else {
      console.log(`  GitHub: Not configured`);
    }

    if (state.apiKeysResult?.success) {
      const keyCount = Object.values(state.apiKeysResult.keys).filter(v => v).length;
      console.log(`  API Keys: ${keyCount} configured`);
    }

    if (state.backupResult?.success) {
      console.log(`  Backup: ${state.backupResult.manifest.id}`);
    }

    if (state.syncResult?.success) {
      const syncedCount = state.syncResult.synced.filter(s => s.action !== 'skipped').length;
      console.log(`  Repository: ${syncedCount} components synced`);
    }

    if (state.beadsInstall?.success) {
      console.log(`  Beads: v${state.beadsInstall.version}`);
    }

    if (state.taskMasterInstall?.success) {
      console.log(`  Task Master: Installed`);
    }

    if (state.mcpInstall) {
      console.log(`  MCP Servers: ${state.mcpInstall.installed.length} installed`);
    }

    console.log(`  Duration: ${duration}s`);
    console.log('');

    // Next steps
    prompts.note(
      `1. Run: aes-bizzy doctor\n2. Start using: claude\n3. Create project: aes-bizzy project <name>`,
      'Next Steps'
    );

    return true;
  } catch (error) {
    logger.error(`Summary error: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Run the init wizard
 */
export async function runInitWizard(options: InitOptions = {}): Promise<{
  success: boolean;
  state: WizardState;
}> {
  // Setup signal handlers
  setupSignalHandlers();

  // Initialize state
  wizardState = {
    currentStep: 0,
    totalSteps: 8,
    startTime: Date.now(),
    cancelled: false,
  };

  // Show welcome
  showWelcomeBanner();

  prompts.intro('A.E.S - Bizzy Setup');
  console.log('');
  console.log('This wizard will guide you through setting up your Claude development environment.');
  console.log('It consists of 8 steps. You can skip any step using the --skip-* flags.\n');

  try {
    // Step 1: Prerequisites
    wizardState.currentStep = 1;
    if (!options.skipPrerequisites) {
      const result = await stepPrerequisites(wizardState, options);
      if (!result && !options.force) {
        prompts.outro('Setup incomplete. Please fix prerequisites and try again.');
        return { success: false, state: wizardState };
      }
    } else {
      prompts.log.info('Skipping prerequisites check (--skip-prerequisites)');
    }

    // Step 2: GitHub Auth
    wizardState.currentStep = 2;
    if (!options.skipGithub) {
      await stepGitHubAuth(wizardState);
    } else {
      prompts.log.info('Skipping GitHub authentication (--skip-github)');
    }

    // Step 3: API Keys
    wizardState.currentStep = 3;
    if (!options.skipApiKeys) {
      await stepApiKeys(wizardState, options);
    } else {
      prompts.log.info('Skipping API keys configuration (--skip-api-keys)');
    }

    // Step 4: Repo Sync
    wizardState.currentStep = 4;
    if (!options.skipSync) {
      await stepRepoSync(wizardState, options);
    } else {
      prompts.log.info('Skipping repository sync (--skip-sync)');
    }

    // Step 5: Beads
    wizardState.currentStep = 5;
    if (!options.skipBeads) {
      await stepBeadsInstall(wizardState, options);
    } else {
      prompts.log.info('Skipping Beads installation (--skip-beads)');
    }

    // Step 6: Task Master
    wizardState.currentStep = 6;
    if (!options.skipTaskmaster) {
      await stepTaskMasterInstall(wizardState, options);
    } else {
      prompts.log.info('Skipping Task Master installation (--skip-taskmaster)');
    }

    // Step 7: MCP Servers
    wizardState.currentStep = 7;
    if (!options.skipMcp) {
      await stepMcpServersInstall(wizardState, options);
    } else {
      prompts.log.info('Skipping MCP servers (--skip-mcp)');
    }

    // Step 8: Summary
    wizardState.currentStep = 8;
    const summaryResult = await stepSummary(wizardState);

    prompts.outro(summaryResult ? 'Setup complete!' : 'Setup completed with warnings.');

    return { success: summaryResult, state: wizardState };
  } catch (error) {
    logger.error(`Init wizard error: ${error instanceof Error ? error.message : String(error)}`);
    prompts.outro('Setup failed. See errors above.');
    return { success: false, state: wizardState };
  }
}
