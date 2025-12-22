/**
 * End-to-End Integration Test: Full Project Lifecycle
 *
 * Comprehensive test simulating the complete A.E.S - Bizzy workflow:
 * - Initialization wizard (7 steps)
 * - Project creation with GitHub, TaskMaster, Beads integration
 * - PRD parsing and task generation
 * - GitHub issues and milestones
 * - Multi-agent orchestration
 * - Agent handoff protocols
 * - Component delivery and QA
 * - Project completion verification
 *
 * Scenario: NY Knicks Website Redesign Project
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface InitWizardStep {
  id: number;
  name: string;
  description: string;
  required: boolean;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  validator?: (input: unknown) => boolean;
  result?: unknown;
}

interface InitWizardState {
  currentStep: number;
  steps: InitWizardStep[];
  projectConfig: ProjectConfig | null;
  startedAt: string;
  completedAt?: string;
}

interface ProjectConfig {
  name: string;
  description: string;
  path: string;
  github: {
    enabled: boolean;
    repo?: string;
    owner?: string;
    createIssues: boolean;
    createMilestones: boolean;
  };
  taskmaster: {
    enabled: boolean;
    prdPath?: string;
    autoExpand: boolean;
  };
  beads: {
    enabled: boolean;
    contextPreservation: boolean;
  };
  agents: string[];
  teamLead: string;
}

interface PRDDocument {
  id: string;
  title: string;
  version: string;
  createdAt: string;
  sections: PRDSection[];
  requirements: Requirement[];
}

interface PRDSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

interface Requirement {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  type: 'functional' | 'non-functional' | 'technical';
  acceptance: string[];
}

interface GeneratedTask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedAgent?: string;
  dependencies: string[];
  subtasks: GeneratedSubtask[];
  estimatedComplexity: number;
  requirementIds: string[];
}

interface GeneratedSubtask {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'done';
  parentId: string;
}

interface GitHubMilestone {
  id: string;
  title: string;
  description: string;
  dueDate?: string;
  state: 'open' | 'closed';
  issueCount: number;
  completedIssueCount: number;
}

interface GitHubIssue {
  id: string;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: string[];
  assignee?: string;
  milestone?: string;
  taskId?: string;
  createdAt: string;
  closedAt?: string;
}

interface AgentInstance {
  id: string;
  type: string;
  status: 'idle' | 'working' | 'waiting' | 'completed' | 'failed';
  currentTask?: string;
  completedTasks: string[];
  startedAt: string;
  lastActivityAt: string;
}

interface WorkflowOrchestration {
  id: string;
  projectId: string;
  status: 'initializing' | 'running' | 'paused' | 'completed' | 'failed';
  agents: Map<string, AgentInstance>;
  taskQueue: string[];
  completedTasks: string[];
  handoffs: HandoffRecord[];
  startedAt: string;
  completedAt?: string;
}

interface HandoffRecord {
  id: string;
  fromAgent: string;
  toAgent: string;
  taskId: string;
  contextId: string;
  timestamp: string;
  status: 'pending' | 'accepted' | 'completed' | 'failed';
  contextPreserved: boolean;
}

interface DeliveryReport {
  id: string;
  projectId: string;
  component: string;
  deliveredBy: string;
  deliveredAt: string;
  artifacts: string[];
  quality: QualityMetrics;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: string;
}

interface QualityMetrics {
  testsPassed: number;
  testsFailed: number;
  coverage: number;
  lintErrors: number;
  a11yScore: number;
  performanceScore: number;
}

interface ProjectCompletion {
  projectId: string;
  status: 'completed' | 'partial' | 'failed';
  completedAt: string;
  summary: {
    totalTasks: number;
    completedTasks: number;
    totalIssues: number;
    closedIssues: number;
    totalHandoffs: number;
    successfulHandoffs: number;
    deliverables: string[];
    qualityScore: number;
  };
  timeline: TimelineEntry[];
}

interface TimelineEntry {
  timestamp: string;
  event: string;
  agent?: string;
  details?: string;
}

// =============================================================================
// MOCK IMPLEMENTATIONS
// =============================================================================

/**
 * Create initial wizard state
 */
function createWizardState(): InitWizardState {
  return {
    currentStep: 0,
    steps: [
      {
        id: 1,
        name: 'welcome',
        description: 'Welcome to A.E.S - Bizzy Setup',
        required: true,
        status: 'pending',
      },
      {
        id: 2,
        name: 'project-info',
        description: 'Enter project information',
        required: true,
        status: 'pending',
        validator: (input: unknown) => {
          const data = input as { name?: string; path?: string };
          return Boolean(data?.name && data?.path);
        },
      },
      {
        id: 3,
        name: 'github-setup',
        description: 'Configure GitHub integration',
        required: false,
        status: 'pending',
      },
      {
        id: 4,
        name: 'taskmaster-setup',
        description: 'Configure TaskMaster AI',
        required: false,
        status: 'pending',
      },
      {
        id: 5,
        name: 'beads-setup',
        description: 'Configure Beads context management',
        required: false,
        status: 'pending',
      },
      {
        id: 6,
        name: 'agent-selection',
        description: 'Select AI agents for your team',
        required: true,
        status: 'pending',
        validator: (input: unknown) => {
          const agents = input as string[];
          return Array.isArray(agents) && agents.length > 0;
        },
      },
      {
        id: 7,
        name: 'confirmation',
        description: 'Review and confirm setup',
        required: true,
        status: 'pending',
      },
    ],
    projectConfig: null,
    startedAt: new Date().toISOString(),
  };
}

/**
 * Process wizard step
 */
function processWizardStep(
  state: InitWizardState,
  stepId: number,
  input?: unknown
): { success: boolean; state: InitWizardState; error?: string } {
  const step = state.steps.find(s => s.id === stepId);
  if (!step) {
    return { success: false, state, error: `Step ${stepId} not found` };
  }

  if (stepId !== state.currentStep + 1 && step.status === 'pending') {
    return { success: false, state, error: `Must complete step ${state.currentStep + 1} first` };
  }

  step.status = 'in_progress';

  // Validate input if validator exists
  if (step.validator && !step.validator(input)) {
    step.status = 'failed';
    return { success: false, state, error: `Validation failed for step ${step.name}` };
  }

  step.result = input;
  step.status = 'completed';
  state.currentStep = stepId;

  return { success: true, state };
}

/**
 * Skip optional wizard step
 */
function skipWizardStep(
  state: InitWizardState,
  stepId: number
): { success: boolean; state: InitWizardState; error?: string } {
  const step = state.steps.find(s => s.id === stepId);
  if (!step) {
    return { success: false, state, error: `Step ${stepId} not found` };
  }

  if (step.required) {
    return { success: false, state, error: `Step ${step.name} is required and cannot be skipped` };
  }

  step.status = 'skipped';
  state.currentStep = stepId;

  return { success: true, state };
}

/**
 * Complete wizard and generate project config
 */
function completeWizard(state: InitWizardState): { success: boolean; config: ProjectConfig | null; error?: string } {
  const incompleteRequired = state.steps.filter(
    s => s.required && s.status !== 'completed'
  );

  if (incompleteRequired.length > 0) {
    return {
      success: false,
      config: null,
      error: `Required steps not completed: ${incompleteRequired.map(s => s.name).join(', ')}`,
    };
  }

  const projectInfo = state.steps.find(s => s.name === 'project-info')?.result as { name: string; description: string; path: string } | undefined;
  const githubSetup = state.steps.find(s => s.name === 'github-setup')?.result as { enabled: boolean; repo?: string; owner?: string } | undefined;
  const taskmasterSetup = state.steps.find(s => s.name === 'taskmaster-setup')?.result as { enabled: boolean; prdPath?: string } | undefined;
  const beadsSetup = state.steps.find(s => s.name === 'beads-setup')?.result as { enabled: boolean } | undefined;
  const agentSelection = state.steps.find(s => s.name === 'agent-selection')?.result as string[] | undefined;

  if (!projectInfo || !agentSelection) {
    return { success: false, config: null, error: 'Missing required configuration data' };
  }

  const config: ProjectConfig = {
    name: projectInfo.name,
    description: projectInfo.description || '',
    path: projectInfo.path,
    github: {
      enabled: githubSetup?.enabled ?? false,
      repo: githubSetup?.repo,
      owner: githubSetup?.owner,
      createIssues: githubSetup?.enabled ?? false,
      createMilestones: githubSetup?.enabled ?? false,
    },
    taskmaster: {
      enabled: taskmasterSetup?.enabled ?? false,
      prdPath: taskmasterSetup?.prdPath,
      autoExpand: true,
    },
    beads: {
      enabled: beadsSetup?.enabled ?? true,
      contextPreservation: true,
    },
    agents: agentSelection,
    teamLead: 'pm-lead',
  };

  state.projectConfig = config;
  state.completedAt = new Date().toISOString();

  return { success: true, config };
}

/**
 * Parse PRD document and extract requirements
 */
function parsePRD(content: string, metadata: { title: string; version: string }): PRDDocument {
  const sections: PRDSection[] = [];
  const requirements: Requirement[] = [];

  // Parse sections (simplified)
  const sectionMatches = content.match(/##\s+(.+)/g) || [];
  sectionMatches.forEach((match, index) => {
    sections.push({
      id: `section-${index + 1}`,
      title: match.replace('## ', ''),
      content: '', // Would extract content in real implementation
      order: index + 1,
    });
  });

  // Parse requirements (simplified)
  const reqMatches = content.match(/REQ-\d+:\s+(.+)/g) || [];
  reqMatches.forEach((match, index) => {
    const title = match.replace(/REQ-\d+:\s+/, '');
    const titleLower = title.toLowerCase();

    // Determine priority based on content keywords
    let priority: 'low' | 'medium' | 'high' | 'critical';
    if (titleLower.includes('critical') || titleLower.includes('essential')) {
      priority = 'critical';
    } else if (titleLower.includes('high') || index === 0) {
      priority = 'high';
    } else if (titleLower.includes('low') || titleLower.includes('simple')) {
      priority = 'low';
    } else {
      priority = 'medium';
    }

    requirements.push({
      id: `REQ-${String(index + 1).padStart(3, '0')}`,
      title,
      description: title,
      priority,
      type: 'functional',
      acceptance: [`Verify ${title.toLowerCase()}`],
    });
  });

  return {
    id: `prd-${Date.now()}`,
    title: metadata.title,
    version: metadata.version,
    createdAt: new Date().toISOString(),
    sections,
    requirements,
  };
}

/**
 * Generate tasks from PRD requirements
 */
function generateTasksFromPRD(prd: PRDDocument, config: ProjectConfig): GeneratedTask[] {
  const tasks: GeneratedTask[] = [];
  const agentPool = config.agents;

  prd.requirements.forEach((req, index) => {
    const taskId = String(index + 1);
    const task: GeneratedTask = {
      id: taskId,
      title: `Implement: ${req.title}`,
      description: req.description,
      status: 'pending',
      priority: req.priority,
      dependencies: index > 0 ? [String(index)] : [],
      subtasks: [],
      estimatedComplexity: req.priority === 'critical' ? 10 : req.priority === 'high' ? 7 : req.priority === 'medium' ? 5 : 3,
      requirementIds: [req.id],
    };

    // Generate subtasks based on complexity
    const subtaskCount = Math.ceil(task.estimatedComplexity / 2);
    for (let i = 1; i <= subtaskCount; i++) {
      task.subtasks.push({
        id: `${taskId}.${i}`,
        title: `Subtask ${i} for ${req.title}`,
        status: 'pending',
        parentId: taskId,
      });
    }

    // Assign agent based on task type (check specific terms first, then general)
    const titleLower = req.title.toLowerCase();
    if (titleLower.includes('api') || titleLower.includes('backend') || titleLower.includes('server')) {
      task.assignedAgent = agentPool.includes('backend-dev') ? 'backend-dev' : undefined;
    } else if (titleLower.includes('test') || titleLower.includes('accessibility') || titleLower.includes('wcag')) {
      task.assignedAgent = agentPool.includes('test-engineer') ? 'test-engineer' : undefined;
    } else if (titleLower.includes('design') || titleLower.includes('mockup') || titleLower.includes('wireframe')) {
      task.assignedAgent = agentPool.includes('ux-designer') ? 'ux-designer' : 'frontend-dev';
    } else if (titleLower.includes('ui') || titleLower.includes('component') || titleLower.includes('page')) {
      task.assignedAgent = agentPool.includes('frontend-dev') ? 'frontend-dev' : undefined;
    } else {
      task.assignedAgent = agentPool.includes('frontend-dev') ? 'frontend-dev' : undefined;
    }

    tasks.push(task);
  });

  return tasks;
}

/**
 * Create GitHub milestones from tasks
 */
function createMilestones(tasks: GeneratedTask[], projectName: string): GitHubMilestone[] {
  const milestones: GitHubMilestone[] = [];

  // Group tasks by priority for milestones
  const criticalTasks = tasks.filter(t => t.priority === 'critical');
  const highTasks = tasks.filter(t => t.priority === 'high');
  const mediumTasks = tasks.filter(t => t.priority === 'medium');
  const lowTasks = tasks.filter(t => t.priority === 'low');

  if (criticalTasks.length > 0) {
    milestones.push({
      id: 'milestone-1',
      title: `${projectName} - Phase 1: Critical Features`,
      description: 'Critical priority features and requirements',
      state: 'open',
      issueCount: criticalTasks.length,
      completedIssueCount: 0,
    });
  }

  if (highTasks.length > 0) {
    milestones.push({
      id: 'milestone-2',
      title: `${projectName} - Phase 2: High Priority`,
      description: 'High priority features',
      state: 'open',
      issueCount: highTasks.length,
      completedIssueCount: 0,
    });
  }

  if (mediumTasks.length > 0 || lowTasks.length > 0) {
    milestones.push({
      id: 'milestone-3',
      title: `${projectName} - Phase 3: Enhancements`,
      description: 'Medium and low priority enhancements',
      state: 'open',
      issueCount: mediumTasks.length + lowTasks.length,
      completedIssueCount: 0,
    });
  }

  return milestones;
}

/**
 * Create GitHub issues from tasks
 */
function createIssuesFromTasks(tasks: GeneratedTask[], milestones: GitHubMilestone[]): GitHubIssue[] {
  const issues: GitHubIssue[] = [];
  let issueNumber = 1;

  tasks.forEach(task => {
    // Determine milestone based on priority
    let milestone: string | undefined;
    if (task.priority === 'critical') {
      milestone = milestones.find(m => m.title.includes('Phase 1'))?.id;
    } else if (task.priority === 'high') {
      milestone = milestones.find(m => m.title.includes('Phase 2'))?.id;
    } else {
      milestone = milestones.find(m => m.title.includes('Phase 3'))?.id;
    }

    issues.push({
      id: `issue-${issueNumber}`,
      number: issueNumber,
      title: task.title,
      body: `## Description\n${task.description}\n\n## Task ID\n${task.id}\n\n## Subtasks\n${task.subtasks.map(s => `- [ ] ${s.title}`).join('\n')}`,
      state: 'open',
      labels: [task.priority, task.assignedAgent || 'unassigned'],
      assignee: task.assignedAgent,
      milestone,
      taskId: task.id,
      createdAt: new Date().toISOString(),
    });

    issueNumber++;
  });

  return issues;
}

/**
 * Initialize workflow orchestration
 */
function initializeOrchestration(projectId: string, config: ProjectConfig): WorkflowOrchestration {
  const agents = new Map<string, AgentInstance>();

  // Create agent instances
  config.agents.forEach(agentType => {
    agents.set(agentType, {
      id: `${agentType}-${Date.now()}`,
      type: agentType,
      status: 'idle',
      completedTasks: [],
      startedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
    });
  });

  // Always include PM-Lead
  if (!agents.has('pm-lead')) {
    agents.set('pm-lead', {
      id: `pm-lead-${Date.now()}`,
      type: 'pm-lead',
      status: 'idle',
      completedTasks: [],
      startedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
    });
  }

  return {
    id: `orch-${Date.now()}`,
    projectId,
    status: 'initializing',
    agents,
    taskQueue: [],
    completedTasks: [],
    handoffs: [],
    startedAt: new Date().toISOString(),
  };
}

/**
 * Queue tasks for orchestration
 */
function queueTasks(orchestration: WorkflowOrchestration, tasks: GeneratedTask[]): WorkflowOrchestration {
  // Sort tasks by dependencies and priority
  const sortedTasks = [...tasks].sort((a, b) => {
    // Tasks with no dependencies come first
    if (a.dependencies.length === 0 && b.dependencies.length > 0) return -1;
    if (b.dependencies.length === 0 && a.dependencies.length > 0) return 1;

    // Then by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  orchestration.taskQueue = sortedTasks.map(t => t.id);
  orchestration.status = 'running';

  return orchestration;
}

/**
 * Assign task to agent
 */
function assignTaskToAgent(
  orchestration: WorkflowOrchestration,
  taskId: string,
  agentType: string
): { success: boolean; orchestration: WorkflowOrchestration; error?: string } {
  const agent = orchestration.agents.get(agentType);
  if (!agent) {
    return { success: false, orchestration, error: `Agent ${agentType} not found` };
  }

  if (agent.status === 'working') {
    return { success: false, orchestration, error: `Agent ${agentType} is busy` };
  }

  agent.status = 'working';
  agent.currentTask = taskId;
  agent.lastActivityAt = new Date().toISOString();

  // Remove from queue
  orchestration.taskQueue = orchestration.taskQueue.filter(id => id !== taskId);

  return { success: true, orchestration };
}

/**
 * Complete task and record handoff if needed
 */
function completeAgentTask(
  orchestration: WorkflowOrchestration,
  agentType: string,
  taskId: string,
  nextAgent?: string
): { success: boolean; orchestration: WorkflowOrchestration; handoff?: HandoffRecord } {
  const agent = orchestration.agents.get(agentType);
  if (!agent || agent.currentTask !== taskId) {
    return { success: false, orchestration };
  }

  agent.status = 'completed';
  agent.currentTask = undefined;
  agent.completedTasks.push(taskId);
  agent.lastActivityAt = new Date().toISOString();

  orchestration.completedTasks.push(taskId);

  // Create handoff if next agent specified
  let handoff: HandoffRecord | undefined;
  if (nextAgent && orchestration.agents.has(nextAgent)) {
    handoff = {
      id: `handoff-${Date.now()}`,
      fromAgent: agentType,
      toAgent: nextAgent,
      taskId,
      contextId: `ctx-${taskId}`,
      timestamp: new Date().toISOString(),
      status: 'pending',
      contextPreserved: true,
    };
    orchestration.handoffs.push(handoff);
  }

  // Set agent back to idle
  agent.status = 'idle';

  return { success: true, orchestration, handoff };
}

/**
 * Accept handoff
 */
function acceptHandoff(
  orchestration: WorkflowOrchestration,
  handoffId: string
): { success: boolean; orchestration: WorkflowOrchestration } {
  const handoff = orchestration.handoffs.find(h => h.id === handoffId);
  if (!handoff) {
    return { success: false, orchestration };
  }

  handoff.status = 'accepted';

  return { success: true, orchestration };
}

/**
 * Complete handoff
 */
function completeHandoff(
  orchestration: WorkflowOrchestration,
  handoffId: string
): { success: boolean; orchestration: WorkflowOrchestration } {
  const handoff = orchestration.handoffs.find(h => h.id === handoffId);
  if (!handoff) {
    return { success: false, orchestration };
  }

  handoff.status = 'completed';

  return { success: true, orchestration };
}

/**
 * Create delivery report
 */
function createDeliveryReport(
  projectId: string,
  component: string,
  deliveredBy: string,
  artifacts: string[],
  quality: QualityMetrics
): DeliveryReport {
  return {
    id: `delivery-${Date.now()}`,
    projectId,
    component,
    deliveredBy,
    deliveredAt: new Date().toISOString(),
    artifacts,
    quality,
    approved: false,
  };
}

/**
 * Approve delivery
 */
function approveDelivery(report: DeliveryReport, approver: string): DeliveryReport {
  return {
    ...report,
    approved: true,
    approvedBy: approver,
    approvedAt: new Date().toISOString(),
  };
}

/**
 * Complete project and generate summary
 */
function completeProject(
  projectId: string,
  orchestration: WorkflowOrchestration,
  tasks: GeneratedTask[],
  issues: GitHubIssue[],
  deliveries: DeliveryReport[]
): ProjectCompletion {
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const closedIssues = issues.filter(i => i.state === 'closed').length;
  const successfulHandoffs = orchestration.handoffs.filter(h => h.status === 'completed').length;

  const qualityScores = deliveries.map(d => {
    const totalTests = d.quality.testsPassed + d.quality.testsFailed;
    const passRate = totalTests > 0 ? (d.quality.testsPassed / totalTests) * 100 : 100;
    const score = (passRate + d.quality.coverage + d.quality.a11yScore + d.quality.performanceScore) / 4;
    return score;
  });

  const avgQualityScore = qualityScores.length > 0
    ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
    : 0;

  const timeline: TimelineEntry[] = [
    { timestamp: orchestration.startedAt, event: 'Project started' },
  ];

  orchestration.handoffs.forEach(h => {
    timeline.push({
      timestamp: h.timestamp,
      event: `Handoff from ${h.fromAgent} to ${h.toAgent}`,
      agent: h.fromAgent,
      details: `Task: ${h.taskId}`,
    });
  });

  deliveries.forEach(d => {
    timeline.push({
      timestamp: d.deliveredAt,
      event: `${d.component} delivered`,
      agent: d.deliveredBy,
    });
    if (d.approvedAt) {
      timeline.push({
        timestamp: d.approvedAt,
        event: `${d.component} approved`,
        agent: d.approvedBy,
      });
    }
  });

  timeline.push({
    timestamp: new Date().toISOString(),
    event: 'Project completed',
  });

  return {
    projectId,
    status: completedTasks === tasks.length ? 'completed' : 'partial',
    completedAt: new Date().toISOString(),
    summary: {
      totalTasks: tasks.length,
      completedTasks,
      totalIssues: issues.length,
      closedIssues,
      totalHandoffs: orchestration.handoffs.length,
      successfulHandoffs,
      deliverables: deliveries.map(d => d.component),
      qualityScore: avgQualityScore,
    },
    timeline: timeline.sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
  };
}

// =============================================================================
// TEST SUITES
// =============================================================================

describe('End-to-End Integration: Full Project Lifecycle', () => {
  // Shared state for the lifecycle tests
  let wizardState: InitWizardState;
  let projectConfig: ProjectConfig;
  let prdDocument: PRDDocument;
  let generatedTasks: GeneratedTask[];
  let milestones: GitHubMilestone[];
  let issues: GitHubIssue[];
  let orchestration: WorkflowOrchestration;
  let deliveries: DeliveryReport[];

  beforeAll(() => {
    deliveries = [];
  });

  // =========================================================================
  // PHASE 1: INITIALIZATION WIZARD
  // =========================================================================

  describe('Phase 1: Initialization Wizard', () => {
    beforeEach(() => {
      wizardState = createWizardState();
    });

    it('should create initial wizard state with 7 steps', () => {
      expect(wizardState.steps.length).toBe(7);
      expect(wizardState.currentStep).toBe(0);
      expect(wizardState.projectConfig).toBeNull();
    });

    it('should have correct step order', () => {
      const stepNames = wizardState.steps.map(s => s.name);
      expect(stepNames).toEqual([
        'welcome',
        'project-info',
        'github-setup',
        'taskmaster-setup',
        'beads-setup',
        'agent-selection',
        'confirmation',
      ]);
    });

    it('should mark required steps correctly', () => {
      const requiredSteps = wizardState.steps.filter(s => s.required);
      expect(requiredSteps.map(s => s.name)).toEqual([
        'welcome',
        'project-info',
        'agent-selection',
        'confirmation',
      ]);
    });

    it('should process welcome step successfully', () => {
      const result = processWizardStep(wizardState, 1);
      expect(result.success).toBe(true);
      expect(result.state.currentStep).toBe(1);
      expect(result.state.steps[0].status).toBe('completed');
    });

    it('should enforce step order', () => {
      const result = processWizardStep(wizardState, 3);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Must complete step');
    });

    it('should validate project-info input', () => {
      // Complete welcome first
      wizardState = processWizardStep(wizardState, 1).state;

      // Try with invalid input
      const invalidResult = processWizardStep(wizardState, 2, { name: '' });
      expect(invalidResult.success).toBe(false);

      // Try with valid input
      const validResult = processWizardStep(wizardState, 2, {
        name: 'NY Knicks Website',
        description: 'Official team website redesign',
        path: '/projects/ny-knicks',
      });
      expect(validResult.success).toBe(true);
    });

    it('should allow skipping optional steps', () => {
      wizardState = processWizardStep(wizardState, 1).state;
      wizardState = processWizardStep(wizardState, 2, {
        name: 'NY Knicks Website',
        path: '/projects/ny-knicks',
      }).state;

      // Skip github setup
      const skipResult = skipWizardStep(wizardState, 3);
      expect(skipResult.success).toBe(true);
      expect(skipResult.state.steps[2].status).toBe('skipped');
    });

    it('should not allow skipping required steps', () => {
      const result = skipWizardStep(wizardState, 1);
      expect(result.success).toBe(false);
      expect(result.error).toContain('required and cannot be skipped');
    });

    it('should complete full wizard flow for NY Knicks project', () => {
      // Step 1: Welcome
      wizardState = processWizardStep(wizardState, 1).state;

      // Step 2: Project info
      wizardState = processWizardStep(wizardState, 2, {
        name: 'NY Knicks Website',
        description: 'Official team website redesign with modern UX',
        path: '/projects/ny-knicks',
      }).state;

      // Step 3: GitHub setup
      wizardState = processWizardStep(wizardState, 3, {
        enabled: true,
        repo: 'ny-knicks-website',
        owner: 'nba-knicks',
      }).state;

      // Step 4: TaskMaster setup
      wizardState = processWizardStep(wizardState, 4, {
        enabled: true,
        prdPath: '.taskmaster/docs/prd.md',
      }).state;

      // Step 5: Beads setup
      wizardState = processWizardStep(wizardState, 5, {
        enabled: true,
      }).state;

      // Step 6: Agent selection
      wizardState = processWizardStep(wizardState, 6, [
        'pm-lead',
        'ux-designer',
        'frontend-dev',
        'backend-dev',
        'test-engineer',
      ]).state;

      // Step 7: Confirmation
      wizardState = processWizardStep(wizardState, 7).state;

      const completion = completeWizard(wizardState);
      expect(completion.success).toBe(true);
      expect(completion.config).not.toBeNull();

      projectConfig = completion.config!;
      expect(projectConfig.name).toBe('NY Knicks Website');
      expect(projectConfig.github.enabled).toBe(true);
      expect(projectConfig.taskmaster.enabled).toBe(true);
      expect(projectConfig.agents.length).toBe(5);
    });

    it('should fail completion if required steps missing', () => {
      wizardState = processWizardStep(wizardState, 1).state;
      // Skip directly to completion without required steps

      const completion = completeWizard(wizardState);
      expect(completion.success).toBe(false);
      expect(completion.error).toContain('Required steps not completed');
    });
  });

  // =========================================================================
  // PHASE 2: PROJECT INITIALIZATION
  // =========================================================================

  describe('Phase 2: Project Initialization', () => {
    beforeEach(() => {
      // Setup project config from wizard
      projectConfig = {
        name: 'NY Knicks Website',
        description: 'Official team website redesign',
        path: '/projects/ny-knicks',
        github: {
          enabled: true,
          repo: 'ny-knicks-website',
          owner: 'nba-knicks',
          createIssues: true,
          createMilestones: true,
        },
        taskmaster: {
          enabled: true,
          prdPath: '.taskmaster/docs/prd.md',
          autoExpand: true,
        },
        beads: {
          enabled: true,
          contextPreservation: true,
        },
        agents: ['pm-lead', 'ux-designer', 'frontend-dev', 'backend-dev', 'test-engineer'],
        teamLead: 'pm-lead',
      };
    });

    it('should create project config with all integrations enabled', () => {
      expect(projectConfig.github.enabled).toBe(true);
      expect(projectConfig.taskmaster.enabled).toBe(true);
      expect(projectConfig.beads.enabled).toBe(true);
    });

    it('should have correct agent team composition', () => {
      expect(projectConfig.agents).toContain('pm-lead');
      expect(projectConfig.agents).toContain('ux-designer');
      expect(projectConfig.agents).toContain('frontend-dev');
      expect(projectConfig.agents).toContain('backend-dev');
      expect(projectConfig.agents).toContain('test-engineer');
    });

    it('should set PM-Lead as team lead', () => {
      expect(projectConfig.teamLead).toBe('pm-lead');
    });

    it('should configure GitHub for issues and milestones', () => {
      expect(projectConfig.github.createIssues).toBe(true);
      expect(projectConfig.github.createMilestones).toBe(true);
    });

    it('should enable context preservation in Beads', () => {
      expect(projectConfig.beads.contextPreservation).toBe(true);
    });
  });

  // =========================================================================
  // PHASE 3: PRD AND TASK GENERATION
  // =========================================================================

  describe('Phase 3: PRD and Task Generation', () => {
    beforeEach(() => {
      projectConfig = {
        name: 'NY Knicks Website',
        description: 'Official team website redesign',
        path: '/projects/ny-knicks',
        github: { enabled: true, createIssues: true, createMilestones: true },
        taskmaster: { enabled: true, prdPath: '.taskmaster/docs/prd.md', autoExpand: true },
        beads: { enabled: true, contextPreservation: true },
        agents: ['pm-lead', 'ux-designer', 'frontend-dev', 'backend-dev', 'test-engineer'],
        teamLead: 'pm-lead',
      };
    });

    it('should parse PRD document successfully', () => {
      const prdContent = `
# NY Knicks Website Redesign PRD

## Overview
Official team website redesign with modern UX.

## Brand Guidelines
Team colors: #006BB6 (Blue), #F58426 (Orange), #BEC0C2 (Gray)

## Requirements
REQ-1: Design responsive hero section with game schedule
REQ-2: Implement player roster grid with statistics
REQ-3: Create ticket purchasing flow
REQ-4: Build news and updates section
REQ-5: Design fan merchandise store
REQ-6: Implement user accounts and preferences
REQ-7: Create API for real-time game data
REQ-8: Build notification system for game alerts
REQ-9: Test accessibility compliance (WCAG 2.1)
REQ-10: Performance optimization for mobile
      `;

      prdDocument = parsePRD(prdContent, { title: 'NY Knicks Website PRD', version: '1.0.0' });

      expect(prdDocument.title).toBe('NY Knicks Website PRD');
      expect(prdDocument.requirements.length).toBe(10);
    });

    it('should extract requirements with correct priorities', () => {
      const prdContent = `
REQ-1: Critical feature
REQ-2: High priority feature
REQ-3: Medium feature
REQ-4: Low priority feature
      `;

      prdDocument = parsePRD(prdContent, { title: 'Test PRD', version: '1.0.0' });

      expect(prdDocument.requirements[0].priority).toBe('critical');
      expect(prdDocument.requirements[1].priority).toBe('high');
      expect(prdDocument.requirements[2].priority).toBe('medium');
      expect(prdDocument.requirements[3].priority).toBe('low');
    });

    it('should generate tasks from PRD requirements', () => {
      const prdContent = `
REQ-1: Design hero section
REQ-2: Implement player roster
REQ-3: Create ticket flow
REQ-4: Build API endpoints
REQ-5: Test accessibility
      `;

      prdDocument = parsePRD(prdContent, { title: 'Test PRD', version: '1.0.0' });
      generatedTasks = generateTasksFromPRD(prdDocument, projectConfig);

      expect(generatedTasks.length).toBe(5);
      expect(generatedTasks[0].title).toContain('Design hero section');
    });

    it('should assign agents based on task type', () => {
      const prdContent = `
REQ-1: Design the mockups
REQ-2: Build API endpoints
REQ-3: Test the application
      `;

      prdDocument = parsePRD(prdContent, { title: 'Test PRD', version: '1.0.0' });
      generatedTasks = generateTasksFromPRD(prdDocument, projectConfig);

      expect(generatedTasks[0].assignedAgent).toBe('ux-designer');
      expect(generatedTasks[1].assignedAgent).toBe('backend-dev');
      expect(generatedTasks[2].assignedAgent).toBe('test-engineer');
    });

    it('should generate subtasks based on complexity', () => {
      const prdContent = `
REQ-1: Critical essential feature
REQ-2: Simple low priority feature
      `;

      prdDocument = parsePRD(prdContent, { title: 'Test PRD', version: '1.0.0' });
      generatedTasks = generateTasksFromPRD(prdDocument, projectConfig);

      // Critical priority = complexity 10, subtasks = ceil(10/2) = 5
      expect(generatedTasks[0].subtasks.length).toBe(5);
      // Low priority = complexity 3, subtasks = ceil(3/2) = 2
      expect(generatedTasks[1].subtasks.length).toBe(2);
    });

    it('should set dependencies between tasks', () => {
      const prdContent = `
REQ-1: First task
REQ-2: Second task
REQ-3: Third task
      `;

      prdDocument = parsePRD(prdContent, { title: 'Test PRD', version: '1.0.0' });
      generatedTasks = generateTasksFromPRD(prdDocument, projectConfig);

      expect(generatedTasks[0].dependencies).toEqual([]);
      expect(generatedTasks[1].dependencies).toEqual(['1']);
      expect(generatedTasks[2].dependencies).toEqual(['2']);
    });
  });

  // =========================================================================
  // PHASE 4: GITHUB ISSUES INTEGRATION
  // =========================================================================

  describe('Phase 4: GitHub Issues Integration', () => {
    beforeEach(() => {
      const prdContent = `
REQ-1: Critical essential design system
REQ-2: High priority player roster
REQ-3: Medium ticket purchasing
REQ-4: Low priority analytics
      `;

      prdDocument = parsePRD(prdContent, { title: 'NY Knicks PRD', version: '1.0.0' });

      projectConfig = {
        name: 'NY Knicks Website',
        description: 'Official team website redesign',
        path: '/projects/ny-knicks',
        github: { enabled: true, createIssues: true, createMilestones: true },
        taskmaster: { enabled: true, autoExpand: true },
        beads: { enabled: true, contextPreservation: true },
        agents: ['pm-lead', 'ux-designer', 'frontend-dev'],
        teamLead: 'pm-lead',
      };

      generatedTasks = generateTasksFromPRD(prdDocument, projectConfig);
    });

    it('should create milestones by priority phase', () => {
      milestones = createMilestones(generatedTasks, projectConfig.name);

      expect(milestones.length).toBe(3);
      expect(milestones[0].title).toContain('Phase 1: Critical');
      expect(milestones[1].title).toContain('Phase 2: High');
      expect(milestones[2].title).toContain('Phase 3: Enhancements');
    });

    it('should track issue counts per milestone', () => {
      milestones = createMilestones(generatedTasks, projectConfig.name);

      const phase1 = milestones.find(m => m.title.includes('Phase 1'));
      const phase2 = milestones.find(m => m.title.includes('Phase 2'));
      const phase3 = milestones.find(m => m.title.includes('Phase 3'));

      // Critical task
      expect(phase1?.issueCount).toBe(1);
      // High priority task
      expect(phase2?.issueCount).toBe(1);
      // Medium and low priority tasks
      expect(phase3?.issueCount).toBe(2);
    });

    it('should create issues from tasks', () => {
      milestones = createMilestones(generatedTasks, projectConfig.name);
      issues = createIssuesFromTasks(generatedTasks, milestones);

      expect(issues.length).toBe(generatedTasks.length);
    });

    it('should assign issues to correct milestones', () => {
      milestones = createMilestones(generatedTasks, projectConfig.name);
      issues = createIssuesFromTasks(generatedTasks, milestones);

      const phase1Milestone = milestones.find(m => m.title.includes('Phase 1'));
      const phase1Issues = issues.filter(i => i.milestone === phase1Milestone?.id);

      expect(phase1Issues.length).toBeGreaterThan(0);
    });

    it('should include task IDs in issues', () => {
      milestones = createMilestones(generatedTasks, projectConfig.name);
      issues = createIssuesFromTasks(generatedTasks, milestones);

      issues.forEach((issue, index) => {
        expect(issue.taskId).toBe(generatedTasks[index].id);
      });
    });

    it('should include subtasks as checklist in issue body', () => {
      milestones = createMilestones(generatedTasks, projectConfig.name);
      issues = createIssuesFromTasks(generatedTasks, milestones);

      const issueWithSubtasks = issues[0];
      expect(issueWithSubtasks.body).toContain('## Subtasks');
      expect(issueWithSubtasks.body).toContain('- [ ]');
    });

    it('should label issues with priority and agent', () => {
      milestones = createMilestones(generatedTasks, projectConfig.name);
      issues = createIssuesFromTasks(generatedTasks, milestones);

      issues.forEach(issue => {
        expect(issue.labels).toContain(generatedTasks.find(t => t.id === issue.taskId)?.priority);
      });
    });
  });

  // =========================================================================
  // PHASE 5: MULTI-AGENT WORKFLOW ORCHESTRATION
  // =========================================================================

  describe('Phase 5: Multi-Agent Workflow Orchestration', () => {
    beforeEach(() => {
      projectConfig = {
        name: 'NY Knicks Website',
        description: 'Official team website redesign',
        path: '/projects/ny-knicks',
        github: { enabled: true, createIssues: true, createMilestones: true },
        taskmaster: { enabled: true, autoExpand: true },
        beads: { enabled: true, contextPreservation: true },
        agents: ['pm-lead', 'ux-designer', 'frontend-dev', 'backend-dev', 'test-engineer'],
        teamLead: 'pm-lead',
      };

      const prdContent = `
REQ-1: Design hero section
REQ-2: Build player API
REQ-3: Test accessibility
      `;
      prdDocument = parsePRD(prdContent, { title: 'Test PRD', version: '1.0.0' });
      generatedTasks = generateTasksFromPRD(prdDocument, projectConfig);
    });

    it('should initialize orchestration with all agents', () => {
      orchestration = initializeOrchestration('project-1', projectConfig);

      expect(orchestration.agents.size).toBe(5);
      expect(orchestration.agents.has('pm-lead')).toBe(true);
      expect(orchestration.agents.has('ux-designer')).toBe(true);
      expect(orchestration.agents.has('frontend-dev')).toBe(true);
      expect(orchestration.agents.has('backend-dev')).toBe(true);
      expect(orchestration.agents.has('test-engineer')).toBe(true);
    });

    it('should start all agents in idle state', () => {
      orchestration = initializeOrchestration('project-1', projectConfig);

      orchestration.agents.forEach(agent => {
        expect(agent.status).toBe('idle');
      });
    });

    it('should queue tasks sorted by dependencies and priority', () => {
      orchestration = initializeOrchestration('project-1', projectConfig);
      orchestration = queueTasks(orchestration, generatedTasks);

      expect(orchestration.taskQueue.length).toBe(generatedTasks.length);
      expect(orchestration.status).toBe('running');
    });

    it('should assign task to available agent', () => {
      orchestration = initializeOrchestration('project-1', projectConfig);
      orchestration = queueTasks(orchestration, generatedTasks);

      const result = assignTaskToAgent(orchestration, '1', 'ux-designer');

      expect(result.success).toBe(true);
      expect(result.orchestration.agents.get('ux-designer')?.status).toBe('working');
      expect(result.orchestration.agents.get('ux-designer')?.currentTask).toBe('1');
    });

    it('should not assign task to busy agent', () => {
      orchestration = initializeOrchestration('project-1', projectConfig);
      orchestration = queueTasks(orchestration, generatedTasks);

      // Assign first task
      orchestration = assignTaskToAgent(orchestration, '1', 'ux-designer').orchestration;

      // Try to assign second task to same agent
      const result = assignTaskToAgent(orchestration, '2', 'ux-designer');

      expect(result.success).toBe(false);
      expect(result.error).toContain('is busy');
    });

    it('should remove assigned task from queue', () => {
      orchestration = initializeOrchestration('project-1', projectConfig);
      orchestration = queueTasks(orchestration, generatedTasks);

      const initialQueueLength = orchestration.taskQueue.length;
      orchestration = assignTaskToAgent(orchestration, '1', 'ux-designer').orchestration;

      expect(orchestration.taskQueue.length).toBe(initialQueueLength - 1);
      expect(orchestration.taskQueue).not.toContain('1');
    });

    it('should support parallel task execution with multiple agents', () => {
      orchestration = initializeOrchestration('project-1', projectConfig);
      orchestration = queueTasks(orchestration, generatedTasks);

      // Assign different tasks to different agents
      orchestration = assignTaskToAgent(orchestration, '1', 'ux-designer').orchestration;
      orchestration = assignTaskToAgent(orchestration, '2', 'backend-dev').orchestration;
      orchestration = assignTaskToAgent(orchestration, '3', 'test-engineer').orchestration;

      expect(orchestration.agents.get('ux-designer')?.status).toBe('working');
      expect(orchestration.agents.get('backend-dev')?.status).toBe('working');
      expect(orchestration.agents.get('test-engineer')?.status).toBe('working');
    });
  });

  // =========================================================================
  // PHASE 6: AGENT HANDOFF PROTOCOLS
  // =========================================================================

  describe('Phase 6: Agent Handoff Protocols', () => {
    beforeEach(() => {
      projectConfig = {
        name: 'NY Knicks Website',
        description: 'Official team website redesign',
        path: '/projects/ny-knicks',
        github: { enabled: true, createIssues: true, createMilestones: true },
        taskmaster: { enabled: true, autoExpand: true },
        beads: { enabled: true, contextPreservation: true },
        agents: ['pm-lead', 'ux-designer', 'frontend-dev', 'test-engineer'],
        teamLead: 'pm-lead',
      };

      orchestration = initializeOrchestration('project-1', projectConfig);
    });

    it('should complete task and create handoff record', () => {
      orchestration = assignTaskToAgent(orchestration, 'task-1', 'ux-designer').orchestration;

      const result = completeAgentTask(orchestration, 'ux-designer', 'task-1', 'frontend-dev');

      expect(result.success).toBe(true);
      expect(result.handoff).toBeDefined();
      expect(result.handoff?.fromAgent).toBe('ux-designer');
      expect(result.handoff?.toAgent).toBe('frontend-dev');
    });

    it('should track handoffs in orchestration', () => {
      orchestration = assignTaskToAgent(orchestration, 'task-1', 'ux-designer').orchestration;
      orchestration = completeAgentTask(orchestration, 'ux-designer', 'task-1', 'frontend-dev').orchestration;

      expect(orchestration.handoffs.length).toBe(1);
      expect(orchestration.handoffs[0].status).toBe('pending');
    });

    it('should accept handoff', () => {
      orchestration = assignTaskToAgent(orchestration, 'task-1', 'ux-designer').orchestration;
      const completion = completeAgentTask(orchestration, 'ux-designer', 'task-1', 'frontend-dev');
      orchestration = completion.orchestration;

      orchestration = acceptHandoff(orchestration, completion.handoff!.id).orchestration;

      expect(orchestration.handoffs[0].status).toBe('accepted');
    });

    it('should complete handoff', () => {
      orchestration = assignTaskToAgent(orchestration, 'task-1', 'ux-designer').orchestration;
      const completion = completeAgentTask(orchestration, 'ux-designer', 'task-1', 'frontend-dev');
      orchestration = completion.orchestration;

      orchestration = acceptHandoff(orchestration, completion.handoff!.id).orchestration;
      orchestration = completeHandoff(orchestration, completion.handoff!.id).orchestration;

      expect(orchestration.handoffs[0].status).toBe('completed');
    });

    it('should preserve context during handoff', () => {
      orchestration = assignTaskToAgent(orchestration, 'task-1', 'ux-designer').orchestration;
      const completion = completeAgentTask(orchestration, 'ux-designer', 'task-1', 'frontend-dev');

      expect(completion.handoff?.contextPreserved).toBe(true);
      expect(completion.handoff?.contextId).toBeDefined();
    });

    it('should track completed tasks by agent', () => {
      orchestration = assignTaskToAgent(orchestration, 'task-1', 'ux-designer').orchestration;
      orchestration = completeAgentTask(orchestration, 'ux-designer', 'task-1').orchestration;

      const uxDesigner = orchestration.agents.get('ux-designer');
      expect(uxDesigner?.completedTasks).toContain('task-1');
    });

    it('should reset agent to idle after task completion', () => {
      orchestration = assignTaskToAgent(orchestration, 'task-1', 'ux-designer').orchestration;
      orchestration = completeAgentTask(orchestration, 'ux-designer', 'task-1').orchestration;

      const uxDesigner = orchestration.agents.get('ux-designer');
      expect(uxDesigner?.status).toBe('idle');
      expect(uxDesigner?.currentTask).toBeUndefined();
    });

    it('should support multi-step handoff chain', () => {
      // UX Designer -> Frontend Dev -> Test Engineer
      orchestration = assignTaskToAgent(orchestration, 'task-1', 'ux-designer').orchestration;

      // Step 1: UX Designer completes, hands off to Frontend Dev
      let completion = completeAgentTask(orchestration, 'ux-designer', 'task-1', 'frontend-dev');
      orchestration = completion.orchestration;
      orchestration = acceptHandoff(orchestration, completion.handoff!.id).orchestration;

      // Frontend Dev picks up
      orchestration = assignTaskToAgent(orchestration, 'task-1-impl', 'frontend-dev').orchestration;

      // Step 2: Frontend Dev completes, hands off to Test Engineer
      completion = completeAgentTask(orchestration, 'frontend-dev', 'task-1-impl', 'test-engineer');
      orchestration = completion.orchestration;
      orchestration = acceptHandoff(orchestration, completion.handoff!.id).orchestration;

      expect(orchestration.handoffs.length).toBe(2);
      expect(orchestration.handoffs[0].fromAgent).toBe('ux-designer');
      expect(orchestration.handoffs[0].toAgent).toBe('frontend-dev');
      expect(orchestration.handoffs[1].fromAgent).toBe('frontend-dev');
      expect(orchestration.handoffs[1].toAgent).toBe('test-engineer');
    });
  });

  // =========================================================================
  // PHASE 7: COMPONENT DELIVERY AND QA
  // =========================================================================

  describe('Phase 7: Component Delivery and QA', () => {
    beforeEach(() => {
      deliveries = [];
    });

    it('should create delivery report for completed component', () => {
      const report = createDeliveryReport(
        'project-1',
        'Hero Section Component',
        'frontend-dev',
        ['src/components/Hero.tsx', 'src/components/Hero.test.tsx', 'src/styles/hero.css'],
        {
          testsPassed: 15,
          testsFailed: 0,
          coverage: 92,
          lintErrors: 0,
          a11yScore: 98,
          performanceScore: 95,
        }
      );

      expect(report.component).toBe('Hero Section Component');
      expect(report.artifacts.length).toBe(3);
      expect(report.approved).toBe(false);
    });

    it('should track quality metrics in delivery', () => {
      const report = createDeliveryReport(
        'project-1',
        'Player Roster Grid',
        'frontend-dev',
        ['src/components/PlayerGrid.tsx'],
        {
          testsPassed: 20,
          testsFailed: 2,
          coverage: 85,
          lintErrors: 3,
          a11yScore: 90,
          performanceScore: 88,
        }
      );

      expect(report.quality.testsPassed).toBe(20);
      expect(report.quality.testsFailed).toBe(2);
      expect(report.quality.coverage).toBe(85);
    });

    it('should approve delivery with high quality scores', () => {
      let report = createDeliveryReport(
        'project-1',
        'Navigation Component',
        'frontend-dev',
        ['src/components/Nav.tsx'],
        {
          testsPassed: 25,
          testsFailed: 0,
          coverage: 95,
          lintErrors: 0,
          a11yScore: 100,
          performanceScore: 97,
        }
      );

      report = approveDelivery(report, 'pm-lead');

      expect(report.approved).toBe(true);
      expect(report.approvedBy).toBe('pm-lead');
      expect(report.approvedAt).toBeDefined();
    });

    it('should track multiple deliveries', () => {
      deliveries.push(
        createDeliveryReport('project-1', 'Header', 'frontend-dev', ['Header.tsx'], {
          testsPassed: 10,
          testsFailed: 0,
          coverage: 90,
          lintErrors: 0,
          a11yScore: 95,
          performanceScore: 92,
        })
      );

      deliveries.push(
        createDeliveryReport('project-1', 'Footer', 'frontend-dev', ['Footer.tsx'], {
          testsPassed: 8,
          testsFailed: 1,
          coverage: 85,
          lintErrors: 2,
          a11yScore: 90,
          performanceScore: 88,
        })
      );

      deliveries.push(
        createDeliveryReport('project-1', 'API Layer', 'backend-dev', ['api.ts'], {
          testsPassed: 30,
          testsFailed: 0,
          coverage: 98,
          lintErrors: 0,
          a11yScore: 100,
          performanceScore: 95,
        })
      );

      expect(deliveries.length).toBe(3);
    });

    it('should calculate pass rate for quality assessment', () => {
      const report = createDeliveryReport(
        'project-1',
        'Form Components',
        'frontend-dev',
        ['Form.tsx'],
        {
          testsPassed: 18,
          testsFailed: 2,
          coverage: 80,
          lintErrors: 5,
          a11yScore: 85,
          performanceScore: 82,
        }
      );

      const passRate = report.quality.testsPassed / (report.quality.testsPassed + report.quality.testsFailed) * 100;
      expect(passRate).toBe(90);
    });
  });

  // =========================================================================
  // PHASE 8: PROJECT COMPLETION VERIFICATION
  // =========================================================================

  describe('Phase 8: Project Completion Verification', () => {
    let completedOrchestration: WorkflowOrchestration;
    let completedTasks: GeneratedTask[];
    let completedIssues: GitHubIssue[];
    let finalDeliveries: DeliveryReport[];

    beforeEach(() => {
      // Setup completed project state
      projectConfig = {
        name: 'NY Knicks Website',
        description: 'Official team website redesign',
        path: '/projects/ny-knicks',
        github: { enabled: true, createIssues: true, createMilestones: true },
        taskmaster: { enabled: true, autoExpand: true },
        beads: { enabled: true, contextPreservation: true },
        agents: ['pm-lead', 'ux-designer', 'frontend-dev', 'test-engineer'],
        teamLead: 'pm-lead',
      };

      completedOrchestration = initializeOrchestration('project-1', projectConfig);

      // Simulate completed tasks
      completedTasks = [
        { id: '1', title: 'Design System', description: '', status: 'done', priority: 'high', dependencies: [], subtasks: [], estimatedComplexity: 5, requirementIds: [] },
        { id: '2', title: 'Hero Section', description: '', status: 'done', priority: 'high', dependencies: [], subtasks: [], estimatedComplexity: 5, requirementIds: [] },
        { id: '3', title: 'Player Roster', description: '', status: 'done', priority: 'medium', dependencies: [], subtasks: [], estimatedComplexity: 5, requirementIds: [] },
      ];

      // Simulate closed issues
      completedIssues = [
        { id: 'issue-1', number: 1, title: 'Design System', body: '', state: 'closed', labels: [], taskId: '1', createdAt: '', closedAt: new Date().toISOString() },
        { id: 'issue-2', number: 2, title: 'Hero Section', body: '', state: 'closed', labels: [], taskId: '2', createdAt: '', closedAt: new Date().toISOString() },
        { id: 'issue-3', number: 3, title: 'Player Roster', body: '', state: 'closed', labels: [], taskId: '3', createdAt: '', closedAt: new Date().toISOString() },
      ];

      // Simulate handoffs - use timestamps after the orchestration start
      const startTime = new Date(completedOrchestration.startedAt);
      completedOrchestration.handoffs = [
        { id: 'h1', fromAgent: 'ux-designer', toAgent: 'frontend-dev', taskId: '1', contextId: 'ctx-1', timestamp: new Date(startTime.getTime() + 1000).toISOString(), status: 'completed', contextPreserved: true },
        { id: 'h2', fromAgent: 'frontend-dev', toAgent: 'test-engineer', taskId: '2', contextId: 'ctx-2', timestamp: new Date(startTime.getTime() + 2000).toISOString(), status: 'completed', contextPreserved: true },
      ];

      // Simulate deliveries
      finalDeliveries = [
        approveDelivery(
          createDeliveryReport('project-1', 'Design System', 'ux-designer', ['design.figma'], {
            testsPassed: 0,
            testsFailed: 0,
            coverage: 0,
            lintErrors: 0,
            a11yScore: 100,
            performanceScore: 100,
          }),
          'pm-lead'
        ),
        approveDelivery(
          createDeliveryReport('project-1', 'Frontend Components', 'frontend-dev', ['components/*'], {
            testsPassed: 50,
            testsFailed: 2,
            coverage: 88,
            lintErrors: 3,
            a11yScore: 92,
            performanceScore: 90,
          }),
          'pm-lead'
        ),
      ];
    });

    it('should generate complete project summary', () => {
      const completion = completeProject(
        'project-1',
        completedOrchestration,
        completedTasks,
        completedIssues,
        finalDeliveries
      );

      expect(completion.status).toBe('completed');
      expect(completion.summary.totalTasks).toBe(3);
      expect(completion.summary.completedTasks).toBe(3);
    });

    it('should track issue completion rate', () => {
      const completion = completeProject(
        'project-1',
        completedOrchestration,
        completedTasks,
        completedIssues,
        finalDeliveries
      );

      expect(completion.summary.totalIssues).toBe(3);
      expect(completion.summary.closedIssues).toBe(3);
    });

    it('should track handoff success rate', () => {
      const completion = completeProject(
        'project-1',
        completedOrchestration,
        completedTasks,
        completedIssues,
        finalDeliveries
      );

      expect(completion.summary.totalHandoffs).toBe(2);
      expect(completion.summary.successfulHandoffs).toBe(2);
    });

    it('should list all deliverables', () => {
      const completion = completeProject(
        'project-1',
        completedOrchestration,
        completedTasks,
        completedIssues,
        finalDeliveries
      );

      expect(completion.summary.deliverables).toContain('Design System');
      expect(completion.summary.deliverables).toContain('Frontend Components');
    });

    it('should calculate average quality score', () => {
      const completion = completeProject(
        'project-1',
        completedOrchestration,
        completedTasks,
        completedIssues,
        finalDeliveries
      );

      expect(completion.summary.qualityScore).toBeGreaterThan(0);
      expect(completion.summary.qualityScore).toBeLessThanOrEqual(100);
    });

    it('should generate project timeline', () => {
      const completion = completeProject(
        'project-1',
        completedOrchestration,
        completedTasks,
        completedIssues,
        finalDeliveries
      );

      expect(completion.timeline.length).toBeGreaterThan(0);
      expect(completion.timeline[0].event).toBe('Project started');
      // Find the "Project completed" event in timeline
      const completedEvent = completion.timeline.find(e => e.event === 'Project completed');
      expect(completedEvent).toBeDefined();
    });

    it('should mark partial completion if tasks remain', () => {
      const incompleteTasks = [
        ...completedTasks,
        { id: '4', title: 'Pending Task', description: '', status: 'pending' as const, priority: 'low' as const, dependencies: [], subtasks: [], estimatedComplexity: 3, requirementIds: [] },
      ];

      const completion = completeProject(
        'project-1',
        completedOrchestration,
        incompleteTasks,
        completedIssues,
        finalDeliveries
      );

      expect(completion.status).toBe('partial');
      expect(completion.summary.completedTasks).toBe(3);
      expect(completion.summary.totalTasks).toBe(4);
    });

    it('should include handoff events in timeline', () => {
      const completion = completeProject(
        'project-1',
        completedOrchestration,
        completedTasks,
        completedIssues,
        finalDeliveries
      );

      const handoffEvents = completion.timeline.filter(e => e.event.includes('Handoff'));
      expect(handoffEvents.length).toBe(2);
    });

    it('should include delivery events in timeline', () => {
      const completion = completeProject(
        'project-1',
        completedOrchestration,
        completedTasks,
        completedIssues,
        finalDeliveries
      );

      const deliveryEvents = completion.timeline.filter(e => e.event.includes('delivered'));
      expect(deliveryEvents.length).toBe(2);
    });

    it('should include approval events in timeline', () => {
      const completion = completeProject(
        'project-1',
        completedOrchestration,
        completedTasks,
        completedIssues,
        finalDeliveries
      );

      const approvalEvents = completion.timeline.filter(e => e.event.includes('approved'));
      expect(approvalEvents.length).toBe(2);
    });
  });

  // =========================================================================
  // FULL LIFECYCLE INTEGRATION TEST
  // =========================================================================

  describe('Full Lifecycle Integration', () => {
    it('should complete entire NY Knicks website project lifecycle', () => {
      // PHASE 1: Initialize wizard
      let wizardState = createWizardState();
      wizardState = processWizardStep(wizardState, 1).state;
      wizardState = processWizardStep(wizardState, 2, {
        name: 'NY Knicks Website',
        description: 'Official team website redesign',
        path: '/projects/ny-knicks',
      }).state;
      wizardState = processWizardStep(wizardState, 3, {
        enabled: true,
        repo: 'ny-knicks-website',
        owner: 'nba-knicks',
      }).state;
      wizardState = processWizardStep(wizardState, 4, {
        enabled: true,
        prdPath: '.taskmaster/docs/prd.md',
      }).state;
      wizardState = processWizardStep(wizardState, 5, { enabled: true }).state;
      wizardState = processWizardStep(wizardState, 6, [
        'pm-lead', 'ux-designer', 'frontend-dev', 'backend-dev', 'test-engineer',
      ]).state;
      wizardState = processWizardStep(wizardState, 7).state;

      const wizardCompletion = completeWizard(wizardState);
      expect(wizardCompletion.success).toBe(true);

      const config = wizardCompletion.config!;

      // PHASE 2 & 3: Parse PRD and generate tasks
      const prdContent = `
# NY Knicks Website PRD

REQ-1: Design brand-consistent hero section
REQ-2: Build responsive player roster grid
REQ-3: Create ticket purchasing flow
REQ-4: Implement real-time game data API
REQ-5: Test WCAG 2.1 accessibility compliance
      `;

      const prd = parsePRD(prdContent, { title: 'NY Knicks Website PRD', version: '1.0.0' });
      expect(prd.requirements.length).toBe(5);

      const tasks = generateTasksFromPRD(prd, config);
      expect(tasks.length).toBe(5);

      // PHASE 4: Create GitHub milestones and issues
      const milestones = createMilestones(tasks, config.name);
      const issues = createIssuesFromTasks(tasks, milestones);
      expect(issues.length).toBe(5);

      // PHASE 5: Initialize orchestration
      let orch = initializeOrchestration('ny-knicks-project', config);
      orch = queueTasks(orch, tasks);
      expect(orch.status).toBe('running');

      // PHASE 6: Execute workflow with handoffs
      // UX Designer works on design task
      orch = assignTaskToAgent(orch, '1', 'ux-designer').orchestration;
      let handoffResult = completeAgentTask(orch, 'ux-designer', '1', 'frontend-dev');
      orch = handoffResult.orchestration;
      orch = acceptHandoff(orch, handoffResult.handoff!.id).orchestration;

      // Frontend dev implements
      orch = assignTaskToAgent(orch, '2', 'frontend-dev').orchestration;
      handoffResult = completeAgentTask(orch, 'frontend-dev', '2', 'test-engineer');
      orch = handoffResult.orchestration;
      orch = acceptHandoff(orch, handoffResult.handoff!.id).orchestration;

      // Mark remaining tasks done
      tasks.forEach(t => t.status = 'done');
      issues.forEach(i => { i.state = 'closed'; i.closedAt = new Date().toISOString(); });

      // Complete handoffs
      orch.handoffs.forEach(h => h.status = 'completed');

      // PHASE 7: Create deliveries
      const deliveries = [
        approveDelivery(
          createDeliveryReport('ny-knicks-project', 'Design System', 'ux-designer', ['design/*'], {
            testsPassed: 0, testsFailed: 0, coverage: 0, lintErrors: 0, a11yScore: 98, performanceScore: 100,
          }),
          'pm-lead'
        ),
        approveDelivery(
          createDeliveryReport('ny-knicks-project', 'Frontend Application', 'frontend-dev', ['src/*'], {
            testsPassed: 85, testsFailed: 3, coverage: 87, lintErrors: 5, a11yScore: 94, performanceScore: 91,
          }),
          'pm-lead'
        ),
        approveDelivery(
          createDeliveryReport('ny-knicks-project', 'API Services', 'backend-dev', ['api/*'], {
            testsPassed: 120, testsFailed: 0, coverage: 95, lintErrors: 0, a11yScore: 100, performanceScore: 98,
          }),
          'pm-lead'
        ),
      ];

      // PHASE 8: Complete project
      const completion = completeProject('ny-knicks-project', orch, tasks, issues, deliveries);

      // Verify full completion
      expect(completion.status).toBe('completed');
      expect(completion.summary.totalTasks).toBe(5);
      expect(completion.summary.completedTasks).toBe(5);
      expect(completion.summary.totalIssues).toBe(5);
      expect(completion.summary.closedIssues).toBe(5);
      expect(completion.summary.totalHandoffs).toBe(2);
      expect(completion.summary.successfulHandoffs).toBe(2);
      expect(completion.summary.deliverables.length).toBe(3);
      expect(completion.summary.qualityScore).toBeGreaterThan(80);
      expect(completion.timeline.length).toBeGreaterThan(5);
    });
  });
});
