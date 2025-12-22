/**
 * API Keys management for A.E.S - Bizzy ecosystem
 *
 * Handles collection, storage, and retrieval of API keys
 * stored in ~/.claude/aes-bizzy.env
 */
/**
 * API key definition
 */
export interface ApiKeyDef {
    key: string;
    name: string;
    description: string;
    required: boolean;
    autoDetect?: () => Promise<string | null>;
    validate?: (value: string) => boolean;
    hint?: string;
}
/**
 * Collected API keys
 */
export interface ApiKeys {
    GITHUB_TOKEN?: string;
    EXA_API_KEY?: string;
    REF_API_KEY?: string;
    ANTHROPIC_API_KEY?: string;
    PERPLEXITY_API_KEY?: string;
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
export declare function getEnvPath(): string;
/**
 * Auto-detect GitHub token using gh CLI
 */
export declare function detectGitHubToken(): Promise<string | null>;
/**
 * API key definitions for the ecosystem
 */
export declare const API_KEY_DEFS: ApiKeyDef[];
/**
 * Load existing API keys from aes-bizzy.env
 */
export declare function loadApiKeys(): Promise<ApiKeys>;
/**
 * Save API keys to aes-bizzy.env
 */
export declare function saveApiKeys(keys: ApiKeys): Promise<void>;
/**
 * Collect API keys interactively
 */
export declare function collectApiKeys(existingKeys?: ApiKeys, options?: {
    nonInteractive?: boolean;
    providedKeys?: Partial<ApiKeys>;
}): Promise<ApiKeyResult>;
/**
 * Full API key setup flow for init wizard
 */
export declare function setupApiKeys(options: {
    nonInteractive?: boolean;
    providedKeys?: Partial<ApiKeys>;
    skipPrompts?: boolean;
}): Promise<ApiKeyResult>;
/**
 * Get a specific API key (loads from file if needed)
 */
export declare function getApiKey(key: string): Promise<string | undefined>;
/**
 * Check if required API keys are configured
 */
export declare function checkRequiredKeys(): Promise<{
    valid: boolean;
    missing: string[];
    configured: string[];
}>;
//# sourceMappingURL=api-keys.d.ts.map