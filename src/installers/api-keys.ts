/**
 * API Keys management for A.E.S - Bizzy ecosystem
 *
 * Handles collection, storage, and retrieval of API keys
 * stored in ~/.claude/aes-bizzy.env
 *
 * ## Credential Type Taxonomy (see docs/AUTHENTICATION-CREDENTIALS-TAXONOMY.md)
 *
 * - API Key: Static service credentials with provider-specific prefixes
 *   - Anthropic: sk-ant-*
 *   - OpenAI: sk-*
 *   - Ref.tools: ref-*
 *   - Tavily: tvly-*
 *   - Firecrawl: fc-*
 *   - Perplexity: pplx-*
 *
 * - PAT (Personal Access Token): User-scoped tokens
 *   - GitHub: ghp_*, gho_*, github_pat_*
 *   - Supabase: sbp_*
 *
 * - JWT: JSON Web Tokens (eyJ* prefix)
 *   - Supabase anon/service keys
 *
 * - Bearer: HTTP Authorization header scheme (Authorization: Bearer {token})
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import * as prompts from '@clack/prompts';
import { executeCommand } from '../utils/shell.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger({ context: { module: 'api-keys' } });

/**
 * Credential type classification
 */
export type CredentialType = 'api-key' | 'pat' | 'jwt';

/**
 * API key definition with credential type metadata
 */
export interface ApiKeyDef {
  key: string;
  name: string;
  description: string;
  required: boolean;
  /** Credential type for documentation and validation context */
  credentialType?: CredentialType;
  /** Alternative environment variable names (e.g., GH_TOKEN for GITHUB_TOKEN) */
  aliases?: string[];
  autoDetect?: () => Promise<string | null>;
  validate?: (value: string) => boolean;
  hint?: string;
}

/**
 * Collected API keys
 */
export interface ApiKeys {
  // Required
  GITHUB_TOKEN?: string;
  EXA_API_KEY?: string;
  REF_API_KEY?: string;
  // Optional AI providers
  ANTHROPIC_API_KEY?: string;
  PERPLEXITY_API_KEY?: string;
  OPENAI_API_KEY?: string;
  // Optional MCP servers
  TAVILY_API_KEY?: string;
  FIRECRAWL_API_KEY?: string;
  API_KEY?: string; // 21st.dev Magic UX/UI
  // Optional Supabase
  SUPABASE_ACCESS_TOKEN?: string;
  SUPABASE_KEY?: string;
  SUPABASE_URL?: string;
  // Optional TTS
  ELEVENLABS_API_KEY?: string;
  // Allow additional keys
  [key: string]: string | undefined;
}

/**
 * API key collection result
 */
export interface ApiKeyResult {
  success: boolean;
  keys: ApiKeys;
  envPath: string;
  error?: string;
}

/**
 * Get the path to aes-bizzy.env
 */
export function getEnvPath(): string {
  return path.join(homedir(), '.claude', 'aes-bizzy.env');
}

/**
 * Auto-detect GitHub token using gh CLI
 */
export async function detectGitHubToken(): Promise<string | null> {
  try {
    const result = await executeCommand('gh', ['auth', 'token']);
    if (result.exitCode === 0 && result.stdout.trim()) {
      return result.stdout.trim();
    }
  } catch (error) {
    logger.debug('Failed to auto-detect GitHub token:', error);
  }
  return null;
}

/**
 * API key definitions for the ecosystem
 * Ordered by: Required first, then alphabetically
 */
export const API_KEY_DEFS: ApiKeyDef[] = [
  // === REQUIRED CREDENTIALS ===
  {
    key: 'GITHUB_TOKEN',
    name: 'GitHub Token',
    description: 'For repo sync and GitHub Issues integration',
    required: true,
    credentialType: 'pat',
    aliases: ['GH_TOKEN'],
    autoDetect: detectGitHubToken,
    validate: (v) => v.startsWith('ghp_') || v.startsWith('gho_') || v.startsWith('github_pat_'),
    hint: 'Auto-detected from gh CLI. Use fine-grained PAT (github_pat_) for better security',
  },
  {
    key: 'EXA_API_KEY',
    name: 'Exa.ai API Key',
    description: 'For code search and web research (exa MCP)',
    required: true,
    credentialType: 'api-key',
    validate: (v) => v.length > 10,
    hint: 'Get from dashboard.exa.ai',
  },
  {
    key: 'REF_API_KEY',
    name: 'Ref.tools API Key',
    description: 'For documentation lookup (ref MCP)',
    required: true,
    credentialType: 'api-key',
    validate: (v) => v.startsWith('ref-'),
    hint: 'Get from ref.tools - format: ref-*',
  },

  // === OPTIONAL AI PROVIDER CREDENTIALS ===
  {
    key: 'ANTHROPIC_API_KEY',
    name: 'Anthropic API Key',
    description: 'For TaskMaster AI and Claude models',
    required: false,
    credentialType: 'api-key',
    validate: (v) => v.startsWith('sk-ant-'),
    hint: 'Optional - for TaskMaster. Format: sk-ant-*',
  },
  {
    key: 'PERPLEXITY_API_KEY',
    name: 'Perplexity API Key',
    description: 'For research features in TaskMaster',
    required: false,
    credentialType: 'api-key',
    validate: (v) => v.startsWith('pplx-'),
    hint: 'Optional - for research. Format: pplx-*',
  },
  {
    key: 'OPENAI_API_KEY',
    name: 'OpenAI API Key',
    description: 'For GPT models and embeddings in hooks',
    required: false,
    credentialType: 'api-key',
    validate: (v) => v.startsWith('sk-'),
    hint: 'Optional - for hook LLM/TTS utilities. Format: sk-*',
  },

  // === OPTIONAL MCP SERVER CREDENTIALS ===
  {
    key: 'TAVILY_API_KEY',
    name: 'Tavily API Key',
    description: 'For web search (tavily-search-server MCP)',
    required: false,
    credentialType: 'api-key',
    validate: (v) => v.startsWith('tvly-'),
    hint: 'Optional - for web search. Format: tvly-*',
  },
  {
    key: 'FIRECRAWL_API_KEY',
    name: 'Firecrawl API Key',
    description: 'For web scraping (firecrawl MCP)',
    required: false,
    credentialType: 'api-key',
    validate: (v) => v.startsWith('fc-'),
    hint: 'Optional - for web scraping. Format: fc-*',
  },
  {
    key: 'API_KEY',
    name: '21st.dev Magic UX/UI Key',
    description: 'For component generation (Magic UX/UI MCP)',
    required: false,
    credentialType: 'api-key',
    validate: (v) => v.length > 10,
    hint: 'Optional - for UI components. Note: MCP config uses API_KEY, not MAGIC_21ST_API_KEY',
  },

  // === OPTIONAL SUPABASE CREDENTIALS ===
  {
    key: 'SUPABASE_ACCESS_TOKEN',
    name: 'Supabase Access Token',
    description: 'For official Supabase MCP server',
    required: false,
    credentialType: 'pat',
    aliases: ['SUPABASE_API_KEY'],
    validate: (v) => v.startsWith('sbp_'),
    hint: 'Optional - for Supabase MCP. Format: sbp_*',
  },
  {
    key: 'SUPABASE_KEY',
    name: 'Supabase Anon Key',
    description: 'For projectmgr-context MCP (JWT format)',
    required: false,
    credentialType: 'jwt',
    aliases: ['SUPABASE_ANON_KEY'],
    validate: (v) => v.startsWith('eyJ'),
    hint: 'Optional - for project management. Format: eyJ* (JWT)',
  },

  // === OPTIONAL TTS CREDENTIALS ===
  {
    key: 'ELEVENLABS_API_KEY',
    name: 'ElevenLabs API Key',
    description: 'For high-quality TTS in hooks',
    required: false,
    credentialType: 'api-key',
    validate: (v) => v.length > 10,
    hint: 'Optional - for text-to-speech',
  },
];

/**
 * Load existing API keys from aes-bizzy.env
 */
export async function loadApiKeys(): Promise<ApiKeys> {
  const envPath = getEnvPath();
  const keys: ApiKeys = {};

  if (!existsSync(envPath)) {
    return keys;
  }

  try {
    const content = await fs.readFile(envPath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue;

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        keys[key] = value;
      }
    }
  } catch (error) {
    logger.debug('Failed to load existing API keys:', error);
  }

  return keys;
}

/**
 * Save API keys to aes-bizzy.env
 */
export async function saveApiKeys(keys: ApiKeys): Promise<void> {
  const envPath = getEnvPath();
  const claudeDir = path.dirname(envPath);

  // Ensure ~/.claude exists
  await fs.mkdir(claudeDir, { recursive: true });

  const lines = [
    '# A.E.S - Bizzy Ecosystem Configuration',
    `# Generated by: aes-bizzy init on ${new Date().toISOString()}`,
    '#',
    '# This file contains API keys for the A.E.S - Bizzy ecosystem.',
    '# Keep this file secure and do not commit to version control.',
    '',
  ];

  // Add keys with comments
  for (const def of API_KEY_DEFS) {
    const value = keys[def.key];
    if (value) {
      lines.push(`# ${def.name}: ${def.description}`);
      lines.push(`${def.key}=${value}`);
      lines.push('');
    }
  }

  // Add any extra keys not in our definitions
  for (const [key, value] of Object.entries(keys)) {
    if (value && !API_KEY_DEFS.find(d => d.key === key)) {
      lines.push(`${key}=${value}`);
    }
  }

  await fs.writeFile(envPath, lines.join('\n'), 'utf-8');
  logger.debug(`Saved API keys to ${envPath}`);
}

/**
 * Collect API keys interactively
 */
export async function collectApiKeys(
  existingKeys: ApiKeys = {},
  options: {
    nonInteractive?: boolean;
    providedKeys?: Partial<ApiKeys>;
  } = {}
): Promise<ApiKeyResult> {
  const keys: ApiKeys = { ...existingKeys };
  const envPath = getEnvPath();

  // Merge provided keys (from CLI flags)
  if (options.providedKeys) {
    for (const [key, value] of Object.entries(options.providedKeys)) {
      if (value) {
        keys[key] = value;
      }
    }
  }

  // Process each key definition
  for (const def of API_KEY_DEFS) {
    // Skip if already have a valid value
    if (keys[def.key] && (!def.validate || def.validate(keys[def.key]!))) {
      continue;
    }

    // Try auto-detection
    if (def.autoDetect) {
      const detected = await def.autoDetect();
      if (detected) {
        keys[def.key] = detected;
        prompts.log.success(`${def.name}: Auto-detected ✓`);
        continue;
      }
    }

    // Non-interactive mode: skip optional, fail on required
    if (options.nonInteractive) {
      if (def.required && !keys[def.key]) {
        return {
          success: false,
          keys,
          envPath,
          error: `Missing required key: ${def.key}`,
        };
      }
      continue;
    }

    // Interactive prompt
    if (def.required || await shouldPromptOptional(def)) {
      const value = await prompts.text({
        message: `${def.name}`,
        placeholder: def.hint || `Enter ${def.key}`,
        validate: (v) => {
          if (def.required && !v) return `${def.name} is required`;
          if (v && def.validate && !def.validate(v)) {
            return `Invalid ${def.name} format`;
          }
          return undefined;
        },
      });

      if (prompts.isCancel(value)) {
        return {
          success: false,
          keys,
          envPath,
          error: 'Cancelled by user',
        };
      }

      if (value) {
        keys[def.key] = value as string;
      }
    }
  }

  return {
    success: true,
    keys,
    envPath,
  };
}

/**
 * Ask if user wants to provide an optional key
 */
async function shouldPromptOptional(def: ApiKeyDef): Promise<boolean> {
  const result = await prompts.confirm({
    message: `Configure ${def.name}? (${def.description})`,
    initialValue: false,
  });
  return result === true;
}

/**
 * Full API key setup flow for init wizard
 */
export async function setupApiKeys(options: {
  nonInteractive?: boolean;
  providedKeys?: Partial<ApiKeys>;
  skipPrompts?: boolean;
}): Promise<ApiKeyResult> {
  // Load existing keys
  const existingKeys = await loadApiKeys();

  // Collect/update keys
  const result = await collectApiKeys(existingKeys, {
    nonInteractive: options.nonInteractive,
    providedKeys: options.providedKeys,
  });

  if (!result.success) {
    return result;
  }

  // Save updated keys
  try {
    await saveApiKeys(result.keys);
    prompts.log.success(`API keys saved to ${result.envPath}`);
  } catch (error) {
    return {
      success: false,
      keys: result.keys,
      envPath: result.envPath,
      error: `Failed to save keys: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  return result;
}

/**
 * Get a specific API key (loads from file if needed)
 */
export async function getApiKey(key: string): Promise<string | undefined> {
  const keys = await loadApiKeys();
  return keys[key];
}

/**
 * Check if required API keys are configured
 */
export async function checkRequiredKeys(): Promise<{
  valid: boolean;
  missing: string[];
  configured: string[];
}> {
  const keys = await loadApiKeys();
  const missing: string[] = [];
  const configured: string[] = [];

  for (const def of API_KEY_DEFS) {
    if (keys[def.key]) {
      configured.push(def.key);
    } else if (def.required) {
      missing.push(def.key);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    configured,
  };
}
