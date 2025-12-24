/**
 * Docker Manager for Qdrant Container
 *
 * Manages the lifecycle of the Qdrant Docker container used by Heimdall
 * for vector storage and semantic search capabilities.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  QdrantConfig,
  QdrantStatus,
  DEFAULT_QDRANT_CONFIG,
} from '../types/heimdall.js';

const execAsync = promisify(exec);

// ============================================================================
// Constants
// ============================================================================

const DOCKER_TIMEOUT = 30000; // 30 seconds for docker operations
const HEALTH_CHECK_RETRIES = 10;
const HEALTH_CHECK_INTERVAL = 1000; // 1 second

// ============================================================================
// Docker Detection
// ============================================================================

/**
 * Check if Docker is installed and accessible
 */
export async function isDockerInstalled(): Promise<boolean> {
  try {
    await execAsync('docker --version', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Docker daemon is running
 */
export async function isDockerRunning(): Promise<boolean> {
  try {
    await execAsync('docker info', { timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get Docker version information
 */
export async function getDockerVersion(): Promise<string | null> {
  try {
    const { stdout } = await execAsync('docker --version', { timeout: 5000 });
    return stdout.trim();
  } catch {
    return null;
  }
}

// ============================================================================
// Container Management
// ============================================================================

/**
 * Expand tilde in path to home directory
 */
function expandPath(p: string): string {
  if (p.startsWith('~')) {
    return path.join(os.homedir(), p.slice(1));
  }
  return p;
}

/**
 * Ensure the Qdrant data directory exists
 */
async function ensureDataDirectory(dataPath: string): Promise<void> {
  const expandedPath = expandPath(dataPath);
  if (!fs.existsSync(expandedPath)) {
    fs.mkdirSync(expandedPath, { recursive: true });
  }
}

/**
 * Start the Qdrant container
 */
export async function startQdrantContainer(
  config: Partial<QdrantConfig> = {}
): Promise<{ success: boolean; containerId?: string; error?: string }> {
  const fullConfig: QdrantConfig = { ...DEFAULT_QDRANT_CONFIG, ...config };

  // Check if Docker is available
  if (!await isDockerInstalled()) {
    return { success: false, error: 'Docker is not installed' };
  }

  if (!await isDockerRunning()) {
    return { success: false, error: 'Docker daemon is not running' };
  }

  // Check if container already exists
  const existingStatus = await getContainerStatus(fullConfig.containerName);
  if (existingStatus.running) {
    return {
      success: true,
      containerId: existingStatus.containerId,
    };
  }

  // Ensure data directory exists
  await ensureDataDirectory(fullConfig.dataPath);
  const expandedDataPath = expandPath(fullConfig.dataPath);

  // Build Docker run command
  const dockerArgs = [
    'run',
    '-d',
    '--name', fullConfig.containerName,
    '-p', `${fullConfig.port}:6333`,
    '-p', `${fullConfig.grpcPort}:6334`,
    '-v', `${expandedDataPath}:/qdrant/storage`,
  ];

  // Add resource limits if specified
  if (fullConfig.memoryLimit) {
    dockerArgs.push('--memory', fullConfig.memoryLimit);
  }
  if (fullConfig.cpuLimit) {
    dockerArgs.push('--cpus', fullConfig.cpuLimit);
  }

  // Add restart policy
  dockerArgs.push('--restart', 'unless-stopped');

  // Add image
  dockerArgs.push(fullConfig.imageTag);

  try {
    // Remove stopped container with same name if exists
    try {
      await execAsync(`docker rm ${fullConfig.containerName}`, { timeout: DOCKER_TIMEOUT });
    } catch {
      // Container might not exist, that's fine
    }

    // Start the container
    const { stdout } = await execAsync(`docker ${dockerArgs.join(' ')}`, {
      timeout: DOCKER_TIMEOUT,
    });

    const containerId = stdout.trim();

    // Wait for container to be healthy
    const healthy = await waitForHealthy(fullConfig);
    if (!healthy) {
      return {
        success: false,
        containerId,
        error: 'Container started but failed health check',
      };
    }

    return { success: true, containerId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to start container: ${message}` };
  }
}

/**
 * Stop the Qdrant container
 */
export async function stopQdrantContainer(
  containerName: string = DEFAULT_QDRANT_CONFIG.containerName
): Promise<{ success: boolean; error?: string }> {
  try {
    await execAsync(`docker stop ${containerName}`, { timeout: DOCKER_TIMEOUT });
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to stop container: ${message}` };
  }
}

/**
 * Remove the Qdrant container (and optionally data)
 */
export async function removeQdrantContainer(
  containerName: string = DEFAULT_QDRANT_CONFIG.containerName,
  removeData: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    // Stop if running
    await stopQdrantContainer(containerName);

    // Remove container
    await execAsync(`docker rm ${containerName}`, { timeout: DOCKER_TIMEOUT });

    // Optionally remove data
    if (removeData) {
      const dataPath = expandPath(DEFAULT_QDRANT_CONFIG.dataPath);
      if (fs.existsSync(dataPath)) {
        fs.rmSync(dataPath, { recursive: true, force: true });
      }
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to remove container: ${message}` };
  }
}

/**
 * Restart the Qdrant container
 */
export async function restartQdrantContainer(
  containerName: string = DEFAULT_QDRANT_CONFIG.containerName
): Promise<{ success: boolean; error?: string }> {
  try {
    await execAsync(`docker restart ${containerName}`, { timeout: DOCKER_TIMEOUT });
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to restart container: ${message}` };
  }
}

// ============================================================================
// Status and Health
// ============================================================================

/**
 * Get the status of a container by name
 */
export async function getContainerStatus(
  containerName: string = DEFAULT_QDRANT_CONFIG.containerName
): Promise<QdrantStatus> {
  try {
    const { stdout } = await execAsync(
      `docker inspect ${containerName} --format "{{.Id}} {{.State.Running}} {{.State.Health.Status}}"`,
      { timeout: 5000 }
    );

    const parts = stdout.trim().split(' ');
    const containerId = parts[0]?.substring(0, 12);
    const running = parts[1] === 'true';
    const healthStr = parts[2] || '';

    let health: QdrantStatus['health'];
    if (healthStr === 'healthy') health = 'healthy';
    else if (healthStr === 'unhealthy') health = 'unhealthy';
    else if (healthStr === 'starting') health = 'starting';

    // Get additional info if running
    let version: string | undefined;
    let collectionCount: number | undefined;

    if (running) {
      try {
        const qdrantInfo = await getQdrantInfo();
        version = qdrantInfo.version;
        collectionCount = qdrantInfo.collectionCount;
      } catch {
        // Qdrant API might not be ready yet
      }
    }

    return {
      running,
      containerId,
      health,
      version,
      collectionCount,
    };
  } catch {
    return { running: false, error: 'Container not found' };
  }
}

/**
 * Get Qdrant API information
 */
async function getQdrantInfo(
  port: number = DEFAULT_QDRANT_CONFIG.port
): Promise<{ version?: string; collectionCount?: number }> {
  try {
    // Check Qdrant API
    const response = await fetch(`http://localhost:${port}/`, {
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json() as { version?: string };

      // Get collections count
      const collectionsResponse = await fetch(`http://localhost:${port}/collections`, {
        signal: AbortSignal.timeout(5000),
      });

      let collectionCount = 0;
      if (collectionsResponse.ok) {
        const collectionsData = await collectionsResponse.json() as {
          result?: { collections?: unknown[] };
        };
        collectionCount = collectionsData.result?.collections?.length || 0;
      }

      return {
        version: data.version,
        collectionCount,
      };
    }

    return {};
  } catch {
    return {};
  }
}

/**
 * Wait for Qdrant to become healthy
 */
async function waitForHealthy(
  config: QdrantConfig,
  retries: number = HEALTH_CHECK_RETRIES
): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`http://localhost:${config.port}/`, {
        signal: AbortSignal.timeout(2000),
      });

      if (response.ok) {
        return true;
      }
    } catch {
      // Not ready yet
    }

    await new Promise(resolve => setTimeout(resolve, HEALTH_CHECK_INTERVAL));
  }

  return false;
}

/**
 * Check if Qdrant API is accessible
 */
export async function isQdrantHealthy(
  port: number = DEFAULT_QDRANT_CONFIG.port
): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}/`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// ============================================================================
// Pull and Update
// ============================================================================

/**
 * Pull the latest Qdrant image
 */
export async function pullQdrantImage(
  imageTag: string = DEFAULT_QDRANT_CONFIG.imageTag
): Promise<{ success: boolean; error?: string }> {
  try {
    await execAsync(`docker pull ${imageTag}`, { timeout: 120000 }); // 2 minute timeout
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to pull image: ${message}` };
  }
}

/**
 * Update Qdrant to latest version
 */
export async function updateQdrant(
  config: Partial<QdrantConfig> = {}
): Promise<{ success: boolean; previousVersion?: string; newVersion?: string; error?: string }> {
  const fullConfig: QdrantConfig = { ...DEFAULT_QDRANT_CONFIG, ...config };

  // Get current version
  const currentStatus = await getContainerStatus(fullConfig.containerName);
  const previousVersion = currentStatus.version;

  // Pull new image
  const pullResult = await pullQdrantImage(fullConfig.imageTag);
  if (!pullResult.success) {
    return { success: false, error: pullResult.error };
  }

  // Stop and remove current container
  await removeQdrantContainer(fullConfig.containerName, false);

  // Start with new image
  const startResult = await startQdrantContainer(fullConfig);
  if (!startResult.success) {
    return { success: false, error: startResult.error };
  }

  // Get new version
  const newStatus = await getContainerStatus(fullConfig.containerName);

  return {
    success: true,
    previousVersion,
    newVersion: newStatus.version,
  };
}

// ============================================================================
// Logs
// ============================================================================

/**
 * Get container logs
 */
export async function getQdrantLogs(
  containerName: string = DEFAULT_QDRANT_CONFIG.containerName,
  tail: number = 100
): Promise<{ success: boolean; logs?: string; error?: string }> {
  try {
    const { stdout } = await execAsync(
      `docker logs ${containerName} --tail ${tail}`,
      { timeout: 10000 }
    );
    return { success: true, logs: stdout };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Ensure Qdrant is running, starting it if necessary
 */
export async function ensureQdrantRunning(
  config: Partial<QdrantConfig> = {}
): Promise<{ success: boolean; started: boolean; error?: string }> {
  const status = await getContainerStatus(config.containerName || DEFAULT_QDRANT_CONFIG.containerName);

  if (status.running && await isQdrantHealthy(config.port || DEFAULT_QDRANT_CONFIG.port)) {
    return { success: true, started: false };
  }

  const result = await startQdrantContainer(config);
  return {
    success: result.success,
    started: result.success,
    error: result.error,
  };
}

/**
 * Get comprehensive Docker and Qdrant status
 */
export async function getFullStatus(
  config: Partial<QdrantConfig> = {}
): Promise<{
  docker: {
    installed: boolean;
    running: boolean;
    version?: string;
  };
  qdrant: QdrantStatus;
}> {
  const fullConfig = { ...DEFAULT_QDRANT_CONFIG, ...config };

  const dockerInstalled = await isDockerInstalled();
  const dockerRunning = dockerInstalled ? await isDockerRunning() : false;
  const dockerVersion = dockerInstalled ? await getDockerVersion() : undefined;

  const qdrantStatus = dockerRunning
    ? await getContainerStatus(fullConfig.containerName)
    : { running: false, error: 'Docker not running' };

  return {
    docker: {
      installed: dockerInstalled,
      running: dockerRunning,
      version: dockerVersion || undefined,
    },
    qdrant: qdrantStatus,
  };
}
