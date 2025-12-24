/**
 * GitHub Issue Creator Utility
 *
 * Creates GitHub issues from task structures, kickoff context,
 * or arbitrary data using the GitHub CLI (gh).
 */

import { executeCommand } from './shell.js';
import { createLogger } from './logger.js';

const logger = createLogger({ context: { module: 'github-issues' } });

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
export async function checkGitHubCLI(): Promise<{ available: boolean; authenticated: boolean; error?: string }> {
  try {
    const versionCheck = await executeCommand('gh', ['--version'], { silent: true });
    if (versionCheck.exitCode !== 0) {
      return { available: false, authenticated: false, error: 'GitHub CLI (gh) is not installed' };
    }

    const authCheck = await executeCommand('gh', ['auth', 'status'], { silent: true });
    if (authCheck.exitCode !== 0) {
      return { available: true, authenticated: false, error: 'Not authenticated with GitHub CLI' };
    }

    return { available: true, authenticated: true };
  } catch (error) {
    return {
      available: false,
      authenticated: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Create a single GitHub issue
 */
export async function createGitHubIssue(
  issue: GitHubIssue,
  options: CreateIssueOptions = {}
): Promise<CreateIssueResult> {
  const { repo, cwd } = options;

  logger.debug(`Creating issue: ${issue.title}`);

  try {
    // Check GitHub CLI availability
    const cliCheck = await checkGitHubCLI();
    if (!cliCheck.authenticated) {
      return { success: false, error: cliCheck.error };
    }

    // Build gh issue create arguments
    const args = ['issue', 'create'];

    args.push('--title', issue.title);
    args.push('--body', issue.body);

    if (repo) {
      args.push('--repo', repo);
    }

    if (issue.labels && issue.labels.length > 0) {
      args.push('--label', issue.labels.join(','));
    }

    if (issue.assignees && issue.assignees.length > 0) {
      args.push('--assignee', issue.assignees.join(','));
    }

    if (issue.milestone) {
      args.push('--milestone', String(issue.milestone));
    }

    if (issue.project) {
      args.push('--project', String(issue.project));
    }

    const result = await executeCommand('gh', args, {
      cwd,
      silent: true,
    });

    if (result.exitCode !== 0) {
      return {
        success: false,
        error: result.stderr || 'Failed to create issue',
      };
    }

    // Parse issue URL from output
    const output = result.stdout?.trim() || '';
    const urlMatch = output.match(/https:\/\/github\.com\/[^\s]+\/issues\/(\d+)/);

    if (urlMatch && urlMatch[1]) {
      const issueNumber = parseInt(urlMatch[1], 10);
      logger.info(`Created issue #${issueNumber}: ${issue.title}`);
      return {
        success: true,
        issueNumber,
        issueUrl: urlMatch[0],
      };
    }

    return {
      success: true,
      issueUrl: output,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to create issue: ${message}`);
    return { success: false, error: message };
  }
}

/**
 * Generate issue body from task structure
 */
export function generateIssueBody(task: TaskIssue): string {
  const lines: string[] = [];

  // Description
  if (task.description) {
    lines.push(task.description, '');
  }

  // Metadata table
  lines.push('## Details', '');
  lines.push('| Attribute | Value |');
  lines.push('|-----------|-------|');
  lines.push(`| Task ID | ${task.id} |`);
  if (task.priority) {
    lines.push(`| Priority | ${task.priority} |`);
  }
  if (task.type) {
    lines.push(`| Type | ${task.type} |`);
  }
  if (task.agentType) {
    lines.push(`| Agent | \`${task.agentType}\` |`);
  }
  if (task.effort) {
    lines.push(`| Effort | ${task.effort} |`);
  }
  lines.push('');

  // Parent issue reference
  if (task.parentIssue) {
    lines.push(`**Parent Issue:** #${task.parentIssue}`, '');
  }

  // Acceptance criteria
  if (task.acceptanceCriteria && task.acceptanceCriteria.length > 0) {
    lines.push('## Acceptance Criteria', '');
    for (const criterion of task.acceptanceCriteria) {
      lines.push(`- [ ] ${criterion}`);
    }
    lines.push('');
  }

  // Footer
  lines.push('---', '');
  lines.push('*Created via JHC Agentic EcoSystem - Bizzy*');

  return lines.join('\n');
}

/**
 * Generate labels for a task
 */
export function generateLabels(task: TaskIssue): string[] {
  const labels: string[] = [];

  // Priority label
  if (task.priority) {
    labels.push(`priority:${task.priority}`);
  }

  // Type label
  if (task.type) {
    labels.push(task.type);
  }

  // Agent label
  if (task.agentType) {
    labels.push(`agent:${task.agentType}`);
  }

  // Effort label
  if (task.effort) {
    labels.push(`effort:${task.effort}`);
  }

  return labels;
}

/**
 * Create issue from task structure
 */
export async function createIssueFromTask(
  task: TaskIssue,
  options: CreateIssueOptions = {}
): Promise<CreateIssueResult> {
  const issue: GitHubIssue = {
    title: task.title,
    body: generateIssueBody(task),
    labels: generateLabels(task),
  };

  return createGitHubIssue(issue, options);
}

/**
 * Bulk issue creation result
 */
export interface BulkCreateResult {
  success: boolean;
  created: CreateIssueResult[];
  failed: Array<{ task: TaskIssue; error: string }>;
  totalCreated: number;
  totalFailed: number;
}

/**
 * Create multiple issues from task list
 */
export async function createIssuesFromTasks(
  tasks: TaskIssue[],
  options: CreateIssueOptions = {}
): Promise<BulkCreateResult> {
  logger.info(`Creating ${tasks.length} issues...`);

  const created: CreateIssueResult[] = [];
  const failed: Array<{ task: TaskIssue; error: string }> = [];

  for (const task of tasks) {
    const result = await createIssueFromTask(task, options);

    if (result.success) {
      created.push(result);
    } else {
      failed.push({
        task,
        error: result.error || 'Unknown error',
      });
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return {
    success: failed.length === 0,
    created,
    failed,
    totalCreated: created.length,
    totalFailed: failed.length,
  };
}

/**
 * Create an epic issue with linked subtasks
 */
export async function createEpicWithTasks(
  epic: TaskIssue,
  subtasks: TaskIssue[],
  options: CreateIssueOptions = {}
): Promise<{ epic: CreateIssueResult; subtasks: BulkCreateResult }> {
  // Create epic first
  const epicIssue: GitHubIssue = {
    title: `[Epic] ${epic.title}`,
    body: generateEpicBody(epic, subtasks),
    labels: [...generateLabels(epic), 'epic'],
  };

  const epicResult = await createGitHubIssue(epicIssue, options);

  // Create subtasks with reference to epic
  const subtasksWithParent = subtasks.map(task => ({
    ...task,
    parentIssue: epicResult.issueNumber,
  }));

  const subtaskResults = await createIssuesFromTasks(subtasksWithParent, options);

  return {
    epic: epicResult,
    subtasks: subtaskResults,
  };
}

/**
 * Generate epic body with task checklist
 */
function generateEpicBody(epic: TaskIssue, subtasks: TaskIssue[]): string {
  const lines: string[] = [];

  // Description
  if (epic.description) {
    lines.push(epic.description, '');
  }

  // Metadata
  lines.push('## Epic Details', '');
  if (epic.priority) {
    lines.push(`**Priority:** ${epic.priority}`);
  }
  if (epic.agentType) {
    lines.push(`**Lead Agent:** \`${epic.agentType}\``);
  }
  lines.push('');

  // Subtasks checklist
  lines.push('## Tasks', '');
  lines.push('> Issues will be linked when created', '');
  for (const task of subtasks) {
    const priority = task.priority ? ` (${task.priority})` : '';
    lines.push(`- [ ] ${task.title}${priority}`);
  }
  lines.push('');

  // Acceptance criteria
  if (epic.acceptanceCriteria && epic.acceptanceCriteria.length > 0) {
    lines.push('## Acceptance Criteria', '');
    for (const criterion of epic.acceptanceCriteria) {
      lines.push(`- [ ] ${criterion}`);
    }
    lines.push('');
  }

  lines.push('---', '');
  lines.push('*Created via JHC Agentic EcoSystem - Bizzy*');

  return lines.join('\n');
}

/**
 * List issues in a repository
 */
export async function listIssues(options: {
  repo?: string;
  cwd?: string;
  state?: 'open' | 'closed' | 'all';
  labels?: string[];
  limit?: number;
}): Promise<{ success: boolean; issues?: Array<{ number: number; title: string; state: string }>; error?: string }> {
  const { repo, cwd, state = 'open', labels, limit = 30 } = options;

  try {
    const args = ['issue', 'list', '--json', 'number,title,state'];

    if (repo) {
      args.push('--repo', repo);
    }

    args.push('--state', state);
    args.push('--limit', String(limit));

    if (labels && labels.length > 0) {
      args.push('--label', labels.join(','));
    }

    const result = await executeCommand('gh', args, { cwd, silent: true });

    if (result.exitCode !== 0) {
      return { success: false, error: result.stderr };
    }

    const issues = JSON.parse(result.stdout || '[]');
    return { success: true, issues };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
