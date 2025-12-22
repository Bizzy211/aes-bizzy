/**
 * PRD Generator Module
 *
 * Generates Product Requirements Documents from user prompts and research data.
 * Uses templates based on detected project types and fills them with
 * research-backed content.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { existsSync } from 'node:fs';
import type {
  BrandingResult,
  TechnicalDocsResult,
  CodeContextResult,
} from './research-orchestrator.js';

// ============================================================================
// Type Definitions
// ============================================================================

export type ProjectType =
  | 'web-app'
  | 'dashboard'
  | 'api-service'
  | 'mobile-app'
  | 'fullstack'
  | 'cli-tool'
  | 'unknown';

export type RequirementPriority = 'critical' | 'high' | 'medium' | 'low';

export type RequirementCategory = 'functional' | 'non-functional' | 'technical' | 'design';

export interface DetectedRequirement {
  description: string;
  priority: RequirementPriority;
  category: RequirementCategory;
  keywords: string[];
}

export interface PRDTemplate {
  name: string;
  projectType: ProjectType;
  templatePath: string;
  sections: string[];
}

export interface ResearchData {
  branding?: BrandingResult;
  technicalDocs?: TechnicalDocsResult;
  codeContext?: CodeContextResult;
}

export interface PRDGenerationOptions {
  userPrompt: string;
  projectName?: string;
  projectType?: ProjectType;
  templatePath?: string;
  researchData?: ResearchData;
  outputPath?: string;
}

export interface GeneratedPRD {
  content: string;
  projectType: ProjectType;
  projectName: string;
  requirements: DetectedRequirement[];
  techStack: string[];
  filePath: string;
}

// ============================================================================
// Error Classes
// ============================================================================

export class PRDGenerationError extends Error {
  constructor(
    message: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'PRDGenerationError';
  }
}

// ============================================================================
// Constants
// ============================================================================

const TEMPLATE_DIR = '.taskmaster/templates';

/**
 * Keywords for detecting project types
 */
const PROJECT_TYPE_PATTERNS: Record<Exclude<ProjectType, 'unknown'>, string[]> = {
  dashboard: [
    'dashboard',
    'admin panel',
    'analytics',
    'metrics',
    'charts',
    'reporting',
    'monitoring',
    'visualization',
    'data viz',
    'splunk',
  ],
  'api-service': [
    'api',
    'rest',
    'graphql',
    'backend',
    'microservice',
    'endpoint',
    'server',
    'webhook',
    'service',
  ],
  'mobile-app': [
    'mobile',
    'ios',
    'android',
    'react native',
    'flutter',
    'app store',
    'play store',
    'native app',
    'expo',
  ],
  'web-app': [
    'web app',
    'website',
    'frontend',
    'react',
    'vue',
    'angular',
    'nextjs',
    'next.js',
    'nuxt',
    'svelte',
    'web application',
  ],
  fullstack: [
    'fullstack',
    'full-stack',
    'full stack',
    'end-to-end',
    'frontend and backend',
    'complete application',
  ],
  'cli-tool': ['cli', 'command line', 'terminal', 'console', 'shell', 'npm package', 'binary'],
};

/**
 * Keywords for detecting requirement priorities
 */
const PRIORITY_PATTERNS: Record<RequirementPriority, string[]> = {
  critical: ['must', 'required', 'critical', 'essential', 'need to', 'mandatory', 'core'],
  high: ['should', 'important', 'priority', 'key feature', 'main', 'primary'],
  medium: ['would like', 'could', 'nice to have', 'consider', 'want'],
  low: ['maybe', 'optional', 'future', 'eventually', 'if time', 'bonus'],
};

/**
 * Keywords for detecting requirement categories
 */
const CATEGORY_PATTERNS: Record<RequirementCategory, string[]> = {
  functional: ['user can', 'allow', 'enable', 'feature', 'functionality', 'action', 'workflow'],
  'non-functional': [
    'performance',
    'scalability',
    'security',
    'reliability',
    'availability',
    'latency',
    'authentication',
    'oauth',
    'rate limit',
    'validation',
    'encryption',
    'ssl',
    'https',
  ],
  technical: [
    'database',
    'api',
    'framework',
    'library',
    'architecture',
    'integration',
    'deployment',
  ],
  design: ['ui', 'ux', 'interface', 'design', 'layout', 'styling', 'theme'],
};

/**
 * Common technology keywords
 */
const TECH_KEYWORDS = [
  // Frontend frameworks
  'react',
  'vue',
  'angular',
  'nextjs',
  'next.js',
  'nuxt',
  'svelte',
  'solid',
  'qwik',
  // Backend frameworks
  'node',
  'express',
  'fastify',
  'nestjs',
  'koa',
  'hono',
  'django',
  'flask',
  'fastapi',
  'rails',
  'spring',
  // Databases
  'postgresql',
  'postgres',
  'mysql',
  'mongodb',
  'redis',
  'supabase',
  'firebase',
  'prisma',
  'drizzle',
  // Languages
  'typescript',
  'javascript',
  'python',
  'go',
  'rust',
  'java',
  'kotlin',
  'swift',
  // Styling
  'tailwind',
  'tailwindcss',
  'bootstrap',
  'material-ui',
  'mui',
  'chakra',
  'styled-components',
  'css modules',
  // Mobile
  'react native',
  'flutter',
  'expo',
  'ionic',
  // DevOps
  'docker',
  'kubernetes',
  'aws',
  'azure',
  'gcp',
  'vercel',
  'netlify',
  // Other
  'graphql',
  'rest',
  'websocket',
  'socket.io',
  'stripe',
  'auth0',
  'clerk',
];

/**
 * Common words to filter from keywords
 */
const COMMON_WORDS = new Set([
  'that',
  'this',
  'with',
  'have',
  'from',
  'they',
  'been',
  'will',
  'would',
  'could',
  'should',
  'also',
  'just',
  'more',
  'some',
  'very',
  'like',
  'into',
  'only',
  'other',
  'such',
  'than',
  'then',
  'there',
  'these',
  'well',
  'about',
  'after',
  'before',
  'being',
  'between',
  'both',
  'each',
  'first',
  'last',
  'many',
  'much',
  'over',
  'same',
  'through',
  'under',
  'where',
  'while',
  'which',
  'even',
  'because',
  'against',
  'during',
  'without',
  'however',
  'therefore',
  'although',
  'whether',
  'either',
  'neither',
  'create',
  'build',
  'make',
  'using',
  'want',
  'need',
]);

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Detect project type from user prompt
 *
 * @param userPrompt - The user's project description
 * @returns Detected project type
 */
export function detectProjectType(userPrompt: string): ProjectType {
  const prompt = userPrompt.toLowerCase();

  // Score each project type
  const scores: Record<string, number> = {};

  for (const [type, keywords] of Object.entries(PROJECT_TYPE_PATTERNS)) {
    scores[type] = keywords.filter((kw) => prompt.includes(kw.toLowerCase())).length;
  }

  // Special handling: "mobile responsive" is a web design term, not a mobile app
  // Only count 'mobile' for mobile-app if not followed by 'responsive'
  if (prompt.includes('mobile responsive') || prompt.includes('responsive design')) {
    scores['mobile-app'] = Math.max(0, (scores['mobile-app'] || 0) - 1);
  }

  // Boost web-app if 'website' is explicitly mentioned (strong signal)
  if (prompt.includes('website') || prompt.includes('web site')) {
    scores['web-app'] = (scores['web-app'] || 0) + 2;
  }

  // Find highest scoring type
  const entries = Object.entries(scores);
  entries.sort(([, a], [, b]) => b - a);

  const topEntry = entries[0];
  if (topEntry && topEntry[1] > 0) {
    return topEntry[0] as ProjectType;
  }

  // Default to web-app for general web-related terms
  if (prompt.includes('web') || prompt.includes('site') || prompt.includes('page')) {
    return 'web-app';
  }

  return 'unknown';
}

/**
 * Extract project name from user prompt
 *
 * @param userPrompt - The user's project description
 * @returns Extracted or generated project name
 */
export function extractProjectName(userPrompt: string): string {
  // Look for quoted strings first
  const quotedMatch = userPrompt.match(/["']([^"']+)["']/);
  if (quotedMatch && quotedMatch[1]) {
    return quotedMatch[1];
  }

  // Look for "called X" or "named X" patterns
  const namedMatch = userPrompt.match(/(?:called|named)\s+([A-Z][a-zA-Z0-9\s]+)/);
  if (namedMatch && namedMatch[1]) {
    return namedMatch[1].trim();
  }

  // Look for capitalized phrases (potential project names)
  const capitalizedMatch = userPrompt.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/);
  if (capitalizedMatch && capitalizedMatch[1]) {
    return capitalizedMatch[1];
  }

  // Extract key noun phrases
  const words = userPrompt.split(/\s+/);
  const keyWords = words
    .filter((w) => w.length > 3 && !COMMON_WORDS.has(w.toLowerCase()))
    .slice(0, 3);

  if (keyWords.length > 0) {
    return keyWords
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')
      .replace(/[^a-zA-Z0-9\s]/g, '');
  }

  return 'New Project';
}

/**
 * Extract requirements from user prompt
 *
 * @param userPrompt - The user's project description
 * @param projectType - The detected project type
 * @returns Array of detected requirements sorted by priority
 */
export function extractRequirements(
  userPrompt: string,
  _projectType: ProjectType
): DetectedRequirement[] {
  const requirements: DetectedRequirement[] = [];

  // Split into sentences
  const sentences = userPrompt
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();

    // Determine priority
    let priority: RequirementPriority = 'medium';
    for (const [p, patterns] of Object.entries(PRIORITY_PATTERNS)) {
      if (patterns.some((pattern) => lower.includes(pattern))) {
        priority = p as RequirementPriority;
        break;
      }
    }

    // Determine category
    let category: RequirementCategory = 'functional';
    for (const [c, patterns] of Object.entries(CATEGORY_PATTERNS)) {
      if (patterns.some((pattern) => lower.includes(pattern))) {
        category = c as RequirementCategory;
        break;
      }
    }

    // Extract keywords (words 4+ chars, not common words)
    const keywords = (lower.match(/\b\w{4,}\b/g) || []).filter((w) => !COMMON_WORDS.has(w));

    requirements.push({
      description: sentence.trim(),
      priority,
      category,
      keywords: [...new Set(keywords)],
    });
  }

  // Sort by priority (critical > high > medium > low)
  const priorityOrder: Record<RequirementPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return requirements.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

/**
 * Normalize technology name for consistent matching
 */
function normalizeTechName(tech: string): string {
  // Common normalizations
  const normalizations: Record<string, string> = {
    'next.js': 'nextjs',
    'vue.js': 'vuejs',
    'node.js': 'nodejs',
    'nest.js': 'nestjs',
    'nuxt.js': 'nuxtjs',
    'react native': 'react-native',
    'tailwind css': 'tailwindcss',
    'material-ui': 'mui',
    'styled-components': 'styled-components',
    'css modules': 'css-modules',
    'socket.io': 'socketio',
  };

  const lower = tech.toLowerCase();
  return normalizations[lower] || lower;
}

/**
 * Extract tech stack from user prompt and research data
 *
 * @param prompt - The user's project description
 * @param researchData - Optional research data
 * @returns Array of detected technologies
 */
export function extractTechStack(prompt: string, researchData?: ResearchData): string[] {
  const stack = new Set<string>();
  const lower = prompt.toLowerCase();

  // Check for known technologies
  for (const tech of TECH_KEYWORDS) {
    if (lower.includes(tech.toLowerCase())) {
      // Normalize tech names for consistency
      const normalized = normalizeTechName(tech);
      stack.add(normalized);
    }
  }

  // Add from research data if available
  if (researchData?.codeContext?.libraries) {
    for (const lib of researchData.codeContext.libraries) {
      stack.add(lib);
    }
  }

  // Add from technical docs
  if (researchData?.technicalDocs?.apiReferences) {
    for (const ref of researchData.technicalDocs.apiReferences) {
      // Extract library name from reference
      const nameMatch = ref.name.match(/^([a-zA-Z0-9-_]+)/);
      if (nameMatch && nameMatch[1]) {
        stack.add(nameMatch[1].toLowerCase());
      }
    }
  }

  return [...stack];
}

/**
 * Load a PRD template
 *
 * @param projectType - The project type to load template for
 * @param templatePath - Optional custom template path
 * @returns Template content
 */
export async function loadTemplate(projectType: ProjectType, templatePath?: string): Promise<string> {
  // Use custom template if provided
  if (templatePath) {
    try {
      return await fs.readFile(templatePath, 'utf-8');
    } catch (error) {
      throw new PRDGenerationError(
        `Failed to load custom template from ${templatePath}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  // Template mapping
  const templateMap: Record<ProjectType, string> = {
    'web-app': 'prd-web-app.md',
    dashboard: 'prd-dashboard.md',
    'api-service': 'prd-api-service.md',
    'mobile-app': 'prd-mobile-app.md',
    fullstack: 'prd-fullstack.md',
    'cli-tool': 'prd-cli-tool.md',
    unknown: 'prd-default.md',
  };

  const templateFile = templateMap[projectType];
  const fullPath = path.join(TEMPLATE_DIR, templateFile);

  try {
    if (existsSync(fullPath)) {
      const content = await fs.readFile(fullPath, 'utf-8');
      // Verify it's a proper template with placeholders
      if (content.includes('{{PROJECT_NAME}}')) {
        return content;
      }
    }
  } catch {
    // Fall through to default template
  }

  // Return default inline template (always has placeholders)
  return getDefaultTemplate(projectType);
}

/**
 * Get default inline template
 */
function getDefaultTemplate(_projectType: ProjectType): string {
  return `# {{PROJECT_NAME}} - Product Requirements Document

## Overview

**Project Type:** {{PROJECT_TYPE}}
**Generated:** {{TIMESTAMP}}

### Vision
{{USER_PROMPT}}

## Technical Stack

{{TECH_STACK}}

## Requirements

### Critical (P0)
{{REQUIREMENTS_CRITICAL}}

### High Priority (P1)
{{REQUIREMENTS_HIGH}}

### Medium Priority (P2)
{{REQUIREMENTS_MEDIUM}}

### Low Priority (P3)
{{REQUIREMENTS_LOW}}

## Design Guidelines

{{BRANDING_GUIDELINES}}

## Technical Documentation

{{TECHNICAL_DOCS}}

## Code References

{{CODE_EXAMPLES}}

---
*Generated by Bizzy - JHC Agentic EcoSystem*
`;
}

/**
 * Format requirements by priority for template
 */
function formatRequirementsByPriority(
  requirements: DetectedRequirement[],
  priority: RequirementPriority
): string {
  const filtered = requirements.filter((r) => r.priority === priority);

  if (filtered.length === 0) {
    return '- None specified\n';
  }

  return filtered.map((r, i) => `${i + 1}. ${r.description} [${r.category}]`).join('\n');
}

/**
 * Format branding guidelines from research
 */
function formatBrandingGuidelines(branding?: BrandingResult): string {
  if (!branding) {
    return 'No branding research available. Consider defining:\n- Primary and secondary colors\n- Typography choices\n- Visual style guidelines';
  }

  const lines: string[] = [];

  if (branding.colorSchemes.length > 0) {
    lines.push(`**Colors:** ${branding.colorSchemes.slice(0, 5).join(', ')}`);
  }

  if (branding.typographyGuidelines.length > 0) {
    lines.push(`**Typography:** ${branding.typographyGuidelines.slice(0, 3).join(', ')}`);
  }

  if (branding.brandGuidelines.length > 0) {
    lines.push('\n**Reference Materials:**');
    for (const guide of branding.brandGuidelines.slice(0, 3)) {
      lines.push(`- [${guide.title}](${guide.url})`);
    }
  }

  return lines.length > 0 ? lines.join('\n') : 'No specific branding guidelines found.';
}

/**
 * Format technical documentation from research
 */
function formatTechnicalDocs(docs?: TechnicalDocsResult): string {
  if (!docs) {
    return 'No technical documentation research available.';
  }

  const lines: string[] = [];

  if (docs.officialDocs.length > 0) {
    lines.push('**Official Documentation:**');
    for (const doc of docs.officialDocs.slice(0, 5)) {
      lines.push(`- [${doc.title}](${doc.url})`);
    }
  }

  if (docs.apiReferences.length > 0) {
    lines.push('\n**API References:**');
    for (const ref of docs.apiReferences.slice(0, 3)) {
      lines.push(`- ${ref.name}: ${ref.description.substring(0, 100)}...`);
    }
  }

  if (docs.configurationExamples.length > 0) {
    lines.push('\n**Configuration Examples:**');
    lines.push('```');
    lines.push(docs.configurationExamples[0]?.substring(0, 200) || '');
    lines.push('```');
  }

  return lines.length > 0 ? lines.join('\n') : 'No documentation found.';
}

/**
 * Format code context from research
 */
function formatCodeContext(context?: CodeContextResult): string {
  if (!context) {
    return 'No code context available.';
  }

  const lines: string[] = [];

  if (context.examples.length > 0) {
    lines.push(`Found ${context.examples.length} relevant code examples.`);
  }

  if (context.patterns.length > 0) {
    lines.push('\n**Patterns:**');
    for (const pattern of context.patterns.slice(0, 5)) {
      lines.push(`- ${pattern}`);
    }
  }

  if (context.bestPractices.length > 0) {
    lines.push('\n**Best Practices:**');
    for (const practice of context.bestPractices.slice(0, 5)) {
      lines.push(`- ${practice}`);
    }
  }

  if (context.libraries.length > 0) {
    lines.push(`\n**Recommended Libraries:** ${context.libraries.slice(0, 10).join(', ')}`);
  }

  return lines.length > 0 ? lines.join('\n') : 'No code context found.';
}

/**
 * Fill template with data
 *
 * @param template - Template content with placeholders
 * @param options - Generation options
 * @param requirements - Extracted requirements
 * @param techStack - Extracted tech stack
 * @returns Filled template content
 */
export function fillTemplate(
  template: string,
  options: PRDGenerationOptions,
  requirements: DetectedRequirement[],
  techStack: string[]
): string {
  let filled = template;
  const { userPrompt, projectName, projectType, researchData } = options;

  // Build replacements map
  const replacements: Record<string, string> = {
    '{{PROJECT_NAME}}': projectName || extractProjectName(userPrompt),
    '{{PROJECT_TYPE}}': projectType || 'web-app',
    '{{USER_PROMPT}}': userPrompt,
    '{{TECH_STACK}}':
      techStack.length > 0 ? techStack.map((t) => `- ${t}`).join('\n') : '- To be determined',
    '{{REQUIREMENTS_CRITICAL}}': formatRequirementsByPriority(requirements, 'critical'),
    '{{REQUIREMENTS_HIGH}}': formatRequirementsByPriority(requirements, 'high'),
    '{{REQUIREMENTS_MEDIUM}}': formatRequirementsByPriority(requirements, 'medium'),
    '{{REQUIREMENTS_LOW}}': formatRequirementsByPriority(requirements, 'low'),
    '{{BRANDING_GUIDELINES}}': formatBrandingGuidelines(researchData?.branding),
    '{{TECHNICAL_DOCS}}': formatTechnicalDocs(researchData?.technicalDocs),
    '{{CODE_EXAMPLES}}': formatCodeContext(researchData?.codeContext),
    '{{TIMESTAMP}}': new Date().toISOString(),
  };

  // Apply replacements
  for (const [placeholder, value] of Object.entries(replacements)) {
    filled = filled.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
  }

  return filled;
}

/**
 * Generate a PRD from user prompt and optional research data
 *
 * @param options - PRD generation options
 * @returns Generated PRD with metadata
 */
export async function generatePRD(options: PRDGenerationOptions): Promise<GeneratedPRD> {
  try {
    // Step 1: Detect project type
    const projectType = options.projectType || detectProjectType(options.userPrompt);

    // Step 2: Extract project name
    const projectName = options.projectName || extractProjectName(options.userPrompt);

    // Step 3: Extract requirements
    const requirements = extractRequirements(options.userPrompt, projectType);

    // Step 4: Extract tech stack
    const techStack = extractTechStack(options.userPrompt, options.researchData);

    // Step 5: Load template
    const template = await loadTemplate(projectType, options.templatePath);

    // Step 6: Fill template
    const content = fillTemplate(
      template,
      { ...options, projectType, projectName },
      requirements,
      techStack
    );

    // Step 7: Determine output path
    const timestamp = Date.now();
    const slug = projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const outputPath =
      options.outputPath || path.join('.taskmaster', 'docs', `prd-${slug}-${timestamp}.md`);

    // Step 8: Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!existsSync(outputDir)) {
      await fs.mkdir(outputDir, { recursive: true });
    }

    // Step 9: Write PRD file
    await fs.writeFile(outputPath, content, 'utf-8');

    return {
      content,
      projectType,
      projectName,
      requirements,
      techStack,
      filePath: outputPath,
    };
  } catch (error) {
    throw new PRDGenerationError(
      'Failed to generate PRD',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Generate PRD content without writing to file
 * Useful for preview or testing
 *
 * @param options - PRD generation options
 * @returns PRD content and metadata
 */
export function generatePRDContent(options: PRDGenerationOptions): {
  content: string;
  projectType: ProjectType;
  projectName: string;
  requirements: DetectedRequirement[];
  techStack: string[];
} {
  const projectType = options.projectType || detectProjectType(options.userPrompt);
  const projectName = options.projectName || extractProjectName(options.userPrompt);
  const requirements = extractRequirements(options.userPrompt, projectType);
  const techStack = extractTechStack(options.userPrompt, options.researchData);
  const template = getDefaultTemplate(projectType);
  const content = fillTemplate(
    template,
    { ...options, projectType, projectName },
    requirements,
    techStack
  );

  return {
    content,
    projectType,
    projectName,
    requirements,
    techStack,
  };
}
