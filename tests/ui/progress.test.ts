/**
 * Tests for UI progress tracking utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ora from 'ora';
import {
  ProgressTracker,
  createSpinner,
  withSpinner,
  showProgress,
} from '../../src/ui/progress.js';

vi.mock('ora', () => {
  return {
    default: vi.fn(() => {
      const spinner: Record<string, unknown> = {
        text: '',
      };
      spinner.start = vi.fn(() => spinner);
      spinner.stop = vi.fn(() => spinner);
      spinner.succeed = vi.fn(() => spinner);
      spinner.fail = vi.fn(() => spinner);
      spinner.warn = vi.fn(() => spinner);
      return spinner;
    }),
  };
});

describe('UI Progress', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ProgressTracker', () => {
    describe('addTask', () => {
      it('should add a task with pending status', () => {
        const tracker = new ProgressTracker();
        tracker.addTask('task1', 'Task One');

        const task = tracker.getTask('task1');
        expect(task).toBeDefined();
        expect(task?.name).toBe('Task One');
        expect(task?.status).toBe('pending');
      });
    });

    describe('startTask', () => {
      it('should start a task and create spinner', () => {
        const tracker = new ProgressTracker();
        tracker.addTask('task1', 'Task One');
        tracker.startTask('task1', 'Starting...');

        const task = tracker.getTask('task1');
        expect(task?.status).toBe('running');
        expect(task?.message).toBe('Starting...');
        expect(ora).toHaveBeenCalled();
      });

      it('should do nothing for non-existent task', () => {
        const tracker = new ProgressTracker();
        tracker.startTask('nonexistent');
        expect(ora).not.toHaveBeenCalled();
      });
    });

    describe('updateTask', () => {
      it('should update task message', () => {
        const tracker = new ProgressTracker();
        tracker.addTask('task1', 'Task One');
        tracker.startTask('task1');
        tracker.updateTask('task1', 'Updated message');

        const task = tracker.getTask('task1');
        expect(task?.message).toBe('Updated message');
      });
    });

    describe('succeedTask', () => {
      it('should mark task as success', () => {
        const tracker = new ProgressTracker();
        tracker.addTask('task1', 'Task One');
        tracker.startTask('task1');
        tracker.succeedTask('task1', 'Done!');

        const task = tracker.getTask('task1');
        expect(task?.status).toBe('success');
        expect(task?.message).toBe('Done!');
      });
    });

    describe('failTask', () => {
      it('should mark task as error', () => {
        const tracker = new ProgressTracker();
        tracker.addTask('task1', 'Task One');
        tracker.startTask('task1');
        tracker.failTask('task1', 'Error occurred');

        const task = tracker.getTask('task1');
        expect(task?.status).toBe('error');
        expect(task?.error).toBe('Error occurred');
      });
    });

    describe('skipTask', () => {
      it('should mark task as skipped', () => {
        const tracker = new ProgressTracker();
        tracker.addTask('task1', 'Task One');
        tracker.startTask('task1');
        tracker.skipTask('task1', 'Not needed');

        const task = tracker.getTask('task1');
        expect(task?.status).toBe('skipped');
        expect(task?.message).toBe('Not needed');
      });
    });

    describe('stop', () => {
      it('should stop the spinner', () => {
        const tracker = new ProgressTracker();
        tracker.addTask('task1', 'Task One');
        tracker.startTask('task1');
        tracker.stop();

        // Should not throw
        expect(tracker.getTask('task1')).toBeDefined();
      });
    });

    describe('getTasks', () => {
      it('should return all tasks', () => {
        const tracker = new ProgressTracker();
        tracker.addTask('task1', 'Task One');
        tracker.addTask('task2', 'Task Two');

        const tasks = tracker.getTasks();
        expect(tasks).toHaveLength(2);
      });
    });

    describe('getSummary', () => {
      it('should return correct summary counts', () => {
        const tracker = new ProgressTracker();
        tracker.addTask('task1', 'Task One');
        tracker.addTask('task2', 'Task Two');
        tracker.addTask('task3', 'Task Three');
        tracker.addTask('task4', 'Task Four');

        tracker.startTask('task1');
        tracker.succeedTask('task1');

        tracker.startTask('task2');
        tracker.failTask('task2');

        tracker.startTask('task3');
        tracker.skipTask('task3');

        // task4 remains pending

        const summary = tracker.getSummary();
        expect(summary.total).toBe(4);
        expect(summary.success).toBe(1);
        expect(summary.error).toBe(1);
        expect(summary.skipped).toBe(1);
        expect(summary.pending).toBe(1);
      });
    });
  });

  describe('createSpinner', () => {
    it('should create a spinner with text', () => {
      const spinner = createSpinner('Loading...');
      expect(ora).toHaveBeenCalledWith({
        text: 'Loading...',
        color: 'cyan',
      });
      expect(spinner).toBeDefined();
    });
  });

  describe('withSpinner', () => {
    it('should run operation with spinner and succeed', async () => {
      const operation = vi.fn().mockResolvedValue('result');

      const result = await withSpinner('Processing...', operation);

      expect(result).toBe('result');
      expect(operation).toHaveBeenCalled();
    });

    it('should fail spinner on error', async () => {
      const error = new Error('Failed');
      const operation = vi.fn().mockRejectedValue(error);

      await expect(withSpinner('Processing...', operation)).rejects.toThrow('Failed');
    });

    it('should use custom success text', async () => {
      const operation = vi.fn().mockResolvedValue('result');

      await withSpinner('Processing...', operation, {
        successText: 'Completed!',
      });

      expect(operation).toHaveBeenCalled();
    });
  });

  describe('showProgress', () => {
    it('should display progress bar', () => {
      showProgress(5, 10, 'Halfway there');

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('50%');
      expect(output).toContain('Halfway there');
    });

    it('should handle 100% progress', () => {
      showProgress(10, 10, 'Complete');

      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('100%');
    });

    it('should handle 0% progress', () => {
      showProgress(0, 10, 'Starting');

      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('0%');
    });
  });
});
