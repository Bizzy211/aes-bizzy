/**
 * Gitignore utility for programmatic updates
 *
 * Adds entries to .gitignore without duplicating existing ones.
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { existsSync } from 'node:fs';
/**
 * Default Claude/AES Bizzy gitignore entries
 */
export const CLAUDE_GITIGNORE_ENTRIES = [
    '',
    '# Claude Code / AES Bizzy',
    '.claude/',
    '.mcp.json',
    '.env.claude',
];
/**
 * Check if an entry exists in gitignore content
 * Handles comments and whitespace
 */
export function hasGitignoreEntry(content, entry) {
    // Skip empty lines and comments for matching
    if (!entry.trim() || entry.startsWith('#')) {
        return false;
    }
    const lines = content.split('\n').map((line) => line.trim());
    return lines.includes(entry.trim());
}
/**
 * Check if all Claude entries already exist in gitignore
 */
export function hasAllClaudeEntries(content) {
    return CLAUDE_GITIGNORE_ENTRIES
        .filter((entry) => entry.trim() && !entry.startsWith('#'))
        .every((entry) => hasGitignoreEntry(content, entry));
}
/**
 * Get entries that need to be added (not already present)
 */
export function getMissingEntries(content, entries) {
    const missing = [];
    let inClaudeSection = false;
    for (const entry of entries) {
        // Always include empty lines and comments if we're adding a section
        if (!entry.trim()) {
            if (!inClaudeSection) {
                missing.push(entry);
                inClaudeSection = true;
            }
            continue;
        }
        if (entry.startsWith('#')) {
            // Check if comment already exists
            if (!content.includes(entry)) {
                missing.push(entry);
            }
            continue;
        }
        // Check if actual entry exists
        if (!hasGitignoreEntry(content, entry)) {
            missing.push(entry);
        }
    }
    return missing;
}
/**
 * Add entries to .gitignore if not already present
 *
 * @param projectPath - Path to the project root
 * @param entries - Array of entries to add (defaults to Claude entries)
 * @returns Object with success status and details
 */
export async function updateGitignore(projectPath, entries = CLAUDE_GITIGNORE_ENTRIES) {
    const gitignorePath = path.join(projectPath, '.gitignore');
    try {
        let content = '';
        let created = false;
        // Read existing content if file exists
        if (existsSync(gitignorePath)) {
            content = await fs.readFile(gitignorePath, 'utf-8');
        }
        else {
            created = true;
        }
        // Check if all entries already exist
        if (hasAllClaudeEntries(content)) {
            return {
                success: true,
                created: false,
                entriesAdded: 0,
            };
        }
        // Get entries that need to be added
        const missing = getMissingEntries(content, entries);
        if (missing.length === 0) {
            return {
                success: true,
                created: false,
                entriesAdded: 0,
            };
        }
        // Ensure content ends with newline before appending
        if (content && !content.endsWith('\n')) {
            content += '\n';
        }
        // Append missing entries
        content += missing.join('\n') + '\n';
        // Write updated content
        await fs.writeFile(gitignorePath, content, 'utf-8');
        // Count actual entries added (excluding empty lines and comments)
        const actualEntries = missing.filter((e) => e.trim() && !e.startsWith('#'));
        return {
            success: true,
            created,
            entriesAdded: actualEntries.length,
        };
    }
    catch (error) {
        return {
            success: false,
            created: false,
            entriesAdded: 0,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
/**
 * Remove Claude entries from .gitignore
 * Useful for cleanup or migration
 */
export async function removeClaudeEntries(projectPath) {
    const gitignorePath = path.join(projectPath, '.gitignore');
    try {
        if (!existsSync(gitignorePath)) {
            return { success: true, entriesRemoved: 0 };
        }
        const content = await fs.readFile(gitignorePath, 'utf-8');
        const lines = content.split('\n');
        // Filter out Claude-related entries
        const entriesToRemove = new Set(CLAUDE_GITIGNORE_ENTRIES.map((e) => e.trim()).filter((e) => e));
        let inClaudeSection = false;
        const filteredLines = [];
        let removedCount = 0;
        for (const line of lines) {
            const trimmed = line.trim();
            // Detect start of Claude section
            if (trimmed === '# Claude Code / AES Bizzy') {
                inClaudeSection = true;
                removedCount++;
                continue;
            }
            // If in Claude section, check if this line should be removed
            if (inClaudeSection) {
                if (entriesToRemove.has(trimmed)) {
                    removedCount++;
                    continue;
                }
                // Empty line might end the section or be part of it
                if (!trimmed) {
                    continue;
                }
                // Non-matching line ends the section
                inClaudeSection = false;
            }
            filteredLines.push(line);
        }
        // Write filtered content
        await fs.writeFile(gitignorePath, filteredLines.join('\n'), 'utf-8');
        return { success: true, entriesRemoved: removedCount };
    }
    catch (error) {
        return {
            success: false,
            entriesRemoved: 0,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
//# sourceMappingURL=gitignore.js.map