/**
 * Pre-Task Context Load Hook
 *
 * Called before an agent is spawned to load relevant context.
 * This hook assembles context from Beads storage and Task Master,
 * preparing it for injection into the agent's CLAUDE.md or prompt.
 *
 * Usage:
 *   import { preTaskContextLoad } from './hooks/pre-task-context-load.js';
 *   const context = await preTaskContextLoad('68.1', 'frontend-dev');
 */
import type { ContextBundle, ContextScope } from '../types/context.js';
export interface PreTaskOptions {
    /**
     * Context scope (project or global)
     */
    scope?: ContextScope;
    /**
     * Project directory path
     */
    projectPath?: string;
    /**
     * Maximum tokens for context
     */
    maxTokens?: number;
    /**
     * Include global context in project scope
     */
    includeGlobal?: boolean;
    /**
     * Output format for the context
     */
    format?: 'prompt' | 'json' | 'markdown';
}
export interface PreTaskResult {
    /**
     * Whether the hook succeeded
     */
    success: boolean;
    /**
     * The assembled context bundle
     */
    bundle?: ContextBundle;
    /**
     * Formatted output ready for agent consumption
     */
    output?: string;
    /**
     * Error message if failed
     */
    error?: string;
}
/**
 * Load context before agent task execution
 *
 * @param taskId - The Task Master task ID (e.g., "68.1")
 * @param agentType - The agent type being spawned (e.g., "frontend-dev")
 * @param options - Configuration options
 * @returns Promise resolving to context bundle and formatted output
 */
export declare function preTaskContextLoad(taskId: string, agentType: string, options?: PreTaskOptions): Promise<PreTaskResult>;
/**
 * Format context for CLAUDE.md injection
 *
 * Wraps the context in appropriate markdown sections for
 * including in an agent's CLAUDE.md file.
 */
export declare function formatForClaudeMd(bundle: ContextBundle): string;
/**
 * Format context for inline prompt injection
 *
 * Creates a compact representation suitable for
 * including directly in agent spawn prompts.
 */
export declare function formatForPromptInjection(bundle: ContextBundle): string;
//# sourceMappingURL=pre-task-context-load.d.ts.map