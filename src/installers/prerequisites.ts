/**
 * Prerequisites checker
 *
 * Validates that required tools are installed with correct versions.
 */

import semver from 'semver';
import { executeCommand } from '../utils/shell.js';
import { getPlatform } from '../utils/platform.js';
import type {
  ToolStatus,
  PrerequisitesResult,
  VersionRequirements,
} from '../types/prerequisites.js';
import {
  DEFAULT_VERSION_REQUIREMENTS,
  INSTALL_SUGGESTIONS,
} from '../types/prerequisites.js';

/**
 * Parse version string from command output
 */
function parseVersion(output: string): string | undefined {
  // Common version patterns: v18.0.0, 2.40.0, 10.0.0, etc.
  const versionMatch = output.match(/v?(\d+\.\d+\.\d+)/);
  return versionMatch?.[1];
}

/**
 * Check Node.js installation
 */
export async function checkNode(): Promise<ToolStatus> {
  try {
    // Use process.version for the current Node.js
    const version = process.version.replace(/^v/, '');
    return {
      installed: true,
      version,
    };
  } catch {
    return {
      installed: false,
      error: 'Node.js is not installed or not accessible',
    };
  }
}

/**
 * Check npm installation
 */
export async function checkNpm(): Promise<ToolStatus> {
  try {
    const result = await executeCommand('npm', ['--version']);
    if (result.exitCode !== 0) {
      return {
        installed: false,
        error: result.stderr || 'npm command failed',
      };
    }

    const version = parseVersion(result.stdout);
    return {
      installed: true,
      version,
    };
  } catch (error) {
    return {
      installed: false,
      error: error instanceof Error ? error.message : 'npm is not installed',
    };
  }
}

/**
 * Check Git installation
 */
export async function checkGit(): Promise<ToolStatus> {
  try {
    const result = await executeCommand('git', ['--version']);
    if (result.exitCode !== 0) {
      return {
        installed: false,
        error: result.stderr || 'git command failed',
      };
    }

    // Git version format: "git version 2.40.0"
    const version = parseVersion(result.stdout);
    return {
      installed: true,
      version,
    };
  } catch (error) {
    return {
      installed: false,
      error: error instanceof Error ? error.message : 'Git is not installed',
    };
  }
}

/**
 * Check Claude Code CLI installation
 */
export async function checkClaudeCode(): Promise<ToolStatus> {
  try {
    const result = await executeCommand('claude', ['--version']);
    if (result.exitCode !== 0) {
      return {
        installed: false,
        error: result.stderr || 'Claude Code CLI not found',
      };
    }

    const version = parseVersion(result.stdout);
    return {
      installed: true,
      version,
    };
  } catch (error) {
    return {
      installed: false,
      error: error instanceof Error ? error.message : 'Claude Code CLI is not installed',
    };
  }
}

/**
 * Get platform-specific installation suggestion
 */
function getSuggestion(tool: string): string {
  const platform = getPlatform();
  return INSTALL_SUGGESTIONS[tool]?.[platform.os] || `Install ${tool} from the official website`;
}

/**
 * Check if version meets minimum requirement
 */
function meetsMinimumVersion(current: string | undefined, minimum: string): boolean {
  if (!current) return false;
  try {
    return semver.gte(current, minimum);
  } catch {
    // If version can't be parsed, assume it's okay
    return true;
  }
}

/**
 * Check all prerequisites
 */
export async function checkPrerequisites(
  requirements: VersionRequirements = DEFAULT_VERSION_REQUIREMENTS
): Promise<PrerequisitesResult> {
  // Check all tools in parallel
  const [node, npm, git, claudeCode] = await Promise.all([
    checkNode(),
    checkNpm(),
    checkGit(),
    checkClaudeCode(),
  ]);

  const suggestions: string[] = [];
  let allMet = true;

  // Check Node.js
  if (!node.installed) {
    allMet = false;
    suggestions.push(getSuggestion('node'));
  } else if (!meetsMinimumVersion(node.version, requirements.node)) {
    allMet = false;
    suggestions.push(
      `Node.js version ${node.version} is below minimum required ${requirements.node}. ${getSuggestion('node')}`
    );
  }

  // Check npm
  if (!npm.installed) {
    allMet = false;
    suggestions.push(getSuggestion('npm'));
  } else if (requirements.npm && !meetsMinimumVersion(npm.version, requirements.npm)) {
    allMet = false;
    suggestions.push(
      `npm version ${npm.version} is below minimum required ${requirements.npm}. ${getSuggestion('npm')}`
    );
  }

  // Check Git
  if (!git.installed) {
    allMet = false;
    suggestions.push(getSuggestion('git'));
  } else if (requirements.git && !meetsMinimumVersion(git.version, requirements.git)) {
    allMet = false;
    suggestions.push(
      `Git version ${git.version} is below minimum required ${requirements.git}. ${getSuggestion('git')}`
    );
  }

  // Check Claude Code (optional but recommended)
  if (!claudeCode.installed) {
    suggestions.push(`(Optional) ${getSuggestion('claudeCode')}`);
  } else if (requirements.claudeCode && !meetsMinimumVersion(claudeCode.version, requirements.claudeCode)) {
    suggestions.push(
      `(Optional) Claude Code version ${claudeCode.version} is below recommended ${requirements.claudeCode}. ${getSuggestion('claudeCode')}`
    );
  }

  return {
    node,
    npm,
    git,
    claudeCode,
    allMet,
    suggestions,
  };
}

/**
 * Quick check if minimum prerequisites are met (Node, npm, Git)
 */
export async function hasMinimumPrerequisites(): Promise<boolean> {
  const result = await checkPrerequisites();
  return result.node.installed && result.npm.installed && result.git.installed;
}

/**
 * Get formatted prerequisites report
 */
export function formatPrerequisitesReport(result: PrerequisitesResult): string {
  const lines: string[] = ['Prerequisites Check:', ''];

  const formatStatus = (name: string, status: ToolStatus, required: boolean): string => {
    const icon = status.installed ? '\u2713' : (required ? '\u2717' : '-');
    const version = status.version ? ` (v${status.version})` : '';
    const reqText = required ? '' : ' (optional)';
    return `  ${icon} ${name}${version}${reqText}`;
  };

  lines.push(formatStatus('Node.js', result.node, true));
  lines.push(formatStatus('npm', result.npm, true));
  lines.push(formatStatus('Git', result.git, true));
  lines.push(formatStatus('Claude Code', result.claudeCode, false));
  lines.push('');

  if (result.allMet) {
    lines.push('All required prerequisites are met!');
  } else {
    lines.push('Missing or outdated prerequisites:');
    result.suggestions.forEach((s) => lines.push(`  - ${s}`));
  }

  return lines.join('\n');
}
