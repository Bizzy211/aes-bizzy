/**
 * Context Awareness Integration Tests
 *
 * Tests verifying that agents maintain awareness of project context (CLAUDE.md,
 * ecosystem.json), codebase structure, and previous decisions throughout
 * multi-agent workflows and session handoffs.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

// Mock dependencies
vi.mock('../../src/utils/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
  }),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../src/utils/shell.js', () => ({
  executeCommand: vi.fn(),
}));

// Import after mocks
import { executeCommand } from '../../src/utils/shell.js';
import {
  loadConfig,
  validateConfig,
  createDefaultConfig,
  getEcosystemConfigPath,
  getClaudeConfigDir,
} from '../../src/config/ecosystem-config.js';
import type { EcosystemConfig, InstalledComponent, McpServerEntry } from '../../src/types/ecosystem.js';
import type { ProjectContext } from '../../src/types/project.js';

// ============================================================================
// Test Fixtures and Helpers
// ============================================================================

interface TestProject {
  root: string;
  claudeMd: string;
  ecosystemJson: EcosystemConfig;
  projectContext: ProjectContext;
  sourceFiles: Map<string, string>;
}

interface MockAgentContext {
  projectRoot: string;
  claudeMdContent: string;
  ecosystemConfig: EcosystemConfig;
  codebaseStructure: string[];
  previousDecisions: string[];
  handoffHistory: MockHandoffEntry[];
}

interface MockHandoffEntry {
  from: string;
  to: string;
  context: string;
  completedWork: string;
  timestamp: string;
}

interface MockBeadsMemory {
  id: string;
  content: string;
  tags: string[];
  timestamp: string;
  projectContext?: Record<string, unknown>;
}

/**
 * Create a complete test project structure
 */
function createTestProject(testDir: string, name: string): TestProject {
  const projectRoot = path.join(testDir, name);
  mkdirSync(projectRoot, { recursive: true });

  // Create CLAUDE.md with project-specific instructions
  const claudeMdContent = `# ${name}

## Project Overview
A test project for context awareness verification.

## Development Guidelines

### Coding Standards
- Use TypeScript strict mode
- Follow ESLint rules
- Prefer functional components for React

### Architecture Patterns
- Use Repository pattern for data access
- Implement CQRS for complex domains
- Apply DDD principles

### Domain Terminology
- "Widget" refers to UI components
- "Handler" refers to API endpoints
- "Service" refers to business logic

## Custom Workflows
- /deploy: Deploy to staging
- /test: Run full test suite
- /lint: Run linting

## Technology Stack
- Node.js 20+
- TypeScript 5+
- React 18
- PostgreSQL 15

## Notes
- Created: ${new Date().toISOString()}
- Template: basic
`;

  // Create ecosystem.json
  const ecosystemJson: EcosystemConfig = {
    version: '1.0.0',
    installedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    components: {
      cli: [
        {
          name: 'claude-code',
          version: '1.0.0',
          type: 'cli',
          installedAt: new Date().toISOString(),
          enabled: true,
        },
      ],
      memory: [
        {
          name: 'beads',
          version: '0.2.0',
          type: 'memory',
          installedAt: new Date().toISOString(),
          enabled: true,
        },
      ],
      taskManagement: [
        {
          name: 'task-master',
          version: '0.40.0',
          type: 'taskManagement',
          installedAt: new Date().toISOString(),
          enabled: true,
        },
      ],
    },
    mcpServers: [
      {
        name: 'supabase',
        command: 'npx',
        args: ['-y', '@supabase/mcp-server'],
        enabled: true,
      },
      {
        name: 'github',
        command: 'npx',
        args: ['-y', '@github/mcp-server'],
        enabled: true,
      },
    ],
    settings: {
      autoSync: false,
      syncInterval: 3600,
      defaultConflictStrategy: 'backup',
      backupEnabled: true,
      maxBackups: 10,
    },
  };

  // Create project context
  const projectContext: ProjectContext = {
    name,
    createdAt: new Date().toISOString(),
    ecosystem: true,
    template: 'basic',
    taskmaster: true,
    beads: true,
  };

  // Create source files
  const sourceFiles = new Map<string, string>();

  // Create directory structure
  const dirs = [
    'src/components',
    'src/api',
    'src/utils',
    'src/services',
    'tests/unit',
    'tests/integration',
    '.beads',
    '.taskmaster/tasks',
    '.taskmaster/docs',
  ];

  for (const dir of dirs) {
    mkdirSync(path.join(projectRoot, dir), { recursive: true });
  }

  // Write CLAUDE.md
  writeFileSync(path.join(projectRoot, 'CLAUDE.md'), claudeMdContent);

  // Write ecosystem.json (in project root for testing)
  writeFileSync(
    path.join(projectRoot, 'ecosystem.json'),
    JSON.stringify(ecosystemJson, null, 2)
  );

  // Write .project-context
  writeFileSync(
    path.join(projectRoot, '.project-context'),
    JSON.stringify(projectContext, null, 2)
  );

  // Create sample source files
  const sampleFiles = {
    'src/components/Button.tsx': `
import React from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
}

export const Button: React.FC<ButtonProps> = ({ label, onClick }) => {
  return <button onClick={onClick}>{label}</button>;
};
`,
    'src/api/users.ts': `
import { UserService } from '../services/UserService';

export async function getUsers() {
  const service = new UserService();
  return service.findAll();
}

export async function getUserById(id: string) {
  const service = new UserService();
  return service.findById(id);
}
`,
    'src/services/UserService.ts': `
import { UserRepository } from '../utils/repositories';

export class UserService {
  private repo: UserRepository;

  constructor() {
    this.repo = new UserRepository();
  }

  async findAll() {
    return this.repo.findAll();
  }

  async findById(id: string) {
    return this.repo.findById(id);
  }
}
`,
    'src/utils/repositories.ts': `
export class UserRepository {
  async findAll() {
    return [{ id: '1', name: 'User 1' }];
  }

  async findById(id: string) {
    return { id, name: 'User ' + id };
  }
}
`,
  };

  for (const [filePath, content] of Object.entries(sampleFiles)) {
    const fullPath = path.join(projectRoot, filePath);
    writeFileSync(fullPath, content);
    sourceFiles.set(filePath, content);
  }

  // Create package.json
  writeFileSync(
    path.join(projectRoot, 'package.json'),
    JSON.stringify(
      {
        name,
        version: '1.0.0',
        type: 'module',
        dependencies: {
          react: '^18.0.0',
          typescript: '^5.0.0',
        },
      },
      null,
      2
    )
  );

  // Create Task Master tasks.json
  writeFileSync(
    path.join(projectRoot, '.taskmaster/tasks/tasks.json'),
    JSON.stringify({
      tasks: [
        {
          id: '1',
          title: 'Implement user authentication',
          status: 'done',
          description: 'Add JWT-based authentication',
        },
        {
          id: '2',
          title: 'Create dashboard component',
          status: 'in-progress',
          description: 'Build main dashboard UI',
          dependencies: ['1'],
        },
      ],
    }, null, 2)
  );

  return {
    root: projectRoot,
    claudeMd: claudeMdContent,
    ecosystemJson,
    projectContext,
    sourceFiles,
  };
}

/**
 * Simulate agent reading project context
 */
function mockAgentReadContext(project: TestProject): MockAgentContext {
  // Simulate agent parsing CLAUDE.md
  const claudeMdContent = project.claudeMd;

  // Simulate agent understanding codebase structure
  const codebaseStructure: string[] = [];
  for (const [filePath] of project.sourceFiles) {
    codebaseStructure.push(filePath);
  }

  return {
    projectRoot: project.root,
    claudeMdContent,
    ecosystemConfig: project.ecosystemJson,
    codebaseStructure,
    previousDecisions: [],
    handoffHistory: [],
  };
}

/**
 * Simulate agent responding to query with context awareness
 */
function mockAgentResponse(
  query: string,
  context: MockAgentContext
): { response: string; contextReferences: string[] } {
  const contextReferences: string[] = [];
  let response = '';
  const lowerQuery = query.toLowerCase();

  // Simulate agent using context to answer queries
  if (lowerQuery.includes('coding standards') || lowerQuery.includes('guidelines')) {
    if (context.claudeMdContent.includes('TypeScript strict mode')) {
      contextReferences.push('CLAUDE.md:Coding Standards');
      response = 'Based on CLAUDE.md, use TypeScript strict mode and follow ESLint rules.';
    }
  }

  if (lowerQuery.includes('tools') || lowerQuery.includes('capabilities') || lowerQuery.includes('available')) {
    if (context.ecosystemConfig.mcpServers && context.ecosystemConfig.mcpServers.length > 0) {
      contextReferences.push('ecosystem.json:mcpServers');
      const servers = context.ecosystemConfig.mcpServers.map((s) => s.name).join(', ');
      response = `Available MCP servers: ${servers}`;
    }
    if (context.ecosystemConfig.components) {
      contextReferences.push('ecosystem.json:components');
    }
  }

  if (lowerQuery.includes('project structure') || lowerQuery.includes('codebase')) {
    contextReferences.push('codebase:structure');
    response = `Project structure includes: ${context.codebaseStructure.join(', ')}`;
  }

  if (lowerQuery.includes('technology stack')) {
    if (context.claudeMdContent.includes('Node.js')) {
      contextReferences.push('CLAUDE.md:Technology Stack');
      response = 'Technology stack: Node.js 20+, TypeScript 5+, React 18, PostgreSQL 15';
    }
  }

  return { response, contextReferences };
}

/**
 * Simulate handoff between agents
 */
function executeHandoff(
  fromAgent: string,
  toAgent: string,
  completedWork: string,
  projectContext: MockAgentContext
): { success: boolean; handoffContext: MockHandoffEntry } {
  const handoffEntry: MockHandoffEntry = {
    from: fromAgent,
    to: toAgent,
    context: JSON.stringify({
      claudeMd: projectContext.claudeMdContent.substring(0, 200),
      ecosystemConfig: projectContext.ecosystemConfig.version,
      codebaseStructure: projectContext.codebaseStructure,
      previousDecisions: projectContext.previousDecisions,
    }),
    completedWork,
    timestamp: new Date().toISOString(),
  };

  projectContext.handoffHistory.push(handoffEntry);
  projectContext.previousDecisions.push(`${fromAgent}: ${completedWork}`);

  return { success: true, handoffContext: handoffEntry };
}

/**
 * Validate project context completeness
 */
function validateProjectContext(projectRoot: string): {
  valid: boolean;
  issues: string[];
  warnings: string[];
} {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check CLAUDE.md
  if (!existsSync(path.join(projectRoot, 'CLAUDE.md'))) {
    issues.push('CLAUDE.md is missing');
  }

  // Check ecosystem.json
  const ecosystemPath = path.join(projectRoot, 'ecosystem.json');
  if (existsSync(ecosystemPath)) {
    try {
      const content = JSON.parse(
        require('fs').readFileSync(ecosystemPath, 'utf-8')
      );
      const validation = validateConfig(content);
      if (!validation.valid) {
        issues.push('ecosystem.json is invalid');
      }
    } catch {
      issues.push('ecosystem.json is corrupted');
    }
  } else {
    warnings.push('ecosystem.json is missing (using global config)');
  }

  // Check .project-context
  if (!existsSync(path.join(projectRoot, '.project-context'))) {
    warnings.push('.project-context is missing');
  }

  // Check source directory
  if (!existsSync(path.join(projectRoot, 'src'))) {
    warnings.push('src directory is missing');
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings,
  };
}

/**
 * Create mock Beads memory entries
 */
function createMockBeadsMemory(
  projectRoot: string,
  entries: MockBeadsMemory[]
): void {
  const beadsDir = path.join(projectRoot, '.beads');
  if (!existsSync(beadsDir)) {
    mkdirSync(beadsDir, { recursive: true });
  }

  const jsonlContent = entries
    .map((entry) => JSON.stringify(entry))
    .join('\n');

  writeFileSync(path.join(beadsDir, 'memory.jsonl'), jsonlContent);
}

// ============================================================================
// Test Suites
// ============================================================================

describe('Context Awareness', () => {
  const testDir = path.join(tmpdir(), 'context-awareness-test');

  beforeEach(() => {
    vi.clearAllMocks();

    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });

    // Default mock for executeCommand
    vi.mocked(executeCommand).mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: '',
      args: [],
    });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // 1. Test Environment Setup
  // ==========================================================================

  describe('Test Environment Setup', () => {
    it('should create complete project structure', () => {
      const project = createTestProject(testDir, 'test-project');

      expect(existsSync(project.root)).toBe(true);
      expect(existsSync(path.join(project.root, 'CLAUDE.md'))).toBe(true);
      expect(existsSync(path.join(project.root, 'ecosystem.json'))).toBe(true);
      expect(existsSync(path.join(project.root, '.project-context'))).toBe(true);
      expect(existsSync(path.join(project.root, 'src'))).toBe(true);
      expect(existsSync(path.join(project.root, 'tests'))).toBe(true);
    });

    it('should create sample source files', () => {
      const project = createTestProject(testDir, 'test-project');

      expect(existsSync(path.join(project.root, 'src/components/Button.tsx'))).toBe(true);
      expect(existsSync(path.join(project.root, 'src/api/users.ts'))).toBe(true);
      expect(existsSync(path.join(project.root, 'src/services/UserService.ts'))).toBe(true);
    });

    it('should create Task Master structure', () => {
      const project = createTestProject(testDir, 'test-project');

      expect(existsSync(path.join(project.root, '.taskmaster/tasks/tasks.json'))).toBe(true);
    });

    it('should create Beads structure', () => {
      const project = createTestProject(testDir, 'test-project');

      expect(existsSync(path.join(project.root, '.beads'))).toBe(true);
    });
  });

  // ==========================================================================
  // 2. CLAUDE.md Context Reading Tests
  // ==========================================================================

  describe('CLAUDE.md Context Reading', () => {
    it('should read and parse CLAUDE.md content correctly', async () => {
      const project = createTestProject(testDir, 'test-project');
      const claudeMdPath = path.join(project.root, 'CLAUDE.md');

      const content = await fs.readFile(claudeMdPath, 'utf-8');

      expect(content).toContain('# test-project');
      expect(content).toContain('Development Guidelines');
      expect(content).toContain('Coding Standards');
    });

    it('should extract coding standards from CLAUDE.md', async () => {
      const project = createTestProject(testDir, 'test-project');
      const context = mockAgentReadContext(project);

      expect(context.claudeMdContent).toContain('TypeScript strict mode');
      expect(context.claudeMdContent).toContain('ESLint rules');
    });

    it('should extract architecture patterns from CLAUDE.md', async () => {
      const project = createTestProject(testDir, 'test-project');
      const context = mockAgentReadContext(project);

      expect(context.claudeMdContent).toContain('Repository pattern');
      expect(context.claudeMdContent).toContain('CQRS');
      expect(context.claudeMdContent).toContain('DDD principles');
    });

    it('should extract custom workflows from CLAUDE.md', async () => {
      const project = createTestProject(testDir, 'test-project');
      const context = mockAgentReadContext(project);

      expect(context.claudeMdContent).toContain('/deploy');
      expect(context.claudeMdContent).toContain('/test');
      expect(context.claudeMdContent).toContain('/lint');
    });

    it('should extract technology stack constraints from CLAUDE.md', async () => {
      const project = createTestProject(testDir, 'test-project');
      const context = mockAgentReadContext(project);

      expect(context.claudeMdContent).toContain('Node.js 20+');
      expect(context.claudeMdContent).toContain('TypeScript 5+');
      expect(context.claudeMdContent).toContain('React 18');
    });

    it('should reference CLAUDE.md in agent responses', () => {
      const project = createTestProject(testDir, 'test-project');
      const context = mockAgentReadContext(project);

      const { response, contextReferences } = mockAgentResponse(
        'What are the coding standards?',
        context
      );

      expect(response).toContain('TypeScript strict mode');
      expect(contextReferences).toContain('CLAUDE.md:Coding Standards');
    });
  });

  // ==========================================================================
  // 3. Ecosystem.json Awareness Tests
  // ==========================================================================

  describe('Ecosystem.json Awareness', () => {
    it('should load ecosystem.json configuration', async () => {
      const project = createTestProject(testDir, 'test-project');
      const ecosystemPath = path.join(project.root, 'ecosystem.json');

      const content = await fs.readFile(ecosystemPath, 'utf-8');
      const config = JSON.parse(content) as EcosystemConfig;

      expect(config.version).toBe('1.0.0');
      expect(config.components).toBeDefined();
    });

    it('should list installed components from ecosystem.json', () => {
      const project = createTestProject(testDir, 'test-project');
      const context = mockAgentReadContext(project);

      expect(context.ecosystemConfig.components.cli).toBeDefined();
      expect(context.ecosystemConfig.components.memory).toBeDefined();
      expect(context.ecosystemConfig.components.taskManagement).toBeDefined();
    });

    it('should list available MCP servers', () => {
      const project = createTestProject(testDir, 'test-project');
      const context = mockAgentReadContext(project);

      const servers = context.ecosystemConfig.mcpServers || [];
      expect(servers.length).toBeGreaterThan(0);
      expect(servers.find((s) => s.name === 'supabase')).toBeDefined();
      expect(servers.find((s) => s.name === 'github')).toBeDefined();
    });

    it('should reference ecosystem.json in tool availability responses', () => {
      const project = createTestProject(testDir, 'test-project');
      const context = mockAgentReadContext(project);

      const { response, contextReferences } = mockAgentResponse(
        'What tools are available?',
        context
      );

      expect(response).toContain('supabase');
      expect(response).toContain('github');
      expect(contextReferences).toContain('ecosystem.json:mcpServers');
    });

    it('should validate ecosystem.json schema', () => {
      const project = createTestProject(testDir, 'test-project');

      const validation = validateConfig(project.ecosystemJson);

      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should detect enabled vs disabled components', () => {
      const project = createTestProject(testDir, 'test-project');
      const context = mockAgentReadContext(project);

      const cliComponents = context.ecosystemConfig.components.cli || [];
      const claudeCode = cliComponents.find((c) => c.name === 'claude-code');

      expect(claudeCode?.enabled).toBe(true);
    });
  });

  // ==========================================================================
  // 4. Codebase Structure Understanding
  // ==========================================================================

  describe('Codebase Structure Understanding', () => {
    it('should identify project directory structure', () => {
      const project = createTestProject(testDir, 'test-project');
      const context = mockAgentReadContext(project);

      expect(context.codebaseStructure).toContain('src/components/Button.tsx');
      expect(context.codebaseStructure).toContain('src/api/users.ts');
      expect(context.codebaseStructure).toContain('src/services/UserService.ts');
    });

    it('should describe codebase architecture in responses', () => {
      const project = createTestProject(testDir, 'test-project');
      const context = mockAgentReadContext(project);

      const { response, contextReferences } = mockAgentResponse(
        'What is the project structure?',
        context
      );

      expect(response).toContain('src/components');
      expect(contextReferences).toContain('codebase:structure');
    });

    it('should understand file relationships and imports', async () => {
      const project = createTestProject(testDir, 'test-project');

      const apiContent = await fs.readFile(
        path.join(project.root, 'src/api/users.ts'),
        'utf-8'
      );

      expect(apiContent).toContain("import { UserService }");
      expect(apiContent).toContain("from '../services/UserService'");
    });

    it('should identify module boundaries', () => {
      const project = createTestProject(testDir, 'test-project');
      const context = mockAgentReadContext(project);

      // Components are in components/, APIs in api/, etc.
      const components = context.codebaseStructure.filter((f) =>
        f.includes('components/')
      );
      const apis = context.codebaseStructure.filter((f) =>
        f.includes('api/')
      );
      const services = context.codebaseStructure.filter((f) =>
        f.includes('services/')
      );

      expect(components.length).toBeGreaterThan(0);
      expect(apis.length).toBeGreaterThan(0);
      expect(services.length).toBeGreaterThan(0);
    });

    it('should locate relevant files for functionality queries', () => {
      const project = createTestProject(testDir, 'test-project');
      const context = mockAgentReadContext(project);

      // Find user-related files
      const userFiles = context.codebaseStructure.filter(
        (f) => f.toLowerCase().includes('user')
      );

      expect(userFiles.length).toBeGreaterThan(0);
      expect(userFiles).toContain('src/api/users.ts');
      expect(userFiles).toContain('src/services/UserService.ts');
    });
  });

  // ==========================================================================
  // 5. Previous Work References
  // ==========================================================================

  describe('Previous Work References', () => {
    it('should maintain memory of previous decisions', () => {
      const project = createTestProject(testDir, 'test-project');
      const context = mockAgentReadContext(project);

      // Simulate first agent making a decision
      context.previousDecisions.push(
        'frontend-dev: Created Button component with TypeScript'
      );
      context.previousDecisions.push(
        'backend-dev: Implemented UserService with Repository pattern'
      );

      expect(context.previousDecisions.length).toBe(2);
      expect(context.previousDecisions[0]).toContain('Button component');
    });

    it('should reference earlier work in multi-turn conversations', () => {
      const project = createTestProject(testDir, 'test-project');
      const context = mockAgentReadContext(project);

      // First agent creates implementation
      context.previousDecisions.push(
        'Agent 1: Created feature.ts with JWT implementation'
      );

      // Second agent modifies related code
      context.previousDecisions.push(
        'Agent 2: Updated utils.ts to support JWT tokens'
      );

      // Third agent should see history
      const allDecisions = context.previousDecisions.join(' ');
      expect(allDecisions).toContain('JWT');
      expect(allDecisions).toContain('feature.ts');
      expect(allDecisions).toContain('utils.ts');
    });

    it('should cite specific files from previous work', () => {
      const project = createTestProject(testDir, 'test-project');
      const context = mockAgentReadContext(project);

      context.previousDecisions.push(
        'pm-lead: Assigned authentication to backend-dev (see src/auth/jwt.ts:15-45)'
      );

      const decision = context.previousDecisions[0];
      expect(decision).toContain('src/auth/jwt.ts');
      expect(decision).toContain('15-45');
    });

    it('should maintain consistency with previous architectural decisions', () => {
      const project = createTestProject(testDir, 'test-project');
      const context = mockAgentReadContext(project);

      // Previous decision established pattern
      context.previousDecisions.push(
        'pm-lead: Use Repository pattern for all data access'
      );

      // New agent should follow the pattern
      const hasRepositoryDecision = context.previousDecisions.some((d) =>
        d.includes('Repository pattern')
      );

      expect(hasRepositoryDecision).toBe(true);
    });

    it('should not duplicate logic from previous implementations', () => {
      const project = createTestProject(testDir, 'test-project');
      const context = mockAgentReadContext(project);

      context.previousDecisions.push(
        'frontend-dev: Added date formatting utility in src/utils/date.ts'
      );

      // Check if utility exists before creating new one
      const existingUtility = context.previousDecisions.find((d) =>
        d.includes('date formatting')
      );

      expect(existingUtility).toBeDefined();
      expect(existingUtility).toContain('src/utils/date.ts');
    });
  });

  // ==========================================================================
  // 6. Agent Handoff Context Inheritance
  // ==========================================================================

  describe('Agent Handoff Context Inheritance', () => {
    it('should transfer context during agent handoff', () => {
      const project = createTestProject(testDir, 'test-project');
      const context = mockAgentReadContext(project);

      const { success, handoffContext } = executeHandoff(
        'pm-lead',
        'frontend-dev',
        'Decomposed feature into UI tasks',
        context
      );

      expect(success).toBe(true);
      expect(handoffContext.from).toBe('pm-lead');
      expect(handoffContext.to).toBe('frontend-dev');
      expect(handoffContext.context).toBeDefined();
    });

    it('should include project context in handoff', () => {
      const project = createTestProject(testDir, 'test-project');
      const context = mockAgentReadContext(project);

      const { handoffContext } = executeHandoff(
        'pm-lead',
        'frontend-dev',
        'Created component specs',
        context
      );

      const parsedContext = JSON.parse(handoffContext.context);
      expect(parsedContext.claudeMd).toBeDefined();
      expect(parsedContext.ecosystemConfig).toBeDefined();
      expect(parsedContext.codebaseStructure).toBeDefined();
    });

    it('should accumulate context through handoff chain', () => {
      const project = createTestProject(testDir, 'test-project');
      const context = mockAgentReadContext(project);

      // pm-lead → frontend-dev
      executeHandoff('pm-lead', 'frontend-dev', 'Created UI specs', context);

      // frontend-dev → backend-dev
      executeHandoff('frontend-dev', 'backend-dev', 'Implemented UI components', context);

      // backend-dev → test-engineer
      executeHandoff('backend-dev', 'test-engineer', 'Created API endpoints', context);

      expect(context.handoffHistory.length).toBe(3);
      expect(context.previousDecisions.length).toBe(3);

      // Last agent sees all previous work
      expect(context.previousDecisions[0]).toContain('UI specs');
      expect(context.previousDecisions[1]).toContain('UI components');
      expect(context.previousDecisions[2]).toContain('API endpoints');
    });

    it('should preserve CLAUDE.md guidelines through handoffs', () => {
      const project = createTestProject(testDir, 'test-project');
      const context = mockAgentReadContext(project);

      executeHandoff('pm-lead', 'frontend-dev', 'Started work', context);

      // Frontend-dev should still have access to CLAUDE.md
      expect(context.claudeMdContent).toContain('TypeScript strict mode');
      expect(context.claudeMdContent).toContain('ESLint rules');
    });

    it('should preserve ecosystem config through handoffs', () => {
      const project = createTestProject(testDir, 'test-project');
      const context = mockAgentReadContext(project);

      executeHandoff('pm-lead', 'frontend-dev', 'Started work', context);

      // Frontend-dev should still see available tools
      expect(context.ecosystemConfig.mcpServers).toBeDefined();
      expect(context.ecosystemConfig.components).toBeDefined();
    });

    it('should record handoff timestamps', () => {
      const project = createTestProject(testDir, 'test-project');
      const context = mockAgentReadContext(project);

      const beforeHandoff = new Date().toISOString();
      executeHandoff('pm-lead', 'frontend-dev', 'Started work', context);
      const afterHandoff = new Date().toISOString();

      const timestamp = context.handoffHistory[0].timestamp;
      expect(timestamp >= beforeHandoff).toBe(true);
      expect(timestamp <= afterHandoff).toBe(true);
    });

    it('should track completed work in handoff context', () => {
      const project = createTestProject(testDir, 'test-project');
      const context = mockAgentReadContext(project);

      executeHandoff(
        'frontend-dev',
        'backend-dev',
        'Created React components: Header, Footer, Sidebar',
        context
      );

      const handoff = context.handoffHistory[0];
      expect(handoff.completedWork).toContain('React components');
      expect(handoff.completedWork).toContain('Header');
      expect(handoff.completedWork).toContain('Footer');
    });
  });

  // ==========================================================================
  // 7. Context Persistence Across Sessions
  // ==========================================================================

  describe('Context Persistence Across Sessions', () => {
    it('should create Beads memory entries', () => {
      const project = createTestProject(testDir, 'test-project');

      const memories: MockBeadsMemory[] = [
        {
          id: 'bead-001',
          content: 'Implemented user authentication with JWT',
          tags: ['auth', 'jwt', 'backend'],
          timestamp: new Date().toISOString(),
          projectContext: { projectName: 'test-project' },
        },
      ];

      createMockBeadsMemory(project.root, memories);

      expect(existsSync(path.join(project.root, '.beads/memory.jsonl'))).toBe(true);
    });

    it('should load context from Beads in new session', async () => {
      const project = createTestProject(testDir, 'test-project');

      const memories: MockBeadsMemory[] = [
        {
          id: 'bead-001',
          content: 'Previous session: Created API endpoints',
          tags: ['api', 'backend'],
          timestamp: new Date().toISOString(),
        },
        {
          id: 'bead-002',
          content: 'Previous session: Set up database schema',
          tags: ['database', 'schema'],
          timestamp: new Date().toISOString(),
        },
      ];

      createMockBeadsMemory(project.root, memories);

      const content = await fs.readFile(
        path.join(project.root, '.beads/memory.jsonl'),
        'utf-8'
      );

      expect(content).toContain('bead-001');
      expect(content).toContain('Created API endpoints');
      expect(content).toContain('database schema');
    });

    it('should reference previous session work using bead IDs', async () => {
      const project = createTestProject(testDir, 'test-project');

      const memories: MockBeadsMemory[] = [
        {
          id: 'bead-auth-001',
          content: 'Auth implementation details',
          tags: ['auth'],
          timestamp: new Date().toISOString(),
        },
      ];

      createMockBeadsMemory(project.root, memories);

      const content = await fs.readFile(
        path.join(project.root, '.beads/memory.jsonl'),
        'utf-8'
      );

      expect(content).toContain('bead-auth-001');
    });

    it('should preserve project metadata in Beads', async () => {
      const project = createTestProject(testDir, 'test-project');

      const memories: MockBeadsMemory[] = [
        {
          id: 'bead-001',
          content: 'Session summary',
          tags: ['session'],
          timestamp: new Date().toISOString(),
          projectContext: {
            projectName: 'test-project',
            template: 'basic',
            ecosystem: true,
          },
        },
      ];

      createMockBeadsMemory(project.root, memories);

      const content = await fs.readFile(
        path.join(project.root, '.beads/memory.jsonl'),
        'utf-8'
      );
      const parsed = JSON.parse(content.split('\n')[0]);

      expect(parsed.projectContext.projectName).toBe('test-project');
      expect(parsed.projectContext.ecosystem).toBe(true);
    });

    it('should support multiple Beads entries', async () => {
      const project = createTestProject(testDir, 'test-project');

      const memories: MockBeadsMemory[] = [
        { id: 'bead-001', content: 'First entry', tags: ['a'], timestamp: new Date().toISOString() },
        { id: 'bead-002', content: 'Second entry', tags: ['b'], timestamp: new Date().toISOString() },
        { id: 'bead-003', content: 'Third entry', tags: ['c'], timestamp: new Date().toISOString() },
      ];

      createMockBeadsMemory(project.root, memories);

      const content = await fs.readFile(
        path.join(project.root, '.beads/memory.jsonl'),
        'utf-8'
      );
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(3);
    });
  });

  // ==========================================================================
  // 8. Multi-Agent Orchestration Context
  // ==========================================================================

  describe('Multi-Agent Orchestration Context', () => {
    it('should share context across parallel agents', () => {
      const project = createTestProject(testDir, 'test-project');
      const sharedContext = mockAgentReadContext(project);

      // Simulate pm-lead spawning parallel agents
      const frontendContext = { ...sharedContext };
      const backendContext = { ...sharedContext };
      const testContext = { ...sharedContext };

      // All should have same CLAUDE.md
      expect(frontendContext.claudeMdContent).toBe(sharedContext.claudeMdContent);
      expect(backendContext.claudeMdContent).toBe(sharedContext.claudeMdContent);
      expect(testContext.claudeMdContent).toBe(sharedContext.claudeMdContent);
    });

    it('should provide same ecosystem.json to all agents', () => {
      const project = createTestProject(testDir, 'test-project');
      const sharedContext = mockAgentReadContext(project);

      const frontendContext = { ...sharedContext };
      const backendContext = { ...sharedContext };

      expect(frontendContext.ecosystemConfig.version).toBe(
        backendContext.ecosystemConfig.version
      );
      expect(frontendContext.ecosystemConfig.mcpServers).toEqual(
        backendContext.ecosystemConfig.mcpServers
      );
    });

    it('should track modifications from parallel agents', () => {
      const project = createTestProject(testDir, 'test-project');
      const sharedContext = mockAgentReadContext(project);

      // Simulate parallel modifications
      sharedContext.previousDecisions.push('frontend-dev: Created Header.tsx');
      sharedContext.previousDecisions.push('backend-dev: Created api/header.ts');

      // Both modifications are tracked
      expect(sharedContext.previousDecisions.length).toBe(2);
      expect(sharedContext.previousDecisions).toContain('frontend-dev: Created Header.tsx');
      expect(sharedContext.previousDecisions).toContain('backend-dev: Created api/header.ts');
    });

    it('should prevent duplicate implementations through shared context', () => {
      const project = createTestProject(testDir, 'test-project');
      const sharedContext = mockAgentReadContext(project);

      // First agent implements date utility
      sharedContext.previousDecisions.push(
        'frontend-dev: Created date utility in src/utils/date.ts'
      );

      // Second agent checks before implementing
      const existingDateUtil = sharedContext.previousDecisions.find((d) =>
        d.includes('date utility')
      );

      expect(existingDateUtil).toBeDefined();
      // Second agent should not duplicate
    });
  });

  // ==========================================================================
  // 9. Context Validation and Debugging
  // ==========================================================================

  describe('Context Validation and Debugging', () => {
    it('should validate complete project context', () => {
      const project = createTestProject(testDir, 'test-project');

      const validation = validateProjectContext(project.root);

      expect(validation.valid).toBe(true);
      expect(validation.issues.length).toBe(0);
    });

    it('should detect missing CLAUDE.md', () => {
      const projectRoot = path.join(testDir, 'missing-claude');
      mkdirSync(projectRoot, { recursive: true });

      const validation = validateProjectContext(projectRoot);

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('CLAUDE.md is missing');
    });

    it('should detect corrupted ecosystem.json', async () => {
      const projectRoot = path.join(testDir, 'corrupted-ecosystem');
      mkdirSync(projectRoot, { recursive: true });
      writeFileSync(path.join(projectRoot, 'CLAUDE.md'), '# Test');
      writeFileSync(path.join(projectRoot, 'ecosystem.json'), '{ invalid json }');

      const validation = validateProjectContext(projectRoot);

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('ecosystem.json is corrupted');
    });

    it('should warn about missing .project-context', () => {
      const projectRoot = path.join(testDir, 'missing-context');
      mkdirSync(path.join(projectRoot, 'src'), { recursive: true });
      writeFileSync(path.join(projectRoot, 'CLAUDE.md'), '# Test');

      const validation = validateProjectContext(projectRoot);

      expect(validation.warnings).toContain('.project-context is missing');
    });
  });

  // ==========================================================================
  // 10. Integration with Task Master
  // ==========================================================================

  describe('Task Master Integration', () => {
    it('should load tasks.json from Task Master', async () => {
      const project = createTestProject(testDir, 'test-project');
      const tasksPath = path.join(project.root, '.taskmaster/tasks/tasks.json');

      const content = await fs.readFile(tasksPath, 'utf-8');
      const tasks = JSON.parse(content);

      expect(tasks.tasks).toBeDefined();
      expect(tasks.tasks.length).toBeGreaterThan(0);
    });

    it('should reference task IDs in agent context', async () => {
      const project = createTestProject(testDir, 'test-project');
      const tasksPath = path.join(project.root, '.taskmaster/tasks/tasks.json');

      const content = await fs.readFile(tasksPath, 'utf-8');
      const tasks = JSON.parse(content);

      expect(tasks.tasks[0].id).toBe('1');
      expect(tasks.tasks[0].title).toContain('authentication');
    });

    it('should understand task dependencies', async () => {
      const project = createTestProject(testDir, 'test-project');
      const tasksPath = path.join(project.root, '.taskmaster/tasks/tasks.json');

      const content = await fs.readFile(tasksPath, 'utf-8');
      const tasks = JSON.parse(content);

      const dashboardTask = tasks.tasks.find((t: { id: string }) => t.id === '2');
      expect(dashboardTask.dependencies).toContain('1');
    });

    it('should understand task status', async () => {
      const project = createTestProject(testDir, 'test-project');
      const tasksPath = path.join(project.root, '.taskmaster/tasks/tasks.json');

      const content = await fs.readFile(tasksPath, 'utf-8');
      const tasks = JSON.parse(content);

      const authTask = tasks.tasks.find((t: { id: string }) => t.id === '1');
      expect(authTask.status).toBe('done');

      const dashboardTask = tasks.tasks.find((t: { id: string }) => t.id === '2');
      expect(dashboardTask.status).toBe('in-progress');
    });
  });

  // ==========================================================================
  // 11. Real-World Context Usage Patterns
  // ==========================================================================

  describe('Real-World Context Usage Patterns', () => {
    it('should answer project structure queries accurately', () => {
      const project = createTestProject(testDir, 'test-project');
      const context = mockAgentReadContext(project);

      const { response, contextReferences } = mockAgentResponse(
        'What is the project structure?',
        context
      );

      expect(response).toBeDefined();
      expect(contextReferences).toContain('codebase:structure');
    });

    it('should answer tool availability queries from ecosystem.json', () => {
      const project = createTestProject(testDir, 'test-project');
      const context = mockAgentReadContext(project);

      const { response, contextReferences } = mockAgentResponse(
        'What tools are available?',
        context
      );

      expect(response).toContain('supabase');
      expect(contextReferences).toContain('ecosystem.json:mcpServers');
    });

    it('should answer technology stack queries from CLAUDE.md', () => {
      const project = createTestProject(testDir, 'test-project');
      const context = mockAgentReadContext(project);

      const { response, contextReferences } = mockAgentResponse(
        'What is the technology stack?',
        context
      );

      expect(response).toContain('Node.js');
      expect(response).toContain('TypeScript');
      expect(contextReferences).toContain('CLAUDE.md:Technology Stack');
    });

    it('should implement features following CLAUDE.md guidelines', () => {
      const project = createTestProject(testDir, 'test-project');
      const context = mockAgentReadContext(project);

      // Agent should know to use TypeScript strict mode
      expect(context.claudeMdContent).toContain('TypeScript strict mode');

      // Agent should know to use Repository pattern
      expect(context.claudeMdContent).toContain('Repository pattern');
    });

    it('should preserve context throughout complete workflow', () => {
      const project = createTestProject(testDir, 'test-project');
      const context = mockAgentReadContext(project);

      // Step 1: PM-Lead decomposes task
      executeHandoff('pm-lead', 'frontend-dev', 'Created UI task breakdown', context);

      // Step 2: Frontend-dev implements
      executeHandoff('frontend-dev', 'backend-dev', 'Created React components', context);

      // Step 3: Backend-dev integrates
      executeHandoff('backend-dev', 'test-engineer', 'Created API integration', context);

      // Step 4: Test-engineer validates
      context.previousDecisions.push('test-engineer: All tests passing');

      // Verify complete context preservation
      expect(context.handoffHistory.length).toBe(3);
      expect(context.previousDecisions.length).toBe(4);
      expect(context.claudeMdContent).toContain('test-project');
      expect(context.ecosystemConfig.version).toBe('1.0.0');
    });
  });
});
