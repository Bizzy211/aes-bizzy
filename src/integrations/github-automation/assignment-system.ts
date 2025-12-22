/**
 * Auto-Assignment System
 *
 * Handles automatic assignment of GitHub issues to Claude sub-agents
 * using the GitHub API.
 */

import type {
  GitHubIssue,
  AssignmentResult,
  AgentMatch,
  TriageResult,
  AutomationLogEntry,
  GitHubAutomationConfig,
} from '../../types/github-automation.js';
import { analyzeIssue } from './issue-analyzer.js';

/**
 * Build GitHub API headers
 */
function buildHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'JHC-Claude-Ecosystem',
  };
}

/**
 * Automation log entries
 */
const automationLog: AutomationLogEntry[] = [];
const MAX_LOG_ENTRIES = 1000;

/**
 * Add entry to automation log
 */
function logEntry(entry: Omit<AutomationLogEntry, 'timestamp'>): void {
  automationLog.unshift({
    ...entry,
    timestamp: new Date().toISOString(),
  });

  // Trim log if too large
  if (automationLog.length > MAX_LOG_ENTRIES) {
    automationLog.splice(MAX_LOG_ENTRIES);
  }
}

/**
 * Get automation log entries
 */
export function getAutomationLog(limit: number = 100): AutomationLogEntry[] {
  return automationLog.slice(0, limit);
}

/**
 * Clear automation log
 */
export function clearAutomationLog(): void {
  automationLog.length = 0;
}

/**
 * Fetch issue from GitHub API
 */
export async function fetchIssue(
  owner: string,
  repo: string,
  issueNumber: number,
  token: string
): Promise<GitHubIssue | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
      { headers: buildHeaders(token) }
    );

    if (!response.ok) {
      console.error(`Failed to fetch issue: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data as GitHubIssue;
  } catch (error) {
    console.error('Error fetching issue:', error);
    return null;
  }
}

/**
 * Fetch open issues from a repository
 */
export async function fetchOpenIssues(
  owner: string,
  repo: string,
  token: string,
  options: {
    labels?: string[];
    assignee?: string;
    state?: 'open' | 'closed' | 'all';
    perPage?: number;
    page?: number;
  } = {}
): Promise<GitHubIssue[]> {
  try {
    const params = new URLSearchParams();
    params.set('state', options.state || 'open');
    params.set('per_page', String(options.perPage || 30));
    params.set('page', String(options.page || 1));

    if (options.labels && options.labels.length > 0) {
      params.set('labels', options.labels.join(','));
    }

    if (options.assignee) {
      params.set('assignee', options.assignee);
    }

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues?${params}`,
      { headers: buildHeaders(token) }
    );

    if (!response.ok) {
      console.error(`Failed to fetch issues: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    // Filter out pull requests (they appear in issues API)
    return (data as GitHubIssue[]).filter((issue) => !('pull_request' in issue));
  } catch (error) {
    console.error('Error fetching issues:', error);
    return [];
  }
}

/**
 * Post a comment on a GitHub issue
 */
export async function postComment(
  owner: string,
  repo: string,
  issueNumber: number,
  body: string,
  token: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      {
        method: 'POST',
        headers: buildHeaders(token),
        body: JSON.stringify({ body }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error posting comment:', error);
    return false;
  }
}

/**
 * Add labels to a GitHub issue
 */
export async function addLabels(
  owner: string,
  repo: string,
  issueNumber: number,
  labels: string[],
  token: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/labels`,
      {
        method: 'POST',
        headers: buildHeaders(token),
        body: JSON.stringify({ labels }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error adding labels:', error);
    return false;
  }
}

/**
 * Generate assignment comment for an issue
 */
export function generateAssignmentComment(
  agentMatches: AgentMatch[],
  analysisKeywords: string[]
): string {
  const lines: string[] = [
    '## 🤖 JHC Agentic EcoSystem - Bizzy Analysis',
    '',
  ];

  if (agentMatches.length === 0) {
    lines.push('No specific agent match found for this issue. Consider adding labels to improve assignment.');
    return lines.join('\n');
  }

  lines.push('### Recommended Agents');
  lines.push('');

  const topMatches = agentMatches.slice(0, 3);
  for (let i = 0; i < topMatches.length; i++) {
    const match = topMatches[i];
    if (!match) continue;
    const emojiMap = {
      high: '🟢',
      medium: '🟡',
      low: '🔴',
    } as const;
    const confidenceEmoji = emojiMap[match.confidence] || '⚪';

    lines.push(`${i + 1}. **${match.agentName}** ${confidenceEmoji} (${match.score}% confidence)`);
    if (match.matchReason) {
      lines.push(`   - ${match.matchReason}`);
    }
    lines.push('');
  }

  if (analysisKeywords.length > 0) {
    lines.push('### Detected Keywords');
    lines.push(`\`${analysisKeywords.slice(0, 10).join('`, `')}\``);
    lines.push('');
  }

  lines.push('---');
  lines.push('*Automated analysis by JHC Agentic EcoSystem*');

  return lines.join('\n');
}

/**
 * Generate triage comment for manual review
 */
export function generateTriageComment(
  triageResult: TriageResult
): string {
  const lines: string[] = [
    '## 🔍 Issue Triage Report',
    '',
  ];

  if (triageResult.requiresManualReview) {
    lines.push('⚠️ **Manual review recommended** - Low confidence in agent assignment.');
    lines.push('');
  }

  if (triageResult.suggestedAgents.length > 0) {
    lines.push('### Suggested Agents');
    for (const agent of triageResult.suggestedAgents.slice(0, 3)) {
      lines.push(`- **${agent.agentName}** (${agent.confidence} confidence: ${agent.score}%)`);
    }
    lines.push('');
  }

  if (triageResult.suggestedLabels.length > 0) {
    lines.push('### Suggested Labels');
    lines.push(`\`${triageResult.suggestedLabels.join('`, `')}\``);
    lines.push('');
  }

  lines.push('---');
  lines.push(`*Triaged at ${new Date(triageResult.timestamp).toLocaleString()}*`);

  return lines.join('\n');
}

/**
 * Assign an issue to agents based on analysis
 */
export async function assignIssue(
  owner: string,
  repo: string,
  issue: GitHubIssue,
  token: string,
  config: Partial<GitHubAutomationConfig> = {}
): Promise<AssignmentResult> {
  const {
    confidenceThreshold = 40,
    autoAssign = true,
    requireConfirmation = false,
  } = config;

  const result: AssignmentResult = {
    success: false,
    issue,
    assignedAgents: [],
    confidence: 0,
  };

  try {
    // Analyze the issue
    const analysis = await analyzeIssue(issue);

    const bestMatch = analysis.agentMatches[0];
    if (!bestMatch) {
      result.error = 'No matching agents found';
      logEntry({
        eventType: 'issue.analyzed',
        issueUrl: issue.html_url,
        action: 'no_match',
        result: 'skipped',
        details: 'No matching agents found for issue',
      });
      return result;
    }

    result.confidence = bestMatch.score;

    // Check if confidence meets threshold
    if (bestMatch.score < confidenceThreshold) {
      result.error = `Confidence ${bestMatch.score}% below threshold ${confidenceThreshold}%`;
      logEntry({
        eventType: 'issue.analyzed',
        issueUrl: issue.html_url,
        action: 'low_confidence',
        result: 'skipped',
        details: result.error,
        confidence: bestMatch.score,
      });
      return result;
    }

    // Get top matching agents
    const topAgents = analysis.agentMatches
      .filter((m) => m.score >= confidenceThreshold)
      .slice(0, 3)
      .map((m) => m.agentName);

    result.assignedAgents = topAgents;

    // Generate and post comment
    if (autoAssign && !requireConfirmation) {
      const comment = generateAssignmentComment(
        analysis.agentMatches.slice(0, 3),
        analysis.extractedKeywords
      );

      const commentPosted = await postComment(owner, repo, issue.number, comment, token);

      if (!commentPosted) {
        result.error = 'Failed to post assignment comment';
        logEntry({
          eventType: 'issue.assign',
          issueUrl: issue.html_url,
          action: 'comment_failed',
          result: 'failure',
          details: result.error,
          assignedAgents: topAgents,
        });
        return result;
      }

      result.comment = comment;
    }

    // Add suggested labels if any
    if (analysis.suggestedLabels.length > 0) {
      await addLabels(owner, repo, issue.number, analysis.suggestedLabels, token);
    }

    result.success = true;
    logEntry({
      eventType: 'issue.assign',
      issueUrl: issue.html_url,
      action: 'assigned',
      result: 'success',
      assignedAgents: topAgents,
      confidence: bestMatch.score,
    });

    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    logEntry({
      eventType: 'issue.assign',
      issueUrl: issue.html_url,
      action: 'error',
      result: 'failure',
      details: result.error,
    });
    return result;
  }
}

/**
 * Triage an issue for manual review
 */
export async function triageIssue(
  issue: GitHubIssue,
  agentsDir?: string
): Promise<TriageResult> {
  const analysis = await analyzeIssue(issue, agentsDir);

  const firstMatch = analysis.agentMatches[0];
  const requiresManualReview =
    analysis.agentMatches.length === 0 ||
    !firstMatch ||
    firstMatch.score < 40;

  return {
    issue,
    suggestedAgents: analysis.agentMatches.slice(0, 5),
    suggestedLabels: analysis.suggestedLabels,
    triageComment: generateTriageComment({
      issue,
      suggestedAgents: analysis.agentMatches.slice(0, 5),
      suggestedLabels: analysis.suggestedLabels,
      triageComment: '',
      requiresManualReview,
      timestamp: new Date().toISOString(),
    }),
    requiresManualReview,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Batch assign issues
 */
export async function batchAssignIssues(
  owner: string,
  repo: string,
  issues: GitHubIssue[],
  token: string,
  config: Partial<GitHubAutomationConfig> = {}
): Promise<{
  total: number;
  assigned: number;
  skipped: number;
  failed: number;
  results: AssignmentResult[];
}> {
  const results: AssignmentResult[] = [];
  let assigned = 0;
  let skipped = 0;
  let failed = 0;

  for (const issue of issues) {
    const result = await assignIssue(owner, repo, issue, token, config);
    results.push(result);

    if (result.success) {
      assigned++;
    } else if (result.error?.includes('below threshold') || result.error?.includes('No matching')) {
      skipped++;
    } else {
      failed++;
    }

    // Rate limiting - pause between requests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return {
    total: issues.length,
    assigned,
    skipped,
    failed,
    results,
  };
}

/**
 * Get assignment recommendation without making changes
 */
export async function getAssignmentRecommendation(
  issue: GitHubIssue,
  agentsDir?: string
): Promise<{
  recommended: AgentMatch | null;
  alternatives: AgentMatch[];
  suggestedLabels: string[];
  confidence: 'high' | 'medium' | 'low' | 'none';
}> {
  const analysis = await analyzeIssue(issue, agentsDir);
  const firstMatch = analysis.agentMatches[0];

  if (!firstMatch) {
    return {
      recommended: null,
      alternatives: [],
      suggestedLabels: analysis.suggestedLabels,
      confidence: 'none',
    };
  }

  return {
    recommended: firstMatch,
    alternatives: analysis.agentMatches.slice(1, 4),
    suggestedLabels: analysis.suggestedLabels,
    confidence: firstMatch.confidence,
  };
}

/**
 * Check if an issue should be excluded from auto-assignment
 */
export function shouldExcludeIssue(
  issue: GitHubIssue,
  excludeLabels: string[] = []
): { exclude: boolean; reason?: string } {
  // Check for exclude labels
  for (const label of issue.labels) {
    if (excludeLabels.includes(label.name.toLowerCase())) {
      return { exclude: true, reason: `Has excluded label: ${label.name}` };
    }
  }

  // Check if already assigned
  if (issue.assignees && issue.assignees.length > 0) {
    return { exclude: true, reason: 'Issue already has assignees' };
  }

  // Check if closed
  if (issue.state === 'closed') {
    return { exclude: true, reason: 'Issue is closed' };
  }

  return { exclude: false };
}

/**
 * Process webhook event for auto-assignment
 */
export async function processIssueEvent(
  action: string,
  issue: GitHubIssue,
  owner: string,
  repo: string,
  token: string,
  config: GitHubAutomationConfig
): Promise<{ processed: boolean; result?: AssignmentResult; reason?: string }> {
  // Only process opened issues
  if (action !== 'opened') {
    return { processed: false, reason: `Ignoring action: ${action}` };
  }

  // Check if automation is enabled
  if (!config.enabled || !config.autoAssign) {
    return { processed: false, reason: 'Automation disabled' };
  }

  // Check exclusions
  const exclusion = shouldExcludeIssue(issue, config.excludeLabels);
  if (exclusion.exclude) {
    return { processed: false, reason: exclusion.reason };
  }

  // Assign the issue
  const result = await assignIssue(owner, repo, issue, token, config);

  return { processed: true, result };
}
