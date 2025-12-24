/**
 * Heimdall Installer
 *
 * Provides automated installation and setup of Heimdall persistent memory
 * system, including Docker/Qdrant setup and MCP server configuration.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DEFAULT_HEIMDALL_CONFIG, DEFAULT_QDRANT_CONFIG, } from '../types/heimdall.js';
import { isDockerInstalled, isDockerRunning, startQdrantContainer, getContainerStatus, isQdrantHealthy, pullQdrantImage, } from './docker-manager.js';
// ============================================================================
// Constants
// ============================================================================
const HEIMDALL_HOME_DIR = path.join(os.homedir(), '.heimdall');
const CONFIG_FILE = 'config.json';
const CLAUDE_MCP_CONFIG_PATHS = [
    path.join(os.homedir(), '.claude', 'claude_desktop_config.json'),
    path.join(os.homedir(), 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json'),
    path.join(os.homedir(), '.config', 'claude', 'config.json'),
];
// ============================================================================
// Installation Status
// ============================================================================
/**
 * Check the current installation status of Heimdall
 */
export async function getInstallStatus() {
    const issues = [];
    const recommendations = [];
    // Check Docker
    const dockerInstalled = await isDockerInstalled();
    if (!dockerInstalled) {
        issues.push('Docker is not installed');
        recommendations.push('Install Docker Desktop from https://docker.com/get-started');
    }
    let dockerRunning = false;
    if (dockerInstalled) {
        dockerRunning = await isDockerRunning();
        if (!dockerRunning) {
            issues.push('Docker daemon is not running');
            recommendations.push('Start Docker Desktop');
        }
    }
    // Check Qdrant container
    let qdrantRunning = false;
    if (dockerRunning) {
        const qdrantStatus = await getContainerStatus(DEFAULT_QDRANT_CONFIG.containerName);
        qdrantRunning = qdrantStatus.running && await isQdrantHealthy();
        if (!qdrantStatus.running) {
            issues.push('Qdrant container is not running');
            recommendations.push('Run: aes-bizzy heimdall start');
        }
        else if (!await isQdrantHealthy()) {
            issues.push('Qdrant is running but not healthy');
            recommendations.push('Check Qdrant logs: aes-bizzy heimdall logs');
        }
    }
    // Check MCP configuration
    const mcpConfigured = await isHeimdallMcpConfigured();
    if (!mcpConfigured) {
        issues.push('Heimdall MCP is not configured');
        recommendations.push('Run: aes-bizzy heimdall configure');
    }
    // Check Heimdall config file
    const configExists = await hasHeimdallConfig();
    if (!configExists && (qdrantRunning || mcpConfigured)) {
        issues.push('Heimdall config file is missing');
        recommendations.push('Run: aes-bizzy heimdall init');
    }
    // Check OpenAI API key for embeddings
    const hasEmbeddingKey = !!process.env.OPENAI_API_KEY;
    if (!hasEmbeddingKey) {
        issues.push('OPENAI_API_KEY not set (required for embeddings)');
        recommendations.push('Set OPENAI_API_KEY environment variable');
    }
    return {
        installed: dockerInstalled && qdrantRunning && mcpConfigured && issues.length === 0,
        qdrantRunning,
        mcpConfigured,
        issues,
        recommendations,
    };
}
/**
 * Check if Heimdall MCP is configured in Claude
 */
async function isHeimdallMcpConfigured() {
    for (const configPath of CLAUDE_MCP_CONFIG_PATHS) {
        try {
            if (fs.existsSync(configPath)) {
                const content = fs.readFileSync(configPath, 'utf-8');
                const config = JSON.parse(content);
                // Check various possible locations
                if (config.mcpServers?.heimdall || config.mcpServers?.['heimdall-mcp']) {
                    return true;
                }
            }
        }
        catch {
            // Skip invalid config files
        }
    }
    // Also check project-level .mcp.json
    const projectMcp = path.join(process.cwd(), '.mcp.json');
    try {
        if (fs.existsSync(projectMcp)) {
            const content = fs.readFileSync(projectMcp, 'utf-8');
            const config = JSON.parse(content);
            if (config.mcpServers?.heimdall || config.mcpServers?.['heimdall-mcp']) {
                return true;
            }
        }
    }
    catch {
        // Skip if can't read
    }
    return false;
}
/**
 * Check if Heimdall config exists
 */
async function hasHeimdallConfig() {
    const configPath = path.join(HEIMDALL_HOME_DIR, CONFIG_FILE);
    return fs.existsSync(configPath);
}
// ============================================================================
// Installation
// ============================================================================
/**
 * Install Heimdall with all components
 */
export async function installHeimdall(options = {}) {
    const completedSteps = [];
    const failedSteps = [];
    const qdrantConfig = {
        ...DEFAULT_QDRANT_CONFIG,
        ...options.qdrantConfig,
    };
    const heimdallConfig = {
        ...DEFAULT_HEIMDALL_CONFIG,
        ...options.heimdallConfig,
    };
    // Step 1: Check Docker (unless skipped)
    if (!options.skipDockerCheck) {
        const dockerInstalled = await isDockerInstalled();
        if (!dockerInstalled) {
            failedSteps.push({
                step: 'Check Docker installation',
                error: 'Docker is not installed. Please install Docker Desktop first.',
            });
            return {
                success: false,
                completedSteps,
                failedSteps,
                error: 'Docker is not installed',
            };
        }
        completedSteps.push('Docker installation verified');
        const dockerRunning = await isDockerRunning();
        if (!dockerRunning) {
            failedSteps.push({
                step: 'Check Docker daemon',
                error: 'Docker daemon is not running. Please start Docker Desktop.',
            });
            return {
                success: false,
                completedSteps,
                failedSteps,
                error: 'Docker daemon is not running',
            };
        }
        completedSteps.push('Docker daemon running');
    }
    // Step 2: Create Heimdall directory
    try {
        ensureHeimdallDirectory();
        completedSteps.push('Created Heimdall directory');
    }
    catch (error) {
        failedSteps.push({
            step: 'Create Heimdall directory',
            error: error instanceof Error ? error.message : String(error),
        });
    }
    // Step 3: Pull Qdrant image
    try {
        const pullResult = await pullQdrantImage(qdrantConfig.imageTag);
        if (pullResult.success) {
            completedSteps.push('Pulled Qdrant Docker image');
        }
        else {
            failedSteps.push({
                step: 'Pull Qdrant image',
                error: pullResult.error || 'Unknown error',
            });
        }
    }
    catch (error) {
        failedSteps.push({
            step: 'Pull Qdrant image',
            error: error instanceof Error ? error.message : String(error),
        });
    }
    // Step 4: Start Qdrant container
    try {
        const startResult = await startQdrantContainer(qdrantConfig);
        if (startResult.success) {
            completedSteps.push('Started Qdrant container');
        }
        else {
            failedSteps.push({
                step: 'Start Qdrant container',
                error: startResult.error || 'Unknown error',
            });
        }
    }
    catch (error) {
        failedSteps.push({
            step: 'Start Qdrant container',
            error: error instanceof Error ? error.message : String(error),
        });
    }
    // Step 5: Save Heimdall configuration
    try {
        saveHeimdallConfig(heimdallConfig);
        completedSteps.push('Saved Heimdall configuration');
    }
    catch (error) {
        failedSteps.push({
            step: 'Save configuration',
            error: error instanceof Error ? error.message : String(error),
        });
    }
    // Step 6: Configure MCP (unless skipped)
    if (!options.skipMcpConfig) {
        try {
            const mcpConfigured = await configureHeimdallMcp(heimdallConfig);
            if (mcpConfigured) {
                completedSteps.push('Configured Heimdall MCP');
            }
            else {
                failedSteps.push({
                    step: 'Configure MCP',
                    error: 'Could not find Claude MCP config file',
                });
            }
        }
        catch (error) {
            failedSteps.push({
                step: 'Configure MCP',
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    // Step 7: Create default collection in Qdrant
    try {
        await ensureDefaultCollection(heimdallConfig);
        completedSteps.push('Created default memory collection');
    }
    catch (error) {
        failedSteps.push({
            step: 'Create collection',
            error: error instanceof Error ? error.message : String(error),
        });
    }
    const success = failedSteps.length === 0;
    return {
        success,
        completedSteps,
        failedSteps,
        config: heimdallConfig,
        error: success ? undefined : `${failedSteps.length} step(s) failed`,
    };
}
/**
 * Uninstall Heimdall
 */
export async function uninstallHeimdall(removeData = false) {
    const { removeQdrantContainer } = await import('./docker-manager.js');
    try {
        // Remove container
        await removeQdrantContainer(DEFAULT_QDRANT_CONFIG.containerName, removeData);
        // Remove config (but not data unless requested)
        if (removeData) {
            const heimdallDir = HEIMDALL_HOME_DIR;
            if (fs.existsSync(heimdallDir)) {
                fs.rmSync(heimdallDir, { recursive: true, force: true });
            }
        }
        else {
            // Just remove config file
            const configPath = path.join(HEIMDALL_HOME_DIR, CONFIG_FILE);
            if (fs.existsSync(configPath)) {
                fs.unlinkSync(configPath);
            }
        }
        return { success: true };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
// ============================================================================
// Configuration
// ============================================================================
/**
 * Ensure Heimdall home directory exists
 */
function ensureHeimdallDirectory() {
    if (!fs.existsSync(HEIMDALL_HOME_DIR)) {
        fs.mkdirSync(HEIMDALL_HOME_DIR, { recursive: true });
    }
}
/**
 * Save Heimdall configuration
 */
export function saveHeimdallConfig(config) {
    ensureHeimdallDirectory();
    const configPath = path.join(HEIMDALL_HOME_DIR, CONFIG_FILE);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}
/**
 * Load Heimdall configuration
 */
export function loadHeimdallConfig() {
    const configPath = path.join(HEIMDALL_HOME_DIR, CONFIG_FILE);
    try {
        if (fs.existsSync(configPath)) {
            const content = fs.readFileSync(configPath, 'utf-8');
            return JSON.parse(content);
        }
    }
    catch {
        // Return null if config is invalid
    }
    return null;
}
/**
 * Configure Heimdall in Claude MCP config
 */
async function configureHeimdallMcp(_config) {
    // Find existing Claude config
    let targetPath = null;
    for (const configPath of CLAUDE_MCP_CONFIG_PATHS) {
        if (fs.existsSync(configPath)) {
            targetPath = configPath;
            break;
        }
    }
    // Or use project-level config
    if (!targetPath) {
        const projectMcp = path.join(process.cwd(), '.mcp.json');
        if (fs.existsSync(projectMcp)) {
            targetPath = projectMcp;
        }
    }
    if (!targetPath) {
        // Create project-level config if no config exists
        targetPath = path.join(process.cwd(), '.mcp.json');
    }
    try {
        let mcpConfig = {};
        if (fs.existsSync(targetPath)) {
            const content = fs.readFileSync(targetPath, 'utf-8');
            mcpConfig = JSON.parse(content);
        }
        // Ensure mcpServers object exists
        if (!mcpConfig.mcpServers) {
            mcpConfig.mcpServers = {};
        }
        // Add Heimdall configuration
        const servers = mcpConfig.mcpServers;
        servers['heimdall'] = {
            command: 'npx',
            args: ['-y', '@anthropic/heimdall-mcp'],
            env: {
                QDRANT_URL: DEFAULT_HEIMDALL_CONFIG.qdrantUrl,
                COLLECTION_NAME: DEFAULT_HEIMDALL_CONFIG.collectionName,
                OPENAI_API_KEY: '${OPENAI_API_KEY}',
            },
        };
        // Write config
        fs.writeFileSync(targetPath, JSON.stringify(mcpConfig, null, 2));
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Ensure the default collection exists in Qdrant
 */
async function ensureDefaultCollection(config) {
    const baseUrl = config.qdrantUrl;
    const collectionName = config.collectionName;
    // Check if collection exists
    const checkResponse = await fetch(`${baseUrl}/collections/${collectionName}`, {
        signal: AbortSignal.timeout(5000),
    });
    if (checkResponse.status === 404) {
        // Create collection with appropriate vector size
        // text-embedding-3-small has 1536 dimensions
        const vectorSize = config.embeddingModel.includes('large') ? 3072 : 1536;
        await fetch(`${baseUrl}/collections/${collectionName}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                vectors: {
                    size: vectorSize,
                    distance: 'Cosine',
                },
            }),
            signal: AbortSignal.timeout(10000),
        });
    }
}
// ============================================================================
// Quick Setup
// ============================================================================
/**
 * Quick check if Heimdall is ready to use
 */
export async function isHeimdallReady() {
    const status = await getInstallStatus();
    return status.installed;
}
/**
 * Auto-detect and fix issues with Heimdall installation
 */
export async function autoFixHeimdall() {
    const status = await getInstallStatus();
    const fixed = [];
    // Try to start Qdrant if Docker is running but Qdrant isn't
    if (!status.qdrantRunning) {
        const dockerRunning = await isDockerRunning();
        if (dockerRunning) {
            const result = await startQdrantContainer();
            if (result.success) {
                fixed.push('Started Qdrant container');
            }
        }
    }
    // Try to configure MCP if not configured
    if (!status.mcpConfigured) {
        const config = loadHeimdallConfig() || DEFAULT_HEIMDALL_CONFIG;
        const configured = await configureHeimdallMcp(config);
        if (configured) {
            fixed.push('Configured Heimdall MCP');
        }
    }
    // Re-check status
    const newStatus = await getInstallStatus();
    return {
        fixed,
        remaining: newStatus.issues,
    };
}
//# sourceMappingURL=installer.js.map