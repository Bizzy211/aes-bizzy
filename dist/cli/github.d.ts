/**
 * GitHub Automation CLI Commands
 *
 * Commands for GitHub issue triage, assignment, and automation.
 */
/**
 * GitHub command options
 */
export interface GitHubCommandOptions {
    owner?: string;
    repo?: string;
    token?: string;
    issue?: number;
    labels?: string[];
    state?: 'open' | 'closed' | 'all';
    limit?: number;
    threshold?: number;
    dryRun?: boolean;
    json?: boolean;
    verbose?: boolean;
}
/**
 * Analyze a single issue
 */
export declare function analyzeCommand(repoStr: string, issueNumber: number, options: GitHubCommandOptions): Promise<void>;
/**
 * Triage a single issue
 */
export declare function triageCommand(repoStr: string, issueNumber: number, options: GitHubCommandOptions): Promise<void>;
/**
 * Assign an issue to agents
 */
export declare function assignCommand(repoStr: string, issueNumber: number, options: GitHubCommandOptions): Promise<void>;
/**
 * Batch triage open issues
 */
export declare function batchTriageCommand(repoStr: string, options: GitHubCommandOptions): Promise<void>;
/**
 * Batch assign open issues
 */
export declare function batchAssignCommand(repoStr: string, options: GitHubCommandOptions): Promise<void>;
/**
 * List available agents
 */
export declare function listAgentsCommand(options: GitHubCommandOptions): Promise<void>;
/**
 * Show mapping statistics
 */
export declare function mappingStatsCommand(options: GitHubCommandOptions): Promise<void>;
/**
 * Show automation log
 */
export declare function logCommand(options: GitHubCommandOptions): Promise<void>;
/**
 * Run GitHub command
 */
export declare function runGitHub(subcommand: string, args: string[], options: GitHubCommandOptions): Promise<void>;
//# sourceMappingURL=github.d.ts.map