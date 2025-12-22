/**
 * Prerequisites checker types
 *
 * Types for validating required tool installations.
 */
/**
 * Status of a single prerequisite tool
 */
export interface ToolStatus {
    /** Whether the tool is installed and accessible */
    installed: boolean;
    /** Version string if installed */
    version?: string;
    /** Error message if check failed */
    error?: string;
    /** Path to the tool if found */
    path?: string;
}
/**
 * Result of checking all prerequisites
 */
export interface PrerequisitesResult {
    /** Node.js status */
    node: ToolStatus;
    /** npm status */
    npm: ToolStatus;
    /** Git status */
    git: ToolStatus;
    /** Claude Code CLI status */
    claudeCode: ToolStatus;
    /** Whether all required prerequisites are met */
    allMet: boolean;
    /** Suggestions for missing or outdated tools */
    suggestions: string[];
}
/**
 * Minimum version requirements
 */
export interface VersionRequirements {
    node: string;
    npm?: string;
    git?: string;
    claudeCode?: string;
}
/**
 * Default minimum version requirements
 */
export declare const DEFAULT_VERSION_REQUIREMENTS: VersionRequirements;
/**
 * Installation suggestions for missing tools
 */
export declare const INSTALL_SUGGESTIONS: Record<string, Record<string, string>>;
//# sourceMappingURL=prerequisites.d.ts.map