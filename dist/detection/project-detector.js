/**
 * Project Detector
 *
 * Comprehensive detection logic to identify existing Claude Code installations,
 * sub-agents, hooks, skills, MCP servers, and configurations.
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { getPlatform } from '../utils/platform.js';
const execAsync = promisify(exec);
/**
 * Required MCP servers for the ecosystem
 */
const REQUIRED_MCP_SERVERS = [
    'github',
    'task-master-ai',
    'Context7',
    'firecrawl',
    'tavily-search-server',
    'repomix',
    'supabase',
    'ElevenLabs',
    'Magic UX UI',
    'project-management-supabase',
    'claude-in-chrome',
];
/**
 * Known agent hashes from the repository (for detecting modifications)
 * This would be populated from the repo-sync module
 */
const KNOWN_AGENT_HASHES = new Map();
/**
 * Known hook hashes from the repository
 */
const KNOWN_HOOK_HASHES = new Map();
/**
 * Known skill hashes from the repository
 */
const KNOWN_SKILL_HASHES = new Map();
/**
 * Get the Claude directory path based on platform
 */
export function getClaudeDir() {
    const platform = getPlatform();
    return platform.claudeDir;
}
/**
 * Calculate MD5 hash of a file
 */
export async function getFileHash(filePath) {
    try {
        const content = await fs.readFile(filePath);
        return crypto.createHash('md5').update(content).digest('hex');
    }
    catch {
        return '';
    }
}
/**
 * Check if a path exists
 */
async function pathExists(p) {
    try {
        await fs.access(p);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Count files in a directory matching a pattern
 */
async function countFiles(dir, extensions) {
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        return entries.filter((entry) => {
            if (!entry.isFile())
                return false;
            const ext = path.extname(entry.name).toLowerCase();
            return extensions.includes(ext);
        }).length;
    }
    catch {
        return 0;
    }
}
/**
 * Count skill directories (those containing SKILL.md)
 */
async function countSkills(dir) {
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        let count = 0;
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const skillFile = path.join(dir, entry.name, 'SKILL.md');
                if (await pathExists(skillFile)) {
                    count++;
                }
            }
        }
        return count;
    }
    catch {
        return 0;
    }
}
/**
 * Parse MCP servers from settings.json or .mcp.json
 */
async function parseMCPServers(settingsPath) {
    try {
        const content = await fs.readFile(settingsPath, 'utf-8');
        const settings = JSON.parse(content);
        // Check mcpServers key (settings.json format)
        if (settings.mcpServers && typeof settings.mcpServers === 'object') {
            return Object.keys(settings.mcpServers);
        }
        return [];
    }
    catch {
        return [];
    }
}
/**
 * Try to detect Beads installation and version
 */
async function detectBeads() {
    try {
        const { stdout } = await execAsync('bd version', { timeout: 5000 });
        const match = stdout.match(/\d+\.\d+\.\d+/);
        return {
            installed: true,
            version: match ? match[0] : undefined,
        };
    }
    catch {
        return { installed: false };
    }
}
/**
 * Try to detect Task Master configuration
 */
async function detectTaskMaster(projectRoot) {
    try {
        const configPath = path.join(projectRoot, '.taskmaster', 'config.json');
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        return {
            configured: true,
            model: config.models?.main?.id || config.models?.main,
        };
    }
    catch {
        return { configured: false };
    }
}
/**
 * Parse ecosystem.json for version info
 */
async function parseEcosystem(ecosystemPath) {
    try {
        const content = await fs.readFile(ecosystemPath, 'utf-8');
        const ecosystem = JSON.parse(content);
        return {
            exists: true,
            version: ecosystem.version,
        };
    }
    catch {
        return { exists: false };
    }
}
/**
 * Detect existing Claude Code installation
 */
export async function detectExistingSetup(projectRoot) {
    const claudeDir = getClaudeDir();
    const cwd = projectRoot || process.cwd();
    const result = {
        hasClaudeDir: false,
        claudeDirPath: claudeDir,
        agents: { exists: false, count: 0 },
        hooks: { exists: false, count: 0 },
        skills: { exists: false, count: 0 },
        mcpServers: { exists: false, servers: [] },
        ecosystem: { exists: false },
        beads: { installed: false },
        taskMaster: { configured: false },
        settingsJson: { exists: false },
    };
    // Check if .claude directory exists
    result.hasClaudeDir = await pathExists(claudeDir);
    if (!result.hasClaudeDir) {
        return result;
    }
    // Detect agents
    const agentsDir = path.join(claudeDir, 'agents');
    if (await pathExists(agentsDir)) {
        const count = await countFiles(agentsDir, ['.md']);
        result.agents = { exists: true, count };
    }
    // Detect hooks
    const hooksDir = path.join(claudeDir, 'hooks');
    if (await pathExists(hooksDir)) {
        const count = await countFiles(hooksDir, ['.py', '.sh', '.bat', '.ps1']);
        result.hooks = { exists: true, count };
    }
    // Detect skills
    const skillsDir = path.join(claudeDir, 'skills');
    if (await pathExists(skillsDir)) {
        const count = await countSkills(skillsDir);
        result.skills = { exists: true, count };
    }
    // Detect settings.json
    const settingsPath = path.join(claudeDir, 'settings.json');
    if (await pathExists(settingsPath)) {
        result.settingsJson = { exists: true, path: settingsPath };
        // Parse MCP servers from settings
        const servers = await parseMCPServers(settingsPath);
        result.mcpServers = { exists: servers.length > 0, servers };
    }
    // Check project-level .mcp.json
    const mcpJsonPath = path.join(cwd, '.mcp.json');
    if (await pathExists(mcpJsonPath)) {
        const projectServers = await parseMCPServers(mcpJsonPath);
        if (projectServers.length > 0) {
            result.mcpServers = {
                exists: true,
                servers: [...new Set([...result.mcpServers.servers, ...projectServers])],
            };
        }
    }
    // Detect ecosystem.json
    const ecosystemPath = path.join(claudeDir, 'ecosystem.json');
    result.ecosystem = await parseEcosystem(ecosystemPath);
    // Detect Beads
    result.beads = await detectBeads();
    // Detect Task Master
    result.taskMaster = await detectTaskMaster(cwd);
    return result;
}
/**
 * Analyze existing configuration against new requirements
 */
export async function analyzeExistingConfig(settingsPath) {
    const result = {
        existingMCPServers: [],
        missingMCPServers: [],
        conflictingSettings: [],
        tokenPresent: false,
        allowedTools: {
            existing: [],
            missing: [],
            custom: [],
        },
    };
    try {
        const content = await fs.readFile(settingsPath, 'utf-8');
        const settings = JSON.parse(content);
        // Extract existing MCP servers
        if (settings.mcpServers && typeof settings.mcpServers === 'object') {
            result.existingMCPServers = Object.keys(settings.mcpServers);
        }
        // Find missing servers
        result.missingMCPServers = REQUIRED_MCP_SERVERS.filter((server) => !result.existingMCPServers.includes(server));
        // Check for GitHub token
        result.tokenPresent = !!(process.env.GITHUB_TOKEN ||
            settings.github?.token ||
            settings.env?.GITHUB_TOKEN);
        // Extract allowedTools
        if (Array.isArray(settings.allowedTools)) {
            result.allowedTools.existing = settings.allowedTools;
        }
    }
    catch {
        // Settings file may not exist or be invalid JSON
    }
    return result;
}
/**
 * Detect conflicts between existing and new configurations
 */
export async function detectConflicts(existing, newAgents, newHooks, newSkills, newMCPServers) {
    const conflicts = [];
    const claudeDir = existing.claudeDirPath;
    // Check agent conflicts
    if (existing.agents.exists) {
        const agentsDir = path.join(claudeDir, 'agents');
        const existingAgents = await getAgentFiles(agentsDir);
        for (const agentName of newAgents) {
            const existingAgent = existingAgents.find((a) => a.name.toLowerCase() === agentName.toLowerCase());
            if (existingAgent) {
                // Check if the file has been modified
                const knownHash = KNOWN_AGENT_HASHES.get(agentName);
                const isModified = knownHash ? existingAgent.hash !== knownHash : true;
                conflicts.push({
                    type: 'agent',
                    name: agentName,
                    path: existingAgent.path,
                    existingValue: existingAgent.hash,
                    newValue: knownHash || 'new',
                    existingHash: existingAgent.hash,
                    newHash: knownHash,
                    isModified,
                    suggestedResolution: isModified ? 'backup' : 'replace',
                });
            }
        }
    }
    // Check hook conflicts
    if (existing.hooks.exists) {
        const hooksDir = path.join(claudeDir, 'hooks');
        const existingHooks = await getHookFiles(hooksDir);
        for (const hookName of newHooks) {
            const existingHook = existingHooks.find((h) => h.name.toLowerCase() === hookName.toLowerCase());
            if (existingHook) {
                const knownHash = KNOWN_HOOK_HASHES.get(hookName);
                const isModified = knownHash ? existingHook.hash !== knownHash : true;
                conflicts.push({
                    type: 'hook',
                    name: hookName,
                    path: existingHook.path,
                    existingValue: existingHook.hash,
                    newValue: knownHash || 'new',
                    existingHash: existingHook.hash,
                    newHash: knownHash,
                    isModified,
                    suggestedResolution: isModified ? 'backup' : 'replace',
                });
            }
        }
    }
    // Check skill conflicts
    if (existing.skills.exists) {
        const skillsDir = path.join(claudeDir, 'skills');
        const existingSkills = await getSkillFiles(skillsDir);
        for (const skillName of newSkills) {
            const existingSkill = existingSkills.find((s) => s.name.toLowerCase() === skillName.toLowerCase());
            if (existingSkill) {
                const knownHash = KNOWN_SKILL_HASHES.get(skillName);
                const isModified = knownHash ? existingSkill.hash !== knownHash : true;
                conflicts.push({
                    type: 'skill',
                    name: skillName,
                    path: existingSkill.path,
                    existingValue: existingSkill.hash,
                    newValue: knownHash || 'new',
                    existingHash: existingSkill.hash,
                    newHash: knownHash,
                    isModified,
                    suggestedResolution: isModified ? 'backup' : 'replace',
                });
            }
        }
    }
    // Check MCP server conflicts
    if (existing.mcpServers.exists) {
        for (const serverName of newMCPServers) {
            if (existing.mcpServers.servers.includes(serverName)) {
                conflicts.push({
                    type: 'mcp',
                    name: serverName,
                    existingValue: 'configured',
                    newValue: 'new-config',
                    isModified: true, // Assume potentially modified
                    suggestedResolution: 'merge',
                });
            }
        }
    }
    return conflicts;
}
/**
 * Get agent files with details
 */
async function getAgentFiles(agentsDir) {
    const agents = [];
    try {
        const entries = await fs.readdir(agentsDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isFile() && entry.name.endsWith('.md')) {
                const filePath = path.join(agentsDir, entry.name);
                const stats = await fs.stat(filePath);
                const hash = await getFileHash(filePath);
                agents.push({
                    name: entry.name.replace('.md', ''),
                    path: filePath,
                    hash,
                    lastModified: stats.mtime,
                    size: stats.size,
                });
            }
        }
    }
    catch {
        // Directory doesn't exist or can't be read
    }
    return agents;
}
/**
 * Get hook files with details
 */
async function getHookFiles(hooksDir) {
    const hooks = [];
    try {
        const entries = await fs.readdir(hooksDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                let hookType = null;
                if (ext === '.py')
                    hookType = 'python';
                else if (ext === '.sh')
                    hookType = 'bash';
                else if (ext === '.ps1')
                    hookType = 'powershell';
                else if (ext === '.bat')
                    hookType = 'batch';
                if (hookType) {
                    const filePath = path.join(hooksDir, entry.name);
                    const stats = await fs.stat(filePath);
                    const hash = await getFileHash(filePath);
                    hooks.push({
                        name: entry.name,
                        path: filePath,
                        type: hookType,
                        hash,
                        lastModified: stats.mtime,
                        size: stats.size,
                    });
                }
            }
        }
    }
    catch {
        // Directory doesn't exist or can't be read
    }
    return hooks;
}
/**
 * Get skill files with details
 */
async function getSkillFiles(skillsDir) {
    const skills = [];
    try {
        const entries = await fs.readdir(skillsDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const skillMdPath = path.join(skillsDir, entry.name, 'SKILL.md');
                if (await pathExists(skillMdPath)) {
                    const stats = await fs.stat(skillMdPath);
                    const hash = await getFileHash(skillMdPath);
                    skills.push({
                        name: entry.name,
                        path: skillMdPath,
                        hash,
                        lastModified: stats.mtime,
                        size: stats.size,
                    });
                }
            }
        }
    }
    catch {
        // Directory doesn't exist or can't be read
    }
    return skills;
}
/**
 * Detect agents with categorization
 */
export async function detectAgents(agentsDir) {
    const dir = agentsDir || path.join(getClaudeDir(), 'agents');
    const agentFiles = await getAgentFiles(dir);
    const result = {
        installed: [],
        modified: [],
        unknown: [],
    };
    for (const agent of agentFiles) {
        const knownHash = KNOWN_AGENT_HASHES.get(agent.name);
        if (!knownHash) {
            // Unknown agent (user-created or from unknown source)
            result.unknown.push(agent);
        }
        else if (agent.hash === knownHash) {
            // Matches known hash - installed from repo
            result.installed.push(agent);
        }
        else {
            // Has a known name but different hash - modified
            result.modified.push(agent);
        }
    }
    return result;
}
/**
 * Detect hooks with categorization
 */
export async function detectHooks(hooksDir) {
    const dir = hooksDir || path.join(getClaudeDir(), 'hooks');
    const hookFiles = await getHookFiles(dir);
    const result = {
        active: [],
        inactive: [],
        custom: [],
    };
    for (const hook of hookFiles) {
        const knownHash = KNOWN_HOOK_HASHES.get(hook.name);
        if (!knownHash) {
            // Custom hook (user-created)
            result.custom.push(hook);
        }
        else {
            // Known hook - check if active
            // For now, assume all found hooks are active
            result.active.push(hook);
        }
    }
    return result;
}
/**
 * Detect skills with categorization
 */
export async function detectSkills(skillsDir) {
    const dir = skillsDir || path.join(getClaudeDir(), 'skills');
    const skillFiles = await getSkillFiles(dir);
    const result = {
        installed: [],
        modified: [],
        unknown: [],
    };
    for (const skill of skillFiles) {
        const knownHash = KNOWN_SKILL_HASHES.get(skill.name);
        if (!knownHash) {
            result.unknown.push(skill);
        }
        else if (skill.hash === knownHash) {
            result.installed.push(skill);
        }
        else {
            result.modified.push(skill);
        }
    }
    return result;
}
/**
 * Detect MCP servers using 'claude mcp list' command
 */
export async function detectMCPServers() {
    const result = {
        configured: [],
        orphaned: [],
        missing: [],
    };
    try {
        const { stdout } = await execAsync('claude mcp list --json', { timeout: 10000 });
        const servers = JSON.parse(stdout);
        // Parse server list
        if (Array.isArray(servers)) {
            for (const server of servers) {
                const serverInfo = {
                    name: server.name || server.id,
                    status: server.status || 'active',
                    command: server.command,
                    args: server.args,
                    inEcosystem: REQUIRED_MCP_SERVERS.includes(server.name),
                    isOrphaned: false,
                };
                result.configured.push(serverInfo);
            }
        }
        // Find missing required servers
        const configuredNames = result.configured.map((s) => s.name);
        result.missing = REQUIRED_MCP_SERVERS.filter((name) => !configuredNames.includes(name));
    }
    catch {
        // Command not available or failed - try parsing settings.json instead
        try {
            const claudeDir = getClaudeDir();
            const settingsPath = path.join(claudeDir, 'settings.json');
            const content = await fs.readFile(settingsPath, 'utf-8');
            const settings = JSON.parse(content);
            if (settings.mcpServers) {
                for (const [name, config] of Object.entries(settings.mcpServers)) {
                    const serverConfig = config;
                    result.configured.push({
                        name,
                        status: 'active',
                        command: serverConfig.command,
                        args: serverConfig.args,
                        inEcosystem: REQUIRED_MCP_SERVERS.includes(name),
                        isOrphaned: false,
                    });
                }
            }
            const configuredNames = result.configured.map((s) => s.name);
            result.missing = REQUIRED_MCP_SERVERS.filter((name) => !configuredNames.includes(name));
        }
        catch {
            // No MCP server info available
            result.missing = [...REQUIRED_MCP_SERVERS];
        }
    }
    return result;
}
/**
 * Detect legacy setup (pre-ecosystem.json installations)
 */
export async function detectLegacySetup() {
    const claudeDir = getClaudeDir();
    const result = {
        isLegacy: false,
        migrationPath: 'none',
        oldStructure: {
            noEcosystemJson: false,
        },
        suggestedSteps: [],
    };
    // Check if .claude exists
    if (!(await pathExists(claudeDir))) {
        return result;
    }
    // Check for ecosystem.json
    const ecosystemPath = path.join(claudeDir, 'ecosystem.json');
    const hasEcosystem = await pathExists(ecosystemPath);
    result.oldStructure.noEcosystemJson = !hasEcosystem;
    // Check for old directory structures
    const customAgentsPath = path.join(claudeDir, 'custom-agents');
    result.oldStructure.customAgentsDir = await pathExists(customAgentsPath);
    // Check for old hooks format (e.g., hooks in different location)
    const oldHooksPath = path.join(claudeDir, 'user-hooks');
    result.oldStructure.oldHooksFormat = await pathExists(oldHooksPath);
    // Determine if legacy
    if (!hasEcosystem && (await pathExists(path.join(claudeDir, 'agents')))) {
        result.isLegacy = true;
        result.migrationPath = 'full';
        // Check timestamps to estimate version
        try {
            const stats = await fs.stat(claudeDir);
            const ageInDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
            if (ageInDays > 180) {
                result.legacyVersion = 'pre-1.0';
            }
            else if (ageInDays > 90) {
                result.legacyVersion = '1.x';
            }
        }
        catch {
            // Can't determine age
        }
        // Build suggested steps
        result.suggestedSteps = [
            'Create backup of existing installation',
            'Generate ecosystem.json from current state',
            'Migrate agents to new format',
            'Update hooks to new event system',
            'Configure MCP servers',
            'Validate migration',
        ];
        if (result.oldStructure.customAgentsDir) {
            result.suggestedSteps.push('Move custom-agents to agents directory');
        }
        if (result.oldStructure.oldHooksFormat) {
            result.suggestedSteps.push('Migrate user-hooks to hooks directory');
        }
    }
    return result;
}
/**
 * Update known agent hashes from repository data
 */
export function updateKnownAgentHashes(hashes) {
    KNOWN_AGENT_HASHES.clear();
    for (const [name, hash] of hashes) {
        KNOWN_AGENT_HASHES.set(name, hash);
    }
}
/**
 * Update known hook hashes from repository data
 */
export function updateKnownHookHashes(hashes) {
    KNOWN_HOOK_HASHES.clear();
    for (const [name, hash] of hashes) {
        KNOWN_HOOK_HASHES.set(name, hash);
    }
}
/**
 * Update known skill hashes from repository data
 */
export function updateKnownSkillHashes(hashes) {
    KNOWN_SKILL_HASHES.clear();
    for (const [name, hash] of hashes) {
        KNOWN_SKILL_HASHES.set(name, hash);
    }
}
/**
 * Get a summary of the detection result
 */
export function getDetectionSummary(result) {
    const lines = [];
    if (!result.hasClaudeDir) {
        lines.push('No existing Claude Code installation detected.');
        return lines.join('\n');
    }
    lines.push('Existing Installation Detected:');
    lines.push(`  Location: ${result.claudeDirPath}`);
    if (result.agents.exists) {
        lines.push(`  Agents: ${result.agents.count} installed`);
    }
    if (result.hooks.exists) {
        lines.push(`  Hooks: ${result.hooks.count} installed`);
    }
    if (result.skills.exists) {
        lines.push(`  Skills: ${result.skills.count} installed`);
    }
    if (result.mcpServers.exists) {
        lines.push(`  MCP Servers: ${result.mcpServers.servers.length} configured`);
    }
    if (result.ecosystem.exists) {
        lines.push(`  Ecosystem: v${result.ecosystem.version || 'unknown'}`);
    }
    if (result.beads.installed) {
        lines.push(`  Beads: v${result.beads.version || 'installed'}`);
    }
    if (result.taskMaster.configured) {
        lines.push(`  Task Master: ${result.taskMaster.model || 'configured'}`);
    }
    return lines.join('\n');
}
//# sourceMappingURL=project-detector.js.map