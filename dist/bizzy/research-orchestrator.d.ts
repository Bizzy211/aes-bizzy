/**
 * Research Orchestrator Module
 *
 * Wraps exa.ai and ref.tools MCP calls for the /bizzy workflow.
 * Provides unified research functions for branding, technical documentation,
 * and code context with structured result formatting and error handling.
 */
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
    visualExamples: Array<{
        url: string;
        description: string;
    }>;
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
export declare class ResearchError extends Error {
    readonly source: 'exa' | 'ref' | 'unknown';
    readonly originalError?: unknown | undefined;
    constructor(message: string, source: 'exa' | 'ref' | 'unknown', originalError?: unknown | undefined);
}
/**
 * Extract domain from URL for source tracking
 */
export declare function extractSource(url: string): string;
/**
 * Deduplicate results by URL or content similarity
 */
export declare function deduplicateResults<T extends {
    url?: string;
}>(results: T[]): T[];
/**
 * Parse documentation content for structured data
 */
export declare function parseDocumentation(content: string): {
    headings: string[];
    codeBlocks: string[];
    lists: string[];
};
/**
 * Estimate token usage for a query
 */
export declare function estimateTokenUsage(query: string, options: ResearchOptions): number;
/**
 * Search for branding and design guidelines using exa.ai
 *
 * @param query - Search query for branding research
 * @param options - Research options
 * @returns BrandingResult with guidelines, colors, typography
 */
export declare function searchBranding(query: string, options?: ResearchOptions): Promise<BrandingResult>;
/**
 * Search for technical documentation using ref.tools
 *
 * @param query - Search query for documentation
 * @param options - Research options
 * @returns TechnicalDocsResult with official docs, API references
 */
export declare function searchTechDocs(query: string, options?: ResearchOptions): Promise<TechnicalDocsResult>;
/**
 * Get code context and examples using exa.ai
 *
 * @param query - Search query for code examples
 * @param options - Research options (tokensNum controls response size)
 * @returns CodeContextResult with examples, patterns, best practices
 */
export declare function getCodeContext(query: string, options?: ResearchOptions): Promise<CodeContextResult>;
/**
 * Gather comprehensive project research combining all sources
 *
 * @param projectQuery - Main project description/query
 * @param options - Options for each research type
 * @returns ProjectResearchResult with all research data and metadata
 */
export declare function gatherProjectResearch(projectQuery: string, options?: GatherResearchOptions): Promise<ProjectResearchResult>;
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
declare function callExaWebSearch(params: ExaWebSearchParams): Promise<ExaWebSearchResult>;
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
declare function callExaGetCodeContext(params: ExaCodeContextParams): Promise<ExaCodeContextResult>;
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
declare function callRefSearchDocumentation(params: RefSearchParams): Promise<RefSearchResult>;
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
declare function callRefReadUrl(params: RefReadUrlParams): Promise<RefReadUrlResult>;
export { callExaWebSearch, callExaGetCodeContext, callRefSearchDocumentation, callRefReadUrl, };
//# sourceMappingURL=research-orchestrator.d.ts.map