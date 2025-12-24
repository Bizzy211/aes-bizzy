/**
 * Health Checker for Heimdall and Qdrant
 *
 * Provides comprehensive health monitoring for the Heimdall memory system,
 * including Docker, Qdrant, embedding service, and MCP server status.
 */
import { HeimdallConfig, HeimdallHealthStatus } from '../types/heimdall.js';
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
/**
 * Check Docker availability
 */
export declare function checkDocker(): Promise<HealthCheckResult>;
/**
 * Check Qdrant container status
 */
export declare function checkQdrant(containerName?: string): Promise<HealthCheckResult>;
/**
 * Check Qdrant API accessibility
 */
export declare function checkQdrantApi(url?: string): Promise<HealthCheckResult>;
/**
 * Check embedding service availability
 */
export declare function checkEmbeddingService(): Promise<HealthCheckResult>;
/**
 * Check Heimdall collection status
 */
export declare function checkCollection(url?: string, collectionName?: string): Promise<HealthCheckResult>;
/**
 * Check MCP configuration
 */
export declare function checkMcpConfig(): Promise<HealthCheckResult>;
/**
 * Check Heimdall configuration file
 */
export declare function checkHeimdallConfig(): Promise<HealthCheckResult>;
/**
 * Run all health checks and generate a comprehensive report
 */
export declare function runFullHealthCheck(config?: HeimdallConfig): Promise<FullHealthReport>;
/**
 * Quick check if Heimdall is operational
 */
export declare function isHeimdallOperational(): Promise<boolean>;
/**
 * Get quick status summary
 */
export declare function getQuickStatus(): Promise<{
    operational: boolean;
    docker: boolean;
    qdrant: boolean;
    embedding: boolean;
    mcp: boolean;
}>;
/**
 * Get diagnostic information for troubleshooting
 */
export declare function getDiagnostics(containerName?: string): Promise<{
    qdrantLogs: string;
    environment: Record<string, string | undefined>;
    config: HeimdallConfig | null;
}>;
//# sourceMappingURL=health-checker.d.ts.map