/**
 * GitHub authentication types
 *
 * Types for GitHub authentication and API interactions.
 */

/**
 * Authentication method used
 */
export type GitHubAuthMethod = 'oauth' | 'pat' | 'generated' | 'skipped';

/**
 * Required GitHub token scopes
 */
export const REQUIRED_SCOPES = ['repo', 'read:org', 'workflow'] as const;
export type GitHubScope = (typeof REQUIRED_SCOPES)[number];

/**
 * All possible GitHub token scopes
 */
export type AllGitHubScope =
  | 'repo'
  | 'repo:status'
  | 'repo_deployment'
  | 'public_repo'
  | 'repo:invite'
  | 'security_events'
  | 'read:org'
  | 'write:org'
  | 'admin:org'
  | 'read:public_key'
  | 'write:public_key'
  | 'admin:public_key'
  | 'read:repo_hook'
  | 'write:repo_hook'
  | 'admin:repo_hook'
  | 'read:org_hook'
  | 'write:org_hook'
  | 'admin:org_hook'
  | 'gist'
  | 'notifications'
  | 'user'
  | 'read:user'
  | 'user:email'
  | 'user:follow'
  | 'delete_repo'
  | 'write:discussion'
  | 'read:discussion'
  | 'workflow'
  | 'write:packages'
  | 'read:packages'
  | 'delete:packages'
  | 'admin:gpg_key'
  | 'write:gpg_key'
  | 'read:gpg_key'
  | 'codespace'
  | 'copilot'
  | 'project';

/**
 * GitHub user information from API
 */
export interface GitHubUser {
  login: string;
  id: number;
  name?: string;
  email?: string;
  avatar_url?: string;
  type: 'User' | 'Organization';
}

/**
 * Result of authentication attempt
 */
export interface GitHubAuthResult {
  /** Whether authentication was successful */
  authenticated: boolean;
  /** GitHub username if authenticated */
  username?: string;
  /** Authentication method used */
  method: GitHubAuthMethod;
  /** Scopes granted to the token */
  scopes?: string[];
  /** Error message if authentication failed */
  error?: string;
  /** Full user data from GitHub */
  user?: GitHubUser;
}

/**
 * Result of token validation
 */
export interface TokenValidationResult {
  /** Whether the token is valid */
  valid: boolean;
  /** GitHub username if valid */
  username?: string;
  /** Scopes granted to the token */
  scopes: string[];
  /** Whether all required scopes are present */
  hasRequiredScopes: boolean;
  /** Missing required scopes */
  missingScopes: string[];
  /** Error message if validation failed */
  error?: string;
  /** Full user data */
  user?: GitHubUser;
}

/**
 * Options for authentication flow
 */
export interface GitHubAuthOptions {
  /** Whether to skip the interactive prompt */
  skipPrompt?: boolean;
  /** Token to validate (skips prompt if provided) */
  token?: string;
  /** Whether to allow skipping authentication */
  allowSkip?: boolean;
  /** Additional scopes to require */
  additionalScopes?: string[];
}

/**
 * OAuth configuration
 */
export interface GitHubOAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

/**
 * GitHub API response headers
 */
export interface GitHubApiHeaders {
  'x-oauth-scopes'?: string;
  'x-accepted-oauth-scopes'?: string;
  'x-ratelimit-limit'?: string;
  'x-ratelimit-remaining'?: string;
  'x-ratelimit-reset'?: string;
}
