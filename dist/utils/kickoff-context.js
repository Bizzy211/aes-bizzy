/**
 * Kickoff Context Generator and Detection
 *
 * Creates context files for pm-lead agent to use when starting
 * a new project workflow. The context includes project description,
 * configuration, and recommendations for agent orchestration.
 *
 * Also provides kickoff mode detection for agent orchestration.
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { createLogger } from './logger.js';
import { getRecommendedAgents } from './agent-matcher.js';
/**
 * Environment variable for kickoff mode
 */
export const KICKOFF_MODE_ENV = 'AES_KICKOFF_MODE';
/**
 * Kickoff context file name
 */
export const KICKOFF_CONTEXT_FILE = 'kickoff.json';
/**
 * Kickoff markdown file name
 */
export const KICKOFF_MARKDOWN_FILE = 'KICKOFF.md';
const logger = createLogger({ context: { module: 'kickoff-context' } });
/**
 * Analyze project description to suggest relevant agents
 * Uses the agent-matcher utility for comprehensive matching
 */
function analyzeProjectForAgents(description) {
    if (!description) {
        return ['pm-lead', 'frontend-dev', 'backend-dev', 'test-engineer'];
    }
    return getRecommendedAgents(description);
}
/**
 * Generate suggested initial tasks based on project context
 */
function generateSuggestedTasks(context) {
    const tasks = [];
    // Core PRD task
    tasks.push('Research project domain using Exa and Ref tools to gather requirements');
    tasks.push('Generate comprehensive PRD based on project description and research');
    tasks.push('Parse PRD with Task Master to create initial task structure');
    // Based on configuration
    if (context.githubUrl) {
        tasks.push('Create initial GitHub issues from task structure');
        tasks.push('Set up project board for task tracking');
    }
    if (context.config?.hasBeads) {
        tasks.push('Initialize Beads context with project decisions and architecture notes');
    }
    // Based on agents
    if (context.recommendedAgents?.includes('frontend-dev')) {
        tasks.push('Set up frontend framework and component architecture');
    }
    if (context.recommendedAgents?.includes('backend-dev')) {
        tasks.push('Design API structure and database schema');
    }
    if (context.recommendedAgents?.includes('security-expert')) {
        tasks.push('Define security requirements and authentication flow');
    }
    return tasks;
}
/**
 * Create kickoff context file for pm-lead agent
 */
export async function createKickoffContext(options) {
    const { projectName, projectPath, projectDescription, githubUrl, hasTaskMaster = false, hasBeads = false, mcpServers = [], notes = [], } = options;
    logger.debug(`Creating kickoff context for project: ${projectName}`);
    try {
        // Ensure .claude directory exists
        const claudeDir = path.join(projectPath, '.claude');
        if (!existsSync(claudeDir)) {
            mkdirSync(claudeDir, { recursive: true });
        }
        // Analyze project to recommend agents
        const recommendedAgents = analyzeProjectForAgents(projectDescription);
        // Build context object
        const context = {
            projectName,
            projectDescription,
            githubUrl,
            projectPath,
            createdAt: new Date().toISOString(),
            config: {
                hasTaskMaster,
                hasBeads,
                mcpServers,
            },
            recommendedAgents,
            suggestedTasks: [],
            notes,
        };
        // Generate suggested tasks
        context.suggestedTasks = generateSuggestedTasks(context);
        // Write JSON context file
        const contextPath = path.join(claudeDir, 'kickoff.json');
        await fs.writeFile(contextPath, JSON.stringify(context, null, 2), 'utf-8');
        // Also create a markdown version for easy reading
        const mdPath = path.join(claudeDir, 'KICKOFF.md');
        const mdContent = generateKickoffMarkdown(context);
        await fs.writeFile(mdPath, mdContent, 'utf-8');
        logger.info(`Kickoff context created: ${contextPath}`);
        return {
            success: true,
            contextPath,
            context,
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to create kickoff context: ${message}`);
        return {
            success: false,
            error: message,
        };
    }
}
/**
 * Generate markdown version of kickoff context
 */
function generateKickoffMarkdown(context) {
    const lines = [
        `# Project Kickoff: ${context.projectName}`,
        '',
        `> Created: ${context.createdAt}`,
        '',
    ];
    // Project Description
    if (context.projectDescription) {
        lines.push('## Project Description', '', context.projectDescription, '');
    }
    // GitHub
    if (context.githubUrl) {
        lines.push('## Repository', '', `- GitHub: ${context.githubUrl}`, '');
    }
    // Configuration
    lines.push('## Configuration', '');
    lines.push(`- **TaskMaster**: ${context.config.hasTaskMaster ? 'Configured' : 'Not configured'}`);
    lines.push(`- **Beads**: ${context.config.hasBeads ? 'Configured' : 'Not configured'}`);
    if (context.config.mcpServers.length > 0) {
        lines.push(`- **MCP Servers**: ${context.config.mcpServers.join(', ')}`);
    }
    lines.push('');
    // Recommended Agents
    lines.push('## Recommended Agents', '');
    lines.push('Based on the project description, these agents are recommended:', '');
    for (const agent of context.recommendedAgents) {
        lines.push(`- \`${agent}\``);
    }
    lines.push('');
    // Suggested Tasks
    lines.push('## Suggested Initial Tasks', '');
    for (let i = 0; i < context.suggestedTasks.length; i++) {
        lines.push(`${i + 1}. ${context.suggestedTasks[i]}`);
    }
    lines.push('');
    // Notes
    if (context.notes && context.notes.length > 0) {
        lines.push('## Notes', '');
        for (const note of context.notes) {
            lines.push(`- ${note}`);
        }
        lines.push('');
    }
    // pm-lead instructions
    lines.push('---', '');
    lines.push('## For pm-lead Agent', '');
    lines.push('This kickoff context was automatically generated. As pm-lead, you should:', '');
    lines.push('1. Review the project description and configuration');
    lines.push('2. Use Exa and Ref MCP tools to research the domain');
    lines.push('3. Generate a comprehensive PRD');
    lines.push('4. Use Task Master to parse the PRD and create tasks');
    lines.push('5. Orchestrate other agents based on recommendations');
    lines.push('6. Track context and decisions in Beads (if configured)');
    lines.push('');
    return lines.join('\n');
}
/**
 * Read existing kickoff context
 */
export async function readKickoffContext(projectPath) {
    const contextPath = path.join(projectPath, '.claude', KICKOFF_CONTEXT_FILE);
    try {
        if (!existsSync(contextPath)) {
            return null;
        }
        const content = await fs.readFile(contextPath, 'utf-8');
        return JSON.parse(content);
    }
    catch (error) {
        logger.debug(`Failed to read kickoff context: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}
/**
 * Check if kickoff mode is enabled via environment variable
 */
export function isKickoffModeEnv() {
    const value = process.env[KICKOFF_MODE_ENV];
    return value === '1' || value === 'true' || value === 'yes';
}
/**
 * Check if kickoff context file exists
 */
export function hasKickoffContextFile(projectPath) {
    const contextPath = path.join(projectPath, '.claude', KICKOFF_CONTEXT_FILE);
    return existsSync(contextPath);
}
/**
 * Detect kickoff mode from all sources
 */
export async function detectKickoffMode(projectPath) {
    logger.debug(`Detecting kickoff mode in: ${projectPath}`);
    // Check environment variable first
    if (isKickoffModeEnv()) {
        logger.debug('Kickoff mode detected via environment variable');
        // Try to load context if available
        const context = await readKickoffContext(projectPath);
        const contextPath = context
            ? path.join(projectPath, '.claude', KICKOFF_CONTEXT_FILE)
            : undefined;
        return {
            active: true,
            source: 'environment',
            contextPath,
            context: context ?? undefined,
        };
    }
    // Check for context file
    if (hasKickoffContextFile(projectPath)) {
        const context = await readKickoffContext(projectPath);
        if (context) {
            logger.debug('Kickoff mode detected via context file');
            return {
                active: true,
                source: 'context-file',
                contextPath: path.join(projectPath, '.claude', KICKOFF_CONTEXT_FILE),
                context,
            };
        }
    }
    logger.debug('No kickoff mode detected');
    return {
        active: false,
        source: 'none',
    };
}
/**
 * Generate kickoff workflow steps from context
 */
export function generateKickoffWorkflow(context) {
    const steps = [];
    let stepNum = 1;
    // Step 1: Research
    steps.push({
        step: stepNum++,
        title: 'Research Domain',
        description: `Research the project domain using web search and documentation tools.
Project: ${context.projectName}
Description: ${context.projectDescription || 'No description provided'}`,
        tools: ['mcp__exa__web_search_exa', 'mcp__ref__ref_search_documentation'],
    });
    // Step 2: Generate PRD
    steps.push({
        step: stepNum++,
        title: 'Generate PRD',
        description: `Create a comprehensive Product Requirements Document based on research.
Save to: .taskmaster/docs/prd.md`,
        tools: ['Write', 'mcp__sequential-thinking__sequentialthinking'],
    });
    // Step 3: Parse PRD with Task Master
    if (context.config.hasTaskMaster) {
        steps.push({
            step: stepNum++,
            title: 'Parse PRD with Task Master',
            description: 'Use Task Master to parse the PRD and generate initial task structure.',
            tools: ['mcp__task-master-ai__parse_prd', 'mcp__task-master-ai__analyze_project_complexity'],
        });
    }
    // Step 4: Create GitHub issues
    if (context.githubUrl) {
        steps.push({
            step: stepNum++,
            title: 'Create GitHub Issues',
            description: `Create GitHub issues from the generated tasks.
Repository: ${context.githubUrl}`,
            tools: ['mcp__github__create_milestone', 'mcp__github__create_issue'],
        });
    }
    // Step 5: Orchestrate agents
    steps.push({
        step: stepNum++,
        title: 'Orchestrate Agents',
        description: `Spawn appropriate agents to work on tasks.
Recommended agents: ${context.recommendedAgents.join(', ')}`,
        tools: ['Task'],
    });
    // Step 6: Track progress
    steps.push({
        step: stepNum++,
        title: 'Track Progress',
        description: 'Monitor agent completion, update task statuses, and collect HandoffData.',
        tools: ['mcp__task-master-ai__set_task_status', 'mcp__task-master-ai__update_subtask'],
    });
    return steps;
}
/**
 * Generate pm-lead prompt for kickoff workflow
 */
export function generateKickoffPrompt(context) {
    const workflow = generateKickoffWorkflow(context);
    const lines = [];
    lines.push('# Kickoff Workflow Instructions');
    lines.push('');
    lines.push('You are pm-lead starting a new project. Follow these steps:');
    lines.push('');
    // Context summary
    lines.push('## Project Context');
    lines.push('');
    lines.push(`- **Project Name:** ${context.projectName}`);
    if (context.projectDescription) {
        lines.push(`- **Description:** ${context.projectDescription}`);
    }
    if (context.githubUrl) {
        lines.push(`- **GitHub:** ${context.githubUrl}`);
    }
    lines.push(`- **Recommended Agents:** ${context.recommendedAgents.join(', ')}`);
    lines.push('');
    // Configuration
    lines.push('## Configuration');
    lines.push('');
    lines.push(`- Task Master: ${context.config.hasTaskMaster ? 'Configured' : 'Not configured'}`);
    lines.push(`- Beads: ${context.config.hasBeads ? 'Configured' : 'Not configured'}`);
    if (context.config.mcpServers.length > 0) {
        lines.push(`- MCP Servers: ${context.config.mcpServers.join(', ')}`);
    }
    lines.push('');
    // Workflow steps
    lines.push('## Workflow Steps');
    lines.push('');
    for (const step of workflow) {
        lines.push(`### Step ${step.step}: ${step.title}`);
        lines.push('');
        lines.push(step.description);
        lines.push('');
        if (step.tools && step.tools.length > 0) {
            lines.push(`**Tools:** ${step.tools.join(', ')}`);
            lines.push('');
        }
    }
    // Handoff instructions
    lines.push('## Handoff Protocol');
    lines.push('');
    lines.push('When spawning agents, provide HandoffData context and expect HandoffData in return.');
    lines.push('Update task status in Task Master after each agent completes their work.');
    lines.push('');
    return lines.join('\n');
}
/**
 * Set kickoff mode environment variable
 */
export function setKickoffModeEnv(enabled) {
    if (enabled) {
        process.env[KICKOFF_MODE_ENV] = '1';
    }
    else {
        delete process.env[KICKOFF_MODE_ENV];
    }
}
/**
 * Clear kickoff context files
 */
export async function clearKickoffContext(projectPath) {
    const claudeDir = path.join(projectPath, '.claude');
    const jsonPath = path.join(claudeDir, KICKOFF_CONTEXT_FILE);
    const mdPath = path.join(claudeDir, KICKOFF_MARKDOWN_FILE);
    try {
        if (existsSync(jsonPath)) {
            await fs.unlink(jsonPath);
        }
        if (existsSync(mdPath)) {
            await fs.unlink(mdPath);
        }
        logger.debug('Kickoff context files cleared');
        return true;
    }
    catch (error) {
        logger.error(`Failed to clear kickoff context: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
}
//# sourceMappingURL=kickoff-context.js.map