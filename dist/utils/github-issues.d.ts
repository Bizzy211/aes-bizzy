/**
 * GitHub Issue Creator Utility
 *
 * Creates GitHub issues from task structures, kickoff context,
 * or arbitrary data using the GitHub CLI (gh).
 */
/**
 * Issue priority for labeling
 */
export type IssuePriority = 'low' | 'medium' | 'high' | 'critical';
/**
 * Issue type for labeling
 */
export type IssueType = 'feature' | 'bug' | 'task' | 'enhancement' | 'documentation' | 'epic';
/**
 * GitHub issue data
 */
export interface GitHubIssue {
    /** Issue title */
    title: string;
    /** Issue body/description (markdown) */
    body: string;
    /** Labels to apply */
    labels?: string[];
    /** Assignees (GitHub usernames) */
    assignees?: string[];
    /** Milestone title or number */
    milestone?: string | number;
    /** Project name or number */
    project?: string | number;
}
/**
 * Result of creating an issue
 */
export interface CreateIssueResult {
    success: boolean;
    /** Issue number */
    issueNumber?: number;
    /** Issue URL */
    issueUrl?: string;
    error?: string;
}
/**
 * Options for issue creation
 */
export interface CreateIssueOptions {
    /** Repository in format owner/repo (uses current repo if not specified) */
    repo?: string;
    /** Working directory for git context */
    cwd?: string;
}
/**
 * Task structure for bulk issue creation
 */
export interface TaskIssue {
    id: string;
    title: string;
    description?: string;
    priority?: IssuePriority;
    type?: IssueType;
    /** Agent type that should handle this task */
    agentType?: string;
    /** Parent issue number if this is a subtask */
    parentIssue?: number;
    /** Acceptance criteria list */
    acceptanceCriteria?: string[];
    /** Estimated effort (S, M, L, XL) */
    effort?: 'S' | 'M' | 'L' | 'XL';
}
/**
 * Check if GitHub CLI is available and authenticated
 */
export declare function checkGitHubCLI(): Promise<{
    available: boolean;
    authenticated: boolean;
    error?: string;
}>;
/**
 * Create a single GitHub issue
 */
export declare function createGitHubIssue(issue: GitHubIssue, options?: CreateIssueOptions): Promise<CreateIssueResult>;
/**
 * Generate issue body from task structure
 */
export declare function generateIssueBody(task: TaskIssue): string;
/**
 * Generate labels for a task
 */
export declare function generateLabels(task: TaskIssue): string[];
/**
 * Create issue from task structure
 */
export declare function createIssueFromTask(task: TaskIssue, options?: CreateIssueOptions): Promise<CreateIssueResult>;
/**
 * Bulk issue creation result
 */
export interface BulkCreateResult {
    success: boolean;
    created: CreateIssueResult[];
    failed: Array<{
        task: TaskIssue;
        error: string;
    }>;
    totalCreated: number;
    totalFailed: number;
}
/**
 * Create multiple issues from task list
 */
export declare function createIssuesFromTasks(tasks: TaskIssue[], options?: CreateIssueOptions): Promise<BulkCreateResult>;
/**
 * Create an epic issue with linked subtasks
 */
export declare function createEpicWithTasks(epic: TaskIssue, subtasks: TaskIssue[], options?: CreateIssueOptions): Promise<{
    epic: CreateIssueResult;
    subtasks: BulkCreateResult;
}>;
/**
 * List issues in a repository
 */
export declare function listIssues(options: {
    repo?: string;
    cwd?: string;
    state?: 'open' | 'closed' | 'all';
    labels?: string[];
    limit?: number;
}): Promise<{
    success: boolean;
    issues?: Array<{
        number: number;
        title: string;
        state: string;
    }>;
    error?: string;
}>;
//# sourceMappingURL=github-issues.d.ts.map