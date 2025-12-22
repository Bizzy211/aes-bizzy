/**
 * Claude Code CLI installer
 *
 * Automates installation and verification of @anthropic-ai/claude-code.
 */
import type { InstallResult } from '../types/installer.js';
/**
 * Check if Claude Code is already installed
 */
export declare function isClaudeCodeInstalled(): Promise<{
    installed: boolean;
    version?: string;
}>;
/**
 * Get the npm prefix to check for global installations
 */
export declare function getNpmGlobalPrefix(): Promise<string | undefined>;
/**
 * Install Claude Code CLI via npm
 */
export declare function installClaudeCode(options: {
    retries?: number;
    useSudo?: boolean;
    showSpinner?: boolean;
}): Promise<InstallResult>;
/**
 * Uninstall Claude Code CLI
 */
export declare function uninstallClaudeCode(options: {
    useSudo?: boolean;
    showSpinner?: boolean;
}): Promise<InstallResult>;
/**
 * Get Claude Code version
 */
export declare function getClaudeCodeVersion(): Promise<string | undefined>;
/**
 * Run Claude Code command with arguments
 */
export declare function runClaudeCode(args: string[]): Promise<{
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number;
}>;
/**
 * Check for npx availability as fallback
 */
export declare function canUseNpx(): Promise<boolean>;
/**
 * Get installation method recommendation
 */
export declare function getInstallRecommendation(): Promise<{
    method: 'global' | 'npx' | 'sudo';
    reason: string;
}>;
//# sourceMappingURL=claude-code.d.ts.map