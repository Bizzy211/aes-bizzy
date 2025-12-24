/**
 * Agent Type Matcher Utility
 *
 * Analyzes project context to recommend appropriate sub-agents
 * for task orchestration. Used by pm-lead and other orchestration systems.
 */
import { createLogger } from './logger.js';
const logger = createLogger({ context: { module: 'agent-matcher' } });
/**
 * Available agent types in the system
 */
export const AVAILABLE_AGENTS = [
    // Core orchestration
    'pm-lead',
    'general-purpose',
    'Explore',
    'Plan',
    // Development agents
    'frontend-dev',
    'backend-dev',
    'mobile-dev',
    'fullstack-dev',
    // Specialized development
    'beautiful-web-designer',
    'animated-dashboard-architect',
    'enhanced-splunk-ui-dev',
    'splunk-xml-dev',
    'splunk-ui-dev',
    'nextjs-senior-sme',
    'ue5-sme',
    // Architecture & design
    'db-architect',
    'ux-designer',
    'visual-consistency-guardian',
    // Integration & automation
    'integration-expert',
    'n8n-engineer',
    // Quality & security
    'code-reviewer',
    'test-engineer',
    'typescript-validator',
    'lint-agent',
    'security-expert',
    'debugger',
    // Infrastructure
    'devops-engineer',
    'docs-engineer',
    // Meta
    'meta-agent',
    'work-completion-summary',
    'claude-code-guide',
    'statusline-setup',
];
/**
 * Agent definitions registry
 */
export const AGENT_DEFINITIONS = {
    // Orchestration
    'pm-lead': {
        type: 'pm-lead',
        category: 'orchestration',
        description: 'Master project orchestrator for requirements, PRD generation, and agent coordination',
        keywords: ['project', 'management', 'orchestration', 'prd', 'requirements', 'planning'],
        relatedAgents: ['docs-engineer', 'test-engineer'],
        priority: 100,
    },
    'general-purpose': {
        type: 'general-purpose',
        category: 'orchestration',
        description: 'General-purpose agent for multi-step tasks and research',
        keywords: ['general', 'research', 'multi-step', 'complex'],
        relatedAgents: [],
        priority: 50,
    },
    'Explore': {
        type: 'Explore',
        category: 'orchestration',
        description: 'Fast agent for exploring codebases',
        keywords: ['explore', 'search', 'find', 'codebase'],
        relatedAgents: [],
        priority: 60,
    },
    'Plan': {
        type: 'Plan',
        category: 'orchestration',
        description: 'Software architect for implementation planning',
        keywords: ['plan', 'architecture', 'design', 'strategy'],
        relatedAgents: ['db-architect'],
        priority: 70,
    },
    // Frontend
    'frontend-dev': {
        type: 'frontend-dev',
        category: 'frontend',
        description: 'Expert frontend developer for React, Vue, and modern web technologies',
        keywords: ['react', 'vue', 'angular', 'frontend', 'web', 'ui', 'css', 'javascript', 'typescript', 'tailwind'],
        relatedAgents: ['beautiful-web-designer', 'ux-designer', 'test-engineer'],
        priority: 80,
    },
    'beautiful-web-designer': {
        type: 'beautiful-web-designer',
        category: 'frontend',
        description: 'Expert in beautiful, modern, animated websites',
        keywords: ['design', 'animation', 'modern', 'beautiful', 'responsive', 'stunning'],
        relatedAgents: ['frontend-dev', 'ux-designer'],
        priority: 75,
    },
    'animated-dashboard-architect': {
        type: 'animated-dashboard-architect',
        category: 'frontend',
        description: 'Expert in animated dashboards with particle effects and smooth UI',
        keywords: ['dashboard', 'animation', 'particle', 'charts', 'visualization', 'analytics'],
        relatedAgents: ['frontend-dev', 'backend-dev'],
        priority: 70,
    },
    // Backend
    'backend-dev': {
        type: 'backend-dev',
        category: 'backend',
        description: 'Expert backend developer for APIs, microservices, and server architecture',
        keywords: ['api', 'backend', 'server', 'microservices', 'rest', 'graphql', 'node', 'python', 'database'],
        relatedAgents: ['db-architect', 'security-expert', 'test-engineer'],
        priority: 80,
    },
    // Mobile
    'mobile-dev': {
        type: 'mobile-dev',
        category: 'mobile',
        description: 'Mobile development specialist for React Native and Flutter',
        keywords: ['mobile', 'ios', 'android', 'react native', 'flutter', 'app', 'native'],
        relatedAgents: ['frontend-dev', 'backend-dev'],
        priority: 80,
    },
    // Fullstack
    'fullstack-dev': {
        type: 'fullstack-dev',
        category: 'backend',
        description: 'Full-stack developer for end-to-end implementation',
        keywords: ['fullstack', 'full-stack', 'end-to-end'],
        relatedAgents: ['frontend-dev', 'backend-dev'],
        priority: 75,
    },
    // Database
    'db-architect': {
        type: 'db-architect',
        category: 'database',
        description: 'Database architecture specialist for design and optimization',
        keywords: ['database', 'sql', 'nosql', 'postgresql', 'mongodb', 'schema', 'migration', 'supabase'],
        relatedAgents: ['backend-dev'],
        priority: 75,
    },
    // Design
    'ux-designer': {
        type: 'ux-designer',
        category: 'design',
        description: 'Expert UX/UI designer for user-centered design',
        keywords: ['ux', 'ui', 'design', 'user experience', 'interface', 'wireframe', 'prototype'],
        relatedAgents: ['frontend-dev', 'beautiful-web-designer'],
        priority: 70,
    },
    'visual-consistency-guardian': {
        type: 'visual-consistency-guardian',
        category: 'design',
        description: 'Maintains visual consistency and design system compliance',
        keywords: ['consistency', 'design system', 'accessibility', 'styling'],
        relatedAgents: ['ux-designer', 'frontend-dev'],
        priority: 60,
    },
    // Integration
    'integration-expert': {
        type: 'integration-expert',
        category: 'integration',
        description: 'Integration architect for APIs, webhooks, and third-party services',
        keywords: ['integration', 'api', 'webhook', 'oauth', 'third-party', 'sync'],
        relatedAgents: ['backend-dev', 'n8n-engineer'],
        priority: 70,
    },
    'n8n-engineer': {
        type: 'n8n-engineer',
        category: 'integration',
        description: 'Expert n8n workflow automation specialist',
        keywords: ['n8n', 'workflow', 'automation', 'no-code', 'zapier'],
        relatedAgents: ['integration-expert'],
        priority: 65,
    },
    // Quality
    'code-reviewer': {
        type: 'code-reviewer',
        category: 'testing',
        description: 'Expert code reviewer for quality, security, and best practices',
        keywords: ['review', 'quality', 'best practices', 'refactor'],
        relatedAgents: ['security-expert', 'test-engineer'],
        priority: 70,
    },
    'test-engineer': {
        type: 'test-engineer',
        category: 'testing',
        description: 'Expert test engineer for comprehensive testing strategies',
        keywords: ['test', 'testing', 'unit test', 'integration test', 'e2e', 'jest', 'playwright'],
        relatedAgents: ['code-reviewer', 'frontend-dev', 'backend-dev'],
        priority: 75,
    },
    'typescript-validator': {
        type: 'typescript-validator',
        category: 'testing',
        description: 'TypeScript validator for code quality and type safety',
        keywords: ['typescript', 'types', 'validation', 'strict'],
        relatedAgents: ['lint-agent', 'code-reviewer'],
        priority: 60,
    },
    'lint-agent': {
        type: 'lint-agent',
        category: 'testing',
        description: 'Code quality and linting specialist',
        keywords: ['lint', 'eslint', 'prettier', 'formatting', 'style'],
        relatedAgents: ['typescript-validator', 'code-reviewer'],
        priority: 55,
    },
    'debugger': {
        type: 'debugger',
        category: 'testing',
        description: 'Debugging specialist for solving complex issues',
        keywords: ['debug', 'error', 'bug', 'fix', 'troubleshoot', 'issue'],
        relatedAgents: ['test-engineer'],
        priority: 80,
    },
    // Security
    'security-expert': {
        type: 'security-expert',
        category: 'security',
        description: 'Cybersecurity specialist for application security',
        keywords: ['security', 'auth', 'authentication', 'authorization', 'vulnerability', 'owasp', 'encryption'],
        relatedAgents: ['backend-dev', 'code-reviewer'],
        priority: 75,
    },
    // Infrastructure
    'devops-engineer': {
        type: 'devops-engineer',
        category: 'infrastructure',
        description: 'DevOps expert for CI/CD and infrastructure automation',
        keywords: ['devops', 'ci', 'cd', 'docker', 'kubernetes', 'deployment', 'infrastructure', 'cloud'],
        relatedAgents: ['backend-dev'],
        priority: 70,
    },
    'docs-engineer': {
        type: 'docs-engineer',
        category: 'infrastructure',
        description: 'Documentation specialist for technical docs and guides',
        keywords: ['documentation', 'docs', 'readme', 'api docs', 'guide'],
        relatedAgents: ['pm-lead'],
        priority: 60,
    },
    // Specialized
    'enhanced-splunk-ui-dev': {
        type: 'enhanced-splunk-ui-dev',
        category: 'specialized',
        description: 'Advanced Splunk UI Toolkit specialist',
        keywords: ['splunk', 'ui toolkit', 'react'],
        relatedAgents: ['splunk-xml-dev', 'splunk-ui-dev'],
        priority: 65,
    },
    'splunk-xml-dev': {
        type: 'splunk-xml-dev',
        category: 'specialized',
        description: 'Expert Splunk XML dashboard specialist',
        keywords: ['splunk', 'xml', 'dashboard', 'siem', 'log'],
        relatedAgents: ['splunk-ui-dev'],
        priority: 65,
    },
    'splunk-ui-dev': {
        type: 'splunk-ui-dev',
        category: 'specialized',
        description: 'Expert Splunk UI Toolkit specialist',
        keywords: ['splunk', 'ui', 'toolkit'],
        relatedAgents: ['splunk-xml-dev'],
        priority: 65,
    },
    'nextjs-senior-sme': {
        type: 'nextjs-senior-sme',
        category: 'specialized',
        description: 'Senior Next.js expert',
        keywords: ['nextjs', 'next.js', 'vercel', 'tailadmin'],
        relatedAgents: ['frontend-dev'],
        priority: 75,
    },
    'ue5-sme': {
        type: 'ue5-sme',
        category: 'specialized',
        description: 'Expert Unreal Engine 5 developer',
        keywords: ['unreal', 'ue5', 'game', 'blueprint', 'c++'],
        relatedAgents: [],
        priority: 70,
    },
    // Meta
    'meta-agent': {
        type: 'meta-agent',
        category: 'meta',
        description: 'Agent architect that generates new sub-agents',
        keywords: ['agent', 'create', 'generate'],
        relatedAgents: [],
        priority: 50,
    },
    'work-completion-summary': {
        type: 'work-completion-summary',
        category: 'meta',
        description: 'Provides audio summaries when work is completed',
        keywords: ['summary', 'tts', 'audio', 'complete'],
        relatedAgents: [],
        priority: 40,
    },
    'claude-code-guide': {
        type: 'claude-code-guide',
        category: 'meta',
        description: 'Answers questions about Claude Code features',
        keywords: ['help', 'guide', 'how to', 'documentation'],
        relatedAgents: [],
        priority: 50,
    },
    'statusline-setup': {
        type: 'statusline-setup',
        category: 'meta',
        description: 'Configures Claude Code status line',
        keywords: ['status', 'statusline', 'setup'],
        relatedAgents: [],
        priority: 30,
    },
};
/**
 * Analyze text and match to appropriate agents
 */
export function matchAgents(options) {
    const { text, maxAgents = 5, minScore = 20, categories = [], excludeAgents = [], includePmLead = true, } = options;
    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/);
    const matches = [];
    logger.debug(`Analyzing text for agent matching: "${text.substring(0, 100)}..."`);
    for (const agentType of AVAILABLE_AGENTS) {
        // Skip excluded agents
        if (excludeAgents.includes(agentType)) {
            continue;
        }
        const definition = AGENT_DEFINITIONS[agentType];
        // Filter by category if specified
        if (categories.length > 0 && !categories.includes(definition.category)) {
            continue;
        }
        // Calculate match score
        let score = 0;
        const matchedKeywords = [];
        for (const keyword of definition.keywords) {
            const keywordLower = keyword.toLowerCase();
            // Exact word match
            if (words.includes(keywordLower)) {
                score += 15;
                matchedKeywords.push(keyword);
            }
            // Substring match
            else if (lowerText.includes(keywordLower)) {
                score += 10;
                matchedKeywords.push(keyword);
            }
        }
        // Apply priority modifier
        if (score > 0) {
            score += definition.priority / 10;
        }
        // Only include if score meets threshold
        if (score >= minScore) {
            matches.push({
                agent: agentType,
                score,
                matchedKeywords,
                reason: `Matched keywords: ${matchedKeywords.join(', ')}`,
            });
        }
    }
    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);
    // Always include pm-lead at the top if requested
    if (includePmLead) {
        const pmLeadIndex = matches.findIndex(m => m.agent === 'pm-lead');
        if (pmLeadIndex > 0) {
            const pmLead = matches.splice(pmLeadIndex, 1)[0];
            matches.unshift(pmLead);
        }
        else if (pmLeadIndex === -1) {
            matches.unshift({
                agent: 'pm-lead',
                score: 100,
                matchedKeywords: ['project orchestration'],
                reason: 'Always included for project coordination',
            });
        }
    }
    // Limit results
    return matches.slice(0, maxAgents);
}
/**
 * Get agents for a specific category
 */
export function getAgentsByCategory(category) {
    return AVAILABLE_AGENTS.filter(agent => AGENT_DEFINITIONS[agent].category === category);
}
/**
 * Get related agents for a given agent
 */
export function getRelatedAgents(agent) {
    return AGENT_DEFINITIONS[agent]?.relatedAgents ?? [];
}
/**
 * Simple function to get recommended agents from a project description
 * (Used by kickoff-context.ts)
 */
export function getRecommendedAgents(projectDescription) {
    const matches = matchAgents({
        text: projectDescription,
        maxAgents: 8,
        minScore: 15,
        includePmLead: true,
    });
    // Also include test-engineer and docs-engineer by default
    const agents = matches.map(m => m.agent);
    if (!agents.includes('test-engineer')) {
        agents.push('test-engineer');
    }
    if (!agents.includes('docs-engineer')) {
        agents.push('docs-engineer');
    }
    return agents;
}
/**
 * Get agent definition
 */
export function getAgentDefinition(agent) {
    return AGENT_DEFINITIONS[agent];
}
//# sourceMappingURL=agent-matcher.js.map