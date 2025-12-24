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
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '../utils/logger.js';
import {
  storeMemory,
  queryMemories,
  deleteMemories,
  getMemoryStats,
  cleanupExpiredMemories,
} from '../heimdall/storage-manager.js';
import {
  optimizedQuery,
} from '../heimdall/query-optimizer.js';
import {
  runFullHealthCheck,
  getQuickStatus,
  getDiagnostics,
} from '../heimdall/health-checker.js';
import {
  validateTags,
  TAG_PREFIXES,
} from '../heimdall/tagging.js';
import {
  isHeimdallReady,
  installHeimdall,
} from '../heimdall/installer.js';
import type { HeimdallMemoryType } from '../types/heimdall.js';

const logger = createLogger({ context: { command: 'memory' } });

/**
 * Create the memory subcommand
 */
export function createMemoryCommand(): Command {
  const memory = new Command('memory')
    .description('Heimdall memory management for persistent agent context')
    .option('--json', 'Output as JSON');

  // === LIST SUBCOMMAND ===
  memory
    .command('list')
    .description('List memories with optional filtering')
    .option('-p, --project <name>', 'Filter by project name')
    .option('-t, --tags <tags>', 'Filter by tags (comma-separated)')
    .option('-a, --agent <name>', 'Filter by agent name')
    .option('--type <type>', 'Filter by memory type (lesson, pattern, decision, error, etc.)')
    .option('-l, --limit <n>', 'Maximum number of memories to return', '20')
    .action(async (options) => {
      const ready = await ensureHeimdallReady();
      if (!ready) return;

      const tags: string[] = [];
      if (options.project) {
        tags.push(`${TAG_PREFIXES.PROJECT}${options.project}`);
      }
      if (options.tags) {
        tags.push(...options.tags.split(',').map((t: string) => t.trim()));
      }

      const memoryTypes = options.type ? [options.type as HeimdallMemoryType] : undefined;

      const result = await queryMemories({
        query: '*', // Wildcard for listing
        tags: tags.length > 0 ? tags : undefined,
        agentName: options.agent,
        memoryTypes,
        limit: parseInt(options.limit, 10),
      });

      if (!result.success) {
        logger.error(`Failed to list memories: ${result.error}`);
        process.exit(1);
      }

      if (memory.opts().json) {
        console.log(JSON.stringify(result.memories, null, 2));
      } else {
        if (result.memories.length === 0) {
          console.log(chalk.yellow('No memories found'));
          return;
        }

        console.log(chalk.bold(`\n🧠 Memories (${result.memories.length} found)\n`));
        for (const mem of result.memories) {
          const typeLabel = mem.memoryType ? `[${mem.memoryType.toUpperCase()}]` : '[MEMORY]';
          const preview = mem.content.length > 80
            ? mem.content.slice(0, 80) + '...'
            : mem.content;
          console.log(`  ${chalk.cyan(typeLabel)} ${chalk.dim(mem.id.slice(0, 8))}`);
          console.log(`    ${preview}`);
          if (mem.tags.length > 0) {
            console.log(chalk.dim(`    Tags: ${mem.tags.slice(0, 5).join(', ')}`));
          }
          console.log();
        }
      }
    });

  // === SEARCH SUBCOMMAND ===
  memory
    .command('search <query>')
    .description('Semantic search through memories')
    .option('-p, --project <name>', 'Filter by project name')
    .option('-a, --agent <name>', 'Filter by agent name')
    .option('--type <type>', 'Filter by memory type')
    .option('-l, --limit <n>', 'Maximum results', '10')
    .option('--min-relevance <score>', 'Minimum relevance score (0-1)', '0.6')
    .option('-f, --format <format>', 'Output format (full, compact, minimal)', 'compact')
    .action(async (query, options) => {
      const ready = await ensureHeimdallReady();
      if (!ready) return;

      const result = await optimizedQuery(query, {
        maxMemories: parseInt(options.limit, 10),
        minRelevance: parseFloat(options.minRelevance),
        priorityTypes: options.type ? [options.type as HeimdallMemoryType] : undefined,
        outputFormat: options.format as 'full' | 'compact' | 'minimal',
        includeMetadata: true,
      });

      if (!result.success) {
        logger.error(`Search failed: ${result.error}`);
        process.exit(1);
      }

      if (memory.opts().json) {
        console.log(JSON.stringify({
          memories: result.memories,
          stats: result.stats,
          tokenEstimate: result.tokenEstimate,
        }, null, 2));
      } else {
        if (result.memories.length === 0) {
          console.log(chalk.yellow('No matching memories found'));
          return;
        }

        console.log(chalk.bold(`\n🔍 Search Results (${result.memories.length} matches)\n`));
        console.log(result.formattedOutput);
        console.log(chalk.dim(`\n  Token estimate: ~${result.tokenEstimate} tokens`));
        console.log(chalk.dim(`  Query stats: ${result.stats.totalQueried} searched → ${result.stats.returned} returned`));
      }
    });

  // === STORE SUBCOMMAND ===
  memory
    .command('store <content>')
    .description('Store a new memory')
    .requiredOption('-t, --tags <tags>', 'Tags for the memory (comma-separated)')
    .option('--type <type>', 'Memory type (lesson, pattern, decision, context, error)', 'context')
    .option('-a, --agent <name>', 'Agent that created this memory')
    .option('--task <id>', 'Related task ID')
    .option('--ttl <days>', 'Time-to-live in days')
    .action(async (content, options) => {
      const ready = await ensureHeimdallReady();
      if (!ready) return;

      const rawTags = options.tags.split(',').map((t: string) => t.trim());
      const validation = validateTags(rawTags);

      if (!validation.valid) {
        logger.error(`Invalid tags: ${validation.errors.join('; ')}`);
        process.exit(1);
      }

      if (validation.warnings.length > 0) {
        for (const warning of validation.warnings) {
          console.log(chalk.yellow(`  Warning: ${warning}`));
        }
      }

      const result = await storeMemory({
        content,
        tags: validation.normalized,
        memoryType: options.type as HeimdallMemoryType,
        agentName: options.agent,
        taskId: options.task,
        ttl: options.ttl ? parseInt(options.ttl, 10) * 24 * 60 * 60 * 1000 : undefined,
      });

      if (!result.success) {
        logger.error(`Failed to store memory: ${result.error}`);
        process.exit(1);
      }

      if (memory.opts().json) {
        console.log(JSON.stringify({ success: true, memoryId: result.memoryId }));
      } else {
        console.log(chalk.green(`✓ Memory stored: ${chalk.bold(result.memoryId)}`));
        console.log(chalk.dim(`  Type: ${options.type}`));
        console.log(chalk.dim(`  Tags: ${validation.normalized.join(', ')}`));
      }
    });

  // === DELETE SUBCOMMAND ===
  memory
    .command('delete <memoryId>')
    .description('Delete a memory by ID')
    .option('-f, --force', 'Skip confirmation')
    .action(async (memoryId, options) => {
      const ready = await ensureHeimdallReady();
      if (!ready) return;

      if (!options.force) {
        console.log(chalk.yellow(`Warning: This will permanently delete memory ${memoryId}`));
        console.log(chalk.dim('Use --force to skip this confirmation'));
        // In a real implementation, we'd use @clack/prompts for confirmation
        // For now, require --force
        process.exit(1);
      }

      const result = await deleteMemories({ memoryId });

      if (!result.success) {
        logger.error(`Failed to delete memory: ${result.error}`);
        process.exit(1);
      }

      if (memory.opts().json) {
        console.log(JSON.stringify({ success: true, memoryId, deleted: result.deletedCount }));
      } else {
        console.log(chalk.green(`✓ Deleted memory: ${memoryId}`));
      }
    });

  // === EXPORT SUBCOMMAND ===
  memory
    .command('export')
    .description('Export memories to JSON file')
    .option('-o, --output <file>', 'Output file path', 'memories-export.json')
    .option('-p, --project <name>', 'Filter by project')
    .option('-t, --tags <tags>', 'Filter by tags (comma-separated)')
    .option('-a, --agent <name>', 'Filter by agent')
    .option('-l, --limit <n>', 'Maximum memories to export', '1000')
    .action(async (options) => {
      const ready = await ensureHeimdallReady();
      if (!ready) return;

      const tags: string[] = [];
      if (options.project) {
        tags.push(`${TAG_PREFIXES.PROJECT}${options.project}`);
      }
      if (options.tags) {
        tags.push(...options.tags.split(',').map((t: string) => t.trim()));
      }

      const result = await queryMemories({
        query: '*',
        tags: tags.length > 0 ? tags : undefined,
        agentName: options.agent,
        limit: parseInt(options.limit, 10),
      });

      if (!result.success) {
        logger.error(`Failed to query memories: ${result.error}`);
        process.exit(1);
      }

      const exportData = {
        exportedAt: new Date().toISOString(),
        totalMemories: result.memories.length,
        filters: {
          project: options.project,
          tags: options.tags,
          agent: options.agent,
        },
        memories: result.memories,
      };

      const outputPath = path.resolve(options.output);
      fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));

      if (memory.opts().json) {
        console.log(JSON.stringify({ success: true, path: outputPath, count: result.memories.length }));
      } else {
        console.log(chalk.green(`✓ Exported ${result.memories.length} memories to ${outputPath}`));
      }
    });

  // === PRUNE SUBCOMMAND ===
  memory
    .command('prune')
    .description('Clean up old or expired memories')
    .option('--older-than <days>', 'Delete memories older than N days')
    .option('--expired', 'Delete only expired (TTL) memories')
    .option('-f, --force', 'Skip confirmation')
    .action(async (options) => {
      const ready = await ensureHeimdallReady();
      if (!ready) return;

      if (!options.olderThan && !options.expired) {
        logger.error('Must specify either --older-than <days> or --expired');
        process.exit(1);
      }

      if (!options.force) {
        console.log(chalk.yellow('Warning: This will permanently delete memories'));
        console.log(chalk.dim('Use --force to skip this confirmation'));
        process.exit(1);
      }

      let result;

      if (options.expired) {
        result = await cleanupExpiredMemories();
      } else {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(options.olderThan, 10));
        result = await deleteMemories({ olderThan: cutoffDate.toISOString() });
      }

      if (!result.success) {
        logger.error(`Failed to prune memories: ${result.error}`);
        process.exit(1);
      }

      if (memory.opts().json) {
        console.log(JSON.stringify({ success: true, deleted: result.deletedCount }));
      } else {
        console.log(chalk.green(`✓ Pruned memories (${result.deletedCount === -1 ? 'unknown count' : result.deletedCount} deleted)`));
      }
    });

  // === STATS SUBCOMMAND ===
  memory
    .command('stats')
    .description('Show memory statistics')
    .option('-p, --project <name>', 'Filter by project')
    .action(async (_options) => {
      const ready = await ensureHeimdallReady();
      if (!ready) return;

      const stats = await getMemoryStats();

      if (memory.opts().json) {
        console.log(JSON.stringify(stats, null, 2));
      } else {
        console.log(chalk.bold('\n📊 Memory Statistics\n'));
        console.log(`  Total memories: ${chalk.cyan(stats.totalMemories)}`);

        if (Object.keys(stats.byType).length > 0) {
          console.log(chalk.bold('\n  By Type:'));
          for (const [type, count] of Object.entries(stats.byType)) {
            console.log(`    ${type}: ${count}`);
          }
        }

        if (Object.keys(stats.byAgent).length > 0) {
          console.log(chalk.bold('\n  By Agent:'));
          for (const [agent, count] of Object.entries(stats.byAgent)) {
            console.log(`    ${agent}: ${count}`);
          }
        }

        if (stats.oldestMemory) {
          console.log(chalk.dim(`\n  Oldest: ${stats.oldestMemory}`));
        }
        if (stats.newestMemory) {
          console.log(chalk.dim(`  Newest: ${stats.newestMemory}`));
        }
        console.log();
      }
    });

  // === HEALTH SUBCOMMAND ===
  memory
    .command('health')
    .description('Check Heimdall system health')
    .option('--verbose', 'Show detailed diagnostics')
    .action(async (options) => {
      if (memory.opts().json) {
        const report = await runFullHealthCheck();
        console.log(JSON.stringify(report, null, 2));
        return;
      }

      console.log(chalk.bold('\n🏥 Heimdall Health Check\n'));

      const quickStatus = await getQuickStatus();

      const statusIcon = (ok: boolean) => ok ? chalk.green('✓') : chalk.red('✗');

      console.log(`  ${statusIcon(quickStatus.docker)} Docker`);
      console.log(`  ${statusIcon(quickStatus.qdrant)} Qdrant`);
      console.log(`  ${statusIcon(quickStatus.embedding)} Embedding Service`);
      console.log(`  ${statusIcon(quickStatus.mcp)} MCP Configuration`);
      console.log();

      if (quickStatus.operational) {
        console.log(chalk.green('  ✓ Heimdall is operational\n'));
      } else {
        console.log(chalk.red('  ✗ Heimdall has issues\n'));

        if (options.verbose) {
          const diagnostics = await getDiagnostics();
          console.log(chalk.bold('  Diagnostics:'));
          console.log(chalk.dim(`  Environment:`));
          for (const [key, value] of Object.entries(diagnostics.environment)) {
            console.log(chalk.dim(`    ${key}: ${value || '(not set)'}`));
          }
          if (diagnostics.config) {
            console.log(chalk.dim(`  Config: ${JSON.stringify(diagnostics.config, null, 2)}`));
          }
        } else {
          console.log(chalk.dim('  Run with --verbose for diagnostics'));
        }
      }
    });

  // === INIT SUBCOMMAND ===
  memory
    .command('init')
    .description('Initialize Heimdall memory system')
    .option('-f, --force', 'Force reinstallation')
    .action(async (options) => {
      console.log(chalk.bold('\n🚀 Initializing Heimdall Memory System\n'));

      const result = await installHeimdall({ force: options.force });

      if (!result.success) {
        logger.error(`Installation failed: ${result.error}`);
        process.exit(1);
      }

      if (memory.opts().json) {
        console.log(JSON.stringify(result));
      } else {
        console.log(chalk.green('✓ Heimdall initialized successfully\n'));
        console.log(chalk.dim('  Run `aes-bizzy memory health` to verify the setup'));
      }
    });

  return memory;
}

/**
 * Ensure Heimdall is ready before running memory commands
 */
async function ensureHeimdallReady(): Promise<boolean> {
  const ready = await isHeimdallReady();

  if (!ready) {
    console.log(chalk.yellow('\n⚠ Heimdall is not initialized or not running\n'));
    console.log(chalk.dim('  Run `aes-bizzy memory init` to set up Heimdall'));
    console.log(chalk.dim('  Run `aes-bizzy memory health` to diagnose issues\n'));
    return false;
  }

  return true;
}
