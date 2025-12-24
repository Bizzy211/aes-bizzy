/**
 * GitHub authentication module
 *
 * Provides multiple authentication methods for GitHub:
 * - OAuth browser flow
 * - Personal Access Token (PAT)
 * - Generate new token (opens GitHub settings)
 * - Skip authentication
 */
import type { GitHubAuthResult, GitHubAuthOptions, TokenValidationResult, GitHubUser } from '../types/github.js';
/**
 * Build URL for generating a new GitHub token with pre-selected scopes
 */
export declare function buildTokenGenerationUrl(scopes?: string[]): string;
/**
 * Open URL in the default browser
 */
export declare function openInBrowser(url: string): Promise<boolean>;
/**
 * Validate a GitHub token by calling the API
 */
export declare function validateGitHubToken(token: string): Promise<TokenValidationResult>;
/**
 * Get token from GitHub CLI (gh) if authenticated
 * This is the preferred method as it uses existing auth
 */
export declare function getGitHubCLIToken(): Promise<string | undefined>;
/**
 * Check if GitHub CLI is installed and authenticated
 */
export declare function isGitHubCLIAuthenticated(): Promise<boolean>;
/**
 * Store GitHub token in a secure file
 * Uses ~/.claude/github_token for storage
 */
export declare function storeGitHubToken(token: string): Promise<boolean>;
/**
 * Get stored GitHub token
 * Priority: 1) GitHub CLI (gh auth token), 2) Stored file (~/.claude/github_token)
 */
export declare function getStoredGitHubToken(): Promise<string | undefined>;
/**
 * Interactive authentication flow using @clack/prompts
 */
export declare function authenticateGitHub(options?: GitHubAuthOptions): Promise<GitHubAuthResult>;
/**
 * Check if user is authenticated with GitHub
 */
export declare function isAuthenticated(): Promise<boolean>;
/**
 * Get current authenticated user
 */
export declare function getCurrentUser(): Promise<GitHubUser | undefined>;
/**
 * Clear stored GitHub authentication
 */
export declare function clearAuthentication(): Promise<boolean>;
/**
 * Result of GitHub repository creation
 */
export interface CreateRepoResult {
    success: boolean;
    url?: string;
    sshUrl?: string;
    httpsUrl?: string;
    error?: string;
}
/**
 * Options for creating a GitHub repository
 */
export interface CreateRepoOptions {
    /** Repository name */
    name: string;
    /** Repository description */
    description?: string;
    /** Make repository public (default: private) */
    public?: boolean;
    /** GitHub token (uses stored token if not provided) */
    token?: string;
    /** Project directory for git remote setup */
    cwd?: string;
    /** Add remote origin to local git repo */
    addRemote?: boolean;
    /** Push initial commit after creating */
    push?: boolean;
}
/**
 * Create a GitHub repository using the GitHub CLI
 */
export declare function createGitHubRepo(options: CreateRepoOptions): Promise<CreateRepoResult>;
/**
 * Check if a GitHub repository exists
 */
export declare function checkRepoExists(repoName: string): Promise<boolean>;
//# sourceMappingURL=github.d.ts.map