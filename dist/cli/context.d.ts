/**
 * Context CLI command
 *
 * Provides context management functionality for the A.E.S - Bizzy CLI:
 * - aes-bizzy context add <title> --type <type> --agent <agent>
 * - aes-bizzy context search <query> --type <type> --agent <agent>
 * - aes-bizzy context list --type <type> --agent <agent>
 * - aes-bizzy context show <beadId>
 * - aes-bizzy context remove <beadId>
 * - aes-bizzy context sync [--task-id <id>]
 * - aes-bizzy context prime [--agent <agent>] [--task <id>]
 * - aes-bizzy context tags [--type <prefix>]
 * - aes-bizzy context export --format <json|markdown>
 * - aes-bizzy context import <file>
 */
import { Command } from 'commander';
/**
 * Create the context subcommand
 */
export declare function createContextCommand(): Command;
//# sourceMappingURL=context.d.ts.map