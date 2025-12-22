/**
 * Shell command execution utilities
 *
 * Provides cross-platform shell command execution with error handling,
 * timeout support, and spinner integration.
 */
import type { CommandResult, CommandOptions, SpinnerOptions, ShellScriptOptions } from '../types/shell.js';
/**
 * Execute a command and return the result
 */
export declare function executeCommand(command: string, args?: string[], options?: CommandOptions): Promise<CommandResult>;
/**
 * Execute a command with a spinner for visual feedback
 */
export declare function execCommandWithSpinner(command: string, args?: string[], options?: SpinnerOptions): Promise<CommandResult>;
/**
 * Check if a command exists on the system
 */
export declare function checkCommandExists(command: string): Promise<boolean>;
/**
 * Run a PowerShell script (Windows)
 */
export declare function runPowershell(script: string, options?: ShellScriptOptions): Promise<CommandResult>;
/**
 * Run a Bash script (Unix)
 */
export declare function runBash(script: string, options?: ShellScriptOptions): Promise<CommandResult>;
/**
 * Run a script using the appropriate shell for the platform
 */
export declare function runShellScript(script: string, options?: ShellScriptOptions): Promise<CommandResult>;
/**
 * Execute a command and throw if it fails
 */
export declare function execOrThrow(command: string, args?: string[], options?: CommandOptions): Promise<CommandResult>;
/**
 * Get the version of a command (if it supports --version)
 */
export declare function getCommandVersion(command: string): Promise<string | null>;
//# sourceMappingURL=shell.d.ts.map