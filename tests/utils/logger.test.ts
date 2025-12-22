import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  createLogger,
  getLogger,
  setLogLevel,
  setSilentMode,
  logger,
} from '../../src/utils/logger.js';
import * as platform from '../../src/utils/platform.js';

// Mock fs
vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn(),
    statSync: vi.fn(),
    mkdirSync: vi.fn(),
    appendFileSync: vi.fn(),
    renameSync: vi.fn(),
    unlinkSync: vi.fn(),
  },
}));

// Mock platform
vi.mock('../../src/utils/platform.js', () => ({
  getClaudeDir: vi.fn(() => '/home/user/.claude'),
  getPlatform: vi.fn(() => ({
    os: 'linux',
    arch: 'x64',
    claudeDir: '/home/user/.claude',
    tempDir: '/tmp',
    shell: '/bin/bash',
  })),
}));

describe('createLogger', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    };
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ size: 100 } as fs.Stats);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a logger with default options', () => {
    const log = createLogger();
    expect(log).toHaveProperty('debug');
    expect(log).toHaveProperty('info');
    expect(log).toHaveProperty('warn');
    expect(log).toHaveProperty('error');
    expect(log).toHaveProperty('success');
  });

  it('logs info messages by default', () => {
    const log = createLogger();
    log.info('test message');
    expect(consoleSpy.log).toHaveBeenCalled();
  });

  it('does not log debug messages at info level', () => {
    const log = createLogger({ level: 'info' });
    log.debug('debug message');
    expect(consoleSpy.log).not.toHaveBeenCalled();
  });

  it('logs debug messages at debug level', () => {
    const log = createLogger({ level: 'debug' });
    log.debug('debug message');
    expect(consoleSpy.log).toHaveBeenCalled();
  });

  it('logs error messages with console.error', () => {
    const log = createLogger();
    log.error('error message');
    expect(consoleSpy.error).toHaveBeenCalled();
  });

  it('logs warn messages with console.warn', () => {
    const log = createLogger();
    log.warn('warn message');
    expect(consoleSpy.warn).toHaveBeenCalled();
  });

  it('does not output to console in silent mode', () => {
    const log = createLogger({ silent: true });
    log.info('silent message');
    log.error('silent error');
    log.warn('silent warn');
    expect(consoleSpy.log).not.toHaveBeenCalled();
    expect(consoleSpy.error).not.toHaveBeenCalled();
    expect(consoleSpy.warn).not.toHaveBeenCalled();
  });

  it('writes to file even in silent mode', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ size: 100 } as fs.Stats);

    const log = createLogger({ silent: true });
    log.info('file message');

    expect(fs.appendFileSync).toHaveBeenCalled();
  });

  it('creates log directory if it does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const log = createLogger({ silent: true });
    log.info('test');

    expect(fs.mkdirSync).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ recursive: true })
    );
  });

  it('writes JSON log entries to file', () => {
    const log = createLogger({ silent: true });
    log.info('json test');

    expect(fs.appendFileSync).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringMatching(/"level":"info"/),
      'utf8'
    );
  });

  it('includes context in log entries', () => {
    const log = createLogger({
      silent: true,
      context: { command: 'init' },
    });
    log.info('context test');

    expect(fs.appendFileSync).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringMatching(/"command":"init"/),
      'utf8'
    );
  });

  it('includes platform in context', () => {
    const log = createLogger({ silent: true });
    log.info('platform test');

    expect(fs.appendFileSync).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringMatching(/"platform":"linux"/),
      'utf8'
    );
  });
});

describe('log level changes', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ size: 100 } as fs.Stats);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('can change log level dynamically', () => {
    const log = createLogger({ level: 'error' });

    log.info('should not appear');
    expect(consoleSpy).not.toHaveBeenCalled();

    log.setLevel('info');
    log.info('should appear');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('can toggle silent mode', () => {
    const log = createLogger({ silent: false });

    log.info('should appear');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockClear();
    log.setSilent(true);
    log.info('should not appear');
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('can update context', () => {
    const log = createLogger({ silent: true });

    log.setContext({ command: 'doctor' });
    log.info('context update test');

    expect(fs.appendFileSync).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringMatching(/"command":"doctor"/),
      'utf8'
    );
  });
});

describe('child logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ size: 100 } as fs.Stats);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates child logger with extended context', () => {
    const parent = createLogger({ silent: true, context: { command: 'init' } });
    const child = parent.child({ step: 'github' });

    child.info('child test');

    expect(fs.appendFileSync).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringMatching(/"command":"init"/),
      'utf8'
    );
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringMatching(/"step":"github"/),
      'utf8'
    );
  });
});

describe('log rotation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rotates files when size exceeds limit', () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      const pathStr = String(p);
      return pathStr.endsWith('.log') || pathStr.endsWith('.log.1');
    });
    vi.mocked(fs.statSync).mockReturnValue({ size: 10 * 1024 * 1024 } as fs.Stats); // 10MB

    const log = createLogger({
      silent: true,
      maxFileSize: 5 * 1024 * 1024,
    });
    log.info('trigger rotation');

    expect(fs.renameSync).toHaveBeenCalled();
  });

  it('deletes oldest file during rotation', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ size: 10 * 1024 * 1024 } as fs.Stats);

    const log = createLogger({
      silent: true,
      maxFileSize: 5 * 1024 * 1024,
      maxFiles: 3,
    });
    log.info('trigger rotation');

    // Should delete the oldest (.3 if maxFiles is 3)
    expect(fs.unlinkSync).toHaveBeenCalled();
  });
});

describe('singleton logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ size: 100 } as fs.Stats);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getLogger returns singleton instance', () => {
    const log1 = getLogger();
    const log2 = getLogger();
    expect(log1).toBe(log2);
  });

  it('setLogLevel affects singleton', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    setLogLevel('error');
    logger.info('should not show');
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('setSilentMode affects singleton', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    setSilentMode(true);
    logger.info('should not show');
    expect(consoleSpy).not.toHaveBeenCalled();
  });
});

describe('logger convenience functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ size: 100 } as fs.Stats);
    setSilentMode(false);
    setLogLevel('debug');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logger.debug calls debug method', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.debug('debug test');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('logger.success logs success messages', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.success('success test');
    expect(consoleSpy).toHaveBeenCalled();
  });
});
