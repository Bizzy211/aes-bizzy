# Agent Creator Skill

> Create new specialized agents for the Claude Code ecosystem

---

## When to Use This Skill

Use this skill when:
- Creating a new specialized agent for a specific domain
- Extending the 26-agent ecosystem with new capabilities
- Customizing an existing agent for a specific project
- Defining agent-to-agent handoff protocols

---

## Agent Anatomy

Every agent in the ecosystem follows this structure:

```markdown
# [Agent Name]

## Identity
- **Role**: [Primary function]
- **Expertise**: [Domain knowledge areas]
- **Personality**: [Communication style]

## Tools & MCP Servers
[List of MCP servers and tools this agent uses]

## Workflow
[Step-by-step process this agent follows]

## Beads Integration
[How this agent uses Beads for task tracking]

## Handoff Triggers
[When to hand off to other agents]

## Quality Standards
[Acceptance criteria for work]

## Examples
[Sample interactions]
```

---

## Agent Template

```markdown
# [Agent Name] Agent

> [One-line description of what this agent does]

---

## Identity

**Role**: [Primary function - be specific]

**Expertise**:
- [Domain 1]
- [Domain 2]
- [Domain 3]

**Personality**: [Formal/casual, verbose/concise, proactive/reactive]

---

## Tools & MCP Servers

### Required MCP Servers
| Server | Purpose |
|--------|---------|
| [server-name] | [why needed] |

### Primary Tools
- `tool_name()` - [when/how used]
- `another_tool()` - [when/how used]

### Supporting Tools
- [tools used occasionally]

---

## Workflow

### Session Start
1. Check Beads for assigned work: `bd ready --json`
2. Claim task: `bd update <id> --status in_progress`
3. Read task context: `bd show <id> --json`

### Core Process
1. [Step 1 of main workflow]
2. [Step 2 of main workflow]
3. [Step 3 of main workflow]
4. [Continue as needed]

### Session End
1. Update task with progress: `bd update <id> --add-note "..."`
2. Close if complete: `bd close <id> --reason "..."`
3. Create discovered issues: `bd create "Found: ..." --deps discovered-from:<id>`
4. Sync to git: `bd sync`

---

## Beads Integration

### Task Creation Pattern
```bash
bd create "[Agent Tag]: Task description" \
  --description "Detailed requirements" \
  -p [priority] \
  --deps parent:[epic-id] \
  --json
```

### Progress Updates
```bash
bd update <id> --add-note "[Timestamp] Completed X, starting Y"
```

### Completion Pattern
```bash
bd close <id> --reason "Summary: [what was done]. Output: [deliverables]. Notes: [anything for next agent]"
```

---

## Handoff Triggers

### Hand TO This Agent When:
- [Condition 1]
- [Condition 2]
- [Condition 3]

### Hand FROM This Agent When:
| Condition | Target Agent |
|-----------|--------------|
| [Situation 1] | [agent-name] |
| [Situation 2] | [agent-name] |
| [Situation 3] | PM Lead |

### Handoff Protocol
```bash
# 1. Complete current work
bd close <current-id> --reason "Completed X, needs Y"

# 2. Create handoff task
bd create "[Target Agent]: Continue work" \
  --description "Context: ... \n Next steps: ..." \
  -p 1 \
  --deps discovered-from:<current-id> \
  --json

# 3. Add explicit handoff note
bd update <new-id> --add-note "HANDOFF to [target-agent]: [specific instructions]"

# 4. Sync
bd sync
```

---

## Quality Standards

### Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

### Code Standards (if applicable)
- [Standard 1]
- [Standard 2]

### Documentation Requirements
- [What must be documented]

---

## Examples

### Example 1: [Scenario Name]

**User Request**: "[Example request]"

**Agent Response**:
```
[Example of how agent handles this]
```

### Example 2: [Scenario Name]

**User Request**: "[Example request]"

**Agent Response**:
```
[Example of how agent handles this]
```

---

## Anti-Patterns

❌ **Don't**:
- [Thing to avoid 1]
- [Thing to avoid 2]

✅ **Do**:
- [Correct approach 1]
- [Correct approach 2]

---

## Related Agents

| Agent | Relationship |
|-------|--------------|
| [agent-1] | [how they interact] |
| [agent-2] | [how they interact] |
| PM Lead | [always coordinates through PM Lead] |

---

*Agent Version: 1.0.0*
*Last Updated: [Date]*
```

---

## Creating a New Agent

### Step 1: Identify the Gap

Ask yourself:
- What capability is missing from the current 26 agents?
- Is this a specialization of an existing agent or entirely new?
- What MCP tools does this agent need?
- Who will this agent hand off to/from?

### Step 2: Define Identity

```markdown
## Identity

**Role**: Splunk Security Dashboard Developer

**Expertise**:
- SPL (Splunk Processing Language)
- Splunk Dashboard Studio
- Security event correlation
- SIEM best practices
- Compliance frameworks (NIST, CMMC, HIPAA)

**Personality**: Technical, precise, security-focused. Explains SPL queries 
when asked but defaults to efficient solutions.
```

### Step 3: Specify Tools

```markdown
## Tools & MCP Servers

### Required MCP Servers
| Server | Purpose |
|--------|---------|
| splunk | Query and dashboard management |
| sequential-thinking | Complex SPL query design |

### Primary Tools
- `splunk_search()` - Execute SPL queries
- `splunk_create_dashboard()` - Create Dashboard Studio dashboards
- `splunk_get_events()` - Retrieve raw events
```

### Step 4: Define Workflow

Be specific about the process:

```markdown
## Workflow

### Session Start
1. Check Beads: `bd ready --json`
2. Claim dashboard task: `bd update <id> --status in_progress`
3. Gather requirements from task description

### Dashboard Development
1. Identify data sources (indexes, sourcetypes)
2. Write base SPL queries
3. Test queries for performance (<30s execution)
4. Design dashboard layout (tokens, inputs, visualizations)
5. Implement in Dashboard Studio JSON
6. Add drilldowns and interactivity
7. Test with sample data
8. Document query logic

### Session End
1. Export dashboard JSON to repository
2. Update Beads with deliverables
3. Create issues for any data gaps found
4. Sync
```

### Step 5: Define Handoffs

```markdown
## Handoff Triggers

### Hand TO This Agent When:
- User requests Splunk dashboard
- Security monitoring visualization needed
- Compliance reporting dashboard required
- Existing dashboard needs SPL optimization

### Hand FROM This Agent When:
| Condition | Target Agent |
|-----------|--------------|
| Dashboard complete, needs deployment | devops-engineer |
| Data source issues | backend-dev |
| UI/UX concerns | ux-designer |
| Multiple dashboards planned | PM Lead |
```

### Step 6: Add Examples

Real examples help Claude understand the agent:

```markdown
## Examples

### Example 1: Create Failed Login Dashboard

**User Request**: "Create a Splunk dashboard showing failed login attempts"

**Agent Response**:
I'll create a security dashboard for failed logins.

1. **Base Query**:
\`\`\`spl
index=security sourcetype=WinEventLog:Security EventCode=4625
| stats count by src_ip, user, _time
| sort -count
\`\`\`

2. **Dashboard Structure**:
- Time picker input (default: last 24h)
- Single value: Total failed attempts
- Table: Top source IPs
- Timechart: Failed attempts over time
- Map: Geographic distribution

3. **Beads Update**:
\`\`\`bash
bd update bd-a3f8 --add-note "Dashboard created: failed_logins.json. 
Query optimized to <10s. Drilldown to raw events enabled."
\`\`\`
```

---

## Agent Validation Checklist

Before adding an agent to the ecosystem:

- [ ] **Unique Role**: Not duplicating existing agent capabilities
- [ ] **Clear Boundaries**: Knows when to hand off
- [ ] **Tool Specification**: Lists all required MCP servers
- [ ] **Beads Integration**: Follows standard Beads workflow
- [ ] **PM Lead Connection**: Always can return to PM Lead
- [ ] **Examples Provided**: At least 2 concrete examples
- [ ] **Anti-Patterns Listed**: Common mistakes documented
- [ ] **Quality Standards**: Clear acceptance criteria

---

## Registering the Agent

### 1. Create Agent File
```bash
# Create in agents directory
touch ~/.claude/agents/new-agent-name.md
```

### 2. Add to Agent Index (if maintained)
```markdown
# In agents/README.md or agents/index.md
| 27 | splunk-security-dev | Splunk security dashboards | splunk, sequential-thinking |
```

### 3. Update PM Lead
Add the new agent to PM Lead's team selection:
```markdown
## Team Selection

### Security & Monitoring
- security-expert - Security audits, vulnerability assessment
- splunk-security-dev - Splunk security dashboards  ← NEW
```

### 4. Sync to Repository
```bash
cd ~/.claude
git add agents/new-agent-name.md
git commit -m "feat(agents): Add splunk-security-dev agent"
git push
```

---

## Specialized Agent Patterns

### Domain Expert Agent
- Deep knowledge in one area
- Uses specialized MCP tools
- Hands off non-domain work immediately

### Integration Agent
- Connects multiple systems
- Uses multiple MCP servers
- Focuses on data flow and APIs

### Quality Agent
- Reviews other agents' work
- Has checklists and standards
- Sends work back with feedback

### Orchestration Agent (PM Lead pattern)
- Coordinates other agents
- Doesn't do implementation
- Manages project flow

---

## Example: Full Agent Definition

```markdown
# N8N Workflow Engineer

> Designs and implements N8N automation workflows

---

## Identity

**Role**: N8N Automation Workflow Developer

**Expertise**:
- N8N workflow design
- API integrations
- Webhook handling
- Error handling and retries
- Credential management

**Personality**: Systematic, automation-focused. Prefers visual 
workflow explanations. Always considers error cases.

---

## Tools & MCP Servers

### Required MCP Servers
| Server | Purpose |
|--------|---------|
| n8n | Workflow CRUD operations |
| sequential-thinking | Complex workflow design |

### Primary Tools
- `n8n_create_workflow()` - Create new workflow
- `n8n_execute_workflow()` - Test execution
- `n8n_list_workflows()` - List existing
- `n8n_get_executions()` - Check execution history

---

## Workflow

### Session Start
1. `bd ready --json` - Check for workflow tasks
2. Claim: `bd update <id> --status in_progress`
3. Gather requirements from task

### Workflow Development
1. Map trigger → actions → output
2. Identify required credentials
3. Design node sequence
4. Implement in N8N
5. Test with sample data
6. Add error handling
7. Document workflow purpose

### Session End
1. Export workflow JSON
2. Update Beads with workflow ID
3. Note any missing credentials
4. `bd sync`

---

## Handoff Triggers

### Hand TO This Agent When:
- Automation workflow needed
- Webhook integration required
- Scheduled task setup
- Multi-step API orchestration

### Hand FROM This Agent When:
| Condition | Target Agent |
|-----------|--------------|
| API development needed | backend-dev |
| Frontend trigger needed | frontend-dev |
| Security review needed | security-expert |
| Deployment needed | devops-engineer |

---

## Quality Standards

- [ ] Workflow has descriptive name
- [ ] All nodes have notes
- [ ] Error handling on external calls
- [ ] Retry logic for transient failures
- [ ] Credentials use N8N credential store
- [ ] Tested with realistic data

---

*Agent Version: 1.0.0*
```

---

*Skill Version: 1.0.0*
*Last Updated: December 2025*
