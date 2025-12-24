/**
 * Kickoff Context Generator and Detection
 *
 * Creates context files for pm-lead agent to use when starting
 * a new project workflow. The context includes project description,
 * configuration, and recommendations for agent orchestration.
 *
 * Also provides kickoff mode detection for agent orchestration.
 */
/**
 * Environment variable for kickoff mode
 */
export declare const KICKOFF_MODE_ENV = "AES_KICKOFF_MODE";
/**
 * Kickoff context file name
 */
export declare const KICKOFF_CONTEXT_FILE = "kickoff.json";
/**
 * Kickoff markdown file name
 */
export declare const KICKOFF_MARKDOWN_FILE = "KICKOFF.md";
/**
 * Kickoff context data structure
 */
export interface KickoffContext {
    /** Project name */
    projectName: string;
    /** Project description from user */
    projectDescription?: string;
    /** GitHub repository URL if created */
    githubUrl?: string;
    /** Project directory path */
    projectPath: string;
    /** When the project was created */
    createdAt: string;
    /** Configuration summary */
    config: {
        /** Whether TaskMaster is configured */
        hasTaskMaster: boolean;
        /** Whether Beads is configured */
        hasBeads: boolean;
        /** Configured MCP servers */
        mcpServers: string[];
    };
    /** Recommended agents based on project type */
    recommendedAgents: string[];
    /** Suggested initial tasks for pm-lead */
    suggestedTasks: string[];
    /** Additional context notes */
    notes?: string[];
}
/**
 * Options for creating kickoff context
 */
export interface CreateKickoffContextOptions {
    /** Project name */
    projectName: string;
    /** Project directory path */
    projectPath: string;
    /** Project description */
    projectDescription?: string;
    /** GitHub repository URL */
    githubUrl?: string;
    /** Whether TaskMaster is configured */
    hasTaskMaster?: boolean;
    /** Whether Beads is configured */
    hasBeads?: boolean;
    /** Configured MCP servers */
    mcpServers?: string[];
    /** Additional notes */
    notes?: string[];
}
/**
 * Result of creating kickoff context
 */
export interface CreateKickoffContextResult {
    success: boolean;
    /** Path to the created context file */
    contextPath?: string;
    /** The generated context data */
    context?: KickoffContext;
    error?: string;
}
/**
 * Create kickoff context file for pm-lead agent
 */
export declare function createKickoffContext(options: CreateKickoffContextOptions): Promise<CreateKickoffContextResult>;
/**
 * Read existing kickoff context
 */
export declare function readKickoffContext(projectPath: string): Promise<KickoffContext | null>;
/**
 * Kickoff mode detection result
 */
export interface KickoffModeDetection {
    /** Whether kickoff mode is active */
    active: boolean;
    /** Source of kickoff mode activation */
    source: 'environment' | 'context-file' | 'none';
    /** Path to the context file if found */
    contextPath?: string;
    /** The loaded context if available */
    context?: KickoffContext;
}
/**
 * Check if kickoff mode is enabled via environment variable
 */
export declare function isKickoffModeEnv(): boolean;
/**
 * Check if kickoff context file exists
 */
export declare function hasKickoffContextFile(projectPath: string): boolean;
/**
 * Detect kickoff mode from all sources
 */
export declare function detectKickoffMode(projectPath: string): Promise<KickoffModeDetection>;
/**
 * Kickoff workflow step
 */
export interface KickoffWorkflowStep {
    /** Step number */
    step: number;
    /** Step title */
    title: string;
    /** Detailed description */
    description: string;
    /** MCP tools to use */
    tools?: string[];
    /** Whether this step is complete */
    completed?: boolean;
}
/**
 * Generate kickoff workflow steps from context
 */
export declare function generateKickoffWorkflow(context: KickoffContext): KickoffWorkflowStep[];
/**
 * Generate pm-lead prompt for kickoff workflow
 */
export declare function generateKickoffPrompt(context: KickoffContext): string;
/**
 * Set kickoff mode environment variable
 */
export declare function setKickoffModeEnv(enabled: boolean): void;
/**
 * Clear kickoff context files
 */
export declare function clearKickoffContext(projectPath: string): Promise<boolean>;
//# sourceMappingURL=kickoff-context.d.ts.map