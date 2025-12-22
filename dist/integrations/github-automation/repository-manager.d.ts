/**
 * GitHub Repository Manager Module
 *
 * Manages GitHub repository creation, initialization, labels, and milestones
 * for the A.E.S (Agentic EcoSystem).
 */
import type { RepoConfig, RepoResult, InitOptions, InitResult, LabelCreateResult, MilestonePhase, MilestoneResult, FileUpload, UploadResult, CompleteRepoConfig, SetupResult, AgentLabel } from '../../types/github-automation.js';
/**
 * Default agent labels with colors matching A.E.S agent specializations
 */
export declare const DEFAULT_AGENT_LABELS: AgentLabel[];
/**
 * Workflow labels for tracking task status
 */
export declare const WORKFLOW_LABELS: AgentLabel[];
/**
 * Default milestone phases
 */
export declare const DEFAULT_MILESTONE_PHASES: MilestonePhase[];
export declare class GitHubAPIError extends Error {
    statusCode: number;
    response?: unknown | undefined;
    constructor(message: string, statusCode: number, response?: unknown | undefined);
}
/**
 * Create a new GitHub repository
 *
 * @param config - Repository configuration
 * @param token - GitHub personal access token
 * @returns Repository creation result
 */
export declare function createRepository(config: RepoConfig, token: string): Promise<RepoResult>;
/**
 * Initialize repository with README, .gitignore, and LICENSE
 *
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param options - Initialization options
 * @param token - GitHub personal access token
 * @returns Initialization result
 */
export declare function initializeRepo(owner: string, repo: string, options: InitOptions, token: string): Promise<InitResult>;
/**
 * Create default labels for agent-based workflow
 *
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param token - GitHub personal access token
 * @returns Label creation result
 */
export declare function createDefaultLabels(owner: string, repo: string, token: string): Promise<LabelCreateResult>;
/**
 * Create milestones for project phases
 *
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param phases - Milestone phases (defaults to standard phases)
 * @param token - GitHub personal access token
 * @returns Milestone creation result
 */
export declare function createMilestones(owner: string, repo: string, phases: MilestonePhase[], token: string): Promise<MilestoneResult>;
/**
 * Push project files to repository
 *
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param files - Files to upload
 * @param token - GitHub personal access token
 * @returns Upload result
 */
export declare function pushProjectFiles(owner: string, repo: string, files: FileUpload[], token: string): Promise<UploadResult>;
/**
 * Complete repository setup with all features
 *
 * @param config - Complete repository configuration
 * @param token - GitHub personal access token
 * @returns Setup result
 */
export declare function setupRepository(config: CompleteRepoConfig, token: string): Promise<SetupResult>;
/**
 * Delete a repository (for testing/cleanup)
 *
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param token - GitHub personal access token
 * @returns Success status
 */
export declare function deleteRepository(owner: string, repo: string, token: string): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * Check if repository exists
 *
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param token - GitHub personal access token
 * @returns True if repository exists
 */
export declare function repositoryExists(owner: string, repo: string, token: string): Promise<boolean>;
/**
 * Get repository information
 *
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param token - GitHub personal access token
 * @returns Repository info or null
 */
export declare function getRepository(owner: string, repo: string, token: string): Promise<{
    name: string;
    fullName: string;
    url: string;
    private: boolean;
    description: string;
} | null>;
//# sourceMappingURL=repository-manager.d.ts.map