/**
 * Multi-Agent Orchestrator
 *
 * Manages sequential and parallel task execution with dependency resolution,
 * agent spawning, and HandoffData collection for the pm-lead agent.
 */

import { createLogger } from './logger.js';
import type { HandoffData } from '../types/handoff-data.js';
import { formatHandoffDataForPrompt, mergeHandoffData, parseHandoffDataFromResponse } from '../types/handoff-data.js';
import type { AgentType } from './agent-matcher.js';

const logger = createLogger({ context: { module: 'orchestrator' } });

// ============================================================================
// TASK TYPES
// ============================================================================

/**
 * Task status in the orchestration system
 */
export type OrchestrationTaskStatus =
  | 'pending'
  | 'ready'
  | 'in-progress'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'skipped';

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

// ============================================================================
// DEPENDENCY GRAPH
// ============================================================================

/**
 * Build a dependency graph from tasks
 */
export function buildDependencyGraph(tasks: OrchestrationTask[]): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();

  for (const task of tasks) {
    if (!graph.has(task.id)) {
      graph.set(task.id, new Set());
    }
    for (const dep of task.dependencies) {
      graph.get(task.id)!.add(dep);
    }
  }

  return graph;
}

/**
 * Detect circular dependencies in the task graph
 */
export function detectCircularDependencies(tasks: OrchestrationTask[]): string[][] {
  const graph = buildDependencyGraph(tasks);
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(taskId: string, path: string[]): boolean {
    visited.add(taskId);
    recursionStack.add(taskId);

    const deps = graph.get(taskId) || new Set();
    for (const dep of deps) {
      if (!visited.has(dep)) {
        if (dfs(dep, [...path, dep])) {
          return true;
        }
      } else if (recursionStack.has(dep)) {
        // Found a cycle
        const cycleStart = path.indexOf(dep);
        cycles.push(path.slice(cycleStart));
        return true;
      }
    }

    recursionStack.delete(taskId);
    return false;
  }

  for (const task of tasks) {
    if (!visited.has(task.id)) {
      dfs(task.id, [task.id]);
    }
  }

  return cycles;
}

/**
 * Get tasks that are ready to execute (all dependencies met)
 */
export function getReadyTasks(tasks: OrchestrationTask[]): OrchestrationTask[] {
  const completedIds = new Set(
    tasks.filter(t => t.status === 'completed').map(t => t.id)
  );

  return tasks.filter(task => {
    if (task.status !== 'pending' && task.status !== 'ready') {
      return false;
    }

    // Check if all dependencies are completed
    for (const dep of task.dependencies) {
      if (!completedIds.has(dep)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Topological sort of tasks (respecting dependencies)
 */
export function topologicalSort(tasks: OrchestrationTask[]): OrchestrationTask[] {
  const result: OrchestrationTask[] = [];
  const visited = new Set<string>();
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  function visit(taskId: string): void {
    if (visited.has(taskId)) return;
    visited.add(taskId);

    const task = taskMap.get(taskId);
    if (!task) return;

    // Visit dependencies first
    for (const dep of task.dependencies) {
      visit(dep);
    }

    result.push(task);
  }

  // Sort by priority first, then process
  const sortedByPriority = [...tasks].sort((a, b) => a.priority - b.priority);
  for (const task of sortedByPriority) {
    visit(task.id);
  }

  return result;
}

// ============================================================================
// FILE OVERLAP DETECTION
// ============================================================================

/**
 * Detect potential file conflicts between tasks
 */
export function detectFileOverlaps(tasks: OrchestrationTask[]): Map<string, string[]> {
  const fileToTasks = new Map<string, string[]>();

  for (const task of tasks) {
    if (!task.estimatedFiles) continue;

    for (const file of task.estimatedFiles) {
      if (!fileToTasks.has(file)) {
        fileToTasks.set(file, []);
      }
      fileToTasks.get(file)!.push(task.id);
    }
  }

  // Filter to only files with multiple tasks
  const conflicts = new Map<string, string[]>();
  for (const [file, taskIds] of fileToTasks) {
    if (taskIds.length > 1) {
      conflicts.set(file, taskIds);
    }
  }

  return conflicts;
}

/**
 * Check if two tasks have file conflicts
 */
export function hasFileConflict(task1: OrchestrationTask, task2: OrchestrationTask): boolean {
  if (!task1.estimatedFiles || !task2.estimatedFiles) {
    return false;
  }

  const files1 = new Set(task1.estimatedFiles);
  for (const file of task2.estimatedFiles) {
    if (files1.has(file)) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// TASK EXECUTION PLANNER
// ============================================================================

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
export function generateExecutionPlan(tasks: OrchestrationTask[]): ExecutionStep[] {
  const plan: ExecutionStep[] = [];
  const completed = new Set<string>();
  const remaining = [...tasks];
  let stepNum = 1;

  while (remaining.length > 0) {
    // Get tasks whose dependencies are all completed
    const ready = remaining.filter(task =>
      task.dependencies.every(dep => completed.has(dep))
    );

    if (ready.length === 0) {
      // No tasks ready - might be circular dependency
      logger.warn('No ready tasks found but remaining tasks exist - possible circular dependency');
      break;
    }

    // Group ready tasks by whether they can run in parallel
    const groups = groupParallelizableTasks(ready);

    for (const group of groups) {
      plan.push({
        step: stepNum++,
        tasks: group.tasks,
        parallel: group.parallel,
        sequentialReason: group.reason,
      });

      // Mark tasks as "scheduled"
      for (const task of group.tasks) {
        completed.add(task.id);
        const idx = remaining.findIndex(t => t.id === task.id);
        if (idx >= 0) {
          remaining.splice(idx, 1);
        }
      }
    }
  }

  return plan;
}

/**
 * Group tasks that can run in parallel
 */
function groupParallelizableTasks(tasks: OrchestrationTask[]): Array<{
  tasks: OrchestrationTask[];
  parallel: boolean;
  reason?: string;
}> {
  if (tasks.length <= 1) {
    return [{ tasks, parallel: false }];
  }

  const groups: Array<{ tasks: OrchestrationTask[]; parallel: boolean; reason?: string }> = [];
  const processed = new Set<string>();

  for (const task of tasks) {
    if (processed.has(task.id)) continue;

    // Find tasks that can run in parallel with this one
    const parallelGroup = [task];
    processed.add(task.id);

    for (const other of tasks) {
      if (processed.has(other.id)) continue;

      // Check for conflicts
      if (!hasFileConflict(task, other)) {
        parallelGroup.push(other);
        processed.add(other.id);
      }
    }

    if (parallelGroup.length > 1) {
      groups.push({ tasks: parallelGroup, parallel: true });
    } else {
      groups.push({
        tasks: parallelGroup,
        parallel: false,
        reason: 'Single task or file conflicts with other ready tasks',
      });
    }
  }

  return groups;
}

// ============================================================================
// ORCHESTRATION SESSION
// ============================================================================

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
export function createOrchestrationSession(
  projectPath: string,
  tasks: OrchestrationTask[]
): OrchestrationSession {
  const sortedTasks = topologicalSort(tasks);
  const plan = generateExecutionPlan(sortedTasks);

  return {
    id: `session-${Date.now()}`,
    projectPath,
    tasks: sortedTasks,
    plan,
    currentStep: 0,
    handoffHistory: [],
    startedAt: new Date().toISOString(),
    status: 'active',
  };
}

/**
 * Get the next tasks to execute in the session
 */
export function getNextTasks(session: OrchestrationSession): OrchestrationTask[] | null {
  if (session.currentStep >= session.plan.length) {
    return null;
  }

  const step = session.plan[session.currentStep];
  return step ? step.tasks : null;
}

/**
 * Record task completion in the session
 */
export function recordTaskCompletion(
  session: OrchestrationSession,
  result: TaskExecutionResult
): void {
  const task = session.tasks.find(t => t.id === result.taskId);
  if (!task) {
    logger.warn(`Task ${result.taskId} not found in session`);
    return;
  }

  if (result.success) {
    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    if (result.handoffData) {
      task.handoffData = result.handoffData;
      session.handoffHistory.push(result.handoffData);
    }
  } else {
    task.status = 'failed';
    task.error = result.error;
  }
}

/**
 * Advance to the next step in the session
 */
export function advanceSession(session: OrchestrationSession): boolean {
  const currentStep = session.plan[session.currentStep];
  if (!currentStep) {
    session.status = 'completed';
    return false;
  }

  // Check if all tasks in current step are completed
  const allCompleted = currentStep.tasks.every(
    task => session.tasks.find(t => t.id === task.id)?.status === 'completed'
  );

  if (allCompleted) {
    session.currentStep++;
    if (session.currentStep >= session.plan.length) {
      session.status = 'completed';
      session.summary = generateSessionSummary(session);
      return false;
    }
    return true;
  }

  // Check if any task failed
  const hasFailed = currentStep.tasks.some(
    task => session.tasks.find(t => t.id === task.id)?.status === 'failed'
  );

  if (hasFailed) {
    session.status = 'failed';
    return false;
  }

  return false;
}

/**
 * Generate session summary from completed work
 */
function generateSessionSummary(session: OrchestrationSession): string {
  const completed = session.tasks.filter(t => t.status === 'completed');
  const failed = session.tasks.filter(t => t.status === 'failed');
  const merged = mergeHandoffData(session.handoffHistory);

  const lines: string[] = [];
  lines.push('# Orchestration Session Summary');
  lines.push('');
  lines.push(`## Overview`);
  lines.push(`- Total Tasks: ${session.tasks.length}`);
  lines.push(`- Completed: ${completed.length}`);
  lines.push(`- Failed: ${failed.length}`);
  lines.push(`- Files Modified: ${merged.allFilesModified.length}`);
  lines.push(`- Files Created: ${merged.allFilesCreated.length}`);
  lines.push('');

  if (merged.allDecisions.length > 0) {
    lines.push('## Key Decisions');
    for (const decision of merged.allDecisions) {
      lines.push(`- **${decision.description}**: ${decision.rationale}`);
    }
    lines.push('');
  }

  if (merged.allWarnings.length > 0) {
    lines.push('## Warnings');
    for (const warning of merged.allWarnings) {
      lines.push(`- ${warning}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ============================================================================
// AGENT PROMPT GENERATION
// ============================================================================

/**
 * Generate a prompt for spawning an agent with task context
 */
export function generateAgentPrompt(
  task: OrchestrationTask,
  previousHandoffs: HandoffData[],
  additionalContext?: string
): string {
  const lines: string[] = [];

  lines.push('# Task Assignment');
  lines.push('');
  lines.push(`## Task: ${task.title}`);
  lines.push(`**ID:** ${task.id}`);
  lines.push(`**Agent:** ${task.agent}`);
  lines.push('');

  if (task.description) {
    lines.push('## Description');
    lines.push(task.description);
    lines.push('');
  }

  // Add context from previous tasks
  if (previousHandoffs.length > 0) {
    lines.push('## Previous Work Context');
    lines.push('');
    for (const handoff of previousHandoffs) {
      lines.push(formatHandoffDataForPrompt(handoff));
      lines.push('---');
    }
    lines.push('');
  }

  // Add estimated files if known
  if (task.estimatedFiles && task.estimatedFiles.length > 0) {
    lines.push('## Files to Consider');
    for (const file of task.estimatedFiles) {
      lines.push(`- ${file}`);
    }
    lines.push('');
  }

  // Additional context
  if (additionalContext) {
    lines.push('## Additional Context');
    lines.push(additionalContext);
    lines.push('');
  }

  // Handoff requirements
  lines.push('## Completion Requirements');
  lines.push('');
  lines.push('When complete, provide your response with HandoffData in the following format:');
  lines.push('');
  lines.push('```json');
  lines.push('{');
  lines.push(`  "taskId": "${task.id}",`);
  lines.push(`  "taskTitle": "${task.title}",`);
  lines.push(`  "agent": "${task.agent}",`);
  lines.push('  "status": "completed",');
  lines.push('  "summary": "Brief description of work done",');
  lines.push('  "filesModified": ["file1.ts", "file2.ts"],');
  lines.push('  "filesCreated": ["newfile.ts"],');
  lines.push('  "decisions": [{"description": "...", "rationale": "..."}],');
  lines.push('  "recommendations": ["Follow-up action 1"],');
  lines.push('  "contextForNext": {');
  lines.push('    "keyPatterns": ["Pattern used"],');
  lines.push('    "integrationPoints": ["Where this connects"]');
  lines.push('  }');
  lines.push('}');
  lines.push('```');
  lines.push('');

  return lines.join('\n');
}

/**
 * Parse agent response to extract HandoffData
 */
export function parseAgentResponse(
  response: string,
  task: OrchestrationTask
): TaskExecutionResult {
  const handoffData = parseHandoffDataFromResponse(response);

  if (handoffData) {
    return {
      taskId: task.id,
      success: handoffData.status === 'completed',
      handoffData,
      error: handoffData.status === 'failed' ? handoffData.error?.message : undefined,
    };
  }

  // If no HandoffData found, try to determine success from response
  const lowerResponse = response.toLowerCase();
  const success =
    lowerResponse.includes('completed') ||
    lowerResponse.includes('done') ||
    lowerResponse.includes('finished');

  return {
    taskId: task.id,
    success,
    error: success ? undefined : 'No HandoffData found in response',
  };
}

// ============================================================================
// GIT WORKFLOW INTEGRATION
// ============================================================================

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
export function generateGitWorkflow(task: OrchestrationTask, handoff: HandoffData): GitWorkflowStep[] {
  const steps: GitWorkflowStep[] = [];
  const branchName = `task/${task.id.replace(/\./g, '-')}`;

  // Step 1: Ensure on correct branch
  steps.push({
    operation: 'branch',
    description: `Switch to or create task branch: ${branchName}`,
    command: `git checkout -B ${branchName}`,
    required: true,
  });

  // Step 2: Stage changes
  if (handoff.filesModified.length > 0 || handoff.filesCreated.length > 0) {
    const files = [...handoff.filesModified, ...handoff.filesCreated];
    steps.push({
      operation: 'commit',
      description: 'Stage modified and created files',
      command: `git add ${files.join(' ')}`,
      required: true,
    });
  }

  // Step 3: Commit with task reference
  steps.push({
    operation: 'commit',
    description: 'Commit changes with task reference',
    command: `git commit -m "feat(${task.agent}): ${task.title} [${task.id}]"`,
    required: true,
  });

  return steps;
}

// ============================================================================
// AUTO-MERGE PROTOCOL
// ============================================================================

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
export function evaluateAutoMerge(
  completedTasks: OrchestrationTask[],
  handoffs: HandoffData[]
): MergeDecision {
  const allFiles = new Set<string>();
  const conflicts: string[] = [];

  // Check for file conflicts between completed tasks
  for (const handoff of handoffs) {
    for (const file of handoff.filesModified) {
      if (allFiles.has(file)) {
        conflicts.push(file);
      }
      allFiles.add(file);
    }
  }

  if (conflicts.length > 0) {
    return {
      canAutoMerge: false,
      reason: 'Multiple agents modified the same files',
      conflicts,
      recommendations: [
        'Review changes manually before merging',
        'Consider rebasing branches sequentially',
        'Use code-reviewer agent to resolve conflicts',
      ],
    };
  }

  // Check for any failed tasks
  const failedTasks = completedTasks.filter(t => t.status === 'failed');
  if (failedTasks.length > 0) {
    return {
      canAutoMerge: false,
      reason: 'Some tasks failed and require resolution',
      recommendations: [
        `Fix failed tasks: ${failedTasks.map(t => t.id).join(', ')}`,
        'Debug using the error information in HandoffData',
      ],
    };
  }

  // Check for warnings in handoffs
  const warnings = handoffs.flatMap(h => h.warnings || []);
  if (warnings.length > 0) {
    return {
      canAutoMerge: true,
      reason: 'Merge possible but with warnings',
      recommendations: [
        'Review warnings before merging:',
        ...warnings.map(w => `  - ${w}`),
      ],
    };
  }

  return {
    canAutoMerge: true,
    reason: 'All tasks completed successfully with no conflicts',
    recommendations: ['Proceed with merge'],
  };
}

// ============================================================================
// REVIEW HANDOFF PROTOCOL
// ============================================================================

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
export function generateReviewRequest(
  completedTasks: OrchestrationTask[],
  handoffs: HandoffData[]
): ReviewRequest {
  const merged = mergeHandoffData(handoffs);

  // Determine focus areas based on decisions and warnings
  const focusAreas: string[] = [];

  // Look for security-related decisions
  const securityDecisions = merged.allDecisions.filter(
    d =>
      d.description.toLowerCase().includes('security') ||
      d.description.toLowerCase().includes('auth') ||
      d.description.toLowerCase().includes('token')
  );
  if (securityDecisions.length > 0) {
    focusAreas.push('Security implications of authentication changes');
  }

  // Look for database-related decisions
  const dbDecisions = merged.allDecisions.filter(
    d =>
      d.description.toLowerCase().includes('database') ||
      d.description.toLowerCase().includes('schema') ||
      d.description.toLowerCase().includes('migration')
  );
  if (dbDecisions.length > 0) {
    focusAreas.push('Database schema changes and migration safety');
  }

  // Add warnings as focus areas
  for (const warning of merged.allWarnings) {
    focusAreas.push(`Warning: ${warning}`);
  }

  // Default focus areas
  if (focusAreas.length === 0) {
    focusAreas.push('Code quality and best practices');
    focusAreas.push('Error handling and edge cases');
    focusAreas.push('Test coverage');
  }

  // Determine priority
  const priority: 'low' | 'medium' | 'high' | 'critical' =
    merged.allWarnings.length > 0
      ? 'high'
      : securityDecisions.length > 0
        ? 'high'
        : 'medium';

  return {
    taskIds: completedTasks.map(t => t.id),
    files: [...merged.allFilesModified, ...merged.allFilesCreated],
    handoffs,
    focusAreas,
    priority,
  };
}

/**
 * Generate prompt for code-reviewer agent
 */
export function generateReviewPrompt(request: ReviewRequest): string {
  const lines: string[] = [];

  lines.push('# Code Review Request');
  lines.push('');
  lines.push(`**Priority:** ${request.priority}`);
  lines.push(`**Tasks:** ${request.taskIds.join(', ')}`);
  lines.push('');

  lines.push('## Files to Review');
  for (const file of request.files) {
    lines.push(`- ${file}`);
  }
  lines.push('');

  lines.push('## Focus Areas');
  for (const area of request.focusAreas) {
    lines.push(`- ${area}`);
  }
  lines.push('');

  lines.push('## Context from Implementing Agents');
  lines.push('');
  for (const handoff of request.handoffs) {
    lines.push(`### ${handoff.agent} - ${handoff.taskTitle}`);
    lines.push(handoff.summary);
    lines.push('');
    if (handoff.decisions.length > 0) {
      lines.push('**Decisions:**');
      for (const decision of handoff.decisions) {
        lines.push(`- ${decision.description}: ${decision.rationale}`);
      }
      lines.push('');
    }
  }

  lines.push('## Review Checklist');
  lines.push('- [ ] Code follows project style guidelines');
  lines.push('- [ ] No security vulnerabilities introduced');
  lines.push('- [ ] Adequate error handling');
  lines.push('- [ ] Tests cover critical paths');
  lines.push('- [ ] Documentation updated if needed');
  lines.push('');

  return lines.join('\n');
}

// ============================================================================
// DISAGREEMENT RESOLUTION
// ============================================================================

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
export function detectDisagreements(handoffs: HandoffData[]): AgentDisagreement[] {
  const disagreements: AgentDisagreement[] = [];

  // Group handoffs by related files
  const fileToHandoffs = new Map<string, HandoffData[]>();
  for (const handoff of handoffs) {
    for (const file of handoff.filesModified) {
      if (!fileToHandoffs.has(file)) {
        fileToHandoffs.set(file, []);
      }
      fileToHandoffs.get(file)!.push(handoff);
    }
  }

  // Check for conflicting recommendations
  for (const [file, relatedHandoffs] of fileToHandoffs) {
    if (relatedHandoffs.length < 2) continue;

    const allRecommendations = relatedHandoffs.flatMap(h => h.recommendations || []);
    const allWarnings = relatedHandoffs.flatMap(h => h.warnings || []);

    // Simple conflict detection: if agents have different recommendations for same file
    if (allRecommendations.length > 1 || allWarnings.length > 1) {
      disagreements.push({
        topic: `Approach for ${file}`,
        agents: relatedHandoffs.map(h => h.agent),
        positions: relatedHandoffs.map(h => ({
          agent: h.agent,
          position: (h.recommendations || []).join('; ') || 'No specific recommendation',
          rationale: h.summary,
        })),
        priority: 'medium',
      });
    }
  }

  return disagreements;
}

/**
 * Generate prompt for pm-lead to resolve disagreement
 */
export function generateResolutionPrompt(disagreement: AgentDisagreement): string {
  const lines: string[] = [];

  lines.push('# Disagreement Resolution Required');
  lines.push('');
  lines.push(`**Topic:** ${disagreement.topic}`);
  lines.push(`**Priority:** ${disagreement.priority}`);
  lines.push(`**Agents Involved:** ${disagreement.agents.join(', ')}`);
  lines.push('');

  lines.push('## Positions');
  lines.push('');
  for (const pos of disagreement.positions) {
    lines.push(`### ${pos.agent}`);
    lines.push(`**Position:** ${pos.position}`);
    lines.push(`**Rationale:** ${pos.rationale}`);
    lines.push('');
  }

  lines.push('## Resolution Options');
  lines.push('');
  lines.push('1. **Make a decision** as pm-lead based on project requirements');
  lines.push('2. **Consult domain expert** by spawning a specialist agent');
  lines.push('3. **Request user input** for business-critical decisions');
  lines.push('4. **Find consensus** by having agents discuss further');
  lines.push('');

  lines.push('Please provide your resolution with rationale.');
  lines.push('');

  return lines.join('\n');
}
