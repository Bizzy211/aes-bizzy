/**
 * MCP Server types and configurations
 *
 * Types and configurations for multiple MCP servers that can be installed.
 */

/**
 * Available MCP server identifiers
 */
export type MCPServerId =
  | 'github'
  | 'task-master-ai'
  | 'context7'
  | 'sequential-thinking'
  | 'firecrawl'
  | 'desktop-commander'
  | 'beads-mcp'
  | 'supabase'
  | 'project-management-supabase'
  | 'n8n'
  | 'exa'
  | 'ref'
  | 'heimdall';

/**
 * Transport type for MCP servers
 */
export type MCPTransport = 'stdio' | 'http';

/**
 * Environment variable requirement
 */
export interface EnvVarRequirement {
  name: string;
  description: string;
  required: boolean;
  envKey: string; // Key to look up in process.env
}

/**
 * HTTP header configuration for HTTP transport
 */
export interface MCPHttpHeader {
  name: string;
  valueTemplate: string; // e.g., "Bearer ${GITHUB_TOKEN}"
}

/**
 * MCP server configuration
 */
export interface MCPServerConfig {
  id: MCPServerId;
  name: string;
  description: string;
  /** Package name for stdio transport (npx -y <package>) */
  package?: string;
  /** Transport type: 'stdio' (default) or 'http' */
  transport?: MCPTransport;
  /** URL for HTTP transport */
  url?: string;
  /** HTTP headers for HTTP transport (supports variable substitution) */
  headers?: MCPHttpHeader[];
  recommended?: boolean;
  envVars: EnvVarRequirement[];
  estimatedTokenCost?: string; // e.g., "~1000 tokens/day"
  category: 'essential' | 'productivity' | 'research' | 'automation';
}

/**
 * Result of installing a single MCP server
 */
export interface MCPServerInstallResult {
  serverId: MCPServerId;
  success: boolean;
  error?: string;
}

/**
 * Summary of MCP server installation batch
 */
export interface InstallationSummary {
  installed: MCPServerId[];
  failed: { serverId: MCPServerId; error: string }[];
  skipped: MCPServerId[];
  totalTime: number;
}

/**
 * Options for MCP server installation
 */
export interface MCPInstallOptions {
  skipPrompt?: boolean;
  showSpinner?: boolean;
  envVars?: Record<string, string>;
}

/**
 * Generic MCP server status for multi-server management
 */
export interface GenericMCPServerStatus {
  serverId: MCPServerId;
  installed: boolean;
  healthy?: boolean;
  version?: string;
  error?: string;
}

/**
 * Available MCP server configurations
 */
export const MCP_SERVERS: MCPServerConfig[] = [
  {
    id: 'github',
    name: 'GitHub MCP',
    description: 'GitHub integration for repository management and PR workflows',
    transport: 'http',
    url: 'https://api.githubcopilot.com/mcp/',
    headers: [
      {
        name: 'Authorization',
        valueTemplate: 'Bearer ${GITHUB_TOKEN}',
      },
    ],
    recommended: true,
    category: 'essential',
    envVars: [
      {
        name: 'GitHub Token',
        description: 'Personal access token for GitHub API',
        required: true,
        envKey: 'GITHUB_TOKEN',
      },
    ],
    estimatedTokenCost: '~500 tokens/operation',
  },
  {
    id: 'task-master-ai',
    name: 'Task Master AI',
    description: 'AI-powered task management and project planning',
    package: 'task-master-ai',
    recommended: true,
    category: 'essential',
    envVars: [
      {
        name: 'Anthropic API Key',
        description: 'API key for Claude models',
        required: false,
        envKey: 'ANTHROPIC_API_KEY',
      },
    ],
    estimatedTokenCost: '~2000 tokens/task',
  },
  {
    id: 'context7',
    name: 'Context7',
    description: 'Up-to-date library documentation and API references',
    package: '@upstash/context7-mcp',
    recommended: true,
    category: 'research',
    envVars: [],
    estimatedTokenCost: '~1000 tokens/query',
  },
  {
    id: 'sequential-thinking',
    name: 'Sequential Thinking',
    description: 'Dynamic problem-solving through thought sequences',
    package: '@modelcontextprotocol/server-sequential-thinking',
    recommended: true,
    category: 'productivity',
    envVars: [],
    estimatedTokenCost: '~500 tokens/thought',
  },
  {
    id: 'firecrawl',
    name: 'Firecrawl',
    description: 'Web scraping and content extraction',
    package: 'firecrawl-mcp',
    recommended: false,
    category: 'research',
    envVars: [
      {
        name: 'Firecrawl API Key',
        description: 'API key for Firecrawl service',
        required: true,
        envKey: 'FIRECRAWL_API_KEY',
      },
    ],
    estimatedTokenCost: '~2000 tokens/page',
  },
  {
    id: 'desktop-commander',
    name: 'Desktop Commander',
    description: 'File system operations and process management',
    package: 'desktop-commander',
    recommended: false,
    category: 'automation',
    envVars: [],
    estimatedTokenCost: '~100 tokens/operation',
  },
  {
    id: 'beads-mcp',
    name: 'Beads MCP',
    description: 'Memory bead management for context persistence',
    package: '@mcp/beads',
    recommended: false,
    category: 'productivity',
    envVars: [],
    estimatedTokenCost: '~200 tokens/bead',
  },
  {
    id: 'supabase',
    name: 'Supabase MCP',
    description: 'Supabase database and authentication integration',
    package: '@supabase/mcp-server',
    recommended: false,
    category: 'automation',
    envVars: [
      {
        name: 'Supabase URL',
        description: 'Supabase project URL',
        required: true,
        envKey: 'SUPABASE_URL',
      },
      {
        name: 'Supabase Key',
        description: 'Supabase service role key',
        required: true,
        envKey: 'SUPABASE_KEY',
      },
    ],
    estimatedTokenCost: '~300 tokens/query',
  },
  {
    id: 'project-management-supabase',
    name: 'Project Management (Supabase)',
    description: 'Real-time project tracking with milestones, requirements, and team notifications',
    package: 'project-management-supabase',
    recommended: true,
    category: 'productivity',
    envVars: [
      {
        name: 'Supabase URL',
        description: 'Supabase project URL for project management database',
        required: true,
        envKey: 'SUPABASE_URL',
      },
      {
        name: 'Supabase Key',
        description: 'Supabase service role key',
        required: true,
        envKey: 'SUPABASE_KEY',
      },
    ],
    estimatedTokenCost: '~400 tokens/operation',
  },
  {
    id: 'n8n',
    name: 'n8n MCP',
    description: 'Workflow automation and integration',
    package: 'n8n-mcp',
    recommended: false,
    category: 'automation',
    envVars: [
      {
        name: 'n8n API Key',
        description: 'n8n instance API key',
        required: true,
        envKey: 'N8N_API_KEY',
      },
      {
        name: 'n8n Host',
        description: 'n8n instance URL',
        required: true,
        envKey: 'N8N_HOST',
      },
    ],
    estimatedTokenCost: '~500 tokens/workflow',
  },
  {
    id: 'exa',
    name: 'Exa AI',
    description: 'AI-powered web search and code context from exa.ai',
    package: '@anthropic/exa-mcp',
    recommended: true,
    category: 'research',
    envVars: [
      {
        name: 'Exa API Key',
        description: 'API key for Exa AI search',
        required: true,
        envKey: 'EXA_API_KEY',
      },
    ],
    estimatedTokenCost: '~1000 tokens/search',
  },
  {
    id: 'ref',
    name: 'Ref Tools',
    description: 'Documentation search and URL reading from ref.tools',
    package: '@anthropic/ref-mcp',
    recommended: true,
    category: 'research',
    envVars: [],
    estimatedTokenCost: '~500 tokens/lookup',
  },
  {
    id: 'heimdall',
    name: 'Heimdall Memory',
    description: 'Persistent vector memory for agents using Qdrant - enables semantic search and context retrieval across sessions',
    package: '@anthropic/heimdall-mcp',
    recommended: true,
    category: 'productivity',
    envVars: [
      {
        name: 'OpenAI API Key',
        description: 'API key for text embeddings (text-embedding-3-small)',
        required: true,
        envKey: 'OPENAI_API_KEY',
      },
    ],
    estimatedTokenCost: '~100 tokens/memory + embedding cost',
  },
];

/**
 * Get server configuration by ID
 */
export function getMCPServerConfig(serverId: MCPServerId): MCPServerConfig | undefined {
  return MCP_SERVERS.find((s) => s.id === serverId);
}

/**
 * Get recommended servers
 */
export function getRecommendedServers(): MCPServerConfig[] {
  return MCP_SERVERS.filter((s) => s.recommended);
}

/**
 * Get servers by category
 */
export function getServersByCategory(
  category: MCPServerConfig['category']
): MCPServerConfig[] {
  return MCP_SERVERS.filter((s) => s.category === category);
}
