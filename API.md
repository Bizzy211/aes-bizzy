# API Documentation

This document describes the programmatic API for the Claude Ecosystem CLI.

## Table of Contents

- [Installation](#installation)
- [CLI Functions](#cli-functions)
- [Configuration Management](#configuration-management)
- [Installers](#installers)
- [Utilities](#utilities)
- [Types](#types)

## Installation

```bash
npm install @jhc/claude-ecosystem
```

## CLI Functions

### `runInitWizard(options)`

Run the 7-step initialization wizard programmatically.

```typescript
import { runInitWizard } from '@jhc/claude-ecosystem';

interface InitWizardOptions {
  skipPrerequisites?: boolean;
  skipGithub?: boolean;
  skipSync?: boolean;
  skipBeads?: boolean;
  skipTaskmaster?: boolean;
  skipMcp?: boolean;
}

interface InitWizardResult {
  success: boolean;
  stepsCompleted: string[];
  errors: string[];
  warnings: string[];
}

const result = await runInitWizard({
  skipPrerequisites: false,
  skipGithub: true,
});

if (result.success) {
  console.log('Steps completed:', result.stepsCompleted);
}
```

### `runDoctor(options)`

Run health checks and diagnostics.

```typescript
import { runDoctor } from '@jhc/claude-ecosystem';

interface DoctorOptions {
  fix?: boolean;
  json?: boolean;
  verbose?: boolean;
  categories?: string[];
}

interface DoctorResult {
  exitCode: number;
  checks: DoctorCheck[];
  summary: {
    passed: number;
    failed: number;
    warnings: number;
  };
}

const result = await runDoctor({
  fix: true,
  verbose: true,
  categories: ['config', 'mcp'],
});

console.log(`Passed: ${result.summary.passed}, Failed: ${result.summary.failed}`);
```

### `runProject(name, options)`

Create a new project with ecosystem integration.

```typescript
import { runProject } from '@jhc/claude-ecosystem';

interface ProjectOptions {
  template?: 'basic' | 'web' | 'api' | 'fullstack';
  github?: boolean;
  public?: boolean;
  taskmaster?: boolean;
  beads?: boolean;
  skipGit?: boolean;
  force?: boolean;
  dryRun?: boolean;
}

interface ProjectResult {
  success: boolean;
  name: string;
  path: string;
  errors: string[];
  warnings: string[];
  nextSteps: string[];
}

const result = await runProject('my-app', {
  template: 'web',
  github: true,
  taskmaster: true,
});

if (result.success) {
  console.log('Project created at:', result.path);
  console.log('Next steps:', result.nextSteps);
}
```

### `runUpdate(options)`

Update ecosystem components.

```typescript
import { runUpdate } from '@jhc/claude-ecosystem';

interface UpdateOptions {
  component?: 'agents' | 'hooks' | 'skills' | 'scripts' | 'slash-commands';
  all?: boolean;
  dryRun?: boolean;
  force?: boolean;
  verbose?: boolean;
}

interface UpdateResult {
  success: boolean;
  updated: string[];
  skipped: string[];
  errors: string[];
}

const result = await runUpdate({
  all: true,
  dryRun: false,
});

console.log('Updated:', result.updated);
```

## Configuration Management

### `loadConfig()`

Load the ecosystem configuration.

```typescript
import { loadConfig } from '@jhc/claude-ecosystem';

interface ConfigLoadResult {
  success: boolean;
  config?: EcosystemConfig;
  error?: string;
  source: 'file' | 'default';
}

const result = await loadConfig();
if (result.success) {
  console.log('Config version:', result.config.version);
}
```

### `saveConfig(config)`

Save ecosystem configuration to disk.

```typescript
import { saveConfig } from '@jhc/claude-ecosystem';

interface ConfigSaveResult {
  success: boolean;
  path: string;
  error?: string;
  backupPath?: string;
}

const result = await saveConfig(config);
if (result.success) {
  console.log('Saved to:', result.path);
}
```

### `validateConfig(config)`

Validate a configuration object.

```typescript
import { validateConfig } from '@jhc/claude-ecosystem';

interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigValidationError[];
  warnings?: string[];
}

interface ConfigValidationError {
  path: string;
  message: string;
  expected?: string;
  received?: unknown;
}

const result = validateConfig(config);
if (!result.valid) {
  console.log('Validation errors:', result.errors);
}
```

### `createDefaultConfig()`

Create a default configuration object.

```typescript
import { createDefaultConfig } from '@jhc/claude-ecosystem';

const config = createDefaultConfig();
// Returns a new EcosystemConfig with default values
```

### `getEcosystemConfigPath()`

Get the path to the ecosystem configuration file.

```typescript
import { getEcosystemConfigPath } from '@jhc/claude-ecosystem';

const path = getEcosystemConfigPath();
// Returns: ~/.claude/ecosystem.json
```

## Installers

### `checkPrerequisites()`

Check for required tools and dependencies.

```typescript
import { checkPrerequisites } from '@jhc/claude-ecosystem';

interface PrerequisiteResult {
  met: boolean;
  name: string;
  version?: string;
  required: string;
  message?: string;
}

interface PrerequisitesCheck {
  allMet: boolean;
  results: PrerequisiteResult[];
}

const result = await checkPrerequisites();
if (!result.allMet) {
  const missing = result.results.filter(r => !r.met);
  console.log('Missing prerequisites:', missing);
}
```

### `installBeads(options)`

Install the Beads memory system.

```typescript
import { installBeads } from '@jhc/claude-ecosystem';

interface BeadsInstallOptions {
  skipCheck?: boolean;
  force?: boolean;
}

interface InstallerResult {
  success: boolean;
  message: string;
  warnings?: string[];
  errors?: string[];
}

const result = await installBeads({ force: true });
if (result.success) {
  console.log('Beads installed successfully');
}
```

### `installTaskMaster(options)`

Install Task Master for task management.

```typescript
import { installTaskMaster } from '@jhc/claude-ecosystem';

interface TaskMasterInstallOptions {
  skipCheck?: boolean;
  projectRoot?: string;
}

const result = await installTaskMaster({
  projectRoot: '/path/to/project',
});
```

### `configureMcpServers(config)`

Configure MCP servers.

```typescript
import { configureMcpServers } from '@jhc/claude-ecosystem';

interface McpServerConfig {
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

const result = await configureMcpServers([
  {
    name: 'supabase',
    enabled: true,
    config: { projectUrl: 'https://...', apiKey: '...' },
  },
]);
```

## Utilities

### `executeCommand(command, args, options)`

Execute a shell command with timeout and error handling.

```typescript
import { executeCommand } from '@jhc/claude-ecosystem';

interface ExecuteOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  silent?: boolean;
}

interface ExecuteResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  command: string;
  args: string[];
}

const result = await executeCommand('npm', ['install'], {
  cwd: '/path/to/project',
  timeout: 60000,
});

if (result.exitCode === 0) {
  console.log('Command succeeded:', result.stdout);
}
```

### `createLogger(options)`

Create a logger instance for consistent logging.

```typescript
import { createLogger } from '@jhc/claude-ecosystem';

interface LoggerOptions {
  context?: Record<string, unknown>;
  level?: 'debug' | 'info' | 'warn' | 'error';
}

const logger = createLogger({ context: { module: 'my-module' } });

logger.info('Starting process...');
logger.success('Process completed');
logger.warn('This is a warning');
logger.error('An error occurred');
logger.debug('Debug information');
```

### `detectPlatform()`

Detect the current operating system platform.

```typescript
import { detectPlatform } from '@jhc/claude-ecosystem';

type Platform = 'darwin' | 'linux' | 'win32' | 'wsl';

const platform = detectPlatform();
console.log('Running on:', platform);
```

## Types

### `EcosystemConfig`

Main configuration type.

```typescript
interface EcosystemConfig {
  version: string;
  installedAt: string;
  lastUpdated: string;
  components: Record<EcosystemComponentType, InstalledComponent[]>;
  mcpServers: McpServerEntry[];
  settings: EcosystemSettings;
}

type EcosystemComponentType =
  | 'agents'
  | 'hooks'
  | 'skills'
  | 'scripts'
  | 'slash-commands';

interface InstalledComponent {
  name: string;
  version: string;
  installedAt: string;
  source: 'local' | 'remote' | 'builtin';
  path?: string;
  checksum?: string;
}

interface McpServerEntry {
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

interface EcosystemSettings {
  autoSync: boolean;
  syncInterval: number;
  defaultConflictStrategy: 'backup' | 'overwrite' | 'skip';
  backupEnabled: boolean;
  maxBackups: number;
}
```

### `DoctorCheck`

Health check result type.

```typescript
interface DoctorCheck {
  id: string;
  name: string;
  category: string;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  message: string;
  details?: string;
  fix?: {
    available: boolean;
    command?: string;
    automatic?: boolean;
  };
}
```

### `GitHubAuthResult`

GitHub authentication result.

```typescript
interface GitHubAuthResult {
  authenticated: boolean;
  username?: string;
  scopes?: string[];
  error?: string;
}
```

## Error Handling

All async functions may throw errors. Use try-catch for proper error handling:

```typescript
import { runInitWizard } from '@jhc/claude-ecosystem';

try {
  const result = await runInitWizard({});
  if (!result.success) {
    console.error('Wizard failed:', result.errors);
  }
} catch (error) {
  if (error instanceof Error) {
    console.error('Error:', error.message);
  }
}
```

## Environment Variables

The following environment variables affect behavior:

| Variable | Description |
|----------|-------------|
| `DEBUG` | Enable debug output and stack traces |
| `NO_COLOR` | Disable colored output |
| `CLAUDE_CONFIG_DIR` | Override Claude config directory |
| `GITHUB_TOKEN` | GitHub authentication token |

## Examples

### Full Initialization

```typescript
import {
  checkPrerequisites,
  runInitWizard,
  loadConfig,
} from '@jhc/claude-ecosystem';

async function setupEnvironment() {
  // Check prerequisites first
  const prereqs = await checkPrerequisites();
  if (!prereqs.allMet) {
    console.error('Missing prerequisites');
    process.exit(1);
  }

  // Run the wizard
  const result = await runInitWizard({});
  if (!result.success) {
    console.error('Initialization failed');
    process.exit(1);
  }

  // Load and verify config
  const config = await loadConfig();
  console.log('Environment ready!');
  console.log('Installed components:', Object.keys(config.config.components));
}

setupEnvironment();
```

### Create Project with All Integrations

```typescript
import { runProject, installTaskMaster, installBeads } from '@jhc/claude-ecosystem';

async function createFullProject(name: string) {
  // Create project
  const project = await runProject(name, {
    template: 'fullstack',
    github: true,
    taskmaster: true,
    beads: true,
  });

  if (!project.success) {
    throw new Error(`Failed to create project: ${project.errors.join(', ')}`);
  }

  console.log('Project created at:', project.path);
  console.log('Next steps:');
  project.nextSteps.forEach(step => console.log(`  - ${step}`));

  return project;
}
```

---

For more information, see the [README](./README.md) or [CONTRIBUTING](./CONTRIBUTING.md) guide.
