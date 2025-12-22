/**
 * Task Master AI types
 *
 * Types for Task Master AI MCP server configuration.
 */
/**
 * Available model configurations
 */
export const AVAILABLE_MODELS = [
    {
        id: 'claude-sonnet-4-5',
        name: 'Claude Sonnet 4.5',
        provider: 'anthropic',
        recommended: true,
        description: 'Fast and capable (recommended)',
    },
    {
        id: 'claude-opus-4-5',
        name: 'Claude Opus 4.5',
        provider: 'anthropic',
        description: 'Most capable Claude model',
    },
    {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        description: 'OpenAI flagship model',
    },
    {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        description: 'Fast and affordable',
    },
    {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        provider: 'google',
        description: 'Google fast model',
    },
    {
        id: 'perplexity-sonar',
        name: 'Perplexity Sonar',
        provider: 'perplexity',
        description: 'Research-focused model',
    },
];
/**
 * Tool tier definitions from Task Master documentation
 */
export const TOOL_TIERS = {
    core: {
        tier: 'core',
        toolCount: 7,
        tools: [
            'get_tasks',
            'next_task',
            'get_task',
            'set_task_status',
            'update_subtask',
            'parse_prd',
            'expand_task',
        ],
        description: 'Essential tools for basic task management',
    },
    standard: {
        tier: 'standard',
        toolCount: 14,
        tools: [
            'get_tasks',
            'next_task',
            'get_task',
            'set_task_status',
            'update_subtask',
            'parse_prd',
            'expand_task',
            'initialize_project',
            'analyze_project_complexity',
            'expand_all',
            'add_subtask',
            'remove_task',
            'add_task',
            'complexity_report',
        ],
        description: 'Core plus project management tools',
    },
    all: {
        tier: 'all',
        toolCount: 44,
        tools: [], // Too many to list
        description: 'All tools including dependencies, tags, research, autopilot',
    },
};
/**
 * Environment variables required per provider
 */
export const PROVIDER_ENV_VARS = {
    anthropic: 'ANTHROPIC_API_KEY',
    openai: 'OPENAI_API_KEY',
    google: 'GOOGLE_API_KEY',
    perplexity: 'PERPLEXITY_API_KEY',
};
//# sourceMappingURL=task-master.js.map