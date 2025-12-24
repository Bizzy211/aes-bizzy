/**
 * Heimdall Installer
 *
 * Provides automated installation and setup of Heimdall persistent memory
 * system, including Docker/Qdrant setup and MCP server configuration.
 */
import { HeimdallConfig, HeimdallInstallStatus, HeimdallInstallOptions, HeimdallInstallResult } from '../types/heimdall.js';
/**
 * Check the current installation status of Heimdall
 */
export declare function getInstallStatus(): Promise<HeimdallInstallStatus>;
/**
 * Install Heimdall with all components
 */
export declare function installHeimdall(options?: HeimdallInstallOptions): Promise<HeimdallInstallResult>;
/**
 * Uninstall Heimdall
 */
export declare function uninstallHeimdall(removeData?: boolean): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * Save Heimdall configuration
 */
export declare function saveHeimdallConfig(config: HeimdallConfig): void;
/**
 * Load Heimdall configuration
 */
export declare function loadHeimdallConfig(): HeimdallConfig | null;
/**
 * Quick check if Heimdall is ready to use
 */
export declare function isHeimdallReady(): Promise<boolean>;
/**
 * Auto-detect and fix issues with Heimdall installation
 */
export declare function autoFixHeimdall(): Promise<{
    fixed: string[];
    remaining: string[];
}>;
//# sourceMappingURL=installer.d.ts.map