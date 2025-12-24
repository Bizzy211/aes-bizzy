# Bizzy - Automated Project Bootstrapping Orchestrator

> Transform project descriptions into fully initialized projects with GitHub repos, TaskMaster tasks, and assigned agents in one command.

---

## When to Use This Skill

Use this skill when:
- User types `/bizzy` followed by a project description
- User mentions "bizzy create", "bizzy project", or "bootstrap project"
- User wants to start a new project from scratch with full automation
- User needs research-backed project planning and task generation

**Bizzy handles**: Project research, PRD generation, task creation, agent assignment, GitHub setup
**Human handles**: Project vision, requirements clarification, final approval

---

## Trigger Patterns

```javascript
// Detect bizzy activation
const TRIGGER_PATTERNS = [
  /^\/bizzy\b/i,                           // /bizzy create a dashboard...
  /\bbizzy\s+(?:project|setup|create|bootstrap)/i,  // bizzy create...
  /\bstart\s+new\s+project\s+with\s+bizzy/i,        // start new project with bizzy
];
```

---

## Complete Workflow Overview

```
User: "/bizzy create a real-time analytics dashboard for e-commerce metrics"
       │
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 1: RESEARCH (exa.ai + ref.tools)                              │
│  • Branding inspiration & design systems                            │
│  • Technical documentation for mentioned technologies               │
│  • Code examples and best practices                                 │
├─────────────────────────────────────────────────────────────────────┤
│ PHASE 2: PRD GENERATION                                             │
│  • Detect project type (dashboard, web-app, api-service, etc.)      │
│  • Extract requirements with priorities                             │
│  • Identify tech stack from prompt + research                       │
│  • Generate structured PRD document                                 │
├─────────────────────────────────────────────────────────────────────┤
│ PHASE 3: TASK MASTER AI                                             │
│  ★ FIRST: Configure model: task-master models --set-main claude-code:sonnet
│  • Initialize TaskMaster if needed                                  │
│  • Parse PRD to generate tasks                                      │
│  • Analyze complexity and expand tasks                              │
│  • Create subtasks for implementation                               │
│  ★ Create "Kick-Off Meeting.md" with team & project brief           │
├─────────────────────────────────────────────────────────────────────┤
│ PHASE 4: AGENT MATCHING                                             │
│  • Analyze each task for agent compatibility                        │
│  • Match to agents: frontend-dev, backend-dev, db-architect, etc.   │
│  • Flag low-confidence matches for meta-agent review                │
├─────────────────────────────────────────────────────────────────────┤
│ PHASE 5: GITHUB SETUP (PRIVATE REPOS ONLY)                          │
│  • Create PRIVATE repository with labels & milestones               │
│  • Create issues from tasks                                         │
│  • Post agent assignment comments                                   │
├─────────────────────────────────────────────────────────────────────┤
│ PHASE 6: SUMMARY                                                    │
│  • Display project overview                                         │
│  • Show next steps                                                  │
│  • Provide links to repo and tasks                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Research Orchestration

### Branding & Design Research
```javascript
// Use exa.ai for design inspiration
const brandingResults = await mcp__exa__web_search_exa({
  query: `${projectName} dashboard design inspiration UI UX`,
  numResults: 8,
  type: 'auto'
});

// Extract color schemes, typography, visual patterns
// Module: src/bizzy/research-orchestrator.ts
```

### Technical Documentation Research
```javascript
// Use ref.tools for documentation
const techDocs = await mcp__ref__ref_search_documentation({
  query: `${techStack.join(' ')} documentation best practices`
});

// Read specific documentation pages
const fullDocs = await mcp__ref__ref_read_url({
  url: techDocs.results[0].url
});
```

### Code Context Research
```javascript
// Use exa.ai for code examples
const codeContext = await mcp__exa__get_code_context_exa({
  query: `${projectDescription} implementation examples`,
  tokensNum: 10000
});
```

### Research Aggregation
```javascript
// Combine all research sources
// From: src/bizzy/research-orchestrator.ts

import { gatherProjectResearch } from './src/bizzy/research-orchestrator.js';

const research = await gatherProjectResearch(projectDescription, {
  branding: { numResults: 8, searchType: 'auto' },
  docs: { numResults: 5 },
  code: { tokensNum: 10000 }
});

// Returns:
// {
//   branding: { brandGuidelines, colorSchemes, typographyGuidelines },
//   technicalDocs: { officialDocs, apiReferences, configurationExamples },
//   codeContext: { examples, patterns, bestPractices, libraries },
//   metadata: { timestamp, sources, tokensUsed, errors }
// }
```

---

## Phase 2: PRD Generation

### Project Type Detection
```javascript
// From: src/bizzy/prd-generator.ts

import { detectProjectType, extractProjectName } from './src/bizzy/prd-generator.js';

// Supported types: web-app, dashboard, api-service, mobile-app, fullstack, cli-tool
const projectType = detectProjectType(userPrompt);
// "real-time analytics dashboard" -> 'dashboard'

const projectName = extractProjectName(userPrompt);
// "Analytics Dashboard" or from quoted string
```

### Requirement Extraction
```javascript
import { extractRequirements, extractTechStack } from './src/bizzy/prd-generator.js';

// Extract and categorize requirements
const requirements = extractRequirements(userPrompt, projectType);
// Returns: [{ description, priority, category, keywords }]
// Priorities: critical, high, medium, low
// Categories: functional, non-functional, technical, design

// Identify technologies mentioned
const techStack = extractTechStack(userPrompt, researchData);
// Returns: ['react', 'typescript', 'postgresql', 'tailwindcss']
```

### Generate PRD Document
```javascript
import { generatePRD } from './src/bizzy/prd-generator.js';

const prd = await generatePRD({
  userPrompt: projectDescription,
  projectName: 'Analytics Dashboard',
  projectType: 'dashboard',
  researchData: research,
  outputPath: '.taskmaster/docs/prd.md'
});

// Returns:
// {
//   content: '# Analytics Dashboard - PRD...',
//   projectType: 'dashboard',
//   projectName: 'Analytics Dashboard',
//   requirements: [...],
//   techStack: ['react', 'typescript', ...],
//   filePath: '.taskmaster/docs/prd.md'
// }
```

---

## Phase 3: Task Master Integration

### Configure TaskMaster Model (REQUIRED FIRST)
```bash
# ALWAYS run this first before any other TaskMaster commands
task-master models --set-main claude-code:sonnet
```

```javascript
// Verify configuration is correct
const config = JSON.parse(fs.readFileSync('.taskmaster/config.json', 'utf8'));
const expectedConfig = {
  provider: 'claude-code',
  modelId: 'sonnet',
  maxTokens: 64000,
  temperature: 0.2
};

// Config must match this structure before proceeding
if (config.models?.main?.provider !== 'claude-code' ||
    config.models?.main?.modelId !== 'sonnet') {
  throw new Error('TaskMaster not configured for claude-code:sonnet');
}
```

### Initialize TaskMaster
```javascript
// Check if TaskMaster is initialized
const tasksDir = '.taskmaster/tasks';
const isInitialized = fs.existsSync(tasksDir);

if (!isInitialized) {
  await mcp__task_master_ai__initialize_project({
    projectRoot: process.cwd(),
    skipInstall: false,
    addAliases: true,
    initGit: true,
    storeTasksInGit: true,
    yes: true,
    rules: ['claude']
  });
}
```

### Parse PRD to Generate Tasks
```javascript
// Generate initial tasks from PRD
await mcp__task_master_ai__parse_prd({
  input: '.taskmaster/docs/prd.md',
  projectRoot: process.cwd(),
  force: true,
  numTasks: '0',  // Let TaskMaster determine optimal count
  research: true   // Use research role for better generation
});
```

### Analyze Complexity
```javascript
// Analyze task complexity for expansion
await mcp__task_master_ai__analyze_project_complexity({
  projectRoot: process.cwd(),
  threshold: 5,  // Expand tasks with complexity >= 5
  research: true
});
```

### Expand Tasks into Subtasks
```javascript
// Expand all high-complexity tasks
await mcp__task_master_ai__expand_all({
  projectRoot: process.cwd(),
  research: true,
  force: false  // Don't regenerate existing subtasks
});

// Get all generated tasks
const tasks = await mcp__task_master_ai__get_tasks({
  projectRoot: process.cwd(),
  withSubtasks: true
});
```

### Create Kick-Off Meeting Document (REQUIRED)
```javascript
// ALWAYS create Kick-Off Meeting.md after tasks are parsed
// This should be the FIRST task auto-started

const kickOffContent = generateKickOffMeeting({
  projectName: prd.projectName,
  projectDescription: prd.content,
  techStack: prd.techStack,
  tasks: tasks.data,
  agentAssignments: assignments  // From Phase 4
});

fs.writeFileSync('Kick-Off Meeting.md', kickOffContent);
```

### Kick-Off Meeting Template
```javascript
function generateKickOffMeeting({ projectName, projectDescription, techStack, tasks, agentAssignments }) {
  // Calculate agent distribution
  const agentCounts = {};
  for (const a of agentAssignments) {
    agentCounts[a.assignedAgent] = (agentCounts[a.assignedAgent] || 0) + 1;
  }

  return `# ${projectName} - Kick-Off Meeting

## Project Overview
${projectDescription.split('\n').slice(0, 10).join('\n')}

## Technology Stack
${techStack.map(t => `- ${t}`).join('\n')}

## Team Composition

| Agent | Role | Tasks Assigned |
|-------|------|----------------|
${Object.entries(agentCounts).map(([agent, count]) =>
  `| ${agent} | ${getAgentRole(agent)} | ${count} |`
).join('\n')}

## Agent Responsibilities

${Object.keys(agentCounts).map(agent => `
### ${agent}
**Role:** ${getAgentRole(agent)}
**Specialization:** ${getAgentSpecialization(agent)}
**Assigned Tasks:** ${agentAssignments.filter(a => a.assignedAgent === agent).map(a => a.taskTitle).join(', ')}
`).join('\n')}

## Project Timeline

| Phase | Milestone | Key Deliverables |
|-------|-----------|------------------|
| Phase 1 | Foundation | Project setup, design system, core infrastructure |
| Phase 2 | Development | Feature implementation, component building |
| Phase 3 | Polish | Testing, optimization, deployment |

## Communication Guidelines

- **Task Updates:** Update TaskMaster status as you progress
- **Blockers:** Flag blocked tasks immediately
- **Code Reviews:** All PRs require review before merge
- **Handoffs:** Use task comments for agent-to-agent communication

## First Steps

1. Review assigned tasks: \`task-master list\`
2. Start with Task 1 (this document creation is Task 0)
3. Set task status: \`task-master set-status --id=1 --status=in-progress\`

---
*Generated by Bizzy - JHC Agentic EcoSystem*
*Date: ${new Date().toISOString().split('T')[0]}*
`;
}

function getAgentRole(agent) {
  const roles = {
    'frontend-dev': 'Frontend Development Lead',
    'backend-dev': 'Backend Development Lead',
    'animated-dashboard-architect': 'Animation & Dashboard Specialist',
    'beautiful-web-designer': 'UI/UX Implementation Lead',
    'db-architect': 'Database Architecture Lead',
    'security-expert': 'Security & Authentication Lead',
    'test-engineer': 'Quality Assurance Lead',
    'devops-engineer': 'Infrastructure & Deployment Lead',
    'docs-engineer': 'Documentation Lead',
    'ux-designer': 'User Experience Lead',
    'general-purpose': 'General Development Support'
  };
  return roles[agent] || 'Development Team Member';
}

function getAgentSpecialization(agent) {
  const specs = {
    'frontend-dev': 'React, TypeScript, component architecture, state management',
    'backend-dev': 'API design, server logic, authentication, data processing',
    'animated-dashboard-architect': 'Framer Motion, Three.js, data visualization, particle effects',
    'beautiful-web-designer': 'Tailwind CSS, responsive design, accessibility, modern UI patterns',
    'db-architect': 'Schema design, query optimization, migrations, data modeling',
    'security-expert': 'Authentication, encryption, vulnerability assessment, OWASP compliance',
    'test-engineer': 'Jest, Playwright, integration testing, CI/CD pipelines',
    'devops-engineer': 'Docker, Kubernetes, GitHub Actions, cloud deployment',
    'docs-engineer': 'Technical writing, API documentation, user guides',
    'ux-designer': 'User research, wireframing, prototyping, design systems',
    'general-purpose': 'Full-stack development, research, problem-solving'
  };
  return specs[agent] || 'General software development';
}
```

---

## Phase 4: Agent Matching & Assignment

### Match Tasks to Agents
```javascript
// From: src/integrations/github-automation/issue-analyzer.ts

import { analyzeIssue, getBestMatch } from './src/integrations/github-automation/index.js';

const assignments = [];

for (const task of tasks.data || []) {
  // Convert task to issue format for analysis
  const issueFormat = {
    number: parseInt(task.id),
    title: task.title,
    body: `${task.description}\n\n${task.details || ''}`,
    labels: extractLabelsFromTask(task),
    state: 'open'
  };

  // Analyze for agent match
  const analysis = await analyzeIssue(issueFormat);
  const bestMatch = getBestMatch(analysis);

  assignments.push({
    taskId: task.id,
    taskTitle: task.title,
    assignedAgent: bestMatch?.agentName || 'general-purpose',
    confidence: bestMatch?.score || 0,
    matchReason: bestMatch?.matchReason
  });
}
```

### Agent Mapping Reference

| Task Type | Primary Agent | Fallback Agent |
|-----------|--------------|----------------|
| Dashboard, charts, animations | animated-dashboard-architect | frontend-dev |
| Web UI, components, styling | beautiful-web-designer | frontend-dev |
| API, backend logic | backend-dev | fullstack-dev |
| Database schema, queries | db-architect | backend-dev |
| Security, auth, encryption | security-expert | backend-dev |
| Testing, QA | test-engineer | debugger |
| CI/CD, deployment | devops-engineer | backend-dev |
| Documentation | docs-engineer | general-purpose |
| UX research, prototypes | ux-designer | beautiful-web-designer |
| Splunk dashboards | splunk-xml-dev | splunk-ui-dev |

### Handle Low Confidence Matches
```javascript
// If confidence < 40%, trigger meta-agent for new agent creation
const lowConfidence = assignments.filter(a => a.confidence < 40);

for (const assignment of lowConfidence) {
  // Request meta-agent to evaluate or create specialized agent
  await Task({
    description: "Evaluate agent needs",
    subagent_type: "meta-agent",
    prompt: `
      Evaluate this task that has no high-confidence agent match:

      Task: ${assignment.taskTitle}
      Current best match: ${assignment.assignedAgent} (${assignment.confidence}%)

      Either:
      1. Confirm the suggested agent is appropriate
      2. Suggest a different existing agent
      3. Create a new specialized agent if needed
    `
  });
}
```

---

## Phase 5: GitHub Repository Management

### Create Repository
```javascript
// From: src/integrations/github-automation/repository-manager.ts

import {
  setupRepository,
  DEFAULT_AGENT_LABELS,
  DEFAULT_MILESTONE_PHASES
} from './src/integrations/github-automation/index.js';

const repoName = projectName.toLowerCase().replace(/\s+/g, '-');
const token = process.env.GITHUB_TOKEN;

const setupResult = await setupRepository({
  name: repoName,
  description: prd.content.substring(0, 200),
  private: true,  // ALWAYS create private repos for security
  labels: true,   // Create agent & workflow labels
  milestones: DEFAULT_MILESTONE_PHASES,
  initialFiles: [
    { path: 'README.md', content: generateReadme(prd) },
    { path: '.taskmaster/docs/prd.md', content: prd.content }
  ]
}, token);

// Returns:
// {
//   success: true,
//   repoUrl: 'https://github.com/bizzy211/analytics-dashboard',
//   summary: { labels: 15, milestones: 4, files: 2 },
//   errors: []
// }
```

### Default Labels Created

**Agent Labels:**
- `frontend` - Frontend development tasks
- `backend` - Backend/API development tasks
- `security` - Security-related tasks
- `devops` - DevOps and infrastructure tasks
- `documentation` - Documentation tasks
- `testing` - Testing and QA tasks
- `ux-design` - UX/UI design tasks
- `database` - Database tasks
- `integration` - Integration tasks
- `mobile` - Mobile development tasks

**Workflow Labels:**
- `in-progress` - Currently being worked on
- `needs-review` - Needs code review
- `blocked` - Blocked by dependencies
- `ready-for-pm` - Ready for PM review
- `assigned-to-agent` - Assigned to AI agent

### Create Issues from Tasks
```javascript
import { postComment, addLabels } from './src/integrations/github-automation/index.js';

const createdIssues = [];

for (const assignment of assignments) {
  const task = tasks.data.find(t => t.id === assignment.taskId);

  // Create GitHub issue
  const issue = await mcp__github__create_issue({
    owner: 'bizzy211',
    repo: repoName,
    title: task.title,
    body: formatTaskAsIssue(task),
    labels: getLabelsForTask(task)
  });

  // Post agent assignment comment
  const comment = generateAssignmentComment(assignment);
  await postComment('bizzy211', repoName, issue.number, comment, token);

  createdIssues.push({
    issueNumber: issue.number,
    issueUrl: issue.html_url,
    taskId: task.id,
    agent: assignment.assignedAgent
  });
}
```

### Issue Body Template
```javascript
function formatTaskAsIssue(task) {
  return `## Description
${task.description}

## Implementation Details
${task.details || 'See PRD for full context.'}

## Test Strategy
${task.testStrategy || 'TBD'}

## Dependencies
${task.dependencies?.map(d => `- Task ${d}`).join('\n') || 'None'}

## Subtasks
${task.subtasks?.map(s => `- [ ] ${s.title}`).join('\n') || 'Expand task for subtasks'}

---
*Generated by Bizzy - JHC Agentic EcoSystem*
`;
}
```

### Agent Assignment Comment Template
```javascript
function generateAssignmentComment(assignment) {
  const confidenceEmoji =
    assignment.confidence >= 80 ? ':white_check_mark:' :
    assignment.confidence >= 60 ? ':large_blue_circle:' :
    assignment.confidence >= 40 ? ':yellow_circle:' : ':red_circle:';

  return `## :robot: Agent Assignment

${confidenceEmoji} **Assigned Agent:** \`${assignment.assignedAgent}\`
**Confidence Score:** ${assignment.confidence}%
**Match Reason:** ${assignment.matchReason || 'Keyword analysis'}

### Recommended Workflow
1. Agent reviews task requirements
2. Agent creates implementation plan
3. Agent implements with progress updates
4. Agent submits PR linked to this issue

### Agent Capabilities
${getAgentCapabilities(assignment.assignedAgent)}

---
*Assigned by Bizzy Automation System*
`;
}
```

---

## Phase 6: Summary Output

### Generate Workflow Summary
```javascript
function generateWorkflowSummary(projectInfo, setupResult, tasks, assignments, issues) {
  const agentDistribution = {};
  for (const a of assignments) {
    agentDistribution[a.assignedAgent] = (agentDistribution[a.assignedAgent] || 0) + 1;
  }

  return `
## :rocket: BIZZY PROJECT BOOTSTRAP COMPLETE

### Project Overview
- **Name:** ${projectInfo.projectName}
- **Type:** ${projectInfo.projectType}
- **Repository:** ${setupResult.repoUrl}

### Tasks Generated
- **Total Tasks:** ${tasks.data?.length || 0}
- **With Subtasks:** ${tasks.data?.filter(t => t.subtasks?.length > 0).length || 0}
- **Total Issues Created:** ${issues.length}

### Agent Assignments
${Object.entries(agentDistribution)
  .map(([agent, count]) => `- ${agent}: ${count} tasks`)
  .join('\n')}

### Resources Created
- Labels: ${setupResult.summary.labels}
- Milestones: ${setupResult.summary.milestones}
- Files: ${setupResult.summary.files}

### Next Steps
1. Review generated tasks: \`task-master list\`
2. Check GitHub issues: ${setupResult.repoUrl}/issues
3. Start development: \`task-master next\`
4. Review agent assignments and adjust if needed

### Quick Commands
\`\`\`bash
# See all tasks
task-master list

# Get next task to work on
task-master next

# View specific task
task-master show <task-id>

# Start working on a task
task-master set-status --id=<id> --status=in-progress
\`\`\`
  `;
}
```

---

## Usage Examples

### Example 1: Dashboard Project
```
User: /bizzy create a real-time analytics dashboard for monitoring
user engagement with React, TypeScript, and Chart.js

Bizzy Output:
- Research: Dashboard design, Chart.js docs, React best practices
- PRD: Generated dashboard PRD with 12 requirements
- Tasks: 18 tasks with 54 subtasks created
- Agents: animated-dashboard-architect (8), backend-dev (5), db-architect (3), test-engineer (2)
- Repo: https://github.com/bizzy211/analytics-dashboard
- Issues: 18 issues created with agent assignments
```

### Example 2: E-commerce Platform
```
User: /bizzy bootstrap an e-commerce platform with Next.js,
Stripe payments, and Supabase backend

Bizzy Output:
- Research: Next.js commerce, Stripe integration, Supabase patterns
- PRD: Complete e-commerce PRD with payment integration
- Tasks: 32 tasks with 96 subtasks
- Agents: beautiful-web-designer (10), backend-dev (12), security-expert (4), db-architect (4), test-engineer (2)
- Repo: https://github.com/bizzy211/ecommerce-platform
- Issues: 32 issues with agent assignments
```

### Example 3: API Service
```
User: /bizzy create a REST API for a task management system
with authentication and rate limiting

Bizzy Output:
- Research: API design, auth patterns, rate limiting strategies
- PRD: API service PRD with 8 endpoints
- Tasks: 15 tasks with 45 subtasks
- Agents: backend-dev (9), security-expert (3), db-architect (2), docs-engineer (1)
- Repo: https://github.com/bizzy211/task-api
- Issues: 15 issues with agent assignments
```

---

## Configuration

### Required Environment Variables
```bash
# GitHub access (required for repository operations)
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxxxxxxxxxxx

# Research APIs (at least one required)
PERPLEXITY_API_KEY=pplx-xxxx  # For TaskMaster research
EXA_API_KEY=exa-xxxx          # For code context

# TaskMaster AI models
ANTHROPIC_API_KEY=sk-ant-xxxx
```

### MCP Servers Required
```json
{
  "mcpServers": {
    "task-master-ai": {
      "command": "npx",
      "args": ["-y", "task-master-ai"],
      "env": {
        "TASK_MASTER_TOOLS": "all",
        "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}",
        "PERPLEXITY_API_KEY": "${PERPLEXITY_API_KEY}"
      }
    },
    "exa": {
      "command": "npx",
      "args": ["-y", "@anthropics/exa-mcp-server"],
      "env": {
        "EXA_API_KEY": "${EXA_API_KEY}"
      }
    },
    "ref": {
      "command": "npx",
      "args": ["-y", "@anthropics/ref-mcp-server"]
    }
  }
}
```

---

## Error Handling

### Research Failures
```javascript
// If research times out or fails, use cached results or reduced scope
try {
  research = await gatherProjectResearch(description, options);
} catch (error) {
  console.warn('Research failed, proceeding with basic PRD generation');
  research = null;
}
```

### GitHub API Failures
```javascript
// Retry with exponential backoff
import { GitHubAPIError } from './src/integrations/github-automation/index.js';

try {
  await createRepository(config, token);
} catch (error) {
  if (error instanceof GitHubAPIError) {
    if (error.statusCode === 422) {
      // Repository already exists
      console.log('Repository exists, skipping creation');
    } else if (error.statusCode === 429) {
      // Rate limited - wait and retry
      await delay(60000);
      await createRepository(config, token);
    }
  }
}
```

### Low Agent Confidence
```javascript
// If no agent matches with confidence >= 40%
if (assignment.confidence < 40) {
  // Option 1: Assign to general-purpose agent
  assignment.assignedAgent = 'general-purpose';

  // Option 2: Trigger meta-agent for new agent creation
  await triggerMetaAgent(task);

  // Option 3: Flag for human review
  assignment.requiresHumanReview = true;
}
```

---

## Dependencies

### Source Modules
- `src/bizzy/research-orchestrator.ts` - Research functions (Task 53)
- `src/bizzy/prd-generator.ts` - PRD generation (Task 54)
- `src/integrations/github-automation/repository-manager.ts` - GitHub setup (Task 55)
- `src/integrations/github-automation/issue-analyzer.ts` - Agent matching
- `src/integrations/github-automation/assignment-system.ts` - Issue assignment

### Related Skills
- `/github-issues` - GitHub issue templates and workflows
- `/task-master` - TaskMaster commands and workflow
- `/exa-ai` - Exa.ai code context research
- `/ref-tools` - Ref.tools documentation search

---

## Performance Targets

| Phase | Target Time | Description |
|-------|-------------|-------------|
| Research | < 90 seconds | All research queries complete |
| PRD Generation | < 30 seconds | Template filling and file write |
| Task Generation | < 2 minutes | Parse PRD and expand tasks |
| Agent Matching | < 30 seconds | Match all tasks to agents |
| GitHub Setup | < 60 seconds | Repo, labels, milestones, issues |
| **Total** | **< 5 minutes** | Complete workflow |

---

*Skill Version: 1.0.0*
*Last Updated: December 2024*
*Part of JHC Agentic EcoSystem (A.E.S)*
