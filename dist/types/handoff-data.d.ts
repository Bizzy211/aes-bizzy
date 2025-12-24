/**
 * HandoffData Types
 *
 * Defines the structured data format for agent-to-agent communication
 * in the multi-agent orchestration protocol.
 */
/**
 * Status of a completed task
 */
export type HandoffStatus = 'completed' | 'blocked' | 'needs-review' | 'failed';
/**
 * A decision made during task execution
 */
export interface TaskDecision {
    /** What was decided */
    description: string;
    /** Why this approach was chosen */
    rationale: string;
    /** Other options that were considered */
    alternatives?: string[];
    /** Impact level of the decision */
    impact?: 'low' | 'medium' | 'high' | 'critical';
    /** Tags for categorization */
    tags?: string[];
}
/**
 * Dependency tracking for tasks
 */
export interface DependencyStatus {
    /** Dependencies that were resolved during this task */
    resolved: string[];
    /** Dependencies that are still blocking */
    remaining: string[];
    /** New dependencies discovered during work */
    discovered?: string[];
}
/**
 * Context to pass to the next agent
 */
export interface NextAgentContext {
    /** Important code patterns used that next agent should know */
    keyPatterns: string[];
    /** Where this work connects to other code */
    integrationPoints: string[];
    /** Testing status */
    testCoverage?: string;
    /** Environment variables or config needed */
    requiredConfig?: string[];
    /** Important file locations */
    keyFiles?: string[];
}
/**
 * Core HandoffData interface for agent-to-agent communication
 */
export interface HandoffData {
    /** Task Master task ID (e.g., "1.2", "3.1.2") */
    taskId: string;
    /** Human-readable task title */
    taskTitle: string;
    /** Optional GitHub issue number */
    issueNumber?: number;
    /** Agent type that performed the work */
    agent: string;
    /** Completion status of the task */
    status: HandoffStatus;
    /** ISO timestamp of completion */
    completedAt: string;
    /** Duration in milliseconds (optional) */
    duration?: number;
    /** Brief description of what was accomplished */
    summary: string;
    /** List of files that were modified */
    filesModified: string[];
    /** List of files that were created */
    filesCreated: string[];
    /** List of files that were deleted */
    filesDeleted?: string[];
    /** Lines of code added (optional metric) */
    linesAdded?: number;
    /** Lines of code removed (optional metric) */
    linesRemoved?: number;
    /** Important decisions made during implementation */
    decisions: TaskDecision[];
    /** Dependencies tracking */
    dependencies?: DependencyStatus;
    /** Error details if status is 'failed' or 'blocked' */
    error?: {
        message: string;
        code?: string;
        stack?: string;
        recoverable: boolean;
    };
    /** Suggested follow-up actions */
    recommendations?: string[];
    /** Issues or concerns to address */
    warnings?: string[];
    /** Blockers that need resolution */
    blockers?: string[];
    /** Context to pass to the next agent */
    contextForNext?: NextAgentContext;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Minimal HandoffData for quick task completion
 */
export interface MinimalHandoffData {
    taskId: string;
    agent: string;
    status: HandoffStatus;
    summary: string;
    filesModified: string[];
}
/**
 * Options for creating HandoffData
 */
export interface CreateHandoffDataOptions {
    taskId: string;
    taskTitle: string;
    agent: string;
    summary: string;
    filesModified?: string[];
    filesCreated?: string[];
    decisions?: TaskDecision[];
    recommendations?: string[];
    warnings?: string[];
}
/**
 * Create a HandoffData object with defaults
 */
export declare function createHandoffData(options: CreateHandoffDataOptions, status?: HandoffStatus): HandoffData;
/**
 * Validate HandoffData structure
 */
export declare function validateHandoffData(data: unknown): data is HandoffData;
/**
 * Parse HandoffData from agent response text
 */
export declare function parseHandoffDataFromResponse(response: string): HandoffData | null;
/**
 * Format HandoffData as markdown for agent prompts
 */
export declare function formatHandoffDataForPrompt(data: HandoffData): string;
/**
 * Merge multiple HandoffData objects for aggregate context
 */
export declare function mergeHandoffData(handoffs: HandoffData[]): {
    allFilesModified: string[];
    allFilesCreated: string[];
    allDecisions: TaskDecision[];
    allWarnings: string[];
    summary: string;
};
//# sourceMappingURL=handoff-data.d.ts.map