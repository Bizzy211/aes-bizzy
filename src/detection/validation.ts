/**
 * Migration Validation
 *
 * Post-migration validation to verify installation integrity
 * and detect any issues or regressions.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type {
  MigrationResult,
  MigrationValidationResult,
  ValidationCheck,
  PreservedSettings,
} from '../types/detection.js';
import {
  getClaudeDir,
  getFileHash,
  detectMCPServers,
} from './project-detector.js';

const execAsync = promisify(exec);

/**
 * Run a validation check
 */
async function runCheck(
  name: string,
  category: ValidationCheck['category'],
  checkFn: () => Promise<{ passed: boolean; message: string; details?: string; remediation?: string }>
): Promise<ValidationCheck> {
  try {
    const result = await checkFn();
    return {
      name,
      category,
      status: result.passed ? 'passed' : 'failed',
      message: result.message,
      details: result.details,
      remediation: result.remediation,
    };
  } catch (error) {
    return {
      name,
      category,
      status: 'failed',
      message: `Check failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Check if a path exists
 */
async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate Claude directory structure
 */
async function validateClaudeDirectory(): Promise<ValidationCheck[]> {
  const checks: ValidationCheck[] = [];
  const claudeDir = getClaudeDir();

  // Check .claude directory exists
  checks.push(await runCheck('Claude Directory', 'component', async () => {
    const exists = await pathExists(claudeDir);
    return {
      passed: exists,
      message: exists ? 'Claude directory exists' : 'Claude directory not found',
      details: claudeDir,
      remediation: exists ? undefined : 'Run initialization to create the Claude directory',
    };
  }));

  // Check agents directory
  checks.push(await runCheck('Agents Directory', 'component', async () => {
    const agentsDir = path.join(claudeDir, 'agents');
    const exists = await pathExists(agentsDir);
    if (!exists) {
      return {
        passed: false,
        message: 'Agents directory not found',
        remediation: 'Run repo-sync to populate agents',
      };
    }

    const entries = await fs.readdir(agentsDir);
    const agentCount = entries.filter((e) => e.endsWith('.md')).length;
    return {
      passed: agentCount > 0,
      message: `Found ${agentCount} agents`,
      details: agentCount === 0 ? 'No agent files found' : undefined,
      remediation: agentCount === 0 ? 'Run repo-sync to download agents' : undefined,
    };
  }));

  // Check hooks directory
  checks.push(await runCheck('Hooks Directory', 'component', async () => {
    const hooksDir = path.join(claudeDir, 'hooks');
    const exists = await pathExists(hooksDir);
    return {
      passed: true, // Hooks are optional
      message: exists ? 'Hooks directory exists' : 'Hooks directory not found (optional)',
    };
  }));

  // Check skills directory
  checks.push(await runCheck('Skills Directory', 'component', async () => {
    const skillsDir = path.join(claudeDir, 'skills');
    const exists = await pathExists(skillsDir);
    return {
      passed: true, // Skills are optional
      message: exists ? 'Skills directory exists' : 'Skills directory not found (optional)',
    };
  }));

  return checks;
}

/**
 * Validate configuration files
 */
async function validateConfiguration(): Promise<ValidationCheck[]> {
  const checks: ValidationCheck[] = [];
  const claudeDir = getClaudeDir();

  // Check settings.json
  checks.push(await runCheck('Settings File', 'config', async () => {
    const settingsPath = path.join(claudeDir, 'settings.json');
    const exists = await pathExists(settingsPath);

    if (!exists) {
      return {
        passed: false,
        message: 'settings.json not found',
        remediation: 'Run initialization to create settings',
      };
    }

    try {
      const content = await fs.readFile(settingsPath, 'utf-8');
      JSON.parse(content);
      return {
        passed: true,
        message: 'settings.json is valid JSON',
      };
    } catch {
      return {
        passed: false,
        message: 'settings.json contains invalid JSON',
        remediation: 'Check settings.json for syntax errors',
      };
    }
  }));

  // Check ecosystem.json
  checks.push(await runCheck('Ecosystem File', 'config', async () => {
    const ecosystemPath = path.join(claudeDir, 'ecosystem.json');
    const exists = await pathExists(ecosystemPath);

    if (!exists) {
      return {
        passed: false,
        message: 'ecosystem.json not found',
        remediation: 'Run initialization to create ecosystem configuration',
      };
    }

    try {
      const content = await fs.readFile(ecosystemPath, 'utf-8');
      const ecosystem = JSON.parse(content);
      return {
        passed: true,
        message: `ecosystem.json is valid (v${ecosystem.version || 'unknown'})`,
      };
    } catch {
      return {
        passed: false,
        message: 'ecosystem.json contains invalid JSON',
        remediation: 'Check ecosystem.json for syntax errors',
      };
    }
  }));

  return checks;
}

/**
 * Validate integrations
 */
async function validateIntegrations(): Promise<ValidationCheck[]> {
  const checks: ValidationCheck[] = [];

  // Check Beads
  checks.push(await runCheck('Beads Integration', 'integration', async () => {
    try {
      const { stdout } = await execAsync('bd version', { timeout: 5000 });
      const match = stdout.match(/\d+\.\d+\.\d+/);
      return {
        passed: true,
        message: `Beads installed (v${match ? match[0] : 'unknown'})`,
      };
    } catch {
      return {
        passed: false,
        message: 'Beads not installed or not responding',
        remediation: 'Install Beads with: pip install beads-cli',
      };
    }
  }));

  // Check Claude Code
  checks.push(await runCheck('Claude Code', 'integration', async () => {
    try {
      const { stdout } = await execAsync('claude --version', { timeout: 5000 });
      return {
        passed: true,
        message: `Claude Code installed`,
        details: stdout.trim(),
      };
    } catch {
      return {
        passed: false,
        message: 'Claude Code not installed or not responding',
        remediation: 'Install Claude Code: npm install -g @anthropic-ai/claude-code',
      };
    }
  }));

  // Check MCP Servers
  const mcpResult = await detectMCPServers();
  checks.push({
    name: 'MCP Servers',
    category: 'integration',
    status: mcpResult.missing.length === 0 ? 'passed' : 'warning',
    message: `${mcpResult.configured.length} configured, ${mcpResult.missing.length} missing`,
    details: mcpResult.missing.length > 0 ? `Missing: ${mcpResult.missing.join(', ')}` : undefined,
    remediation: mcpResult.missing.length > 0 ? 'Run MCP server installation' : undefined,
  });

  return checks;
}

/**
 * Validate file integrity
 */
async function validateFileIntegrity(
  expectedHashes: Map<string, string>
): Promise<ValidationCheck[]> {
  const checks: ValidationCheck[] = [];
  const claudeDir = getClaudeDir();

  for (const [relativePath, expectedHash] of expectedHashes) {
    const filePath = path.join(claudeDir, relativePath);

    checks.push(await runCheck(`File: ${relativePath}`, 'file', async () => {
      const exists = await pathExists(filePath);
      if (!exists) {
        return {
          passed: false,
          message: 'File not found',
          remediation: 'Run repo-sync to restore missing files',
        };
      }

      const actualHash = await getFileHash(filePath);
      const matches = actualHash === expectedHash;

      return {
        passed: true, // Modified files are okay, just flag them
        message: matches ? 'File matches expected hash' : 'File has been modified',
        details: matches ? undefined : 'User modifications detected',
      };
    }));
  }

  return checks;
}

/**
 * Validate that preserved settings are still present
 */
async function validatePreservedSettings(
  originalSettings: PreservedSettings
): Promise<ValidationCheck[]> {
  const checks: ValidationCheck[] = [];
  const claudeDir = getClaudeDir();
  const settingsPath = path.join(claudeDir, 'settings.json');

  try {
    const content = await fs.readFile(settingsPath, 'utf-8');
    const currentSettings = JSON.parse(content);

    // Check claudeDir
    if (originalSettings.claudeDir) {
      checks.push({
        name: 'Preserved: claudeDir',
        category: 'config',
        status: currentSettings.claudeDir === originalSettings.claudeDir ? 'passed' : 'warning',
        message: currentSettings.claudeDir === originalSettings.claudeDir
          ? 'claudeDir preserved'
          : 'claudeDir changed',
      });
    }

    // Check API tokens
    if (originalSettings.apiTokens) {
      for (const [token, wasPresent] of Object.entries(originalSettings.apiTokens)) {
        if (wasPresent) {
          const isPresent = !!(
            currentSettings[token] ||
            currentSettings.env?.[token] ||
            process.env[token]
          );

          checks.push({
            name: `Preserved: ${token}`,
            category: 'config',
            status: isPresent ? 'passed' : 'warning',
            message: isPresent ? `${token} preserved` : `${token} may be missing`,
            remediation: isPresent ? undefined : `Re-configure ${token}`,
          });
        }
      }
    }

    // Check allowedTools
    if (originalSettings.allowedTools && originalSettings.allowedTools.length > 0) {
      const currentTools = currentSettings.allowedTools || [];
      const allPreserved = originalSettings.allowedTools.every((tool: string) =>
        currentTools.includes(tool)
      );

      checks.push({
        name: 'Preserved: allowedTools',
        category: 'config',
        status: allPreserved ? 'passed' : 'warning',
        message: allPreserved
          ? 'All custom allowed tools preserved'
          : 'Some allowed tools may have been removed',
      });
    }

  } catch {
    checks.push({
      name: 'Settings Validation',
      category: 'config',
      status: 'failed',
      message: 'Could not read settings.json',
      remediation: 'Check if settings.json exists and is valid JSON',
    });
  }

  return checks;
}

/**
 * Run full migration validation
 */
export async function validateMigration(
  _migrationResult: MigrationResult,
  expectedHashes?: Map<string, string>,
  originalSettings?: PreservedSettings
): Promise<MigrationValidationResult> {
  const allChecks: ValidationCheck[] = [];

  // Run all validation checks
  const directoryChecks = await validateClaudeDirectory();
  allChecks.push(...directoryChecks);

  const configChecks = await validateConfiguration();
  allChecks.push(...configChecks);

  const integrationChecks = await validateIntegrations();
  allChecks.push(...integrationChecks);

  if (expectedHashes && expectedHashes.size > 0) {
    const integrityChecks = await validateFileIntegrity(expectedHashes);
    allChecks.push(...integrityChecks);
  }

  if (originalSettings) {
    const preservedChecks = await validatePreservedSettings(originalSettings);
    allChecks.push(...preservedChecks);
  }

  // Categorize results
  const passed = allChecks.filter((c) => c.status === 'passed');
  const warnings = allChecks.filter((c) => c.status === 'warning');
  const errors = allChecks.filter((c) => c.status === 'failed');

  // Determine overall status
  let overallStatus: MigrationValidationResult['overallStatus'];
  if (errors.length > 0) {
    overallStatus = 'failed';
  } else if (warnings.length > 0) {
    overallStatus = 'success-with-warnings';
  } else {
    overallStatus = 'success';
  }

  return {
    passed,
    warnings,
    errors,
    overallStatus,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Display validation results
 */
export function displayValidationResults(result: MigrationValidationResult): void {
  console.log();
  console.log('═══════════════════════════════════════════');
  console.log('         Migration Validation Report       ');
  console.log('═══════════════════════════════════════════');
  console.log();

  // Summary
  const statusEmoji = {
    success: '✅',
    'success-with-warnings': '⚠️',
    failed: '❌',
  };

  console.log(`Overall Status: ${statusEmoji[result.overallStatus]} ${result.overallStatus.toUpperCase()}`);
  console.log(`  Passed: ${result.passed.length}`);
  console.log(`  Warnings: ${result.warnings.length}`);
  console.log(`  Errors: ${result.errors.length}`);
  console.log();

  // Errors
  if (result.errors.length > 0) {
    console.log('❌ ERRORS:');
    for (const check of result.errors) {
      console.log(`  - ${check.name}: ${check.message}`);
      if (check.remediation) {
        console.log(`    → Remediation: ${check.remediation}`);
      }
    }
    console.log();
  }

  // Warnings
  if (result.warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    for (const check of result.warnings) {
      console.log(`  - ${check.name}: ${check.message}`);
      if (check.remediation) {
        console.log(`    → Remediation: ${check.remediation}`);
      }
    }
    console.log();
  }

  // Passed (summary only)
  if (result.passed.length > 0) {
    console.log(`✅ PASSED: ${result.passed.length} checks`);
  }
}

/**
 * Quick validation check (subset of full validation)
 */
export async function quickValidation(): Promise<{
  valid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];
  const claudeDir = getClaudeDir();

  // Check .claude exists
  if (!(await pathExists(claudeDir))) {
    issues.push('Claude directory not found');
  }

  // Check settings.json
  const settingsPath = path.join(claudeDir, 'settings.json');
  if (await pathExists(settingsPath)) {
    try {
      const content = await fs.readFile(settingsPath, 'utf-8');
      JSON.parse(content);
    } catch {
      issues.push('settings.json is invalid');
    }
  } else {
    issues.push('settings.json not found');
  }

  // Check ecosystem.json
  const ecosystemPath = path.join(claudeDir, 'ecosystem.json');
  if (await pathExists(ecosystemPath)) {
    try {
      const content = await fs.readFile(ecosystemPath, 'utf-8');
      JSON.parse(content);
    } catch {
      issues.push('ecosystem.json is invalid');
    }
  } else {
    issues.push('ecosystem.json not found');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Suggest remediation steps based on validation result
 */
export function suggestRemediation(result: MigrationValidationResult): string[] {
  const suggestions: string[] = [];

  for (const check of result.errors) {
    if (check.remediation && !suggestions.includes(check.remediation)) {
      suggestions.push(check.remediation);
    }
  }

  for (const check of result.warnings) {
    if (check.remediation && !suggestions.includes(check.remediation)) {
      suggestions.push(check.remediation);
    }
  }

  return suggestions;
}
