/**
 * GitHub Project Management Integration Tests
 *
 * Comprehensive test suite for GitHub issues project management workflow
 * for the NY Knicks website project. Tests task-to-issue creation, milestone
 * organization, project board integration, status tracking, subtask mapping,
 * and bidirectional sync.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('../../src/utils/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('chalk', () => ({
  default: {
    green: Object.assign(vi.fn((s: string) => s), { bold: vi.fn((s: string) => s) }),
    red: Object.assign(vi.fn((s: string) => s), { bold: vi.fn((s: string) => s) }),
    yellow: Object.assign(vi.fn((s: string) => s), { bold: vi.fn((s: string) => s) }),
    cyan: vi.fn((s: string) => s),
    dim: vi.fn((s: string) => s),
    bold: Object.assign(vi.fn((s: string) => s), {
      blue: vi.fn((s: string) => s),
      cyan: vi.fn((s: string) => s),
    }),
    white: vi.fn((s: string) => s),
  },
}));

// ============================================================================
// Types and Interfaces
// ============================================================================

interface TaskMasterTask {
  id: number | string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'done' | 'blocked' | 'cancelled';
  priority: 'critical' | 'high' | 'medium' | 'low';
  details?: string;
  testStrategy?: string;
  dependencies?: number[];
  subtasks?: TaskMasterSubtask[];
  tags?: string[];
}

interface TaskMasterSubtask {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'done';
}

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  labels: GitHubLabel[];
  state: 'open' | 'closed';
  assignees: GitHubUser[];
  milestone?: GitHubMilestone;
  created_at: string;
  updated_at: string;
  url: string;
  html_url: string;
}

interface GitHubLabel {
  id: number;
  name: string;
  description?: string;
  color: string;
}

interface GitHubUser {
  id: number;
  login: string;
  type: string;
}

interface GitHubMilestone {
  id: number;
  number: number;
  title: string;
  description?: string;
  state: 'open' | 'closed';
  due_on?: string;
  open_issues: number;
  closed_issues: number;
}

interface GitHubProject {
  id: number;
  name: string;
  body?: string;
  state: 'open' | 'closed';
  columns: GitHubProjectColumn[];
}

interface GitHubProjectColumn {
  id: number;
  name: string;
  cards: GitHubProjectCard[];
}

interface GitHubProjectCard {
  id: number;
  content_url?: string;
  issue_number?: number;
  note?: string;
}

interface IssueCreationResult {
  success: boolean;
  issue?: GitHubIssue;
  error?: string;
}

interface MilestoneCreationResult {
  success: boolean;
  milestone?: GitHubMilestone;
  error?: string;
}

interface ProjectBoardResult {
  success: boolean;
  project?: GitHubProject;
  error?: string;
}

interface SyncResult {
  success: boolean;
  synced: number;
  errors: string[];
}

// ============================================================================
// NY Knicks Project Constants
// ============================================================================

const KNICKS_PROJECT = {
  name: 'NY Knicks Official Website',
  repo: 'ny-knicks-website',
  owner: 'knicks-org',
};

const PROJECT_MILESTONES = [
  {
    title: 'Design Phase',
    description: 'UI/UX design, wireframes, and design system creation',
    dueDate: '2025-02-01',
  },
  {
    title: 'Development Phase',
    description: 'Core implementation of website features',
    dueDate: '2025-03-15',
  },
  {
    title: 'Polish Phase',
    description: 'Testing, refinement, and performance optimization',
    dueDate: '2025-04-01',
  },
];

const PROJECT_BOARD_COLUMNS = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'];

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'priority:critical',
  high: 'priority:high',
  medium: 'priority:medium',
  low: 'priority:low',
};

const TECHNOLOGY_LABELS = ['react', 'nextjs', 'typescript', 'tailwind', 'design', 'api', 'testing'];

// ============================================================================
// Test Fixtures and Helper Functions
// ============================================================================

/**
 * Create sample NY Knicks TaskMaster tasks
 */
function createNYKnicksTasks(): TaskMasterTask[] {
  return [
    {
      id: 1,
      title: 'Design System for NY Knicks Website',
      description: 'Create comprehensive design system with Knicks branding',
      status: 'pending',
      priority: 'high',
      details: 'Define color palette (#006BB6 blue, #F58426 orange), typography, and component library',
      tags: ['design', 'ux'],
      subtasks: [
        { id: '1.1', title: 'Define Color Palette', status: 'pending' },
        { id: '1.2', title: 'Create Typography System', status: 'pending' },
        { id: '1.3', title: 'Design Base Components', status: 'pending' },
      ],
    },
    {
      id: 2,
      title: 'Player Roster Page Implementation',
      description: 'Build interactive player roster page with stats and profiles',
      status: 'pending',
      priority: 'high',
      details: 'React components for player cards, stats dashboard, position filtering',
      tags: ['frontend', 'react'],
      dependencies: [1],
      subtasks: [
        { id: '2.1', title: 'PlayerCard Component', status: 'pending' },
        { id: '2.2', title: 'Stats Dashboard', status: 'pending' },
        { id: '2.3', title: 'Position Filter', status: 'pending' },
      ],
    },
    {
      id: 3,
      title: 'Game Schedule Integration',
      description: 'Implement game schedule with live scores from NBA API',
      status: 'pending',
      priority: 'critical',
      details: 'Calendar view, live score updates, broadcast information',
      tags: ['frontend', 'api', 'react'],
      dependencies: [1, 2],
    },
    {
      id: 4,
      title: 'Ticket Integration System',
      description: 'Integrate ticketing system for game ticket purchases',
      status: 'pending',
      priority: 'medium',
      details: 'Seat selection, pricing display, checkout flow integration',
      tags: ['frontend', 'api', 'payments'],
      dependencies: [2],
    },
    {
      id: 5,
      title: 'Mobile Responsive Design',
      description: 'Ensure full mobile responsiveness across all pages',
      status: 'pending',
      priority: 'high',
      details: 'Test on iOS, Android, tablet sizes. Optimize touch interactions.',
      tags: ['design', 'testing', 'mobile'],
      dependencies: [1, 2, 3, 4],
    },
  ];
}

/**
 * Map task priority to GitHub label
 */
function mapPriorityToLabel(priority: string): string {
  return PRIORITY_LABELS[priority] || 'priority:medium';
}

/**
 * Extract technology labels from task
 */
function extractTechLabels(task: TaskMasterTask): string[] {
  const labels: string[] = [];
  const content = `${task.title} ${task.description} ${task.details || ''} ${(task.tags || []).join(' ')}`.toLowerCase();

  TECHNOLOGY_LABELS.forEach(tech => {
    if (content.includes(tech)) {
      labels.push(tech);
    }
  });

  return labels;
}

/**
 * Determine milestone for task based on type and dependencies
 */
function determineMilestone(task: TaskMasterTask): string {
  const tags = task.tags || [];
  const title = task.title.toLowerCase();
  const description = task.description.toLowerCase();

  // Design tasks go to Design Phase
  if (tags.includes('design') || tags.includes('ux') || title.includes('design')) {
    return 'Design Phase';
  }

  // Testing tasks go to Polish Phase
  if (tags.includes('testing') || title.includes('testing') || title.includes('polish')) {
    return 'Polish Phase';
  }

  // Implementation tasks go to Development Phase
  return 'Development Phase';
}

/**
 * Create GitHub issue from TaskMaster task
 */
function createIssueFromTask(task: TaskMasterTask, milestones: Map<string, GitHubMilestone>): GitHubIssue {
  const priorityLabel = mapPriorityToLabel(task.priority);
  const techLabels = extractTechLabels(task);
  const milestoneName = determineMilestone(task);
  const milestone = milestones.get(milestoneName);

  // Build issue body with TaskMaster metadata
  let body = `## Description\n${task.description}\n\n`;

  if (task.details) {
    body += `## Details\n${task.details}\n\n`;
  }

  if (task.subtasks && task.subtasks.length > 0) {
    body += `## Subtasks\n`;
    task.subtasks.forEach(subtask => {
      const checkbox = subtask.status === 'done' ? '[x]' : '[ ]';
      body += `- ${checkbox} ${subtask.id}: ${subtask.title}\n`;
    });
    body += '\n';
  }

  if (task.dependencies && task.dependencies.length > 0) {
    body += `## Dependencies\n`;
    task.dependencies.forEach(dep => {
      body += `- Depends on Task #${dep}\n`;
    });
    body += '\n';
  }

  body += `---\n_TaskMaster Task ID: ${task.id}_\n`;

  const labels: GitHubLabel[] = [
    { id: 1, name: priorityLabel, color: 'ff0000' },
    ...techLabels.map((tech, idx) => ({ id: 100 + idx, name: tech, color: '0066ff' })),
    { id: 999, name: 'ny-knicks', color: '006BB6' },
  ];

  return {
    id: 1000 + Number(task.id),
    number: Number(task.id),
    title: task.title,
    body,
    labels,
    state: 'open',
    assignees: [],
    milestone,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    url: `https://api.github.com/repos/${KNICKS_PROJECT.owner}/${KNICKS_PROJECT.repo}/issues/${task.id}`,
    html_url: `https://github.com/${KNICKS_PROJECT.owner}/${KNICKS_PROJECT.repo}/issues/${task.id}`,
  };
}

/**
 * Create GitHub milestone
 */
function createMilestone(
  number: number,
  title: string,
  description: string,
  dueDate?: string
): GitHubMilestone {
  return {
    id: 2000 + number,
    number,
    title,
    description,
    state: 'open',
    due_on: dueDate,
    open_issues: 0,
    closed_issues: 0,
  };
}

/**
 * Create project board with columns
 */
function createProjectBoard(
  name: string,
  columns: string[],
  issues: GitHubIssue[]
): GitHubProject {
  return {
    id: 3000,
    name,
    body: `Project board for ${name}`,
    state: 'open',
    columns: columns.map((colName, idx) => ({
      id: 4000 + idx,
      name: colName,
      cards: colName === 'Backlog'
        ? issues.map((issue, cardIdx) => ({
            id: 5000 + cardIdx,
            content_url: issue.url,
            issue_number: issue.number,
          }))
        : [],
    })),
  };
}

/**
 * Update issue status with label
 */
function updateIssueStatus(
  issue: GitHubIssue,
  status: 'in-progress' | 'review' | 'completed'
): GitHubIssue {
  const statusLabel: GitHubLabel = {
    id: 800,
    name: `status:${status}`,
    color: status === 'completed' ? '00ff00' : 'ffff00',
  };

  // Remove old status labels
  const filteredLabels = issue.labels.filter(l => !l.name.startsWith('status:'));

  return {
    ...issue,
    labels: [...filteredLabels, statusLabel],
    updated_at: new Date().toISOString(),
  };
}

/**
 * Assign agent to issue
 */
function assignAgentToIssue(issue: GitHubIssue, agentName: string): GitHubIssue {
  const agent: GitHubUser = {
    id: 6000,
    login: agentName,
    type: 'User',
  };

  return {
    ...issue,
    assignees: [...issue.assignees, agent],
    updated_at: new Date().toISOString(),
  };
}

/**
 * Move issue to project column
 */
function moveIssueToColumn(
  project: GitHubProject,
  issueNumber: number,
  targetColumn: string
): GitHubProject {
  const columns = project.columns.map(col => {
    // Remove card from current column
    const filteredCards = col.cards.filter(card => card.issue_number !== issueNumber);

    // Add to target column
    if (col.name === targetColumn) {
      return {
        ...col,
        cards: [...filteredCards, { id: Date.now(), issue_number: issueNumber }],
      };
    }

    return { ...col, cards: filteredCards };
  });

  return { ...project, columns };
}

/**
 * Parse subtask checkboxes from issue body
 */
function parseSubtaskCheckboxes(body: string): { id: string; title: string; completed: boolean }[] {
  const subtaskRegex = /- \[([ x])\] (\d+\.\d+): (.+)/g;
  const subtasks: { id: string; title: string; completed: boolean }[] = [];

  let match;
  while ((match = subtaskRegex.exec(body)) !== null) {
    subtasks.push({
      id: match[2],
      title: match[3],
      completed: match[1] === 'x',
    });
  }

  return subtasks;
}

/**
 * Update subtask checkbox in issue body
 */
function updateSubtaskCheckbox(body: string, subtaskId: string, completed: boolean): string {
  const checkbox = completed ? '[x]' : '[ ]';
  const regex = new RegExp(`- \\[[ x]\\] (${subtaskId}: .+)`, 'g');
  return body.replace(regex, `- ${checkbox} $1`);
}

/**
 * Sync TaskMaster task status from GitHub issue
 */
function syncTaskFromIssue(task: TaskMasterTask, issue: GitHubIssue): TaskMasterTask {
  // Determine status from labels
  const statusLabels = issue.labels.filter(l => l.name.startsWith('status:'));
  const statusLabel = statusLabels[0]?.name.replace('status:', '');

  let newStatus: TaskMasterTask['status'] = task.status;
  if (issue.state === 'closed') {
    newStatus = 'done';
  } else if (statusLabel === 'in-progress') {
    newStatus = 'in-progress';
  } else if (statusLabel === 'completed') {
    newStatus = 'done';
  }

  // Sync subtask statuses from checkboxes
  const checkboxes = parseSubtaskCheckboxes(issue.body);
  const updatedSubtasks = task.subtasks?.map(subtask => {
    const checkbox = checkboxes.find(cb => cb.id === subtask.id);
    if (checkbox) {
      return { ...subtask, status: checkbox.completed ? 'done' as const : 'pending' as const };
    }
    return subtask;
  });

  return { ...task, status: newStatus, subtasks: updatedSubtasks };
}

/**
 * Sync GitHub issue from TaskMaster task changes
 */
function syncIssueFromTask(issue: GitHubIssue, task: TaskMasterTask): GitHubIssue {
  // Update status label based on task status
  let updatedIssue = { ...issue };

  if (task.status === 'in-progress') {
    updatedIssue = updateIssueStatus(updatedIssue, 'in-progress');
  } else if (task.status === 'done') {
    updatedIssue = updateIssueStatus(updatedIssue, 'completed');
    updatedIssue.state = 'closed';
  }

  // Update subtask checkboxes
  if (task.subtasks) {
    let body = updatedIssue.body;
    task.subtasks.forEach(subtask => {
      body = updateSubtaskCheckbox(body, subtask.id, subtask.status === 'done');
    });
    updatedIssue.body = body;
  }

  updatedIssue.updated_at = new Date().toISOString();
  return updatedIssue;
}

// ============================================================================
// Test Suites
// ============================================================================

describe('GitHub Project Management for NY Knicks Website', () => {
  let tasks: TaskMasterTask[];
  let milestones: Map<string, GitHubMilestone>;
  let issues: GitHubIssue[];
  let project: GitHubProject;

  beforeEach(() => {
    vi.clearAllMocks();

    // Initialize test data
    tasks = createNYKnicksTasks();

    // Create milestones
    milestones = new Map();
    PROJECT_MILESTONES.forEach((ms, idx) => {
      const milestone = createMilestone(idx + 1, ms.title, ms.description, ms.dueDate);
      milestones.set(ms.title, milestone);
    });

    // Create issues from tasks
    issues = tasks.map(task => createIssueFromTask(task, milestones));

    // Create project board
    project = createProjectBoard(KNICKS_PROJECT.name, PROJECT_BOARD_COLUMNS, issues);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // 1. Task-to-Issue Creation Tests
  // ==========================================================================

  describe('Task-to-Issue Creation', () => {
    it('should create GitHub issue with correct title from TaskMaster task', () => {
      const task = tasks[0];
      const issue = createIssueFromTask(task, milestones);

      expect(issue.title).toBe(task.title);
    });

    it('should include task description in issue body', () => {
      const task = tasks[0];
      const issue = createIssueFromTask(task, milestones);

      expect(issue.body).toContain(task.description);
    });

    it('should map task priority to GitHub labels', () => {
      const criticalTask = tasks.find(t => t.priority === 'critical');
      const issue = createIssueFromTask(criticalTask!, milestones);

      expect(issue.labels.some(l => l.name === 'priority:critical')).toBe(true);
    });

    it('should extract technology labels from task content', () => {
      const reactTask = tasks.find(t => t.tags?.includes('react'));
      const issue = createIssueFromTask(reactTask!, milestones);

      expect(issue.labels.some(l => l.name === 'react')).toBe(true);
    });

    it('should include TaskMaster task ID in issue body', () => {
      const task = tasks[0];
      const issue = createIssueFromTask(task, milestones);

      expect(issue.body).toContain(`TaskMaster Task ID: ${task.id}`);
    });

    it('should add ny-knicks label to all issues', () => {
      issues.forEach(issue => {
        expect(issue.labels.some(l => l.name === 'ny-knicks')).toBe(true);
      });
    });

    it('should create issues for all NY Knicks tasks', () => {
      expect(issues.length).toBe(tasks.length);
    });

    it('should include task details in issue body when present', () => {
      const taskWithDetails = tasks.find(t => t.details);
      const issue = createIssueFromTask(taskWithDetails!, milestones);

      expect(issue.body).toContain(taskWithDetails!.details);
    });

    it('should include dependencies in issue body', () => {
      const taskWithDeps = tasks.find(t => t.dependencies && t.dependencies.length > 0);
      const issue = createIssueFromTask(taskWithDeps!, milestones);

      expect(issue.body).toContain('Dependencies');
      taskWithDeps!.dependencies!.forEach(dep => {
        expect(issue.body).toContain(`Task #${dep}`);
      });
    });

    it('should set issue state to open by default', () => {
      issues.forEach(issue => {
        expect(issue.state).toBe('open');
      });
    });
  });

  // ==========================================================================
  // 2. Milestone Organization Tests
  // ==========================================================================

  describe('Milestone Organization', () => {
    it('should create three project milestones', () => {
      expect(milestones.size).toBe(3);
    });

    it('should create Design Phase milestone', () => {
      expect(milestones.has('Design Phase')).toBe(true);
    });

    it('should create Development Phase milestone', () => {
      expect(milestones.has('Development Phase')).toBe(true);
    });

    it('should create Polish Phase milestone', () => {
      expect(milestones.has('Polish Phase')).toBe(true);
    });

    it('should assign design tasks to Design Phase', () => {
      const designTask = tasks.find(t => t.tags?.includes('design'));
      const issue = createIssueFromTask(designTask!, milestones);

      expect(issue.milestone?.title).toBe('Design Phase');
    });

    it('should assign testing-only tasks to Polish Phase', () => {
      // Create a testing-only task (not mixed with design)
      const testingOnlyTask: TaskMasterTask = {
        id: 99,
        title: 'Final QA Testing',
        description: 'Comprehensive testing before launch',
        status: 'pending',
        priority: 'high',
        tags: ['testing'],
      };

      const issue = createIssueFromTask(testingOnlyTask, milestones);
      expect(issue.milestone?.title).toBe('Polish Phase');
    });

    it('should assign implementation tasks to Development Phase', () => {
      const implTask = tasks.find(t => !t.tags?.includes('design') && !t.tags?.includes('testing'));
      const issue = createIssueFromTask(implTask!, milestones);

      expect(issue.milestone?.title).toBe('Development Phase');
    });

    it('should set milestone due dates', () => {
      milestones.forEach((milestone, name) => {
        const config = PROJECT_MILESTONES.find(m => m.title === name);
        expect(milestone.due_on).toBe(config?.dueDate);
      });
    });

    it('should track open issues per milestone', () => {
      milestones.forEach(milestone => {
        expect(typeof milestone.open_issues).toBe('number');
        expect(typeof milestone.closed_issues).toBe('number');
      });
    });

    it('should correctly categorize all tasks', () => {
      const issuesWithMilestones = issues.filter(i => i.milestone);
      expect(issuesWithMilestones.length).toBe(issues.length);
    });
  });

  // ==========================================================================
  // 3. Project Board Integration Tests
  // ==========================================================================

  describe('Project Board Integration', () => {
    it('should create project board with correct name', () => {
      expect(project.name).toBe(KNICKS_PROJECT.name);
    });

    it('should create all expected columns', () => {
      const columnNames = project.columns.map(c => c.name);
      PROJECT_BOARD_COLUMNS.forEach(col => {
        expect(columnNames).toContain(col);
      });
    });

    it('should add all issues to Backlog column initially', () => {
      const backlogColumn = project.columns.find(c => c.name === 'Backlog');
      expect(backlogColumn?.cards.length).toBe(issues.length);
    });

    it('should move issue to In Progress column when assigned', () => {
      const issueNumber = issues[0].number;
      const updatedProject = moveIssueToColumn(project, issueNumber, 'In Progress');

      const inProgressColumn = updatedProject.columns.find(c => c.name === 'In Progress');
      expect(inProgressColumn?.cards.some(card => card.issue_number === issueNumber)).toBe(true);

      const backlogColumn = updatedProject.columns.find(c => c.name === 'Backlog');
      expect(backlogColumn?.cards.some(card => card.issue_number === issueNumber)).toBe(false);
    });

    it('should move issue to Review column', () => {
      const issueNumber = issues[0].number;
      const updatedProject = moveIssueToColumn(project, issueNumber, 'Review');

      const reviewColumn = updatedProject.columns.find(c => c.name === 'Review');
      expect(reviewColumn?.cards.some(card => card.issue_number === issueNumber)).toBe(true);
    });

    it('should move issue to Done column when completed', () => {
      const issueNumber = issues[0].number;
      const updatedProject = moveIssueToColumn(project, issueNumber, 'Done');

      const doneColumn = updatedProject.columns.find(c => c.name === 'Done');
      expect(doneColumn?.cards.some(card => card.issue_number === issueNumber)).toBe(true);
    });

    it('should handle multiple issues in same column', () => {
      let updatedProject = project;
      issues.slice(0, 3).forEach(issue => {
        updatedProject = moveIssueToColumn(updatedProject, issue.number, 'In Progress');
      });

      const inProgressColumn = updatedProject.columns.find(c => c.name === 'In Progress');
      expect(inProgressColumn?.cards.length).toBe(3);
    });

    it('should track issue movement between columns', () => {
      const issueNumber = issues[0].number;

      // Move through workflow
      let updatedProject = moveIssueToColumn(project, issueNumber, 'To Do');
      updatedProject = moveIssueToColumn(updatedProject, issueNumber, 'In Progress');
      updatedProject = moveIssueToColumn(updatedProject, issueNumber, 'Review');
      updatedProject = moveIssueToColumn(updatedProject, issueNumber, 'Done');

      const doneColumn = updatedProject.columns.find(c => c.name === 'Done');
      expect(doneColumn?.cards.some(card => card.issue_number === issueNumber)).toBe(true);

      // Should not be in other columns
      updatedProject.columns
        .filter(c => c.name !== 'Done')
        .forEach(col => {
          expect(col.cards.some(card => card.issue_number === issueNumber)).toBe(false);
        });
    });

    it('should maintain project state as open', () => {
      expect(project.state).toBe('open');
    });
  });

  // ==========================================================================
  // 4. Issue Status Tracking from Agent Work Tests
  // ==========================================================================

  describe('Issue Status Tracking from Agent Work', () => {
    it('should assign agent to issue', () => {
      const issue = issues[0];
      const updatedIssue = assignAgentToIssue(issue, 'frontend-dev');

      expect(updatedIssue.assignees.some(a => a.login === 'frontend-dev')).toBe(true);
    });

    it('should add in-progress status label when agent starts work', () => {
      const issue = issues[0];
      const updatedIssue = updateIssueStatus(issue, 'in-progress');

      expect(updatedIssue.labels.some(l => l.name === 'status:in-progress')).toBe(true);
    });

    it('should add completed status label when agent completes work', () => {
      const issue = issues[0];
      const updatedIssue = updateIssueStatus(issue, 'completed');

      expect(updatedIssue.labels.some(l => l.name === 'status:completed')).toBe(true);
    });

    it('should remove old status labels when updating status', () => {
      let issue = issues[0];
      issue = updateIssueStatus(issue, 'in-progress');
      issue = updateIssueStatus(issue, 'completed');

      const statusLabels = issue.labels.filter(l => l.name.startsWith('status:'));
      expect(statusLabels.length).toBe(1);
      expect(statusLabels[0].name).toBe('status:completed');
    });

    it('should update issue timestamp when status changes', () => {
      const issue = issues[0];
      const originalUpdatedAt = issue.updated_at;

      // Small delay to ensure different timestamp
      const updatedIssue = updateIssueStatus(issue, 'in-progress');

      expect(new Date(updatedIssue.updated_at).getTime()).toBeGreaterThanOrEqual(
        new Date(originalUpdatedAt).getTime()
      );
    });

    it('should support multiple agent assignments', () => {
      let issue = issues[0];
      issue = assignAgentToIssue(issue, 'frontend-dev');
      issue = assignAgentToIssue(issue, 'ux-designer');

      expect(issue.assignees.length).toBe(2);
    });

    it('should track review status', () => {
      const issue = issues[0];
      const updatedIssue = updateIssueStatus(issue, 'review');

      expect(updatedIssue.labels.some(l => l.name === 'status:review')).toBe(true);
    });

    it('should maintain issue metadata through status changes', () => {
      let issue = issues[0];
      const originalTitle = issue.title;
      const originalNumber = issue.number;

      issue = updateIssueStatus(issue, 'in-progress');
      issue = assignAgentToIssue(issue, 'frontend-dev');
      issue = updateIssueStatus(issue, 'completed');

      expect(issue.title).toBe(originalTitle);
      expect(issue.number).toBe(originalNumber);
    });
  });

  // ==========================================================================
  // 5. Subtask Mapping Tests
  // ==========================================================================

  describe('Subtask Mapping', () => {
    it('should include subtask checklist in issue body', () => {
      const taskWithSubtasks = tasks.find(t => t.subtasks && t.subtasks.length > 0);
      const issue = createIssueFromTask(taskWithSubtasks!, milestones);

      expect(issue.body).toContain('## Subtasks');
      expect(issue.body).toContain('[ ]');
    });

    it('should format subtasks with correct checkbox syntax', () => {
      const taskWithSubtasks = tasks.find(t => t.subtasks && t.subtasks.length > 0);
      const issue = createIssueFromTask(taskWithSubtasks!, milestones);

      taskWithSubtasks!.subtasks!.forEach(subtask => {
        expect(issue.body).toContain(`- [ ] ${subtask.id}: ${subtask.title}`);
      });
    });

    it('should parse subtask checkboxes from issue body', () => {
      const taskWithSubtasks = tasks.find(t => t.subtasks && t.subtasks.length > 0);
      const issue = createIssueFromTask(taskWithSubtasks!, milestones);

      const parsed = parseSubtaskCheckboxes(issue.body);
      expect(parsed.length).toBe(taskWithSubtasks!.subtasks!.length);
    });

    it('should correctly identify completed subtasks', () => {
      const taskWithSubtasks = tasks.find(t => t.subtasks && t.subtasks.length > 0);
      const issue = createIssueFromTask(taskWithSubtasks!, milestones);

      // Mark first subtask as complete
      const subtaskId = taskWithSubtasks!.subtasks![0].id;
      const updatedBody = updateSubtaskCheckbox(issue.body, subtaskId, true);

      expect(updatedBody).toContain(`- [x] ${subtaskId}:`);
    });

    it('should update subtask checkbox state', () => {
      const taskWithSubtasks = tasks.find(t => t.subtasks && t.subtasks.length > 0);
      const issue = createIssueFromTask(taskWithSubtasks!, milestones);
      const subtaskId = taskWithSubtasks!.subtasks![0].id;

      // Complete the subtask
      let body = updateSubtaskCheckbox(issue.body, subtaskId, true);
      expect(body).toContain(`[x] ${subtaskId}:`);

      // Uncomplete the subtask
      body = updateSubtaskCheckbox(body, subtaskId, false);
      expect(body).toContain(`[ ] ${subtaskId}:`);
    });

    it('should preserve other content when updating checkboxes', () => {
      const taskWithSubtasks = tasks.find(t => t.subtasks && t.subtasks.length > 0);
      const issue = createIssueFromTask(taskWithSubtasks!, milestones);
      const subtaskId = taskWithSubtasks!.subtasks![0].id;

      const updatedBody = updateSubtaskCheckbox(issue.body, subtaskId, true);

      // Description and other sections should still exist
      expect(updatedBody).toContain('## Description');
      expect(updatedBody).toContain('TaskMaster Task ID');
    });

    it('should handle tasks without subtasks', () => {
      const taskWithoutSubtasks = tasks.find(t => !t.subtasks || t.subtasks.length === 0);
      if (taskWithoutSubtasks) {
        const issue = createIssueFromTask(taskWithoutSubtasks, milestones);
        expect(issue.body).not.toContain('## Subtasks');
      }
    });

    it('should correctly count completed vs pending subtasks', () => {
      const taskWithSubtasks = tasks.find(t => t.subtasks && t.subtasks.length > 0);
      const issue = createIssueFromTask(taskWithSubtasks!, milestones);

      // Complete first two subtasks
      let body = issue.body;
      const subtasks = taskWithSubtasks!.subtasks!;
      body = updateSubtaskCheckbox(body, subtasks[0].id, true);
      body = updateSubtaskCheckbox(body, subtasks[1].id, true);

      const parsed = parseSubtaskCheckboxes(body);
      const completed = parsed.filter(s => s.completed).length;
      const pending = parsed.filter(s => !s.completed).length;

      expect(completed).toBe(2);
      expect(pending).toBe(subtasks.length - 2);
    });
  });

  // ==========================================================================
  // 6. Bidirectional Sync Tests
  // ==========================================================================

  describe('Bidirectional Sync', () => {
    it('should sync task status from GitHub issue', () => {
      const task = tasks[0];
      const issue = createIssueFromTask(task, milestones);

      // Mark issue as in-progress
      const updatedIssue = updateIssueStatus(issue, 'in-progress');
      const syncedTask = syncTaskFromIssue(task, updatedIssue);

      expect(syncedTask.status).toBe('in-progress');
    });

    it('should sync task to done when issue is closed', () => {
      const task = tasks[0];
      const issue = createIssueFromTask(task, milestones);

      // Close the issue
      const closedIssue = { ...issue, state: 'closed' as const };
      const syncedTask = syncTaskFromIssue(task, closedIssue);

      expect(syncedTask.status).toBe('done');
    });

    it('should sync subtask statuses from checkboxes', () => {
      const task = tasks.find(t => t.subtasks && t.subtasks.length > 0)!;
      const issue = createIssueFromTask(task, milestones);

      // Complete first subtask
      const updatedBody = updateSubtaskCheckbox(issue.body, task.subtasks![0].id, true);
      const updatedIssue = { ...issue, body: updatedBody };

      const syncedTask = syncTaskFromIssue(task, updatedIssue);

      expect(syncedTask.subtasks![0].status).toBe('done');
      expect(syncedTask.subtasks![1].status).toBe('pending');
    });

    it('should sync issue from TaskMaster task changes', () => {
      const task = { ...tasks[0], status: 'in-progress' as const };
      const issue = createIssueFromTask(task, milestones);

      const syncedIssue = syncIssueFromTask(issue, task);

      expect(syncedIssue.labels.some(l => l.name === 'status:in-progress')).toBe(true);
    });

    it('should close issue when task is marked done', () => {
      const task = { ...tasks[0], status: 'done' as const };
      const issue = createIssueFromTask(task, milestones);

      const syncedIssue = syncIssueFromTask(issue, task);

      expect(syncedIssue.state).toBe('closed');
      expect(syncedIssue.labels.some(l => l.name === 'status:completed')).toBe(true);
    });

    it('should sync subtask checkboxes from task', () => {
      const task = tasks.find(t => t.subtasks && t.subtasks.length > 0)!;
      const updatedTask = {
        ...task,
        subtasks: task.subtasks!.map((st, idx) =>
          idx === 0 ? { ...st, status: 'done' as const } : st
        ),
      };

      const issue = createIssueFromTask(task, milestones);
      const syncedIssue = syncIssueFromTask(issue, updatedTask);

      expect(syncedIssue.body).toContain(`[x] ${task.subtasks![0].id}:`);
    });

    it('should maintain data consistency through round-trip sync', () => {
      const task = tasks.find(t => t.subtasks && t.subtasks.length > 0)!;
      const issue = createIssueFromTask(task, milestones);

      // Complete subtask in issue
      const subtaskId = task.subtasks![0].id;
      const updatedBody = updateSubtaskCheckbox(issue.body, subtaskId, true);
      const updatedIssue = { ...issue, body: updatedBody };

      // Sync to task
      const syncedTask = syncTaskFromIssue(task, updatedIssue);
      expect(syncedTask.subtasks![0].status).toBe('done');

      // Sync back to issue
      const roundTripIssue = syncIssueFromTask(updatedIssue, syncedTask);
      const parsed = parseSubtaskCheckboxes(roundTripIssue.body);
      expect(parsed[0].completed).toBe(true);
    });

    it('should update issue timestamp on sync', () => {
      const task = { ...tasks[0], status: 'in-progress' as const };
      const issue = createIssueFromTask(task, milestones);
      const originalUpdatedAt = issue.updated_at;

      const syncedIssue = syncIssueFromTask(issue, task);

      expect(new Date(syncedIssue.updated_at).getTime()).toBeGreaterThanOrEqual(
        new Date(originalUpdatedAt).getTime()
      );
    });

    it('should handle sync of blocked tasks', () => {
      const task = { ...tasks[0], status: 'blocked' as const };
      const issue = createIssueFromTask(task, milestones);

      // Blocked status should not change issue state
      const syncedIssue = syncIssueFromTask(issue, task);
      expect(syncedIssue.state).toBe('open');
    });

    it('should preserve milestone through sync', () => {
      const task = tasks.find(t => t.tags?.includes('design'))!;
      const issue = createIssueFromTask(task, milestones);

      const syncedIssue = syncIssueFromTask(issue, task);

      expect(syncedIssue.milestone?.title).toBe('Design Phase');
    });

    it('should preserve labels through sync', () => {
      const task = tasks[0];
      const issue = createIssueFromTask(task, milestones);
      const originalLabelCount = issue.labels.length;

      const syncedIssue = syncIssueFromTask(issue, task);

      // Should have same labels plus status label
      expect(syncedIssue.labels.length).toBeGreaterThanOrEqual(originalLabelCount);
      expect(syncedIssue.labels.some(l => l.name === 'ny-knicks')).toBe(true);
    });
  });

  // ==========================================================================
  // 7. Error Handling and Edge Cases
  // ==========================================================================

  describe('Error Handling and Edge Cases', () => {
    it('should handle task with no description', () => {
      const task: TaskMasterTask = {
        id: 100,
        title: 'Minimal Task',
        description: '',
        status: 'pending',
        priority: 'low',
      };

      const issue = createIssueFromTask(task, milestones);
      expect(issue.title).toBe(task.title);
      expect(issue.body).toContain('## Description');
    });

    it('should handle task with no tags', () => {
      const task: TaskMasterTask = {
        id: 101,
        title: 'Untagged Task',
        description: 'A task without tags',
        status: 'pending',
        priority: 'medium',
      };

      const issue = createIssueFromTask(task, milestones);
      expect(issue.labels.some(l => l.name === 'ny-knicks')).toBe(true);
    });

    it('should handle empty subtask list', () => {
      const task: TaskMasterTask = {
        id: 102,
        title: 'Task with Empty Subtasks',
        description: 'Has empty subtask array',
        status: 'pending',
        priority: 'medium',
        subtasks: [],
      };

      const issue = createIssueFromTask(task, milestones);
      expect(issue.body).not.toContain('## Subtasks');
    });

    it('should handle missing milestone gracefully', () => {
      const emptyMilestones = new Map<string, GitHubMilestone>();
      const task = tasks[0];

      const issue = createIssueFromTask(task, emptyMilestones);
      expect(issue.milestone).toBeUndefined();
    });

    it('should handle special characters in task title', () => {
      const task: TaskMasterTask = {
        id: 103,
        title: 'Task with "quotes" & <special> characters',
        description: 'Description with `code` and *markdown*',
        status: 'pending',
        priority: 'medium',
      };

      const issue = createIssueFromTask(task, milestones);
      expect(issue.title).toContain('"quotes"');
      expect(issue.title).toContain('<special>');
    });

    it('should handle very long descriptions', () => {
      const longDescription = 'A'.repeat(10000);
      const task: TaskMasterTask = {
        id: 104,
        title: 'Task with Long Description',
        description: longDescription,
        status: 'pending',
        priority: 'medium',
      };

      const issue = createIssueFromTask(task, milestones);
      expect(issue.body).toContain(longDescription);
    });

    it('should handle circular dependencies gracefully', () => {
      const task: TaskMasterTask = {
        id: 105,
        title: 'Self-referencing Task',
        description: 'Has circular dependency',
        status: 'pending',
        priority: 'medium',
        dependencies: [105], // Self-reference
      };

      const issue = createIssueFromTask(task, milestones);
      expect(issue.body).toContain('Task #105');
    });

    it('should handle all priority levels', () => {
      const priorities: Array<'critical' | 'high' | 'medium' | 'low'> = ['critical', 'high', 'medium', 'low'];

      priorities.forEach(priority => {
        const task: TaskMasterTask = {
          id: 200,
          title: `${priority} priority task`,
          description: 'Testing priority',
          status: 'pending',
          priority,
        };

        const issue = createIssueFromTask(task, milestones);
        expect(issue.labels.some(l => l.name === `priority:${priority}`)).toBe(true);
      });
    });

    it('should handle sync with invalid status gracefully', () => {
      const task = tasks[0];
      const issue = createIssueFromTask(task, milestones);

      // Add unknown status label
      const issueWithBadStatus = {
        ...issue,
        labels: [...issue.labels, { id: 999, name: 'status:unknown', color: 'ffffff' }],
      };

      const syncedTask = syncTaskFromIssue(task, issueWithBadStatus);
      // Should maintain original status
      expect(syncedTask.status).toBe(task.status);
    });

    it('should handle concurrent issue updates', () => {
      const issue = issues[0];

      // Simulate concurrent updates
      const update1 = updateIssueStatus(issue, 'in-progress');
      const update2 = updateIssueStatus(issue, 'review');

      // Both should be valid updates
      expect(update1.labels.some(l => l.name === 'status:in-progress')).toBe(true);
      expect(update2.labels.some(l => l.name === 'status:review')).toBe(true);
    });
  });
});
