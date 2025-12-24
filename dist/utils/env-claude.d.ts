/**
 * .env.claude file utilities
 *
 * Manages project-level credentials file that stores
 * API keys and tokens for MCP servers.
 */
/**
 * Known credential keys and their descriptions
 */
export declare const CREDENTIAL_KEYS: {
    readonly GITHUB_TOKEN: "GitHub Personal Access Token";
    readonly ANTHROPIC_API_KEY: "Anthropic API Key (Claude)";
    readonly OPENAI_API_KEY: "OpenAI API Key";
    readonly PERPLEXITY_API_KEY: "Perplexity API Key";
    readonly SUPABASE_URL: "Supabase Project URL";
    readonly SUPABASE_KEY: "Supabase Service Role Key";
    readonly FIRECRAWL_API_KEY: "Firecrawl API Key";
    readonly EXA_API_KEY: "Exa AI API Key";
    readonly N8N_API_KEY: "n8n API Key";
    readonly N8N_HOST: "n8n Host URL";
};
export type CredentialKey = keyof typeof CREDENTIAL_KEYS;
/**
 * Credentials object type
 */
export type Credentials = Partial<Record<CredentialKey, string>>;
/**
 * Get path to project .env.claude
 */
export declare function getEnvClaudePath(projectPath: string): string;
/**
 * Check if .env.claude exists in project
 */
export declare function envClaudeExists(projectPath: string): boolean;
/**
 * Parse .env file content into key-value pairs
 */
export declare function parseEnvContent(content: string): Record<string, string>;
/**
 * Generate .env file content from credentials
 */
export declare function generateEnvContent(credentials: Credentials, includeComments?: boolean): string;
/**
 * Load credentials from .env.claude
 */
export declare function loadEnvClaude(projectPath: string): Promise<Credentials | null>;
/**
 * Save credentials to .env.claude
 */
export declare function saveEnvClaude(projectPath: string, credentials: Credentials, merge?: boolean): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * Get a specific credential from .env.claude
 */
export declare function getCredential(projectPath: string, key: CredentialKey): Promise<string | null>;
/**
 * Set a specific credential in .env.claude
 */
export declare function setCredential(projectPath: string, key: CredentialKey, value: string): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * Check if required credentials are present
 */
export declare function checkRequiredCredentials(projectPath: string, required: CredentialKey[]): Promise<{
    valid: boolean;
    missing: CredentialKey[];
}>;
/**
 * Get credentials needed for specific MCP servers
 */
export declare function getRequiredCredentialsForServers(serverIds: string[]): CredentialKey[];
/**
 * Create initial .env.claude with placeholder comments
 */
export declare function createEnvClaudeTemplate(projectPath: string, serverIds: string[]): Promise<{
    success: boolean;
    error?: string;
}>;
//# sourceMappingURL=env-claude.d.ts.map