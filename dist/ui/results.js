/**
 * Result display utilities
 */
import chalk from 'chalk';
import { SYMBOLS } from './prompts.js';
/**
 * Get symbol for status
 */
function getStatusSymbol(status) {
    switch (status) {
        case 'success':
            return SYMBOLS.success;
        case 'error':
            return SYMBOLS.error;
        case 'warning':
            return SYMBOLS.warning;
        case 'info':
            return SYMBOLS.info;
        case 'skipped':
            return chalk.dim('');
    }
}
/**
 * Get color function for status
 */
function getStatusColor(status) {
    switch (status) {
        case 'success':
            return chalk.green;
        case 'error':
            return chalk.red;
        case 'warning':
            return chalk.yellow;
        case 'info':
            return chalk.blue;
        case 'skipped':
            return chalk.dim;
    }
}
/**
 * Format a single result item
 */
export function formatResult(result) {
    const symbol = getStatusSymbol(result.status);
    const color = getStatusColor(result.status);
    const label = color(result.label);
    const message = result.message ? chalk.dim(` - ${result.message}`) : '';
    let output = `${symbol} ${label}${message}`;
    if (result.details && result.details.length > 0) {
        result.details.forEach((detail) => {
            output += `\n   ${chalk.dim('')} ${chalk.dim(detail)}`;
        });
    }
    return output;
}
/**
 * Display a result
 */
export function displayResult(result) {
    console.log(formatResult(result));
}
/**
 * Show a summary of results
 */
export function showSummary(results) {
    const counts = {
        success: 0,
        error: 0,
        warning: 0,
        skipped: 0,
    };
    results.forEach((r) => {
        if (r.status === 'success')
            counts.success++;
        else if (r.status === 'error')
            counts.error++;
        else if (r.status === 'warning')
            counts.warning++;
        else if (r.status === 'skipped')
            counts.skipped++;
    });
    console.log();
    console.log(chalk.bold('Summary:'));
    const parts = [];
    if (counts.success > 0) {
        parts.push(chalk.green(`${counts.success} succeeded`));
    }
    if (counts.error > 0) {
        parts.push(chalk.red(`${counts.error} failed`));
    }
    if (counts.warning > 0) {
        parts.push(chalk.yellow(`${counts.warning} warnings`));
    }
    if (counts.skipped > 0) {
        parts.push(chalk.dim(`${counts.skipped} skipped`));
    }
    console.log(`  ${parts.join(', ')}`);
    console.log();
}
/**
 * Display data as a simple table
 */
export function displayTable(data, columns) {
    if (data.length === 0) {
        console.log(chalk.dim('  No data to display'));
        return;
    }
    // Calculate column widths
    const widths = columns.map((col) => {
        if (col.width)
            return col.width;
        const headerLen = col.header.length;
        const maxDataLen = Math.max(...data.map((row) => String(row[col.key] ?? '').length));
        return Math.max(headerLen, maxDataLen);
    });
    // Format cell
    const formatCell = (value, width, align) => {
        const str = value.slice(0, width);
        const padding = width - str.length;
        if (align === 'right')
            return ' '.repeat(padding) + str;
        if (align === 'center') {
            const left = Math.floor(padding / 2);
            const right = padding - left;
            return ' '.repeat(left) + str + ' '.repeat(right);
        }
        return str + ' '.repeat(padding);
    };
    // Print header
    const headerRow = columns
        .map((col, i) => chalk.bold(formatCell(col.header, widths[i], col.align || 'left')))
        .join(' | ');
    console.log(`  ${headerRow}`);
    // Print separator
    const separator = widths.map((w) => '-'.repeat(w)).join('-+-');
    console.log(chalk.dim(`  ${separator}`));
    // Print data rows
    data.forEach((row) => {
        const dataRow = columns
            .map((col, i) => formatCell(String(row[col.key] ?? ''), widths[i], col.align || 'left'))
            .join(' | ');
        console.log(`  ${dataRow}`);
    });
    console.log();
}
/**
 * Display a key-value list
 */
export function displayKeyValue(data) {
    const maxKeyLen = Math.max(...Object.keys(data).map((k) => k.length));
    Object.entries(data).forEach(([key, value]) => {
        const paddedKey = key.padEnd(maxKeyLen);
        console.log(`  ${chalk.cyan(paddedKey)}  ${value}`);
    });
    console.log();
}
/**
 * Display a list of items
 */
export function displayList(items, title) {
    if (title) {
        console.log(chalk.bold(title));
    }
    items.forEach((item) => {
        console.log(`  ${chalk.dim('')} ${item}`);
    });
    console.log();
}
/**
 * Display an error with details
 */
export function displayError(message, details) {
    console.log(`${SYMBOLS.error} ${chalk.red.bold('Error:')} ${message}`);
    if (details) {
        details.forEach((detail) => {
            console.log(`   ${chalk.dim(detail)}`);
        });
    }
    console.log();
}
/**
 * Display a success message
 */
export function displaySuccess(message) {
    console.log(`${SYMBOLS.success} ${chalk.green(message)}`);
}
/**
 * Display a warning message
 */
export function displayWarning(message) {
    console.log(`${SYMBOLS.warning} ${chalk.yellow(message)}`);
}
/**
 * Display an info message
 */
export function displayInfo(message) {
    console.log(`${SYMBOLS.info} ${chalk.blue(message)}`);
}
//# sourceMappingURL=results.js.map