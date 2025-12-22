/**
 * Doctor diagnostic command implementation
 * Provides comprehensive health check with repair suggestions
 */
import type { DiagnosticReport, DoctorOptions, DoctorResult, FixResult } from '../types/doctor.js';
/**
 * Run all diagnostics
 */
export declare function runDiagnostics(options?: DoctorOptions): Promise<DiagnosticReport>;
/**
 * Run fixes for failed checks
 */
export declare function runFixes(report: DiagnosticReport): Promise<FixResult[]>;
/**
 * Print diagnostic report
 */
export declare function printReport(report: DiagnosticReport): void;
/**
 * Run doctor command
 */
export declare function runDoctor(options?: DoctorOptions): Promise<DoctorResult>;
//# sourceMappingURL=doctor.d.ts.map