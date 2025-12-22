# Skill Creator Skill

> Create new skills to extend Claude Code's capabilities

---

## When to Use This Skill

Use this skill when:
- Creating a new capability that Claude should have
- Documenting best practices for a specific tool or domain
- Standardizing how Claude interacts with an MCP server
- Creating reusable patterns for common tasks

---

## What is a Skill?

A skill is a **knowledge document** that teaches Claude how to perform specific tasks. Skills are:

- Stored in `~/.claude/skills/` (user skills) or `/mnt/skills/public/` (built-in)
- Automatically read by Claude when relevant to a task
- Written in Markdown with specific sections
- Named `SKILL.md` inside a descriptive folder

---

## Skill Anatomy

```
skills/
└── my-skill/
    ├── SKILL.md           # Main skill document (required)
    ├── templates/         # Template files (optional)
    │   ├── template1.md
    │   └── template2.json
    └── examples/          # Example outputs (optional)
        └── example1.md
```

---

## SKILL.md Structure

```markdown
# [Skill Name] Skill

> [One-line description]

---

## When to Use This Skill

Use this skill when:
- [Trigger condition 1]
- [Trigger condition 2]
- [Trigger condition 3]

---

## Quick Reference

[Essential commands/patterns for quick lookup]

---

## Core Concepts

[Explain fundamental concepts needed to understand this skill]

---

## Step-by-Step Guide

### [Task 1]
[Detailed instructions]

### [Task 2]
[Detailed instructions]

---

## Best Practices

[Do's and don'ts]

---

## Examples

### Example 1: [Name]
[Complete worked example]

### Example 2: [Name]
[Complete worked example]

---

## Troubleshooting

### [Problem 1]
[Solution]

### [Problem 2]
[Solution]

---

*Skill Version: X.X.X*
*Last Updated: [Date]*
```

---

## Skill Template

```markdown
# [Skill Name] Skill

> [Brief description of what this skill enables]

---

## When to Use This Skill

Use this skill when:
- [Primary use case]
- [Secondary use case]
- [Tertiary use case]

**Do NOT use this skill when**:
- [Anti-use case - when another skill is better]

---

## Prerequisites

Before using this skill, ensure:
- [ ] [Prerequisite 1 - e.g., MCP server installed]
- [ ] [Prerequisite 2 - e.g., API key configured]
- [ ] [Prerequisite 3 - e.g., dependency installed]

---

## Quick Reference

### Essential Commands
```bash
# [Most common command 1]
command --flag value

# [Most common command 2]  
another-command --option
```

### Key Patterns
| Pattern | Use Case |
|---------|----------|
| [Pattern 1] | [When to use] |
| [Pattern 2] | [When to use] |

---

## Core Concepts

### [Concept 1]
[Explanation with examples]

### [Concept 2]
[Explanation with examples]

### [Concept 3]
[Explanation with examples]

---

## Detailed Workflow

### Step 1: [First Step Name]

[Detailed explanation]

```[language]
[Code example]
```

**Expected Output**:
```
[What user should see]
```

### Step 2: [Second Step Name]

[Detailed explanation]

```[language]
[Code example]
```

### Step 3: [Third Step Name]

[Continue pattern...]

---

## Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| [option1] | [default] | [what it does] |
| [option2] | [default] | [what it does] |

---

## Best Practices

### ✅ Do
- [Best practice 1]
- [Best practice 2]
- [Best practice 3]

### ❌ Don't
- [Anti-pattern 1]
- [Anti-pattern 2]
- [Anti-pattern 3]

---

## Integration with Other Skills

| Skill | Integration Point |
|-------|-------------------|
| [skill-1] | [How they work together] |
| [skill-2] | [How they work together] |

---

## Examples

### Example 1: [Simple Use Case]

**Scenario**: [Description of what user wants]

**Solution**:
```[language]
[Complete working code]
```

**Result**: [What happens]

---

### Example 2: [Complex Use Case]

**Scenario**: [Description of what user wants]

**Solution**:

Step 1:
```[language]
[Code]
```

Step 2:
```[language]
[Code]
```

**Result**: [What happens]

---

## Troubleshooting

### Problem: [Common Issue 1]

**Symptoms**: [What user sees]

**Cause**: [Why it happens]

**Solution**:
```bash
[Fix command]
```

---

### Problem: [Common Issue 2]

**Symptoms**: [What user sees]

**Cause**: [Why it happens]

**Solution**:
```bash
[Fix command]
```

---

## Appendix

### Related Resources
- [Link 1]
- [Link 2]

### Version History
| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | [Date] | Initial release |

---

*Skill Version: 1.0.0*
*Last Updated: [Date]*
*Maintainer: [Name/Org]*
```

---

## Creating a New Skill

### Step 1: Identify the Need

Ask yourself:
- What task do I repeatedly explain to Claude?
- What MCP server needs usage documentation?
- What domain knowledge should Claude have?
- What patterns should be standardized?

### Step 2: Create Directory Structure

```bash
# Create skill directory
mkdir -p ~/.claude/skills/my-new-skill/templates
mkdir -p ~/.claude/skills/my-new-skill/examples

# Create main skill file
touch ~/.claude/skills/my-new-skill/SKILL.md
```

### Step 3: Write the Skill

Follow the template above. Key sections:

1. **When to Use**: Claude reads this to decide if skill is relevant
2. **Quick Reference**: Fast lookup for common patterns
3. **Examples**: Most important - Claude learns from examples
4. **Troubleshooting**: Saves time when things go wrong

### Step 4: Add Templates (Optional)

If your skill involves creating files, add templates:

```bash
# ~/.claude/skills/my-new-skill/templates/output-template.json
{
  "name": "{{NAME}}",
  "version": "1.0.0",
  "config": {}
}
```

Reference in SKILL.md:
```markdown
## Output Format

Use the template at `templates/output-template.json`:
\`\`\`json
{
  "name": "{{NAME}}",
  "version": "1.0.0",
  "config": {}
}
\`\`\`
```

### Step 5: Test the Skill

1. Start a new Claude Code session
2. Ask Claude to perform the skill's task
3. Check if Claude reads the skill file
4. Verify output matches expectations
5. Refine based on results

### Step 6: Register and Sync

```bash
# Add to git
cd ~/.claude
git add skills/my-new-skill/
git commit -m "feat(skills): Add my-new-skill"
git push
```

---

## Skill Design Principles

### 1. Be Trigger-Specific
```markdown
## When to Use This Skill

✅ Good:
- Creating Ansible playbooks for certificate deployment
- Automating PKI certificate renewal

❌ Bad:
- When doing Ansible stuff
- For automation
```

### 2. Lead with Examples
Claude learns best from concrete examples. Put them early and make them complete.

### 3. Show Don't Tell
```markdown
✅ Good:
\`\`\`python
# Complete working code
import requests
response = requests.get("https://api.example.com")
data = response.json()
\`\`\`

❌ Bad:
Use the requests library to make an API call and parse JSON.
```

### 4. Include Error Cases
```markdown
## Troubleshooting

### Problem: API returns 401

**Cause**: Token expired or invalid

**Solution**:
1. Regenerate token at https://...
2. Update in ~/.config/app/token
3. Retry command
```

### 5. Reference Other Skills
```markdown
## Related Skills

For database operations after API calls, see the [Supabase Skill](../supabase/SKILL.md).
```

---

## Skill Categories

### Tool Skills
Document how to use a specific tool or MCP server:
- `beads/SKILL.md` - Beads CLI
- `github-issues/SKILL.md` - GitHub MCP
- `exa-ai/SKILL.md` - Exa search

### Domain Skills
Encode domain expertise:
- `splunk-security/SKILL.md` - Security dashboards
- `federal-compliance/SKILL.md` - NIST, CMMC, FedRAMP
- `ansible-pki/SKILL.md` - Certificate automation

### Pattern Skills
Standardize recurring patterns:
- `api-integration/SKILL.md` - REST API patterns
- `error-handling/SKILL.md` - Try/catch patterns
- `testing-patterns/SKILL.md` - Unit test patterns

### Creator Skills
Meta-skills for creating other things:
- `agent-creator/SKILL.md` - Create agents
- `skill-creator/SKILL.md` - Create skills (this one!)
- `hook-creator/SKILL.md` - Create hooks

---

## Skill Quality Checklist

Before considering a skill complete:

- [ ] **Clear Trigger**: "When to Use" is specific and actionable
- [ ] **Prerequisites Listed**: Dependencies and setup documented
- [ ] **Quick Reference**: Common patterns for fast lookup
- [ ] **2+ Complete Examples**: Working code, not pseudocode
- [ ] **Troubleshooting Section**: Common problems and solutions
- [ ] **Version Info**: Version number and last updated date
- [ ] **Tested**: Verified Claude uses it correctly

---

## Example: Complete Skill

See the other skills in this repository for complete examples:
- `beads/SKILL.md` - Tool skill example
- `agent-creator/SKILL.md` - Creator skill example
- `task-master/SKILL.md` - Complex tool skill

---

*Skill Version: 1.0.0*
*Last Updated: December 2025*
