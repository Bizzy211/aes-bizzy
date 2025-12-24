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

import {
  assembleContextForAgent,
  formatContextAsMarkdown,
} from '../beads/context-assembly.js';
import type { ContextBundle, ContextScope } from '../types/context.js';

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Load context before agent task execution
 *
 * @param taskId - The Task Master task ID (e.g., "68.1")
 * @param agentType - The agent type being spawned (e.g., "frontend-dev")
 * @param options - Configuration options
 * @returns Promise resolving to context bundle and formatted output
 */
export async function preTaskContextLoad(
  taskId: string,
  agentType: string,
  options: PreTaskOptions = {}
): Promise<PreTaskResult> {
  const {
    scope = 'project',
    projectPath,
    maxTokens = 5000,
    includeGlobal = true,
    format = 'prompt',
  } = options;

  try {
    // Assemble context from Beads and Task Master
    const bundle = await assembleContextForAgent(taskId, agentType, {
      scope,
      projectPath,
      maxTokens,
      includeGlobal,
    });

    // Format output based on requested format
    let output: string;
    switch (format) {
      case 'json':
        output = JSON.stringify(bundle, null, 2);
        break;
      case 'markdown':
        output = formatContextAsMarkdown(bundle);
        break;
      case 'prompt':
      default:
        output = bundle.combinedPrompt;
        break;
    }

    return {
      success: true,
      bundle,
      output,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load context',
    };
  }
}

/**
 * Format context for CLAUDE.md injection
 *
 * Wraps the context in appropriate markdown sections for
 * including in an agent's CLAUDE.md file.
 */
export function formatForClaudeMd(bundle: ContextBundle): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('## Agent Context (Auto-loaded)');
  lines.push('');
  lines.push('<agent-context>');
  lines.push(bundle.combinedPrompt);
  lines.push('</agent-context>');
  lines.push('');

  return lines.join('\n');
}

/**
 * Format context for inline prompt injection
 *
 * Creates a compact representation suitable for
 * including directly in agent spawn prompts.
 */
export function formatForPromptInjection(bundle: ContextBundle): string {
  const lines: string[] = [];

  lines.push('<context>');

  // Task info
  if (bundle.taskMasterContext) {
    lines.push(`Task: ${bundle.taskMasterContext.title} (${bundle.taskMasterContext.taskId})`);
  }

  // Key decisions and patterns
  const decisions = bundle.beadsContext.filter(b => b.contextType === 'decision');
  const patterns = bundle.beadsContext.filter(b => b.contextType === 'pattern');
  const architecture = bundle.beadsContext.filter(b => b.contextType === 'architecture');

  if (decisions.length > 0) {
    lines.push('');
    lines.push('Decisions:');
    for (const d of decisions.slice(0, 3)) {
      lines.push(`- ${d.title}`);
    }
  }

  if (patterns.length > 0) {
    lines.push('');
    lines.push('Patterns to follow:');
    for (const p of patterns.slice(0, 3)) {
      lines.push(`- ${p.title}`);
    }
  }

  if (architecture.length > 0) {
    lines.push('');
    lines.push('Architecture:');
    for (const a of architecture.slice(0, 3)) {
      lines.push(`- ${a.title}`);
    }
  }

  lines.push('</context>');

  return lines.join('\n');
}
