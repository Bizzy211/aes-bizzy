/**
 * Docker Manager for Qdrant Container
 *
 * Manages the lifecycle of the Qdrant Docker container used by Heimdall
 * for vector storage and semantic search capabilities.
 */
import { QdrantConfig, QdrantStatus } from '../types/heimdall.js';
/**
 * Check if Docker is installed and accessible
 */
export declare function isDockerInstalled(): Promise<boolean>;
/**
 * Check if Docker daemon is running
 */
export declare function isDockerRunning(): Promise<boolean>;
/**
 * Get Docker version information
 */
export declare function getDockerVersion(): Promise<string | null>;
/**
 * Start the Qdrant container
 */
export declare function startQdrantContainer(config?: Partial<QdrantConfig>): Promise<{
    success: boolean;
    containerId?: string;
    error?: string;
}>;
/**
 * Stop the Qdrant container
 */
export declare function stopQdrantContainer(containerName?: string): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * Remove the Qdrant container (and optionally data)
 */
export declare function removeQdrantContainer(containerName?: string, removeData?: boolean): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * Restart the Qdrant container
 */
export declare function restartQdrantContainer(containerName?: string): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * Get the status of a container by name
 */
export declare function getContainerStatus(containerName?: string): Promise<QdrantStatus>;
/**
 * Check if Qdrant API is accessible
 */
export declare function isQdrantHealthy(port?: number): Promise<boolean>;
/**
 * Pull the latest Qdrant image
 */
export declare function pullQdrantImage(imageTag?: string): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * Update Qdrant to latest version
 */
export declare function updateQdrant(config?: Partial<QdrantConfig>): Promise<{
    success: boolean;
    previousVersion?: string;
    newVersion?: string;
    error?: string;
}>;
/**
 * Get container logs
 */
export declare function getQdrantLogs(containerName?: string, tail?: number): Promise<{
    success: boolean;
    logs?: string;
    error?: string;
}>;
/**
 * Ensure Qdrant is running, starting it if necessary
 */
export declare function ensureQdrantRunning(config?: Partial<QdrantConfig>): Promise<{
    success: boolean;
    started: boolean;
    error?: string;
}>;
/**
 * Get comprehensive Docker and Qdrant status
 */
export declare function getFullStatus(config?: Partial<QdrantConfig>): Promise<{
    docker: {
        installed: boolean;
        running: boolean;
        version?: string;
    };
    qdrant: QdrantStatus;
}>;
//# sourceMappingURL=docker-manager.d.ts.map