/**
 * Shell command execution utilities
 *
 * Provides cross-platform shell command execution with error handling,
 * timeout support, and spinner integration.
 */
import { execa } from 'execa';
import ora from 'ora';
import { CommandError } from '../types/shell.js';
import { isWindows } from './platform.js';
const DEFAULT_TIMEOUT = 5 * 60 * 1000; // 5 minutes
/**
 * Execute a command and return the result
 */
export async function executeCommand(command, args = [], options = {}) {
    const startTime = Date.now();
    const { cwd, env, timeout = DEFAULT_TIMEOUT, shell = false, stdin, silent = false, } = options;
    const execaOptions = {
        cwd,
        env: { ...process.env, ...env },
        timeout,
        shell,
        reject: false, // Don't throw on non-zero exit
        stdin: stdin ? 'pipe' : 'inherit',
        stdout: silent ? 'pipe' : 'pipe',
        stderr: silent ? 'pipe' : 'pipe',
    };
    try {
        const result = await execa(command, args, execaOptions);
        const commandResult = {
            stdout: typeof result.stdout === 'string' ? result.stdout : '',
            stderr: typeof result.stderr === 'string' ? result.stderr : '',
            exitCode: result.exitCode ?? 0,
            duration: Date.now() - startTime,
            command,
            args,
        };
        return commandResult;
    }
    catch (error) {
        const duration = Date.now() - startTime;
        // Handle execa errors (timeout, etc.)
        if (error instanceof Error && 'exitCode' in error) {
            const execaError = error;
            return {
                stdout: execaError.stdout ?? '',
                stderr: execaError.stderr ?? error.message,
                exitCode: execaError.exitCode ?? 1,
                duration,
                command,
                args,
            };
        }
        // Handle other errors
        return {
            stdout: '',
            stderr: error instanceof Error ? error.message : String(error),
            exitCode: 1,
            duration,
            command,
            args,
        };
    }
}
/**
 * Execute a command with a spinner for visual feedback
 */
export async function execCommandWithSpinner(command, args = [], options = {}) {
    const { spinnerText = `Running ${command}...`, successText, failText, ...commandOptions } = options;
    const spinner = ora(spinnerText).start();
    try {
        const result = await executeCommand(command, args, { ...commandOptions, silent: true });
        if (result.exitCode === 0) {
            spinner.succeed(successText ?? `${command} completed`);
        }
        else {
            spinner.fail(failText ?? `${command} failed with exit code ${result.exitCode}`);
        }
        return result;
    }
    catch (error) {
        spinner.fail(failText ?? `${command} failed`);
        throw error;
    }
}
/**
 * Check if a command exists on the system
 */
export async function checkCommandExists(command) {
    const checkCmd = isWindows() ? 'where' : 'which';
    const result = await executeCommand(checkCmd, [command], { silent: true });
    return result.exitCode === 0;
}
/**
 * Run a PowerShell script (Windows)
 */
export async function runPowershell(script, options = {}) {
    const { cwd, env, timeout = DEFAULT_TIMEOUT } = options;
    return executeCommand('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { cwd, env, timeout, shell: false });
}
/**
 * Run a Bash script (Unix)
 */
export async function runBash(script, options = {}) {
    const { cwd, env, timeout = DEFAULT_TIMEOUT } = options;
    return executeCommand('bash', ['-c', script], { cwd, env, timeout, shell: false });
}
/**
 * Run a script using the appropriate shell for the platform
 */
export async function runShellScript(script, options = {}) {
    return isWindows() ? runPowershell(script, options) : runBash(script, options);
}
/**
 * Execute a command and throw if it fails
 */
export async function execOrThrow(command, args = [], options = {}) {
    const result = await executeCommand(command, args, options);
    if (result.exitCode !== 0) {
        throw new CommandError(result);
    }
    return result;
}
/**
 * Get the version of a command (if it supports --version)
 */
export async function getCommandVersion(command) {
    const result = await executeCommand(command, ['--version'], { silent: true });
    if (result.exitCode === 0 && result.stdout) {
        // Extract first line which usually contains version
        return result.stdout.split('\n')[0]?.trim() ?? null;
    }
    return null;
}
//# sourceMappingURL=shell.js.map