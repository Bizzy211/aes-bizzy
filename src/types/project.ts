/**
 * Types for project initialization command
 */

/**
 * Project template types
 */
export type ProjectTemplate = 'basic' | 'web' | 'api' | 'fullstack';

/**
 * Project initialization options
 */
export interface ProjectOptions {
  /** Project template to use */
  template?: ProjectTemplate;
  /** Create GitHub repository */
  github?: boolean;
  /** Make GitHub repository public (default: private for security) */
  public?: boolean;
  /** Initialize Task Master */
  taskmaster?: boolean;
  /** Initialize Beads */
  beads?: boolean;
  /** Skip git initialization */
  skipGit?: boolean;
  /** Force overwrite if directory exists */
  force?: boolean;
  /** Run in dry-run mode */
  dryRun?: boolean;
}

/**
 * Project context stored in .project-context
 */
export interface ProjectContext {
  /** Project name */
  name: string;
  /** Creation timestamp */
  createdAt: string;
  /** Whether part of Claude ecosystem */
  ecosystem: boolean;
  /** Template used */
  template: ProjectTemplate;
  /** GitHub repository URL if created */
  githubUrl?: string;
  /** Whether Task Master was initialized */
  taskmaster: boolean;
  /** Whether Beads was initialized */
  beads: boolean;
}

/**
 * Created file info
 */
export interface CreatedFile {
  /** Relative path from project root */
  path: string;
  /** Whether file was created or already existed */
  action: 'created' | 'skipped' | 'overwritten';
}

/**
 * Project initialization result
 */
export interface ProjectResult {
  /** Whether initialization was successful */
  success: boolean;
  /** Project directory path */
  projectPath: string;
  /** Project name */
  name: string;
  /** Files created */
  files: CreatedFile[];
  /** Errors encountered */
  errors: string[];
  /** Warnings */
  warnings: string[];
  /** GitHub repository URL if created */
  githubUrl?: string;
  /** Next steps for the user */
  nextSteps: string[];
}

/**
 * Template file definition
 */
export interface TemplateFile {
  /** Relative path in project */
  path: string;
  /** File content (with placeholders) */
  content: string;
  /** Whether this file is template-specific */
  templateSpecific?: ProjectTemplate[];
}

/**
 * Template configuration
 */
export interface TemplateConfig {
  /** Template name */
  name: ProjectTemplate;
  /** Template description */
  description: string;
  /** Files to create */
  files: TemplateFile[];
  /** Dependencies to install */
  dependencies?: string[];
  /** Dev dependencies to install */
  devDependencies?: string[];
  /** Commands to run after creation */
  postCreate?: string[];
}
