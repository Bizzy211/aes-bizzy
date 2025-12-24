/**
 * Context Assembly Module
 *
 * Assembles context bundles for agent consumption by combining
 * Task Master task data with Beads context storage.
 */
import { sortByRelevance, truncateToTokenLimit, estimateTokens, } from '../types/context.js';
import { searchContext, listContext, } from './context-store.js';
// ============================================================================
// Constants
// ============================================================================
const DEFAULT_MAX_TOKENS = 5000;
const CONTEXT_TYPES_FOR_AGENTS = ['decision', 'architecture', 'pattern', 'learning'];
// ============================================================================
// Assembly Functions
// ============================================================================
/**
 * Assemble context for an agent based on task and agent type
 */
export async function assembleContextForAgent(taskId, agentType, options = {}) {
    const { scope = 'project', projectPath: _projectPath, maxTokens = DEFAULT_MAX_TOKENS, includeGlobal = true, } = options;
    // 1. Get Task Master task context (if available)
    const taskMasterContext = await getTaskMasterContext(taskId);
    // 2. Search for relevant Beads context
    const beadsResult = await searchContext({
        task: taskId,
        agent: agentType,
        scope,
        includeGlobal,
        limit: 100, // Get many, we'll filter/truncate
    });
    // 3. Also get related context by agent type (without task filter)
    const agentResult = await listContext({
        agent: agentType,
        scope,
        limit: 50,
    });
    // 4. Combine and deduplicate
    const allBeads = deduplicateBeads([...beadsResult.beads, ...agentResult.beads]);
    // 5. Filter to relevant context types
    const relevantBeads = allBeads.filter(b => CONTEXT_TYPES_FOR_AGENTS.includes(b.contextType));
    // 6. Sort by relevance
    const sortedBeads = sortByRelevance(relevantBeads, taskId, agentType);
    // 7. Truncate to token limit
    const tokenBudget = maxTokens - estimateTokens(JSON.stringify(taskMasterContext || {}));
    const finalBeads = truncateToTokenLimit(sortedBeads, tokenBudget);
    // 8. Generate combined prompt
    const combinedPrompt = formatContextPrompt(taskMasterContext, finalBeads, agentType);
    return {
        taskMasterContext,
        beadsContext: finalBeads,
        combinedPrompt,
        metadata: {
            assembledAt: new Date().toISOString(),
            agentType,
            taskId,
            scope,
            beadCount: finalBeads.length,
            tokenEstimate: estimateTokens(combinedPrompt),
        },
    };
}
/**
 * Get Task Master task context via MCP or CLI
 */
async function getTaskMasterContext(_taskId) {
    // Note: This is a simplified implementation that returns undefined
    // In a full implementation, this would call Task Master MCP tools
    // or parse output from the task-master CLI
    // For now, return undefined - the context can still be assembled from Beads
    // Task Master integration should be added when MCP tools are available
    return undefined;
}
/**
 * Deduplicate beads by ID
 */
function deduplicateBeads(beads) {
    const seen = new Set();
    return beads.filter(b => {
        if (seen.has(b.id))
            return false;
        seen.add(b.id);
        return true;
    });
}
// ============================================================================
// Formatting Functions
// ============================================================================
/**
 * Format context as a prompt for agent consumption
 */
export function formatContextPrompt(taskContext, beadsContext, agentType) {
    const sections = [];
    // Header
    sections.push('# Project Context');
    sections.push(`Assembled: ${new Date().toISOString()}`);
    if (agentType) {
        sections.push(`Agent: ${agentType}`);
    }
    sections.push('');
    // Task Master Context
    if (taskContext) {
        sections.push('## Current Task');
        sections.push(`**${taskContext.title}** (${taskContext.taskId})`);
        sections.push(`Status: ${taskContext.status}`);
        if (taskContext.description) {
            sections.push('');
            sections.push(taskContext.description);
        }
        if (taskContext.details) {
            sections.push('');
            sections.push('### Details');
            sections.push(taskContext.details);
        }
        if (taskContext.subtasks && taskContext.subtasks.length > 0) {
            sections.push('');
            sections.push('### Subtasks');
            for (const st of taskContext.subtasks) {
                const status = st.status === 'done' ? '[x]' : '[ ]';
                sections.push(`- ${status} ${st.id}: ${st.title}`);
            }
        }
        if (taskContext.dependencies && taskContext.dependencies.length > 0) {
            sections.push('');
            sections.push(`Dependencies: ${taskContext.dependencies.join(', ')}`);
        }
        sections.push('');
    }
    // Beads Context by Type
    if (beadsContext.length > 0) {
        sections.push('## Relevant Context');
        sections.push('');
        // Group by type
        const byType = new Map();
        for (const bead of beadsContext) {
            const existing = byType.get(bead.contextType) || [];
            existing.push(bead);
            byType.set(bead.contextType, existing);
        }
        // Format each type section
        const typeOrder = ['decision', 'architecture', 'pattern', 'learning', 'blocker', 'handoff'];
        for (const type of typeOrder) {
            const typeBeads = byType.get(type);
            if (!typeBeads || typeBeads.length === 0)
                continue;
            const typeLabel = type.charAt(0).toUpperCase() + type.slice(1) + 's';
            sections.push(`### ${typeLabel}`);
            sections.push('');
            for (const bead of typeBeads) {
                sections.push(`**${bead.title}**`);
                if (bead.description) {
                    sections.push(bead.description);
                }
                if (bead.content) {
                    sections.push('');
                    sections.push(bead.content);
                }
                sections.push('');
            }
        }
    }
    return sections.join('\n');
}
/**
 * Format context as JSON for programmatic use
 */
export function formatContextAsJson(bundle) {
    return JSON.stringify(bundle, null, 2);
}
/**
 * Format context as markdown document
 */
export function formatContextAsMarkdown(bundle) {
    const lines = [];
    lines.push('# Context Bundle');
    lines.push('');
    lines.push(`- **Assembled**: ${bundle.metadata.assembledAt}`);
    lines.push(`- **Agent**: ${bundle.metadata.agentType || 'unspecified'}`);
    lines.push(`- **Task**: ${bundle.metadata.taskId || 'none'}`);
    lines.push(`- **Scope**: ${bundle.metadata.scope}`);
    lines.push(`- **Context Beads**: ${bundle.metadata.beadCount}`);
    lines.push(`- **Token Estimate**: ~${bundle.metadata.tokenEstimate}`);
    lines.push('');
    if (bundle.taskMasterContext) {
        lines.push('## Task Details');
        lines.push('');
        lines.push(`### ${bundle.taskMasterContext.title}`);
        lines.push(`- ID: ${bundle.taskMasterContext.taskId}`);
        lines.push(`- Status: ${bundle.taskMasterContext.status}`);
        if (bundle.taskMasterContext.description) {
            lines.push('');
            lines.push(bundle.taskMasterContext.description);
        }
        lines.push('');
    }
    if (bundle.beadsContext.length > 0) {
        lines.push('## Context Beads');
        lines.push('');
        for (const bead of bundle.beadsContext) {
            lines.push(`### ${bead.title}`);
            lines.push(`- **Type**: ${bead.contextType}`);
            lines.push(`- **ID**: \`${bead.id}\``);
            lines.push(`- **Created**: ${bead.createdAt}`);
            if (bead.tags.length > 0) {
                lines.push(`- **Tags**: ${bead.tags.join(', ')}`);
            }
            if (bead.description) {
                lines.push('');
                lines.push(bead.description);
            }
            if (bead.content) {
                lines.push('');
                lines.push('```');
                lines.push(bead.content);
                lines.push('```');
            }
            lines.push('');
        }
    }
    return lines.join('\n');
}
// ============================================================================
// Export Functions
// ============================================================================
export { DEFAULT_MAX_TOKENS, CONTEXT_TYPES_FOR_AGENTS, };
//# sourceMappingURL=context-assembly.js.map