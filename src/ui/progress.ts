/**
 * Progress tracking with ora spinners
 */

import ora, { Ora } from 'ora';
import chalk from 'chalk';

/**
 * Task status for progress tracking
 */
export type TaskStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped';

/**
 * Task information
 */
export interface Task {
  id: string;
  name: string;
  status: TaskStatus;
  message?: string;
  error?: string;
}

/**
 * Progress tracker for managing multiple spinners
 */
export class ProgressTracker {
  private tasks: Map<string, Task> = new Map();
  private spinner: Ora | null = null;
  private currentTaskId: string | null = null;

  /**
   * Add a task to track
   */
  addTask(id: string, name: string): void {
    this.tasks.set(id, {
      id,
      name,
      status: 'pending',
    });
  }

  /**
   * Start a task
   */
  startTask(id: string, message?: string): void {
    const task = this.tasks.get(id);
    if (!task) return;

    task.status = 'running';
    task.message = message;
    this.currentTaskId = id;

    // Stop any existing spinner
    if (this.spinner) {
      this.spinner.stop();
    }

    // Start a new spinner
    this.spinner = ora({
      text: message || task.name,
      color: 'cyan',
    }).start();
  }

  /**
   * Update task message
   */
  updateTask(id: string, message: string): void {
    const task = this.tasks.get(id);
    if (!task) return;

    task.message = message;

    if (this.currentTaskId === id && this.spinner) {
      this.spinner.text = message;
    }
  }

  /**
   * Complete a task successfully
   */
  succeedTask(id: string, message?: string): void {
    const task = this.tasks.get(id);
    if (!task) return;

    task.status = 'success';
    task.message = message || task.message;

    if (this.currentTaskId === id && this.spinner) {
      this.spinner.succeed(chalk.green(message || task.name));
      this.spinner = null;
      this.currentTaskId = null;
    }
  }

  /**
   * Fail a task
   */
  failTask(id: string, error?: string): void {
    const task = this.tasks.get(id);
    if (!task) return;

    task.status = 'error';
    task.error = error;

    if (this.currentTaskId === id && this.spinner) {
      this.spinner.fail(chalk.red(error || `${task.name} failed`));
      this.spinner = null;
      this.currentTaskId = null;
    }
  }

  /**
   * Skip a task
   */
  skipTask(id: string, reason?: string): void {
    const task = this.tasks.get(id);
    if (!task) return;

    task.status = 'skipped';
    task.message = reason;

    if (this.currentTaskId === id && this.spinner) {
      this.spinner.warn(chalk.yellow(reason || `${task.name} skipped`));
      this.spinner = null;
      this.currentTaskId = null;
    }
  }

  /**
   * Stop all spinners
   */
  stop(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
    this.currentTaskId = null;
  }

  /**
   * Get all tasks
   */
  getTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get task by ID
   */
  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  /**
   * Get summary of task statuses
   */
  getSummary(): {
    total: number;
    success: number;
    error: number;
    skipped: number;
    pending: number;
  } {
    const tasks = this.getTasks();
    return {
      total: tasks.length,
      success: tasks.filter((t) => t.status === 'success').length,
      error: tasks.filter((t) => t.status === 'error').length,
      skipped: tasks.filter((t) => t.status === 'skipped').length,
      pending: tasks.filter((t) => t.status === 'pending').length,
    };
  }
}

/**
 * Create a simple spinner
 */
export function createSpinner(text: string): Ora {
  return ora({
    text,
    color: 'cyan',
  });
}

/**
 * Run an async operation with a spinner
 */
export async function withSpinner<T>(
  text: string,
  operation: () => Promise<T>,
  options?: {
    successText?: string;
    failText?: string;
  }
): Promise<T> {
  const spinner = ora({
    text,
    color: 'cyan',
  }).start();

  try {
    const result = await operation();
    spinner.succeed(chalk.green(options?.successText || text));
    return result;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    spinner.fail(chalk.red(options?.failText || message));
    throw error;
  }
}

/**
 * Show a progress bar style message
 */
export function showProgress(current: number, total: number, label: string): void {
  const percentage = Math.round((current / total) * 100);
  const filled = Math.round((current / total) * 20);
  const empty = 20 - filled;
  const bar = chalk.cyan('') + chalk.dim(''.repeat(empty));
  console.log(`${bar} ${chalk.dim(`${percentage}%`)} ${label}`);
}
