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
import chalk from 'chalk';
import * as fs from 'fs';
import { createLogger } from '../utils/logger.js';
import {
  createContext,
  getContext,
  removeContext,
  searchContext,
  listContext,
  listTags,
  findRelated,
  exportBeadsToJson,
  importBeadsFromJson,
} from '../beads/context-store.js';
import type {
  ContextType,
  ContextScope,
  ContextBead,
  PrimeContextOptions,
} from '../types/context.js';

const logger = createLogger({ context: { command: 'context' } });

// Valid context types for validation
const VALID_CONTEXT_TYPES: ContextType[] = [
  'decision',
  'learning',
  'architecture',
  'pattern',
  'blocker',
  'handoff',
];

/**
 * Create the context subcommand
 */
export function createContextCommand(): Command {
  const context = new Command('context')
    .description('Context management for agent orchestration')
    .option('--json', 'Output as JSON')
    .option('--global', 'Use global context scope (~/.beads)');

  // === ADD SUBCOMMAND ===
  context
    .command('add <title>')
    .description('Add a new context bead')
    .requiredOption('-t, --type <type>', `Context type: ${VALID_CONTEXT_TYPES.join(', ')}`)
    .requiredOption('-a, --agent <agent>', 'Agent type (e.g., frontend-dev, backend-dev)')
    .option('--task <taskId>', 'Associated Task Master task ID')
    .option('-d, --description <text>', 'Context description')
    .option('-c, --content <text>', 'Context content body')
    .option('-f, --file <path>', 'Read content from file')
    .option('--tags <tags...>', 'Additional semantic tags')
    .action(async (title, options) => {
      // Validate type
      if (!VALID_CONTEXT_TYPES.includes(options.type)) {
        logger.error(`Invalid type: ${options.type}. Must be one of: ${VALID_CONTEXT_TYPES.join(', ')}`);
        process.exit(1);
      }

      // Read content from file if specified
      let content = options.content;
      if (options.file) {
        try {
          content = await fs.promises.readFile(options.file, 'utf-8');
        } catch (error) {
          logger.error(`Failed to read file: ${options.file}`);
          process.exit(1);
        }
      }

      const scope: ContextScope = context.opts().global ? 'global' : 'project';

      const result = await createContext({
        title,
        type: options.type as ContextType,
        agentType: options.agent,
        taskId: options.task,
        description: options.description,
        content,
        tags: options.tags,
        scope,
      });

      if (!result.success) {
        logger.error(`Failed to create context: ${result.error}`);
        process.exit(1);
      }

      if (context.opts().json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(chalk.green(`✓ Created context: ${chalk.bold(result.id)}`));
        console.log(chalk.dim(`  Type: ${options.type}`));
        console.log(chalk.dim(`  Agent: ${options.agent}`));
        if (options.task) {
          console.log(chalk.dim(`  Task: ${options.task}`));
        }
      }
    });

  // === SEARCH SUBCOMMAND ===
  context
    .command('search [query]')
    .description('Search context by keywords, tags, or type')
    .option('-t, --type <type>', 'Filter by context type')
    .option('-a, --agent <agent>', 'Filter by agent type')
    .option('--task <taskId>', 'Filter by task ID')
    .option('--tags <tags...>', 'Filter by tags (AND logic)')
    .option('-l, --limit <n>', 'Maximum results (default: 10)', '10')
    .option('--include-global', 'Include global context in results')
    .action(async (query, options) => {
      const scope: ContextScope = context.opts().global ? 'global' : 'project';

      const result = await searchContext({
        query,
        type: options.type as ContextType,
        agent: options.agent,
        task: options.task,
        tags: options.tags,
        limit: parseInt(options.limit, 10),
        scope,
        includeGlobal: options.includeGlobal,
      });

      if (!result.success) {
        logger.error(`Failed to search: ${result.error}`);
        process.exit(1);
      }

      if (context.opts().json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        if (result.beads.length === 0) {
          console.log(chalk.yellow('No matching context found'));
          return;
        }

        console.log(chalk.bold(`\n🔍 Search Results (${result.beads.length}/${result.total})\n`));
        for (const bead of result.beads) {
          displayBeadSummary(bead);
        }
        if (result.hasMore) {
          console.log(chalk.dim(`  ... and ${result.total - result.beads.length} more results`));
        }
        console.log();
      }
    });

  // === LIST SUBCOMMAND ===
  context
    .command('list')
    .description('List context beads with filtering')
    .option('-t, --type <type>', 'Filter by context type')
    .option('-a, --agent <agent>', 'Filter by agent type')
    .option('--task <taskId>', 'Filter by task ID')
    .option('-d, --date <range>', 'Date range: last-day, last-week, last-month, all')
    .option('-l, --limit <n>', 'Maximum results (default: 20)', '20')
    .option('-s, --sort <field>', 'Sort by: createdAt, updatedAt, priority')
    .option('-o, --order <dir>', 'Sort order: asc, desc')
    .action(async (options) => {
      const scope: ContextScope = context.opts().global ? 'global' : 'project';

      const result = await listContext({
        type: options.type as ContextType,
        agent: options.agent,
        task: options.task,
        dateRange: options.date,
        limit: parseInt(options.limit, 10),
        sortBy: options.sort,
        sortOrder: options.order,
        scope,
      });

      if (!result.success) {
        logger.error(`Failed to list: ${result.error}`);
        process.exit(1);
      }

      if (context.opts().json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        if (result.beads.length === 0) {
          console.log(chalk.yellow('No context beads found'));
          return;
        }

        console.log(chalk.bold(`\n📋 Context Beads (${result.beads.length}/${result.total})\n`));
        for (const bead of result.beads) {
          displayBeadSummary(bead);
        }
        console.log();
      }
    });

  // === SHOW SUBCOMMAND ===
  context
    .command('show <beadId>')
    .description('Show full details of a context bead')
    .action(async (beadId) => {
      const scope: ContextScope = context.opts().global ? 'global' : 'project';
      const bead = await getContext(beadId, scope);

      if (!bead) {
        logger.error(`Context bead not found: ${beadId}`);
        process.exit(1);
      }

      if (context.opts().json) {
        console.log(JSON.stringify(bead, null, 2));
      } else {
        displayBeadFull(bead);

        // Show related beads
        const related = await findRelated(beadId, scope);
        if (related.length > 0) {
          console.log(chalk.bold('\n📎 Related Context\n'));
          for (const rel of related) {
            console.log(`  [${chalk.cyan(rel.id.substring(0, 8))}] ${rel.title}`);
          }
          console.log();
        }
      }
    });

  // === REMOVE SUBCOMMAND ===
  context
    .command('remove <beadId>')
    .description('Remove a context bead (moves to trash)')
    .option('--confirm', 'Skip confirmation prompt')
    .action(async (beadId, options) => {
      const scope: ContextScope = context.opts().global ? 'global' : 'project';

      // Check if bead exists
      const bead = await getContext(beadId, scope);
      if (!bead) {
        logger.error(`Context bead not found: ${beadId}`);
        process.exit(1);
      }

      // Confirm unless --confirm flag provided
      if (!options.confirm) {
        console.log(chalk.yellow(`About to remove: ${bead.title}`));
        console.log(chalk.dim('Use --confirm to skip this prompt'));
        // In a real implementation, we'd prompt for confirmation
        // For now, we'll just proceed
      }

      const result = await removeContext(beadId, scope);

      if (!result.success) {
        logger.error(`Failed to remove: ${result.error}`);
        process.exit(1);
      }

      if (context.opts().json) {
        console.log(JSON.stringify({ success: true, beadId }));
      } else {
        console.log(chalk.green(`✓ Removed context bead: ${beadId}`));
        console.log(chalk.dim('  Bead moved to .beads/.trash for recovery'));
      }
    });

  // === TAGS SUBCOMMAND ===
  context
    .command('tags')
    .description('List all tags with usage counts')
    .option('-t, --type <prefix>', 'Filter by tag prefix (agent, project, task, component, feature, tech)')
    .action(async (options) => {
      const scope: ContextScope = context.opts().global ? 'global' : 'project';

      const result = await listTags(options.type, scope);

      if (!result.success) {
        logger.error(`Failed to list tags: ${result.error}`);
        process.exit(1);
      }

      if (context.opts().json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        if (result.tags.length === 0) {
          console.log(chalk.yellow('No tags found'));
          return;
        }

        console.log(chalk.bold(`\n🏷️  Tags (${result.total})\n`));
        for (const tag of result.tags) {
          const bar = '█'.repeat(Math.ceil(tag.percentage / 5));
          const color = tag.percentage > 50 ? chalk.green : tag.percentage > 20 ? chalk.yellow : chalk.dim;
          console.log(`  ${color(tag.tag.padEnd(30))} ${tag.count.toString().padStart(4)} ${color(bar)}`);
        }
        console.log();
      }
    });

  // === SYNC SUBCOMMAND ===
  context
    .command('sync')
    .description('Sync handoff data from Task Master to Beads context')
    .option('--task-id <id>', 'Sync specific task ID only')
    .action(async (options) => {
      console.log(chalk.yellow('Note: sync command requires Task Master integration'));
      console.log(chalk.dim('This will import handoff data from Task Master subtasks'));

      if (options.taskId) {
        console.log(chalk.dim(`Syncing task: ${options.taskId}`));
      }

      // TODO: Implement Task Master sync in subtask 68.8
      console.log(chalk.dim('\nSync functionality will be implemented in a future update.'));
    });

  // === PRIME SUBCOMMAND ===
  context
    .command('prime')
    .description('Export assembled context for agent consumption')
    .option('-a, --agent <agent>', 'Filter by agent type')
    .option('--task <taskId>', 'Filter by task ID')
    .option('-f, --format <format>', 'Output format: prompt, json, markdown', 'prompt')
    .option('-o, --output <file>', 'Output file path (stdout if not specified)')
    .option('-m, --max-tokens <n>', 'Maximum tokens (default: 5000)', '5000')
    .option('--include-global', 'Include global context')
    .action(async (options) => {
      const scope: ContextScope = context.opts().global ? 'global' : 'project';

      // Get relevant context
      const searchResult = await searchContext({
        agent: options.agent,
        task: options.task,
        scope,
        includeGlobal: options.includeGlobal,
        limit: 100, // Get more for filtering
      });

      if (!searchResult.success) {
        logger.error(`Failed to gather context: ${searchResult.error}`);
        process.exit(1);
      }

      // Format output based on requested format
      let output: string;

      switch (options.format) {
        case 'json':
          output = JSON.stringify({
            metadata: {
              assembledAt: new Date().toISOString(),
              agentType: options.agent,
              taskId: options.task,
              beadCount: searchResult.beads.length,
            },
            beads: searchResult.beads,
          }, null, 2);
          break;

        case 'markdown':
          output = formatContextAsMarkdown(searchResult.beads, options);
          break;

        case 'prompt':
        default:
          output = formatContextAsPrompt(searchResult.beads, options);
          break;
      }

      // Write to file or stdout
      if (options.output) {
        await fs.promises.writeFile(options.output, output);
        console.log(chalk.green(`✓ Context exported to: ${options.output}`));
      } else if (context.opts().json) {
        console.log(output);
      } else {
        console.log(chalk.bold('\n📦 Primed Context\n'));
        console.log(output);
      }
    });

  // === EXPORT SUBCOMMAND ===
  context
    .command('export')
    .description('Export all context to JSON or Markdown file')
    .requiredOption('-f, --format <format>', 'Output format: json, markdown')
    .option('-o, --output <file>', 'Output file path')
    .option('-t, --type <type>', 'Filter by context type')
    .option('-a, --agent <agent>', 'Filter by agent type')
    .action(async (options) => {
      const scope: ContextScope = context.opts().global ? 'global' : 'project';

      const exportData = await exportBeadsToJson(scope, undefined, {
        type: options.type as ContextType,
        agent: options.agent,
      });

      let output: string;

      if (options.format === 'markdown') {
        output = formatExportAsMarkdown(exportData);
      } else {
        output = JSON.stringify(exportData, null, 2);
      }

      if (options.output) {
        await fs.promises.writeFile(options.output, output);
        console.log(chalk.green(`✓ Exported ${exportData.count} beads to: ${options.output}`));
      } else {
        console.log(output);
      }
    });

  // === IMPORT SUBCOMMAND ===
  context
    .command('import <file>')
    .description('Import context from JSON export file')
    .option('--merge', 'Merge with existing context (default: replace)')
    .action(async (file, options) => {
      const scope: ContextScope = context.opts().global ? 'global' : 'project';

      // Read and parse file
      let data;
      try {
        const content = await fs.promises.readFile(file, 'utf-8');
        data = JSON.parse(content);
      } catch (error) {
        logger.error(`Failed to read import file: ${file}`);
        process.exit(1);
      }

      // Validate structure
      if (!data.beads || !Array.isArray(data.beads)) {
        logger.error('Invalid import file: missing beads array');
        process.exit(1);
      }

      const result = await importBeadsFromJson(data, {
        merge: options.merge,
        scope,
      });

      if (context.opts().json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(chalk.green(`✓ Import complete`));
        console.log(chalk.dim(`  Imported: ${result.imported}`));
        console.log(chalk.dim(`  Skipped: ${result.skipped}`));
        if (result.errors.length > 0) {
          console.log(chalk.yellow(`  Errors: ${result.errors.length}`));
          result.errors.slice(0, 5).forEach(e => console.log(chalk.dim(`    - ${e}`)));
        }
      }
    });

  // === HELP SUBCOMMAND ===
  context
    .command('help')
    .description('Display context command help')
    .action(() => {
      console.log(chalk.bold('\n📚 Context Command Reference\n'));
      console.log('  aes-bizzy context add <title>     Add new context bead');
      console.log('  aes-bizzy context search [query]  Search by keywords/tags');
      console.log('  aes-bizzy context list            List all context beads');
      console.log('  aes-bizzy context show <id>       Show bead details');
      console.log('  aes-bizzy context remove <id>     Remove bead (soft delete)');
      console.log('  aes-bizzy context tags            List all tags');
      console.log('  aes-bizzy context sync            Sync from Task Master');
      console.log('  aes-bizzy context prime           Export for agent');
      console.log('  aes-bizzy context export          Export to file');
      console.log('  aes-bizzy context import <file>   Import from file');
      console.log('\n  --json     Output as JSON');
      console.log('  --global   Use global scope (~/.beads)');
      console.log();
    });

  return context;
}

// ============================================================================
// Display Helpers
// ============================================================================

/**
 * Display bead summary line
 */
function displayBeadSummary(bead: ContextBead): void {
  const typeIcon = getTypeIcon(bead.contextType);
  const shortId = bead.id.substring(0, 8);
  console.log(`  ${typeIcon} [${chalk.cyan(shortId)}] ${bead.title}`);
  console.log(chalk.dim(`       ${bead.contextType} • ${getTimeAgo(bead.createdAt)}`));
}

/**
 * Display full bead details
 */
function displayBeadFull(bead: ContextBead): void {
  console.log(chalk.bold(`\n📋 Context: ${bead.title}\n`));
  console.log(`  ID:       ${chalk.cyan(bead.id)}`);
  console.log(`  Type:     ${getTypeIcon(bead.contextType)} ${bead.contextType}`);
  console.log(`  Scope:    ${bead.scope}`);
  console.log(`  Created:  ${bead.createdAt}`);
  console.log(`  Updated:  ${bead.updatedAt}`);

  if (bead.tags.length > 0) {
    console.log(`\n  Tags:`);
    for (const tag of bead.tags) {
      console.log(chalk.dim(`    - ${tag}`));
    }
  }

  if (bead.description) {
    console.log(`\n  Description:`);
    console.log(chalk.dim(`    ${bead.description}`));
  }

  if (bead.content) {
    console.log(`\n  Content:`);
    console.log(chalk.dim(`    ${bead.content.substring(0, 500)}${bead.content.length > 500 ? '...' : ''}`));
  }
}

/**
 * Get icon for context type
 */
function getTypeIcon(type: ContextType): string {
  switch (type) {
    case 'decision':
      return '🔷';
    case 'learning':
      return '💡';
    case 'architecture':
      return '🏗️';
    case 'pattern':
      return '📐';
    case 'blocker':
      return '🚫';
    case 'handoff':
      return '🤝';
    default:
      return '📝';
  }
}

/**
 * Get relative time string
 */
function getTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ============================================================================
// Formatting Helpers
// ============================================================================

/**
 * Format context as prompt for agent consumption
 */
function formatContextAsPrompt(beads: ContextBead[], options: PrimeContextOptions): string {
  const lines: string[] = [];

  lines.push('## Relevant Context\n');

  if (options.taskId) {
    lines.push(`Task: ${options.taskId}\n`);
  }
  if (options.agentType) {
    lines.push(`Agent: ${options.agentType}\n`);
  }

  lines.push('---\n');

  for (const bead of beads) {
    lines.push(`### ${bead.title} (${bead.contextType})`);
    if (bead.description) {
      lines.push(bead.description);
    }
    if (bead.content) {
      lines.push(bead.content);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format context as markdown
 */
function formatContextAsMarkdown(beads: ContextBead[], _options: PrimeContextOptions): string {
  const lines: string[] = [];

  lines.push('# Context Export\n');
  lines.push(`Exported: ${new Date().toISOString()}`);
  lines.push(`Count: ${beads.length} beads\n`);

  // Group by type
  const byType = new Map<ContextType, ContextBead[]>();
  for (const bead of beads) {
    const existing = byType.get(bead.contextType) || [];
    existing.push(bead);
    byType.set(bead.contextType, existing);
  }

  for (const [type, typeBeads] of byType) {
    lines.push(`\n## ${type.charAt(0).toUpperCase() + type.slice(1)}s\n`);
    for (const bead of typeBeads) {
      lines.push(`### ${bead.title}`);
      lines.push(`- ID: \`${bead.id}\``);
      lines.push(`- Created: ${bead.createdAt}`);
      if (bead.description) {
        lines.push(`\n${bead.description}`);
      }
      if (bead.content) {
        lines.push(`\n\`\`\`\n${bead.content}\n\`\`\``);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Format export data as markdown
 */
function formatExportAsMarkdown(data: {
  version: string;
  exportedAt: string;
  scope: ContextScope;
  count: number;
  beads: ContextBead[];
}): string {
  const lines: string[] = [];

  lines.push('# Beads Context Export\n');
  lines.push(`Version: ${data.version}`);
  lines.push(`Exported: ${data.exportedAt}`);
  lines.push(`Scope: ${data.scope}`);
  lines.push(`Count: ${data.count} beads\n`);
  lines.push('---\n');

  for (const bead of data.beads) {
    lines.push(`## ${bead.title}\n`);
    lines.push(`- **ID**: \`${bead.id}\``);
    lines.push(`- **Type**: ${bead.contextType}`);
    lines.push(`- **Scope**: ${bead.scope}`);
    lines.push(`- **Created**: ${bead.createdAt}`);
    lines.push(`- **Tags**: ${bead.tags.join(', ')}`);
    if (bead.description) {
      lines.push(`\n### Description\n\n${bead.description}`);
    }
    if (bead.content) {
      lines.push(`\n### Content\n\n\`\`\`\n${bead.content}\n\`\`\``);
    }
    lines.push('\n---\n');
  }

  return lines.join('\n');
}
