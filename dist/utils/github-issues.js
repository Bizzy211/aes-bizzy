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
 * Check if GitHub CLI is available and authenticated
 */
export async function checkGitHubCLI() {
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
    }
    catch (error) {
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
export async function createGitHubIssue(issue, options = {}) {
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to create issue: ${message}`);
        return { success: false, error: message };
    }
}
/**
 * Generate issue body from task structure
 */
export function generateIssueBody(task) {
    const lines = [];
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
export function generateLabels(task) {
    const labels = [];
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
export async function createIssueFromTask(task, options = {}) {
    const issue = {
        title: task.title,
        body: generateIssueBody(task),
        labels: generateLabels(task),
    };
    return createGitHubIssue(issue, options);
}
/**
 * Create multiple issues from task list
 */
export async function createIssuesFromTasks(tasks, options = {}) {
    logger.info(`Creating ${tasks.length} issues...`);
    const created = [];
    const failed = [];
    for (const task of tasks) {
        const result = await createIssueFromTask(task, options);
        if (result.success) {
            created.push(result);
        }
        else {
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
export async function createEpicWithTasks(epic, subtasks, options = {}) {
    // Create epic first
    const epicIssue = {
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
function generateEpicBody(epic, subtasks) {
    const lines = [];
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
export async function listIssues(options) {
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
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
//# sourceMappingURL=github-issues.js.map