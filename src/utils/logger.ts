/**
 * Structured logging system
 *
 * Provides colored console output and JSON file logging with rotation.
 */

import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import { getClaudeDir, getPlatform } from './platform.js';
import type { LogLevel, LogEntry, LogContext, LoggerOptions, Logger } from '../types/logger.js';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  success: 1, // Same priority as info
  warn: 2,
  error: 3,
};

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_MAX_FILES = 3;
const DEFAULT_LOG_FILE = 'ecosystem.log';

/**
 * Create a logger instance
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  const {
    level = 'info',
    silent = false,
    logFile = path.join(getClaudeDir(), DEFAULT_LOG_FILE),
    maxFileSize = DEFAULT_MAX_FILE_SIZE,
    maxFiles = DEFAULT_MAX_FILES,
    context = {},
  } = options;

  let currentLevel = level;
  let isSilent = silent;
  let currentContext: LogContext = {
    platform: getPlatform().os,
    ...context,
  };

  /**
   * Check if a log level should be output
   */
  function shouldLog(messageLevel: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[messageLevel] >= LOG_LEVEL_PRIORITY[currentLevel];
  }

  /**
   * Format a message for console output with colors
   */
  function formatConsole(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString().slice(11, 19); // HH:MM:SS

    switch (level) {
      case 'debug':
        return chalk.gray(`[${timestamp}] ${chalk.dim('[DEBUG]')} ${message}`);
      case 'info':
        return chalk.blue(`[${timestamp}] [INFO]`) + ` ${message}`;
      case 'success':
        return chalk.green(`[${timestamp}] [SUCCESS]`) + ` ${message}`;
      case 'warn':
        return chalk.yellow(`[${timestamp}] [WARN]`) + ` ${message}`;
      case 'error':
        return chalk.red(`[${timestamp}] [ERROR]`) + ` ${message}`;
    }
  }

  /**
   * Create a log entry object
   */
  function createLogEntry(level: LogLevel, message: string, data?: unknown): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: currentContext,
      data,
    };
  }

  /**
   * Rotate log files if necessary
   */
  function rotateLogFiles(): void {
    try {
      if (!fs.existsSync(logFile)) return;

      const stats = fs.statSync(logFile);
      if (stats.size < maxFileSize) return;

      // Rotate existing files
      for (let i = maxFiles - 1; i >= 1; i--) {
        const oldPath = `${logFile}.${i}`;
        const newPath = `${logFile}.${i + 1}`;
        if (fs.existsSync(oldPath)) {
          if (i === maxFiles - 1) {
            fs.unlinkSync(oldPath); // Delete oldest
          } else {
            fs.renameSync(oldPath, newPath);
          }
        }
      }

      // Move current to .1
      fs.renameSync(logFile, `${logFile}.1`);
    } catch {
      // Ignore rotation errors
    }
  }

  /**
   * Write a log entry to file
   */
  function writeToFile(entry: LogEntry): void {
    try {
      // Ensure directory exists
      const dir = path.dirname(logFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Rotate if necessary
      rotateLogFiles();

      // Append log entry
      const line = JSON.stringify(entry) + '\n';
      fs.appendFileSync(logFile, line, 'utf8');
    } catch {
      // Ignore file write errors
    }
  }

  /**
   * Log a message
   */
  function log(level: LogLevel, message: string, data?: unknown): void {
    if (!shouldLog(level)) return;

    const entry = createLogEntry(level, message, data);

    // Console output
    if (!isSilent) {
      const formatted = formatConsole(level, message);
      if (level === 'error') {
        console.error(formatted);
      } else if (level === 'warn') {
        console.warn(formatted);
      } else {
        console.log(formatted);
      }

      // Also log data if provided
      if (data !== undefined && currentLevel === 'debug') {
        console.log(chalk.gray(JSON.stringify(data, null, 2)));
      }
    }

    // File output
    writeToFile(entry);
  }

  const logger: Logger = {
    debug: (message: string, data?: unknown) => log('debug', message, data),
    info: (message: string, data?: unknown) => log('info', message, data),
    warn: (message: string, data?: unknown) => log('warn', message, data),
    error: (message: string, data?: unknown) => log('error', message, data),
    success: (message: string, data?: unknown) => log('success', message, data),

    setLevel: (level: LogLevel) => {
      currentLevel = level;
    },

    setSilent: (silent: boolean) => {
      isSilent = silent;
    },

    setContext: (context: LogContext) => {
      currentContext = { ...currentContext, ...context };
    },

    child: (context: LogContext): Logger => {
      return createLogger({
        level: currentLevel,
        silent: isSilent,
        logFile,
        maxFileSize,
        maxFiles,
        context: { ...currentContext, ...context },
      });
    },
  };

  return logger;
}

// Singleton logger instance
let defaultLogger: Logger | null = null;

/**
 * Get the default logger instance
 */
export function getLogger(): Logger {
  if (!defaultLogger) {
    defaultLogger = createLogger();
  }
  return defaultLogger;
}

/**
 * Set the global log level
 */
export function setLogLevel(level: LogLevel): void {
  getLogger().setLevel(level);
}

/**
 * Set silent mode globally
 */
export function setSilentMode(silent: boolean): void {
  getLogger().setSilent(silent);
}

/**
 * Log convenience functions using default logger
 */
export const logger = {
  debug: (message: string, data?: unknown) => getLogger().debug(message, data),
  info: (message: string, data?: unknown) => getLogger().info(message, data),
  warn: (message: string, data?: unknown) => getLogger().warn(message, data),
  error: (message: string, data?: unknown) => getLogger().error(message, data),
  success: (message: string, data?: unknown) => getLogger().success(message, data),
};
