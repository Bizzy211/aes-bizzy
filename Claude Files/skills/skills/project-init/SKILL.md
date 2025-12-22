# Project Initialization Skill

> Initialize new projects with full Claude Agent Ecosystem integration

---

## When to Use This Skill

Use this skill when:
- Starting a brand new project
- Setting up an existing project for Claude Code integration
- Migrating a project to use Beads/GitHub/Task Master
- Creating project templates

---

## Quick Start

```bash
# Initialize complete project
npx @jhc/claude-ecosystem project my-project --template web

# Or manually:
mkdir my-project && cd my-project
git init
bd init
task-master-ai:initialize_project
```

---

## Project Structure

A fully initialized project includes:

```
my-project/
├── .git/                    # Git repository
├── .beads/                  # Beads issue tracking
│   ├── issues.jsonl
│   └── config.json
├── .taskmaster/             # Task Master AI
│   ├── tasks/
│   │   └── tasks.json
│   ├── docs/
│   │   └── prd.txt
│   └── reports/
├── .github/                 # GitHub workflows
│   └── workflows/
│       └── ci.yml
├── CLAUDE.md                # Project-specific Claude instructions
├── .project-context         # Project metadata (legacy, optional)
└── [project files...]
```

---

## Initialization Steps

### Step 1: Create Project Directory

```bash
mkdir my-project
cd my-project
```

### Step 2: Initialize Git

```bash
git init
git branch -M main

# Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
.env
.env.local
*.log
dist/
build/
.DS_Store
Thumbs.db
EOF

git add .gitignore
git commit -m "chore: initial commit"
```

### Step 3: Initialize Beads

```bash
# Initialize Beads
bd init

# Create project epic
bd create "Project: My Application" \
  --description "Main project epic for My Application" \
  -t feature \
  -p 1 \
  --json

# Output: {"id": "bd-a3f8", ...}
```

### Step 4: Initialize Task Master

```javascript
// Using Task Master MCP
task-master-ai:initialize_project({
  projectRoot: "/path/to/my-project",
  yes: true,
  skipInstall: false,
  initGit: false,  // Already done
  storeTasksInGit: true,
  addAliases: false,
  rules: ["claude", "cursor"]
})
```

### Step 5: Create GitHub Repository

```javascript
// Create repo
mcp__github__create_repository({
  name: "my-project",
  description: "My Application",
  private: true,
  auto_init: false
})

// Add remote
// bash: git remote add origin https://github.com/bizzy211/my-project.git

// Create milestone
mcp__github__create_milestone({
  owner: "bizzy211",
  repo: "my-project",
  title: "v1.0.0 MVP",
  description: "Minimum viable product",
  due_on: "2025-03-01T00:00:00Z"
})
```

### Step 6: Create Project CLAUDE.md

```bash
cat > CLAUDE.md << 'EOF'
# My Application

## Project Overview
[Brief description of what this project does]

## Tech Stack
- Frontend: [React/Vue/etc]
- Backend: [Node/Python/etc]
- Database: [PostgreSQL/MongoDB/etc]

## Key Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests
```

### Task Management
```bash
bd ready --json      # See available work
bd sync              # Sync Beads to git
```

## Project Structure
```
src/
├── components/      # UI components
├── pages/           # Page components
├── api/             # API routes
└── utils/           # Utilities
```

## Agent Team
- **PM Lead**: Project coordination
- **Frontend Dev**: UI development
- **Backend Dev**: API development
- **Test Engineer**: Testing

## Current Focus
[What the team is currently working on]

## Beads Epic
- Epic ID: bd-XXXX
- GitHub Milestone: #1

---

*Last Updated: [Date]*
EOF
```

### Step 7: Push to GitHub

```bash
git add .
git commit -m "feat: project initialization with Claude ecosystem"
git push -u origin main
```

---

## Project Templates

### Web Application

```bash
# Create with template
npx @jhc/claude-ecosystem project my-web-app --template web
```

Template includes:
- Next.js or React setup
- Tailwind CSS
- TypeScript configuration
- ESLint + Prettier
- CI/CD workflow
- Testing setup (Vitest)

### API Service

```bash
npx @jhc/claude-ecosystem project my-api --template api
```

Template includes:
- Express or FastAPI setup
- Database configuration
- Authentication boilerplate
- OpenAPI documentation
- Docker configuration

### CLI Tool

```bash
npx @jhc/claude-ecosystem project my-cli --template cli
```

Template includes:
- Commander.js setup
- TypeScript configuration
- Build pipeline
- npm publish configuration

---

## Creating a PRD

After initialization, create a PRD for Task Master:

```bash
# Create PRD file
cat > .taskmaster/docs/prd.txt << 'EOF'
# My Application - Product Requirements Document

## Overview
[What the product does and why]

## Goals
1. [Primary goal]
2. [Secondary goal]
3. [Tertiary goal]

## Features

### Feature 1: User Authentication
- Users can sign up with email
- Users can login with OAuth (Google, GitHub)
- Sessions persist for 24 hours
- Password reset via email

### Feature 2: Dashboard
- Display user statistics
- Show recent activity
- Allow customization

### Feature 3: API
- RESTful endpoints
- JWT authentication
- Rate limiting

## Technical Requirements
- Response time < 200ms
- 99.9% uptime
- Mobile responsive

## Timeline
- Phase 1 (MVP): 4 weeks
- Phase 2 (Beta): 2 weeks
- Phase 3 (Launch): 2 weeks

## Success Metrics
- [Metric 1]
- [Metric 2]
EOF
```

Then parse with Task Master:

```javascript
task-master-ai:parse_prd({
  projectRoot: "/path/to/my-project",
  input: ".taskmaster/docs/prd.txt",
  force: true,
  numTasks: "10"
})
```

---

## Integration Checklist

### Beads Integration
- [ ] `bd init` completed
- [ ] Project epic created
- [ ] First tasks created
- [ ] `.beads/` added to git

### GitHub Integration
- [ ] Repository created
- [ ] Milestone created
- [ ] Labels configured
- [ ] CI workflow added

### Task Master Integration
- [ ] Project initialized
- [ ] PRD created
- [ ] Tasks parsed from PRD
- [ ] Complexity analyzed

### Claude Integration
- [ ] CLAUDE.md created
- [ ] Tech stack documented
- [ ] Commands documented
- [ ] Agent team defined

---

## Project Metadata

### .project-context (Optional)

Legacy format, still supported:

```json
{
  "project_name": "my-project",
  "description": "My Application",
  "created_at": "2025-12-21T00:00:00Z",
  "tech_stack": {
    "frontend": "React",
    "backend": "Node.js",
    "database": "PostgreSQL"
  },
  "beads_epic": "bd-a3f8",
  "github_repo": "bizzy211/my-project",
  "github_milestone": 1,
  "team": [
    "pm-lead",
    "frontend-dev",
    "backend-dev",
    "test-engineer"
  ]
}
```

### .beads/project-meta.json (Preferred)

New format stored in Beads:

```json
{
  "project_name": "my-project",
  "epic_id": "bd-a3f8",
  "github_repo": "bizzy211/my-project",
  "github_milestone": 1,
  "created": "2025-12-21T00:00:00Z",
  "team": ["pm-lead", "frontend-dev", "backend-dev"]
}
```

---

## Post-Initialization Tasks

After project is initialized:

### 1. Analyze Complexity

```javascript
task-master-ai:analyze_project_complexity({
  projectRoot: "/path/to/my-project",
  threshold: 5,
  research: false
})
```

### 2. Expand High-Complexity Tasks

```javascript
task-master-ai:expand_task({
  projectRoot: "/path/to/my-project",
  id: "1",  // Task ID
  force: false,
  research: false
})
```

### 3. Create First Sprint

```bash
# Create sprint milestone
bd create "Sprint 1: Foundation" \
  --description "Initial project setup and core infrastructure" \
  -t milestone \
  -p 1 \
  --deps parent:bd-a3f8 \
  --json

# Add sprint tasks
bd create "Setup CI/CD pipeline" --deps parent:bd-xxxx -p 1 --json
bd create "Configure database" --deps parent:bd-xxxx -p 1 --json
bd create "Create API boilerplate" --deps parent:bd-xxxx -p 2 --json
```

### 4. Start Working

```bash
# Check ready work
bd ready --json

# Claim first task
bd update bd-xxxx --status in_progress

# Begin development...
```

---

## Automation with Hooks

Add project-specific hooks:

```bash
mkdir -p .claude/hooks

# Pre-commit quality check
cat > .claude/hooks/pre-commit.py << 'EOF'
#!/usr/bin/env python3
import subprocess
import sys

# Run linting
result = subprocess.run(["npm", "run", "lint"], capture_output=True)
if result.returncode != 0:
    print("❌ Linting failed. Fix errors before committing.")
    sys.exit(1)

# Run tests
result = subprocess.run(["npm", "run", "test"], capture_output=True)
if result.returncode != 0:
    print("❌ Tests failed. Fix tests before committing.")
    sys.exit(1)

print("✅ Pre-commit checks passed")
EOF

chmod +x .claude/hooks/pre-commit.py
```

---

## Full Initialization Script

Complete script for manual initialization:

```bash
#!/bin/bash
# initialize-project.sh

PROJECT_NAME=$1
GITHUB_USER="bizzy211"

if [ -z "$PROJECT_NAME" ]; then
  echo "Usage: ./initialize-project.sh <project-name>"
  exit 1
fi

echo "🚀 Initializing project: $PROJECT_NAME"

# Create directory
mkdir -p "$PROJECT_NAME"
cd "$PROJECT_NAME"

# Git
echo "📁 Initializing Git..."
git init
git branch -M main

# Gitignore
cat > .gitignore << 'EOF'
node_modules/
.env
.env.local
*.log
dist/
build/
.DS_Store
EOF

# Beads
echo "🔮 Initializing Beads..."
bd init

# CLAUDE.md
echo "📝 Creating CLAUDE.md..."
cat > CLAUDE.md << EOF
# $PROJECT_NAME

## Overview
[Project description]

## Tech Stack
- [Stack items]

## Commands
\`\`\`bash
bd ready --json    # Available work
bd sync            # Sync to git
\`\`\`
EOF

# Initial commit
git add .
git commit -m "chore: initialize project with Claude ecosystem"

echo "✅ Project initialized!"
echo ""
echo "Next steps:"
echo "1. Create GitHub repo: gh repo create $PROJECT_NAME --private"
echo "2. Create PRD: vim .taskmaster/docs/prd.txt"
echo "3. Parse PRD: task-master-ai:parse_prd"
echo "4. Start working: bd ready --json"
```

---

## Troubleshooting

### Beads init fails
```bash
# Check if already initialized
ls .beads/

# Force reinitialize
bd init --force
```

### Task Master not finding project
```bash
# Ensure absolute path
task-master-ai:get_tasks --projectRoot "$(pwd)"
```

### GitHub repo creation fails
```bash
# Check authentication
gh auth status

# Manual creation
gh repo create my-project --private
```

---

*Skill Version: 1.0.0*
*Last Updated: December 2025*
