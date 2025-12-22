/**
 * Project initialization command
 * Creates new projects with Claude ecosystem integration
 */
import type { ProjectOptions, ProjectResult } from '../types/project.js';
/**
 * Initialize a new project
 */
export declare function initProject(name: string, options?: ProjectOptions): Promise<ProjectResult>;
/**
 * Print project creation result
 */
export declare function printProjectResult(result: ProjectResult): void;
/**
 * Run the project command
 */
export declare function runProject(name: string, options?: ProjectOptions): Promise<ProjectResult>;
//# sourceMappingURL=project.d.ts.map