/**
 * Issue Content Analyzer
 *
 * Analyzes GitHub issue content to extract keywords, determine relevance,
 * and score agent matches for intelligent assignment.
 */
import { loadAgentCapabilities, LABEL_SPECIALIZATION_MAP, } from './agent-capabilities.js';
/**
 * Common stop words to filter out from keyword extraction
 */
const STOP_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
    'she', 'we', 'they', 'what', 'which', 'who', 'whom', 'when', 'where',
    'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
    'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
    'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there',
    'if', 'then', 'else', 'while', 'about', 'after', 'before', 'above',
    'below', 'between', 'into', 'through', 'during', 'until', 'against',
    'among', 'throughout', 'despite', 'towards', 'upon', 'concerning', 'over',
    'issue', 'bug', 'feature', 'request', 'problem', 'please', 'thanks',
    'thank', 'help', 'want', 'need', 'like', 'get', 'make', 'use', 'using',
    'work', 'working', 'doesn', 'don', 'isn', 'aren', 'wasn', 'weren',
    'hasn', 'haven', 'hadn', 'won', 'wouldn', 'couldn', 'shouldn', 'can',
]);
/**
 * Technology keywords with their associated categories
 */
const TECH_KEYWORDS = {
    // Frontend
    react: ['frontend', 'ui'],
    vue: ['frontend', 'ui'],
    angular: ['frontend', 'ui'],
    nextjs: ['frontend', 'ui'],
    'next.js': ['frontend', 'ui'],
    tailwind: ['frontend', 'styling'],
    css: ['frontend', 'styling'],
    scss: ['frontend', 'styling'],
    sass: ['frontend', 'styling'],
    html: ['frontend', 'ui'],
    javascript: ['frontend', 'backend'],
    typescript: ['frontend', 'backend'],
    component: ['frontend', 'ui'],
    responsive: ['frontend', 'ui'],
    animation: ['frontend', 'ui'],
    // Backend
    api: ['backend', 'integration'],
    rest: ['backend', 'api'],
    graphql: ['backend', 'api'],
    server: ['backend'],
    endpoint: ['backend', 'api'],
    node: ['backend'],
    express: ['backend'],
    fastify: ['backend'],
    microservice: ['backend'],
    // Database
    database: ['database', 'backend'],
    sql: ['database'],
    nosql: ['database'],
    mongodb: ['database'],
    postgresql: ['database'],
    postgres: ['database'],
    mysql: ['database'],
    redis: ['database', 'cache'],
    supabase: ['database', 'backend'],
    prisma: ['database'],
    drizzle: ['database'],
    // Security
    security: ['security'],
    auth: ['security', 'backend'],
    authentication: ['security', 'backend'],
    authorization: ['security', 'backend'],
    oauth: ['security', 'integration'],
    jwt: ['security', 'backend'],
    encryption: ['security'],
    vulnerability: ['security'],
    xss: ['security'],
    csrf: ['security'],
    'sql injection': ['security'],
    // Testing
    test: ['testing'],
    testing: ['testing'],
    jest: ['testing'],
    vitest: ['testing'],
    playwright: ['testing'],
    cypress: ['testing'],
    coverage: ['testing'],
    e2e: ['testing'],
    'end-to-end': ['testing'],
    unit: ['testing'],
    integration: ['testing', 'integration'],
    // DevOps
    docker: ['devops'],
    kubernetes: ['devops'],
    k8s: ['devops'],
    ci: ['devops'],
    cd: ['devops'],
    'ci/cd': ['devops'],
    pipeline: ['devops'],
    deployment: ['devops'],
    terraform: ['devops'],
    ansible: ['devops'],
    aws: ['devops', 'cloud'],
    azure: ['devops', 'cloud'],
    gcp: ['devops', 'cloud'],
    // Mobile
    mobile: ['mobile'],
    'react native': ['mobile'],
    flutter: ['mobile'],
    ios: ['mobile'],
    android: ['mobile'],
    expo: ['mobile'],
    // Splunk
    splunk: ['splunk'],
    spl: ['splunk'],
    dashboard: ['splunk', 'frontend'],
    // Workflow
    n8n: ['workflow'],
    workflow: ['workflow'],
    automation: ['workflow', 'devops'],
    // UE5
    unreal: ['ue5'],
    ue5: ['ue5'],
    blueprint: ['ue5'],
};
/**
 * Extract keywords from text using tokenization and filtering
 */
export function extractKeywords(text) {
    if (!text)
        return [];
    const normalizedText = text.toLowerCase();
    const keywords = new Set();
    // Extract technology keywords first (multi-word patterns)
    for (const keyword of Object.keys(TECH_KEYWORDS)) {
        if (normalizedText.includes(keyword.toLowerCase())) {
            keywords.add(keyword);
        }
    }
    // Tokenize and extract single words
    const words = normalizedText
        .replace(/[^\w\s-]/g, ' ') // Replace non-word chars with spaces
        .split(/\s+/)
        .filter((word) => {
        // Filter out stop words and short words
        return (word.length > 2 &&
            !STOP_WORDS.has(word) &&
            !/^\d+$/.test(word) // Filter pure numbers
        );
    });
    for (const word of words) {
        keywords.add(word);
    }
    // Extract camelCase and PascalCase terms
    const camelCaseMatches = text.match(/[a-z]+[A-Z][a-zA-Z]*/g) || [];
    for (const match of camelCaseMatches) {
        keywords.add(match.toLowerCase());
    }
    // Extract code-related patterns (function names, file paths, etc.)
    const codePatterns = text.match(/[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z]+)?/g) || [];
    for (const pattern of codePatterns) {
        if (pattern.length > 3 && !STOP_WORDS.has(pattern.toLowerCase())) {
            keywords.add(pattern.toLowerCase());
        }
    }
    return Array.from(keywords);
}
/**
 * Extract keywords from issue labels
 */
export function extractLabelKeywords(labels) {
    const keywords = [];
    for (const label of labels) {
        const labelName = label.name.toLowerCase();
        keywords.push(labelName);
        // Check if label maps to specializations
        const specializations = LABEL_SPECIALIZATION_MAP[labelName];
        if (specializations) {
            keywords.push(...specializations);
        }
    }
    return keywords;
}
/**
 * Calculate confidence level from score
 */
function calculateConfidence(score) {
    if (score >= 70)
        return 'high';
    if (score >= 40)
        return 'medium';
    return 'low';
}
/**
 * Generate match reason from matched keywords
 */
function generateMatchReason(_agentName, matchedKeywords, capability) {
    const keywordStr = matchedKeywords.slice(0, 5).join(', ');
    const specStr = capability.specializations.slice(0, 3).join(', ');
    if (matchedKeywords.length > 0) {
        return `Matched keywords: ${keywordStr}. Specializations: ${specStr || 'general'}`;
    }
    return `Agent specializes in: ${specStr || 'general development'}`;
}
/**
 * Score an agent against issue keywords
 */
async function scoreAgent(capability, issueKeywords, labelKeywords) {
    const matchedKeywords = new Set();
    let score = 0;
    const allKeywords = [...issueKeywords, ...labelKeywords];
    const normalizedIssueKeywords = allKeywords.map((k) => k.toLowerCase());
    // Score based on agent keyword matches
    for (const keyword of normalizedIssueKeywords) {
        // Check agent keywords
        for (const agentKeyword of capability.keywords) {
            if (agentKeyword.toLowerCase().includes(keyword) ||
                keyword.includes(agentKeyword.toLowerCase())) {
                matchedKeywords.add(keyword);
                score += 10;
            }
        }
        // Check agent description
        if (capability.description.toLowerCase().includes(keyword)) {
            matchedKeywords.add(keyword);
            score += 5;
        }
        // Check technology keywords for specialization matching
        const techCategories = TECH_KEYWORDS[keyword];
        if (techCategories) {
            for (const category of techCategories) {
                if (capability.specializations.includes(category)) {
                    matchedKeywords.add(keyword);
                    score += 15;
                }
            }
        }
    }
    // Bonus for label-based specialization matches
    for (const labelKeyword of labelKeywords) {
        if (capability.specializations.some((s) => s.toLowerCase() === labelKeyword.toLowerCase())) {
            matchedKeywords.add(labelKeyword);
            score += 20;
        }
    }
    // Normalize score to 0-100 range
    const normalizedScore = Math.min(100, score);
    return {
        score: normalizedScore,
        matchedKeywords: Array.from(matchedKeywords),
    };
}
/**
 * Analyze a GitHub issue and find matching agents
 */
export async function analyzeIssue(issue, agentsDir) {
    // Load agent capabilities
    const capabilities = await loadAgentCapabilities(agentsDir);
    // Extract keywords from issue
    const titleKeywords = extractKeywords(issue.title);
    const bodyKeywords = extractKeywords(issue.body || '');
    const labelKeywords = extractLabelKeywords(issue.labels);
    const allKeywords = [...new Set([...titleKeywords, ...bodyKeywords])];
    // Score each agent
    const agentScores = [];
    for (const [agentName, capability] of capabilities) {
        const { score, matchedKeywords } = await scoreAgent(capability, allKeywords, labelKeywords);
        if (score > 0) {
            agentScores.push({
                agentName,
                score,
                matchedKeywords,
                confidence: calculateConfidence(score),
                matchReason: generateMatchReason(agentName, matchedKeywords, capability),
            });
        }
    }
    // Sort by score descending
    agentScores.sort((a, b) => b.score - a.score);
    // Suggest labels based on detected specializations
    const suggestedLabels = suggestLabels(allKeywords, labelKeywords);
    return {
        issue,
        extractedKeywords: allKeywords,
        agentMatches: agentScores,
        suggestedLabels,
        analyzedAt: new Date().toISOString(),
    };
}
/**
 * Suggest labels based on keywords
 */
function suggestLabels(keywords, existingLabels) {
    const suggested = new Set();
    const existingSet = new Set(existingLabels.map((l) => l.toLowerCase()));
    for (const keyword of keywords) {
        const techCategories = TECH_KEYWORDS[keyword.toLowerCase()];
        if (techCategories) {
            for (const category of techCategories) {
                // Map categories to common GitHub labels
                const labelMap = {
                    frontend: 'ui/ux',
                    backend: 'api',
                    database: 'database',
                    security: 'security',
                    testing: 'testing',
                    devops: 'infrastructure',
                    mobile: 'mobile',
                    splunk: 'splunk',
                    workflow: 'automation',
                    ue5: 'gamedev',
                };
                const label = labelMap[category];
                if (label && !existingSet.has(label)) {
                    suggested.add(label);
                }
            }
        }
    }
    // Add priority suggestions based on keywords
    if (keywords.some((k) => ['critical', 'urgent', 'asap', 'blocker'].includes(k.toLowerCase()))) {
        suggested.add('priority:high');
    }
    if (keywords.some((k) => ['crash', 'error', 'broken', 'fail'].includes(k.toLowerCase()))) {
        suggested.add('bug');
    }
    if (keywords.some((k) => ['add', 'new', 'implement', 'create'].includes(k.toLowerCase()))) {
        suggested.add('enhancement');
    }
    return Array.from(suggested);
}
/**
 * Get the best matching agent for an issue
 */
export async function getBestMatch(issue, confidenceThreshold = 30, agentsDir) {
    const analysis = await analyzeIssue(issue, agentsDir);
    if (analysis.agentMatches.length === 0) {
        return null;
    }
    const bestMatch = analysis.agentMatches[0];
    if (!bestMatch || bestMatch.score < confidenceThreshold) {
        return null;
    }
    return bestMatch;
}
/**
 * Get multiple matching agents above threshold
 */
export async function getTopMatches(issue, maxMatches = 3, confidenceThreshold = 30, agentsDir) {
    const analysis = await analyzeIssue(issue, agentsDir);
    return analysis.agentMatches
        .filter((match) => match.score >= confidenceThreshold)
        .slice(0, maxMatches);
}
/**
 * Batch analyze multiple issues
 */
export async function analyzeIssues(issues, agentsDir) {
    const results = [];
    for (const issue of issues) {
        const analysis = await analyzeIssue(issue, agentsDir);
        results.push(analysis);
    }
    return results;
}
/**
 * Quick keyword extraction for issue preview
 */
export function extractIssueKeywords(issue) {
    const titleKeywords = extractKeywords(issue.title);
    const bodyKeywords = extractKeywords(issue.body || '');
    const labelKeywords = extractLabelKeywords(issue.labels);
    return [...new Set([...titleKeywords, ...bodyKeywords, ...labelKeywords])];
}
//# sourceMappingURL=issue-analyzer.js.map