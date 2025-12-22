/**
 * GitHub authentication module
 *
 * Provides multiple authentication methods for GitHub:
 * - OAuth browser flow
 * - Personal Access Token (PAT)
 * - Generate new token (opens GitHub settings)
 * - Skip authentication
 */

import * as prompts from '@clack/prompts';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { executeCommand } from '../utils/shell.js';
import { createLogger } from '../utils/logger.js';
import { getPlatform } from '../utils/platform.js';
import type {
  GitHubAuthResult,
  GitHubAuthOptions,
  TokenValidationResult,
  GitHubUser,
  GitHubAuthMethod,
} from '../types/github.js';
import { REQUIRED_SCOPES } from '../types/github.js';

const logger = createLogger({ context: { module: 'github-auth' } });

const GITHUB_API_URL = 'https://api.github.com';
const TOKEN_SETTINGS_URL = 'https://github.com/settings/tokens/new';

/**
 * Build URL for generating a new GitHub token with pre-selected scopes
 */
export function buildTokenGenerationUrl(scopes: string[] = [...REQUIRED_SCOPES]): string {
  const params = new URLSearchParams({
    description: 'Claude Ecosystem CLI',
    scopes: scopes.join(','),
  });
  return `${TOKEN_SETTINGS_URL}?${params.toString()}`;
}

/**
 * Open URL in the default browser
 */
export async function openInBrowser(url: string): Promise<boolean> {
  const platform = getPlatform();

  try {
    let command: string;
    let args: string[];

    switch (platform.os) {
      case 'windows':
        command = 'cmd';
        args = ['/c', 'start', '""', url];
        break;
      case 'macos':
        command = 'open';
        args = [url];
        break;
      case 'linux':
        command = 'xdg-open';
        args = [url];
        break;
    }

    const result = await executeCommand(command, args);
    return result.exitCode === 0;
  } catch (error) {
    logger.error(`Failed to open browser: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Validate a GitHub token by calling the API
 */
export async function validateGitHubToken(token: string): Promise<TokenValidationResult> {
  // Don't log the token
  logger.debug('Validating GitHub token...');

  try {
    // Use native fetch (available in Node 18+)
    const response = await fetch(`${GITHUB_API_URL}/user`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Claude-Ecosystem-CLI',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          valid: false,
          scopes: [],
          hasRequiredScopes: false,
          missingScopes: [...REQUIRED_SCOPES],
          error: 'Invalid or expired token',
        };
      }
      return {
        valid: false,
        scopes: [],
        hasRequiredScopes: false,
        missingScopes: [...REQUIRED_SCOPES],
        error: `GitHub API error: ${response.status} ${response.statusText}`,
      };
    }

    const user = (await response.json()) as GitHubUser;

    // Get scopes from response headers
    const scopesHeader = response.headers.get('x-oauth-scopes') || '';
    const scopes = scopesHeader
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    // Check for required scopes
    const missingScopes = REQUIRED_SCOPES.filter((required) => !scopes.includes(required));
    const hasRequiredScopes = missingScopes.length === 0;

    logger.debug(`Token validated for user: ${user.login}`);
    logger.debug(`Scopes: ${scopes.join(', ')}`);

    return {
      valid: true,
      username: user.login,
      scopes,
      hasRequiredScopes,
      missingScopes,
      user,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Token validation failed: ${message}`);
    return {
      valid: false,
      scopes: [],
      hasRequiredScopes: false,
      missingScopes: [...REQUIRED_SCOPES],
      error: message,
    };
  }
}

/**
 * Get the path to the GitHub token file
 * Stored in ~/.claude/github_token (same location as ecosystem.json)
 */
function getTokenFilePath(): string {
  const claudeDir = path.join(os.homedir(), '.claude');
  return path.join(claudeDir, 'github_token');
}

/**
 * Get token from GitHub CLI (gh) if authenticated
 * This is the preferred method as it uses existing auth
 */
export async function getGitHubCLIToken(): Promise<string | undefined> {
  try {
    // Check if gh is installed and authenticated
    const result = await executeCommand('gh', ['auth', 'token'], { silent: true });

    if (result.exitCode === 0 && result.stdout) {
      const token = result.stdout.trim();

      // Validate it looks like a token
      if (token && token.length > 20 && token.length < 200 && !token.includes(' ')) {
        logger.debug('Retrieved token from GitHub CLI');
        return token;
      }
    }

    return undefined;
  } catch {
    // gh not installed or not authenticated
    return undefined;
  }
}

/**
 * Check if GitHub CLI is installed and authenticated
 */
export async function isGitHubCLIAuthenticated(): Promise<boolean> {
  try {
    const result = await executeCommand('gh', ['auth', 'status'], { silent: true });
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * Store GitHub token in a secure file
 * Uses ~/.claude/github_token for storage
 */
export async function storeGitHubToken(token: string): Promise<boolean> {
  try {
    const tokenPath = getTokenFilePath();
    const claudeDir = path.dirname(tokenPath);

    // Ensure .claude directory exists
    if (!fs.existsSync(claudeDir)) {
      fs.mkdirSync(claudeDir, { recursive: true, mode: 0o700 });
    }

    // Write token with restricted permissions (owner read/write only)
    fs.writeFileSync(tokenPath, token, { mode: 0o600 });
    logger.debug(`GitHub token stored at ${tokenPath}`);
    return true;
  } catch (error) {
    logger.warn(`Failed to store token: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Get stored GitHub token
 * Priority: 1) GitHub CLI (gh auth token), 2) Stored file (~/.claude/github_token)
 */
export async function getStoredGitHubToken(): Promise<string | undefined> {
  // First, try to get token from GitHub CLI (preferred)
  const ghToken = await getGitHubCLIToken();
  if (ghToken) {
    logger.debug('Using token from GitHub CLI');
    return ghToken;
  }

  // Fall back to stored file
  try {
    const tokenPath = getTokenFilePath();

    if (!fs.existsSync(tokenPath)) {
      return undefined;
    }

    const token = fs.readFileSync(tokenPath, 'utf-8').trim();

    // Basic sanity check - token should look like a token, not like Claude output
    if (token.length > 200 || token.includes('\n') || token.includes('Claude')) {
      logger.warn('Stored token appears to be corrupted, ignoring');
      return undefined;
    }

    return token || undefined;
  } catch (error) {
    logger.debug(`Failed to read stored token: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

/**
 * Interactive authentication flow using @clack/prompts
 */
export async function authenticateGitHub(
  options: GitHubAuthOptions = {}
): Promise<GitHubAuthResult> {
  const { skipPrompt = false, token, allowSkip = true, additionalScopes = [] } = options;

  // If token provided directly, validate it
  if (token) {
    const validation = await validateGitHubToken(token);
    if (validation.valid) {
      await storeGitHubToken(token);
      return {
        authenticated: true,
        username: validation.username,
        method: 'pat',
        scopes: validation.scopes,
        user: validation.user,
      };
    }
    return {
      authenticated: false,
      method: 'pat',
      error: validation.error,
    };
  }

  // Check for existing stored token
  const storedToken = await getStoredGitHubToken();
  if (storedToken) {
    const validation = await validateGitHubToken(storedToken);
    if (validation.valid && validation.hasRequiredScopes) {
      logger.info(`Using stored GitHub token for user: ${validation.username}`);
      return {
        authenticated: true,
        username: validation.username,
        method: 'pat',
        scopes: validation.scopes,
        user: validation.user,
      };
    }
    logger.warn('Stored token is invalid or missing required scopes');
  }

  if (skipPrompt) {
    return {
      authenticated: false,
      method: 'skipped',
      error: 'No valid token available and prompts are disabled',
    };
  }

  // Build auth options
  const authOptions: { value: GitHubAuthMethod; label: string; hint?: string }[] = [
    {
      value: 'pat',
      label: 'Paste an existing Personal Access Token',
      hint: 'If you already have a token with the required scopes',
    },
    {
      value: 'generated',
      label: 'Generate a new token in browser',
      hint: 'Opens GitHub settings with pre-selected scopes',
    },
    {
      value: 'oauth',
      label: 'Authenticate via OAuth (browser)',
      hint: 'Opens GitHub OAuth flow in your browser',
    },
  ];

  if (allowSkip) {
    authOptions.push({
      value: 'skipped',
      label: 'Skip for now',
      hint: 'Some features may not work without authentication',
    });
  }

  // Show authentication method selection
  const method = await prompts.select({
    message: 'How would you like to authenticate with GitHub?',
    options: authOptions,
  });

  if (prompts.isCancel(method)) {
    return {
      authenticated: false,
      method: 'skipped',
      error: 'Authentication cancelled by user',
    };
  }

  // Handle each authentication method
  switch (method) {
    case 'pat':
      return handlePATAuthentication();

    case 'generated':
      return handleGenerateToken(additionalScopes);

    case 'oauth':
      return handleOAuthFlow();

    case 'skipped':
      logger.warn('GitHub authentication skipped. Some features may not work.');
      return {
        authenticated: false,
        method: 'skipped',
      };

    default:
      return {
        authenticated: false,
        method: 'skipped',
        error: 'Unknown authentication method',
      };
  }
}

/**
 * Handle PAT (Personal Access Token) authentication
 */
async function handlePATAuthentication(): Promise<GitHubAuthResult> {
  const tokenInput = await prompts.password({
    message: 'Enter your GitHub Personal Access Token:',
  });

  if (prompts.isCancel(tokenInput) || !tokenInput) {
    return {
      authenticated: false,
      method: 'pat',
      error: 'Token entry cancelled',
    };
  }

  const validation = await validateGitHubToken(tokenInput);

  if (!validation.valid) {
    logger.error(`Token validation failed: ${validation.error}`);
    return {
      authenticated: false,
      method: 'pat',
      error: validation.error,
    };
  }

  if (!validation.hasRequiredScopes) {
    logger.warn(`Token is missing required scopes: ${validation.missingScopes.join(', ')}`);

    const proceed = await prompts.confirm({
      message: `Token is missing scopes: ${validation.missingScopes.join(', ')}. Continue anyway?`,
      initialValue: false,
    });

    if (prompts.isCancel(proceed) || !proceed) {
      return {
        authenticated: false,
        method: 'pat',
        error: `Missing required scopes: ${validation.missingScopes.join(', ')}`,
      };
    }
  }

  // Store the token
  await storeGitHubToken(tokenInput);
  logger.success(`Authenticated as ${validation.username}`);

  return {
    authenticated: true,
    username: validation.username,
    method: 'pat',
    scopes: validation.scopes,
    user: validation.user,
  };
}

/**
 * Handle generate new token flow
 */
async function handleGenerateToken(additionalScopes: string[] = []): Promise<GitHubAuthResult> {
  const allScopes = [...REQUIRED_SCOPES, ...additionalScopes];
  const url = buildTokenGenerationUrl(allScopes);

  logger.info('Opening GitHub settings to generate a new token...');
  logger.info(`Required scopes: ${allScopes.join(', ')}`);

  const opened = await openInBrowser(url);

  if (!opened) {
    logger.warn('Could not open browser automatically.');
    logger.info(`Please visit: ${url}`);
  }

  // Wait for user to paste the generated token
  const tokenInput = await prompts.password({
    message: 'Paste the token you generated:',
  });

  if (prompts.isCancel(tokenInput) || !tokenInput) {
    return {
      authenticated: false,
      method: 'generated',
      error: 'Token entry cancelled',
    };
  }

  const validation = await validateGitHubToken(tokenInput);

  if (!validation.valid) {
    return {
      authenticated: false,
      method: 'generated',
      error: validation.error,
    };
  }

  await storeGitHubToken(tokenInput);
  logger.success(`Authenticated as ${validation.username}`);

  return {
    authenticated: true,
    username: validation.username,
    method: 'generated',
    scopes: validation.scopes,
    user: validation.user,
  };
}

/**
 * Handle OAuth browser flow
 * Note: Full OAuth requires a registered OAuth app - this is a simplified version
 */
async function handleOAuthFlow(): Promise<GitHubAuthResult> {
  logger.info('OAuth flow requires a registered GitHub OAuth application.');
  logger.info('For CLI usage, we recommend using a Personal Access Token instead.');

  // Redirect to generate token flow as OAuth requires server-side handling
  const proceed = await prompts.confirm({
    message: 'Would you like to generate a Personal Access Token instead?',
    initialValue: true,
  });

  if (prompts.isCancel(proceed) || !proceed) {
    return {
      authenticated: false,
      method: 'oauth',
      error: 'OAuth not supported for CLI - user declined PAT alternative',
    };
  }

  return handleGenerateToken();
}

/**
 * Check if user is authenticated with GitHub
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getStoredGitHubToken();
  if (!token) return false;

  const validation = await validateGitHubToken(token);
  return validation.valid;
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<GitHubUser | undefined> {
  const token = await getStoredGitHubToken();
  if (!token) return undefined;

  const validation = await validateGitHubToken(token);
  return validation.user;
}

/**
 * Clear stored GitHub authentication
 */
export async function clearAuthentication(): Promise<boolean> {
  try {
    const tokenPath = getTokenFilePath();

    if (fs.existsSync(tokenPath)) {
      fs.unlinkSync(tokenPath);
      logger.debug('GitHub token cleared');
    }
    return true;
  } catch (error) {
    logger.warn(`Failed to clear token: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}
