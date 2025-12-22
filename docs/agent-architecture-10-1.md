# A.E.S - Bizzy Agent Architecture: 10+1 Design

> Generated: 2025-12-22 | Task: 41.4

---

## Architecture Overview

### Philosophy
Instead of maintaining 27+ static agents, we implement a **10+1 architecture**:
- **10 Core Agents**: Static, production-ready agents for common workflows
- **1 Meta-Agent**: Dynamic agent creator using exa.ai + ref.tools research

### Benefits
| Metric | 27 Static Agents | 10+1 Architecture | Improvement |
|--------|------------------|-------------------|-------------|
| Maintenance Burden | High (27 files) | Low (11 files) | 59% reduction |
| Flexibility | Limited | Unlimited | Dynamic generation |
| Token Efficiency | Variable | Optimized | Beads CLI integration |
| Update Cycle | All at once | Core only | Focused updates |

---

## Core Agents (10)

### 1. pm-lead (Project Manager Lead)
**Role**: Master orchestrator - ALWAYS first agent engaged

**Tools**:
- Task, Bash, Read, Write, Glob
- mcp__sequential-thinking__sequentialthinking
- mcp__github__create_issue, mcp__github__list_issues
- mcp__task-master-ai__* (core tools)
- mcp__exa__*, mcp__ref__*

**Beads Workflow**:
```bash
bd init                                    # Initialize project
bd create "Project: ${NAME}" -p 1 --json   # Create epic
bd ready --json                            # Check work queue
bd sync                                    # End of session
```

**Hands Off To**: All other agents based on requirements

---

### 2. frontend-dev (Frontend Developer)
**Role**: Web UI specialist - React, Next.js, TypeScript, Tailwind

**Tools**:
- Task, Bash, Read, Write, Edit, MultiEdit, Glob, Grep
- mcp__sequential-thinking__sequentialthinking
- mcp__context7__get-library-docs
- mcp__exa__*, mcp__ref__*

**Beads Workflow**:
```bash
bd ready --json                                     # Check assigned work
bd update ${ID} --status in_progress --json        # Claim task
bd update ${ID} --add-note "Component: ${name}"    # Log progress
bd close ${ID} --reason "UI implemented" --json    # Complete
bd sync
```

**Receives From**: pm-lead, ux-designer (via meta-agent)
**Hands Off To**: backend-dev (API integration), test-engineer

---

### 3. backend-dev (Backend Developer)
**Role**: Server-side specialist - Node.js, Python, APIs, databases

**Tools**:
- Task, Bash, Read, Write, Edit, MultiEdit, Glob, Grep
- mcp__sequential-thinking__sequentialthinking
- mcp__context7__get-library-docs
- mcp__supabase__execute_sql, mcp__supabase__list_tables
- mcp__exa__*, mcp__ref__*

**Beads Workflow**:
```bash
bd ready --json
bd update ${ID} --status in_progress --json
bd update ${ID} --add-note "Endpoint: ${route}" --json
bd close ${ID} --reason "API implemented" --json
bd sync
```

**Receives From**: pm-lead, frontend-dev
**Hands Off To**: db-architect, test-engineer, devops-engineer

---

### 4. db-architect (Database Architect)
**Role**: Database design, optimization, migrations

**Tools**:
- Task, Bash, Read, Write, Edit, Glob, Grep
- mcp__sequential-thinking__sequentialthinking
- mcp__supabase__* (all database tools)
- mcp__context7__get-library-docs

**Beads Workflow**:
```bash
bd ready --json
bd update ${ID} --status in_progress --json
bd update ${ID} --add-note "Migration: ${name}" --json
bd close ${ID} --reason "Schema updated" --json
bd sync
```

**Receives From**: pm-lead, backend-dev
**Hands Off To**: backend-dev, security-expert (RLS review)

---

### 5. test-engineer (Test Engineer)
**Role**: Testing strategy, unit/integration/e2e tests

**Tools**:
- Task, Bash, Read, Write, Edit, MultiEdit, Glob, Grep
- mcp__sequential-thinking__sequentialthinking
- mcp__context7__get-library-docs

**Beads Workflow**:
```bash
bd ready --json
bd update ${ID} --status in_progress --json
bd update ${ID} --add-note "Tests: ${count} passing" --json
bd close ${ID} --reason "Test coverage: ${pct}%" --json
bd sync
```

**Receives From**: frontend-dev, backend-dev, pm-lead
**Hands Off To**: debugger (if tests fail), pm-lead (when passing)

---

### 6. devops-engineer (DevOps Engineer)
**Role**: CI/CD, deployment, infrastructure, containerization

**Tools**:
- Task, Bash, Read, Write, Edit, Glob, Grep
- mcp__sequential-thinking__sequentialthinking
- mcp__context7__get-library-docs
- Docker, Kubectl (via Bash)

**Beads Workflow**:
```bash
bd ready --json
bd update ${ID} --status in_progress --json
bd update ${ID} --add-note "Pipeline: ${stage}" --json
bd close ${ID} --reason "Deployed to ${env}" --json
bd sync
```

**Receives From**: pm-lead, backend-dev, test-engineer
**Hands Off To**: security-expert (security scanning), pm-lead

---

### 7. security-expert (Security Expert)
**Role**: Security audits, vulnerability assessment, compliance

**Tools**:
- Task, Bash, Read, Write, Edit, Glob, Grep
- mcp__sequential-thinking__sequentialthinking
- mcp__context7__get-library-docs
- mcp__exa__*, mcp__ref__*

**Beads Workflow**:
```bash
bd ready --json
bd update ${ID} --status in_progress --json
bd update ${ID} --add-note "Vuln: ${finding}" --json
bd close ${ID} --reason "Audit complete: ${severity}" --json
bd sync
```

**Receives From**: pm-lead, devops-engineer, db-architect
**Hands Off To**: backend-dev (fixes), pm-lead (report)

---

### 8. docs-engineer (Documentation Engineer)
**Role**: Technical documentation, API docs, user guides

**Tools**:
- Task, Bash, Read, Write, Edit, Glob, Grep
- mcp__sequential-thinking__sequentialthinking
- mcp__context7__get-library-docs
- mcp__exa__*, mcp__ref__*

**Beads Workflow**:
```bash
bd ready --json
bd update ${ID} --status in_progress --json
bd update ${ID} --add-note "Doc: ${section}" --json
bd close ${ID} --reason "Documentation updated" --json
bd sync
```

**Receives From**: pm-lead, all development agents
**Hands Off To**: pm-lead

---

### 9. code-reviewer (Code Reviewer)
**Role**: Code quality, best practices, performance review

**Tools**:
- Task, Bash, Read, Write, Edit, Glob, Grep
- mcp__sequential-thinking__sequentialthinking
- mcp__context7__get-library-docs

**Beads Workflow**:
```bash
bd ready --json
bd update ${ID} --status in_progress --json
bd update ${ID} --add-note "Review: ${findings}" --json
bd close ${ID} --reason "Review: ${status}" --json
bd sync
```

**Receives From**: pm-lead, all development agents
**Hands Off To**: Original author (with feedback), pm-lead

---

### 10. debugger (Debugger)
**Role**: Root cause analysis, bug fixing, error resolution

**Tools**:
- Task, Bash, Read, Write, Edit, Glob, Grep
- mcp__sequential-thinking__sequentialthinking
- mcp__context7__get-library-docs

**Beads Workflow**:
```bash
bd ready --json
bd update ${ID} --status in_progress --json
bd update ${ID} --add-note "Root cause: ${finding}" --json
bd close ${ID} --reason "Fixed: ${description}" --json
bd sync
```

**Receives From**: test-engineer, pm-lead, any agent with errors
**Hands Off To**: Original requester, test-engineer (verify fix)

---

## Meta-Agent: agent-creator

### Role
Dynamic agent generator that creates specialized agents on-demand using AI-powered research.

### When to Use
- User requests capabilities not covered by 10 core agents
- Project requires domain-specific expertise (Splunk, N8N, mobile, etc.)
- Temporary specialized workflow needed

### Tools
```yaml
Required:
  - mcp__exa__web_search_exa           # Web search for best practices
  - mcp__exa__get_code_context_exa     # Code examples from libraries
  - mcp__ref__ref_search_documentation # Documentation lookup
  - mcp__ref__ref_read_url             # Read specific docs
  - mcp__sequential-thinking           # Complex agent design
  - Read, Write, Edit                   # Create agent files
  - Bash                                # Validate agent
```

### Agent Generation Workflow

```bash
# 1. Research the domain
mcp__exa__web_search_exa("${domain} best practices 2025")
mcp__ref__ref_search_documentation("${framework} API reference")

# 2. Get code patterns
mcp__exa__get_code_context_exa("${framework} TypeScript examples")

# 3. Design agent structure
mcp__sequential-thinking__sequentialthinking({
  "thought": "Designing ${agent_name} agent...",
  "nextThoughtNeeded": true
})

# 4. Create agent file
# Write to ~/.claude/agents/${agent-name}.md

# 5. Validate agent
# Ensure follows AGENT_TEMPLATE.md structure
```

### Generation Template

```markdown
---
name: ${GENERATED_AGENT_NAME}
description: ${AUTO_GENERATED_DESCRIPTION}
tools: ${RESEARCHED_TOOLS_LIST}
---

# ${AGENT_NAME} - ${ROLE}

You are a specialized agent generated by A.E.S - Bizzy for ${PURPOSE}.

## BEADS WORKFLOW (REQUIRED)

### At Start
\`\`\`bash
bd ready --json
bd update ${TASK_ID} --status in_progress --json
bd show ${TASK_ID} --json
\`\`\`

### During Work
\`\`\`bash
bd update ${TASK_ID} --add-note "${progress}" --json
\`\`\`

### On Complete
\`\`\`bash
bd close ${TASK_ID} --reason "${summary}" --json
bd sync
\`\`\`

## TECHNICAL EXPERTISE

${RESEARCHED_EXPERTISE}

## WORKFLOW

${RESEARCHED_WORKFLOW}

## HANDOFF PROTOCOL

When complete, hand back to requesting agent or pm-lead.

---

*Generated by agent-creator | Source: exa.ai + ref.tools research*
*Generated: ${TIMESTAMP}*
```

### Specializations That Can Be Generated On-Demand

| Domain | Example Agents |
|--------|---------------|
| Splunk | splunk-xml-dev, splunk-spl-expert, splunk-app-builder |
| Automation | n8n-engineer, zapier-dev, make-dev |
| Mobile | react-native-dev, flutter-dev, ios-swift-dev |
| Data | data-engineer, ml-engineer, etl-specialist |
| Cloud | aws-architect, azure-dev, gcp-engineer |
| Game Dev | unity-dev, unreal-dev, godot-dev |
| Blockchain | solidity-dev, web3-engineer |
| AI/ML | langchain-dev, llm-fine-tuner |

---

## Agent Communication Protocol

### Beads-Based Handoffs

```bash
# Agent A completes work
bd close ${MY_TASK} --reason "Completed: ${summary}" --json

# Agent A creates handoff task
bd create "[Agent B]: ${next_task}" \
  --description="${context}" \
  -p 1 \
  --deps discovered-from:${MY_TASK} \
  --json

# Agent A notes the handoff
NEW_TASK_ID=$(bd list --json | jq -r '.[-1].id')
bd update ${NEW_TASK_ID} --add-note "HANDOFF to agent-b: ${instructions}" --json

# Sync before ending session
bd sync
```

### Task Tool Delegation

```javascript
// Use Task tool for cross-agent work
await Task({
  prompt: "Implement ${feature}",
  subagent_type: "frontend-dev",
  description: "Build UI component"
});
```

---

## File Structure

```
~/.claude/
├── agents/
│   ├── pm-lead.md           # Core agent 1
│   ├── frontend-dev.md      # Core agent 2
│   ├── backend-dev.md       # Core agent 3
│   ├── db-architect.md      # Core agent 4
│   ├── test-engineer.md     # Core agent 5
│   ├── devops-engineer.md   # Core agent 6
│   ├── security-expert.md   # Core agent 7
│   ├── docs-engineer.md     # Core agent 8
│   ├── code-reviewer.md     # Core agent 9
│   ├── debugger.md          # Core agent 10
│   ├── agent-creator.md     # Meta-agent
│   └── generated/           # On-demand agents
│       ├── splunk-xml-dev.md
│       ├── n8n-engineer.md
│       └── ...
├── AGENT_TEMPLATE.md        # Template for new agents
└── agent-index.json         # Agent registry
```

---

## Agent Registry (agent-index.json)

```json
{
  "version": "1.0.0",
  "coreAgents": [
    {"name": "pm-lead", "file": "pm-lead.md", "static": true},
    {"name": "frontend-dev", "file": "frontend-dev.md", "static": true},
    {"name": "backend-dev", "file": "backend-dev.md", "static": true},
    {"name": "db-architect", "file": "db-architect.md", "static": true},
    {"name": "test-engineer", "file": "test-engineer.md", "static": true},
    {"name": "devops-engineer", "file": "devops-engineer.md", "static": true},
    {"name": "security-expert", "file": "security-expert.md", "static": true},
    {"name": "docs-engineer", "file": "docs-engineer.md", "static": true},
    {"name": "code-reviewer", "file": "code-reviewer.md", "static": true},
    {"name": "debugger", "file": "debugger.md", "static": true}
  ],
  "metaAgent": {
    "name": "agent-creator",
    "file": "agent-creator.md",
    "capabilities": ["exa.ai", "ref.tools", "dynamic-generation"]
  },
  "generatedAgents": []
}
```

---

## Implementation Checklist

### Phase 1: Core Agents
- [ ] pm-lead.md (exists - update for Beads)
- [ ] frontend-dev.md (exists - update for Beads)
- [ ] backend-dev.md (exists - update for Beads)
- [ ] db-architect.md (create)
- [ ] test-engineer.md (create)
- [ ] devops-engineer.md (create)
- [ ] security-expert.md (create)
- [ ] docs-engineer.md (create)
- [ ] code-reviewer.md (create)
- [ ] debugger.md (create)

### Phase 2: Meta-Agent
- [ ] agent-creator.md (create with full research workflow)
- [ ] agent-index.json (create registry)
- [ ] AGENT_TEMPLATE.md (exists - verify complete)
- [ ] generated/ directory structure

### Phase 3: Integration
- [ ] Update Claude Code settings for agent discovery
- [ ] Test agent handoffs with Beads
- [ ] Validate agent-creator can generate working agents
- [ ] Document agent request patterns

---

*10+1 Architecture Design - A.E.S - Bizzy*
*Task 41.4 | December 2025*
