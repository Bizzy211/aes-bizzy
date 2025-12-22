/**
 * Project Detector
 *
 * Comprehensive detection logic to identify existing Claude Code installations,
 * sub-agents, hooks, skills, MCP servers, and configurations.
 */
import type { DetectionResult, ConfigAnalysis, Conflict, LegacySetupResult, AgentsDetectionResult, HooksDetectionResult, SkillsDetectionResult, MCPServersDetectionResult } from '../types/detection.js';
/**
 * Get the Claude directory path based on platform
 */
export declare function getClaudeDir(): string;
/**
 * Calculate MD5 hash of a file
 */
export declare function getFileHash(filePath: string): Promise<string>;
/**
 * Detect existing Claude Code installation
 */
export declare function detectExistingSetup(projectRoot?: string): Promise<DetectionResult>;
/**
 * Analyze existing configuration against new requirements
 */
export declare function analyzeExistingConfig(settingsPath: string): Promise<ConfigAnalysis>;
/**
 * Detect conflicts between existing and new configurations
 */
export declare function detectConflicts(existing: DetectionResult, newAgents: string[], newHooks: string[], newSkills: string[], newMCPServers: string[]): Promise<Conflict[]>;
/**
 * Detect agents with categorization
 */
export declare function detectAgents(agentsDir?: string): Promise<AgentsDetectionResult>;
/**
 * Detect hooks with categorization
 */
export declare function detectHooks(hooksDir?: string): Promise<HooksDetectionResult>;
/**
 * Detect skills with categorization
 */
export declare function detectSkills(skillsDir?: string): Promise<SkillsDetectionResult>;
/**
 * Detect MCP servers using 'claude mcp list' command
 */
export declare function detectMCPServers(): Promise<MCPServersDetectionResult>;
/**
 * Detect legacy setup (pre-ecosystem.json installations)
 */
export declare function detectLegacySetup(): Promise<LegacySetupResult>;
/**
 * Update known agent hashes from repository data
 */
export declare function updateKnownAgentHashes(hashes: Map<string, string>): void;
/**
 * Update known hook hashes from repository data
 */
export declare function updateKnownHookHashes(hashes: Map<string, string>): void;
/**
 * Update known skill hashes from repository data
 */
export declare function updateKnownSkillHashes(hashes: Map<string, string>): void;
/**
 * Get a summary of the detection result
 */
export declare function getDetectionSummary(result: DetectionResult): string;
//# sourceMappingURL=project-detector.d.ts.map