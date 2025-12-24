/**
 * Post-Task Context Save Hook
 *
 * Called after an agent completes a task to save handoff data,
 * decisions, and learnings to Beads context storage.
 *
 * Usage:
 *   import { postTaskContextSave } from './hooks/post-task-context-save.js';
 *   await postTaskContextSave('68.1', 'frontend-dev', handoffData);
 */
import type { ContextScope } from '../types/context.js';
import type { HandoffData, TaskDecision } from '../types/handoff-data.js';
export interface PostTaskOptions {
    /**
     * Context scope (project or global)
     */
    scope?: ContextScope;
    /**
     * Project directory path
     */
    projectPath?: string;
    /**
     * Additional tags to apply
     */
    additionalTags?: string[];
    /**
     * Whether to extract decisions as separate beads
     */
    extractDecisions?: boolean;
    /**
     * Whether to extract learnings as separate beads
     */
    extractLearnings?: boolean;
}
export interface PostTaskResult {
    /**
     * Whether the hook succeeded
     */
    success: boolean;
    /**
     * IDs of created context beads
     */
    createdIds: string[];
    /**
     * Errors encountered (non-fatal)
     */
    errors: string[];
    /**
     * Summary of what was saved
     */
    summary: {
        handoffs: number;
        decisions: number;
        learnings: number;
        total: number;
    };
}
/**
 * Save context after agent task completion
 *
 * @param taskId - The Task Master task ID (e.g., "68.1")
 * @param agentType - The agent type that completed the task
 * @param handoffData - The handoff data from the agent
 * @param options - Configuration options
 * @returns Promise resolving to result summary
 */
export declare function postTaskContextSave(taskId: string, agentType: string, handoffData: HandoffData, options?: PostTaskOptions): Promise<PostTaskResult>;
/**
 * Convenience function to save just decisions
 */
export declare function saveDecisions(taskId: string, agentType: string, decisions: TaskDecision[], options?: PostTaskOptions): Promise<PostTaskResult>;
/**
 * Convenience function to save just learnings
 */
export declare function saveLearnings(taskId: string, agentType: string, learnings: Array<{
    title: string;
    content: string;
}>, options?: PostTaskOptions): Promise<PostTaskResult>;
//# sourceMappingURL=post-task-context-save.d.ts.map