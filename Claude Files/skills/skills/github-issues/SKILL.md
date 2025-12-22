# GitHub Issues & Repository Management Skill

> External visibility, milestones, PRs, and releases via GitHub MCP

---

## When to Use This Skill

Use this skill when:
- Creating issues for external stakeholder visibility
- Managing milestones and releases
- Creating or reviewing pull requests
- Managing repository settings
- Coordinating with GitHub Actions workflows
- Publishing releases

**Use GitHub for**: External visibility, PRs, releases, CI/CD
**Use Beads for**: Daily tasks, agent handoffs, internal tracking

---

## MCP Server Setup

```bash
# Add GitHub MCP to Claude Code
claude mcp add github -s user -- npx -y @modelcontextprotocol/server-github

# Requires environment variable
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxxxxxxxxxxx
```

### Required Token Scopes
- `repo` - Full repository access
- `read:org` - Read organization data
- `workflow` - Manage GitHub Actions

---

## Quick Reference

### Issues
```javascript
// Create issue
mcp__github__create_issue({
  owner: "bizzy211",
  repo: "my-project",
  title: "Bug: Login fails on Safari",
  body: "## Description\n\nLogin button unresponsive...",
  labels: ["bug", "priority-high"],
  assignees: ["bizzy211"]
})

// List issues
mcp__github__list_issues({
  owner: "bizzy211",
  repo: "my-project",
  state: "open",
  labels: "bug"
})

// Update issue
mcp__github__update_issue({
  owner: "bizzy211",
  repo: "my-project",
  issue_number: 42,
  state: "closed",
  labels: ["bug", "resolved"]
})
```

### Pull Requests
```javascript
// Create PR
mcp__github__create_pull_request({
  owner: "bizzy211",
  repo: "my-project",
  title: "feat: Add OAuth login",
  body: "Implements #42\n\n## Changes\n- Added Google OAuth\n- Added GitHub OAuth",
  head: "feature/oauth-login",
  base: "main"
})

// List PRs
mcp__github__list_pull_requests({
  owner: "bizzy211",
  repo: "my-project",
  state: "open"
})
```

### Milestones
```javascript
// Create milestone
mcp__github__create_milestone({
  owner: "bizzy211",
  repo: "my-project",
  title: "v1.0 MVP",
  description: "Minimum viable product release",
  due_on: "2025-02-01T00:00:00Z"
})

// List milestones
mcp__github__list_milestones({
  owner: "bizzy211",
  repo: "my-project",
  state: "open"
})
```

---

## Issue Templates

### Bug Report
```javascript
mcp__github__create_issue({
  owner: "bizzy211",
  repo: "my-project",
  title: "Bug: [Brief description]",
  body: `## Bug Description
A clear description of what the bug is.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What should happen.

## Actual Behavior
What actually happens.

## Environment
- OS: Windows 11
- Browser: Chrome 120
- Version: 1.0.0

## Screenshots
If applicable, add screenshots.

## Additional Context
Any other relevant information.`,
  labels: ["bug", "triage"]
})
```

### Feature Request
```javascript
mcp__github__create_issue({
  owner: "bizzy211",
  repo: "my-project",
  title: "Feature: [Brief description]",
  body: `## Feature Description
A clear description of what you want.

## Problem Statement
What problem does this solve?

## Proposed Solution
How should it work?

## Alternatives Considered
What other solutions did you consider?

## Additional Context
Any mockups, diagrams, or references.`,
  labels: ["enhancement", "feature-request"]
})
```

### Epic Issue
```javascript
mcp__github__create_issue({
  owner: "bizzy211",
  repo: "my-project",
  title: "Epic: User Authentication System",
  body: `## Overview
Complete authentication system with multiple providers.

## Goals
- [ ] OAuth integration (Google, GitHub)
- [ ] Session management
- [ ] 2FA support
- [ ] Password reset flow

## Success Criteria
- Users can sign up/login with OAuth
- Sessions persist for 24 hours
- 2FA optional but encouraged

## Related Issues
- #10 OAuth Implementation
- #11 Session Management
- #12 2FA Setup

## Timeline
Target: Q1 2025`,
  labels: ["epic", "priority-high"],
  milestone: 1
})
```

---

## Pull Request Workflow

### Creating a PR

```javascript
// 1. Create the PR
const pr = mcp__github__create_pull_request({
  owner: "bizzy211",
  repo: "my-project",
  title: "feat(auth): Add OAuth login providers",
  body: `## Summary
Implements OAuth authentication with Google and GitHub.

## Related Issues
Closes #42
Relates to #10

## Changes
- Added Google OAuth provider
- Added GitHub OAuth provider
- Updated login UI with provider buttons
- Added session management

## Testing
- [ ] Manual testing on Chrome
- [ ] Manual testing on Safari
- [ ] Unit tests pass
- [ ] Integration tests pass

## Screenshots
[Add before/after screenshots]

## Checklist
- [x] Code follows project style guidelines
- [x] Tests added for new functionality
- [x] Documentation updated
- [x] No breaking changes`,
  head: "feature/oauth-login",
  base: "main",
  draft: false
})

// 2. Request reviewers
mcp__github__request_reviewers({
  owner: "bizzy211",
  repo: "my-project",
  pull_number: pr.number,
  reviewers: ["reviewer1", "reviewer2"]
})

// 3. Add labels
mcp__github__add_labels({
  owner: "bizzy211",
  repo: "my-project",
  issue_number: pr.number,
  labels: ["feature", "auth", "needs-review"]
})
```

### PR Title Conventions

Use conventional commits format:

| Prefix | Use Case |
|--------|----------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `style:` | Formatting, no code change |
| `refactor:` | Code restructuring |
| `test:` | Adding tests |
| `chore:` | Maintenance tasks |

Examples:
- `feat(auth): Add Google OAuth login`
- `fix(api): Handle null response from server`
- `docs: Update README with setup instructions`

---

## Milestone Management

### Project Phases as Milestones

```javascript
// Create milestones for each phase
const milestones = [
  {
    title: "v0.1.0 - Foundation",
    description: "Project setup, CI/CD, basic infrastructure",
    due_on: "2025-01-15T00:00:00Z"
  },
  {
    title: "v0.2.0 - Core Features",
    description: "Authentication, database, API foundation",
    due_on: "2025-02-01T00:00:00Z"
  },
  {
    title: "v1.0.0 - MVP",
    description: "Minimum viable product release",
    due_on: "2025-03-01T00:00:00Z"
  }
];

for (const m of milestones) {
  mcp__github__create_milestone({
    owner: "bizzy211",
    repo: "my-project",
    ...m
  });
}
```

### Linking Issues to Milestones

```javascript
// When creating issue
mcp__github__create_issue({
  owner: "bizzy211",
  repo: "my-project",
  title: "Implement login API",
  milestone: 2  // Milestone number
})

// When updating issue
mcp__github__update_issue({
  owner: "bizzy211",
  repo: "my-project",
  issue_number: 42,
  milestone: 2
})
```

---

## Release Management

### Creating a Release

```javascript
// 1. Create release
mcp__github__create_release({
  owner: "bizzy211",
  repo: "my-project",
  tag_name: "v1.0.0",
  name: "v1.0.0 - MVP Release",
  body: `## 🎉 MVP Release

### Features
- OAuth authentication (Google, GitHub)
- User dashboard
- API v1 endpoints

### Bug Fixes
- Fixed session timeout issue (#45)
- Fixed mobile responsive layout (#52)

### Breaking Changes
None

### Upgrade Instructions
\`\`\`bash
npm install my-project@1.0.0
\`\`\`

### Contributors
@bizzy211, @contributor1

**Full Changelog**: https://github.com/bizzy211/my-project/compare/v0.2.0...v1.0.0`,
  draft: false,
  prerelease: false,
  target_commitish: "main"
})
```

### Release Checklist

Before creating release:
1. ✅ All milestone issues closed
2. ✅ All tests passing
3. ✅ Changelog updated
4. ✅ Version bumped in package.json
5. ✅ Documentation updated
6. ✅ PR merged to main

---

## Integration with Beads

### Sync Pattern

```bash
# In Beads - create epic
bd create "Epic: Auth System" -t feature -p 1 --json
# Returns bd-a3f8

# In GitHub - create corresponding issue for visibility
mcp__github__create_issue({
  title: "Epic: Auth System",
  body: "Internal tracking: bd-a3f8\n\n[Epic description...]",
  labels: ["epic"]
})
# Returns #10

# Update Beads with GitHub reference
bd update bd-a3f8 --add-note "GitHub Issue: #10"
```

### When to Use Each

| Beads | GitHub |
|-------|--------|
| Daily tasks | Epics & milestones |
| Agent handoffs | External bugs |
| Internal blockers | Feature requests |
| Context notes | PR tracking |
| Dependency graphs | Releases |

---

## Repository Operations

### Get Repository Info
```javascript
mcp__github__get_repository({
  owner: "bizzy211",
  repo: "my-project"
})
```

### Create Repository
```javascript
mcp__github__create_repository({
  name: "new-project",
  description: "My new project",
  private: true,
  auto_init: true
})
```

### List Branches
```javascript
mcp__github__list_branches({
  owner: "bizzy211",
  repo: "my-project"
})
```

### Get Workflow Runs
```javascript
mcp__github__list_workflow_runs({
  owner: "bizzy211",
  repo: "my-project",
  workflow_id: "ci.yml"
})
```

---

## Label System

### Recommended Labels

```javascript
const labels = [
  // Type
  { name: "bug", color: "d73a4a", description: "Something isn't working" },
  { name: "enhancement", color: "a2eeef", description: "New feature or request" },
  { name: "documentation", color: "0075ca", description: "Documentation updates" },
  { name: "epic", color: "7057ff", description: "Large feature or initiative" },
  
  // Priority
  { name: "priority-critical", color: "b60205", description: "Must fix immediately" },
  { name: "priority-high", color: "d93f0b", description: "Important, fix soon" },
  { name: "priority-medium", color: "fbca04", description: "Normal priority" },
  { name: "priority-low", color: "0e8a16", description: "Nice to have" },
  
  // Status
  { name: "needs-triage", color: "ededed", description: "Needs initial review" },
  { name: "needs-review", color: "fbca04", description: "Ready for code review" },
  { name: "in-progress", color: "0052cc", description: "Being worked on" },
  { name: "blocked", color: "b60205", description: "Blocked by dependency" },
  
  // Area
  { name: "frontend", color: "1d76db", description: "Frontend related" },
  { name: "backend", color: "5319e7", description: "Backend related" },
  { name: "api", color: "006b75", description: "API related" },
  { name: "auth", color: "d4c5f9", description: "Authentication related" }
];

// Create all labels
for (const label of labels) {
  mcp__github__create_label({
    owner: "bizzy211",
    repo: "my-project",
    ...label
  });
}
```

---

## Common Patterns

### Close Issue via Commit
Include in commit message:
- `Fixes #42` - Closes when merged to default branch
- `Closes #42` - Same as Fixes
- `Resolves #42` - Same as Fixes

### Link PR to Issue
In PR body:
```markdown
## Related Issues
Closes #42
Fixes #43
Relates to #44
```

### Auto-assign Labels via Title
Many repos use bots, but manually:
```javascript
// Check title prefix and add label
if (title.startsWith("Bug:")) {
  mcp__github__add_labels({...labels: ["bug"]})
}
```

---

## Troubleshooting

### "Not Found" Error
- Check repository name and owner
- Verify token has `repo` scope
- Check if repo is private and token has access

### "Validation Failed" 
- Check required fields (title, body format)
- Verify milestone/label exists
- Check assignee is valid collaborator

### Rate Limiting
- GitHub API: 5000 requests/hour (authenticated)
- Use search sparingly
- Cache results when possible

---

*Skill Version: 1.0.0*
*Last Updated: December 2025*
