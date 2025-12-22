/**
 * PRD Generator Module
 *
 * Generates Product Requirements Documents from user prompts and research data.
 * Uses templates based on detected project types and fills them with
 * research-backed content.
 */
import type { BrandingResult, TechnicalDocsResult, CodeContextResult } from './research-orchestrator.js';
export type ProjectType = 'web-app' | 'dashboard' | 'api-service' | 'mobile-app' | 'fullstack' | 'cli-tool' | 'unknown';
export type RequirementPriority = 'critical' | 'high' | 'medium' | 'low';
export type RequirementCategory = 'functional' | 'non-functional' | 'technical' | 'design';
export interface DetectedRequirement {
    description: string;
    priority: RequirementPriority;
    category: RequirementCategory;
    keywords: string[];
}
export interface PRDTemplate {
    name: string;
    projectType: ProjectType;
    templatePath: string;
    sections: string[];
}
export interface ResearchData {
    branding?: BrandingResult;
    technicalDocs?: TechnicalDocsResult;
    codeContext?: CodeContextResult;
}
export interface PRDGenerationOptions {
    userPrompt: string;
    projectName?: string;
    projectType?: ProjectType;
    templatePath?: string;
    researchData?: ResearchData;
    outputPath?: string;
}
export interface GeneratedPRD {
    content: string;
    projectType: ProjectType;
    projectName: string;
    requirements: DetectedRequirement[];
    techStack: string[];
    filePath: string;
}
export declare class PRDGenerationError extends Error {
    cause?: Error | undefined;
    constructor(message: string, cause?: Error | undefined);
}
/**
 * Detect project type from user prompt
 *
 * @param userPrompt - The user's project description
 * @returns Detected project type
 */
export declare function detectProjectType(userPrompt: string): ProjectType;
/**
 * Extract project name from user prompt
 *
 * @param userPrompt - The user's project description
 * @returns Extracted or generated project name
 */
export declare function extractProjectName(userPrompt: string): string;
/**
 * Extract requirements from user prompt
 *
 * @param userPrompt - The user's project description
 * @param projectType - The detected project type
 * @returns Array of detected requirements sorted by priority
 */
export declare function extractRequirements(userPrompt: string, _projectType: ProjectType): DetectedRequirement[];
/**
 * Extract tech stack from user prompt and research data
 *
 * @param prompt - The user's project description
 * @param researchData - Optional research data
 * @returns Array of detected technologies
 */
export declare function extractTechStack(prompt: string, researchData?: ResearchData): string[];
/**
 * Load a PRD template
 *
 * @param projectType - The project type to load template for
 * @param templatePath - Optional custom template path
 * @returns Template content
 */
export declare function loadTemplate(projectType: ProjectType, templatePath?: string): Promise<string>;
/**
 * Fill template with data
 *
 * @param template - Template content with placeholders
 * @param options - Generation options
 * @param requirements - Extracted requirements
 * @param techStack - Extracted tech stack
 * @returns Filled template content
 */
export declare function fillTemplate(template: string, options: PRDGenerationOptions, requirements: DetectedRequirement[], techStack: string[]): string;
/**
 * Generate a PRD from user prompt and optional research data
 *
 * @param options - PRD generation options
 * @returns Generated PRD with metadata
 */
export declare function generatePRD(options: PRDGenerationOptions): Promise<GeneratedPRD>;
/**
 * Generate PRD content without writing to file
 * Useful for preview or testing
 *
 * @param options - PRD generation options
 * @returns PRD content and metadata
 */
export declare function generatePRDContent(options: PRDGenerationOptions): {
    content: string;
    projectType: ProjectType;
    projectName: string;
    requirements: DetectedRequirement[];
    techStack: string[];
};
//# sourceMappingURL=prd-generator.d.ts.map