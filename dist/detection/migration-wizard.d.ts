/**
 * Migration Wizard
 *
 * Adaptive initialization flow and interactive migration wizard
 * for updating existing Claude Code installations.
 */
import type { DetectionResult, Conflict, ConflictResolution, MergeStrategy, MigrationResult, MigrationPlan } from '../types/detection.js';
/**
 * Migration mode options
 */
export type MigrationMode = 'update-keep-settings' | 'fresh-install' | 'selective-update' | 'abort';
/**
 * Component selection
 */
export interface ComponentSelection {
    agents: boolean;
    hooks: boolean;
    skills: boolean;
    mcpServers: boolean;
    settings: boolean;
}
/**
 * Adaptive init flow result
 */
export interface AdaptiveInitResult {
    mode: MigrationMode;
    components: ComponentSelection;
    mergeStrategy: MergeStrategy;
    skipBackup: boolean;
    conflicts: Conflict[];
    resolutions: Map<string, ConflictResolution>;
}
/**
 * Display installation status header
 */
export declare function displayInstallationHeader(detection: DetectionResult): void;
/**
 * Display step status in wizard
 */
export declare function displayStepStatus(stepNumber: number, stepName: string, status: 'complete' | 'update' | 'missing' | 'pending', details?: string): string;
/**
 * Get step statuses based on detection
 */
export declare function getStepStatuses(detection: DetectionResult): Array<{
    stepNumber: number;
    stepName: string;
    status: 'complete' | 'update' | 'missing' | 'pending';
    details?: string;
}>;
/**
 * Run the adaptive init flow
 */
export declare function runAdaptiveInitFlow(detection?: DetectionResult): Promise<AdaptiveInitResult | null>;
/**
 * Run the full migration wizard
 */
export declare function runMigrationWizard(detection: DetectionResult): Promise<MigrationResult | null>;
/**
 * Generate a migration plan for dry-run
 */
export declare function generateMigrationPlan(detection: DetectionResult, components: ComponentSelection, mergeStrategy: MergeStrategy): Promise<MigrationPlan>;
/**
 * Display migration plan (for dry-run)
 */
export declare function displayMigrationPlan(plan: MigrationPlan): void;
/**
 * Export migration plan as JSON
 */
export declare function exportMigrationPlan(plan: MigrationPlan): string;
//# sourceMappingURL=migration-wizard.d.ts.map