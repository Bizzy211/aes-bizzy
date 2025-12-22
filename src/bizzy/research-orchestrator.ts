/**
 * Research Orchestrator Module
 *
 * Wraps exa.ai and ref.tools MCP calls for the /bizzy workflow.
 * Provides unified research functions for branding, technical documentation,
 * and code context with structured result formatting and error handling.
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface BrandingSource {
  title: string;
  url: string;
  content: string;
  relevanceScore?: number;
}

export interface BrandingResult {
  brandGuidelines: BrandingSource[];
  colorSchemes: string[];
  typographyGuidelines: string[];
  logoGuidelines: string[];
  visualExamples: Array<{ url: string; description: string }>;
}

export interface TechnicalDoc {
  title: string;
  url: string;
  content: string;
}

export interface ApiReference {
  name: string;
  url: string;
  description: string;
}

export interface TechnicalDocsResult {
  officialDocs: TechnicalDoc[];
  apiReferences: ApiReference[];
  migrationGuides: string[];
  configurationExamples: string[];
}

export interface CodeExample {
  description: string;
  code: string;
  language: string;
  source?: string;
}

export interface CodeContextResult {
  examples: CodeExample[];
  patterns: string[];
  bestPractices: string[];
  libraries: string[];
}

export interface ResearchMetadata {
  timestamp: Date;
  sources: string[];
  tokensUsed: number;
  errors: string[];
}

export interface ProjectResearchResult {
  branding?: BrandingResult;
  technicalDocs?: TechnicalDocsResult;
  codeContext?: CodeContextResult;
  metadata: ResearchMetadata;
}

export interface ResearchOptions {
  tokensNum?: number;
  numResults?: number;
  searchType?: 'auto' | 'fast' | 'deep';
  fallbackOnError?: boolean;
}

export interface GatherResearchOptions {
  branding?: ResearchOptions;
  docs?: ResearchOptions;
  code?: ResearchOptions;
}

// ============================================================================
// Error Classes
// ============================================================================

export class ResearchError extends Error {
  constructor(
    message: string,
    public readonly source: 'exa' | 'ref' | 'unknown',
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'ResearchError';
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract domain from URL for source tracking
 */
export function extractSource(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

/**
 * Deduplicate results by URL or content similarity
 */
export function deduplicateResults<T extends { url?: string }>(results: T[]): T[] {
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = result.url || JSON.stringify(result);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Parse documentation content for structured data
 */
export function parseDocumentation(content: string): {
  headings: string[];
  codeBlocks: string[];
  lists: string[];
} {
  const headings: string[] = [];
  const codeBlocks: string[] = [];
  const lists: string[] = [];

  // Extract headings (markdown style)
  const headingMatches = content.match(/^#{1,6}\s+.+$/gm);
  if (headingMatches) {
    headings.push(...headingMatches.map((h) => h.replace(/^#+\s+/, '')));
  }

  // Extract code blocks
  const codeBlockMatches = content.match(/```[\s\S]*?```/g);
  if (codeBlockMatches) {
    codeBlocks.push(...codeBlockMatches.map((cb) => cb.replace(/```\w*\n?/g, '').trim()));
  }

  // Extract list items
  const listMatches = content.match(/^[\s]*[-*]\s+.+$/gm);
  if (listMatches) {
    lists.push(...listMatches.map((l) => l.replace(/^[\s]*[-*]\s+/, '')));
  }

  return { headings, codeBlocks, lists };
}

/**
 * Estimate token usage for a query
 */
export function estimateTokenUsage(query: string, options: ResearchOptions): number {
  const baseTokens = Math.ceil(query.length / 4);
  const resultTokens = (options.numResults || 8) * 500;
  const codeTokens = options.tokensNum || 5000;
  return baseTokens + resultTokens + codeTokens;
}

/**
 * Extract color schemes from content
 */
function extractColorSchemes(content: string): string[] {
  const colors: string[] = [];

  // Match hex colors
  const hexMatches = content.match(/#[0-9A-Fa-f]{6}\b/g);
  if (hexMatches) {
    colors.push(...hexMatches);
  }

  // Match rgb/rgba colors
  const rgbMatches = content.match(/rgba?\([^)]+\)/g);
  if (rgbMatches) {
    colors.push(...rgbMatches);
  }

  // Match named colors in design context
  const namedColorPatterns = [
    /primary\s*(?:color)?:\s*([^;,\n]+)/gi,
    /secondary\s*(?:color)?:\s*([^;,\n]+)/gi,
    /accent\s*(?:color)?:\s*([^;,\n]+)/gi,
    /brand\s*(?:color)?:\s*([^;,\n]+)/gi,
  ];

  for (const pattern of namedColorPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        colors.push(match[1].trim());
      }
    }
  }

  return [...new Set(colors)];
}

/**
 * Extract typography guidelines from content
 */
function extractTypography(content: string): string[] {
  const typography: string[] = [];

  // Match font family declarations
  const fontFamilyMatches = content.match(/font-family:\s*([^;]+)/gi);
  if (fontFamilyMatches) {
    typography.push(...fontFamilyMatches.map((f) => f.replace(/font-family:\s*/i, '').trim()));
  }

  // Match common font names
  const fontPatterns = [
    /\b(Inter|Roboto|Open Sans|Lato|Montserrat|Poppins|Raleway|Source Sans|Helvetica|Arial)\b/gi,
  ];

  for (const pattern of fontPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      typography.push(...matches);
    }
  }

  return [...new Set(typography)];
}

/**
 * Extract code examples from content
 */
function extractCodeExamples(content: string, language?: string): CodeExample[] {
  const examples: CodeExample[] = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;

  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const lang = match[1] || language || 'typescript';
    const code = match[2]?.trim() || '';

    if (code.length > 10) {
      // Get description from surrounding context
      const beforeBlock = content.substring(Math.max(0, match.index - 200), match.index);
      const descMatch = beforeBlock.match(/[.!?]\s*([^.!?]+)$/);
      const description = descMatch ? descMatch[1].trim() : 'Code example';

      examples.push({
        description,
        code,
        language: lang,
      });
    }
  }

  return examples;
}

/**
 * Extract patterns and best practices from content
 */
function extractPatternsAndPractices(content: string): { patterns: string[]; bestPractices: string[] } {
  const patterns: string[] = [];
  const bestPractices: string[] = [];

  // Pattern indicators
  const patternMatches = content.match(/(?:pattern|approach|strategy|technique):\s*([^.!?\n]+)/gi);
  if (patternMatches) {
    patterns.push(...patternMatches.map((p) => p.replace(/^[^:]+:\s*/i, '').trim()));
  }

  // Best practice indicators
  const practiceMatches = content.match(
    /(?:best practice|recommendation|tip|should|always|never):\s*([^.!?\n]+)/gi
  );
  if (practiceMatches) {
    bestPractices.push(...practiceMatches.map((p) => p.replace(/^[^:]+:\s*/i, '').trim()));
  }

  // Also look for bulleted lists after "best practices" heading
  const bpSection = content.match(/best practices[\s\S]*?(?=##|$)/i);
  if (bpSection) {
    const listItems = bpSection[0].match(/^[\s]*[-*]\s+.+$/gm);
    if (listItems) {
      bestPractices.push(...listItems.map((l) => l.replace(/^[\s]*[-*]\s+/, '')));
    }
  }

  return {
    patterns: [...new Set(patterns)],
    bestPractices: [...new Set(bestPractices)],
  };
}

/**
 * Extract library recommendations from content
 */
function extractLibraries(content: string): string[] {
  const libraries: string[] = [];

  // Common package patterns
  const packagePatterns = [
    /npm\s+(?:install|i)\s+([^\s]+)/g,
    /yarn\s+add\s+([^\s]+)/g,
    /pnpm\s+(?:add|install)\s+([^\s]+)/g,
    /"dependencies"[\s\S]*?"([^"@]+)"/g,
  ];

  for (const pattern of packagePatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && !match[1].startsWith('-')) {
        libraries.push(match[1]);
      }
    }
  }

  return [...new Set(libraries)];
}

// ============================================================================
// Core Research Functions
// ============================================================================

/**
 * Search for branding and design guidelines using exa.ai
 *
 * @param query - Search query for branding research
 * @param options - Research options
 * @returns BrandingResult with guidelines, colors, typography
 */
export async function searchBranding(
  query: string,
  options: ResearchOptions = {}
): Promise<BrandingResult> {
  const { numResults = 8, searchType = 'auto', fallbackOnError = true } = options;

  const result: BrandingResult = {
    brandGuidelines: [],
    colorSchemes: [],
    typographyGuidelines: [],
    logoGuidelines: [],
    visualExamples: [],
  };

  const errors: string[] = [];

  // Query variations for comprehensive branding research
  const queries = [
    `${query} brand guidelines design system`,
    `${query} color palette typography`,
    `${query} visual identity style guide`,
  ];

  for (const searchQuery of queries) {
    try {
      // Note: In production, this would call the actual MCP tool
      // For now, we define the interface that will be used
      const searchResult = await callExaWebSearch({
        query: searchQuery,
        numResults: Math.ceil(numResults / queries.length),
        type: searchType,
      });

      if (searchResult && Array.isArray(searchResult.results)) {
        for (const item of searchResult.results) {
          // Add to brand guidelines
          result.brandGuidelines.push({
            title: item.title || 'Untitled',
            url: item.url || '',
            content: item.text || item.content || '',
            relevanceScore: item.score,
          });

          // Extract color schemes from content
          const colors = extractColorSchemes(item.text || item.content || '');
          result.colorSchemes.push(...colors);

          // Extract typography
          const typography = extractTypography(item.text || item.content || '');
          result.typographyGuidelines.push(...typography);

          // Add visual examples if images found
          if (item.url && (item.title?.toLowerCase().includes('logo') || item.title?.toLowerCase().includes('visual'))) {
            result.visualExamples.push({
              url: item.url,
              description: item.title || 'Visual example',
            });
          }
        }
      }
    } catch (error) {
      const errorMsg = `Branding search failed for "${searchQuery}": ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);

      if (!fallbackOnError) {
        throw new ResearchError(errorMsg, 'exa', error);
      }
    }
  }

  // Deduplicate results
  result.brandGuidelines = deduplicateResults(result.brandGuidelines);
  result.colorSchemes = [...new Set(result.colorSchemes)];
  result.typographyGuidelines = [...new Set(result.typographyGuidelines)];
  result.visualExamples = deduplicateResults(result.visualExamples);

  return result;
}

/**
 * Search for technical documentation using ref.tools
 *
 * @param query - Search query for documentation
 * @param options - Research options
 * @returns TechnicalDocsResult with official docs, API references
 */
export async function searchTechDocs(
  query: string,
  options: ResearchOptions = {}
): Promise<TechnicalDocsResult> {
  const { numResults = 5, fallbackOnError = true } = options;

  const result: TechnicalDocsResult = {
    officialDocs: [],
    apiReferences: [],
    migrationGuides: [],
    configurationExamples: [],
  };

  const errors: string[] = [];

  // Query variations for technical documentation
  const queries = [
    `${query} documentation`,
    `${query} API reference`,
    `${query} getting started guide`,
  ];

  for (const searchQuery of queries) {
    try {
      // Search documentation using ref.tools
      const searchResult = await callRefSearchDocumentation({
        query: searchQuery,
      });

      if (searchResult && Array.isArray(searchResult.results)) {
        for (const item of searchResult.results) {
          const doc: TechnicalDoc = {
            title: item.title || 'Documentation',
            url: item.url || '',
            content: item.content || '',
          };

          // Categorize based on content/title
          const titleLower = (item.title || '').toLowerCase();
          const contentLower = (item.content || '').toLowerCase();

          if (titleLower.includes('api') || contentLower.includes('endpoint')) {
            result.apiReferences.push({
              name: item.title || 'API Reference',
              url: item.url || '',
              description: item.content?.substring(0, 200) || '',
            });
          } else if (titleLower.includes('migration') || titleLower.includes('upgrade')) {
            result.migrationGuides.push(item.content?.substring(0, 500) || '');
          } else if (titleLower.includes('config') || contentLower.includes('configuration')) {
            result.configurationExamples.push(item.content?.substring(0, 500) || '');
          } else {
            result.officialDocs.push(doc);
          }
        }
      }

      // Try to read full content for top results
      if (searchResult?.results?.[0]?.url) {
        try {
          const fullContent = await callRefReadUrl({
            url: searchResult.results[0].url,
          });

          if (fullContent && fullContent.content) {
            // Update the first doc with full content
            if (result.officialDocs[0]) {
              result.officialDocs[0].content = fullContent.content;
            }

            // Extract configuration examples from full content
            const parsed = parseDocumentation(fullContent.content);
            result.configurationExamples.push(...parsed.codeBlocks.slice(0, 3));
          }
        } catch {
          // Ignore read errors, we still have search results
        }
      }
    } catch (error) {
      const errorMsg = `Tech docs search failed for "${searchQuery}": ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);

      if (!fallbackOnError) {
        throw new ResearchError(errorMsg, 'ref', error);
      }
    }
  }

  // Deduplicate
  result.officialDocs = deduplicateResults(result.officialDocs);
  result.apiReferences = deduplicateResults(result.apiReferences);
  result.migrationGuides = [...new Set(result.migrationGuides)];
  result.configurationExamples = [...new Set(result.configurationExamples)];

  return result;
}

/**
 * Get code context and examples using exa.ai
 *
 * @param query - Search query for code examples
 * @param options - Research options (tokensNum controls response size)
 * @returns CodeContextResult with examples, patterns, best practices
 */
export async function getCodeContext(
  query: string,
  options: ResearchOptions = {}
): Promise<CodeContextResult> {
  const { tokensNum = 5000, fallbackOnError = true } = options;

  const result: CodeContextResult = {
    examples: [],
    patterns: [],
    bestPractices: [],
    libraries: [],
  };

  try {
    // Get code context using exa.ai
    const codeResult = await callExaGetCodeContext({
      query: `${query} implementation examples best practices`,
      tokensNum,
    });

    if (codeResult && codeResult.content) {
      // Extract code examples
      result.examples = extractCodeExamples(codeResult.content);

      // Extract patterns and best practices
      const { patterns, bestPractices } = extractPatternsAndPractices(codeResult.content);
      result.patterns = patterns;
      result.bestPractices = bestPractices;

      // Extract library recommendations
      result.libraries = extractLibraries(codeResult.content);
    }
  } catch (error) {
    const errorMsg = `Code context search failed: ${error instanceof Error ? error.message : String(error)}`;

    if (!fallbackOnError) {
      throw new ResearchError(errorMsg, 'exa', error);
    }

    // Fallback: try web search with code examples suffix
    try {
      const fallbackResult = await callExaWebSearch({
        query: `${query} code examples github`,
        numResults: 5,
        type: 'auto',
      });

      if (fallbackResult && Array.isArray(fallbackResult.results)) {
        for (const item of fallbackResult.results) {
          const examples = extractCodeExamples(item.text || item.content || '');
          result.examples.push(...examples);
        }
      }
    } catch {
      // Both methods failed, return empty result
    }
  }

  // Deduplicate
  result.examples = result.examples.slice(0, 10); // Limit examples
  result.patterns = [...new Set(result.patterns)];
  result.bestPractices = [...new Set(result.bestPractices)];
  result.libraries = [...new Set(result.libraries)];

  return result;
}

/**
 * Gather comprehensive project research combining all sources
 *
 * @param projectQuery - Main project description/query
 * @param options - Options for each research type
 * @returns ProjectResearchResult with all research data and metadata
 */
export async function gatherProjectResearch(
  projectQuery: string,
  options: GatherResearchOptions = {}
): Promise<ProjectResearchResult> {
  const startTime = Date.now();
  const sources: string[] = [];
  const errors: string[] = [];
  let totalTokens = 0;

  const result: ProjectResearchResult = {
    metadata: {
      timestamp: new Date(),
      sources: [],
      tokensUsed: 0,
      errors: [],
    },
  };

  // Run all research in parallel for efficiency
  const [brandingResult, docsResult, codeResult] = await Promise.allSettled([
    searchBranding(projectQuery, options.branding),
    searchTechDocs(projectQuery, options.docs),
    getCodeContext(projectQuery, options.code),
  ]);

  // Process branding results
  if (brandingResult.status === 'fulfilled') {
    result.branding = brandingResult.value;
    // Track sources
    for (const guide of brandingResult.value.brandGuidelines) {
      if (guide.url) {
        sources.push(extractSource(guide.url));
      }
    }
    totalTokens += estimateTokenUsage(projectQuery, options.branding || {});
  } else {
    errors.push(`Branding research failed: ${brandingResult.reason}`);
  }

  // Process docs results
  if (docsResult.status === 'fulfilled') {
    result.technicalDocs = docsResult.value;
    // Track sources
    for (const doc of docsResult.value.officialDocs) {
      if (doc.url) {
        sources.push(extractSource(doc.url));
      }
    }
    totalTokens += estimateTokenUsage(projectQuery, options.docs || {});
  } else {
    errors.push(`Technical docs research failed: ${docsResult.reason}`);
  }

  // Process code context results
  if (codeResult.status === 'fulfilled') {
    result.codeContext = codeResult.value;
    // Track sources from examples
    for (const example of codeResult.value.examples) {
      if (example.source) {
        sources.push(extractSource(example.source));
      }
    }
    totalTokens += options.code?.tokensNum || 5000;
  } else {
    errors.push(`Code context research failed: ${codeResult.reason}`);
  }

  // Update metadata
  result.metadata = {
    timestamp: new Date(),
    sources: [...new Set(sources)],
    tokensUsed: totalTokens,
    errors,
  };

  return result;
}

// ============================================================================
// MCP Tool Wrappers (Interfaces for actual MCP calls)
// ============================================================================

/**
 * Interface for exa web search MCP call
 * In production, this calls mcp__exa__web_search_exa
 */
interface ExaWebSearchParams {
  query: string;
  numResults?: number;
  type?: 'auto' | 'fast' | 'deep';
}

interface ExaWebSearchResult {
  results: Array<{
    title?: string;
    url?: string;
    text?: string;
    content?: string;
    score?: number;
  }>;
}

async function callExaWebSearch(params: ExaWebSearchParams): Promise<ExaWebSearchResult> {
  // This is a placeholder that will be replaced with actual MCP call
  // In the skill context, Claude will call mcp__exa__web_search_exa directly

  // For testing/development, we can mock this
  if (process.env.NODE_ENV === 'test' || process.env.MOCK_MCP === 'true') {
    return {
      results: [
        {
          title: `${params.query} - Example Result`,
          url: `https://example.com/${encodeURIComponent(params.query)}`,
          text: `Sample content for ${params.query}`,
          score: 0.85,
        },
      ],
    };
  }

  // In production, throw error if called directly
  // The skill should use MCP tools directly
  throw new ResearchError(
    'callExaWebSearch should be replaced with mcp__exa__web_search_exa in skill context',
    'exa'
  );
}

/**
 * Interface for exa code context MCP call
 * In production, this calls mcp__exa__get_code_context_exa
 */
interface ExaCodeContextParams {
  query: string;
  tokensNum?: number;
}

interface ExaCodeContextResult {
  content: string;
}

async function callExaGetCodeContext(params: ExaCodeContextParams): Promise<ExaCodeContextResult> {
  // Placeholder for actual MCP call
  if (process.env.NODE_ENV === 'test' || process.env.MOCK_MCP === 'true') {
    return {
      content: `
# ${params.query} Examples

## Best Practices
- Always use TypeScript for type safety
- Follow the single responsibility principle

## Code Example
\`\`\`typescript
// Example implementation
export function example() {
  return 'Hello World';
}
\`\`\`

## Recommended Libraries
- npm install example-lib
- yarn add another-lib
      `,
    };
  }

  throw new ResearchError(
    'callExaGetCodeContext should be replaced with mcp__exa__get_code_context_exa in skill context',
    'exa'
  );
}

/**
 * Interface for ref search documentation MCP call
 * In production, this calls mcp__ref__ref_search_documentation
 */
interface RefSearchParams {
  query: string;
}

interface RefSearchResult {
  results: Array<{
    title?: string;
    url?: string;
    content?: string;
  }>;
}

async function callRefSearchDocumentation(params: RefSearchParams): Promise<RefSearchResult> {
  // Placeholder for actual MCP call
  if (process.env.NODE_ENV === 'test' || process.env.MOCK_MCP === 'true') {
    return {
      results: [
        {
          title: `${params.query} Documentation`,
          url: `https://docs.example.com/${encodeURIComponent(params.query)}`,
          content: `Official documentation for ${params.query}`,
        },
      ],
    };
  }

  throw new ResearchError(
    'callRefSearchDocumentation should be replaced with mcp__ref__ref_search_documentation in skill context',
    'ref'
  );
}

/**
 * Interface for ref read URL MCP call
 * In production, this calls mcp__ref__ref_read_url
 */
interface RefReadUrlParams {
  url: string;
}

interface RefReadUrlResult {
  content: string;
}

async function callRefReadUrl(params: RefReadUrlParams): Promise<RefReadUrlResult> {
  // Placeholder for actual MCP call
  if (process.env.NODE_ENV === 'test' || process.env.MOCK_MCP === 'true') {
    return {
      content: `Full content from ${params.url}`,
    };
  }

  throw new ResearchError(
    'callRefReadUrl should be replaced with mcp__ref__ref_read_url in skill context',
    'ref'
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  callExaWebSearch,
  callExaGetCodeContext,
  callRefSearchDocumentation,
  callRefReadUrl,
};
