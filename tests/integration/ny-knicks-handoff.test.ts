/**
 * NY Knicks Website Project - Agent Workflow Delegation and Handoffs
 *
 * Tests workflow delegation and handoff protocols using the NY Knicks website
 * project as a practical scenario. Validates context preservation, parallel
 * handoffs, circular dependency handling, and metrics capture.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ============================================================================
// Types and Interfaces
// ============================================================================

interface AgentContext {
  agentId: string;
  agentType: string;
  projectId: string;
  timestamp: string;
  data: Record<string, unknown>;
  parentContext?: string;
  childContexts: string[];
}

interface HandoffPayload {
  id: string;
  fromAgent: string;
  toAgent: string;
  timestamp: string;
  contextId: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'rejected' | 'failed';
  data: Record<string, unknown>;
  acknowledgement?: {
    timestamp: string;
    accepted: boolean;
    notes?: string;
  };
  completion?: {
    timestamp: string;
    success: boolean;
    result?: unknown;
    error?: string;
  };
}

interface HandoffMetrics {
  handoffId: string;
  initiatedAt: string;
  acknowledgedAt?: string;
  completedAt?: string;
  timeToAcknowledge?: number;
  timeToComplete?: number;
  contextSize: number;
  success: boolean;
  retryCount: number;
}

interface WorkflowStep {
  id: string;
  agentType: string;
  action: string;
  dependsOn: string[];
  outputTo: string[];
}

interface WorkflowExecution {
  id: string;
  steps: WorkflowStep[];
  currentStep: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  handoffs: HandoffPayload[];
  metrics: HandoffMetrics[];
}

// ============================================================================
// NY Knicks Brand Constants
// ============================================================================

const KNICKS_BRAND = {
  colors: {
    primary: '#006BB6',      // Knicks Blue
    secondary: '#F58426',    // Knicks Orange
    accent: '#BEC0C2',       // Silver/Gray
    white: '#FFFFFF',
    black: '#000000',
  },
  typography: {
    heading: 'Gotham Bold',
    body: 'Gotham Book',
    accent: 'Gotham Medium',
  },
  components: ['Header', 'Footer', 'PlayerCard', 'GameSchedule', 'TicketWidget', 'NewsCarousel'],
};

// ============================================================================
// Agent Registry
// ============================================================================

const AGENT_REGISTRY = {
  'pm-lead': {
    type: 'pm-lead',
    capabilities: ['project-planning', 'task-management', 'agent-coordination', 'status-tracking'],
    canHandoffTo: ['ux-designer', 'frontend-dev', 'backend-dev', 'test-engineer', 'docs-engineer'],
  },
  'ux-designer': {
    type: 'ux-designer',
    capabilities: ['ui-design', 'wireframing', 'design-system', 'prototyping', 'user-research'],
    canHandoffTo: ['frontend-dev', 'pm-lead'],
  },
  'frontend-dev': {
    type: 'frontend-dev',
    capabilities: ['react', 'typescript', 'css', 'component-development', 'state-management'],
    canHandoffTo: ['test-engineer', 'ux-designer', 'backend-dev', 'pm-lead'],
  },
  'backend-dev': {
    type: 'backend-dev',
    capabilities: ['api-development', 'database', 'authentication', 'caching'],
    canHandoffTo: ['frontend-dev', 'test-engineer', 'pm-lead'],
  },
  'test-engineer': {
    type: 'test-engineer',
    capabilities: ['unit-testing', 'integration-testing', 'e2e-testing', 'performance-testing'],
    canHandoffTo: ['frontend-dev', 'backend-dev', 'pm-lead'],
  },
  'docs-engineer': {
    type: 'docs-engineer',
    capabilities: ['documentation', 'api-docs', 'user-guides', 'readme'],
    canHandoffTo: ['pm-lead'],
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

function createAgentContext(
  agentType: string,
  projectId: string,
  data: Record<string, unknown>
): AgentContext {
  return {
    agentId: `${agentType}-${Date.now()}`,
    agentType,
    projectId,
    timestamp: new Date().toISOString(),
    data,
    childContexts: [],
  };
}

function createHandoff(
  fromAgent: string,
  toAgent: string,
  contextId: string,
  data: Record<string, unknown>,
  priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): HandoffPayload {
  return {
    id: `handoff-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    fromAgent,
    toAgent,
    timestamp: new Date().toISOString(),
    contextId,
    priority,
    status: 'pending',
    data,
  };
}

function validateHandoffPermission(fromAgent: string, toAgent: string): boolean {
  const registry = AGENT_REGISTRY[fromAgent as keyof typeof AGENT_REGISTRY];
  if (!registry) return false;
  return registry.canHandoffTo.includes(toAgent);
}

function acknowledgeHandoff(handoff: HandoffPayload, accept: boolean, notes?: string): HandoffPayload {
  return {
    ...handoff,
    status: accept ? 'accepted' : 'rejected',
    acknowledgement: {
      timestamp: new Date().toISOString(),
      accepted: accept,
      notes,
    },
  };
}

function completeHandoff(
  handoff: HandoffPayload,
  success: boolean,
  result?: unknown,
  error?: string
): HandoffPayload {
  return {
    ...handoff,
    status: success ? 'completed' : 'failed',
    completion: {
      timestamp: new Date().toISOString(),
      success,
      result,
      error,
    },
  };
}

function calculateHandoffMetrics(handoff: HandoffPayload): HandoffMetrics {
  const initiated = new Date(handoff.timestamp).getTime();
  const acknowledged = handoff.acknowledgement
    ? new Date(handoff.acknowledgement.timestamp).getTime()
    : undefined;
  const completed = handoff.completion
    ? new Date(handoff.completion.timestamp).getTime()
    : undefined;

  return {
    handoffId: handoff.id,
    initiatedAt: handoff.timestamp,
    acknowledgedAt: handoff.acknowledgement?.timestamp,
    completedAt: handoff.completion?.timestamp,
    timeToAcknowledge: acknowledged ? acknowledged - initiated : undefined,
    timeToComplete: completed ? completed - initiated : undefined,
    contextSize: JSON.stringify(handoff.data).length,
    success: handoff.completion?.success ?? false,
    retryCount: 0,
  };
}

function extractContextForHandoff(
  context: AgentContext,
  targetAgent: string
): Record<string, unknown> {
  // Filter context based on target agent's capabilities
  const targetRegistry = AGENT_REGISTRY[targetAgent as keyof typeof AGENT_REGISTRY];
  if (!targetRegistry) return context.data;

  // Return relevant context based on agent type
  const relevantData: Record<string, unknown> = {
    projectId: context.projectId,
    sourceAgent: context.agentType,
    timestamp: context.timestamp,
  };

  // Add specific data based on handoff type
  if (targetAgent === 'frontend-dev' && context.agentType === 'ux-designer') {
    relevantData.designSystem = context.data.designSystem;
    relevantData.components = context.data.components;
    relevantData.specifications = context.data.specifications;
  } else if (targetAgent === 'ux-designer' && context.agentType === 'pm-lead') {
    relevantData.requirements = context.data.requirements;
    relevantData.brandGuidelines = context.data.brandGuidelines;
    relevantData.userStories = context.data.userStories;
  } else if (targetAgent === 'test-engineer') {
    relevantData.implementations = context.data.implementations;
    relevantData.testCriteria = context.data.testCriteria;
  }

  return relevantData;
}

function detectCircularDependency(steps: WorkflowStep[]): string[] {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: string[] = [];

  function dfs(stepId: string, path: string[]): boolean {
    visited.add(stepId);
    recursionStack.add(stepId);
    path.push(stepId);

    const step = steps.find(s => s.id === stepId);
    if (!step) return false;

    for (const outputTo of step.outputTo) {
      if (!visited.has(outputTo)) {
        if (dfs(outputTo, path)) return true;
      } else if (recursionStack.has(outputTo)) {
        const cycleStart = path.indexOf(outputTo);
        cycles.push(path.slice(cycleStart).join(' -> ') + ' -> ' + outputTo);
        return true;
      }
    }

    path.pop();
    recursionStack.delete(stepId);
    return false;
  }

  for (const step of steps) {
    if (!visited.has(step.id)) {
      dfs(step.id, []);
    }
  }

  return cycles;
}

function executeParallelHandoffs(
  handoffs: HandoffPayload[]
): Promise<HandoffPayload[]> {
  return Promise.all(
    handoffs.map(async (handoff) => {
      // Simulate async handoff processing
      await new Promise(resolve => setTimeout(resolve, 10));
      const acknowledged = acknowledgeHandoff(handoff, true, 'Auto-accepted');
      return completeHandoff(acknowledged, true, { processed: true });
    })
  );
}

// ============================================================================
// Test Suites
// ============================================================================

describe('NY Knicks Website - Agent Workflow Delegation and Handoffs', () => {
  const projectId = 'knicks-website-2025';
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `knicks-handoff-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  // ==========================================================================
  // PM-Lead to UX-Designer Handoff Tests
  // ==========================================================================

  describe('PM-Lead → UX-Designer Handoff', () => {
    it('should create valid handoff from PM-Lead to UX-Designer', () => {
      const pmContext = createAgentContext('pm-lead', projectId, {
        requirements: {
          homepage: 'Modern, bold design reflecting Knicks brand identity',
          schedule: 'Interactive game schedule with ticket integration',
          players: 'Player roster with stats and multimedia',
        },
        brandGuidelines: KNICKS_BRAND,
        userStories: [
          'As a fan, I want to see upcoming games quickly',
          'As a fan, I want to browse player stats',
          'As a season ticket holder, I want easy access to my tickets',
        ],
      });

      const handoffData = extractContextForHandoff(pmContext, 'ux-designer');
      const handoff = createHandoff(
        'pm-lead',
        'ux-designer',
        pmContext.agentId,
        handoffData,
        'high'
      );

      expect(handoff.fromAgent).toBe('pm-lead');
      expect(handoff.toAgent).toBe('ux-designer');
      expect(handoff.status).toBe('pending');
      expect(handoff.priority).toBe('high');
      expect(handoff.data.requirements).toBeDefined();
      expect(handoff.data.brandGuidelines).toBeDefined();
    });

    it('should validate PM-Lead can handoff to UX-Designer', () => {
      const isValid = validateHandoffPermission('pm-lead', 'ux-designer');
      expect(isValid).toBe(true);
    });

    it('should include brand colors in handoff context', () => {
      const pmContext = createAgentContext('pm-lead', projectId, {
        brandGuidelines: KNICKS_BRAND,
      });

      const handoffData = extractContextForHandoff(pmContext, 'ux-designer');
      const handoff = createHandoff('pm-lead', 'ux-designer', pmContext.agentId, handoffData);

      expect(handoff.data.brandGuidelines).toEqual(KNICKS_BRAND);
    });

    it('should track handoff acknowledgement', () => {
      const handoff = createHandoff('pm-lead', 'ux-designer', 'ctx-123', {
        requirements: 'Design homepage',
      });

      const acknowledged = acknowledgeHandoff(handoff, true, 'Ready to start design work');

      expect(acknowledged.status).toBe('accepted');
      expect(acknowledged.acknowledgement?.accepted).toBe(true);
      expect(acknowledged.acknowledgement?.notes).toBe('Ready to start design work');
    });

    it('should handle rejected handoff', () => {
      const handoff = createHandoff('pm-lead', 'ux-designer', 'ctx-123', {
        requirements: 'Design homepage',
      });

      const rejected = acknowledgeHandoff(handoff, false, 'Missing brand assets');

      expect(rejected.status).toBe('rejected');
      expect(rejected.acknowledgement?.accepted).toBe(false);
    });

    it('should preserve user stories through handoff', () => {
      const userStories = [
        { id: 'US-001', title: 'View game schedule', priority: 'high' },
        { id: 'US-002', title: 'Purchase tickets', priority: 'high' },
        { id: 'US-003', title: 'View player stats', priority: 'medium' },
      ];

      const pmContext = createAgentContext('pm-lead', projectId, {
        userStories,
        brandGuidelines: KNICKS_BRAND,
        requirements: {},
      });

      const handoffData = extractContextForHandoff(pmContext, 'ux-designer');

      expect(handoffData.userStories).toEqual(userStories);
    });
  });

  // ==========================================================================
  // UX-Designer to Frontend-Dev Handoff Tests
  // ==========================================================================

  describe('UX-Designer → Frontend-Dev Handoff', () => {
    it('should create design system handoff', () => {
      const uxContext = createAgentContext('ux-designer', projectId, {
        designSystem: {
          colors: KNICKS_BRAND.colors,
          typography: KNICKS_BRAND.typography,
          spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px' },
          breakpoints: { mobile: '320px', tablet: '768px', desktop: '1024px', wide: '1440px' },
        },
        components: [
          { name: 'KnicksButton', variants: ['primary', 'secondary', 'outline'] },
          { name: 'PlayerCard', props: ['playerId', 'showStats', 'compact'] },
          { name: 'GameTile', props: ['gameId', 'showTickets', 'highlighted'] },
        ],
        specifications: {
          HeaderNav: { height: '80px', sticky: true, logo: 'left', menu: 'right' },
          Footer: { columns: 4, social: true, newsletter: true },
        },
      });

      const handoffData = extractContextForHandoff(uxContext, 'frontend-dev');
      const handoff = createHandoff('ux-designer', 'frontend-dev', uxContext.agentId, handoffData);

      expect(handoff.data.designSystem).toBeDefined();
      expect(handoff.data.components).toBeDefined();
      expect(handoff.data.specifications).toBeDefined();
    });

    it('should validate UX-Designer can handoff to Frontend-Dev', () => {
      const isValid = validateHandoffPermission('ux-designer', 'frontend-dev');
      expect(isValid).toBe(true);
    });

    it('should include component specifications', () => {
      const components = [
        {
          name: 'PlayerCard',
          props: {
            playerId: 'string',
            showStats: 'boolean',
            variant: "'compact' | 'full'",
          },
          styles: {
            backgroundColor: KNICKS_BRAND.colors.white,
            borderColor: KNICKS_BRAND.colors.primary,
          },
        },
      ];

      const uxContext = createAgentContext('ux-designer', projectId, {
        components,
        designSystem: {},
        specifications: {},
      });

      const handoffData = extractContextForHandoff(uxContext, 'frontend-dev');

      expect(handoffData.components).toEqual(components);
    });

    it('should track complete design handoff workflow', () => {
      const handoff = createHandoff('ux-designer', 'frontend-dev', 'ctx-456', {
        designSystem: KNICKS_BRAND,
        components: ['PlayerCard'],
      });

      // Step 1: Acknowledgement
      const acknowledged = acknowledgeHandoff(handoff, true, 'Starting implementation');
      expect(acknowledged.status).toBe('accepted');

      // Step 2: Completion
      const completed = completeHandoff(acknowledged, true, {
        implementedComponents: ['PlayerCard'],
        pullRequest: 'PR-123',
      });
      expect(completed.status).toBe('completed');
      expect(completed.completion?.success).toBe(true);
    });

    it('should handle failed implementation handoff', () => {
      const handoff = createHandoff('ux-designer', 'frontend-dev', 'ctx-456', {
        designSystem: KNICKS_BRAND,
      });

      const acknowledged = acknowledgeHandoff(handoff, true);
      const failed = completeHandoff(
        acknowledged,
        false,
        undefined,
        'Missing design tokens for responsive breakpoints'
      );

      expect(failed.status).toBe('failed');
      expect(failed.completion?.error).toContain('Missing design tokens');
    });

    it('should preserve Knicks color tokens through handoff', () => {
      const uxContext = createAgentContext('ux-designer', projectId, {
        designSystem: {
          colors: {
            'knicks-blue': KNICKS_BRAND.colors.primary,
            'knicks-orange': KNICKS_BRAND.colors.secondary,
            'knicks-silver': KNICKS_BRAND.colors.accent,
          },
        },
        components: [],
        specifications: {},
      });

      const handoffData = extractContextForHandoff(uxContext, 'frontend-dev');
      const designSystem = handoffData.designSystem as Record<string, unknown>;
      const colors = designSystem?.colors as Record<string, string>;

      expect(colors['knicks-blue']).toBe('#006BB6');
      expect(colors['knicks-orange']).toBe('#F58426');
      expect(colors['knicks-silver']).toBe('#BEC0C2');
    });
  });

  // ==========================================================================
  // Frontend-Dev to Test-Engineer Handoff Tests
  // ==========================================================================

  describe('Frontend-Dev → Test-Engineer Handoff', () => {
    it('should create testing handoff with component implementations', () => {
      const frontendContext = createAgentContext('frontend-dev', projectId, {
        implementations: [
          {
            component: 'PlayerCard',
            path: 'src/components/PlayerCard.tsx',
            tests: 'src/components/PlayerCard.test.tsx',
            coverage: 85,
          },
          {
            component: 'GameSchedule',
            path: 'src/components/GameSchedule.tsx',
            tests: 'src/components/GameSchedule.test.tsx',
            coverage: 78,
          },
        ],
        testCriteria: {
          minCoverage: 80,
          requiredTests: ['unit', 'integration', 'a11y'],
          browsers: ['chrome', 'firefox', 'safari'],
        },
      });

      const handoffData = extractContextForHandoff(frontendContext, 'test-engineer');
      const handoff = createHandoff('frontend-dev', 'test-engineer', frontendContext.agentId, handoffData);

      expect(handoff.data.implementations).toBeDefined();
      expect(handoff.data.testCriteria).toBeDefined();
    });

    it('should validate Frontend-Dev can handoff to Test-Engineer', () => {
      const isValid = validateHandoffPermission('frontend-dev', 'test-engineer');
      expect(isValid).toBe(true);
    });

    it('should include test coverage requirements', () => {
      const frontendContext = createAgentContext('frontend-dev', projectId, {
        implementations: [{ component: 'Header', coverage: 90 }],
        testCriteria: {
          minCoverage: 80,
          coverageTargets: {
            statements: 80,
            branches: 75,
            functions: 80,
            lines: 80,
          },
        },
      });

      const handoffData = extractContextForHandoff(frontendContext, 'test-engineer');

      expect(handoffData.testCriteria).toBeDefined();
    });

    it('should track test results in completion', () => {
      const handoff = createHandoff('frontend-dev', 'test-engineer', 'ctx-789', {
        implementations: [{ component: 'PlayerCard' }],
      });

      const acknowledged = acknowledgeHandoff(handoff, true);
      const completed = completeHandoff(acknowledged, true, {
        testResults: {
          passed: 45,
          failed: 2,
          skipped: 3,
          coverage: 87,
        },
        issues: ['GameSchedule a11y contrast issue'],
      });

      expect(completed.status).toBe('completed');
      const result = completed.completion?.result as Record<string, unknown>;
      expect(result.testResults).toBeDefined();
    });

    it('should handle test failure escalation', () => {
      const handoff = createHandoff('frontend-dev', 'test-engineer', 'ctx-789', {
        implementations: [{ component: 'TicketWidget' }],
      });

      const acknowledged = acknowledgeHandoff(handoff, true);
      const failed = completeHandoff(
        acknowledged,
        false,
        {
          testResults: { passed: 10, failed: 15 },
          blockers: ['API mock not configured', 'Missing test fixtures'],
        },
        'Critical test failures require frontend fixes'
      );

      expect(failed.status).toBe('failed');
      expect(failed.completion?.error).toContain('Critical test failures');
    });
  });

  // ==========================================================================
  // Parallel Handoff Coordination Tests
  // ==========================================================================

  describe('Parallel Handoff Coordination', () => {
    it('should execute multiple handoffs in parallel', async () => {
      const pmContext = createAgentContext('pm-lead', projectId, {
        tasks: ['design', 'development', 'testing'],
      });

      const handoffs = [
        createHandoff('pm-lead', 'ux-designer', pmContext.agentId, { task: 'design' }),
        createHandoff('pm-lead', 'frontend-dev', pmContext.agentId, { task: 'development' }),
        createHandoff('pm-lead', 'test-engineer', pmContext.agentId, { task: 'testing' }),
      ];

      vi.useRealTimers();
      const results = await executeParallelHandoffs(handoffs);
      vi.useFakeTimers({ shouldAdvanceTime: true });

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.status).toBe('completed');
      });
    });

    it('should maintain handoff order independence', async () => {
      const handoffs = [
        createHandoff('pm-lead', 'ux-designer', 'ctx-1', { order: 1 }),
        createHandoff('pm-lead', 'backend-dev', 'ctx-2', { order: 2 }),
        createHandoff('pm-lead', 'frontend-dev', 'ctx-3', { order: 3 }),
      ];

      vi.useRealTimers();
      const results = await executeParallelHandoffs(handoffs);
      vi.useFakeTimers({ shouldAdvanceTime: true });

      // All should complete regardless of order
      expect(results.every(r => r.status === 'completed')).toBe(true);
    });

    it('should aggregate metrics from parallel handoffs', async () => {
      const handoffs = [
        createHandoff('pm-lead', 'ux-designer', 'ctx-1', { data: 'x'.repeat(100) }),
        createHandoff('pm-lead', 'frontend-dev', 'ctx-2', { data: 'y'.repeat(200) }),
      ];

      vi.useRealTimers();
      const results = await executeParallelHandoffs(handoffs);
      vi.useFakeTimers({ shouldAdvanceTime: true });

      const metrics = results.map(calculateHandoffMetrics);

      expect(metrics).toHaveLength(2);
      expect(metrics.every(m => m.success)).toBe(true);
      expect(metrics[0].contextSize).toBeLessThan(metrics[1].contextSize);
    });

    it('should handle mixed success/failure in parallel', async () => {
      const handoffs = [
        createHandoff('pm-lead', 'ux-designer', 'ctx-1', { valid: true }),
        createHandoff('pm-lead', 'frontend-dev', 'ctx-2', { valid: true }),
      ];

      vi.useRealTimers();
      const results = await Promise.all(
        handoffs.map(async (handoff, index) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          const acknowledged = acknowledgeHandoff(handoff, true);
          // Simulate failure for second handoff
          if (index === 1) {
            return completeHandoff(acknowledged, false, undefined, 'Simulated failure');
          }
          return completeHandoff(acknowledged, true);
        })
      );
      vi.useFakeTimers({ shouldAdvanceTime: true });

      expect(results[0].status).toBe('completed');
      expect(results[1].status).toBe('failed');
    });

    it('should coordinate fan-out pattern from PM-Lead', () => {
      const workflow: WorkflowStep[] = [
        { id: 'pm-init', agentType: 'pm-lead', action: 'initialize', dependsOn: [], outputTo: ['design', 'api-spec'] },
        { id: 'design', agentType: 'ux-designer', action: 'create-designs', dependsOn: ['pm-init'], outputTo: ['frontend'] },
        { id: 'api-spec', agentType: 'backend-dev', action: 'define-api', dependsOn: ['pm-init'], outputTo: ['frontend'] },
        { id: 'frontend', agentType: 'frontend-dev', action: 'implement', dependsOn: ['design', 'api-spec'], outputTo: [] },
      ];

      // PM-Lead can fan out to both design and api-spec
      const pmStep = workflow.find(s => s.id === 'pm-init');
      expect(pmStep?.outputTo).toContain('design');
      expect(pmStep?.outputTo).toContain('api-spec');

      // Frontend depends on both
      const frontendStep = workflow.find(s => s.id === 'frontend');
      expect(frontendStep?.dependsOn).toContain('design');
      expect(frontendStep?.dependsOn).toContain('api-spec');
    });
  });

  // ==========================================================================
  // Circular Dependency Handling Tests
  // ==========================================================================

  describe('Circular Dependency Handling', () => {
    it('should detect simple circular dependency', () => {
      const steps: WorkflowStep[] = [
        { id: 'A', agentType: 'frontend-dev', action: 'build', dependsOn: [], outputTo: ['B'] },
        { id: 'B', agentType: 'test-engineer', action: 'test', dependsOn: ['A'], outputTo: ['A'] },
      ];

      const cycles = detectCircularDependency(steps);

      expect(cycles.length).toBeGreaterThan(0);
      expect(cycles[0]).toContain('A');
      expect(cycles[0]).toContain('B');
    });

    it('should detect complex circular dependency', () => {
      const steps: WorkflowStep[] = [
        { id: 'A', agentType: 'pm-lead', action: 'plan', dependsOn: [], outputTo: ['B'] },
        { id: 'B', agentType: 'ux-designer', action: 'design', dependsOn: ['A'], outputTo: ['C'] },
        { id: 'C', agentType: 'frontend-dev', action: 'implement', dependsOn: ['B'], outputTo: ['D'] },
        { id: 'D', agentType: 'test-engineer', action: 'test', dependsOn: ['C'], outputTo: ['B'] },
      ];

      const cycles = detectCircularDependency(steps);

      expect(cycles.length).toBeGreaterThan(0);
    });

    it('should allow valid dependency chains', () => {
      const steps: WorkflowStep[] = [
        { id: 'pm', agentType: 'pm-lead', action: 'plan', dependsOn: [], outputTo: ['ux'] },
        { id: 'ux', agentType: 'ux-designer', action: 'design', dependsOn: ['pm'], outputTo: ['fe'] },
        { id: 'fe', agentType: 'frontend-dev', action: 'implement', dependsOn: ['ux'], outputTo: ['test'] },
        { id: 'test', agentType: 'test-engineer', action: 'test', dependsOn: ['fe'], outputTo: [] },
      ];

      const cycles = detectCircularDependency(steps);

      expect(cycles).toHaveLength(0);
    });

    it('should detect self-referencing dependency', () => {
      const steps: WorkflowStep[] = [
        { id: 'A', agentType: 'frontend-dev', action: 'iterative-build', dependsOn: [], outputTo: ['A'] },
      ];

      const cycles = detectCircularDependency(steps);

      expect(cycles.length).toBeGreaterThan(0);
    });

    it('should handle feedback loop workflow pattern', () => {
      // In real scenarios, feedback loops need break conditions
      const workflow: WorkflowExecution = {
        id: 'knicks-dev',
        steps: [
          { id: 'design', agentType: 'ux-designer', action: 'create', dependsOn: [], outputTo: ['implement'] },
          { id: 'implement', agentType: 'frontend-dev', action: 'build', dependsOn: ['design'], outputTo: ['review'] },
          { id: 'review', agentType: 'ux-designer', action: 'review', dependsOn: ['implement'], outputTo: ['design'] },
        ],
        currentStep: 'design',
        status: 'running',
        handoffs: [],
        metrics: [],
      };

      // Detect the feedback loop
      const cycles = detectCircularDependency(workflow.steps);
      expect(cycles.length).toBeGreaterThan(0);

      // In practice, add iteration limit
      const maxIterations = 3;
      let iterations = 0;

      while (workflow.status === 'running' && iterations < maxIterations) {
        iterations++;
        // Simulate step execution
        if (iterations === maxIterations) {
          workflow.status = 'completed';
        }
      }

      expect(workflow.status).toBe('completed');
      expect(iterations).toBe(maxIterations);
    });
  });

  // ==========================================================================
  // Context Preservation Validation Tests
  // ==========================================================================

  describe('Context Preservation Validation', () => {
    it('should preserve project ID across handoffs', () => {
      const pmContext = createAgentContext('pm-lead', projectId, { init: true });
      const handoff1 = createHandoff('pm-lead', 'ux-designer', pmContext.agentId, {
        projectId: pmContext.projectId,
      });

      expect(handoff1.data.projectId).toBe(projectId);
    });

    it('should maintain source agent reference', () => {
      const uxContext = createAgentContext('ux-designer', projectId, {
        designs: ['homepage', 'schedule'],
      });

      const handoffData = extractContextForHandoff(uxContext, 'frontend-dev');

      expect(handoffData.sourceAgent).toBe('ux-designer');
    });

    it('should preserve Knicks brand through multi-hop handoffs', () => {
      // PM-Lead → UX-Designer
      const pmContext = createAgentContext('pm-lead', projectId, {
        brandGuidelines: KNICKS_BRAND,
        requirements: {},
        userStories: [],
      });
      const pmHandoff = extractContextForHandoff(pmContext, 'ux-designer');

      // UX-Designer processes and hands off to Frontend-Dev
      const uxContext = createAgentContext('ux-designer', projectId, {
        designSystem: {
          colors: (pmHandoff.brandGuidelines as typeof KNICKS_BRAND).colors,
        },
        components: [],
        specifications: {},
      });
      const uxHandoff = extractContextForHandoff(uxContext, 'frontend-dev');
      const designSystem = uxHandoff.designSystem as { colors: typeof KNICKS_BRAND.colors };

      expect(designSystem.colors.primary).toBe('#006BB6');
      expect(designSystem.colors.secondary).toBe('#F58426');
    });

    it('should track context lineage through parent references', () => {
      const pmContext = createAgentContext('pm-lead', projectId, { init: true });

      const uxContext = createAgentContext('ux-designer', projectId, { designs: true });
      uxContext.parentContext = pmContext.agentId;
      pmContext.childContexts.push(uxContext.agentId);

      const feContext = createAgentContext('frontend-dev', projectId, { components: true });
      feContext.parentContext = uxContext.agentId;
      uxContext.childContexts.push(feContext.agentId);

      expect(feContext.parentContext).toBe(uxContext.agentId);
      expect(uxContext.parentContext).toBe(pmContext.agentId);
      expect(pmContext.childContexts).toContain(uxContext.agentId);
    });

    it('should handle large context efficiently', () => {
      const largeData = {
        components: Array.from({ length: 100 }, (_, i) => ({
          name: `Component${i}`,
          props: { a: 1, b: 2, c: 3 },
          styles: { width: '100px', height: '50px' },
        })),
        designSystem: KNICKS_BRAND,
        specifications: {},
      };

      const uxContext = createAgentContext('ux-designer', projectId, largeData);
      const handoffData = extractContextForHandoff(uxContext, 'frontend-dev');
      const handoff = createHandoff('ux-designer', 'frontend-dev', uxContext.agentId, handoffData);

      const metrics = calculateHandoffMetrics(handoff);

      expect(metrics.contextSize).toBeGreaterThan(0);
      // Reasonable size for component list
      expect(metrics.contextSize).toBeLessThan(100000);
    });

    it('should validate required fields in handoff context', () => {
      const pmContext = createAgentContext('pm-lead', projectId, {
        requirements: { homepage: 'Required' },
        brandGuidelines: KNICKS_BRAND,
        userStories: [],
      });

      const handoffData = extractContextForHandoff(pmContext, 'ux-designer');

      // Validate required fields exist
      expect(handoffData.projectId).toBeDefined();
      expect(handoffData.sourceAgent).toBeDefined();
      expect(handoffData.timestamp).toBeDefined();
      expect(handoffData.requirements).toBeDefined();
      expect(handoffData.brandGuidelines).toBeDefined();
    });
  });

  // ==========================================================================
  // Handoff Metrics Capture Tests
  // ==========================================================================

  describe('Handoff Metrics Capture', () => {
    it('should calculate time to acknowledge', () => {
      const handoff = createHandoff('pm-lead', 'ux-designer', 'ctx-1', {});

      // Simulate 100ms delay
      vi.advanceTimersByTime(100);

      const acknowledged = acknowledgeHandoff(handoff, true);
      const metrics = calculateHandoffMetrics(acknowledged);

      expect(metrics.timeToAcknowledge).toBeGreaterThan(0);
    });

    it('should calculate time to complete', () => {
      const handoff = createHandoff('pm-lead', 'ux-designer', 'ctx-1', {});

      vi.advanceTimersByTime(50);
      const acknowledged = acknowledgeHandoff(handoff, true);

      vi.advanceTimersByTime(200);
      const completed = completeHandoff(acknowledged, true);

      const metrics = calculateHandoffMetrics(completed);

      expect(metrics.timeToComplete).toBeGreaterThan(0);
      expect(metrics.timeToComplete).toBeGreaterThan(metrics.timeToAcknowledge!);
    });

    it('should track context size in bytes', () => {
      const smallHandoff = createHandoff('pm-lead', 'ux-designer', 'ctx-1', { a: 1 });
      const largeHandoff = createHandoff('pm-lead', 'ux-designer', 'ctx-2', {
        data: 'x'.repeat(1000),
      });

      const smallMetrics = calculateHandoffMetrics(smallHandoff);
      const largeMetrics = calculateHandoffMetrics(largeHandoff);

      expect(largeMetrics.contextSize).toBeGreaterThan(smallMetrics.contextSize);
    });

    it('should record success status', () => {
      const handoff = createHandoff('pm-lead', 'ux-designer', 'ctx-1', {});
      const acknowledged = acknowledgeHandoff(handoff, true);
      const completed = completeHandoff(acknowledged, true);

      const metrics = calculateHandoffMetrics(completed);

      expect(metrics.success).toBe(true);
    });

    it('should record failure status', () => {
      const handoff = createHandoff('pm-lead', 'ux-designer', 'ctx-1', {});
      const acknowledged = acknowledgeHandoff(handoff, true);
      const failed = completeHandoff(acknowledged, false, undefined, 'Error occurred');

      const metrics = calculateHandoffMetrics(failed);

      expect(metrics.success).toBe(false);
    });

    it('should aggregate metrics across workflow', () => {
      const workflow: WorkflowExecution = {
        id: 'knicks-workflow',
        steps: [],
        currentStep: '',
        status: 'completed',
        handoffs: [],
        metrics: [],
      };

      // Simulate multiple handoffs
      for (let i = 0; i < 5; i++) {
        const handoff = createHandoff('pm-lead', 'frontend-dev', `ctx-${i}`, { i });
        vi.advanceTimersByTime(10);
        const acknowledged = acknowledgeHandoff(handoff, true);
        vi.advanceTimersByTime(20);
        const completed = completeHandoff(acknowledged, true);
        workflow.handoffs.push(completed);
        workflow.metrics.push(calculateHandoffMetrics(completed));
      }

      const totalTime = workflow.metrics.reduce((sum, m) => sum + (m.timeToComplete || 0), 0);
      const avgTime = totalTime / workflow.metrics.length;
      const successRate = workflow.metrics.filter(m => m.success).length / workflow.metrics.length;

      expect(workflow.metrics).toHaveLength(5);
      expect(avgTime).toBeGreaterThan(0);
      expect(successRate).toBe(1);
    });

    it('should track retry count for failed handoffs', () => {
      const metrics: HandoffMetrics = {
        handoffId: 'handoff-1',
        initiatedAt: new Date().toISOString(),
        contextSize: 100,
        success: false,
        retryCount: 0,
      };

      // Simulate retries
      metrics.retryCount++;
      expect(metrics.retryCount).toBe(1);

      metrics.retryCount++;
      expect(metrics.retryCount).toBe(2);

      // Eventually succeed
      metrics.success = true;
      metrics.completedAt = new Date().toISOString();

      expect(metrics.success).toBe(true);
      expect(metrics.retryCount).toBe(2);
    });
  });

  // ==========================================================================
  // Complete Workflow Integration Tests
  // ==========================================================================

  describe('Complete Knicks Website Workflow', () => {
    it('should execute full design-to-test workflow', async () => {
      const workflowLog: string[] = [];

      // Step 1: PM-Lead initializes
      const pmContext = createAgentContext('pm-lead', projectId, {
        requirements: { homepage: 'Knicks themed homepage' },
        brandGuidelines: KNICKS_BRAND,
        userStories: [],
      });
      workflowLog.push('PM-Lead initialized project');

      // Step 2: PM-Lead → UX-Designer
      const pmToUxData = extractContextForHandoff(pmContext, 'ux-designer');
      const pmToUxHandoff = createHandoff('pm-lead', 'ux-designer', pmContext.agentId, pmToUxData);
      const pmToUxAck = acknowledgeHandoff(pmToUxHandoff, true);
      workflowLog.push('UX-Designer accepted handoff from PM-Lead');

      // Step 3: UX-Designer creates designs
      const uxContext = createAgentContext('ux-designer', projectId, {
        designSystem: { colors: KNICKS_BRAND.colors },
        components: [{ name: 'PlayerCard' }, { name: 'GameSchedule' }],
        specifications: {},
      });
      const pmToUxComplete = completeHandoff(pmToUxAck, true, { designs: 'complete' });
      workflowLog.push('UX-Designer completed designs');

      // Step 4: UX-Designer → Frontend-Dev
      const uxToFeData = extractContextForHandoff(uxContext, 'frontend-dev');
      const uxToFeHandoff = createHandoff('ux-designer', 'frontend-dev', uxContext.agentId, uxToFeData);
      const uxToFeAck = acknowledgeHandoff(uxToFeHandoff, true);
      workflowLog.push('Frontend-Dev accepted handoff from UX-Designer');

      // Step 5: Frontend-Dev implements
      const feContext = createAgentContext('frontend-dev', projectId, {
        implementations: [
          { component: 'PlayerCard', coverage: 85 },
          { component: 'GameSchedule', coverage: 90 },
        ],
        testCriteria: { minCoverage: 80 },
      });
      const uxToFeComplete = completeHandoff(uxToFeAck, true, { components: ['PlayerCard', 'GameSchedule'] });
      workflowLog.push('Frontend-Dev completed implementation');

      // Step 6: Frontend-Dev → Test-Engineer
      const feToTestData = extractContextForHandoff(feContext, 'test-engineer');
      const feToTestHandoff = createHandoff('frontend-dev', 'test-engineer', feContext.agentId, feToTestData);
      const feToTestAck = acknowledgeHandoff(feToTestHandoff, true);
      const feToTestComplete = completeHandoff(feToTestAck, true, {
        testResults: { passed: 50, failed: 0 },
      });
      workflowLog.push('Test-Engineer completed testing');

      expect(workflowLog).toHaveLength(6);
      expect(pmToUxComplete.status).toBe('completed');
      expect(uxToFeComplete.status).toBe('completed');
      expect(feToTestComplete.status).toBe('completed');
    });

    it('should handle workflow with parallel branches', async () => {
      const pmContext = createAgentContext('pm-lead', projectId, {
        brandGuidelines: KNICKS_BRAND,
        requirements: {},
        userStories: [],
      });

      // Fan out to UX and Backend in parallel
      const toUxData = extractContextForHandoff(pmContext, 'ux-designer');
      const toBeData: Record<string, unknown> = {
        projectId: pmContext.projectId,
        apiRequirements: { endpoints: ['/players', '/games', '/tickets'] },
      };

      const uxHandoff = createHandoff('pm-lead', 'ux-designer', pmContext.agentId, toUxData);
      const beHandoff = createHandoff('pm-lead', 'backend-dev', pmContext.agentId, toBeData);

      vi.useRealTimers();
      const [uxResult, beResult] = await executeParallelHandoffs([uxHandoff, beHandoff]);
      vi.useFakeTimers({ shouldAdvanceTime: true });

      expect(uxResult.status).toBe('completed');
      expect(beResult.status).toBe('completed');
    });

    it('should validate permissions across workflow', () => {
      const validPaths = [
        ['pm-lead', 'ux-designer'],
        ['ux-designer', 'frontend-dev'],
        ['frontend-dev', 'test-engineer'],
        ['test-engineer', 'pm-lead'],
        ['backend-dev', 'frontend-dev'],
      ];

      const invalidPaths = [
        ['test-engineer', 'ux-designer'],
        ['docs-engineer', 'frontend-dev'],
      ];

      validPaths.forEach(([from, to]) => {
        expect(validateHandoffPermission(from, to)).toBe(true);
      });

      invalidPaths.forEach(([from, to]) => {
        expect(validateHandoffPermission(from, to)).toBe(false);
      });
    });

    it('should collect comprehensive workflow metrics', () => {
      const workflow: WorkflowExecution = {
        id: 'knicks-full-workflow',
        steps: [
          { id: 'plan', agentType: 'pm-lead', action: 'plan', dependsOn: [], outputTo: ['design'] },
          { id: 'design', agentType: 'ux-designer', action: 'design', dependsOn: ['plan'], outputTo: ['implement'] },
          { id: 'implement', agentType: 'frontend-dev', action: 'build', dependsOn: ['design'], outputTo: ['test'] },
          { id: 'test', agentType: 'test-engineer', action: 'test', dependsOn: ['implement'], outputTo: [] },
        ],
        currentStep: 'test',
        status: 'completed',
        handoffs: [],
        metrics: [],
      };

      // Simulate handoffs through workflow
      const agentPairs = [
        ['pm-lead', 'ux-designer'],
        ['ux-designer', 'frontend-dev'],
        ['frontend-dev', 'test-engineer'],
      ];

      agentPairs.forEach(([from, to]) => {
        const handoff = createHandoff(from, to, `ctx-${from}`, { step: from });
        vi.advanceTimersByTime(50);
        const ack = acknowledgeHandoff(handoff, true);
        vi.advanceTimersByTime(100);
        const complete = completeHandoff(ack, true);
        workflow.handoffs.push(complete);
        workflow.metrics.push(calculateHandoffMetrics(complete));
      });

      expect(workflow.metrics.length).toBe(3);
      expect(workflow.metrics.every(m => m.success)).toBe(true);

      const totalHandoffTime = workflow.metrics.reduce(
        (sum, m) => sum + (m.timeToComplete || 0),
        0
      );
      expect(totalHandoffTime).toBeGreaterThan(0);
    });
  });
});
