/**
 * Gitignore utility for programmatic updates
 *
 * Adds entries to .gitignore without duplicating existing ones.
 */
/**
 * Default Claude/AES Bizzy gitignore entries
 */
export declare const CLAUDE_GITIGNORE_ENTRIES: string[];
/**
 * Check if an entry exists in gitignore content
 * Handles comments and whitespace
 */
export declare function hasGitignoreEntry(content: string, entry: string): boolean;
/**
 * Check if all Claude entries already exist in gitignore
 */
export declare function hasAllClaudeEntries(content: string): boolean;
/**
 * Get entries that need to be added (not already present)
 */
export declare function getMissingEntries(content: string, entries: string[]): string[];
/**
 * Add entries to .gitignore if not already present
 *
 * @param projectPath - Path to the project root
 * @param entries - Array of entries to add (defaults to Claude entries)
 * @returns Object with success status and details
 */
export declare function updateGitignore(projectPath: string, entries?: string[]): Promise<{
    success: boolean;
    created: boolean;
    entriesAdded: number;
    error?: string;
}>;
/**
 * Remove Claude entries from .gitignore
 * Useful for cleanup or migration
 */
export declare function removeClaudeEntries(projectPath: string): Promise<{
    success: boolean;
    entriesRemoved: number;
    error?: string;
}>;
//# sourceMappingURL=gitignore.d.ts.map