/**
 * Context Assembly Module
 *
 * Assembles context bundles for agent consumption by combining
 * Task Master task data with Beads context storage.
 */
import { ContextBead, ContextBundle, ContextScope, ContextType, TaskContext } from '../types/context.js';
declare const DEFAULT_MAX_TOKENS = 5000;
declare const CONTEXT_TYPES_FOR_AGENTS: ContextType[];
/**
 * Assemble context for an agent based on task and agent type
 */
export declare function assembleContextForAgent(taskId: string, agentType: string, options?: {
    scope?: ContextScope;
    projectPath?: string;
    maxTokens?: number;
    includeGlobal?: boolean;
}): Promise<ContextBundle>;
/**
 * Format context as a prompt for agent consumption
 */
export declare function formatContextPrompt(taskContext: TaskContext | undefined, beadsContext: ContextBead[], agentType?: string): string;
/**
 * Format context as JSON for programmatic use
 */
export declare function formatContextAsJson(bundle: ContextBundle): string;
/**
 * Format context as markdown document
 */
export declare function formatContextAsMarkdown(bundle: ContextBundle): string;
export { DEFAULT_MAX_TOKENS, CONTEXT_TYPES_FOR_AGENTS, };
//# sourceMappingURL=context-assembly.d.ts.map