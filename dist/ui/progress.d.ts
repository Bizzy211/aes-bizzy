/**
 * Progress tracking with ora spinners
 */
import { Ora } from 'ora';
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
export declare class ProgressTracker {
    private tasks;
    private spinner;
    private currentTaskId;
    /**
     * Add a task to track
     */
    addTask(id: string, name: string): void;
    /**
     * Start a task
     */
    startTask(id: string, message?: string): void;
    /**
     * Update task message
     */
    updateTask(id: string, message: string): void;
    /**
     * Complete a task successfully
     */
    succeedTask(id: string, message?: string): void;
    /**
     * Fail a task
     */
    failTask(id: string, error?: string): void;
    /**
     * Skip a task
     */
    skipTask(id: string, reason?: string): void;
    /**
     * Stop all spinners
     */
    stop(): void;
    /**
     * Get all tasks
     */
    getTasks(): Task[];
    /**
     * Get task by ID
     */
    getTask(id: string): Task | undefined;
    /**
     * Get summary of task statuses
     */
    getSummary(): {
        total: number;
        success: number;
        error: number;
        skipped: number;
        pending: number;
    };
}
/**
 * Create a simple spinner
 */
export declare function createSpinner(text: string): Ora;
/**
 * Run an async operation with a spinner
 */
export declare function withSpinner<T>(text: string, operation: () => Promise<T>, options?: {
    successText?: string;
    failText?: string;
}): Promise<T>;
/**
 * Show a progress bar style message
 */
export declare function showProgress(current: number, total: number, label: string): void;
//# sourceMappingURL=progress.d.ts.map