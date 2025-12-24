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
  // === Task Identification ===
  /** Task Master task ID (e.g., "1.2", "3.1.2") */
  taskId: string;
  /** Human-readable task title */
  taskTitle: string;
  /** Optional GitHub issue number */
  issueNumber?: number;

  // === Execution Context ===
  /** Agent type that performed the work */
  agent: string;
  /** Completion status of the task */
  status: HandoffStatus;
  /** ISO timestamp of completion */
  completedAt: string;
  /** Duration in milliseconds (optional) */
  duration?: number;

  // === Work Summary ===
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

  // === Technical Details ===
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

  // === Next Steps ===
  /** Suggested follow-up actions */
  recommendations?: string[];
  /** Issues or concerns to address */
  warnings?: string[];
  /** Blockers that need resolution */
  blockers?: string[];

  // === Context for Next Agent ===
  /** Context to pass to the next agent */
  contextForNext?: NextAgentContext;

  // === Metadata ===
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
export function createHandoffData(
  options: CreateHandoffDataOptions,
  status: HandoffStatus = 'completed'
): HandoffData {
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
export function validateHandoffData(data: unknown): data is HandoffData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Required fields
  const requiredStrings = ['taskId', 'taskTitle', 'agent', 'summary', 'completedAt'];
  for (const field of requiredStrings) {
    if (typeof obj[field] !== 'string') {
      return false;
    }
  }

  // Status must be valid
  const validStatuses: HandoffStatus[] = ['completed', 'blocked', 'needs-review', 'failed'];
  if (!validStatuses.includes(obj['status'] as HandoffStatus)) {
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
export function parseHandoffDataFromResponse(response: string): HandoffData | null {
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
  } catch {
    return null;
  }
}

/**
 * Format HandoffData as markdown for agent prompts
 */
export function formatHandoffDataForPrompt(data: HandoffData): string {
  const lines: string[] = [];

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
export function mergeHandoffData(handoffs: HandoffData[]): {
  allFilesModified: string[];
  allFilesCreated: string[];
  allDecisions: TaskDecision[];
  allWarnings: string[];
  summary: string;
} {
  const allFilesModified = new Set<string>();
  const allFilesCreated = new Set<string>();
  const allDecisions: TaskDecision[] = [];
  const allWarnings: string[] = [];
  const summaries: string[] = [];

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
