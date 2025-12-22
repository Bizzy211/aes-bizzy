/**
 * Prerequisites checker
 *
 * Validates that required tools are installed with correct versions.
 */
import type { ToolStatus, PrerequisitesResult, VersionRequirements } from '../types/prerequisites.js';
/**
 * Check Node.js installation
 */
export declare function checkNode(): Promise<ToolStatus>;
/**
 * Check npm installation
 */
export declare function checkNpm(): Promise<ToolStatus>;
/**
 * Check Git installation
 */
export declare function checkGit(): Promise<ToolStatus>;
/**
 * Check Claude Code CLI installation
 */
export declare function checkClaudeCode(): Promise<ToolStatus>;
/**
 * Check all prerequisites
 */
export declare function checkPrerequisites(requirements?: VersionRequirements): Promise<PrerequisitesResult>;
/**
 * Quick check if minimum prerequisites are met (Node, npm, Git)
 */
export declare function hasMinimumPrerequisites(): Promise<boolean>;
/**
 * Get formatted prerequisites report
 */
export declare function formatPrerequisitesReport(result: PrerequisitesResult): string;
//# sourceMappingURL=prerequisites.d.ts.map