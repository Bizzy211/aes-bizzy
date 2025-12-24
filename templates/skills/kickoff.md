---
name: kickoff
description: Manually trigger project kickoff workflow with PRD generation and multi-agent orchestration
---

# Kickoff Skill

Trigger the project kickoff workflow to generate a PRD, create tasks, and start multi-agent orchestration.

## Overview

The `/kickoff` skill activates pm-lead's autonomous orchestration mode, enabling it to:
1. Gather project requirements from user description
2. Research the domain using Exa and Ref tools
3. Generate a comprehensive PRD
4. Parse the PRD with Task Master to create tasks
5. Orchestrate specialized agents to complete the work

## Usage

```
/kickoff [project description]
```

### Examples

```
/kickoff A task management app with real-time collaboration
```

```
/kickoff Build an e-commerce platform with Stripe integration and inventory management
```

## Workflow Steps

### 1. Capture Project Description
If not provided as argument, prompt user for:
- Project name
- High-level description
- Key features or requirements
- Technology preferences (optional)

### 2. Research Domain
Use Exa and Ref tools to gather context:

```javascript
// Search for relevant documentation
await mcp__exa__web_search_exa({
  query: `${projectDescription} best practices architecture`
});

// Get framework-specific docs
await mcp__ref__ref_search_documentation({
  query: `${framework} documentation setup guide`
});
```

### 3. Generate PRD
Create a comprehensive Product Requirements Document:
- Save to `.taskmaster/docs/prd.md`
- Include vision, scope, features, and technical requirements

### 4. Parse PRD with Task Master

```javascript
await mcp__task-master-ai__parse_prd({
  projectRoot: process.cwd(),
  input: ".taskmaster/docs/prd.md",
  numTasks: 10  // Adjust based on complexity
});
```

### 5. Set Kickoff Mode

```bash
# Set environment variable
export AES_KICKOFF_MODE=true
```

Or create kickoff context file:
```javascript
// Create .claude/kickoff.json with project context
await createKickoffContext({
  projectName,
  projectDescription,
  hasTaskMaster: true,
  recommendedAgents: ['frontend-dev', 'backend-dev', 'test-engineer']
});
```

### 6. Invoke pm-lead Orchestration

```javascript
// Spawn pm-lead with kickoff context
await Task({
  subagent_type: "pm-lead",
  description: "Start project orchestration",
  prompt: `
    KICKOFF MODE ACTIVE

    Project: ${projectName}
    Description: ${projectDescription}

    Read .claude/kickoff.json for full context.
    Begin autonomous orchestration:
    1. Analyze task queue from Task Master
    2. Select appropriate agents for each task
    3. Delegate work with comprehensive context
    4. Collect HandoffData and track progress
    5. Continue until all tasks complete
  `
});
```

## What Kickoff Mode Does

When kickoff mode is active, pm-lead:

1. **Detects kickoff context** by checking:
   - `AES_KICKOFF_MODE` environment variable
   - `.claude/kickoff.json` file existence

2. **Loads project context** including:
   - Project description and goals
   - Recommended agents based on project type
   - Suggested initial tasks
   - Configuration (Task Master, MCP servers)

3. **Operates autonomously**:
   - Continuously monitors Task Master for pending tasks
   - Assigns tasks to appropriate specialized agents
   - Collects and processes HandoffData from agents
   - Updates task statuses and logs decisions
   - Creates GitHub issues if configured

## Prerequisites

- Task Master must be initialized (`task-master init`)
- Claude Code must have access to relevant MCP servers
- Git repository should be initialized

## After Kickoff

Once the kickoff workflow is running:
- pm-lead will work autonomously
- You can monitor progress via Task Master: `task-master list`
- Interrupt with `/clear` if needed
- Resume with `/orchestrate` if pm-lead pauses

---

*A.E.S - Bizzy Skill - Project Kickoff Workflow*
