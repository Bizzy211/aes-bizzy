/**
 * PR Linking and Status Sync
 *
 * Handles linking pull requests to issues and synchronizing
 * status between PRs and issue trackers.
 */
/**
 * Regex patterns for detecting issue references in PR text
 */
const ISSUE_REFERENCE_PATTERNS = {
    // Fixes/Closes/Resolves patterns
    fixes: /(?:fix(?:es|ed)?|close[sd]?|resolve[sd]?)\s+#(\d+)/gi,
    // Related/References patterns
    relates: /(?:relates?\s+to|references?|ref|see)\s+#(\d+)/gi,
    // Simple hash references
    simple: /#(\d+)/g,
    // Full URL references
    url: /https?:\/\/github\.com\/[\w-]+\/[\w-]+\/issues\/(\d+)/gi,
};
/**
 * Link types with their keywords
 */
const LINK_KEYWORDS = {
    fixes: ['fix', 'fixes', 'fixed', 'close', 'closes', 'closed', 'resolve', 'resolves', 'resolved'],
    relates: ['relates', 'related', 'ref', 'refs', 'reference', 'references', 'see'],
};
/**
 * Extract issue numbers from PR text
 */
export function extractIssueReferences(text) {
    const references = new Map();
    if (!text)
        return references;
    // Check for fixes/closes/resolves patterns first (highest priority)
    const fixesMatches = text.matchAll(ISSUE_REFERENCE_PATTERNS.fixes);
    for (const match of fixesMatches) {
        const capturedNum = match[1];
        if (!capturedNum)
            continue;
        const issueNum = parseInt(capturedNum, 10);
        references.set(issueNum, 'fixes');
    }
    // Check for relates/references patterns
    const relatesMatches = text.matchAll(ISSUE_REFERENCE_PATTERNS.relates);
    for (const match of relatesMatches) {
        const capturedNum = match[1];
        if (!capturedNum)
            continue;
        const issueNum = parseInt(capturedNum, 10);
        // Don't overwrite fixes with relates
        if (!references.has(issueNum)) {
            references.set(issueNum, 'relates');
        }
    }
    // Check URL patterns
    const urlMatches = text.matchAll(ISSUE_REFERENCE_PATTERNS.url);
    for (const match of urlMatches) {
        const capturedNum = match[1];
        if (!capturedNum)
            continue;
        const issueNum = parseInt(capturedNum, 10);
        // Check context for link type
        const context = text.substring(Math.max(0, text.indexOf(match[0]) - 20), text.indexOf(match[0])).toLowerCase();
        let linkType = 'relates';
        const fixesKeywords = LINK_KEYWORDS.fixes;
        if (fixesKeywords) {
            for (const keyword of fixesKeywords) {
                if (context.includes(keyword)) {
                    linkType = 'fixes';
                    break;
                }
            }
        }
        if (!references.has(issueNum)) {
            references.set(issueNum, linkType);
        }
    }
    // Check for simple hash references (catches patterns like "and #200")
    const simpleMatches = text.matchAll(ISSUE_REFERENCE_PATTERNS.simple);
    for (const match of simpleMatches) {
        const capturedNum = match[1];
        if (!capturedNum)
            continue;
        const issueNum = parseInt(capturedNum, 10);
        // Check context for link type (look for keywords before this reference)
        const matchIndex = match.index ?? 0;
        const context = text.substring(Math.max(0, matchIndex - 50), matchIndex).toLowerCase();
        if (!references.has(issueNum)) {
            // Check if there's a fixes-type keyword earlier in the context
            let linkType = 'relates';
            const fixesKeywords = LINK_KEYWORDS.fixes;
            if (fixesKeywords) {
                for (const keyword of fixesKeywords) {
                    if (context.includes(keyword)) {
                        linkType = 'fixes';
                        break;
                    }
                }
            }
            references.set(issueNum, linkType);
        }
    }
    return references;
}
/**
 * Parse PR body and title for linked issues
 */
export function parsePRForIssues(prTitle, prBody) {
    const titleRefs = extractIssueReferences(prTitle);
    const bodyRefs = extractIssueReferences(prBody || '');
    // Merge references, body takes precedence
    const allRefs = new Map([...titleRefs, ...bodyRefs]);
    return Array.from(allRefs.keys());
}
/**
 * Determine link type from PR text
 */
export function determineLinkType(text, issueNumber) {
    const refs = extractIssueReferences(text);
    return refs.get(issueNumber) || 'relates';
}
/**
 * Create a PR link event from PR data
 */
export function createPRLinkEvent(prNumber, prTitle, prBody, prUrl) {
    const linkedIssues = parsePRForIssues(prTitle, prBody);
    const firstIssue = linkedIssues[0];
    const linkType = firstIssue !== undefined
        ? determineLinkType(`${prTitle} ${prBody}`, firstIssue)
        : 'relates';
    return {
        prNumber,
        prTitle,
        prUrl,
        linkedIssues,
        linkType,
        timestamp: new Date().toISOString(),
    };
}
/**
 * GitHub API headers
 */
function buildHeaders(token) {
    return {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'JHC-Claude-Ecosystem',
    };
}
/**
 * Fetch PR details from GitHub
 */
export async function fetchPRDetails(owner, repo, prNumber, token) {
    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, { headers: buildHeaders(token) });
        if (!response.ok) {
            console.error(`Failed to fetch PR: ${response.status}`);
            return null;
        }
        return response.json();
    }
    catch (error) {
        console.error('Error fetching PR:', error);
        return null;
    }
}
/**
 * Get timeline events for an issue (to find linked PRs)
 */
export async function getIssueTimeline(owner, repo, issueNumber, token) {
    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/timeline`, {
            headers: {
                ...buildHeaders(token),
                Accept: 'application/vnd.github.mockingbird-preview+json',
            },
        });
        if (!response.ok) {
            console.error(`Failed to fetch timeline: ${response.status}`);
            return [];
        }
        return response.json();
    }
    catch (error) {
        console.error('Error fetching timeline:', error);
        return [];
    }
}
/**
 * Find PRs that reference an issue
 */
export async function findLinkedPRs(owner, repo, issueNumber, token) {
    const timeline = await getIssueTimeline(owner, repo, issueNumber, token);
    const linkedPRs = [];
    for (const event of timeline) {
        if (event.event === 'cross-referenced' && event.source?.issue?.pull_request) {
            linkedPRs.push(event.source.issue.number);
        }
    }
    return linkedPRs;
}
/**
 * Post a comment on an issue about PR status
 */
export async function postPRStatusComment(owner, repo, issueNumber, prNumber, prState, prUrl, token) {
    const stateMessages = {
        opened: `🔗 Pull request #${prNumber} has been opened that addresses this issue.`,
        merged: `✅ Pull request #${prNumber} has been merged! This issue should now be resolved.`,
        closed: `❌ Pull request #${prNumber} was closed without merging.`,
    };
    const body = `${stateMessages[prState]}\n\n[View PR](${prUrl})\n\n---\n*Automated by JHC Agentic EcoSystem*`;
    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
            method: 'POST',
            headers: buildHeaders(token),
            body: JSON.stringify({ body }),
        });
        return response.ok;
    }
    catch (error) {
        console.error('Error posting comment:', error);
        return false;
    }
}
/**
 * Close an issue when PR is merged
 */
export async function closeIssue(owner, repo, issueNumber, token) {
    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`, {
            method: 'PATCH',
            headers: buildHeaders(token),
            body: JSON.stringify({ state: 'closed' }),
        });
        return response.ok;
    }
    catch (error) {
        console.error('Error closing issue:', error);
        return false;
    }
}
/**
 * Process PR merge event
 */
export async function processPRMerge(owner, repo, prNumber, prTitle, prBody, prUrl, token, autoClose = true) {
    const result = {
        linkedIssues: [],
        closedIssues: [],
        commentedIssues: [],
    };
    // Find linked issues
    const refs = extractIssueReferences(`${prTitle} ${prBody}`);
    result.linkedIssues = Array.from(refs.keys());
    for (const [issueNum, linkType] of refs) {
        // Post status comment
        const commented = await postPRStatusComment(owner, repo, issueNum, prNumber, 'merged', prUrl, token);
        if (commented) {
            result.commentedIssues.push(issueNum);
        }
        // Close issue if auto-close enabled and link type is fixes/closes/resolves
        if (autoClose && ['fixes', 'closes', 'resolves'].includes(linkType)) {
            const closed = await closeIssue(owner, repo, issueNum, token);
            if (closed) {
                result.closedIssues.push(issueNum);
            }
        }
        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 300));
    }
    return result;
}
/**
 * Process PR open event
 */
export async function processPROpen(owner, repo, prNumber, prTitle, prBody, prUrl, token) {
    const result = {
        linkedIssues: [],
        commentedIssues: [],
    };
    // Find linked issues
    const refs = extractIssueReferences(`${prTitle} ${prBody}`);
    result.linkedIssues = Array.from(refs.keys());
    for (const issueNum of result.linkedIssues) {
        // Post status comment
        const commented = await postPRStatusComment(owner, repo, issueNum, prNumber, 'opened', prUrl, token);
        if (commented) {
            result.commentedIssues.push(issueNum);
        }
        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 300));
    }
    return result;
}
/**
 * Process PR close event (without merge)
 */
export async function processPRClose(owner, repo, prNumber, prTitle, prBody, prUrl, token) {
    const result = {
        linkedIssues: [],
        commentedIssues: [],
    };
    // Find linked issues
    const refs = extractIssueReferences(`${prTitle} ${prBody}`);
    result.linkedIssues = Array.from(refs.keys());
    for (const issueNum of result.linkedIssues) {
        // Post status comment
        const commented = await postPRStatusComment(owner, repo, issueNum, prNumber, 'closed', prUrl, token);
        if (commented) {
            result.commentedIssues.push(issueNum);
        }
        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 300));
    }
    return result;
}
/**
 * Sync status between PR and linked issues
 */
export async function syncPRStatus(owner, repo, prNumber, token) {
    const result = {
        pr: null,
        linkedIssues: [],
    };
    // Fetch PR details
    const pr = await fetchPRDetails(owner, repo, prNumber, token);
    if (!pr) {
        return result;
    }
    result.pr = {
        number: pr.number,
        state: pr.state,
        merged: pr.merged,
    };
    // Find linked issues
    const refs = extractIssueReferences(`${pr.title} ${pr.body}`);
    for (const issueNum of refs.keys()) {
        // Fetch issue status
        try {
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNum}`, { headers: buildHeaders(token) });
            if (response.ok) {
                const issue = await response.json();
                result.linkedIssues.push({
                    number: issueNum,
                    status: issue.state,
                });
            }
        }
        catch (error) {
            console.error(`Error fetching issue ${issueNum}:`, error);
        }
        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return result;
}
/**
 * Generate PR summary for linked issues
 */
export function generatePRSummary(linkEvent) {
    const lines = [
        `## PR #${linkEvent.prNumber}: ${linkEvent.prTitle}`,
        '',
        `**Link Type:** ${linkEvent.linkType}`,
        `**Linked Issues:** ${linkEvent.linkedIssues.map((n) => `#${n}`).join(', ') || 'None'}`,
        `**Timestamp:** ${new Date(linkEvent.timestamp).toLocaleString()}`,
        '',
        `[View Pull Request](${linkEvent.prUrl})`,
    ];
    return lines.join('\n');
}
//# sourceMappingURL=pr-linking.js.map