/**
 * Interactive init wizard with project-level configuration
 *
 * Provides a guided setup experience for the Claude Ecosystem
 * with progress tracking, skip flags, and graceful Ctrl+C handling.
 *
 * Default: Project-level setup (creates .claude/, .mcp.json, .env.claude)
 * --global: User-level setup (legacy ~/.claude/ behavior)
 */

import * as prompts from '@clack/prompts';
import gradientString from 'gradient-string';
import ora from 'ora';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { createLogger } from '../utils/logger.js';
import { checkPrerequisites } from '../installers/prerequisites.js';
import { installClaudeCode } from '../installers/claude-code.js';
import { getStoredGitHubToken, createGitHubRepo, isGitHubCLIAuthenticated } from '../installers/github.js';
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
import { selectMCPServers } from '../installers/mcp-servers.js';
import { updateGitignore, CLAUDE_GITIGNORE_ENTRIES } from '../utils/gitignore.js';
import { createMcpConfig } from '../utils/mcp-config.js';
import {
  saveEnvClaude,
  getRequiredCredentialsForServers,
  type Credentials,
} from '../utils/env-claude.js';
import { createKickoffContext } from '../utils/kickoff-context.js';
import { executeCommand } from '../utils/shell.js';
import type { PrerequisitesResult } from '../types/prerequisites.js';
import type { GitHubAuthResult } from '../types/github.js';
import type { InstallResult, InstallMethod } from '../types/installer.js';
import type { TaskMasterModel, ToolTier } from '../types/task-master.js';
import type { MCPServerId } from '../types/mcp-servers.js';
import type { SyncResult } from '../types/repo-sync.js';

const logger = createLogger({ context: { module: 'init-wizard' } });

/**
 * Check if running in an interactive TTY environment
 */
function isTTY(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

/**
 * Init wizard options
 */
export interface InitOptions {
  /** Project name - if provided, creates new project directory */
  projectName?: string;
  /** Project description for PRD generation and agent context */
  projectDescription?: string;
  /** Use global/user-level config instead of project-level */
  global?: boolean;
  /** Skip individual steps */
  skipPrerequisites?: boolean;
  skipGithub?: boolean;
  skipSync?: boolean;
  skipBeads?: boolean;
  skipTaskmaster?: boolean;
  skipMcp?: boolean;
  skipApiKeys?: boolean;
  /** Force overwrite existing files */
  force?: boolean;
  /** Auto-confirm prompts */
  yes?: boolean;
  /** Skip backup before repo sync */
  noBackup?: boolean;
  /** Beads installation method */
  beadsMethod?: InstallMethod;
  /** TaskMaster model */
  taskmasterModel?: string;
  /** Non-interactive mode */
  nonInteractive?: boolean;
  /** Skip git initialization */
  skipGit?: boolean;
  /** Create GitHub repository */
  github?: boolean;
  /** Make GitHub repo public (default: private) */
  public?: boolean;
  /** Initialize TaskMaster in project */
  taskmaster?: boolean;
  /** Initialize Beads in project */
  beads?: boolean;
  /** Pre-provided API keys */
  githubToken?: string;
  anthropicApiKey?: string;
  perplexityApiKey?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
}

/**
 * Wizard state to track progress
 */
interface WizardState {
  currentStep: number;
  totalSteps: number;
  projectPath: string;
  projectName: string;
  isGlobal: boolean;
  projectDescription?: string;
  prerequisites?: PrerequisitesResult;
  githubAuth?: GitHubAuthResult;
  credentials: Credentials;
  syncResult?: SyncResult;
  beadsInstall?: InstallResult;
  beadsMethod?: InstallMethod;
  taskMasterInstall?: { success: boolean; model?: TaskMasterModel; tier?: ToolTier };
  selectedMcpServers?: MCPServerId[];
  githubRepoUrl?: string;
  startTime: number;
  cancelled: boolean;
}

/**
 * CLAUDE.md template
 */
const CLAUDE_MD_TEMPLATE = `# {{PROJECT_NAME}}

## Project Overview
This project uses JHC Agentic EcoSystem - Bizzy for AI-assisted development.

## Development Guidelines

### Code Style
- Follow consistent naming conventions
- Write clear, self-documenting code
- Include meaningful comments for complex logic

### Git Workflow
- Write descriptive commit messages
- Create feature branches for new work
- Keep commits focused and atomic

### Testing
- Write tests for new features
- Ensure all tests pass before committing
- Aim for good test coverage

## Commands

\`\`\`bash
# Development
npm run dev       # Start development server
npm run build     # Build for production
npm test          # Run tests

# Claude Code
claude            # Start Claude Code session
\`\`\`

## Project Structure

\`\`\`
{{PROJECT_NAME}}/
├── .claude/          # Claude configuration (gitignored)
├── .mcp.json         # MCP server config (gitignored)
├── .env.claude       # Credentials (gitignored)
├── src/              # Source code
├── tests/            # Test files
├── CLAUDE.md         # This file
└── package.json      # Dependencies
\`\`\`

## Notes
- Created: {{CREATED_AT}}
- Setup: JHC Agentic EcoSystem - Bizzy
`;

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
      logger.debug(`Cancelled at step ${wizardState.currentStep}/${wizardState.totalSteps}`);
      process.exit(130);
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
 * Step 0: Project description (for new projects)
 * Collects a brief description to guide PRD generation and agent context
 */
async function stepProjectDescription(state: WizardState, options: InitOptions): Promise<boolean> {
  // Only ask for description when creating a new project
  if (!options.projectName) {
    return true;
  }

  prompts.log.step('Project Description');

  // Use pre-provided description if available
  if (options.projectDescription) {
    state.projectDescription = options.projectDescription;
    prompts.log.success('Using provided project description');
    return true;
  }

  if (options.nonInteractive || !isTTY()) {
    prompts.log.info('Skipping project description (non-interactive mode)');
    return true;
  }

  try {
    const description = await prompts.text({
      message: 'Describe your project (what are you building?):',
      placeholder: 'e.g., A web app for tracking fitness goals with social features',
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return undefined; // Allow empty (will be skipped)
        }
        if (value.trim().length < 10) {
          return 'Please provide a more detailed description (at least 10 characters)';
        }
        return undefined;
      },
    });

    if (prompts.isCancel(description)) {
      return false;
    }

    if (description && description.trim().length > 0) {
      state.projectDescription = description.trim();
      prompts.log.success('Project description captured');

      // Optionally ask for more context
      const addDetails = await prompts.confirm({
        message: 'Would you like to add more details about features or requirements?',
        initialValue: false,
      });

      if (!prompts.isCancel(addDetails) && addDetails) {
        const details = await prompts.text({
          message: 'Additional details:',
          placeholder: 'Key features, tech preferences, target users...',
        });

        if (!prompts.isCancel(details) && details) {
          state.projectDescription += '\n\n' + details.trim();
        }
      }
    } else {
      prompts.log.info('No description provided (you can add one later)');
    }

    return true;
  } catch (error) {
    logger.error(`Project description error: ${error instanceof Error ? error.message : String(error)}`);
    prompts.log.warn('Continuing without project description');
    return true;
  }
}

/**
 * Create project directory structure
 */
async function createProjectStructure(
  projectPath: string,
  projectName: string,
  options: InitOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    // Create main directory if it doesn't exist
    if (!existsSync(projectPath)) {
      mkdirSync(projectPath, { recursive: true });
    }

    // Create .claude directory
    const claudeDir = path.join(projectPath, '.claude');
    if (!existsSync(claudeDir)) {
      mkdirSync(claudeDir, { recursive: true });
    }

    // Create src and tests directories for new projects
    if (options.projectName) {
      const srcDir = path.join(projectPath, 'src');
      const testsDir = path.join(projectPath, 'tests');

      if (!existsSync(srcDir)) {
        mkdirSync(srcDir, { recursive: true });
      }
      if (!existsSync(testsDir)) {
        mkdirSync(testsDir, { recursive: true });
      }
    }

    // Create CLAUDE.md
    const claudeMdPath = path.join(projectPath, 'CLAUDE.md');
    if (!existsSync(claudeMdPath) || options.force) {
      const content = CLAUDE_MD_TEMPLATE
        .replace(/\{\{PROJECT_NAME\}\}/g, projectName)
        .replace(/\{\{CREATED_AT\}\}/g, new Date().toISOString());
      await fs.writeFile(claudeMdPath, content, 'utf-8');
    }

    // Create basic package.json for new projects
    if (options.projectName) {
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (!existsSync(packageJsonPath)) {
        const packageJson = {
          name: projectName,
          version: '0.1.0',
          description: `A project created with JHC Agentic EcoSystem - Bizzy`,
          type: 'module',
          scripts: {
            dev: "echo 'Add your dev script'",
            build: "echo 'Add your build script'",
            test: "echo 'Add your test script'",
          },
          keywords: [],
          author: '',
          license: 'MIT',
        };
        await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');
      }
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Step 1: Prerequisites check
 */
async function stepPrerequisites(state: WizardState, options: InitOptions): Promise<boolean> {
  prompts.log.step(`Step 1/${state.totalSteps}: Checking Prerequisites`);

  spinner = ora('Checking installed tools...').start();

  try {
    const result = await checkPrerequisites();
    state.prerequisites = result;
    spinner.succeed('Prerequisites checked');

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

    if (!result.node.installed || !result.npm.installed || !result.git.installed) {
      prompts.log.error('Missing critical prerequisites. Please install them before continuing.');
      return false;
    }

    // Offer to install Claude Code if missing
    if (!result.claudeCode.installed) {
      let installClaude = options.nonInteractive || options.yes || !isTTY();

      if (!installClaude && isTTY()) {
        const confirm = await prompts.confirm({
          message: 'Claude Code CLI not found. Install now?',
          initialValue: true,
        });

        if (prompts.isCancel(confirm)) return false;
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
 * Step 2: Credentials collection
 */
async function stepCredentials(state: WizardState, options: InitOptions): Promise<boolean> {
  prompts.log.step(`Step 2/${state.totalSteps}: API Keys & Credentials`);

  try {
    // Start with provided options
    const credentials: Credentials = {};

    if (options.githubToken) credentials.GITHUB_TOKEN = options.githubToken;
    if (options.anthropicApiKey) credentials.ANTHROPIC_API_KEY = options.anthropicApiKey;
    if (options.perplexityApiKey) credentials.PERPLEXITY_API_KEY = options.perplexityApiKey;
    if (options.supabaseUrl) credentials.SUPABASE_URL = options.supabaseUrl;
    if (options.supabaseKey) credentials.SUPABASE_KEY = options.supabaseKey;

    // Try to get GitHub token from gh CLI
    if (!credentials.GITHUB_TOKEN) {
      const storedToken = await getStoredGitHubToken();
      if (storedToken) {
        credentials.GITHUB_TOKEN = storedToken;
        prompts.log.success('GitHub token detected from gh CLI');
      }
    }

    // Interactive credential collection
    if (!options.nonInteractive && isTTY()) {
      // Ask about GitHub token if not set
      if (!credentials.GITHUB_TOKEN) {
        const token = await prompts.password({
          message: 'GitHub Personal Access Token (or Enter to skip):',
        });

        if (!prompts.isCancel(token) && token) {
          credentials.GITHUB_TOKEN = token;
        }
      }

      // Ask about Anthropic API key
      if (!credentials.ANTHROPIC_API_KEY) {
        const key = await prompts.password({
          message: 'Anthropic API Key (or Enter to skip):',
        });

        if (!prompts.isCancel(key) && key) {
          credentials.ANTHROPIC_API_KEY = key;
        }
      }

      // Ask about Supabase if not set
      if (!credentials.SUPABASE_URL) {
        const url = await prompts.text({
          message: 'Supabase Project URL (or Enter to skip):',
          placeholder: 'https://xxxxx.supabase.co',
        });

        if (!prompts.isCancel(url) && url) {
          credentials.SUPABASE_URL = url;

          // Ask for key only if URL provided
          const key = await prompts.password({
            message: 'Supabase Service Role Key:',
          });

          if (!prompts.isCancel(key) && key) {
            credentials.SUPABASE_KEY = key;
          }
        }
      }
    }

    state.credentials = credentials;

    // Save credentials to .env.claude (project-level) or show summary
    if (!state.isGlobal) {
      const credCount = Object.values(credentials).filter(Boolean).length;
      if (credCount > 0) {
        const result = await saveEnvClaude(state.projectPath, credentials);
        if (result.success) {
          prompts.log.success(`Saved ${credCount} credential(s) to .env.claude`);
        } else {
          prompts.log.warn(`Failed to save credentials: ${result.error}`);
        }
      } else {
        prompts.log.info('No credentials configured (you can add them later to .env.claude)');
      }
    }

    return true;
  } catch (error) {
    logger.error(`Credentials error: ${error instanceof Error ? error.message : String(error)}`);
    prompts.log.warn('Credentials configuration failed. You can configure later.');
    return true;
  }
}

/**
 * Step 3: MCP server selection and .mcp.json creation
 */
async function stepMcpServers(state: WizardState, options: InitOptions): Promise<boolean> {
  prompts.log.step(`Step 3/${state.totalSteps}: MCP Servers`);

  try {
    let selectedServers: MCPServerId[] | undefined;

    if (options.nonInteractive || options.yes || !isTTY()) {
      // Non-interactive: use recommended servers
      selectedServers = ['github', 'task-master-ai', 'context7', 'sequential-thinking'];
      prompts.log.info(`Using recommended MCP servers: ${selectedServers.join(', ')}`);
    } else {
      selectedServers = await selectMCPServers(false) ?? undefined;
    }

    if (!selectedServers || selectedServers.length === 0) {
      prompts.log.info('No MCP servers selected');
      return true;
    }

    state.selectedMcpServers = selectedServers;

    // Create .mcp.json (project-level)
    if (!state.isGlobal) {
      spinner = ora('Creating .mcp.json...').start();

      const result = await createMcpConfig(state.projectPath, selectedServers);

      if (result.success) {
        spinner.succeed(`Created .mcp.json with ${result.serversAdded} server(s)`);
      } else {
        spinner.fail(`Failed to create .mcp.json: ${result.error}`);
      }

      // Check for missing credentials
      const requiredCreds = getRequiredCredentialsForServers(selectedServers);
      const missingCreds = requiredCreds.filter(key => !state.credentials[key]);

      if (missingCreds.length > 0) {
        prompts.log.warn(`Missing credentials for full functionality: ${missingCreds.join(', ')}`);
        prompts.log.info('Add them to .env.claude when available');
      }
    }

    return true;
  } catch (error) {
    if (spinner) spinner.fail('MCP server setup failed');
    logger.error(`MCP error: ${error instanceof Error ? error.message : String(error)}`);
    return true;
  }
}

/**
 * Step 4: Repository sync (agents, hooks, skills)
 */
async function stepRepoSync(state: WizardState, options: InitOptions): Promise<boolean> {
  prompts.log.step(`Step 4/${state.totalSteps}: Repository Sync`);

  const token = state.credentials.GITHUB_TOKEN || await getStoredGitHubToken();
  if (!token) {
    prompts.log.warn('Skipping repository sync (no GitHub token)');
    return true;
  }

  try {
    let componentTypes: string[];

    if (options.nonInteractive || options.yes || !isTTY()) {
      componentTypes = ['agents', 'hooks', 'skills'];
      prompts.log.info(`Syncing: ${componentTypes.join(', ')}`);
    } else {
      const selected = await prompts.multiselect({
        message: 'Select components to sync:',
        options: [
          { value: 'agents', label: 'Agents', hint: 'AI agent definitions' },
          { value: 'hooks', label: 'Hooks', hint: 'Event handlers' },
          { value: 'skills', label: 'Skills', hint: 'Reusable skill definitions' },
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

    spinner = ora('Syncing components...').start();

    // Sync to project .claude/ directory
    const targetPath = state.isGlobal
      ? path.join(require('os').homedir(), '.claude')
      : path.join(state.projectPath, '.claude');

    const result = await syncPrivateRepo({
      token,
      components: componentTypes as ('agents' | 'hooks' | 'skills')[],
      force: options.force,
      dryRun: false,
      targetPath,
    });

    state.syncResult = result;

    if (result.success) {
      const syncedCount = result.synced.filter(s => s.action !== 'skipped').length;
      spinner.succeed(`Synced ${syncedCount} components to ${state.isGlobal ? '~/.claude' : '.claude/'}`);
    } else {
      spinner.fail(`Sync completed with errors: ${result.errors.join(', ')}`);
    }

    return true;
  } catch (error) {
    if (spinner) spinner.fail('Repository sync failed');
    logger.error(`Sync error: ${error instanceof Error ? error.message : String(error)}`);
    prompts.log.warn('You can run sync later with: aes-bizzy sync');
    return true;
  }
}

/**
 * Step 5: Beads installation
 */
async function stepBeadsInstall(state: WizardState, options: InitOptions): Promise<boolean> {
  prompts.log.step(`Step 5/${state.totalSteps}: Beads Installation`);

  if (await isBeadsInstalled()) {
    const version = await getBeadsVersion();
    prompts.log.success(`Beads already installed (v${version})`);
    state.beadsInstall = { success: true, method: 'binary', version: version || undefined };
    return true;
  }

  try {
    const methods = await getAvailableMethods();
    const availableMethods = methods.filter(m => m.available);

    if (availableMethods.length === 0) {
      prompts.log.warn('No installation methods available for Beads');
      return true;
    }

    const getDefaultMethod = (): InstallMethod => {
      const preferred = availableMethods.find(m => m.preferred);
      return preferred?.method ?? availableMethods[0]!.method;
    };

    const envMethod = process.env['AES_BEADS_METHOD'] as InstallMethod | undefined;
    const explicitMethod = options.beadsMethod || envMethod;

    let selectedMethod: InstallMethod;

    if (explicitMethod) {
      const methodConfig = availableMethods.find(m => m.method === explicitMethod);
      if (methodConfig) {
        selectedMethod = explicitMethod;
      } else {
        prompts.log.warn(`Method '${explicitMethod}' not available, using preferred`);
        selectedMethod = getDefaultMethod();
      }
    } else {
      selectedMethod = getDefaultMethod();
    }

    state.beadsMethod = selectedMethod;

    const platform = process.platform === 'win32' ? 'Windows' : process.platform === 'darwin' ? 'macOS' : 'Linux';
    prompts.log.info(`Installing Beads via ${selectedMethod} (recommended for ${platform})`);

    spinner = ora(`Installing Beads via ${selectedMethod}...`).start();

    const result = await installBeads({
      preferredMethod: selectedMethod,
      silent: true,
    });

    state.beadsInstall = result;

    if (result.success) {
      spinner.succeed(`Beads installed via ${selectedMethod} (v${result.version})`);

      // Initialize beads in project if requested
      if (options.beads && !state.isGlobal) {
        await executeCommand('bd', ['init'], { cwd: state.projectPath });
      }
    } else {
      spinner.fail(`Beads installation failed: ${result.error}`);
    }

    return true;
  } catch (error) {
    if (spinner) spinner.fail('Beads installation failed');
    logger.error(`Beads error: ${error instanceof Error ? error.message : String(error)}`);
    return true;
  }
}

/**
 * Step 6: Task Master installation
 */
async function stepTaskMasterInstall(state: WizardState, options: InitOptions): Promise<boolean> {
  prompts.log.step(`Step 6/${state.totalSteps}: Task Master Installation`);

  const status = await isTaskMasterInstalled();
  if (status.available) {
    prompts.log.success('Task Master already installed');
    state.taskMasterInstall = { success: true };

    // Initialize in project if requested
    if (options.taskmaster && !state.isGlobal) {
      await executeCommand('npx', ['task-master', 'init', '--yes'], { cwd: state.projectPath });
    }

    return true;
  }

  try {
    let model: TaskMasterModel | undefined;

    const envModel = process.env['AES_TASKMASTER_MODEL'] as TaskMasterModel | undefined;
    const explicitModel = options.taskmasterModel || envModel;

    if (explicitModel) {
      model = explicitModel as TaskMasterModel;
    } else if (options.nonInteractive || options.yes || !isTTY()) {
      model = 'claude-sonnet-4-20250514' as TaskMasterModel;
    } else {
      model = await selectModel(false) ?? undefined;
    }

    if (!model) {
      prompts.log.warn('Task Master installation skipped');
      return true;
    }

    spinner = ora('Installing Task Master...').start();

    const result = await installTaskMaster({
      model,
      tier: 'core',
      showSpinner: false,
    });

    state.taskMasterInstall = result;

    if (result.success) {
      spinner.succeed(`Task Master installed with ${model}`);

      // Initialize in project if requested
      if (options.taskmaster && !state.isGlobal) {
        await executeCommand('npx', ['task-master', 'init', '--yes'], { cwd: state.projectPath });
      }
    } else {
      spinner.fail(`Task Master installation failed: ${result.error}`);
    }

    return true;
  } catch (error) {
    if (spinner) spinner.fail('Task Master installation failed');
    logger.error(`Task Master error: ${error instanceof Error ? error.message : String(error)}`);
    return true;
  }
}

/**
 * Step 7: Update .gitignore
 */
async function stepGitignore(state: WizardState, options: InitOptions): Promise<boolean> {
  if (state.isGlobal) {
    // Skip for global mode
    return true;
  }

  prompts.log.step(`Step 7/${state.totalSteps}: Updating .gitignore`);

  try {
    const result = await updateGitignore(state.projectPath, CLAUDE_GITIGNORE_ENTRIES);

    if (result.success) {
      if (result.created) {
        prompts.log.success('Created .gitignore with Claude entries');
      } else if (result.entriesAdded > 0) {
        prompts.log.success(`Added ${result.entriesAdded} Claude entries to .gitignore`);
      } else {
        prompts.log.info('.gitignore already has Claude entries');
      }
    } else {
      prompts.log.warn(`Failed to update .gitignore: ${result.error}`);
    }

    // Initialize git if this is a new project
    if (options.projectName && !options.skipGit) {
      const gitDir = path.join(state.projectPath, '.git');
      if (!existsSync(gitDir)) {
        spinner = ora('Initializing git repository...').start();
        const gitResult = await executeCommand('git', ['init'], { cwd: state.projectPath });

        if (gitResult.exitCode === 0) {
          spinner.succeed('Git repository initialized');

          // Create initial commit
          await executeCommand('git', ['add', '-A'], { cwd: state.projectPath });
          await executeCommand(
            'git',
            ['commit', '-m', 'Initial commit - Created with JHC Agentic EcoSystem - Bizzy'],
            { cwd: state.projectPath }
          );
        } else {
          spinner.fail('Failed to initialize git');
        }
      }
    }

    return true;
  } catch (error) {
    logger.error(`Gitignore error: ${error instanceof Error ? error.message : String(error)}`);
    return true;
  }
}

/**
 * Step 7b: GitHub repository creation (for new projects)
 */
async function stepGitHubRepo(state: WizardState, options: InitOptions): Promise<boolean> {
  // Only offer for new projects
  if (!options.projectName) {
    return true;
  }

  // Check if --github flag was passed or if we should ask
  let createRepo = options.github;

  if (createRepo === undefined && !options.nonInteractive && isTTY()) {
    // Check if gh CLI is authenticated
    const ghAuthenticated = await isGitHubCLIAuthenticated();

    if (ghAuthenticated) {
      prompts.log.step('GitHub Repository');

      const confirm = await prompts.confirm({
        message: 'Would you like to create a GitHub repository for this project?',
        initialValue: true,
      });

      if (prompts.isCancel(confirm)) {
        return false;
      }

      createRepo = confirm;
    } else {
      prompts.log.info('Skipping GitHub repo creation (gh CLI not authenticated)');
      return true;
    }
  }

  if (!createRepo) {
    return true;
  }

  try {
    spinner = ora('Creating GitHub repository...').start();

    // Build description from project description or default
    const description = state.projectDescription
      ? (state.projectDescription.split('\n')[0] ?? '').substring(0, 200) // First line, max 200 chars
      : `Created with JHC Agentic EcoSystem - Bizzy`;

    const result = await createGitHubRepo({
      name: state.projectName,
      description,
      public: options.public ?? false,
      cwd: state.projectPath,
      addRemote: true,
      push: true,
    });

    if (result.success) {
      state.githubRepoUrl = result.url;
      spinner.succeed(`GitHub repository created: ${result.url}`);
    } else {
      spinner.fail(`Failed to create GitHub repository: ${result.error}`);
      prompts.log.info('You can create a repository later with: gh repo create');
    }

    return true;
  } catch (error) {
    if (spinner) spinner.fail('GitHub repository creation failed');
    logger.error(`GitHub repo error: ${error instanceof Error ? error.message : String(error)}`);
    prompts.log.warn('You can create a repository later with: gh repo create');
    return true;
  }
}

/**
 * Step 8: Summary
 */
async function stepSummary(state: WizardState, options: InitOptions): Promise<boolean> {
  prompts.log.step(`Step 8/${state.totalSteps}: Setup Complete`);

  const duration = Math.round((Date.now() - state.startTime) / 1000);

  console.log('');
  console.log(gradientString.pastel('Setup Complete!'));
  console.log('');
  console.log('Summary:');
  console.log('--------');
  console.log(`  Mode: ${state.isGlobal ? 'Global (~/.claude)' : 'Project-level'}`);
  console.log(`  Project: ${state.projectName}`);
  console.log(`  Location: ${state.projectPath}`);

  if (state.projectDescription) {
    const truncated = state.projectDescription.length > 60
      ? state.projectDescription.substring(0, 57) + '...'
      : state.projectDescription;
    console.log(`  Description: ${truncated}`);
  }

  if (state.prerequisites) {
    console.log('  Prerequisites: All critical tools installed');
  }

  const credCount = Object.values(state.credentials).filter(Boolean).length;
  console.log(`  Credentials: ${credCount} configured`);

  if (state.selectedMcpServers?.length) {
    console.log(`  MCP Servers: ${state.selectedMcpServers.length} configured`);
  }

  if (state.syncResult?.success) {
    const syncedCount = state.syncResult.synced.filter(s => s.action !== 'skipped').length;
    console.log(`  Components: ${syncedCount} synced`);
  }

  if (state.beadsInstall?.success) {
    console.log(`  Beads: v${state.beadsInstall.version}`);
  }

  if (state.taskMasterInstall?.success) {
    console.log('  Task Master: Installed');
  }

  if (state.githubRepoUrl) {
    console.log(`  GitHub: ${state.githubRepoUrl}`);
  }

  console.log(`  Duration: ${duration}s`);
  console.log('');

  // Kickoff status for new projects
  if (options.projectName && state.projectDescription) {
    console.log('Kickoff Context:');
    console.log('----------------');
    console.log('  \u2705 Kickoff context created (.claude/KICKOFF.md)');
    console.log('  \u2705 Project description captured');

    if (state.githubRepoUrl) {
      console.log('  \u2705 GitHub repository linked');
    }

    console.log('');
    console.log('  pm-lead agent will:');
    console.log('    1. Research project domain using Exa & Ref');
    console.log('    2. Generate comprehensive PRD');
    console.log('    3. Create tasks with Task Master');
    console.log('    4. Orchestrate specialized agents');
    console.log('');
  }

  // Next steps
  const nextSteps: string[] = [];

  if (options.projectName) {
    nextSteps.push(`cd ${options.projectName}`);
  }

  if (!state.isGlobal) {
    nextSteps.push('# Add any missing credentials to .env.claude');
  }

  if (options.projectName && state.projectDescription) {
    nextSteps.push('claude    # Claude will start kickoff workflow automatically');
  } else {
    nextSteps.push('claude    # Start Claude Code');
  }

  prompts.note(nextSteps.join('\n'), 'Next Steps');

  return true;
}

/**
 * Run the init wizard
 */
export async function runInitWizard(options: InitOptions = {}): Promise<{
  success: boolean;
  state: WizardState;
}> {
  setupSignalHandlers();

  // Determine project path
  let projectPath: string;
  let projectName: string;

  if (options.projectName) {
    // Creating new project
    projectPath = path.resolve(process.cwd(), options.projectName);
    projectName = options.projectName;
  } else {
    // Setup in current directory
    projectPath = process.cwd();
    projectName = path.basename(projectPath);
  }

  const isGlobal = options.global ?? false;
  const totalSteps = isGlobal ? 6 : 8; // Global mode skips gitignore and some project-specific steps

  wizardState = {
    currentStep: 0,
    totalSteps,
    projectPath,
    projectName,
    isGlobal,
    credentials: {},
    startTime: Date.now(),
    cancelled: false,
  };

  showWelcomeBanner();

  const modeDesc = isGlobal ? 'Global (~/.claude)' : `Project (${projectPath})`;
  prompts.intro(`A.E.S - Bizzy Setup [${modeDesc}]`);
  console.log('');

  if (options.projectName) {
    console.log(`Creating new project: ${options.projectName}\n`);
  }

  try {
    // Create project structure first (if project-level)
    if (!isGlobal) {
      const structureResult = await createProjectStructure(projectPath, projectName, options);
      if (!structureResult.success) {
        prompts.log.error(`Failed to create project structure: ${structureResult.error}`);
        return { success: false, state: wizardState };
      }
    }

    // Step 0 (optional): Project description for new projects
    if (options.projectName) {
      const descResult = await stepProjectDescription(wizardState, options);
      if (!descResult) {
        prompts.outro('Setup cancelled.');
        return { success: false, state: wizardState };
      }
    }

    // Step 1: Prerequisites
    wizardState.currentStep = 1;
    if (!options.skipPrerequisites) {
      const result = await stepPrerequisites(wizardState, options);
      if (!result && !options.force) {
        prompts.outro('Setup incomplete. Please fix prerequisites and try again.');
        return { success: false, state: wizardState };
      }
    } else {
      prompts.log.info('Skipping prerequisites (--skip-prerequisites)');
    }

    // Step 2: Credentials
    wizardState.currentStep = 2;
    if (!options.skipApiKeys) {
      await stepCredentials(wizardState, options);
    } else {
      prompts.log.info('Skipping credentials (--skip-api-keys)');
    }

    // Step 3: MCP Servers
    wizardState.currentStep = 3;
    if (!options.skipMcp) {
      await stepMcpServers(wizardState, options);
    } else {
      prompts.log.info('Skipping MCP servers (--skip-mcp)');
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
      prompts.log.info('Skipping Beads (--skip-beads)');
    }

    // Step 6: Task Master
    wizardState.currentStep = 6;
    if (!options.skipTaskmaster) {
      await stepTaskMasterInstall(wizardState, options);
    } else {
      prompts.log.info('Skipping Task Master (--skip-taskmaster)');
    }

    // Step 7: Gitignore (project-level only)
    if (!isGlobal) {
      wizardState.currentStep = 7;
      await stepGitignore(wizardState, options);

      // Step 7b: GitHub repo creation (for new projects only, after git init)
      if (options.projectName) {
        const repoResult = await stepGitHubRepo(wizardState, options);
        if (!repoResult) {
          prompts.outro('Setup cancelled.');
          return { success: false, state: wizardState };
        }
      }

      // Step 7c: Create kickoff context for pm-lead (new projects only)
      if (options.projectName && wizardState.projectDescription) {
        spinner = ora('Creating kickoff context...').start();

        const kickoffResult = await createKickoffContext({
          projectName: wizardState.projectName,
          projectPath: wizardState.projectPath,
          projectDescription: wizardState.projectDescription,
          githubUrl: wizardState.githubRepoUrl,
          hasTaskMaster: wizardState.taskMasterInstall?.success ?? false,
          hasBeads: wizardState.beadsInstall?.success ?? false,
          mcpServers: wizardState.selectedMcpServers ?? [],
        });

        if (kickoffResult.success) {
          spinner.succeed('Kickoff context created for pm-lead agent');
        } else {
          spinner.warn(`Kickoff context not created: ${kickoffResult.error}`);
        }
      }
    }

    // Step 8: Summary
    wizardState.currentStep = totalSteps;
    await stepSummary(wizardState, options);

    prompts.outro('Setup complete!');

    // Offer to launch Claude Code for new projects with kickoff context
    if (options.projectName && wizardState.projectDescription && !options.nonInteractive && isTTY()) {
      console.log('');
      const launchClaude = await prompts.confirm({
        message: 'Would you like to launch Claude Code to start the kickoff workflow?',
        initialValue: true,
      });

      if (!prompts.isCancel(launchClaude) && launchClaude) {
        console.log('');
        prompts.log.info('Launching Claude Code with pm-lead agent...');
        prompts.log.info('Claude will use the kickoff context to research and generate a PRD.');
        console.log('');

        // Launch claude with a prompt to start the kickoff workflow
        const claudeResult = await executeCommand('claude', [
          '-p',
          'Read the kickoff context from .claude/KICKOFF.md and start the project workflow: 1) Research the project domain using Exa and Ref, 2) Generate a comprehensive PRD, 3) Parse it with Task Master to create tasks.',
        ], {
          cwd: wizardState.projectPath,
          silent: false,
          // Don't capture output - let it run interactively
        });

        if (claudeResult.exitCode !== 0) {
          prompts.log.warn('Claude Code exited with an error. You can start manually: claude');
        }
      }
    }

    return { success: true, state: wizardState };
  } catch (error) {
    logger.error(`Init wizard error: ${error instanceof Error ? error.message : String(error)}`);
    prompts.outro('Setup failed. See errors above.');
    return { success: false, state: wizardState };
  }
}
