/**
 * GitHub Automation Types
 *
 * Types for GitHub issue assignment, PR linking, and automation.
 */
/**
 * Agent capability extracted from markdown files
 */
export interface AgentCapability {
    /** Agent name/identifier */
    name: string;
    /** Description from frontmatter */
    description: string;
    /** Tools available to the agent */
    tools: string[];
    /** Keywords extracted from description */
    keywords: string[];
    /** Specializations inferred from description */
    specializations: string[];
    /** Source file path */
    sourcePath?: string;
}
/**
 * GitHub issue for analysis
 */
export interface GitHubIssue {
    id: number;
    number: number;
    title: string;
    body: string;
    labels: GitHubLabel[];
    state: 'open' | 'closed';
    assignees: GitHubActor[];
    created_at: string;
    updated_at: string;
    url: string;
    html_url: string;
    repository_url?: string;
}
/**
 * GitHub label
 */
export interface GitHubLabel {
    id: number;
    name: string;
    description?: string;
    color?: string;
}
/**
 * GitHub actor (simplified user/bot for webhooks)
 */
export interface GitHubActor {
    id: number;
    login: string;
    type: 'User' | 'Bot';
}
/**
 * Agent match with confidence score
 */
export interface AgentMatch {
    /** Agent name */
    agentName: string;
    /** Relevance score (0-100) */
    score: number;
    /** Keywords that matched */
    matchedKeywords: string[];
    /** Confidence level based on score */
    confidence: 'high' | 'medium' | 'low';
    /** Reason for match */
    matchReason?: string;
}
/**
 * Issue analysis result
 */
export interface IssueAnalysisResult {
    /** Issue being analyzed */
    issue: GitHubIssue;
    /** Keywords extracted from issue */
    extractedKeywords: string[];
    /** Ranked agent matches */
    agentMatches: AgentMatch[];
    /** Suggested labels */
    suggestedLabels: string[];
    /** Analysis timestamp */
    analyzedAt: string;
}
/**
 * Assignment result
 */
export interface AssignmentResult {
    success: boolean;
    issue: GitHubIssue;
    assignedAgents: string[];
    confidence: number;
    comment?: string;
    error?: string;
}
/**
 * Label to agent mapping entry
 */
export interface LabelMapping {
    label: string;
    agents: string[];
    priority: number;
}
/**
 * PR link event
 */
export interface PRLinkEvent {
    prNumber: number;
    prTitle: string;
    prUrl: string;
    linkedIssues: number[];
    linkType: 'fixes' | 'closes' | 'resolves' | 'relates';
    timestamp: string;
}
/**
 * GitHub webhook event types we handle
 */
export type GitHubWebhookEventType = 'issues.opened' | 'issues.labeled' | 'issues.assigned' | 'pull_request.opened' | 'pull_request.closed' | 'pull_request.merged';
/**
 * Webhook payload base
 */
export interface WebhookPayload {
    action: string;
    sender: GitHubActor;
    repository: {
        id: number;
        name: string;
        full_name: string;
        owner: GitHubActor;
    };
}
/**
 * Issue webhook payload
 */
export interface IssueWebhookPayload extends WebhookPayload {
    action: 'opened' | 'labeled' | 'assigned' | 'closed';
    issue: GitHubIssue;
    label?: GitHubLabel;
    assignee?: GitHubActor;
}
/**
 * Pull request webhook payload
 */
export interface PRWebhookPayload extends WebhookPayload {
    action: 'opened' | 'closed' | 'merged' | 'synchronize';
    pull_request: {
        id: number;
        number: number;
        title: string;
        body: string;
        state: 'open' | 'closed';
        merged: boolean;
        html_url: string;
        head: {
            ref: string;
            sha: string;
        };
        base: {
            ref: string;
            sha: string;
        };
    };
}
/**
 * Repository configuration for automation
 */
export interface RepositoryConfig {
    owner: string;
    repo: string;
    enabled: boolean;
    autoAssign?: boolean;
    confidenceThreshold?: number;
    excludeLabels?: string[];
    customLabelMappings?: Record<string, string[]>;
}
/**
 * GitHub automation configuration
 */
export interface GitHubAutomationConfig {
    enabled: boolean;
    webhookUrl?: string;
    webhookSecret?: string;
    autoAssign: boolean;
    requireConfirmation: boolean;
    confidenceThreshold: number;
    excludeLabels: string[];
    repositories: RepositoryConfig[];
    customLabelMappings?: Record<string, string[]>;
}
/**
 * Triage result for an issue
 */
export interface TriageResult {
    issue: GitHubIssue;
    suggestedAgents: AgentMatch[];
    suggestedLabels: string[];
    triageComment: string;
    requiresManualReview: boolean;
    timestamp: string;
}
/**
 * Batch triage report
 */
export interface BatchTriageReport {
    totalIssues: number;
    triaged: number;
    skipped: number;
    errors: number;
    results: TriageResult[];
    generatedAt: string;
}
/**
 * Automation log entry
 */
export interface AutomationLogEntry {
    timestamp: string;
    eventType: string;
    issueUrl?: string;
    prUrl?: string;
    action: string;
    result: 'success' | 'failure' | 'skipped';
    details?: string;
    assignedAgents?: string[];
    confidence?: number;
}
/**
 * Agent capability cache
 */
export interface AgentCapabilityCache {
    capabilities: Map<string, AgentCapability>;
    loadedAt: string;
    ttlMs: number;
}
//# sourceMappingURL=github-automation.d.ts.map