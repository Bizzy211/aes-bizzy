/**
 * Result display utilities
 */
/**
 * Result status type
 */
export type ResultStatus = 'success' | 'error' | 'warning' | 'info' | 'skipped';
/**
 * Result item to display
 */
export interface ResultItem {
    label: string;
    status: ResultStatus;
    message?: string;
    details?: string[];
}
/**
 * Format a single result item
 */
export declare function formatResult(result: ResultItem): string;
/**
 * Display a result
 */
export declare function displayResult(result: ResultItem): void;
/**
 * Show a summary of results
 */
export declare function showSummary(results: ResultItem[]): void;
/**
 * Table column definition
 */
export interface TableColumn {
    key: string;
    header: string;
    width?: number;
    align?: 'left' | 'right' | 'center';
}
/**
 * Display data as a simple table
 */
export declare function displayTable<T extends Record<string, unknown>>(data: T[], columns: TableColumn[]): void;
/**
 * Display a key-value list
 */
export declare function displayKeyValue(data: Record<string, string | number | boolean>): void;
/**
 * Display a list of items
 */
export declare function displayList(items: string[], title?: string): void;
/**
 * Display an error with details
 */
export declare function displayError(message: string, details?: string[]): void;
/**
 * Display a success message
 */
export declare function displaySuccess(message: string): void;
/**
 * Display a warning message
 */
export declare function displayWarning(message: string): void;
/**
 * Display an info message
 */
export declare function displayInfo(message: string): void;
//# sourceMappingURL=results.d.ts.map