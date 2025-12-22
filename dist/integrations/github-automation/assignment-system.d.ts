/**
 * Auto-Assignment System
 *
 * Handles automatic assignment of GitHub issues to Claude sub-agents
 * using the GitHub API.
 */
import type { GitHubIssue, AssignmentResult, AgentMatch, TriageResult, AutomationLogEntry, GitHubAutomationConfig } from '../../types/github-automation.js';
/**
 * Get automation log entries
 */
export declare function getAutomationLog(limit?: number): AutomationLogEntry[];
/**
 * Clear automation log
 */
export declare function clearAutomationLog(): void;
/**
 * Fetch issue from GitHub API
 */
export declare function fetchIssue(owner: string, repo: string, issueNumber: number, token: string): Promise<GitHubIssue | null>;
/**
 * Fetch open issues from a repository
 */
export declare function fetchOpenIssues(owner: string, repo: string, token: string, options?: {
    labels?: string[];
    assignee?: string;
    state?: 'open' | 'closed' | 'all';
    perPage?: number;
    page?: number;
}): Promise<GitHubIssue[]>;
/**
 * Post a comment on a GitHub issue
 */
export declare function postComment(owner: string, repo: string, issueNumber: number, body: string, token: string): Promise<boolean>;
/**
 * Add labels to a GitHub issue
 */
export declare function addLabels(owner: string, repo: string, issueNumber: number, labels: string[], token: string): Promise<boolean>;
/**
 * Generate assignment comment for an issue
 */
export declare function generateAssignmentComment(agentMatches: AgentMatch[], analysisKeywords: string[]): string;
/**
 * Generate triage comment for manual review
 */
export declare function generateTriageComment(triageResult: TriageResult): string;
/**
 * Assign an issue to agents based on analysis
 */
export declare function assignIssue(owner: string, repo: string, issue: GitHubIssue, token: string, config?: Partial<GitHubAutomationConfig>): Promise<AssignmentResult>;
/**
 * Triage an issue for manual review
 */
export declare function triageIssue(issue: GitHubIssue, agentsDir?: string): Promise<TriageResult>;
/**
 * Batch assign issues
 */
export declare function batchAssignIssues(owner: string, repo: string, issues: GitHubIssue[], token: string, config?: Partial<GitHubAutomationConfig>): Promise<{
    total: number;
    assigned: number;
    skipped: number;
    failed: number;
    results: AssignmentResult[];
}>;
/**
 * Get assignment recommendation without making changes
 */
export declare function getAssignmentRecommendation(issue: GitHubIssue, agentsDir?: string): Promise<{
    recommended: AgentMatch | null;
    alternatives: AgentMatch[];
    suggestedLabels: string[];
    confidence: 'high' | 'medium' | 'low' | 'none';
}>;
/**
 * Check if an issue should be excluded from auto-assignment
 */
export declare function shouldExcludeIssue(issue: GitHubIssue, excludeLabels?: string[]): {
    exclude: boolean;
    reason?: string;
};
/**
 * Process webhook event for auto-assignment
 */
export declare function processIssueEvent(action: string, issue: GitHubIssue, owner: string, repo: string, token: string, config: GitHubAutomationConfig): Promise<{
    processed: boolean;
    result?: AssignmentResult;
    reason?: string;
}>;
//# sourceMappingURL=assignment-system.d.ts.map