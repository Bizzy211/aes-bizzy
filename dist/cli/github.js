/**
 * GitHub Automation CLI Commands
 *
 * Commands for GitHub issue triage, assignment, and automation.
 */
import chalk from 'chalk';
import { createLogger } from '../utils/logger.js';
import { fetchIssue, fetchOpenIssues, analyzeIssue, triageIssue, assignIssue, batchAssignIssues, getAssignmentRecommendation, loadAgentCapabilities, getAvailableAgents, getMappingStats, getAutomationLog, } from '../integrations/github-automation/index.js';
const logger = createLogger({ context: { command: 'github' } });
/**
 * Get GitHub token from environment
 */
function getToken(options) {
    return options.token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;
}
/**
 * Parse owner/repo from string
 */
function parseRepo(repoStr) {
    const parts = repoStr.split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
        return null;
    }
    return { owner: parts[0], repo: parts[1] };
}
/**
 * Format agent match for display
 */
function formatAgentMatch(match) {
    const colorMap = {
        high: chalk.green,
        medium: chalk.yellow,
        low: chalk.red,
    };
    const confidenceColor = colorMap[match.confidence] || chalk.white;
    return [
        `  ${chalk.bold(match.agentName)}`,
        `    Score: ${confidenceColor(`${match.score}%`)} (${match.confidence})`,
        match.matchedKeywords.length > 0
            ? `    Keywords: ${match.matchedKeywords.slice(0, 5).join(', ')}`
            : '',
        match.matchReason ? `    Reason: ${match.matchReason}` : '',
    ].filter(Boolean).join('\n');
}
/**
 * Format triage result for display
 */
function formatTriageResult(result) {
    const lines = [
        chalk.bold(`Issue #${result.issue.number}: ${result.issue.title}`),
        '',
    ];
    if (result.requiresManualReview) {
        lines.push(chalk.yellow('⚠️  Requires manual review'));
        lines.push('');
    }
    if (result.suggestedAgents.length > 0) {
        lines.push(chalk.bold('Suggested Agents:'));
        for (const agent of result.suggestedAgents.slice(0, 3)) {
            lines.push(formatAgentMatch(agent));
        }
        lines.push('');
    }
    if (result.suggestedLabels.length > 0) {
        lines.push(chalk.bold('Suggested Labels:'));
        lines.push(`  ${result.suggestedLabels.join(', ')}`);
        lines.push('');
    }
    return lines.join('\n');
}
/**
 * Analyze a single issue
 */
export async function analyzeCommand(repoStr, issueNumber, options) {
    const token = getToken(options);
    if (!token) {
        logger.error('GitHub token required. Set GITHUB_TOKEN environment variable or use --token');
        return;
    }
    const parsed = parseRepo(repoStr);
    if (!parsed) {
        logger.error('Invalid repository format. Use owner/repo');
        return;
    }
    logger.info(`Analyzing issue #${issueNumber} in ${repoStr}...`);
    const issue = await fetchIssue(parsed.owner, parsed.repo, issueNumber, token);
    if (!issue) {
        logger.error(`Issue #${issueNumber} not found`);
        return;
    }
    const analysis = await analyzeIssue(issue);
    if (options.json) {
        console.log(JSON.stringify(analysis, null, 2));
        return;
    }
    console.log();
    console.log(chalk.bold.blue(`Issue #${issue.number}: ${issue.title}`));
    console.log(chalk.dim(issue.html_url));
    console.log();
    if (analysis.extractedKeywords.length > 0) {
        console.log(chalk.bold('Extracted Keywords:'));
        console.log(`  ${analysis.extractedKeywords.slice(0, 15).join(', ')}`);
        console.log();
    }
    if (analysis.agentMatches.length > 0) {
        console.log(chalk.bold('Agent Matches:'));
        for (const match of analysis.agentMatches.slice(0, 5)) {
            console.log(formatAgentMatch(match));
        }
        console.log();
    }
    else {
        console.log(chalk.yellow('No matching agents found'));
        console.log();
    }
    if (analysis.suggestedLabels.length > 0) {
        console.log(chalk.bold('Suggested Labels:'));
        console.log(`  ${analysis.suggestedLabels.join(', ')}`);
        console.log();
    }
}
/**
 * Triage a single issue
 */
export async function triageCommand(repoStr, issueNumber, options) {
    const token = getToken(options);
    if (!token) {
        logger.error('GitHub token required');
        return;
    }
    const parsed = parseRepo(repoStr);
    if (!parsed) {
        logger.error('Invalid repository format. Use owner/repo');
        return;
    }
    logger.info(`Triaging issue #${issueNumber}...`);
    const issue = await fetchIssue(parsed.owner, parsed.repo, issueNumber, token);
    if (!issue) {
        logger.error(`Issue #${issueNumber} not found`);
        return;
    }
    const result = await triageIssue(issue);
    if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
    }
    console.log();
    console.log(formatTriageResult(result));
}
/**
 * Assign an issue to agents
 */
export async function assignCommand(repoStr, issueNumber, options) {
    const token = getToken(options);
    if (!token) {
        logger.error('GitHub token required');
        return;
    }
    const parsed = parseRepo(repoStr);
    if (!parsed) {
        logger.error('Invalid repository format. Use owner/repo');
        return;
    }
    const issue = await fetchIssue(parsed.owner, parsed.repo, issueNumber, token);
    if (!issue) {
        logger.error(`Issue #${issueNumber} not found`);
        return;
    }
    if (options.dryRun) {
        logger.info('Dry run - analyzing without making changes...');
        const recommendation = await getAssignmentRecommendation(issue);
        console.log();
        console.log(chalk.bold(`Issue #${issue.number}: ${issue.title}`));
        console.log();
        if (recommendation.recommended) {
            console.log(chalk.bold('Would assign to:'));
            console.log(formatAgentMatch(recommendation.recommended));
            console.log();
            if (recommendation.alternatives.length > 0) {
                console.log(chalk.bold('Alternatives:'));
                for (const alt of recommendation.alternatives) {
                    console.log(formatAgentMatch(alt));
                }
            }
        }
        else {
            console.log(chalk.yellow('No suitable agent found for assignment'));
        }
        return;
    }
    logger.info(`Assigning issue #${issueNumber}...`);
    const config = {
        confidenceThreshold: options.threshold || 40,
        autoAssign: true,
        requireConfirmation: false,
    };
    const result = await assignIssue(parsed.owner, parsed.repo, issue, token, config);
    if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
    }
    console.log();
    if (result.success) {
        console.log(chalk.green('✅ Issue assigned successfully'));
        console.log(`  Agents: ${result.assignedAgents.join(', ')}`);
        console.log(`  Confidence: ${result.confidence}%`);
    }
    else {
        console.log(chalk.red('❌ Assignment failed'));
        console.log(`  Error: ${result.error}`);
    }
    console.log();
}
/**
 * Batch triage open issues
 */
export async function batchTriageCommand(repoStr, options) {
    const token = getToken(options);
    if (!token) {
        logger.error('GitHub token required');
        return;
    }
    const parsed = parseRepo(repoStr);
    if (!parsed) {
        logger.error('Invalid repository format. Use owner/repo');
        return;
    }
    logger.info(`Fetching open issues from ${repoStr}...`);
    const issues = await fetchOpenIssues(parsed.owner, parsed.repo, token, {
        labels: options.labels,
        state: options.state || 'open',
        perPage: options.limit || 30,
    });
    if (issues.length === 0) {
        console.log(chalk.yellow('No issues found matching criteria'));
        return;
    }
    logger.info(`Found ${issues.length} issues. Triaging...`);
    const results = [];
    for (const issue of issues) {
        const result = await triageIssue(issue);
        results.push(result);
        if (options.verbose) {
            console.log();
            console.log(formatTriageResult(result));
        }
    }
    if (options.json) {
        console.log(JSON.stringify(results, null, 2));
        return;
    }
    // Summary
    console.log();
    console.log(chalk.bold('Triage Summary'));
    console.log('─'.repeat(40));
    console.log(`Total issues: ${results.length}`);
    console.log(`Needs review: ${results.filter((r) => r.requiresManualReview).length}`);
    console.log(`Has matches: ${results.filter((r) => r.suggestedAgents.length > 0).length}`);
    console.log();
    // Top recommendations
    const withMatches = results.filter((r) => r.suggestedAgents.length > 0);
    if (withMatches.length > 0) {
        console.log(chalk.bold('Top Recommendations:'));
        for (const result of withMatches.slice(0, 5)) {
            const best = result.suggestedAgents[0];
            if (best) {
                console.log(`  #${result.issue.number}: ${result.issue.title.slice(0, 40)}... → ${chalk.cyan(best.agentName)}`);
            }
        }
    }
    console.log();
}
/**
 * Batch assign open issues
 */
export async function batchAssignCommand(repoStr, options) {
    const token = getToken(options);
    if (!token) {
        logger.error('GitHub token required');
        return;
    }
    const parsed = parseRepo(repoStr);
    if (!parsed) {
        logger.error('Invalid repository format. Use owner/repo');
        return;
    }
    if (options.dryRun) {
        logger.info('Dry run - fetching issues for preview...');
        await batchTriageCommand(repoStr, options);
        return;
    }
    logger.info(`Fetching open issues from ${repoStr}...`);
    const issues = await fetchOpenIssues(parsed.owner, parsed.repo, token, {
        labels: options.labels,
        state: 'open',
        perPage: options.limit || 30,
    });
    if (issues.length === 0) {
        console.log(chalk.yellow('No issues found matching criteria'));
        return;
    }
    logger.info(`Found ${issues.length} issues. Assigning...`);
    const config = {
        confidenceThreshold: options.threshold || 40,
        autoAssign: true,
        requireConfirmation: false,
    };
    const results = await batchAssignIssues(parsed.owner, parsed.repo, issues, token, config);
    if (options.json) {
        console.log(JSON.stringify(results, null, 2));
        return;
    }
    console.log();
    console.log(chalk.bold('Batch Assignment Results'));
    console.log('─'.repeat(40));
    console.log(`Total: ${results.total}`);
    console.log(chalk.green(`Assigned: ${results.assigned}`));
    console.log(chalk.yellow(`Skipped: ${results.skipped}`));
    console.log(chalk.red(`Failed: ${results.failed}`));
    console.log();
}
/**
 * List available agents
 */
export async function listAgentsCommand(options) {
    logger.info('Loading agent capabilities...');
    const capabilities = await loadAgentCapabilities();
    const agents = await getAvailableAgents();
    if (options.json) {
        const data = {};
        for (const [name, cap] of capabilities) {
            data[name] = {
                description: cap.description.slice(0, 100) + '...',
                specializations: cap.specializations,
                keywords: cap.keywords.slice(0, 10),
            };
        }
        console.log(JSON.stringify(data, null, 2));
        return;
    }
    console.log();
    console.log(chalk.bold(`Available Agents (${agents.length})`));
    console.log('─'.repeat(50));
    for (const name of agents.sort()) {
        const cap = capabilities.get(name);
        if (cap) {
            console.log();
            console.log(chalk.bold.cyan(name));
            console.log(`  ${cap.description.slice(0, 80)}...`);
            if (cap.specializations.length > 0) {
                console.log(chalk.dim(`  Specializations: ${cap.specializations.join(', ')}`));
            }
        }
    }
    console.log();
}
/**
 * Show mapping statistics
 */
export async function mappingStatsCommand(options) {
    const stats = getMappingStats();
    if (options.json) {
        console.log(JSON.stringify(stats, null, 2));
        return;
    }
    console.log();
    console.log(chalk.bold('Label Mapping Statistics'));
    console.log('─'.repeat(40));
    console.log(`Total mappings: ${stats.totalMappings}`);
    console.log(`Default mappings: ${stats.defaultMappings}`);
    console.log(`Custom mappings: ${stats.customMappings}`);
    console.log(`Unique agents: ${stats.uniqueAgents}`);
    console.log(`Unique labels: ${stats.uniqueLabels}`);
    console.log();
}
/**
 * Show automation log
 */
export async function logCommand(options) {
    const limit = options.limit || 20;
    const entries = getAutomationLog(limit);
    if (options.json) {
        console.log(JSON.stringify(entries, null, 2));
        return;
    }
    if (entries.length === 0) {
        console.log(chalk.yellow('No automation log entries'));
        return;
    }
    console.log();
    console.log(chalk.bold(`Automation Log (last ${entries.length} entries)`));
    console.log('─'.repeat(60));
    for (const entry of entries) {
        const resultColor = {
            success: chalk.green,
            failure: chalk.red,
            skipped: chalk.yellow,
        }[entry.result];
        const time = new Date(entry.timestamp).toLocaleString();
        console.log(`${chalk.dim(time)} ${entry.eventType} ${resultColor(entry.result)}`);
        if (entry.issueUrl) {
            console.log(`  Issue: ${entry.issueUrl}`);
        }
        if (entry.assignedAgents && entry.assignedAgents.length > 0) {
            console.log(`  Agents: ${entry.assignedAgents.join(', ')}`);
        }
        if (entry.details) {
            console.log(`  ${chalk.dim(entry.details)}`);
        }
        console.log();
    }
}
/**
 * Run GitHub command
 */
export async function runGitHub(subcommand, args, options) {
    switch (subcommand) {
        case 'analyze': {
            const repo = args[0];
            const issueNum = args[1];
            if (!repo || !issueNum) {
                logger.error('Usage: github analyze <owner/repo> <issue-number>');
                return;
            }
            await analyzeCommand(repo, parseInt(issueNum, 10), options);
            break;
        }
        case 'triage': {
            const repo = args[0];
            const issueNum = args[1];
            if (!repo || !issueNum) {
                logger.error('Usage: github triage <owner/repo> <issue-number>');
                return;
            }
            await triageCommand(repo, parseInt(issueNum, 10), options);
            break;
        }
        case 'assign': {
            const repo = args[0];
            const issueNum = args[1];
            if (!repo || !issueNum) {
                logger.error('Usage: github assign <owner/repo> <issue-number>');
                return;
            }
            await assignCommand(repo, parseInt(issueNum, 10), options);
            break;
        }
        case 'batch-triage': {
            const repo = args[0];
            if (!repo) {
                logger.error('Usage: github batch-triage <owner/repo>');
                return;
            }
            await batchTriageCommand(repo, options);
            break;
        }
        case 'batch-assign': {
            const repo = args[0];
            if (!repo) {
                logger.error('Usage: github batch-assign <owner/repo>');
                return;
            }
            await batchAssignCommand(repo, options);
            break;
        }
        case 'agents':
            await listAgentsCommand(options);
            break;
        case 'mappings':
            await mappingStatsCommand(options);
            break;
        case 'log':
            await logCommand(options);
            break;
        default:
            console.log(chalk.bold('GitHub Automation Commands'));
            console.log();
            console.log('Usage: jhc github <command> [options]');
            console.log();
            console.log('Commands:');
            console.log('  analyze <repo> <issue>     Analyze an issue for agent matching');
            console.log('  triage <repo> <issue>      Triage an issue with recommendations');
            console.log('  assign <repo> <issue>      Assign agents to an issue');
            console.log('  batch-triage <repo>        Triage all open issues');
            console.log('  batch-assign <repo>        Assign all open issues');
            console.log('  agents                     List available agents');
            console.log('  mappings                   Show label mapping statistics');
            console.log('  log                        Show automation log');
            console.log();
            console.log('Options:');
            console.log('  --token <token>      GitHub token (or set GITHUB_TOKEN)');
            console.log('  --threshold <n>      Confidence threshold (default: 40)');
            console.log('  --limit <n>          Max issues to process');
            console.log('  --labels <labels>    Filter by labels (comma-separated)');
            console.log('  --dry-run            Preview without making changes');
            console.log('  --json               Output as JSON');
            console.log('  --verbose            Show detailed output');
            console.log();
    }
}
//# sourceMappingURL=github.js.map