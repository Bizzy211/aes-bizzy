/**
 * GitHub Automation Module
 *
 * Provides intelligent GitHub issue assignment and PR linking
 * for Claude sub-agents.
 */
// Agent capability mapping
export { loadAgentCapabilities, getAgentCapability, findAgentsByKeywords, findAgentsBySpecialization, getAvailableAgents, invalidateCapabilityCache, buildCapabilityMap, getAgentsDirectory, LABEL_SPECIALIZATION_MAP, } from './agent-capabilities.js';
// Issue analysis
export { analyzeIssue, getBestMatch, getTopMatches, analyzeIssues, extractKeywords, extractLabelKeywords, extractIssueKeywords, } from './issue-analyzer.js';
// Label mapping
export { getAllLabelMappings, getAgentsForLabel, getAgentsForLabels, addCustomMapping, removeCustomMapping, setCustomMappings, clearCustomMappings, getCustomMappings, getDefaultMappings, validateMappings, suggestMappingsForLabel, getBestAgentForLabels, exportMappings, importMappings, getMappingStats, } from './label-mapping.js';
// Assignment system
export { fetchIssue, fetchOpenIssues, postComment, addLabels, assignIssue, triageIssue, batchAssignIssues, getAssignmentRecommendation, shouldExcludeIssue, processIssueEvent, generateAssignmentComment, generateTriageComment, getAutomationLog, clearAutomationLog, } from './assignment-system.js';
// PR linking
export { extractIssueReferences, parsePRForIssues, determineLinkType, createPRLinkEvent, fetchPRDetails, getIssueTimeline, findLinkedPRs, postPRStatusComment, closeIssue, processPRMerge, processPROpen, processPRClose, syncPRStatus, generatePRSummary, } from './pr-linking.js';
//# sourceMappingURL=index.js.map