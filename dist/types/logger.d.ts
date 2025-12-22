/**
 * Logger types
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';
export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: LogContext;
    data?: unknown;
}
export interface LogContext {
    command?: string;
    platform?: string;
    version?: string;
    [key: string]: unknown;
}
export interface LoggerOptions {
    level?: LogLevel;
    silent?: boolean;
    logFile?: string;
    maxFileSize?: number;
    maxFiles?: number;
    context?: LogContext;
}
export interface Logger {
    debug(message: string, data?: unknown): void;
    info(message: string, data?: unknown): void;
    warn(message: string, data?: unknown): void;
    error(message: string, data?: unknown): void;
    success(message: string, data?: unknown): void;
    setLevel(level: LogLevel): void;
    setSilent(silent: boolean): void;
    setContext(context: LogContext): void;
    child(context: LogContext): Logger;
}
//# sourceMappingURL=logger.d.ts.map