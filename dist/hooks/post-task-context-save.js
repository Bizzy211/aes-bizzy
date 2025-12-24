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
import { createContext } from '../beads/context-store.js';
// ============================================================================
// Hook Implementation
// ============================================================================
/**
 * Save context after agent task completion
 *
 * @param taskId - The Task Master task ID (e.g., "68.1")
 * @param agentType - The agent type that completed the task
 * @param handoffData - The handoff data from the agent
 * @param options - Configuration options
 * @returns Promise resolving to result summary
 */
export async function postTaskContextSave(taskId, agentType, handoffData, options = {}) {
    const { scope = 'project', additionalTags = [], extractDecisions = true, extractLearnings = true, } = options;
    const createdIds = [];
    const errors = [];
    let handoffCount = 0;
    let decisionCount = 0;
    let learningCount = 0;
    // 1. Create main handoff bead
    const handoffResult = await createHandoffBead(taskId, agentType, handoffData, scope, additionalTags);
    if (handoffResult.success && handoffResult.id) {
        createdIds.push(handoffResult.id);
        handoffCount++;
    }
    else if (handoffResult.error) {
        errors.push(`Handoff bead: ${handoffResult.error}`);
    }
    // 2. Extract and create decision beads
    if (extractDecisions && handoffData.decisions && handoffData.decisions.length > 0) {
        for (const decision of handoffData.decisions) {
            const result = await createContext({
                title: decision.description.substring(0, 100),
                type: 'decision',
                agentType,
                taskId,
                description: `${decision.description}\n\nRationale: ${decision.rationale}`,
                tags: [...additionalTags, ...(decision.tags || [])],
                scope,
            });
            if (result.success && result.id) {
                createdIds.push(result.id);
                decisionCount++;
            }
            else if (result.error) {
                errors.push(`Decision bead: ${result.error}`);
            }
        }
    }
    // 3. Extract and create learning beads from contextForNext
    if (extractLearnings && handoffData.contextForNext) {
        const learnings = extractLearningsFromNextContext(handoffData.contextForNext);
        for (const learning of learnings) {
            const result = await createContext({
                title: learning.title,
                type: 'learning',
                agentType,
                taskId,
                description: learning.content,
                tags: additionalTags,
                scope,
            });
            if (result.success && result.id) {
                createdIds.push(result.id);
                learningCount++;
            }
            else if (result.error) {
                errors.push(`Learning bead: ${result.error}`);
            }
        }
    }
    return {
        success: errors.length === 0 || createdIds.length > 0,
        createdIds,
        errors,
        summary: {
            handoffs: handoffCount,
            decisions: decisionCount,
            learnings: learningCount,
            total: createdIds.length,
        },
    };
}
/**
 * Create a handoff context bead
 */
async function createHandoffBead(taskId, agentType, handoffData, scope, additionalTags) {
    const title = `Handoff from ${agentType} on task ${taskId}`;
    const content = formatHandoffContent(handoffData);
    return createContext({
        title,
        type: 'handoff',
        agentType,
        taskId,
        description: handoffData.summary,
        content,
        handoffData,
        tags: additionalTags,
        scope,
    });
}
/**
 * Format handoff data as readable content
 */
function formatHandoffContent(handoffData) {
    const lines = [];
    lines.push('## Handoff Summary');
    lines.push(handoffData.summary);
    lines.push('');
    if (handoffData.filesModified && handoffData.filesModified.length > 0) {
        lines.push('## Files Modified');
        for (const file of handoffData.filesModified) {
            lines.push(`- ${file}`);
        }
        lines.push('');
    }
    if (handoffData.filesCreated && handoffData.filesCreated.length > 0) {
        lines.push('## Files Created');
        for (const file of handoffData.filesCreated) {
            lines.push(`- ${file}`);
        }
        lines.push('');
    }
    if (handoffData.decisions && handoffData.decisions.length > 0) {
        lines.push('## Decisions Made');
        for (const decision of handoffData.decisions) {
            lines.push(`- **${decision.description}**: ${decision.rationale}`);
        }
        lines.push('');
    }
    if (handoffData.contextForNext) {
        lines.push('## Context for Next Agent');
        lines.push('');
        const ctx = handoffData.contextForNext;
        if (ctx.keyPatterns.length > 0) {
            lines.push('### Key Patterns');
            for (const pattern of ctx.keyPatterns) {
                lines.push(`- ${pattern}`);
            }
            lines.push('');
        }
        if (ctx.integrationPoints.length > 0) {
            lines.push('### Integration Points');
            for (const point of ctx.integrationPoints) {
                lines.push(`- ${point}`);
            }
            lines.push('');
        }
        if (ctx.testCoverage) {
            lines.push('### Test Coverage');
            lines.push(ctx.testCoverage);
            lines.push('');
        }
        if (ctx.keyFiles && ctx.keyFiles.length > 0) {
            lines.push('### Key Files');
            for (const file of ctx.keyFiles) {
                lines.push(`- ${file}`);
            }
            lines.push('');
        }
    }
    if (handoffData.warnings && handoffData.warnings.length > 0) {
        lines.push('## Warnings');
        for (const warning of handoffData.warnings) {
            lines.push(`- ${warning}`);
        }
        lines.push('');
    }
    if (handoffData.blockers && handoffData.blockers.length > 0) {
        lines.push('## Blockers');
        for (const blocker of handoffData.blockers) {
            lines.push(`- ${blocker}`);
        }
        lines.push('');
    }
    return lines.join('\n');
}
/**
 * Extract learnings from NextAgentContext
 */
function extractLearningsFromNextContext(context) {
    const learnings = [];
    // Extract key patterns as learnings
    for (const pattern of context.keyPatterns) {
        if (pattern.length > 10) {
            learnings.push({
                title: `Pattern: ${pattern.substring(0, 60)}${pattern.length > 60 ? '...' : ''}`,
                content: pattern,
            });
        }
    }
    // Extract integration points as learnings
    for (const point of context.integrationPoints) {
        if (point.length > 10) {
            learnings.push({
                title: `Integration: ${point.substring(0, 60)}${point.length > 60 ? '...' : ''}`,
                content: point,
            });
        }
    }
    // Add test coverage as learning if present
    if (context.testCoverage && context.testCoverage.length > 10) {
        learnings.push({
            title: 'Test Coverage Status',
            content: context.testCoverage,
        });
    }
    return learnings;
}
/**
 * Convenience function to save just decisions
 */
export async function saveDecisions(taskId, agentType, decisions, options = {}) {
    const createdIds = [];
    const errors = [];
    for (const decision of decisions) {
        const result = await createContext({
            title: decision.description.substring(0, 100),
            type: 'decision',
            agentType,
            taskId,
            description: `${decision.description}\n\nRationale: ${decision.rationale}`,
            tags: [...(options.additionalTags || []), ...(decision.tags || [])],
            scope: options.scope || 'project',
        });
        if (result.success && result.id) {
            createdIds.push(result.id);
        }
        else if (result.error) {
            errors.push(result.error);
        }
    }
    return {
        success: errors.length === 0,
        createdIds,
        errors,
        summary: {
            handoffs: 0,
            decisions: createdIds.length,
            learnings: 0,
            total: createdIds.length,
        },
    };
}
/**
 * Convenience function to save just learnings
 */
export async function saveLearnings(taskId, agentType, learnings, options = {}) {
    const createdIds = [];
    const errors = [];
    for (const learning of learnings) {
        const result = await createContext({
            title: learning.title,
            type: 'learning',
            agentType,
            taskId,
            description: learning.content,
            tags: options.additionalTags || [],
            scope: options.scope || 'project',
        });
        if (result.success && result.id) {
            createdIds.push(result.id);
        }
        else if (result.error) {
            errors.push(result.error);
        }
    }
    return {
        success: errors.length === 0,
        createdIds,
        errors,
        summary: {
            handoffs: 0,
            decisions: 0,
            learnings: createdIds.length,
            total: createdIds.length,
        },
    };
}
//# sourceMappingURL=post-task-context-save.js.map