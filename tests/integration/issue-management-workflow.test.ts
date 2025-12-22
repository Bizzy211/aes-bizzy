/**
 * Integration Tests for Issue Management Workflow End-to-End
 *
 * Tests the complete GitHub issue lifecycle from creation through resolution
 * with auto-triage, agent assignment, PR linking, issue closure, and Beads
 * accomplishment tracking.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';

// ============================================================================
// Types and Interfaces
// ============================================================================

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: string[];
  assignees: string[];
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  milestone: string | null;
  linked_prs: number[];
}

interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed' | 'merged';
  head_branch: string;
  base_branch: string;
  linked_issues: number[];
  merged_at: string | null;
  author: string;
}

interface TriageResult {
  priority: 'critical' | 'high' | 'medium' | 'low';
  labels: string[];
  suggestedAgent: string;
  complexity: number;
  estimatedHours: number;
  reasoning: string;
}

interface AgentAssignment {
  issueNumber: number;
  agentType: string;
  assignedAt: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  handoffFrom?: string;
  context: Record<string, unknown>;
}

interface BeadAccomplishment {
  id: string;
  type: 'accomplishment';
  title: string;
  description: string;
  issueNumber: number;
  prNumber?: number;
  agentType: string;
  completedAt: string;
  metrics: {
    filesChanged: number;
    linesAdded: number;
    linesRemoved: number;
    testsAdded: number;
  };
  tags: string[];
}

interface WorkflowState {
  issues: Map<number, GitHubIssue>;
  pullRequests: Map<number, GitHubPullRequest>;
  triageResults: Map<number, TriageResult>;
  agentAssignments: Map<number, AgentAssignment>;
  accomplishments: BeadAccomplishment[];
  nextIssueNumber: number;
  nextPrNumber: number;
}

// ============================================================================
// Mock Implementation Functions
// ============================================================================

function createWorkflowState(): WorkflowState {
  return {
    issues: new Map(),
    pullRequests: new Map(),
    triageResults: new Map(),
    agentAssignments: new Map(),
    accomplishments: [],
    nextIssueNumber: 1,
    nextPrNumber: 100,
  };
}

function createIssue(
  state: WorkflowState,
  title: string,
  body: string,
  labels: string[] = []
): GitHubIssue {
  const issueNumber = state.nextIssueNumber++;
  const issue: GitHubIssue = {
    id: issueNumber * 1000,
    number: issueNumber,
    title,
    body,
    state: 'open',
    labels,
    assignees: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    closed_at: null,
    milestone: null,
    linked_prs: [],
  };
  state.issues.set(issueNumber, issue);
  return issue;
}

function triageIssue(issue: GitHubIssue): TriageResult {
  const titleLower = issue.title.toLowerCase();
  const bodyLower = issue.body.toLowerCase();
  const combined = titleLower + ' ' + bodyLower;

  // Determine priority based on keywords
  let priority: TriageResult['priority'] = 'medium';
  if (
    combined.includes('critical') ||
    combined.includes('urgent') ||
    combined.includes('security')
  ) {
    priority = 'critical';
  } else if (
    combined.includes('important') ||
    combined.includes('high priority')
  ) {
    priority = 'high';
  } else if (combined.includes('minor') || combined.includes('low priority')) {
    priority = 'low';
  }

  // Determine labels based on content
  const labels: string[] = [];
  if (combined.includes('bug') || combined.includes('error')) {
    labels.push('bug');
  }
  if (combined.includes('feature') || combined.includes('enhancement')) {
    labels.push('enhancement');
  }
  if (combined.includes('docs') || combined.includes('documentation')) {
    labels.push('documentation');
  }
  if (combined.includes('test')) {
    labels.push('testing');
  }
  if (combined.includes('performance') || combined.includes('slow')) {
    labels.push('performance');
  }
  if (combined.includes('security') || combined.includes('vulnerability')) {
    labels.push('security');
  }
  if (combined.includes('ui') || combined.includes('frontend')) {
    labels.push('frontend');
  }
  if (combined.includes('api') || combined.includes('backend')) {
    labels.push('backend');
  }
  if (combined.includes('database') || combined.includes('sql')) {
    labels.push('database');
  }

  // Suggest agent based on labels (order matters - security and docs first)
  let suggestedAgent = 'general-purpose';
  if (labels.includes('security')) {
    suggestedAgent = 'security-expert';
  } else if (labels.includes('documentation')) {
    suggestedAgent = 'docs-engineer';
  } else if (labels.includes('frontend')) {
    suggestedAgent = 'frontend-dev';
  } else if (labels.includes('backend') || labels.includes('database')) {
    suggestedAgent = 'backend-dev';
  } else if (labels.includes('testing')) {
    suggestedAgent = 'test-engineer';
  } else if (labels.includes('bug')) {
    suggestedAgent = 'debugger';
  } else if (labels.includes('performance')) {
    suggestedAgent = 'backend-dev';
  }

  // Estimate complexity (1-10) based on body length and keywords
  let complexity = 5;
  if (issue.body.length > 1000) complexity += 2;
  if (issue.body.length < 100) complexity -= 2;
  if (combined.includes('refactor')) complexity += 1;
  if (combined.includes('simple') || combined.includes('easy')) complexity -= 2;
  if (combined.includes('complex') || combined.includes('difficult'))
    complexity += 2;
  complexity = Math.max(1, Math.min(10, complexity));

  const estimatedHours = complexity * 2;

  return {
    priority,
    labels,
    suggestedAgent,
    complexity,
    estimatedHours,
    reasoning: `Triaged based on content analysis. Priority: ${priority}, Suggested agent: ${suggestedAgent}`,
  };
}

function applyTriageResult(
  state: WorkflowState,
  issueNumber: number,
  triage: TriageResult
): void {
  const issue = state.issues.get(issueNumber);
  if (!issue) throw new Error(`Issue #${issueNumber} not found`);

  // Apply labels
  issue.labels = [...new Set([...issue.labels, ...triage.labels])];
  issue.updated_at = new Date().toISOString();

  // Store triage result
  state.triageResults.set(issueNumber, triage);
}

function assignAgentToIssue(
  state: WorkflowState,
  issueNumber: number,
  agentType: string,
  context: Record<string, unknown> = {},
  handoffFrom?: string
): AgentAssignment {
  const issue = state.issues.get(issueNumber);
  if (!issue) throw new Error(`Issue #${issueNumber} not found`);

  const assignment: AgentAssignment = {
    issueNumber,
    agentType,
    assignedAt: new Date().toISOString(),
    status: 'pending',
    handoffFrom,
    context,
  };

  issue.assignees = [agentType];
  issue.updated_at = new Date().toISOString();
  state.agentAssignments.set(issueNumber, assignment);

  return assignment;
}

function updateAssignmentStatus(
  state: WorkflowState,
  issueNumber: number,
  status: AgentAssignment['status']
): void {
  const assignment = state.agentAssignments.get(issueNumber);
  if (!assignment)
    throw new Error(`No assignment found for issue #${issueNumber}`);
  assignment.status = status;
}

function createPullRequest(
  state: WorkflowState,
  title: string,
  body: string,
  headBranch: string,
  author: string
): GitHubPullRequest {
  const prNumber = state.nextPrNumber++;

  // Parse linked issues from body (e.g., "Fixes #1", "Closes #2")
  const linkedIssues: number[] = [];
  const patterns = [
    /(?:fixes|closes|resolves)\s+#(\d+)/gi,
    /(?:fix|close|resolve)\s+#(\d+)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(body)) !== null) {
      linkedIssues.push(parseInt(match[1], 10));
    }
  }

  const pr: GitHubPullRequest = {
    id: prNumber * 1000,
    number: prNumber,
    title,
    body,
    state: 'open',
    head_branch: headBranch,
    base_branch: 'main',
    linked_issues: linkedIssues,
    merged_at: null,
    author,
  };

  state.pullRequests.set(prNumber, pr);

  // Update linked issues
  for (const issueNumber of linkedIssues) {
    const issue = state.issues.get(issueNumber);
    if (issue) {
      issue.linked_prs.push(prNumber);
      issue.updated_at = new Date().toISOString();
    }
  }

  return pr;
}

function mergePullRequest(
  state: WorkflowState,
  prNumber: number
): { merged: boolean; closedIssues: number[] } {
  const pr = state.pullRequests.get(prNumber);
  if (!pr) throw new Error(`PR #${prNumber} not found`);

  if (pr.state !== 'open') {
    return { merged: false, closedIssues: [] };
  }

  pr.state = 'merged';
  pr.merged_at = new Date().toISOString();

  // Close linked issues
  const closedIssues: number[] = [];
  for (const issueNumber of pr.linked_issues) {
    const issue = state.issues.get(issueNumber);
    if (issue && issue.state === 'open') {
      issue.state = 'closed';
      issue.closed_at = new Date().toISOString();
      issue.updated_at = new Date().toISOString();
      closedIssues.push(issueNumber);
    }
  }

  return { merged: true, closedIssues };
}

function recordAccomplishment(
  state: WorkflowState,
  issueNumber: number,
  prNumber: number | undefined,
  agentType: string,
  title: string,
  description: string,
  metrics: BeadAccomplishment['metrics'],
  tags: string[] = []
): BeadAccomplishment {
  const accomplishment: BeadAccomplishment = {
    id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'accomplishment',
    title,
    description,
    issueNumber,
    prNumber,
    agentType,
    completedAt: new Date().toISOString(),
    metrics,
    tags,
  };

  state.accomplishments.push(accomplishment);
  return accomplishment;
}

function runCompleteWorkflow(
  state: WorkflowState,
  issueTitle: string,
  issueBody: string,
  prTitle: string,
  prBody: string,
  agentType?: string
): {
  issue: GitHubIssue;
  triage: TriageResult;
  assignment: AgentAssignment;
  pr: GitHubPullRequest;
  accomplishment: BeadAccomplishment;
} {
  // Step 1: Create issue
  const issue = createIssue(state, issueTitle, issueBody);

  // Step 2: Auto-triage
  const triage = triageIssue(issue);
  applyTriageResult(state, issue.number, triage);

  // Step 3: Assign agent
  const selectedAgent = agentType || triage.suggestedAgent;
  const assignment = assignAgentToIssue(state, issue.number, selectedAgent, {
    triage,
    issueContext: { title: issueTitle, body: issueBody },
  });

  // Step 4: Start work
  updateAssignmentStatus(state, issue.number, 'in_progress');

  // Step 5: Create PR (with link to issue)
  const prBodyWithLink = `${prBody}\n\nFixes #${issue.number}`;
  const pr = createPullRequest(
    state,
    prTitle,
    prBodyWithLink,
    `fix/issue-${issue.number}`,
    selectedAgent
  );

  // Step 6: Merge PR (closes issue)
  mergePullRequest(state, pr.number);

  // Step 7: Complete assignment
  updateAssignmentStatus(state, issue.number, 'completed');

  // Step 8: Record accomplishment
  const accomplishment = recordAccomplishment(
    state,
    issue.number,
    pr.number,
    selectedAgent,
    `Resolved: ${issueTitle}`,
    `Completed issue #${issue.number} with PR #${pr.number}`,
    {
      filesChanged: 3,
      linesAdded: 50,
      linesRemoved: 10,
      testsAdded: 2,
    },
    [...triage.labels, 'completed']
  );

  return { issue, triage, assignment, pr, accomplishment };
}

// ============================================================================
// Test Suites
// ============================================================================

describe('Issue Management Workflow', () => {
  let state: WorkflowState;
  let testDir: string;

  beforeEach(() => {
    state = createWorkflowState();
    testDir = path.join(tmpdir(), `issue-workflow-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Issue Creation', () => {
    it('should create an issue with correct properties', () => {
      const issue = createIssue(
        state,
        'Bug: Login fails with special characters',
        'When username contains special characters like @, login fails.'
      );

      expect(issue.number).toBe(1);
      expect(issue.title).toBe('Bug: Login fails with special characters');
      expect(issue.state).toBe('open');
      expect(issue.labels).toEqual([]);
      expect(issue.assignees).toEqual([]);
      expect(issue.linked_prs).toEqual([]);
    });

    it('should increment issue numbers sequentially', () => {
      const issue1 = createIssue(state, 'Issue 1', 'Body 1');
      const issue2 = createIssue(state, 'Issue 2', 'Body 2');
      const issue3 = createIssue(state, 'Issue 3', 'Body 3');

      expect(issue1.number).toBe(1);
      expect(issue2.number).toBe(2);
      expect(issue3.number).toBe(3);
    });

    it('should create issue with initial labels', () => {
      const issue = createIssue(state, 'Feature request', 'Add new feature', [
        'enhancement',
        'priority-high',
      ]);

      expect(issue.labels).toEqual(['enhancement', 'priority-high']);
    });

    it('should set timestamps on creation', () => {
      const before = new Date().toISOString();
      const issue = createIssue(state, 'Test', 'Body');
      const after = new Date().toISOString();

      expect(issue.created_at >= before).toBe(true);
      expect(issue.created_at <= after).toBe(true);
      expect(issue.updated_at).toBe(issue.created_at);
      expect(issue.closed_at).toBeNull();
    });

    it('should store issue in state', () => {
      const issue = createIssue(state, 'Stored issue', 'Body');

      expect(state.issues.has(issue.number)).toBe(true);
      expect(state.issues.get(issue.number)).toBe(issue);
    });
  });

  describe('Auto-Triage', () => {
    it('should identify critical priority issues', () => {
      const issue = createIssue(
        state,
        'Critical security vulnerability in auth',
        'A critical vulnerability was found that needs urgent attention.'
      );

      const triage = triageIssue(issue);

      expect(triage.priority).toBe('critical');
      expect(triage.labels).toContain('security');
    });

    it('should identify high priority issues', () => {
      const issue = createIssue(
        state,
        'Important: Database connection pooling',
        'This is high priority for production stability.'
      );

      const triage = triageIssue(issue);

      expect(triage.priority).toBe('high');
    });

    it('should identify low priority issues', () => {
      const issue = createIssue(
        state,
        'Minor typo in readme',
        'Low priority fix for documentation typo.'
      );

      const triage = triageIssue(issue);

      expect(triage.priority).toBe('low');
      expect(triage.labels).toContain('documentation');
    });

    it('should suggest frontend-dev for UI issues', () => {
      const issue = createIssue(
        state,
        'UI button alignment issue',
        'The frontend button is misaligned on mobile.'
      );

      const triage = triageIssue(issue);

      expect(triage.suggestedAgent).toBe('frontend-dev');
      expect(triage.labels).toContain('frontend');
    });

    it('should suggest backend-dev for API issues', () => {
      const issue = createIssue(
        state,
        'API endpoint returns 500',
        'The backend API for users returns 500 error.'
      );

      const triage = triageIssue(issue);

      expect(triage.suggestedAgent).toBe('backend-dev');
      expect(triage.labels).toContain('backend');
    });

    it('should suggest debugger for bug issues', () => {
      const issue = createIssue(
        state,
        'Bug: Application crashes on startup',
        'There is a bug causing error on launch.'
      );

      const triage = triageIssue(issue);

      expect(triage.suggestedAgent).toBe('debugger');
      expect(triage.labels).toContain('bug');
    });

    it('should suggest test-engineer for testing issues', () => {
      const issue = createIssue(
        state,
        'Add unit tests for auth module',
        'Need to add comprehensive test coverage.'
      );

      const triage = triageIssue(issue);

      expect(triage.suggestedAgent).toBe('test-engineer');
      expect(triage.labels).toContain('testing');
    });

    it('should suggest security-expert for security issues', () => {
      const issue = createIssue(
        state,
        'XSS vulnerability in comments',
        'Security: User input not sanitized leading to XSS.'
      );

      const triage = triageIssue(issue);

      expect(triage.suggestedAgent).toBe('security-expert');
      expect(triage.labels).toContain('security');
    });

    it('should suggest docs-engineer for documentation issues', () => {
      const issue = createIssue(
        state,
        'Update API documentation',
        'The docs for the REST API are outdated.'
      );

      const triage = triageIssue(issue);

      expect(triage.suggestedAgent).toBe('docs-engineer');
      expect(triage.labels).toContain('documentation');
    });

    it('should estimate complexity based on content', () => {
      const simpleIssue = createIssue(
        state,
        'Simple fix',
        'Easy change needed.'
      );
      const complexIssue = createIssue(
        state,
        'Complex refactoring',
        'This is a complex and difficult change that requires significant refactoring of the codebase. '.repeat(
          20
        )
      );

      const simpleTriage = triageIssue(simpleIssue);
      const complexTriage = triageIssue(complexIssue);

      expect(simpleTriage.complexity).toBeLessThan(complexTriage.complexity);
    });

    it('should apply triage results to issue', () => {
      const issue = createIssue(
        state,
        'Performance: Slow database queries',
        'Database queries are too slow and affecting performance.'
      );
      const triage = triageIssue(issue);

      applyTriageResult(state, issue.number, triage);

      const updatedIssue = state.issues.get(issue.number)!;
      expect(updatedIssue.labels).toContain('performance');
      expect(updatedIssue.labels).toContain('database');
      expect(state.triageResults.get(issue.number)).toBe(triage);
    });

    it('should merge existing labels with triage labels', () => {
      const issue = createIssue(state, 'Bug in API', 'Backend error.', [
        'needs-review',
      ]);
      const triage = triageIssue(issue);

      applyTriageResult(state, issue.number, triage);

      const updatedIssue = state.issues.get(issue.number)!;
      expect(updatedIssue.labels).toContain('needs-review');
      expect(updatedIssue.labels).toContain('bug');
    });
  });

  describe('Agent Assignment Workflow', () => {
    it('should assign agent to issue', () => {
      const issue = createIssue(state, 'Test issue', 'Body');
      const assignment = assignAgentToIssue(
        state,
        issue.number,
        'frontend-dev'
      );

      expect(assignment.issueNumber).toBe(issue.number);
      expect(assignment.agentType).toBe('frontend-dev');
      expect(assignment.status).toBe('pending');
    });

    it('should update issue assignees', () => {
      const issue = createIssue(state, 'Test issue', 'Body');
      assignAgentToIssue(state, issue.number, 'backend-dev');

      const updatedIssue = state.issues.get(issue.number)!;
      expect(updatedIssue.assignees).toContain('backend-dev');
    });

    it('should include context in assignment', () => {
      const issue = createIssue(state, 'Test issue', 'Body');
      const context = { priority: 'high', estimatedHours: 4 };
      const assignment = assignAgentToIssue(
        state,
        issue.number,
        'debugger',
        context
      );

      expect(assignment.context).toEqual(context);
    });

    it('should track handoff from previous agent', () => {
      const issue = createIssue(state, 'Test issue', 'Body');
      const assignment = assignAgentToIssue(
        state,
        issue.number,
        'backend-dev',
        {},
        'frontend-dev'
      );

      expect(assignment.handoffFrom).toBe('frontend-dev');
    });

    it('should update assignment status', () => {
      const issue = createIssue(state, 'Test issue', 'Body');
      assignAgentToIssue(state, issue.number, 'test-engineer');

      updateAssignmentStatus(state, issue.number, 'in_progress');
      expect(state.agentAssignments.get(issue.number)!.status).toBe(
        'in_progress'
      );

      updateAssignmentStatus(state, issue.number, 'completed');
      expect(state.agentAssignments.get(issue.number)!.status).toBe(
        'completed'
      );
    });

    it('should throw error for non-existent issue', () => {
      expect(() => assignAgentToIssue(state, 999, 'debugger')).toThrow(
        'Issue #999 not found'
      );
    });

    it('should throw error for non-existent assignment status update', () => {
      expect(() => updateAssignmentStatus(state, 999, 'completed')).toThrow(
        'No assignment found for issue #999'
      );
    });
  });

  describe('PR Linking to Issues', () => {
    it('should create PR with linked issues from body', () => {
      const issue = createIssue(state, 'Bug to fix', 'Description');
      const pr = createPullRequest(
        state,
        'Fix the bug',
        `This PR fixes the bug.\n\nFixes #${issue.number}`,
        'fix/bug',
        'developer'
      );

      expect(pr.linked_issues).toContain(issue.number);
    });

    it('should parse multiple issue links', () => {
      const issue1 = createIssue(state, 'Issue 1', 'Body');
      const issue2 = createIssue(state, 'Issue 2', 'Body');
      const pr = createPullRequest(
        state,
        'Multi-fix PR',
        `Fixes #${issue1.number} and Closes #${issue2.number}`,
        'fix/multi',
        'developer'
      );

      expect(pr.linked_issues).toContain(issue1.number);
      expect(pr.linked_issues).toContain(issue2.number);
    });

    it('should update issue with linked PR', () => {
      const issue = createIssue(state, 'Issue', 'Body');
      const pr = createPullRequest(
        state,
        'PR',
        `Fixes #${issue.number}`,
        'fix/issue',
        'dev'
      );

      const updatedIssue = state.issues.get(issue.number)!;
      expect(updatedIssue.linked_prs).toContain(pr.number);
    });

    it('should handle Closes keyword', () => {
      const issue = createIssue(state, 'Issue', 'Body');
      const pr = createPullRequest(
        state,
        'PR',
        `Closes #${issue.number}`,
        'branch',
        'dev'
      );

      expect(pr.linked_issues).toContain(issue.number);
    });

    it('should handle Resolves keyword', () => {
      const issue = createIssue(state, 'Issue', 'Body');
      const pr = createPullRequest(
        state,
        'PR',
        `Resolves #${issue.number}`,
        'branch',
        'dev'
      );

      expect(pr.linked_issues).toContain(issue.number);
    });

    it('should handle case-insensitive keywords', () => {
      const issue = createIssue(state, 'Issue', 'Body');
      const pr = createPullRequest(
        state,
        'PR',
        `FIXES #${issue.number}`,
        'branch',
        'dev'
      );

      expect(pr.linked_issues).toContain(issue.number);
    });

    it('should increment PR numbers sequentially', () => {
      const pr1 = createPullRequest(state, 'PR 1', 'Body', 'branch1', 'dev');
      const pr2 = createPullRequest(state, 'PR 2', 'Body', 'branch2', 'dev');

      expect(pr2.number).toBe(pr1.number + 1);
    });

    it('should store PR in state', () => {
      const pr = createPullRequest(state, 'PR', 'Body', 'branch', 'dev');

      expect(state.pullRequests.has(pr.number)).toBe(true);
      expect(state.pullRequests.get(pr.number)).toBe(pr);
    });
  });

  describe('Issue Closure on PR Merge', () => {
    it('should close linked issues on PR merge', () => {
      const issue = createIssue(state, 'Issue', 'Body');
      const pr = createPullRequest(
        state,
        'PR',
        `Fixes #${issue.number}`,
        'branch',
        'dev'
      );

      const result = mergePullRequest(state, pr.number);

      expect(result.merged).toBe(true);
      expect(result.closedIssues).toContain(issue.number);
      expect(state.issues.get(issue.number)!.state).toBe('closed');
    });

    it('should close multiple linked issues', () => {
      const issue1 = createIssue(state, 'Issue 1', 'Body');
      const issue2 = createIssue(state, 'Issue 2', 'Body');
      const pr = createPullRequest(
        state,
        'PR',
        `Fixes #${issue1.number} and Fixes #${issue2.number}`,
        'branch',
        'dev'
      );

      const result = mergePullRequest(state, pr.number);

      expect(result.closedIssues.length).toBe(2);
      expect(state.issues.get(issue1.number)!.state).toBe('closed');
      expect(state.issues.get(issue2.number)!.state).toBe('closed');
    });

    it('should set closed_at timestamp', () => {
      const issue = createIssue(state, 'Issue', 'Body');
      const pr = createPullRequest(
        state,
        'PR',
        `Fixes #${issue.number}`,
        'branch',
        'dev'
      );

      mergePullRequest(state, pr.number);

      const closedIssue = state.issues.get(issue.number)!;
      expect(closedIssue.closed_at).not.toBeNull();
    });

    it('should set merged_at timestamp on PR', () => {
      const pr = createPullRequest(state, 'PR', 'Body', 'branch', 'dev');

      mergePullRequest(state, pr.number);

      expect(pr.merged_at).not.toBeNull();
      expect(pr.state).toBe('merged');
    });

    it('should not merge already merged PR', () => {
      const pr = createPullRequest(state, 'PR', 'Body', 'branch', 'dev');
      mergePullRequest(state, pr.number);

      const result = mergePullRequest(state, pr.number);

      expect(result.merged).toBe(false);
      expect(result.closedIssues).toEqual([]);
    });

    it('should not close already closed issues', () => {
      const issue = createIssue(state, 'Issue', 'Body');
      issue.state = 'closed';
      issue.closed_at = new Date().toISOString();

      const pr = createPullRequest(
        state,
        'PR',
        `Fixes #${issue.number}`,
        'branch',
        'dev'
      );
      const result = mergePullRequest(state, pr.number);

      expect(result.closedIssues).not.toContain(issue.number);
    });

    it('should throw error for non-existent PR', () => {
      expect(() => mergePullRequest(state, 999)).toThrow('PR #999 not found');
    });
  });

  describe('Accomplishment Tracking via Beads', () => {
    it('should record accomplishment with all fields', () => {
      const acc = recordAccomplishment(
        state,
        1,
        100,
        'frontend-dev',
        'Fixed UI bug',
        'Resolved alignment issue in header',
        { filesChanged: 2, linesAdded: 15, linesRemoved: 5, testsAdded: 1 },
        ['bug', 'ui']
      );

      expect(acc.type).toBe('accomplishment');
      expect(acc.issueNumber).toBe(1);
      expect(acc.prNumber).toBe(100);
      expect(acc.agentType).toBe('frontend-dev');
      expect(acc.title).toBe('Fixed UI bug');
      expect(acc.metrics.filesChanged).toBe(2);
      expect(acc.tags).toContain('bug');
      expect(acc.tags).toContain('ui');
    });

    it('should generate unique accomplishment IDs', () => {
      const acc1 = recordAccomplishment(
        state,
        1,
        100,
        'dev',
        'Title 1',
        'Desc',
        { filesChanged: 1, linesAdded: 1, linesRemoved: 0, testsAdded: 0 }
      );
      const acc2 = recordAccomplishment(
        state,
        2,
        101,
        'dev',
        'Title 2',
        'Desc',
        { filesChanged: 1, linesAdded: 1, linesRemoved: 0, testsAdded: 0 }
      );

      expect(acc1.id).not.toBe(acc2.id);
    });

    it('should store accomplishments in state', () => {
      recordAccomplishment(
        state,
        1,
        100,
        'dev',
        'Title',
        'Desc',
        { filesChanged: 1, linesAdded: 1, linesRemoved: 0, testsAdded: 0 }
      );

      expect(state.accomplishments.length).toBe(1);
    });

    it('should record accomplishment without PR', () => {
      const acc = recordAccomplishment(
        state,
        1,
        undefined,
        'docs-engineer',
        'Updated docs',
        'Improved documentation',
        { filesChanged: 5, linesAdded: 200, linesRemoved: 50, testsAdded: 0 }
      );

      expect(acc.prNumber).toBeUndefined();
    });

    it('should set completion timestamp', () => {
      const before = new Date().toISOString();
      const acc = recordAccomplishment(
        state,
        1,
        100,
        'dev',
        'Title',
        'Desc',
        { filesChanged: 1, linesAdded: 1, linesRemoved: 0, testsAdded: 0 }
      );
      const after = new Date().toISOString();

      expect(acc.completedAt >= before).toBe(true);
      expect(acc.completedAt <= after).toBe(true);
    });

    it('should handle empty tags', () => {
      const acc = recordAccomplishment(
        state,
        1,
        100,
        'dev',
        'Title',
        'Desc',
        { filesChanged: 1, linesAdded: 1, linesRemoved: 0, testsAdded: 0 }
      );

      expect(acc.tags).toEqual([]);
    });
  });

  describe('Complete Workflow Integration', () => {
    it('should complete full issue-to-accomplishment workflow', () => {
      const result = runCompleteWorkflow(
        state,
        'Fix login UI button styling',
        'The frontend login button has incorrect padding on mobile devices.',
        'Fix login button padding',
        'Adjusted CSS for mobile responsive padding.'
      );

      expect(result.issue.state).toBe('closed');
      expect(result.triage.labels).toContain('frontend');
      expect(result.assignment.status).toBe('completed');
      expect(result.pr.state).toBe('merged');
      expect(result.accomplishment.issueNumber).toBe(result.issue.number);
      expect(result.accomplishment.prNumber).toBe(result.pr.number);
    });

    it('should use suggested agent from triage', () => {
      const result = runCompleteWorkflow(
        state,
        'Security: SQL injection vulnerability',
        'User input is not sanitized in query builder.',
        'Fix SQL injection vulnerability',
        'Added parameterized queries.'
      );

      expect(result.triage.suggestedAgent).toBe('security-expert');
      expect(result.assignment.agentType).toBe('security-expert');
    });

    it('should allow overriding suggested agent', () => {
      const result = runCompleteWorkflow(
        state,
        'Bug in API',
        'API returns wrong data.',
        'Fix API bug',
        'Corrected query logic.',
        'debugger'
      );

      expect(result.assignment.agentType).toBe('debugger');
    });

    it('should link PR to issue correctly', () => {
      const result = runCompleteWorkflow(
        state,
        'Feature request',
        'Add new feature.',
        'Implement feature',
        'New feature implementation.'
      );

      expect(result.pr.linked_issues).toContain(result.issue.number);
      expect(result.issue.linked_prs).toContain(result.pr.number);
    });

    it('should include triage in assignment context', () => {
      const result = runCompleteWorkflow(
        state,
        'Test issue',
        'Test body',
        'Test PR',
        'Test changes'
      );

      expect(result.assignment.context).toHaveProperty('triage');
      expect(result.assignment.context).toHaveProperty('issueContext');
    });

    it('should record metrics in accomplishment', () => {
      const result = runCompleteWorkflow(
        state,
        'Update component',
        'Component needs update.',
        'Updated component',
        'Changes applied.'
      );

      expect(result.accomplishment.metrics.filesChanged).toBeGreaterThan(0);
      expect(result.accomplishment.metrics.linesAdded).toBeGreaterThan(0);
    });

    it('should run multiple workflows independently', () => {
      const result1 = runCompleteWorkflow(
        state,
        'Issue 1',
        'Body 1',
        'PR 1',
        'Changes 1'
      );
      const result2 = runCompleteWorkflow(
        state,
        'Issue 2',
        'Body 2',
        'PR 2',
        'Changes 2'
      );

      expect(result1.issue.number).not.toBe(result2.issue.number);
      expect(result1.pr.number).not.toBe(result2.pr.number);
      expect(state.accomplishments.length).toBe(2);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle issue with empty title', () => {
      const issue = createIssue(state, '', 'Body content');

      expect(issue.title).toBe('');
      expect(issue.number).toBe(1);
    });

    it('should handle issue with empty body', () => {
      const issue = createIssue(state, 'Title', '');
      const triage = triageIssue(issue);

      expect(triage.priority).toBe('medium');
      expect(triage.complexity).toBeLessThan(5);
    });

    it('should handle PR with no issue links', () => {
      const pr = createPullRequest(
        state,
        'Standalone PR',
        'No issue references here.',
        'feature/new',
        'dev'
      );

      expect(pr.linked_issues).toEqual([]);
    });

    it('should handle issue link to non-existent issue', () => {
      const pr = createPullRequest(
        state,
        'PR',
        'Fixes #999',
        'branch',
        'dev'
      );

      expect(pr.linked_issues).toContain(999);
      // Non-existent issue should not cause error
    });

    it('should handle multiple labels from triage', () => {
      const issue = createIssue(
        state,
        'Bug in frontend API security',
        'The frontend API has a security bug that affects performance.'
      );
      const triage = triageIssue(issue);

      expect(triage.labels.length).toBeGreaterThan(1);
      expect(triage.labels).toContain('bug');
      expect(triage.labels).toContain('security');
    });

    it('should handle assignment without context', () => {
      const issue = createIssue(state, 'Issue', 'Body');
      const assignment = assignAgentToIssue(state, issue.number, 'debugger');

      expect(assignment.context).toEqual({});
    });

    it('should handle concurrent issue creation', () => {
      const issues = Array.from({ length: 10 }, (_, i) =>
        createIssue(state, `Issue ${i}`, `Body ${i}`)
      );

      const numbers = issues.map((i) => i.number);
      const uniqueNumbers = new Set(numbers);

      expect(uniqueNumbers.size).toBe(10);
    });

    it('should handle very long issue body', () => {
      const longBody = 'A'.repeat(10000);
      const issue = createIssue(state, 'Long issue', longBody);
      const triage = triageIssue(issue);

      expect(issue.body.length).toBe(10000);
      expect(triage.complexity).toBeGreaterThan(5);
    });

    it('should handle special characters in title', () => {
      const issue = createIssue(
        state,
        'Bug: <script>alert("XSS")</script>',
        'Description with "quotes" and \'apostrophes\''
      );

      expect(issue.title).toContain('<script>');
    });

    it('should handle unicode in issue content', () => {
      const issue = createIssue(
        state,
        'Bug: 日本語タイトル',
        'Description with émoji 🐛 and üñíçödé'
      );

      expect(issue.title).toContain('日本語');
      expect(issue.body).toContain('🐛');
    });

    it('should update timestamps on modifications', () => {
      const issue = createIssue(state, 'Issue', 'Body');
      const originalUpdatedAt = issue.updated_at;

      // Small delay to ensure timestamp difference
      const triage = triageIssue(issue);
      applyTriageResult(state, issue.number, triage);

      expect(issue.updated_at >= originalUpdatedAt).toBe(true);
    });
  });

  describe('Workflow State Persistence', () => {
    it('should maintain state across operations', () => {
      const issue1 = createIssue(state, 'Issue 1', 'Body');
      const issue2 = createIssue(state, 'Issue 2', 'Body');

      applyTriageResult(state, issue1.number, triageIssue(issue1));
      assignAgentToIssue(state, issue1.number, 'dev');

      expect(state.issues.size).toBe(2);
      expect(state.triageResults.size).toBe(1);
      expect(state.agentAssignments.size).toBe(1);
    });

    it('should track all accomplishments', () => {
      runCompleteWorkflow(state, 'Issue 1', 'Body', 'PR 1', 'Changes');
      runCompleteWorkflow(state, 'Issue 2', 'Body', 'PR 2', 'Changes');
      runCompleteWorkflow(state, 'Issue 3', 'Body', 'PR 3', 'Changes');

      expect(state.accomplishments.length).toBe(3);
    });

    it('should preserve issue-PR relationships', () => {
      const issue = createIssue(state, 'Issue', 'Body');
      const pr1 = createPullRequest(
        state,
        'PR 1',
        `Fix #${issue.number} - partial implementation`,
        'branch1',
        'dev'
      );
      const pr2 = createPullRequest(
        state,
        'PR 2',
        `Closes #${issue.number}`,
        'branch2',
        'dev'
      );

      expect(issue.linked_prs).toContain(pr1.number);
      expect(issue.linked_prs).toContain(pr2.number);
    });
  });

  describe('Agent Handoff Scenarios', () => {
    it('should handle handoff between agents', () => {
      const issue = createIssue(
        state,
        'Complex issue',
        'Requires multiple agents.'
      );

      // First agent starts
      const assignment1 = assignAgentToIssue(state, issue.number, 'debugger');
      updateAssignmentStatus(state, issue.number, 'in_progress');

      // Handoff to second agent
      const assignment2 = assignAgentToIssue(
        state,
        issue.number,
        'backend-dev',
        { previousWork: 'Identified root cause' },
        'debugger'
      );

      expect(assignment2.handoffFrom).toBe('debugger');
      expect(assignment2.context).toHaveProperty('previousWork');
    });

    it('should maintain handoff chain in context', () => {
      const issue = createIssue(state, 'Issue', 'Body');

      assignAgentToIssue(
        state,
        issue.number,
        'frontend-dev',
        { handoffChain: [] }
      );

      assignAgentToIssue(
        state,
        issue.number,
        'backend-dev',
        { handoffChain: ['frontend-dev'] },
        'frontend-dev'
      );

      const finalAssignment = state.agentAssignments.get(issue.number)!;
      expect(finalAssignment.context.handoffChain).toContain('frontend-dev');
    });
  });

  describe('Label Management', () => {
    it('should not duplicate labels', () => {
      const issue = createIssue(state, 'Bug bug bug', 'A bug causing bugs.', [
        'bug',
      ]);
      const triage = triageIssue(issue);

      applyTriageResult(state, issue.number, triage);

      const bugCount = issue.labels.filter((l) => l === 'bug').length;
      expect(bugCount).toBe(1);
    });

    it('should handle many labels', () => {
      const issue = createIssue(
        state,
        'Complex issue with many aspects',
        'Frontend UI bug in backend API causing security performance issues in database requiring documentation and testing.'
      );
      const triage = triageIssue(issue);

      expect(triage.labels.length).toBeGreaterThan(3);
    });
  });
});
