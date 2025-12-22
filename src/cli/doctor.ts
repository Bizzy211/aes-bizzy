/**
 * Doctor diagnostic command implementation
 * Provides comprehensive health check with repair suggestions
 */

import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { logger } from '../utils/logger.js';
import { loadConfig, getEcosystemConfigPath } from '../config/ecosystem-config.js';
import type {
  CheckResult,
  CheckStatus,
  CategorySummary,
  DiagnosticReport,
  DoctorOptions,
  DoctorResult,
  FixResult,
  CategoryChecks,
} from '../types/doctor.js';
import { STATUS_EMOJI, CATEGORY_LABELS } from '../types/doctor.js';

/**
 * Run a command and return output
 */
function runCommand(cmd: string): { success: boolean; output: string } {
  try {
    const output = execSync(cmd, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 10000,
    }).trim();
    return { success: true, output };
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string };
    return {
      success: false,
      output: err.stderr || err.stdout || err.message || 'Command failed',
    };
  }
}

/**
 * Check Node.js version
 */
async function checkNodeVersion(): Promise<CheckResult> {
  const result = runCommand('node --version');

  if (!result.success) {
    return {
      name: 'Node.js',
      category: 'prerequisites',
      status: 'error',
      message: 'Node.js not found',
      fixCommand: 'Install Node.js from https://nodejs.org',
      fixDescription: 'Install Node.js 18.x or higher',
    };
  }

  const version = result.output.replace('v', '');
  const major = parseInt(version.split('.')[0] || '0', 10);

  if (major < 18) {
    return {
      name: 'Node.js',
      category: 'prerequisites',
      status: 'warn',
      message: `Node.js ${version} - upgrade recommended`,
      details: 'Version 18.x or higher recommended',
      fixCommand: 'nvm install 18',
      fixDescription: 'Upgrade to Node.js 18+',
    };
  }

  return {
    name: 'Node.js',
    category: 'prerequisites',
    status: 'ok',
    message: `Node.js ${version}`,
  };
}

/**
 * Check Git version
 */
async function checkGitVersion(): Promise<CheckResult> {
  const result = runCommand('git --version');

  if (!result.success) {
    return {
      name: 'Git',
      category: 'prerequisites',
      status: 'error',
      message: 'Git not found',
      fixCommand: 'Install Git from https://git-scm.com',
      fixDescription: 'Install Git version 2.x or higher',
    };
  }

  const match = result.output.match(/git version (\d+\.\d+)/);
  const version = match ? match[1] : 'unknown';

  return {
    name: 'Git',
    category: 'prerequisites',
    status: 'ok',
    message: `Git ${version}`,
  };
}

/**
 * Check Claude Code installation
 */
async function checkClaudeCode(): Promise<CheckResult> {
  const result = runCommand('claude --version');

  if (!result.success) {
    return {
      name: 'Claude Code',
      category: 'prerequisites',
      status: 'error',
      message: 'Claude Code not found',
      fixCommand: 'npm install -g @anthropic-ai/claude-code',
      fixDescription: 'Install Claude Code CLI',
    };
  }

  return {
    name: 'Claude Code',
    category: 'prerequisites',
    status: 'ok',
    message: `Claude Code ${result.output}`,
  };
}

/**
 * Check GitHub CLI authentication
 */
async function checkGitHubAuth(): Promise<CheckResult> {
  const result = runCommand('gh auth status');

  if (!result.success) {
    return {
      name: 'GitHub Auth',
      category: 'github',
      status: 'error',
      message: 'Not authenticated with GitHub',
      fixCommand: 'gh auth login',
      fixDescription: 'Authenticate with GitHub CLI',
    };
  }

  return {
    name: 'GitHub Auth',
    category: 'github',
    status: 'ok',
    message: 'Authenticated',
  };
}

/**
 * Check GitHub token scopes
 */
async function checkGitHubTokenScopes(): Promise<CheckResult> {
  const result = runCommand('gh api user');

  if (!result.success) {
    return {
      name: 'GitHub Token',
      category: 'github',
      status: 'warn',
      message: 'Could not verify token scopes',
      details: 'Token may have limited permissions',
    };
  }

  return {
    name: 'GitHub Token',
    category: 'github',
    status: 'ok',
    message: 'Token valid with user access',
  };
}

/**
 * Check Claude config directory
 */
async function checkClaudeConfigDir(): Promise<CheckResult> {
  const claudeDir = path.join(homedir(), '.claude');

  if (!existsSync(claudeDir)) {
    return {
      name: 'Claude Config Directory',
      category: 'ecosystem',
      status: 'error',
      message: 'Directory not found',
      details: `Expected: ${claudeDir}`,
      fixCommand: 'aes-bizzy init',
      fixDescription: 'Initialize Claude ecosystem',
    };
  }

  return {
    name: 'Claude Config Directory',
    category: 'ecosystem',
    status: 'ok',
    message: claudeDir,
  };
}

/**
 * Check ecosystem.json exists
 */
async function checkEcosystemConfig(): Promise<CheckResult> {
  const configPath = getEcosystemConfigPath();

  if (!existsSync(configPath)) {
    return {
      name: 'Ecosystem Config',
      category: 'ecosystem',
      status: 'warn',
      message: 'ecosystem.json not found',
      fixCommand: 'aes-bizzy init',
      fixDescription: 'Initialize ecosystem configuration',
    };
  }

  const result = await loadConfig();

  if (!result.success) {
    return {
      name: 'Ecosystem Config',
      category: 'ecosystem',
      status: 'error',
      message: 'Invalid ecosystem.json',
      details: result.error,
      fixCommand: 'aes-bizzy init --force',
      fixDescription: 'Reinitialize ecosystem configuration',
    };
  }

  return {
    name: 'Ecosystem Config',
    category: 'ecosystem',
    status: 'ok',
    message: `Version ${result.config!.version}`,
  };
}

/**
 * Check agents directory
 */
async function checkAgentsDirectory(): Promise<CheckResult> {
  const agentsDir = path.join(homedir(), '.claude', 'agents');

  if (!existsSync(agentsDir)) {
    return {
      name: 'Agents Directory',
      category: 'repository',
      status: 'warn',
      message: 'No agents directory',
      fixCommand: 'aes-bizzy sync --components agents',
      fixDescription: 'Sync agents from repository',
    };
  }

  try {
    const { readdirSync } = await import('node:fs');
    const files = readdirSync(agentsDir).filter((f) => !f.startsWith('.'));
    return {
      name: 'Agents Directory',
      category: 'repository',
      status: 'ok',
      message: `${files.length} agent(s) installed`,
    };
  } catch {
    return {
      name: 'Agents Directory',
      category: 'repository',
      status: 'warn',
      message: 'Could not read agents directory',
    };
  }
}

/**
 * Check hooks directory
 */
async function checkHooksDirectory(): Promise<CheckResult> {
  const hooksDir = path.join(homedir(), '.claude', 'hooks');

  if (!existsSync(hooksDir)) {
    return {
      name: 'Hooks Directory',
      category: 'repository',
      status: 'warn',
      message: 'No hooks directory',
      fixCommand: 'aes-bizzy sync --components hooks',
      fixDescription: 'Sync hooks from repository',
    };
  }

  try {
    const { readdirSync } = await import('node:fs');
    const files = readdirSync(hooksDir).filter((f) => !f.startsWith('.'));
    return {
      name: 'Hooks Directory',
      category: 'repository',
      status: 'ok',
      message: `${files.length} hook(s) installed`,
    };
  } catch {
    return {
      name: 'Hooks Directory',
      category: 'repository',
      status: 'warn',
      message: 'Could not read hooks directory',
    };
  }
}

/**
 * Check last sync time
 */
async function checkLastSync(): Promise<CheckResult> {
  const result = await loadConfig();

  if (!result.success || !result.config?.sync) {
    return {
      name: 'Last Sync',
      category: 'repository',
      status: 'warn',
      message: 'Never synced',
      fixCommand: 'aes-bizzy sync',
      fixDescription: 'Sync components from repository',
    };
  }

  const lastSync = new Date(result.config.sync.lastSync);
  const daysSince = Math.floor((Date.now() - lastSync.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSince > 7) {
    return {
      name: 'Last Sync',
      category: 'repository',
      status: 'warn',
      message: `${daysSince} days ago`,
      details: 'Consider syncing for updates',
      fixCommand: 'aes-bizzy sync',
      fixDescription: 'Sync latest components',
    };
  }

  return {
    name: 'Last Sync',
    category: 'repository',
    status: 'ok',
    message: daysSince === 0 ? 'Today' : `${daysSince} day(s) ago`,
  };
}

/**
 * Check Task Master installation
 */
async function checkTaskMaster(): Promise<CheckResult> {
  const result = runCommand('task-master --version');

  if (!result.success) {
    return {
      name: 'Task Master',
      category: 'task-master',
      status: 'warn',
      message: 'Task Master not installed',
      fixCommand: 'npm install -g task-master-ai',
      fixDescription: 'Install Task Master CLI',
    };
  }

  return {
    name: 'Task Master',
    category: 'task-master',
    status: 'ok',
    message: `Version ${result.output}`,
  };
}

/**
 * Check MCP servers from ecosystem config
 */
async function checkMcpServers(): Promise<CheckResult> {
  const result = await loadConfig();

  if (!result.success || !result.config?.mcpServers?.length) {
    return {
      name: 'MCP Servers',
      category: 'mcp-servers',
      status: 'warn',
      message: 'No MCP servers configured',
      details: 'MCP servers enhance Claude capabilities',
    };
  }

  const serverCount = result.config.mcpServers.length;
  const enabledCount = result.config.mcpServers.filter((s) => s.enabled).length;

  return {
    name: 'MCP Servers',
    category: 'mcp-servers',
    status: 'ok',
    message: `${enabledCount}/${serverCount} enabled`,
  };
}

/**
 * Get all category checks
 */
function getCategoryChecks(): CategoryChecks[] {
  return [
    {
      category: 'prerequisites',
      label: CATEGORY_LABELS.prerequisites,
      checks: [checkNodeVersion, checkGitVersion, checkClaudeCode],
    },
    {
      category: 'github',
      label: CATEGORY_LABELS.github,
      checks: [checkGitHubAuth, checkGitHubTokenScopes],
    },
    {
      category: 'ecosystem',
      label: CATEGORY_LABELS.ecosystem,
      checks: [checkClaudeConfigDir, checkEcosystemConfig],
    },
    {
      category: 'repository',
      label: CATEGORY_LABELS.repository,
      checks: [checkAgentsDirectory, checkHooksDirectory, checkLastSync],
    },
    {
      category: 'task-master',
      label: CATEGORY_LABELS['task-master'],
      checks: [checkTaskMaster],
    },
    {
      category: 'mcp-servers',
      label: CATEGORY_LABELS['mcp-servers'],
      checks: [checkMcpServers],
    },
  ];
}

/**
 * Get category status from checks
 */
function getCategoryStatus(checks: CheckResult[]): CheckStatus {
  if (checks.some((c) => c.status === 'error')) return 'error';
  if (checks.some((c) => c.status === 'warn')) return 'warn';
  return 'ok';
}

/**
 * Run all diagnostics
 */
export async function runDiagnostics(
  options: DoctorOptions = {}
): Promise<DiagnosticReport> {
  const startTime = Date.now();
  const categories: CategorySummary[] = [];
  const categoryChecks = getCategoryChecks();

  // Filter categories if specified
  const categoriesToRun = options.categories
    ? categoryChecks.filter((c) => options.categories!.includes(c.category))
    : categoryChecks;

  for (const cat of categoriesToRun) {
    const checks: CheckResult[] = [];

    for (const checkFn of cat.checks) {
      try {
        const result = await checkFn();
        checks.push(result);

        if (options.verbose) {
          const emoji = STATUS_EMOJI[result.status];
          logger.info(`  ${emoji} ${result.name}: ${result.message}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        checks.push({
          name: 'Unknown',
          category: cat.category,
          status: 'error',
          message: `Check failed: ${message}`,
        });
      }
    }

    categories.push({
      category: cat.category,
      label: cat.label,
      checks,
      status: getCategoryStatus(checks),
    });
  }

  const allChecks = categories.flatMap((c) => c.checks);
  const summary = {
    total: allChecks.length,
    ok: allChecks.filter((c) => c.status === 'ok').length,
    warn: allChecks.filter((c) => c.status === 'warn').length,
    error: allChecks.filter((c) => c.status === 'error').length,
  };

  let overallStatus: CheckStatus = 'ok';
  if (summary.error > 0) overallStatus = 'error';
  else if (summary.warn > 0) overallStatus = 'warn';

  return {
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
    categories,
    summary,
    overallStatus,
  };
}

/**
 * Run fixes for failed checks
 */
export async function runFixes(report: DiagnosticReport): Promise<FixResult[]> {
  const fixes: FixResult[] = [];
  const checksToFix = report.categories
    .flatMap((c) => c.checks)
    .filter((c) => c.status === 'error' && c.fixCommand);

  for (const check of checksToFix) {
    logger.info(`Attempting to fix: ${check.name}`);

    if (!check.fixCommand) {
      fixes.push({
        check,
        success: false,
        error: 'No fix command available',
      });
      continue;
    }

    const result = runCommand(check.fixCommand);
    fixes.push({
      check,
      success: result.success,
      output: result.output,
      error: result.success ? undefined : result.output,
    });

    if (result.success) {
      logger.success(`Fixed: ${check.name}`);
    } else {
      logger.error(`Failed to fix: ${check.name}`);
    }
  }

  return fixes;
}

/**
 * Print diagnostic report
 */
export function printReport(report: DiagnosticReport): void {
  console.log('\n🩺 Claude Ecosystem Health Check\n');

  for (const category of report.categories) {
    const emoji = STATUS_EMOJI[category.status];
    console.log(`${emoji} ${category.label}`);

    for (const check of category.checks) {
      const checkEmoji = STATUS_EMOJI[check.status];
      console.log(`   ${checkEmoji} ${check.name}: ${check.message}`);

      if (check.details) {
        console.log(`      └─ ${check.details}`);
      }

      if (check.status === 'error' && check.fixCommand) {
        console.log(`      └─ Fix: ${check.fixCommand}`);
      }
    }
    console.log();
  }

  // Summary
  const { summary } = report;
  console.log('─'.repeat(40));
  console.log(`Summary: ${summary.ok} ok, ${summary.warn} warnings, ${summary.error} errors`);
  console.log(`Duration: ${report.duration}ms`);
}

/**
 * Run doctor command
 */
export async function runDoctor(options: DoctorOptions = {}): Promise<DoctorResult> {
  const report = await runDiagnostics(options);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printReport(report);
  }

  let fixes: FixResult[] | undefined;

  if (options.fix && report.summary.error > 0) {
    console.log('\n🔧 Running automatic fixes...\n');
    fixes = await runFixes(report);

    // Re-run diagnostics after fixes
    console.log('\n📋 Re-checking after fixes...\n');
    const newReport = await runDiagnostics(options);

    if (!options.json) {
      printReport(newReport);
    }

    return {
      success: newReport.summary.error === 0,
      report: newReport,
      fixes,
      exitCode: newReport.summary.error > 0 ? 1 : 0,
    };
  }

  return {
    success: report.summary.error === 0,
    report,
    fixes,
    exitCode: report.summary.error > 0 ? 1 : 0,
  };
}
