# GitHub Issues - Issue Workflow Management

GitHub Issues skill provides streamlined issue creation, management, and integration with Beads task tracking.

## Overview

Manage GitHub issues with AI-assisted descriptions, automated labeling, and coordinated task tracking via Beads.

## Core Commands

### Issue Creation

```bash
# Create issue with title and body
gh issue create --title "Fix authentication bug" --body "Description..."

# Create with labels and assignee
gh issue create --title "Add dark mode" --label "enhancement,ui" --assignee "@me"

# Create from template
gh issue create --template bug_report.md

# Interactive creation
gh issue create
```

### Issue Management

```bash
# List issues
gh issue list
gh issue list --state open --label bug
gh issue list --assignee @me

# View issue details
gh issue view 123

# Update issue
gh issue edit 123 --title "Updated title"
gh issue edit 123 --add-label "priority:high"

# Close issue
gh issue close 123
gh issue close 123 --reason completed
```

### Issue Search

```bash
# Search issues
gh issue list --search "authentication"
gh issue list --search "is:open label:bug"

# Filter by milestone
gh issue list --milestone "v1.0"
```

## Beads Integration

### Create Beads Task from Issue

```bash
# Get issue and create Beads task
ISSUE=$(gh issue view 123 --json title,body,labels)
bd create "$(echo $ISSUE | jq -r .title)" --assign debugger --metadata "$ISSUE"

# Link Beads task to issue
bd update BEADS_ID --add-note "GitHub Issue: #123"
```

### Sync Issue Status with Beads

```bash
# When closing issue, update Beads
gh issue close 123 --reason completed
bd set-status BEADS_ID done --add-note "Issue #123 resolved"

# When issue reopened, update Beads
gh issue reopen 123
bd set-status BEADS_ID in-progress --add-note "Issue #123 reopened"
```

### Agent Assignment Pattern

```bash
# Assign issue to agent via Beads
gh issue view 123 --json title,body | \
  bd create --from-stdin --assign backend-dev

# Agent completes work
bd update BEADS_ID --add-note "Fix implemented in commit abc123"
gh issue close 123 --reason completed --comment "Fixed in abc123"
```

## Cross-References

### Related Agents
- **debugger**: Assigned to bug issues
- **backend-dev**: Assigned to backend issues
- **frontend-dev**: Assigned to UI issues
- **docs-engineer**: Assigned to documentation issues

### Related Skills
- **beads**: Task tracking for issue work
- **task-master**: Higher-level project management

### Related Hooks
- **pre_commit_validator.py**: Validates issue references in commits

## Issue Templates

### Bug Report
```markdown
## Description
[Clear description of the bug]

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Environment
- OS:
- Version:
```

### Feature Request
```markdown
## Summary
[Brief description of the feature]

## Motivation
[Why is this feature needed?]

## Proposed Solution
[How should it work?]

## Alternatives Considered
[Other approaches considered]
```

## Workflow Integration

### Issue-to-Task Pipeline

```bash
# 1. Create issue
gh issue create --title "Implement OAuth" --label "feature"

# 2. Create Beads task with assignment
bd create "Implement OAuth" --assign integration-expert \
  --add-note "GitHub Issue: #$(gh issue list --limit 1 --json number -q '.[0].number')"

# 3. Agent works on task
bd update TASK_ID --add-note "Started OAuth implementation"

# 4. Link PR to issue
gh pr create --title "Implement OAuth" --body "Closes #123"

# 5. Complete task and close issue
bd set-status TASK_ID done
gh issue close 123 --reason completed
```

## Best Practices

1. **Use labels consistently** - Enable filtering and automation
2. **Link to Beads tasks** - Track work across systems
3. **Reference issues in commits** - Create audit trail
4. **Use templates** - Ensure complete information
5. **Assign via Beads** - Coordinate agent work

---

*A.E.S - Bizzy Skill - GitHub Issues Integration v1.0.0*
