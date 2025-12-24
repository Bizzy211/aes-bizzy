/**
 * Multi-Agent Orchestrator
 *
 * Manages sequential and parallel task execution with dependency resolution,
 * agent spawning, and HandoffData collection for the pm-lead agent.
 */
import type { HandoffData } from '../types/handoff-data.js';
import type { AgentType } from './agent-matcher.js';
/**
 * Task status in the orchestration system
 */
export type OrchestrationTaskStatus = 'pending' | 'ready' | 'in-progress' | 'completed' | 'failed' | 'blocked' | 'skipped';
/**
 * A task in the orchestration queue
 */
export interface OrchestrationTask {
    /** Unique task ID (matches Task Master ID) */
    id: string;
    /** Task title */
    title: string;
    /** Detailed description */
    description?: string;
    /** Agent type to execute this task */
    agent: AgentType;
    /** Task dependencies (IDs of tasks that must complete first) */
    dependencies: string[];
    /** Current status */
    status: OrchestrationTaskStatus;
    /** Priority (lower number = higher priority) */
    priority: number;
    /** Files this task will likely modify */
    estimatedFiles?: string[];
    /** HandoffData from completion */
    handoffData?: HandoffData;
    /** Error message if failed */
    error?: string;
    /** Start timestamp */
    startedAt?: string;
    /** Completion timestamp */
    completedAt?: string;
}
/**
 * Task execution result
 */
export interface TaskExecutionResult {
    taskId: string;
    success: boolean;
    handoffData?: HandoffData;
    error?: string;
    duration?: number;
}
/**
 * Build a dependency graph from tasks
 */
export declare function buildDependencyGraph(tasks: OrchestrationTask[]): Map<string, Set<string>>;
/**
 * Detect circular dependencies in the task graph
 */
export declare function detectCircularDependencies(tasks: OrchestrationTask[]): string[][];
/**
 * Get tasks that are ready to execute (all dependencies met)
 */
export declare function getReadyTasks(tasks: OrchestrationTask[]): OrchestrationTask[];
/**
 * Topological sort of tasks (respecting dependencies)
 */
export declare function topologicalSort(tasks: OrchestrationTask[]): OrchestrationTask[];
/**
 * Detect potential file conflicts between tasks
 */
export declare function detectFileOverlaps(tasks: OrchestrationTask[]): Map<string, string[]>;
/**
 * Check if two tasks have file conflicts
 */
export declare function hasFileConflict(task1: OrchestrationTask, task2: OrchestrationTask): boolean;
/**
 * Execution plan step
 */
export interface ExecutionStep {
    /** Step number */
    step: number;
    /** Tasks to execute in this step (can be parallel if no conflicts) */
    tasks: OrchestrationTask[];
    /** Whether tasks can run in parallel */
    parallel: boolean;
    /** Reason if sequential */
    sequentialReason?: string;
}
/**
 * Generate an execution plan from tasks
 */
export declare function generateExecutionPlan(tasks: OrchestrationTask[]): ExecutionStep[];
/**
 * Orchestration session state
 */
export interface OrchestrationSession {
    /** Session ID */
    id: string;
    /** Project path */
    projectPath: string;
    /** All tasks in the session */
    tasks: OrchestrationTask[];
    /** Execution plan */
    plan: ExecutionStep[];
    /** Current step index */
    currentStep: number;
    /** Collected HandoffData from all completed tasks */
    handoffHistory: HandoffData[];
    /** Session start time */
    startedAt: string;
    /** Session status */
    status: 'active' | 'completed' | 'failed' | 'paused';
    /** Summary of completed work */
    summary?: string;
}
/**
 * Create a new orchestration session
 */
export declare function createOrchestrationSession(projectPath: string, tasks: OrchestrationTask[]): OrchestrationSession;
/**
 * Get the next tasks to execute in the session
 */
export declare function getNextTasks(session: OrchestrationSession): OrchestrationTask[] | null;
/**
 * Record task completion in the session
 */
export declare function recordTaskCompletion(session: OrchestrationSession, result: TaskExecutionResult): void;
/**
 * Advance to the next step in the session
 */
export declare function advanceSession(session: OrchestrationSession): boolean;
/**
 * Generate a prompt for spawning an agent with task context
 */
export declare function generateAgentPrompt(task: OrchestrationTask, previousHandoffs: HandoffData[], additionalContext?: string): string;
/**
 * Parse agent response to extract HandoffData
 */
export declare function parseAgentResponse(response: string, task: OrchestrationTask): TaskExecutionResult;
/**
 * Git operation type
 */
export type GitOperation = 'commit' | 'branch' | 'merge' | 'push' | 'stash';
/**
 * Git workflow step
 */
export interface GitWorkflowStep {
    operation: GitOperation;
    description: string;
    command: string;
    required: boolean;
}
/**
 * Generate git workflow for task completion
 */
export declare function generateGitWorkflow(task: OrchestrationTask, handoff: HandoffData): GitWorkflowStep[];
/**
 * Merge decision result
 */
export interface MergeDecision {
    canAutoMerge: boolean;
    reason: string;
    conflicts?: string[];
    recommendations: string[];
}
/**
 * Evaluate if tasks can be auto-merged
 */
export declare function evaluateAutoMerge(completedTasks: OrchestrationTask[], handoffs: HandoffData[]): MergeDecision;
/**
 * Review request for code-reviewer agent
 */
export interface ReviewRequest {
    /** Tasks being reviewed */
    taskIds: string[];
    /** Files to review */
    files: string[];
    /** Context from completing agents */
    handoffs: HandoffData[];
    /** Specific areas to focus on */
    focusAreas: string[];
    /** Priority level */
    priority: 'low' | 'medium' | 'high' | 'critical';
}
/**
 * Generate review request from completed tasks
 */
export declare function generateReviewRequest(completedTasks: OrchestrationTask[], handoffs: HandoffData[]): ReviewRequest;
/**
 * Generate prompt for code-reviewer agent
 */
export declare function generateReviewPrompt(request: ReviewRequest): string;
/**
 * Disagreement between agents
 */
export interface AgentDisagreement {
    /** Topic of disagreement */
    topic: string;
    /** Agents involved */
    agents: string[];
    /** Positions taken by each agent */
    positions: Array<{
        agent: string;
        position: string;
        rationale: string;
    }>;
    /** Priority for resolution */
    priority: 'low' | 'medium' | 'high';
}
/**
 * Resolution result
 */
export interface DisagreementResolution {
    /** The final decision */
    decision: string;
    /** Rationale for the decision */
    rationale: string;
    /** How the decision was made */
    method: 'pm-lead-decision' | 'domain-expert' | 'user-input' | 'consensus';
    /** Impact on tasks */
    taskUpdates: Array<{
        taskId: string;
        update: string;
    }>;
}
/**
 * Detect disagreements from agent handoffs
 */
export declare function detectDisagreements(handoffs: HandoffData[]): AgentDisagreement[];
/**
 * Generate prompt for pm-lead to resolve disagreement
 */
export declare function generateResolutionPrompt(disagreement: AgentDisagreement): string;
//# sourceMappingURL=orchestrator.d.ts.map