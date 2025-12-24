/**
 * Memory CLI command wrapper for Heimdall
 *
 * Provides memory management functionality for the A.E.S - Bizzy CLI:
 * - aes-bizzy memory list [--project <name>] [--tags <tag1,tag2>]
 * - aes-bizzy memory search <query> [--project <name>]
 * - aes-bizzy memory store "<content>" --tags <tag1,tag2>
 * - aes-bizzy memory delete <memory-id>
 * - aes-bizzy memory export [--output <file>] [--project <name>]
 * - aes-bizzy memory prune --older-than <days>
 * - aes-bizzy memory stats [--project <name>]
 * - aes-bizzy memory health
 */
import { Command } from 'commander';
/**
 * Create the memory subcommand
 */
export declare function createMemoryCommand(): Command;
//# sourceMappingURL=memory.d.ts.map