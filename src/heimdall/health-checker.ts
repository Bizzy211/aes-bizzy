/**
 * Health Checker for Heimdall and Qdrant
 *
 * Provides comprehensive health monitoring for the Heimdall memory system,
 * including Docker, Qdrant, embedding service, and MCP server status.
 */

import {
  HeimdallConfig,
  HeimdallHealthStatus,
  QdrantStatus,
  HeimdallMemoryType,
  DEFAULT_HEIMDALL_CONFIG,
} from '../types/heimdall.js';
import {
  isDockerInstalled,
  isDockerRunning,
  getContainerStatus,
  isQdrantHealthy,
  getQdrantLogs,
} from './docker-manager.js';
import { loadHeimdallConfig } from './installer.js';
import { validateHeimdallMcpConfig, getPrimaryConfigLocation } from './mcp-config.js';

// ============================================================================
// Types
// ============================================================================

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  message: string;
  details?: Record<string, unknown>;
  duration?: number;
}

export interface FullHealthReport {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: HealthCheckResult[];
  recommendations: string[];
  heimdallStatus: HeimdallHealthStatus;
}

// ============================================================================
// Individual Health Checks
// ============================================================================

/**
 * Check Docker availability
 */
export async function checkDocker(): Promise<HealthCheckResult> {
  const start = Date.now();

  const installed = await isDockerInstalled();
  if (!installed) {
    return {
      name: 'Docker Installation',
      status: 'unhealthy',
      message: 'Docker is not installed',
      duration: Date.now() - start,
    };
  }

  const running = await isDockerRunning();
  if (!running) {
    return {
      name: 'Docker Daemon',
      status: 'unhealthy',
      message: 'Docker daemon is not running',
      duration: Date.now() - start,
    };
  }

  return {
    name: 'Docker',
    status: 'healthy',
    message: 'Docker is installed and running',
    duration: Date.now() - start,
  };
}

/**
 * Check Qdrant container status
 */
export async function checkQdrant(
  containerName: string = 'qdrant-heimdall'
): Promise<HealthCheckResult> {
  const start = Date.now();

  const status = await getContainerStatus(containerName);

  if (!status.running) {
    return {
      name: 'Qdrant Container',
      status: 'unhealthy',
      message: status.error || 'Qdrant container is not running',
      duration: Date.now() - start,
    };
  }

  if (status.health === 'unhealthy') {
    return {
      name: 'Qdrant Container',
      status: 'unhealthy',
      message: 'Qdrant container is unhealthy',
      details: { containerId: status.containerId },
      duration: Date.now() - start,
    };
  }

  if (status.health === 'starting') {
    return {
      name: 'Qdrant Container',
      status: 'degraded',
      message: 'Qdrant container is starting',
      details: { containerId: status.containerId },
      duration: Date.now() - start,
    };
  }

  return {
    name: 'Qdrant Container',
    status: 'healthy',
    message: `Qdrant running (v${status.version || 'unknown'})`,
    details: {
      containerId: status.containerId,
      version: status.version,
      collectionCount: status.collectionCount,
    },
    duration: Date.now() - start,
  };
}

/**
 * Check Qdrant API accessibility
 */
export async function checkQdrantApi(
  url: string = 'http://localhost:6333'
): Promise<HealthCheckResult> {
  const start = Date.now();

  try {
    const response = await fetch(`${url}/`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return {
        name: 'Qdrant API',
        status: 'unhealthy',
        message: `API returned status ${response.status}`,
        duration: Date.now() - start,
      };
    }

    const data = await response.json() as { version?: string };

    return {
      name: 'Qdrant API',
      status: 'healthy',
      message: 'Qdrant API is accessible',
      details: { version: data.version },
      duration: Date.now() - start,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      name: 'Qdrant API',
      status: 'unhealthy',
      message: `API not accessible: ${message}`,
      duration: Date.now() - start,
    };
  }
}

/**
 * Check embedding service availability
 */
export async function checkEmbeddingService(): Promise<HealthCheckResult> {
  const start = Date.now();

  // Check if OpenAI API key is configured
  const hasApiKey = !!process.env.OPENAI_API_KEY;

  if (!hasApiKey) {
    return {
      name: 'Embedding Service',
      status: 'unhealthy',
      message: 'OPENAI_API_KEY not configured',
      duration: Date.now() - start,
    };
  }

  // Try to make a test embedding call
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: 'test',
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (response.status === 401) {
      return {
        name: 'Embedding Service',
        status: 'unhealthy',
        message: 'Invalid OpenAI API key',
        duration: Date.now() - start,
      };
    }

    if (!response.ok) {
      return {
        name: 'Embedding Service',
        status: 'degraded',
        message: `OpenAI API returned status ${response.status}`,
        duration: Date.now() - start,
      };
    }

    return {
      name: 'Embedding Service',
      status: 'healthy',
      message: 'OpenAI embedding service is accessible',
      duration: Date.now() - start,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // If it's a network error, mark as degraded (might be temporary)
    if (message.includes('timeout') || message.includes('network')) {
      return {
        name: 'Embedding Service',
        status: 'degraded',
        message: `OpenAI API temporarily unavailable: ${message}`,
        duration: Date.now() - start,
      };
    }

    return {
      name: 'Embedding Service',
      status: 'unhealthy',
      message: `OpenAI API error: ${message}`,
      duration: Date.now() - start,
    };
  }
}

/**
 * Check Heimdall collection status
 */
export async function checkCollection(
  url: string = 'http://localhost:6333',
  collectionName: string = 'claude-memories'
): Promise<HealthCheckResult> {
  const start = Date.now();

  try {
    const response = await fetch(`${url}/collections/${collectionName}`, {
      signal: AbortSignal.timeout(5000),
    });

    if (response.status === 404) {
      return {
        name: 'Memory Collection',
        status: 'degraded',
        message: `Collection "${collectionName}" does not exist`,
        details: { collectionName },
        duration: Date.now() - start,
      };
    }

    if (!response.ok) {
      return {
        name: 'Memory Collection',
        status: 'unhealthy',
        message: `Failed to check collection: ${response.status}`,
        duration: Date.now() - start,
      };
    }

    const data = await response.json() as {
      result?: {
        vectors_count?: number;
        points_count?: number;
        indexed_vectors_count?: number;
      };
    };

    const vectorCount = data.result?.vectors_count || data.result?.points_count || 0;

    return {
      name: 'Memory Collection',
      status: 'healthy',
      message: `Collection "${collectionName}" has ${vectorCount} memories`,
      details: {
        collectionName,
        vectorCount,
        indexedCount: data.result?.indexed_vectors_count,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      name: 'Memory Collection',
      status: 'unhealthy',
      message: `Failed to check collection: ${message}`,
      duration: Date.now() - start,
    };
  }
}

/**
 * Check MCP configuration
 */
export async function checkMcpConfig(): Promise<HealthCheckResult> {
  const start = Date.now();

  const configLocation = getPrimaryConfigLocation();

  if (!configLocation || !configLocation.exists) {
    return {
      name: 'MCP Configuration',
      status: 'degraded',
      message: 'No MCP configuration file found',
      duration: Date.now() - start,
    };
  }

  const validation = validateHeimdallMcpConfig(configLocation.path);

  if (!validation.valid) {
    return {
      name: 'MCP Configuration',
      status: 'unhealthy',
      message: validation.errors.join('; '),
      details: { path: configLocation.path, errors: validation.errors },
      duration: Date.now() - start,
    };
  }

  if (validation.warnings.length > 0) {
    return {
      name: 'MCP Configuration',
      status: 'degraded',
      message: validation.warnings.join('; '),
      details: { path: configLocation.path, warnings: validation.warnings },
      duration: Date.now() - start,
    };
  }

  return {
    name: 'MCP Configuration',
    status: 'healthy',
    message: 'Heimdall MCP is properly configured',
    details: { path: configLocation.path },
    duration: Date.now() - start,
  };
}

/**
 * Check Heimdall configuration file
 */
export async function checkHeimdallConfig(): Promise<HealthCheckResult> {
  const start = Date.now();

  const config = loadHeimdallConfig();

  if (!config) {
    return {
      name: 'Heimdall Configuration',
      status: 'degraded',
      message: 'No Heimdall configuration found (using defaults)',
      duration: Date.now() - start,
    };
  }

  return {
    name: 'Heimdall Configuration',
    status: 'healthy',
    message: 'Heimdall configuration loaded',
    details: {
      qdrantUrl: config.qdrantUrl,
      collectionName: config.collectionName,
      embeddingModel: config.embeddingModel,
    },
    duration: Date.now() - start,
  };
}

// ============================================================================
// Full Health Check
// ============================================================================

/**
 * Run all health checks and generate a comprehensive report
 */
export async function runFullHealthCheck(
  config: HeimdallConfig = DEFAULT_HEIMDALL_CONFIG
): Promise<FullHealthReport> {
  const checks: HealthCheckResult[] = [];
  const recommendations: string[] = [];

  // Run all checks in parallel where possible
  const [
    dockerCheck,
    qdrantCheck,
    apiCheck,
    embeddingCheck,
    collectionCheck,
    mcpCheck,
    configCheck,
  ] = await Promise.all([
    checkDocker(),
    checkQdrant(),
    checkQdrantApi(config.qdrantUrl),
    checkEmbeddingService(),
    checkCollection(config.qdrantUrl, config.collectionName),
    checkMcpConfig(),
    checkHeimdallConfig(),
  ]);

  checks.push(
    dockerCheck,
    qdrantCheck,
    apiCheck,
    embeddingCheck,
    collectionCheck,
    mcpCheck,
    configCheck
  );

  // Generate recommendations based on check results
  if (dockerCheck.status !== 'healthy') {
    recommendations.push('Install and start Docker Desktop');
  }

  if (qdrantCheck.status !== 'healthy') {
    recommendations.push('Run: aes-bizzy heimdall start');
  }

  if (embeddingCheck.status !== 'healthy') {
    recommendations.push('Set OPENAI_API_KEY environment variable');
  }

  if (collectionCheck.status === 'degraded') {
    recommendations.push('Memory collection will be created on first use');
  }

  if (mcpCheck.status !== 'healthy') {
    recommendations.push('Run: aes-bizzy heimdall configure');
  }

  // Determine overall status
  const hasUnhealthy = checks.some(c => c.status === 'unhealthy');
  const hasDegraded = checks.some(c => c.status === 'degraded');

  let overall: 'healthy' | 'degraded' | 'unhealthy';
  if (hasUnhealthy) {
    overall = 'unhealthy';
  } else if (hasDegraded) {
    overall = 'degraded';
  } else {
    overall = 'healthy';
  }

  // Build Heimdall status
  const qdrantStatus: QdrantStatus = await getContainerStatus();
  const memoryStats = await getMemoryStats(config);

  const heimdallStatus: HeimdallHealthStatus = {
    status: overall,
    qdrant: qdrantStatus,
    embedding: {
      available: embeddingCheck.status === 'healthy',
      model: config.embeddingModel,
      error: embeddingCheck.status !== 'healthy' ? embeddingCheck.message : undefined,
    },
    stats: memoryStats,
    checkedAt: new Date().toISOString(),
  };

  return {
    overall,
    timestamp: new Date().toISOString(),
    checks,
    recommendations,
    heimdallStatus,
  };
}

/**
 * Get memory statistics from Qdrant
 */
async function getMemoryStats(
  config: HeimdallConfig
): Promise<HeimdallHealthStatus['stats']> {
  const defaultStats = {
    totalMemories: 0,
    memoryTypes: {} as Record<HeimdallMemoryType, number>,
  };

  try {
    // Get collection info
    const response = await fetch(`${config.qdrantUrl}/collections/${config.collectionName}`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return defaultStats;
    }

    const data = await response.json() as {
      result?: {
        points_count?: number;
        vectors_count?: number;
      };
    };

    const totalMemories = data.result?.points_count || data.result?.vectors_count || 0;

    // Get memory type breakdown (would require scrolling through points)
    // For now, return total count only
    return {
      totalMemories,
      memoryTypes: {} as Record<HeimdallMemoryType, number>,
    };
  } catch {
    return defaultStats;
  }
}

// ============================================================================
// Quick Health Checks
// ============================================================================

/**
 * Quick check if Heimdall is operational
 */
export async function isHeimdallOperational(): Promise<boolean> {
  const [dockerRunning, qdrantHealthy] = await Promise.all([
    isDockerRunning(),
    isQdrantHealthy(),
  ]);

  return dockerRunning && qdrantHealthy;
}

/**
 * Get quick status summary
 */
export async function getQuickStatus(): Promise<{
  operational: boolean;
  docker: boolean;
  qdrant: boolean;
  embedding: boolean;
  mcp: boolean;
}> {
  const [dockerCheck, qdrantCheck, embeddingCheck, mcpCheck] = await Promise.all([
    checkDocker(),
    checkQdrantApi(),
    checkEmbeddingService(),
    checkMcpConfig(),
  ]);

  return {
    operational: dockerCheck.status === 'healthy' && qdrantCheck.status === 'healthy',
    docker: dockerCheck.status === 'healthy',
    qdrant: qdrantCheck.status === 'healthy',
    embedding: embeddingCheck.status === 'healthy',
    mcp: mcpCheck.status === 'healthy',
  };
}

// ============================================================================
// Diagnostic Helpers
// ============================================================================

/**
 * Get diagnostic information for troubleshooting
 */
export async function getDiagnostics(
  containerName: string = 'qdrant-heimdall'
): Promise<{
  qdrantLogs: string;
  environment: Record<string, string | undefined>;
  config: HeimdallConfig | null;
}> {
  const logsResult = await getQdrantLogs(containerName, 50);
  const config = loadHeimdallConfig();

  return {
    qdrantLogs: logsResult.logs || logsResult.error || 'No logs available',
    environment: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '***configured***' : undefined,
      QDRANT_URL: process.env.QDRANT_URL,
      HEIMDALL_COLLECTION: process.env.HEIMDALL_COLLECTION,
    },
    config,
  };
}
