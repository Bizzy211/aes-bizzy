/**
 * Issue Content Analyzer
 *
 * Analyzes GitHub issue content to extract keywords, determine relevance,
 * and score agent matches for intelligent assignment.
 */
import type { GitHubIssue, AgentMatch, IssueAnalysisResult } from '../../types/github-automation.js';
/**
 * Extract keywords from text using tokenization and filtering
 */
export declare function extractKeywords(text: string): string[];
/**
 * Extract keywords from issue labels
 */
export declare function extractLabelKeywords(labels: Array<{
    name: string;
}>): string[];
/**
 * Analyze a GitHub issue and find matching agents
 */
export declare function analyzeIssue(issue: GitHubIssue, agentsDir?: string): Promise<IssueAnalysisResult>;
/**
 * Get the best matching agent for an issue
 */
export declare function getBestMatch(issue: GitHubIssue, confidenceThreshold?: number, agentsDir?: string): Promise<AgentMatch | null>;
/**
 * Get multiple matching agents above threshold
 */
export declare function getTopMatches(issue: GitHubIssue, maxMatches?: number, confidenceThreshold?: number, agentsDir?: string): Promise<AgentMatch[]>;
/**
 * Batch analyze multiple issues
 */
export declare function analyzeIssues(issues: GitHubIssue[], agentsDir?: string): Promise<IssueAnalysisResult[]>;
/**
 * Quick keyword extraction for issue preview
 */
export declare function extractIssueKeywords(issue: GitHubIssue): string[];
//# sourceMappingURL=issue-analyzer.d.ts.map