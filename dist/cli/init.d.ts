/**
 * Interactive init wizard with project-level configuration
 *
 * Provides a guided setup experience for the Claude Ecosystem
 * with progress tracking, skip flags, and graceful Ctrl+C handling.
 *
 * Default: Project-level setup (creates .claude/, .mcp.json, .env.claude)
 * --global: User-level setup (legacy ~/.claude/ behavior)
 */
import { type Credentials } from '../utils/env-claude.js';
import type { PrerequisitesResult } from '../types/prerequisites.js';
import type { GitHubAuthResult } from '../types/github.js';
import type { InstallResult, InstallMethod } from '../types/installer.js';
import type { TaskMasterModel, ToolTier } from '../types/task-master.js';
import type { MCPServerId } from '../types/mcp-servers.js';
import type { SyncResult } from '../types/repo-sync.js';
/**
 * Init wizard options
 */
export interface InitOptions {
    /** Project name - if provided, creates new project directory */
    projectName?: string;
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
    isGlobal: boolean;
    prerequisites?: PrerequisitesResult;
    githubAuth?: GitHubAuthResult;
    credentials: Credentials;
    syncResult?: SyncResult;
    beadsInstall?: InstallResult;
    beadsMethod?: InstallMethod;
    taskMasterInstall?: {
        success: boolean;
        model?: TaskMasterModel;
        tier?: ToolTier;
    };
    selectedMcpServers?: MCPServerId[];
    startTime: number;
    cancelled: boolean;
}
/**
 * Run the init wizard
 */
export declare function runInitWizard(options?: InitOptions): Promise<{
    success: boolean;
    state: WizardState;
}>;
export {};
//# sourceMappingURL=init.d.ts.map