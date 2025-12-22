# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive test suite with 400+ tests covering all modules
- Integration tests for multi-agent orchestration
- Integration tests for context awareness
- Integration tests for Beads context persistence
- Integration tests for issue management workflow E2E

## [1.0.0] - 2024-12-22

### Added

#### Core CLI
- **7-Step Initialization Wizard** - Interactive setup for Claude Code development environments
  - Prerequisites verification (Node.js, Git, Claude CLI, GitHub CLI)
  - GitHub authentication and SSH key management
  - Private repository sync for custom configurations
  - Beads memory system installation
  - Task Master AI-powered task management
  - MCP servers configuration
  - Ecosystem configuration finalization

#### Commands
- `init` - Initialize Claude Code development environment with wizard
- `project <name>` - Create new project with ecosystem integration
- `doctor` - Health check and diagnostics with auto-fix capability
- `update` - Update ecosystem components to latest versions
- `sync` - Sync configuration files with templates

#### Project Templates
- `basic` - Minimal project structure
- `web` - Web application with React/Next.js
- `api` - API server with Express/Fastify
- `fullstack` - Full-stack application

#### Configuration Management
- Ecosystem configuration at `~/.claude/ecosystem.json`
- Project context at `.project-context`
- CLAUDE.md project instructions
- Validation and migration support

#### Integrations
- **Task Master** - AI-powered task management with PRD parsing
- **Beads** - Context persistence across sessions
- **GitHub** - Repository creation and management
- **MCP Servers** - Supabase, Tavily, ElevenLabs, Context7, etc.

#### Developer Experience
- Colorful CLI with gradient banner
- Progress spinners and status indicators
- Verbose and silent modes
- Dry-run support for safe previews
- JSON output for scripting

### Security
- SSH key management for GitHub
- Secure credential handling
- No sensitive data in configuration files

## [0.1.0] - 2024-12-01

### Added
- Initial project structure
- Basic CLI framework with Commander
- Logging utility with chalk colors
- Shell command execution utilities
- TypeScript configuration

---

[Unreleased]: https://github.com/jhc/claude-ecosystem/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/jhc/claude-ecosystem/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/jhc/claude-ecosystem/releases/tag/v0.1.0
