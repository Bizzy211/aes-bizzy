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
/**
 * Configuration for creating a new repository
 */
export interface RepoConfig {
    name: string;
    description?: string;
    private: boolean;
    org?: string;
    autoInit?: boolean;
}
/**
 * Result of repository creation
 */
export interface RepoResult {
    success: boolean;
    repoUrl: string;
    cloneUrl: string;
    error?: string;
}
/**
 * Options for initializing repository content
 */
export interface InitOptions {
    readme: string | boolean;
    gitignore: string | boolean;
    license: 'MIT' | 'Apache-2.0' | 'GPL-3.0' | false;
}
/**
 * Result of repository initialization
 */
export interface InitResult {
    success: boolean;
    filesCreated: string[];
    initialCommit: string;
    error?: string;
}
/**
 * Result of label creation
 */
export interface LabelCreateResult {
    success: boolean;
    labelsCreated: string[];
    skipped: string[];
    error?: string;
}
/**
 * Milestone phase configuration
 */
export interface MilestonePhase {
    title: string;
    description: string;
    dueDate?: Date;
    priority: 'high' | 'medium' | 'low';
}
/**
 * Result of milestone creation
 */
export interface MilestoneResult {
    success: boolean;
    milestonesCreated: Array<{
        title: string;
        number: number;
        url: string;
    }>;
    error?: string;
}
/**
 * File upload specification
 */
export interface FileUpload {
    path: string;
    content: string;
    encoding?: 'utf-8' | 'base64';
    message?: string;
}
/**
 * Result of file upload
 */
export interface UploadResult {
    success: boolean;
    filesUploaded: string[];
    commit: string;
    error?: string;
}
/**
 * Complete repository setup configuration
 */
export interface CompleteRepoConfig extends RepoConfig {
    initialFiles?: FileUpload[];
    labels?: boolean;
    milestones?: MilestonePhase[];
    protectMain?: boolean;
}
/**
 * Complete repository setup result
 */
export interface SetupResult {
    success: boolean;
    repoUrl: string;
    summary: {
        labels: number;
        milestones: number;
        files: number;
    };
    errors: string[];
}
/**
 * Default label configuration for agent-based workflow
 */
export interface AgentLabel {
    name: string;
    description: string;
    color: string;
}
//# sourceMappingURL=github-automation.d.ts.map