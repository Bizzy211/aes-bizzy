/**
 * .env.claude file utilities
 *
 * Manages project-level credentials file that stores
 * API keys and tokens for MCP servers.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { existsSync } from 'node:fs';

/**
 * Known credential keys and their descriptions
 */
export const CREDENTIAL_KEYS = {
  // GitHub
  GITHUB_TOKEN: 'GitHub Personal Access Token',

  // AI Providers
  ANTHROPIC_API_KEY: 'Anthropic API Key (Claude)',
  OPENAI_API_KEY: 'OpenAI API Key',
  PERPLEXITY_API_KEY: 'Perplexity API Key',

  // Supabase
  SUPABASE_URL: 'Supabase Project URL',
  SUPABASE_KEY: 'Supabase Service Role Key',

  // Other MCPs
  FIRECRAWL_API_KEY: 'Firecrawl API Key',
  EXA_API_KEY: 'Exa AI API Key',
  N8N_API_KEY: 'n8n API Key',
  N8N_HOST: 'n8n Host URL',
} as const;

export type CredentialKey = keyof typeof CREDENTIAL_KEYS;

/**
 * Credentials object type
 */
export type Credentials = Partial<Record<CredentialKey, string>>;

/**
 * Get path to project .env.claude
 */
export function getEnvClaudePath(projectPath: string): string {
  return path.join(projectPath, '.env.claude');
}

/**
 * Check if .env.claude exists in project
 */
export function envClaudeExists(projectPath: string): boolean {
  return existsSync(getEnvClaudePath(projectPath));
}

/**
 * Parse .env file content into key-value pairs
 */
export function parseEnvContent(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Parse KEY=value
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      const key = trimmed.substring(0, eqIndex).trim();
      let value = trimmed.substring(eqIndex + 1).trim();

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      result[key] = value;
    }
  }

  return result;
}

/**
 * Generate .env file content from credentials
 */
export function generateEnvContent(
  credentials: Credentials,
  includeComments = true
): string {
  const lines: string[] = [];

  if (includeComments) {
    lines.push('# Claude Code / AES Bizzy Credentials');
    lines.push('# This file is gitignored - do not commit to version control');
    lines.push('');
  }

  // Group credentials by category
  const groups: Record<string, CredentialKey[]> = {
    '# GitHub': ['GITHUB_TOKEN'],
    '# AI Providers': ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'PERPLEXITY_API_KEY'],
    '# Supabase': ['SUPABASE_URL', 'SUPABASE_KEY'],
    '# Other Services': ['FIRECRAWL_API_KEY', 'EXA_API_KEY', 'N8N_API_KEY', 'N8N_HOST'],
  };

  for (const [header, keys] of Object.entries(groups)) {
    const groupCredentials = keys.filter((key) => credentials[key] !== undefined);

    if (groupCredentials.length > 0) {
      if (includeComments) {
        lines.push(header);
      }

      for (const key of groupCredentials) {
        const value = credentials[key] || '';
        lines.push(`${key}=${value}`);
      }

      lines.push('');
    }
  }

  // Add any unknown keys at the end
  const knownKeys = new Set(Object.keys(CREDENTIAL_KEYS));
  const unknownKeys = Object.keys(credentials).filter(
    (key) => !knownKeys.has(key) && credentials[key as CredentialKey]
  );

  if (unknownKeys.length > 0) {
    if (includeComments) {
      lines.push('# Other');
    }
    for (const key of unknownKeys) {
      lines.push(`${key}=${credentials[key as CredentialKey] || ''}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Load credentials from .env.claude
 */
export async function loadEnvClaude(
  projectPath: string
): Promise<Credentials | null> {
  const envPath = getEnvClaudePath(projectPath);

  if (!existsSync(envPath)) {
    return null;
  }

  try {
    const content = await fs.readFile(envPath, 'utf-8');
    return parseEnvContent(content) as Credentials;
  } catch {
    return null;
  }
}

/**
 * Save credentials to .env.claude
 */
export async function saveEnvClaude(
  projectPath: string,
  credentials: Credentials,
  merge = true
): Promise<{ success: boolean; error?: string }> {
  const envPath = getEnvClaudePath(projectPath);

  try {
    let finalCredentials = { ...credentials };

    // Merge with existing if requested
    if (merge && existsSync(envPath)) {
      const existing = await loadEnvClaude(projectPath);
      if (existing) {
        finalCredentials = { ...existing, ...credentials };
      }
    }

    const content = generateEnvContent(finalCredentials);
    await fs.writeFile(envPath, content, 'utf-8');

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get a specific credential from .env.claude
 */
export async function getCredential(
  projectPath: string,
  key: CredentialKey
): Promise<string | null> {
  const credentials = await loadEnvClaude(projectPath);
  return credentials?.[key] || null;
}

/**
 * Set a specific credential in .env.claude
 */
export async function setCredential(
  projectPath: string,
  key: CredentialKey,
  value: string
): Promise<{ success: boolean; error?: string }> {
  return saveEnvClaude(projectPath, { [key]: value } as Credentials, true);
}

/**
 * Check if required credentials are present
 */
export async function checkRequiredCredentials(
  projectPath: string,
  required: CredentialKey[]
): Promise<{ valid: boolean; missing: CredentialKey[] }> {
  const credentials = await loadEnvClaude(projectPath);
  const missing: CredentialKey[] = [];

  for (const key of required) {
    if (!credentials?.[key]) {
      missing.push(key);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get credentials needed for specific MCP servers
 */
export function getRequiredCredentialsForServers(
  serverIds: string[]
): CredentialKey[] {
  const required = new Set<CredentialKey>();

  for (const serverId of serverIds) {
    switch (serverId) {
      case 'github':
        required.add('GITHUB_TOKEN');
        break;
      case 'task-master-ai':
        required.add('ANTHROPIC_API_KEY');
        break;
      case 'supabase':
      case 'project-management-supabase':
        required.add('SUPABASE_URL');
        required.add('SUPABASE_KEY');
        break;
      case 'firecrawl':
        required.add('FIRECRAWL_API_KEY');
        break;
      case 'exa':
        required.add('EXA_API_KEY');
        break;
      case 'n8n':
        required.add('N8N_API_KEY');
        required.add('N8N_HOST');
        break;
      // context7, sequential-thinking, desktop-commander, beads-mcp, ref don't need keys
    }
  }

  return Array.from(required);
}

/**
 * Create initial .env.claude with placeholder comments
 */
export async function createEnvClaudeTemplate(
  projectPath: string,
  serverIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const required = getRequiredCredentialsForServers(serverIds);

  // Create with empty values as placeholders
  const credentials: Credentials = {};
  for (const key of required) {
    credentials[key] = '';
  }

  return saveEnvClaude(projectPath, credentials, false);
}
