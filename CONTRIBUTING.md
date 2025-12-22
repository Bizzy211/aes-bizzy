# Contributing to Claude Ecosystem CLI

Thank you for your interest in contributing to Claude Ecosystem CLI! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you are expected to uphold this code.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Set up the development environment
4. Create a feature branch
5. Make your changes
6. Submit a pull request

## Development Setup

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+
- Git
- TypeScript knowledge

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/claude-ecosystem.git
cd claude-ecosystem

# Install dependencies
npm install

# Build the project
npm run build

# Run tests to verify setup
npm test
```

### Development Commands

```bash
# Build TypeScript
npm run build

# Watch mode for development
npm run build:watch

# Run development version
npm run dev

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/cli/init.test.ts

# Type checking
npm run typecheck

# Linting
npm run lint

# Clean build artifacts
npm run clean
```

### Testing Your Changes

```bash
# Run the CLI in development mode
npm run dev -- init --skip-github

# Or link globally for testing
npm link
claude-ecosystem doctor
```

## Project Structure

```
claude-ecosystem/
├── src/
│   ├── cli/              # CLI command implementations
│   │   ├── index.ts      # Main CLI entry point
│   │   ├── init.ts       # Init wizard
│   │   ├── doctor.ts     # Health check command
│   │   ├── project.ts    # Project creation
│   │   └── update.ts     # Update command
│   ├── config/           # Configuration management
│   │   └── ecosystem-config.ts
│   ├── installers/       # Tool installers
│   │   ├── beads.ts
│   │   ├── prerequisites.ts
│   │   └── task-master.ts
│   ├── sync/             # Sync and backup utilities
│   │   ├── backup.ts
│   │   └── repo-sync.ts
│   ├── detection/        # Project detection
│   │   └── project-detector.ts
│   ├── integrations/     # External integrations
│   │   └── github-automation/
│   ├── ui/               # UI components
│   │   ├── banner.ts
│   │   ├── prompts.ts
│   │   └── progress.ts
│   ├── utils/            # Utilities
│   │   ├── logger.ts
│   │   ├── shell.ts
│   │   └── platform.ts
│   └── types/            # TypeScript types
│       ├── ecosystem.ts
│       └── *.ts
├── tests/
│   ├── cli/              # CLI tests
│   ├── config/           # Configuration tests
│   ├── installers/       # Installer tests
│   ├── integration/      # Integration tests
│   └── utils/            # Utility tests
├── bin/                  # CLI binary entry point
├── templates/            # Project templates
└── docs/                 # Additional documentation
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode (`strict: true` in tsconfig.json)
- Prefer interfaces over type aliases for object shapes
- Use explicit return types for functions
- Document public APIs with JSDoc comments

### Code Style

- Use 2-space indentation
- Use single quotes for strings
- No semicolons (enforced by ESLint)
- Maximum line length: 100 characters
- Use meaningful variable and function names

### Example Code Style

```typescript
/**
 * Check if a prerequisite is installed
 * @param name - The name of the prerequisite
 * @returns The check result
 */
export async function checkPrerequisite(name: string): Promise<PrerequisiteResult> {
  const command = getCommand(name)

  try {
    const result = await executeCommand(command, ['--version'])
    return {
      met: result.exitCode === 0,
      name,
      version: parseVersion(result.stdout),
    }
  } catch (error) {
    return {
      met: false,
      name,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
```

### File Naming

- Use kebab-case for file names: `ecosystem-config.ts`
- Use PascalCase for types and interfaces: `EcosystemConfig`
- Use camelCase for functions and variables: `loadConfig`

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(init): add skip-mcp option to wizard

fix(doctor): handle missing config file gracefully

docs: update README with new commands

test(config): add validation edge cases
```

## Testing

### Test Structure

Tests use Vitest and follow this structure:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { functionToTest } from '../src/module'

describe('ModuleName', () => {
  beforeEach(() => {
    // Setup
  })

  afterEach(() => {
    // Cleanup
    vi.restoreAllMocks()
  })

  describe('functionToTest', () => {
    it('should do something specific', async () => {
      const result = await functionToTest()
      expect(result).toBe(expected)
    })

    it('should handle edge case', async () => {
      // Test edge case
    })
  })
})
```

### Test Coverage

- Aim for >80% code coverage
- All new features must include tests
- Bug fixes should include regression tests

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific file
npm test -- tests/cli/init.test.ts

# Run in watch mode
npm test -- --watch
```

## Submitting Changes

### Before Submitting

1. **Run tests**: `npm test`
2. **Check types**: `npm run typecheck`
3. **Lint code**: `npm run lint`
4. **Update docs**: If you changed the API
5. **Update changelog**: For significant changes

### Creating a Pull Request

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/my-feature
   ```

2. Make your changes and commit:
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

3. Push to your fork:
   ```bash
   git push origin feature/my-feature
   ```

4. Open a Pull Request on GitHub

## Pull Request Process

### PR Title

Use conventional commit format:
```
feat(init): add new wizard step for MCP configuration
```

### PR Description Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How were the changes tested?

## Checklist
- [ ] Tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Changelog updated (if applicable)
```

### Review Process

1. Automated checks must pass (tests, linting, type checking)
2. At least one maintainer review required
3. Address review feedback
4. Squash and merge when approved

## Release Process

Releases are managed by maintainers. The project uses automated CI/CD for publishing.

### Version Types

- **Patch** (1.0.x): Bug fixes, minor updates
- **Minor** (1.x.0): New features, backwards compatible
- **Major** (x.0.0): Breaking changes

### Automated Release (Recommended)

The project includes npm scripts that handle versioning, building, and publishing:

```bash
# Patch release (1.0.0 → 1.0.1)
npm run release

# Minor release (1.0.0 → 1.1.0)
npm run release:minor

# Major release (1.0.0 → 2.0.0)
npm run release:major
```

These scripts:
1. Run full test suite and linting
2. Build the TypeScript
3. Bump the version in package.json
4. Create a git commit and tag
5. Push to GitHub (triggers CI)
6. Publish to npm

### CI/CD Pipeline

When a version tag (v*) is pushed:

1. **Validation Job**: Runs type checking, linting, and tests
2. **Publish Job**: Builds and publishes to npm with provenance
3. **GitHub Release**: Creates a release with the packaged tarball

### Manual Release Steps

If you need to release manually:

```bash
# 1. Ensure working directory is clean
git status

# 2. Update CHANGELOG.md with release notes
# Move items from [Unreleased] to new version section

# 3. Run validation
npm run test:run
npm run lint
npm run typecheck

# 4. Build the project
npm run build

# 5. Preview package contents
npm pack --dry-run

# 6. Version and tag
npm version patch  # or minor/major
git push && git push --tags

# 7. Publish (or wait for CI)
npm publish --access public
```

### Pre-release Checklist

Before releasing:

- [ ] All tests pass (`npm run test:run`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Linting passes (`npm run lint`)
- [ ] CHANGELOG.md is updated
- [ ] Documentation is current
- [ ] No uncommitted changes

### Package Contents

Verify what gets published with:

```bash
npm pack --dry-run
```

The package should include:
- `dist/` - Compiled JavaScript and type definitions
- `bin/` - CLI entry point
- `templates/` - Project templates
- `README.md`, `LICENSE`, `CHANGELOG.md`

Files excluded (via .npmignore):
- Source files (`src/`)
- Tests (`tests/`)
- Development configs
- IDE files
- Build artifacts

## Getting Help

- **Questions**: Open a GitHub Discussion
- **Bugs**: Open a GitHub Issue
- **Security**: Email security@example.com

## Recognition

Contributors are recognized in:
- `CHANGELOG.md` for their contributions
- GitHub contributors list
- Release notes

Thank you for contributing to Claude Ecosystem CLI!
