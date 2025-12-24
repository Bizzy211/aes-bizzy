/**
 * Beads Context Store
 *
 * Manages context beads in .beads/interactions.jsonl with CRUD operations,
 * tagging, search, and dual-scope support (project vs global).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';
import * as crypto from 'crypto';
import {
  ContextBead,
  ContextScope,
  ContextType,
  CreateContextOptions,
  CreateContextResult,
  ListContextOptions,
  ListContextResult,
  SearchContextOptions,
  ListTagsResult,
  TagStats,
  generateContextTags,
  createTag,
  CONTEXT_TAG_PREFIXES,
} from '../types/context.js';

// ============================================================================
// Constants
// ============================================================================

const BEADS_DIR = '.beads';
const GLOBAL_BEADS_DIR = path.join(os.homedir(), '.beads');
const INTERACTIONS_FILE = 'interactions.jsonl';
const TRASH_DIR = '.trash';
const GITIGNORE_CONTENT = `# Beads local files
.trash/
*.log
`;

// ============================================================================
// Path Resolution
// ============================================================================

/**
 * Get the beads directory path based on scope
 */
export function getBeadsPath(scope: ContextScope, projectPath?: string): string {
  if (scope === 'global') {
    return GLOBAL_BEADS_DIR;
  }

  // For project scope, find project root
  if (projectPath) {
    return path.join(projectPath, BEADS_DIR);
  }

  // Start from current directory and search upward
  let currentDir = process.cwd();
  while (currentDir !== path.dirname(currentDir)) {
    const beadsDir = path.join(currentDir, BEADS_DIR);
    if (fs.existsSync(beadsDir)) {
      return beadsDir;
    }

    const gitDir = path.join(currentDir, '.git');
    if (fs.existsSync(gitDir)) {
      return path.join(currentDir, BEADS_DIR);
    }

    currentDir = path.dirname(currentDir);
  }

  // Default to current directory
  return path.join(process.cwd(), BEADS_DIR);
}

/**
 * Get the interactions file path
 */
export function getInteractionsPath(scope: ContextScope, projectPath?: string): string {
  return path.join(getBeadsPath(scope, projectPath), INTERACTIONS_FILE);
}

/**
 * Get the trash directory path
 */
export function getTrashPath(scope: ContextScope, projectPath?: string): string {
  return path.join(getBeadsPath(scope, projectPath), TRASH_DIR);
}

// ============================================================================
// Directory Management
// ============================================================================

/**
 * Ensure the beads directory exists with proper structure
 */
export async function ensureBeadsDir(scope: ContextScope, projectPath?: string): Promise<void> {
  const beadsPath = getBeadsPath(scope, projectPath);

  // Create directory if not exists
  if (!fs.existsSync(beadsPath)) {
    await fs.promises.mkdir(beadsPath, { recursive: true });
  }

  // Create trash directory
  const trashPath = getTrashPath(scope, projectPath);
  if (!fs.existsSync(trashPath)) {
    await fs.promises.mkdir(trashPath, { recursive: true });
  }

  // Create .gitignore for project scope
  if (scope === 'project') {
    const gitignorePath = path.join(beadsPath, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      await fs.promises.writeFile(gitignorePath, GITIGNORE_CONTENT);
    }
  }

  // Create interactions file if not exists
  const interactionsPath = getInteractionsPath(scope, projectPath);
  if (!fs.existsSync(interactionsPath)) {
    await fs.promises.writeFile(interactionsPath, '');
  }
}

/**
 * Check if beads is initialized
 */
export function isBeadsInitialized(scope: ContextScope, projectPath?: string): boolean {
  const beadsPath = getBeadsPath(scope, projectPath);
  return fs.existsSync(beadsPath);
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new context bead
 */
export async function createContext(options: CreateContextOptions): Promise<CreateContextResult> {
  try {
    const scope = options.scope || 'project';
    await ensureBeadsDir(scope);

    // Get project name from directory if not provided
    const projectName = options.projectName || path.basename(process.cwd());

    // Generate tags
    const tags = generateContextTags({
      projectName,
      agentType: options.agentType,
      contextType: options.type,
      taskId: options.taskId,
      customTags: options.tags,
    });

    // Create the bead
    const bead: ContextBead = {
      id: crypto.randomUUID(),
      title: options.title,
      status: 'ready',
      priority: 2,
      tags,
      dependencies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      contextType: options.type,
      scope,
      description: options.description,
      content: options.content,
      handoffData: options.handoffData,
    };

    // Append to JSONL file
    const interactionsPath = getInteractionsPath(scope);
    await fs.promises.appendFile(
      interactionsPath,
      JSON.stringify(bead) + '\n'
    );

    return {
      success: true,
      bead,
      id: bead.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating context',
    };
  }
}

/**
 * Get a context bead by ID
 */
export async function getContext(
  beadId: string,
  scope: ContextScope = 'project',
  projectPath?: string
): Promise<ContextBead | null> {
  const beads = await loadAllBeads(scope, projectPath);
  return beads.find(b => b.id === beadId) || null;
}

/**
 * Update a context bead
 */
export async function updateContext(
  beadId: string,
  updates: Partial<ContextBead>,
  scope: ContextScope = 'project',
  projectPath?: string
): Promise<CreateContextResult> {
  try {
    const beads = await loadAllBeads(scope, projectPath);
    const index = beads.findIndex(b => b.id === beadId);

    if (index === -1) {
      return {
        success: false,
        error: `Context bead ${beadId} not found`,
      };
    }

    // Update the bead - filter out undefined values to preserve required fields
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    beads[index] = {
      ...beads[index],
      ...filteredUpdates,
      updatedAt: new Date().toISOString(),
    } as ContextBead;

    // Rewrite the file
    await writeAllBeads(beads, scope, projectPath);

    return {
      success: true,
      bead: beads[index],
      id: beadId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error updating context',
    };
  }
}

/**
 * Remove a context bead (soft delete - moves to trash)
 */
export async function removeContext(
  beadId: string,
  scope: ContextScope = 'project',
  projectPath?: string
): Promise<CreateContextResult> {
  try {
    const beads = await loadAllBeads(scope, projectPath);
    const index = beads.findIndex(b => b.id === beadId);

    if (index === -1) {
      return {
        success: false,
        error: `Context bead ${beadId} not found`,
      };
    }

    // Backup to trash
    const bead = beads[index];
    const trashPath = getTrashPath(scope, projectPath);
    await ensureBeadsDir(scope, projectPath);
    const trashFile = path.join(trashPath, `${beadId}-${Date.now()}.json`);
    await fs.promises.writeFile(trashFile, JSON.stringify(bead, null, 2));

    // Remove from list
    beads.splice(index, 1);

    // Rewrite the file
    await writeAllBeads(beads, scope, projectPath);

    return {
      success: true,
      bead,
      id: beadId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error removing context',
    };
  }
}

// ============================================================================
// File Operations
// ============================================================================

/**
 * Load all beads from JSONL file
 */
export async function loadAllBeads(
  scope: ContextScope = 'project',
  projectPath?: string
): Promise<ContextBead[]> {
  const interactionsPath = getInteractionsPath(scope, projectPath);

  if (!fs.existsSync(interactionsPath)) {
    return [];
  }

  const beads: ContextBead[] = [];

  const fileStream = fs.createReadStream(interactionsPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (line.trim()) {
      try {
        const bead = JSON.parse(line) as ContextBead;
        beads.push(bead);
      } catch {
        // Skip invalid lines
        console.warn(`Skipping invalid JSONL line: ${line.substring(0, 50)}...`);
      }
    }
  }

  return beads;
}

/**
 * Write all beads to JSONL file
 */
export async function writeAllBeads(
  beads: ContextBead[],
  scope: ContextScope = 'project',
  projectPath?: string
): Promise<void> {
  const interactionsPath = getInteractionsPath(scope, projectPath);
  const content = beads.map(b => JSON.stringify(b)).join('\n') + (beads.length > 0 ? '\n' : '');
  await fs.promises.writeFile(interactionsPath, content);
}

// ============================================================================
// Search Operations
// ============================================================================

/**
 * Search context beads with filters
 */
export async function searchContext(options: SearchContextOptions): Promise<ListContextResult> {
  try {
    // Load beads from specified scope(s)
    let beads = await loadAllBeads(options.scope || 'project');

    // Include global beads if requested
    if (options.includeGlobal && options.scope !== 'global') {
      const globalBeads = await loadAllBeads('global');
      beads = [...beads, ...globalBeads];
    }

    // Apply filters
    if (options.type) {
      beads = beads.filter(b => b.contextType === options.type);
    }

    if (options.agent) {
      const agentTag = createTag('agent', options.agent);
      beads = beads.filter(b => b.tags.includes(agentTag));
    }

    if (options.task) {
      const taskTag = createTag('task', options.task);
      beads = beads.filter(b => b.tags.includes(taskTag));
    }

    if (options.tags && options.tags.length > 0) {
      beads = beads.filter(b =>
        options.tags!.every(tag => b.tags.includes(tag))
      );
    }

    // Full-text search
    if (options.query) {
      const queryLower = options.query.toLowerCase();
      beads = beads.filter(b =>
        b.title.toLowerCase().includes(queryLower) ||
        b.description?.toLowerCase().includes(queryLower) ||
        b.content?.toLowerCase().includes(queryLower)
      );
    }

    // Sort by createdAt descending (newest first)
    beads.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Pagination
    const total = beads.length;
    const offset = options.offset || 0;
    const limit = options.limit || 10;
    beads = beads.slice(offset, offset + limit);

    return {
      success: true,
      beads,
      total,
      hasMore: offset + limit < total,
    };
  } catch (error) {
    return {
      success: false,
      beads: [],
      total: 0,
      hasMore: false,
      error: error instanceof Error ? error.message : 'Unknown error searching context',
    };
  }
}

/**
 * List context beads with filters and sorting
 */
export async function listContext(options: ListContextOptions): Promise<ListContextResult> {
  try {
    let beads = await loadAllBeads(options.scope || 'project');

    // Apply filters
    if (options.type) {
      beads = beads.filter(b => b.contextType === options.type);
    }

    if (options.agent) {
      const agentTag = createTag('agent', options.agent);
      beads = beads.filter(b => b.tags.includes(agentTag));
    }

    if (options.task) {
      const taskTag = createTag('task', options.task);
      beads = beads.filter(b => b.tags.includes(taskTag));
    }

    // Date range filter
    if (options.dateRange && options.dateRange !== 'all') {
      const now = new Date();
      let cutoff: Date;

      switch (options.dateRange) {
        case 'last-day':
          cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'last-week':
          cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'last-month':
          cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      beads = beads.filter(b => new Date(b.createdAt) >= cutoff);
    }

    // Sorting
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';

    beads.sort((a, b) => {
      let compareA: number | string;
      let compareB: number | string;

      switch (sortBy) {
        case 'priority':
          compareA = a.priority;
          compareB = b.priority;
          break;
        case 'updatedAt':
          compareA = new Date(a.updatedAt).getTime();
          compareB = new Date(b.updatedAt).getTime();
          break;
        default:
          compareA = new Date(a.createdAt).getTime();
          compareB = new Date(b.createdAt).getTime();
      }

      const result = compareA < compareB ? -1 : compareA > compareB ? 1 : 0;
      return sortOrder === 'asc' ? result : -result;
    });

    // Pagination
    const total = beads.length;
    const offset = options.offset || 0;
    const limit = options.limit || 10;
    beads = beads.slice(offset, offset + limit);

    return {
      success: true,
      beads,
      total,
      hasMore: offset + limit < total,
    };
  } catch (error) {
    return {
      success: false,
      beads: [],
      total: 0,
      hasMore: false,
      error: error instanceof Error ? error.message : 'Unknown error listing context',
    };
  }
}

// ============================================================================
// Tag Operations
// ============================================================================

/**
 * List all tags with usage counts
 */
export async function listTags(
  prefix?: string,
  scope: ContextScope = 'project',
  projectPath?: string
): Promise<ListTagsResult> {
  try {
    const beads = await loadAllBeads(scope, projectPath);

    // Count tag occurrences
    const tagCounts = new Map<string, number>();
    for (const bead of beads) {
      for (const tag of bead.tags) {
        // Filter by prefix if specified
        if (prefix) {
          const prefixValue = CONTEXT_TAG_PREFIXES[prefix as keyof typeof CONTEXT_TAG_PREFIXES];
          if (prefixValue && !tag.startsWith(prefixValue)) {
            continue;
          }
        }
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    // Convert to array with percentages
    const totalBeads = beads.length;
    const tags: TagStats[] = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({
        tag,
        count,
        percentage: totalBeads > 0 ? (count / totalBeads) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      success: true,
      tags,
      total: tags.length,
    };
  } catch (error) {
    return {
      success: false,
      tags: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Unknown error listing tags',
    };
  }
}

/**
 * Find related beads by shared tags
 */
export async function findRelated(
  beadId: string,
  scope: ContextScope = 'project',
  projectPath?: string,
  limit: number = 5
): Promise<ContextBead[]> {
  const beads = await loadAllBeads(scope, projectPath);
  const targetBead = beads.find(b => b.id === beadId);

  if (!targetBead) {
    return [];
  }

  // Score beads by shared tags
  const scored = beads
    .filter(b => b.id !== beadId)
    .map(bead => {
      const sharedTags = bead.tags.filter(t => targetBead.tags.includes(t));
      return {
        bead,
        score: sharedTags.length,
      };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(s => s.bead);
}

// ============================================================================
// Export/Import Operations
// ============================================================================

/**
 * Export beads to JSON
 */
export async function exportBeadsToJson(
  scope: ContextScope = 'project',
  projectPath?: string,
  filters?: { type?: ContextType; agent?: string }
): Promise<{
  version: string;
  exportedAt: string;
  scope: ContextScope;
  count: number;
  beads: ContextBead[];
}> {
  let beads = await loadAllBeads(scope, projectPath);

  // Apply filters
  if (filters?.type) {
    beads = beads.filter(b => b.contextType === filters.type);
  }
  if (filters?.agent) {
    const agentTag = createTag('agent', filters.agent);
    beads = beads.filter(b => b.tags.includes(agentTag));
  }

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    scope,
    count: beads.length,
    beads,
  };
}

/**
 * Import beads from JSON export
 */
export async function importBeadsFromJson(
  data: { beads: ContextBead[] },
  options: { merge?: boolean; scope?: ContextScope }
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const scope = options.scope || 'project';
  await ensureBeadsDir(scope);

  const existing = await loadAllBeads(scope);
  const existingIds = new Set(existing.map(b => b.id));

  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  for (const bead of data.beads) {
    try {
      // Validate required fields
      if (!bead.id || !bead.title || !bead.contextType) {
        errors.push(`Invalid bead: missing required fields (id, title, or contextType)`);
        skipped++;
        continue;
      }

      // Handle duplicates
      if (existingIds.has(bead.id)) {
        if (options.merge) {
          skipped++;
          continue;
        }
        // In replace mode, we'll overwrite later
      }

      // Add scope to bead
      bead.scope = scope;

      if (options.merge) {
        existing.push(bead);
      }

      imported++;
    } catch (error) {
      errors.push(`Error importing bead ${bead.id}: ${error}`);
      skipped++;
    }
  }

  // Write results
  if (options.merge) {
    await writeAllBeads(existing, scope);
  } else {
    // Replace mode - write only new beads
    const newBeads = data.beads.filter(b =>
      b.id && b.title && b.contextType
    ).map(b => ({ ...b, scope }));
    await writeAllBeads(newBeads, scope);
  }

  return { imported, skipped, errors };
}
