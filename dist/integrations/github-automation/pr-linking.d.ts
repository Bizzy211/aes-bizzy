/**
 * PR Linking and Status Sync
 *
 * Handles linking pull requests to issues and synchronizing
 * status between PRs and issue trackers.
 */
import type { PRLinkEvent } from '../../types/github-automation.js';
/**
 * Extract issue numbers from PR text
 */
export declare function extractIssueReferences(text: string): Map<number, 'fixes' | 'closes' | 'resolves' | 'relates'>;
/**
 * Parse PR body and title for linked issues
 */
export declare function parsePRForIssues(prTitle: string, prBody: string): number[];
/**
 * Determine link type from PR text
 */
export declare function determineLinkType(text: string, issueNumber: number): 'fixes' | 'closes' | 'resolves' | 'relates';
/**
 * Create a PR link event from PR data
 */
export declare function createPRLinkEvent(prNumber: number, prTitle: string, prBody: string, prUrl: string): PRLinkEvent;
/**
 * Fetch PR details from GitHub
 */
export declare function fetchPRDetails(owner: string, repo: string, prNumber: number, token: string): Promise<{
    number: number;
    title: string;
    body: string;
    state: string;
    merged: boolean;
    html_url: string;
} | null>;
/**
 * Get timeline events for an issue (to find linked PRs)
 */
export declare function getIssueTimeline(owner: string, repo: string, issueNumber: number, token: string): Promise<Array<{
    event: string;
    source?: {
        issue?: {
            number: number;
            pull_request?: object;
        };
    };
}>>;
/**
 * Find PRs that reference an issue
 */
export declare function findLinkedPRs(owner: string, repo: string, issueNumber: number, token: string): Promise<number[]>;
/**
 * Post a comment on an issue about PR status
 */
export declare function postPRStatusComment(owner: string, repo: string, issueNumber: number, prNumber: number, prState: 'opened' | 'merged' | 'closed', prUrl: string, token: string): Promise<boolean>;
/**
 * Close an issue when PR is merged
 */
export declare function closeIssue(owner: string, repo: string, issueNumber: number, token: string): Promise<boolean>;
/**
 * Process PR merge event
 */
export declare function processPRMerge(owner: string, repo: string, prNumber: number, prTitle: string, prBody: string, prUrl: string, token: string, autoClose?: boolean): Promise<{
    linkedIssues: number[];
    closedIssues: number[];
    commentedIssues: number[];
}>;
/**
 * Process PR open event
 */
export declare function processPROpen(owner: string, repo: string, prNumber: number, prTitle: string, prBody: string, prUrl: string, token: string): Promise<{
    linkedIssues: number[];
    commentedIssues: number[];
}>;
/**
 * Process PR close event (without merge)
 */
export declare function processPRClose(owner: string, repo: string, prNumber: number, prTitle: string, prBody: string, prUrl: string, token: string): Promise<{
    linkedIssues: number[];
    commentedIssues: number[];
}>;
/**
 * Sync status between PR and linked issues
 */
export declare function syncPRStatus(owner: string, repo: string, prNumber: number, token: string): Promise<{
    pr: {
        number: number;
        state: string;
        merged: boolean;
    } | null;
    linkedIssues: Array<{
        number: number;
        status: string;
    }>;
}>;
/**
 * Generate PR summary for linked issues
 */
export declare function generatePRSummary(linkEvent: PRLinkEvent): string;
//# sourceMappingURL=pr-linking.d.ts.map