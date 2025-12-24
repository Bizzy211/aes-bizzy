/**
 * Types for doctor diagnostic command
 */
/**
 * Check status levels
 */
export type CheckStatus = 'ok' | 'warn' | 'error' | 'info';
/**
 * Diagnostic categories
 */
export type DiagnosticCategory = 'prerequisites' | 'github' | 'repository' | 'ecosystem' | 'mcp-servers' | 'task-master';
/**
 * Individual check result
 */
export interface CheckResult {
    name: string;
    category: DiagnosticCategory;
    status: CheckStatus;
    message: string;
    details?: string;
    fixCommand?: string;
    fixDescription?: string;
}
/**
 * Category summary
 */
export interface CategorySummary {
    category: DiagnosticCategory;
    label: string;
    checks: CheckResult[];
    status: CheckStatus;
}
/**
 * Full diagnostic report
 */
export interface DiagnosticReport {
    timestamp: string;
    duration: number;
    categories: CategorySummary[];
    summary: {
        total: number;
        ok: number;
        warn: number;
        error: number;
        info: number;
    };
    overallStatus: CheckStatus;
}
/**
 * Doctor command options
 */
export interface DoctorOptions {
    fix?: boolean;
    json?: boolean;
    verbose?: boolean;
    categories?: DiagnosticCategory[];
}
/**
 * Fix result
 */
export interface FixResult {
    check: CheckResult;
    success: boolean;
    output?: string;
    error?: string;
}
/**
 * Doctor run result
 */
export interface DoctorResult {
    success: boolean;
    report: DiagnosticReport;
    fixes?: FixResult[];
    exitCode: 0 | 1;
}
/**
 * Diagnostic check function signature
 */
export type DiagnosticCheck = () => Promise<CheckResult>;
/**
 * Category check definition
 */
export interface CategoryChecks {
    category: DiagnosticCategory;
    label: string;
    checks: DiagnosticCheck[];
}
/**
 * Status emoji mapping
 */
export declare const STATUS_EMOJI: Record<CheckStatus, string>;
/**
 * Category labels
 */
export declare const CATEGORY_LABELS: Record<DiagnosticCategory, string>;
//# sourceMappingURL=doctor.d.ts.map