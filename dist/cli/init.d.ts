/**
 * Interactive init wizard with 8-step flow
 *
 * Provides a guided setup experience for the Claude Ecosystem
 * with progress tracking, skip flags, and graceful Ctrl+C handling.
 */
import type { PrerequisitesResult } from '../types/prerequisites.js';
import type { GitHubAuthResult } from '../types/github.js';
import type { InstallResult, InstallMethod } from '../types/installer.js';
import type { TaskMasterModel, ToolTier } from '../types/task-master.js';
import type { InstallationSummary } from '../types/mcp-servers.js';
import type { SyncResult } from '../types/repo-sync.js';
import type { BackupResult } from '../types/backup.js';
import { type ApiKeyResult } from '../installers/api-keys.js';
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
    taskMasterInstall?: {
        success: boolean;
        model?: TaskMasterModel;
        tier?: ToolTier;
    };
    mcpInstall?: InstallationSummary;
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