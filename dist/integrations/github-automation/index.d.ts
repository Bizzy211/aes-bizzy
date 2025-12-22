/**
 * GitHub Automation Module
 *
 * Provides intelligent GitHub issue assignment and PR linking
 * for Claude sub-agents.
 */
export { loadAgentCapabilities, getAgentCapability, findAgentsByKeywords, findAgentsBySpecialization, getAvailableAgents, invalidateCapabilityCache, buildCapabilityMap, getAgentsDirectory, LABEL_SPECIALIZATION_MAP, } from './agent-capabilities.js';
export { analyzeIssue, getBestMatch, getTopMatches, analyzeIssues, extractKeywords, extractLabelKeywords, extractIssueKeywords, } from './issue-analyzer.js';
export { getAllLabelMappings, getAgentsForLabel, getAgentsForLabels, addCustomMapping, removeCustomMapping, setCustomMappings, clearCustomMappings, getCustomMappings, getDefaultMappings, validateMappings, suggestMappingsForLabel, getBestAgentForLabels, exportMappings, importMappings, getMappingStats, } from './label-mapping.js';
export { fetchIssue, fetchOpenIssues, postComment, addLabels, assignIssue, triageIssue, batchAssignIssues, getAssignmentRecommendation, shouldExcludeIssue, processIssueEvent, generateAssignmentComment, generateTriageComment, getAutomationLog, clearAutomationLog, } from './assignment-system.js';
export { extractIssueReferences, parsePRForIssues, determineLinkType, createPRLinkEvent, fetchPRDetails, getIssueTimeline, findLinkedPRs, postPRStatusComment, closeIssue, processPRMerge, processPROpen, processPRClose, syncPRStatus, generatePRSummary, } from './pr-linking.js';
export type { AgentCapability, GitHubIssue, GitHubLabel, GitHubActor, AgentMatch, IssueAnalysisResult, AssignmentResult, LabelMapping, PRLinkEvent, GitHubWebhookEventType, WebhookPayload, IssueWebhookPayload, PRWebhookPayload, RepositoryConfig, GitHubAutomationConfig, TriageResult, BatchTriageReport, AutomationLogEntry, AgentCapabilityCache, } from '../../types/github-automation.js';
//# sourceMappingURL=index.d.ts.map