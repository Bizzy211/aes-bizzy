/**
 * Structured logging system
 *
 * Provides colored console output and JSON file logging with rotation.
 */
import type { LogLevel, LoggerOptions, Logger } from '../types/logger.js';
/**
 * Create a logger instance
 */
export declare function createLogger(options?: LoggerOptions): Logger;
/**
 * Get the default logger instance
 */
export declare function getLogger(): Logger;
/**
 * Set the global log level
 */
export declare function setLogLevel(level: LogLevel): void;
/**
 * Set silent mode globally
 */
export declare function setSilentMode(silent: boolean): void;
/**
 * Log convenience functions using default logger
 */
export declare const logger: {
    debug: (message: string, data?: unknown) => void;
    info: (message: string, data?: unknown) => void;
    warn: (message: string, data?: unknown) => void;
    error: (message: string, data?: unknown) => void;
    success: (message: string, data?: unknown) => void;
};
//# sourceMappingURL=logger.d.ts.map