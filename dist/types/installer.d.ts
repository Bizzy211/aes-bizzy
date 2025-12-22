/**
 * Installer types for package installations
 */
export type InstallMethod = 'winget' | 'brew' | 'cargo' | 'npm' | 'binary';
export interface InstallResult {
    success: boolean;
    method: InstallMethod;
    version?: string;
    error?: string;
}
export interface InstallMethodConfig {
    method: InstallMethod;
    command: string;
    args: string[];
    available: boolean;
    preferred: boolean;
}
export interface BeadsConfig {
    installed: boolean;
    method?: InstallMethod;
    version?: string;
    mcpInstalled?: boolean;
}
export interface InstallerOptions {
    preferredMethod?: InstallMethod;
    skipVerification?: boolean;
    silent?: boolean;
}
//# sourceMappingURL=installer.d.ts.map