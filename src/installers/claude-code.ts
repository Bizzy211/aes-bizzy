/**
 * Claude Code CLI installer
 *
 * Automates installation and verification of @anthropic-ai/claude-code.
 */

import { executeCommand, execCommandWithSpinner } from '../utils/shell.js';
import { getPlatform } from '../utils/platform.js';
import { createLogger } from '../utils/logger.js';
import type { InstallResult } from '../types/installer.js';

const logger = createLogger({ context: { module: 'claude-code-installer' } });

const CLAUDE_CODE_PACKAGE = '@anthropic-ai/claude-code';
const DEFAULT_RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse version from claude --version output
 */
function parseClaudeVersion(output: string): string | undefined {
  // Match patterns like: "claude-code v1.0.3", "1.0.3", "v1.0.3"
  const versionMatch = output.match(/v?(\d+\.\d+\.\d+)/);
  return versionMatch?.[1];
}

/**
 * Check if Claude Code is already installed
 */
export async function isClaudeCodeInstalled(): Promise<{ installed: boolean; version?: string }> {
  try {
    const result = await executeCommand('claude', ['--version']);
    if (result.exitCode === 0) {
      const version = parseClaudeVersion(result.stdout);
      return { installed: true, version };
    }
    return { installed: false };
  } catch {
    return { installed: false };
  }
}

/**
 * Get the npm prefix to check for global installations
 */
export async function getNpmGlobalPrefix(): Promise<string | undefined> {
  try {
    const result = await executeCommand('npm', ['config', 'get', 'prefix']);
    if (result.exitCode === 0) {
      return result.stdout.trim();
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Check for permission issues on Unix systems
 */
function isPermissionError(error: string): boolean {
  return (
    error.includes('EACCES') ||
    error.includes('permission denied') ||
    error.includes('Permission denied') ||
    error.includes('Error: EPERM')
  );
}

/**
 * Install Claude Code CLI via npm
 */
export async function installClaudeCode(options: {
  retries?: number;
  useSudo?: boolean;
  showSpinner?: boolean;
}): Promise<InstallResult> {
  const { retries = DEFAULT_RETRY_ATTEMPTS, useSudo = false, showSpinner = true } = options;

  const platform = getPlatform();
  const isUnix = platform.os !== 'windows';

  // Check if already installed
  const existing = await isClaudeCodeInstalled();
  if (existing.installed) {
    logger.info(`Claude Code already installed (v${existing.version})`);
    return {
      success: true,
      method: 'npm',
      version: existing.version,
    };
  }

  let lastError: string | undefined;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.debug(`Installation attempt ${attempt}/${retries}`);

      // Build install command
      const npmArgs = ['install', '-g', CLAUDE_CODE_PACKAGE];
      let command = 'npm';
      let args = npmArgs;

      // On Unix with sudo
      if (isUnix && useSudo) {
        command = 'sudo';
        args = ['npm', ...npmArgs];
      }

      // Execute installation
      const installFn = async () => {
        return executeCommand(command, args);
      };

      let result;
      if (showSpinner) {
        result = await execCommandWithSpinner(command, args, {
          spinnerText: `Installing Claude Code CLI (attempt ${attempt}/${retries})...`,
        });
      } else {
        result = await installFn();
      }

      if (result.exitCode !== 0) {
        const errorMsg = result.stderr || 'npm install failed';

        // Check for permission errors
        if (isUnix && !useSudo && isPermissionError(errorMsg)) {
          logger.warn('Permission error detected. Try running with sudo or using npx.');
          return {
            success: false,
            method: 'npm',
            error: `Permission denied. Run with --sudo flag or use: npx ${CLAUDE_CODE_PACKAGE}`,
          };
        }

        throw new Error(errorMsg);
      }

      // Verify installation
      const verification = await isClaudeCodeInstalled();
      if (!verification.installed) {
        throw new Error('Installation completed but claude command not found');
      }

      logger.success(`Claude Code installed successfully (v${verification.version})`);
      return {
        success: true,
        method: 'npm',
        version: verification.version,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      logger.warn(`Attempt ${attempt} failed: ${lastError}`);

      // Exponential backoff
      if (attempt < retries) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        logger.debug(`Waiting ${delay}ms before retry...`);
        await sleep(delay);
      }
    }
  }

  logger.error(`Failed to install Claude Code after ${retries} attempts`);
  return {
    success: false,
    method: 'npm',
    error: lastError || 'Installation failed after all retry attempts',
  };
}

/**
 * Uninstall Claude Code CLI
 */
export async function uninstallClaudeCode(options: {
  useSudo?: boolean;
  showSpinner?: boolean;
}): Promise<InstallResult> {
  const { useSudo = false, showSpinner = true } = options;

  const platform = getPlatform();
  const isUnix = platform.os !== 'windows';

  // Check if installed
  const existing = await isClaudeCodeInstalled();
  if (!existing.installed) {
    logger.info('Claude Code is not installed');
    return {
      success: true,
      method: 'npm',
    };
  }

  try {
    // Build uninstall command
    const npmArgs = ['uninstall', '-g', CLAUDE_CODE_PACKAGE];
    let command = 'npm';
    let args = npmArgs;

    if (isUnix && useSudo) {
      command = 'sudo';
      args = ['npm', ...npmArgs];
    }

    let result;
    if (showSpinner) {
      result = await execCommandWithSpinner(command, args, {
        spinnerText: 'Uninstalling Claude Code CLI...',
      });
    } else {
      result = await executeCommand(command, args);
    }

    if (result.exitCode !== 0) {
      const errorMsg = result.stderr || 'npm uninstall failed';

      if (isUnix && !useSudo && isPermissionError(errorMsg)) {
        return {
          success: false,
          method: 'npm',
          error: 'Permission denied. Run with --sudo flag.',
        };
      }

      return {
        success: false,
        method: 'npm',
        error: errorMsg,
      };
    }

    // Verify uninstallation
    const verification = await isClaudeCodeInstalled();
    if (verification.installed) {
      return {
        success: false,
        method: 'npm',
        error: 'Uninstall completed but claude command still exists',
      };
    }

    logger.success('Claude Code uninstalled successfully');
    return {
      success: true,
      method: 'npm',
    };
  } catch (error) {
    return {
      success: false,
      method: 'npm',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get Claude Code version
 */
export async function getClaudeCodeVersion(): Promise<string | undefined> {
  const status = await isClaudeCodeInstalled();
  return status.version;
}

/**
 * Run Claude Code command with arguments
 */
export async function runClaudeCode(args: string[]): Promise<{
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  try {
    const result = await executeCommand('claude', args);
    return {
      success: result.exitCode === 0,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    };
  } catch (error) {
    return {
      success: false,
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: 1,
    };
  }
}

/**
 * Check for npx availability as fallback
 */
export async function canUseNpx(): Promise<boolean> {
  try {
    const result = await executeCommand('npx', ['--version']);
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * Get installation method recommendation
 */
export async function getInstallRecommendation(): Promise<{
  method: 'global' | 'npx' | 'sudo';
  reason: string;
}> {
  const platform = getPlatform();

  // On Windows, global install is straightforward
  if (platform.os === 'windows') {
    return {
      method: 'global',
      reason: 'Standard npm global installation on Windows',
    };
  }

  // Check if we have write access to npm prefix
  const prefix = await getNpmGlobalPrefix();
  if (prefix) {
    try {
      const testResult = await executeCommand('npm', ['config', 'list']);
      if (testResult.exitCode === 0 && !testResult.stderr.includes('permission')) {
        return {
          method: 'global',
          reason: 'npm global prefix is writable',
        };
      }
    } catch {
      // Fall through to alternatives
    }
  }

  // Check if npx is available
  if (await canUseNpx()) {
    return {
      method: 'npx',
      reason: 'npx available for on-demand execution without global install',
    };
  }

  // Fallback to sudo
  return {
    method: 'sudo',
    reason: 'Root privileges required for global installation',
  };
}
