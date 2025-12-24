/**
 * Agent Capability Mapping System
 *
 * Parses agent markdown files to extract capabilities, keywords,
 * and specializations for intelligent issue assignment.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { existsSync } from 'node:fs';
import type { AgentCapability, AgentCapabilityCache } from '../../types/github-automation.js';

/**
 * Default TTL for capability cache (5 minutes)
 */
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Keywords by agent specialization category
 */
const KEYWORD_PATTERNS: Record<string, string[]> = {
  frontend: [
    'react', 'vue', 'angular', 'nextjs', 'next.js', 'tailwind', 'css', 'html',
    'javascript', 'typescript', 'ui', 'ux', 'component', 'responsive', 'web',
    'browser', 'dom', 'spa', 'pwa', 'frontend', 'front-end', 'styling', 'animation'
  ],
  backend: [
    'api', 'rest', 'graphql', 'server', 'database', 'sql', 'nosql', 'mongodb',
    'postgresql', 'mysql', 'redis', 'cache', 'microservice', 'node', 'express',
    'fastify', 'backend', 'back-end', 'endpoint', 'authentication', 'authorization'
  ],
  security: [
    'security', 'auth', 'authentication', 'authorization', 'encryption', 'vulnerability',
    'xss', 'csrf', 'sql injection', 'penetration', 'compliance', 'audit', 'rbac',
    'oauth', 'jwt', 'token', 'password', 'mfa', 'firewall', 'ssl', 'tls', 'https'
  ],
  testing: [
    'test', 'testing', 'unit', 'integration', 'e2e', 'end-to-end', 'jest', 'vitest',
    'playwright', 'cypress', 'coverage', 'qa', 'quality', 'regression', 'automation'
  ],
  devops: [
    'devops', 'ci/cd', 'pipeline', 'docker', 'kubernetes', 'k8s', 'container',
    'deployment', 'infrastructure', 'terraform', 'ansible', 'aws', 'azure', 'gcp',
    'cloud', 'monitoring', 'logging', 'helm', 'jenkins', 'github actions'
  ],
  database: [
    'database', 'sql', 'nosql', 'schema', 'migration', 'query', 'optimization',
    'index', 'performance', 'postgresql', 'mysql', 'mongodb', 'redis', 'orm',
    'prisma', 'typeorm', 'drizzle', 'supabase'
  ],
  documentation: [
    'documentation', 'docs', 'readme', 'api docs', 'guide', 'tutorial', 'writing',
    'technical writing', 'markdown', 'jsdoc', 'typedoc'
  ],
  debugging: [
    'debug', 'debugging', 'error', 'bug', 'fix', 'issue', 'troubleshoot', 'trace',
    'stack trace', 'log', 'logging', 'root cause', 'analysis'
  ],
  mobile: [
    'mobile', 'react native', 'flutter', 'ios', 'android', 'app', 'native',
    'cross-platform', 'ionic', 'expo'
  ],
  integration: [
    'integration', 'api', 'webhook', 'third-party', 'oauth', 'sdk', 'external',
    'service', 'connector', 'sync'
  ],
  splunk: [
    'splunk', 'spl', 'dashboard', 'visualization', 'log analysis', 'siem',
    'monitoring', 'alerting', 'search', 'report'
  ],
  workflow: [
    'n8n', 'workflow', 'automation', 'zapier', 'trigger', 'action', 'node'
  ],
  ue5: [
    'unreal', 'ue5', 'blueprint', 'game', 'c++', 'rendering', 'animation', 'audio'
  ]
};

/**
 * Label to specialization mapping for label-based matching
 */
export const LABEL_SPECIALIZATION_MAP: Record<string, string[]> = {
  bug: ['debugging'],
  feature: ['frontend', 'backend'],
  security: ['security'],
  performance: ['devops', 'backend', 'database'],
  documentation: ['documentation'],
  'ui/ux': ['frontend'],
  api: ['backend', 'integration'],
  database: ['database'],
  testing: ['testing'],
  infrastructure: ['devops'],
  mobile: ['mobile']
};

/**
 * In-memory cache for agent capabilities
 */
let capabilityCache: AgentCapabilityCache | null = null;

/**
 * Parse YAML frontmatter from markdown content
 */
function parseFrontmatter(content: string): Record<string, string> | null {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch || !frontmatterMatch[1]) {
    return null;
  }

  const frontmatter: Record<string, string> = {};
  const lines = frontmatterMatch[1].split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      frontmatter[key] = value;
    }
  }

  return frontmatter;
}

/**
 * Extract keywords from text using pattern matching
 */
function extractKeywords(text: string): string[] {
  const normalizedText = text.toLowerCase();
  const foundKeywords = new Set<string>();

  // Check all pattern categories
  for (const patterns of Object.values(KEYWORD_PATTERNS)) {
    for (const pattern of patterns) {
      if (normalizedText.includes(pattern.toLowerCase())) {
        foundKeywords.add(pattern);
      }
    }
  }

  // Also extract capitalized words that might be technologies
  const techPatterns = /\b([A-Z][a-z]+(?:[A-Z][a-z]+)*|[A-Z]+(?:JS|CSS|API|UI|UX|DB|SQL))\b/g;
  const matches = text.match(techPatterns) || [];
  for (const match of matches) {
    foundKeywords.add(match.toLowerCase());
  }

  return Array.from(foundKeywords);
}

/**
 * Determine specializations from description and keywords
 */
function determineSpecializations(description: string, keywords: string[]): string[] {
  const specializations = new Set<string>();
  const normalizedDesc = description.toLowerCase();

  for (const [category, patterns] of Object.entries(KEYWORD_PATTERNS)) {
    // Check if any pattern matches in description
    for (const pattern of patterns) {
      if (normalizedDesc.includes(pattern.toLowerCase())) {
        specializations.add(category);
        break;
      }
    }

    // Check if any keyword matches patterns
    for (const keyword of keywords) {
      if (patterns.some((p) => p.toLowerCase() === keyword.toLowerCase())) {
        specializations.add(category);
        break;
      }
    }
  }

  return Array.from(specializations);
}

/**
 * Parse a single agent markdown file
 */
async function parseAgentFile(filePath: string): Promise<AgentCapability | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const frontmatter = parseFrontmatter(content);

    if (!frontmatter || !frontmatter.name) {
      return null;
    }

    const description = frontmatter.description || '';
    const toolsStr = frontmatter.tools || '';
    const tools = toolsStr.split(',').map((t) => t.trim()).filter(Boolean);

    // Extract keywords from description
    const keywords = extractKeywords(description);

    // Also add tools as potential keywords (simplified)
    for (const tool of tools) {
      const simpleTool = tool.replace(/^mcp__[^_]+__/, '').toLowerCase();
      if (simpleTool.length > 2) {
        keywords.push(simpleTool);
      }
    }

    // Determine specializations
    const specializations = determineSpecializations(description, keywords);

    return {
      name: frontmatter.name,
      description,
      tools,
      keywords: [...new Set(keywords)],
      specializations,
      sourcePath: filePath
    };
  } catch (error) {
    console.error(`Error parsing agent file ${filePath}:`, error);
    return null;
  }
}

/**
 * Get the agents directory path
 */
export function getAgentsDirectory(): string {
  const projectRoot = process.cwd();

  // Check for agents/core directory (new structure)
  const coreAgentsPath = path.join(projectRoot, 'agents', 'core');
  if (existsSync(coreAgentsPath)) {
    return coreAgentsPath;
  }

  // Fallback to agents directory
  const agentsPath = path.join(projectRoot, 'agents');
  if (existsSync(agentsPath)) {
    return agentsPath;
  }

  // Last resort: templates/agents (NPM package fallback)
  return path.join(projectRoot, 'templates', 'agents');
}

/**
 * Load all agent capabilities from markdown files
 */
export async function loadAgentCapabilities(
  agentsDir?: string,
  forceReload = false
): Promise<Map<string, AgentCapability>> {
  // Check cache
  if (!forceReload && capabilityCache) {
    const now = Date.now();
    const cacheAge = now - new Date(capabilityCache.loadedAt).getTime();
    if (cacheAge < capabilityCache.ttlMs) {
      return capabilityCache.capabilities;
    }
  }

  const capabilities = new Map<string, AgentCapability>();
  const dir = agentsDir || getAgentsDirectory();

  try {
    if (!existsSync(dir)) {
      console.warn(`Agents directory not found: ${dir}`);
      return capabilities;
    }

    const files = await fs.readdir(dir);
    const mdFiles = files.filter((f) => f.endsWith('.md'));

    const parsePromises = mdFiles.map(async (file) => {
      const filePath = path.join(dir, file);
      return parseAgentFile(filePath);
    });

    const results = await Promise.all(parsePromises);

    for (const capability of results) {
      if (capability) {
        capabilities.set(capability.name, capability);
      }
    }

    // Update cache
    capabilityCache = {
      capabilities,
      loadedAt: new Date().toISOString(),
      ttlMs: DEFAULT_CACHE_TTL_MS
    };

    return capabilities;
  } catch (error) {
    console.error('Error loading agent capabilities:', error);
    return capabilities;
  }
}

/**
 * Get capability for a specific agent
 */
export async function getAgentCapability(
  agentName: string,
  agentsDir?: string
): Promise<AgentCapability | null> {
  const capabilities = await loadAgentCapabilities(agentsDir);
  return capabilities.get(agentName) || null;
}

/**
 * Find agents matching given keywords
 */
export async function findAgentsByKeywords(
  keywords: string[],
  agentsDir?: string
): Promise<Map<string, number>> {
  const capabilities = await loadAgentCapabilities(agentsDir);
  const scores = new Map<string, number>();
  const normalizedKeywords = keywords.map((k) => k.toLowerCase());

  for (const [name, capability] of capabilities) {
    let score = 0;

    // Check keyword matches
    for (const keyword of normalizedKeywords) {
      if (capability.keywords.some((k) => k.toLowerCase().includes(keyword))) {
        score += 1;
      }
      // Bonus for exact matches
      if (capability.keywords.some((k) => k.toLowerCase() === keyword)) {
        score += 0.5;
      }
    }

    // Check description matches
    const normalizedDesc = capability.description.toLowerCase();
    for (const keyword of normalizedKeywords) {
      if (normalizedDesc.includes(keyword)) {
        score += 0.5;
      }
    }

    if (score > 0) {
      scores.set(name, score);
    }
  }

  return scores;
}

/**
 * Find agents by specialization
 */
export async function findAgentsBySpecialization(
  specialization: string,
  agentsDir?: string
): Promise<AgentCapability[]> {
  const capabilities = await loadAgentCapabilities(agentsDir);
  const matches: AgentCapability[] = [];
  const normalizedSpec = specialization.toLowerCase();

  for (const capability of capabilities.values()) {
    if (capability.specializations.some((s) => s.toLowerCase() === normalizedSpec)) {
      matches.push(capability);
    }
  }

  return matches;
}

/**
 * Get all available agent names
 */
export async function getAvailableAgents(agentsDir?: string): Promise<string[]> {
  const capabilities = await loadAgentCapabilities(agentsDir);
  return Array.from(capabilities.keys());
}

/**
 * Invalidate the capability cache
 */
export function invalidateCapabilityCache(): void {
  capabilityCache = null;
}

/**
 * Build a capability map for quick lookups
 */
export async function buildCapabilityMap(
  agentsDir?: string
): Promise<Record<string, AgentCapability>> {
  const capabilities = await loadAgentCapabilities(agentsDir);
  const map: Record<string, AgentCapability> = {};

  for (const [name, capability] of capabilities) {
    map[name] = capability;
  }

  return map;
}
