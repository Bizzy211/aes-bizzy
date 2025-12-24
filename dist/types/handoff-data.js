/**
 * HandoffData Types
 *
 * Defines the structured data format for agent-to-agent communication
 * in the multi-agent orchestration protocol.
 */
/**
 * Create a HandoffData object with defaults
 */
export function createHandoffData(options, status = 'completed') {
    return {
        taskId: options.taskId,
        taskTitle: options.taskTitle,
        agent: options.agent,
        status,
        completedAt: new Date().toISOString(),
        summary: options.summary,
        filesModified: options.filesModified || [],
        filesCreated: options.filesCreated || [],
        decisions: options.decisions || [],
        recommendations: options.recommendations,
        warnings: options.warnings,
    };
}
/**
 * Validate HandoffData structure
 */
export function validateHandoffData(data) {
    if (typeof data !== 'object' || data === null) {
        return false;
    }
    const obj = data;
    // Required fields
    const requiredStrings = ['taskId', 'taskTitle', 'agent', 'summary', 'completedAt'];
    for (const field of requiredStrings) {
        if (typeof obj[field] !== 'string') {
            return false;
        }
    }
    // Status must be valid
    const validStatuses = ['completed', 'blocked', 'needs-review', 'failed'];
    if (!validStatuses.includes(obj['status'])) {
        return false;
    }
    // Arrays must be arrays
    const arrayFields = ['filesModified', 'filesCreated', 'decisions'];
    for (const field of arrayFields) {
        if (obj[field] !== undefined && !Array.isArray(obj[field])) {
            return false;
        }
    }
    return true;
}
/**
 * Parse HandoffData from agent response text
 */
export function parseHandoffDataFromResponse(response) {
    // Look for JSON code block with HandoffData
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch || !jsonMatch[1]) {
        return null;
    }
    try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (validateHandoffData(parsed)) {
            return parsed;
        }
        return null;
    }
    catch {
        return null;
    }
}
/**
 * Format HandoffData as markdown for agent prompts
 */
export function formatHandoffDataForPrompt(data) {
    const lines = [];
    lines.push('## Previous Task Context');
    lines.push('');
    lines.push(`**Task:** ${data.taskTitle} (${data.taskId})`);
    lines.push(`**Agent:** ${data.agent}`);
    lines.push(`**Status:** ${data.status}`);
    lines.push('');
    lines.push('### Summary');
    lines.push(data.summary);
    lines.push('');
    if (data.filesModified.length > 0) {
        lines.push('### Files Modified');
        for (const file of data.filesModified) {
            lines.push(`- ${file}`);
        }
        lines.push('');
    }
    if (data.filesCreated.length > 0) {
        lines.push('### Files Created');
        for (const file of data.filesCreated) {
            lines.push(`- ${file}`);
        }
        lines.push('');
    }
    if (data.decisions.length > 0) {
        lines.push('### Key Decisions');
        for (const decision of data.decisions) {
            lines.push(`- **${decision.description}**: ${decision.rationale}`);
        }
        lines.push('');
    }
    if (data.contextForNext) {
        lines.push('### Integration Points');
        for (const point of data.contextForNext.integrationPoints) {
            lines.push(`- ${point}`);
        }
        lines.push('');
        if (data.contextForNext.keyPatterns.length > 0) {
            lines.push('### Key Patterns to Follow');
            for (const pattern of data.contextForNext.keyPatterns) {
                lines.push(`- ${pattern}`);
            }
            lines.push('');
        }
    }
    if (data.warnings && data.warnings.length > 0) {
        lines.push('### Warnings');
        for (const warning of data.warnings) {
            lines.push(`- ${warning}`);
        }
        lines.push('');
    }
    if (data.recommendations && data.recommendations.length > 0) {
        lines.push('### Recommendations');
        for (const rec of data.recommendations) {
            lines.push(`- ${rec}`);
        }
        lines.push('');
    }
    return lines.join('\n');
}
/**
 * Merge multiple HandoffData objects for aggregate context
 */
export function mergeHandoffData(handoffs) {
    const allFilesModified = new Set();
    const allFilesCreated = new Set();
    const allDecisions = [];
    const allWarnings = [];
    const summaries = [];
    for (const handoff of handoffs) {
        for (const file of handoff.filesModified) {
            allFilesModified.add(file);
        }
        for (const file of handoff.filesCreated) {
            allFilesCreated.add(file);
        }
        allDecisions.push(...handoff.decisions);
        if (handoff.warnings) {
            allWarnings.push(...handoff.warnings);
        }
        summaries.push(`[${handoff.agent}] ${handoff.summary}`);
    }
    return {
        allFilesModified: Array.from(allFilesModified),
        allFilesCreated: Array.from(allFilesCreated),
        allDecisions,
        allWarnings,
        summary: summaries.join('\n'),
    };
}
//# sourceMappingURL=handoff-data.js.map