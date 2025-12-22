/**
 * Migration Validation
 *
 * Post-migration validation to verify installation integrity
 * and detect any issues or regressions.
 */
import type { MigrationResult, MigrationValidationResult, PreservedSettings } from '../types/detection.js';
/**
 * Run full migration validation
 */
export declare function validateMigration(_migrationResult: MigrationResult, expectedHashes?: Map<string, string>, originalSettings?: PreservedSettings): Promise<MigrationValidationResult>;
/**
 * Display validation results
 */
export declare function displayValidationResults(result: MigrationValidationResult): void;
/**
 * Quick validation check (subset of full validation)
 */
export declare function quickValidation(): Promise<{
    valid: boolean;
    issues: string[];
}>;
/**
 * Suggest remediation steps based on validation result
 */
export declare function suggestRemediation(result: MigrationValidationResult): string[];
//# sourceMappingURL=validation.d.ts.map