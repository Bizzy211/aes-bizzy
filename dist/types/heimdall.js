/**
 * Heimdall MCP Types
 *
 * Type definitions for Heimdall persistent agent memory system.
 * Heimdall provides vector-based memory storage using Qdrant for
 * semantic search and context retrieval across agent sessions.
 */
/**
 * Convert SessionLesson to HeimdallMemory for storage
 */
export function sessionLessonToMemory(lesson) {
    const content = formatSessionLessonContent(lesson);
    const tags = [
        `agent:${lesson.agentName}`,
        `type:lesson`,
        ...lesson.patterns.map(p => `pattern:${p.toLowerCase().replace(/\s+/g, '-')}`),
        ...lesson.dependencies.map(d => `dep:${d.toLowerCase()}`),
    ];
    if (lesson.projectName) {
        tags.push(`project:${lesson.projectName}`);
    }
    if (lesson.successLevel) {
        tags.push(`success:${lesson.successLevel}`);
    }
    return {
        content,
        tags,
        agentName: lesson.agentName,
        memoryType: 'lesson',
    };
}
/**
 * Format SessionLesson as readable content
 */
function formatSessionLessonContent(lesson) {
    const lines = [
        `Task: ${lesson.taskTitle}`,
        `Agent: ${lesson.agentName}`,
        '',
        '## Approach',
        lesson.approach,
    ];
    if (lesson.patterns.length > 0) {
        lines.push('', '## Patterns Used');
        lesson.patterns.forEach(p => lines.push(`- ${p}`));
    }
    if (lesson.dependencies.length > 0) {
        lines.push('', '## Dependencies');
        lesson.dependencies.forEach(d => lines.push(`- ${d}`));
    }
    if (lesson.challenges.length > 0) {
        lines.push('', '## Challenges');
        lesson.challenges.forEach(c => lines.push(`- ${c}`));
    }
    if (lesson.successLevel) {
        lines.push('', `Success Level: ${lesson.successLevel}`);
    }
    return lines.join('\n');
}
/**
 * Convert TaskContext to HeimdallMemory for storage
 */
export function taskContextToMemory(context) {
    const content = formatTaskContextContent(context);
    const tags = [
        `task:${context.taskId}`,
        `project:${context.projectName}`,
        `category:${context.category}`,
        `agent:${context.agentName}`,
        `type:context`,
        ...context.techStack.map(t => `tech:${t.toLowerCase()}`),
    ];
    if (context.status) {
        tags.push(`status:${context.status}`);
    }
    if (context.priority) {
        tags.push(`priority:${context.priority}`);
    }
    return {
        content,
        tags,
        agentName: context.agentName,
        taskId: context.taskId,
        memoryType: 'context',
    };
}
/**
 * Format TaskContext as readable content
 */
function formatTaskContextContent(context) {
    const lines = [
        `Task: ${context.taskId}`,
        `Project: ${context.projectName}`,
        `Category: ${context.category}`,
        `Agent: ${context.agentName}`,
        `Tech Stack: ${context.techStack.join(', ')}`,
    ];
    if (context.status) {
        lines.push(`Status: ${context.status}`);
    }
    if (context.priority) {
        lines.push(`Priority: ${context.priority}`);
    }
    if (context.dependencies && context.dependencies.length > 0) {
        lines.push(`Dependencies: ${context.dependencies.join(', ')}`);
    }
    return lines.join('\n');
}
/**
 * Default Qdrant configuration
 */
export const DEFAULT_QDRANT_CONFIG = {
    containerName: 'qdrant-heimdall',
    port: 6333,
    grpcPort: 6334,
    dataPath: '~/.heimdall/qdrant-data',
    imageTag: 'qdrant/qdrant:latest',
    memoryLimit: '512m',
};
/**
 * Default Heimdall configuration
 */
export const DEFAULT_HEIMDALL_CONFIG = {
    qdrantUrl: 'http://localhost:6333',
    collectionName: 'claude-memories',
    embeddingModel: 'text-embedding-3-small',
    maxResults: 10,
    minRelevance: 0.7,
    autoStoreLessons: true,
    autoRetrieveContext: true,
};
// ============================================================================
// Validation Functions
// ============================================================================
/**
 * Validate HeimdallMemory structure
 */
export function validateMemory(data) {
    if (typeof data !== 'object' || data === null) {
        return false;
    }
    const obj = data;
    // Required fields
    if (typeof obj.id !== 'string' || typeof obj.content !== 'string') {
        return false;
    }
    // Tags must be array of strings
    if (!Array.isArray(obj.tags) || !obj.tags.every(t => typeof t === 'string')) {
        return false;
    }
    // Timestamp must be string
    if (typeof obj.timestamp !== 'string') {
        return false;
    }
    return true;
}
/**
 * Validate SessionLesson structure
 */
export function validateSessionLesson(data) {
    if (typeof data !== 'object' || data === null) {
        return false;
    }
    const obj = data;
    // Required string fields
    const requiredStrings = ['agentName', 'taskTitle', 'approach'];
    for (const field of requiredStrings) {
        if (typeof obj[field] !== 'string') {
            return false;
        }
    }
    // Required arrays
    const requiredArrays = ['patterns', 'dependencies', 'challenges'];
    for (const field of requiredArrays) {
        if (!Array.isArray(obj[field])) {
            return false;
        }
    }
    return true;
}
/**
 * Validate HeimdallTaskContext structure
 */
export function validateTaskContext(data) {
    if (typeof data !== 'object' || data === null) {
        return false;
    }
    const obj = data;
    // Required string fields
    const requiredStrings = ['taskId', 'projectName', 'category', 'agentName'];
    for (const field of requiredStrings) {
        if (typeof obj[field] !== 'string') {
            return false;
        }
    }
    // techStack must be array
    if (!Array.isArray(obj.techStack)) {
        return false;
    }
    return true;
}
//# sourceMappingURL=heimdall.js.map