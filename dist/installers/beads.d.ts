/**
 * Beads installation utilities
 *
 * Supports multiple installation methods:
 * - Windows: binary (preferred - winget doesn't have beads, npm has file locking issues)
 * - macOS: brew (preferred), npm, cargo
 * - Linux: cargo (preferred), npm, binary download
 */
import type { InstallResult, InstallMethodConfig, BeadsConfig, InstallerOptions } from '../types/installer.js';
/**
 * Get available installation methods for the current platform
 */
export declare function getAvailableMethods(): Promise<InstallMethodConfig[]>;
/**
 * Get the preferred available installation method
 */
export declare function getPreferredMethod(): Promise<InstallMethodConfig | null>;
/**
 * Install Beads using a specific method
 */
export declare function installBeadsWithMethod(method: InstallMethodConfig, options?: InstallerOptions): Promise<InstallResult>;
/**
 * Install Beads with automatic method selection and fallback
 */
export declare function installBeads(options?: InstallerOptions): Promise<InstallResult>;
/**
 * Get the installed Beads version
 */
export declare function getBeadsVersion(): Promise<string | null>;
/**
 * Check if Beads is installed
 */
export declare function isBeadsInstalled(): Promise<boolean>;
/**
 * Install Beads MCP server for MCP-only environments
 */
export declare function installBeadsMCP(silent?: boolean): Promise<InstallResult>;
/**
 * Get Beads configuration for ecosystem.json
 */
export declare function getBeadsConfig(): Promise<BeadsConfig>;
//# sourceMappingURL=beads.d.ts.map