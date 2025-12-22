/**
 * Beads CLI assignment wrapper
 *
 * Provides agent assignment functionality for Beads:
 * - bd create --assign <agent-name> to assign tasks during creation
 * - bd ready --assigned <agent-name> to filter tasks by assigned agent
 *
 * Agent assignments are stored as tags in the format: agent:<agent-name>
 */

import {
  executeCommand,
  execCommandWithSpinner,
  checkCommandExists,
} from '../utils/shell.js';
import { isWindows } from '../utils/platform.js';
import { createLogger } from '../utils/logger.js';
import type {
  Bead,
  BeadStatus,
  CreateBeadOptions,
  CreateBeadResult,
  ReadyBeadsOptions,
  ListBeadsResult,
} from '../types/beads.js';
import {
  AGENT_TAG_PREFIX,
  createAgentTag,
  isAssignedTo,
  getAssignedAgent,
} from '../types/beads.js';

const logger = createLogger({ context: { module: 'beads-assignment' } });

/**
 * Get the path to the bd executable
 */
async function getBdPath(): Promise<string> {
  // First check if bd is in PATH
  const inPath = await checkCommandExists('bd');
  if (inPath) return 'bd';

  // On Windows, check the binary installation path
  if (isWindows()) {
    const beadsPath = `${process.env['LOCALAPPDATA']}\\Programs\\beads\\bd.exe`;
    const result = await executeCommand(beadsPath, ['--version'], { silent: true });
    if (result.exitCode === 0) {
      return beadsPath;
    }
  }

  throw new Error('Beads CLI (bd) not found. Install with: aes-bizzy init');
}

/**
 * Create a new bead with optional agent assignment
 *
 * @example
 * // Create task assigned to frontend-dev
 * await createBead({
 *   title: "Build login form",
 *   assign: "frontend-dev",
 *   priority: 1,
 *   deps: ["parent:epic-1"],
 *   json: true
 * });
 */
export async function createBead(options: CreateBeadOptions): Promise<CreateBeadResult> {
  try {
    const bd = await getBdPath();
    const args: string[] = ['create', options.title];

    // Add priority
    if (options.priority !== undefined) {
      args.push('-p', String(options.priority));
    }

    // Add dependencies
    if (options.deps && options.deps.length > 0) {
      for (const dep of options.deps) {
        args.push('--deps', dep);
      }
    }

    // Add tags including agent assignment
    const allTags: string[] = [...(options.tags ?? [])];
    if (options.assign) {
      allTags.push(createAgentTag(options.assign));
    }

    if (allTags.length > 0) {
      for (const tag of allTags) {
        args.push('--tag', tag);
      }
    }

    // Add description
    if (options.description) {
      args.push('--description', options.description);
    }

    // Request JSON output
    if (options.json !== false) {
      args.push('--json');
    }

    logger.debug(`Executing: bd ${args.join(' ')}`);

    const result = await executeCommand(bd, args, { silent: true });

    if (result.exitCode !== 0) {
      return {
        success: false,
        error: result.stderr || `Failed with exit code ${result.exitCode}`,
      };
    }

    // Parse JSON output if available
    if (options.json !== false && result.stdout) {
      try {
        const bead = JSON.parse(result.stdout) as Bead;
        return {
          success: true,
          id: bead.id,
          bead,
        };
      } catch {
        // JSON parsing failed, extract ID from text output
        const match = result.stdout.match(/\[([^\]]+)\]/);
        return {
          success: true,
          id: match?.[1],
        };
      }
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get beads filtered by assigned agent
 *
 * @example
 * // Get all ready beads assigned to frontend-dev
 * const result = await getReadyBeads({
 *   assigned: "frontend-dev",
 *   json: true
 * });
 */
export async function getReadyBeads(options: ReadyBeadsOptions = {}): Promise<ListBeadsResult> {
  try {
    const bd = await getBdPath();
    const args: string[] = ['ready'];

    // Request JSON output
    if (options.json !== false) {
      args.push('--json');
    }

    // Filter by status if specified
    if (options.status) {
      args.push('--status', options.status);
    }

    // Filter by priority if specified
    if (options.priority !== undefined) {
      args.push('-p', String(options.priority));
    }

    logger.debug(`Executing: bd ${args.join(' ')}`);

    const result = await executeCommand(bd, args, { silent: true });

    if (result.exitCode !== 0) {
      return {
        success: false,
        beads: [],
        error: result.stderr || `Failed with exit code ${result.exitCode}`,
      };
    }

    // Parse JSON output
    let beads: Bead[] = [];
    if (result.stdout) {
      try {
        const parsed = JSON.parse(result.stdout);
        beads = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        logger.warn('Failed to parse beads JSON output');
        return {
          success: true,
          beads: [],
        };
      }
    }

    // Filter by assigned agent if specified
    if (options.assigned) {
      beads = beads.filter((bead) => isAssignedTo(bead, options.assigned!));
    }

    return {
      success: true,
      beads,
    };
  } catch (error) {
    return {
      success: false,
      beads: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get all beads (not just ready) filtered by assignment
 */
export async function listBeads(options: ReadyBeadsOptions = {}): Promise<ListBeadsResult> {
  try {
    const bd = await getBdPath();
    const args: string[] = ['list'];

    // Request JSON output
    if (options.json !== false) {
      args.push('--json');
    }

    // Filter by status if specified
    if (options.status) {
      args.push('--status', options.status);
    }

    logger.debug(`Executing: bd ${args.join(' ')}`);

    const result = await executeCommand(bd, args, { silent: true });

    if (result.exitCode !== 0) {
      return {
        success: false,
        beads: [],
        error: result.stderr || `Failed with exit code ${result.exitCode}`,
      };
    }

    // Parse JSON output
    let beads: Bead[] = [];
    if (result.stdout) {
      try {
        const parsed = JSON.parse(result.stdout);
        beads = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        logger.warn('Failed to parse beads JSON output');
        return {
          success: true,
          beads: [],
        };
      }
    }

    // Filter by assigned agent if specified
    if (options.assigned) {
      beads = beads.filter((bead) => isAssignedTo(bead, options.assigned!));
    }

    return {
      success: true,
      beads,
    };
  } catch (error) {
    return {
      success: false,
      beads: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Update a bead's status
 */
export async function updateBeadStatus(
  beadId: string,
  status: BeadStatus,
  options: { note?: string; json?: boolean } = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const bd = await getBdPath();
    const args: string[] = ['update', beadId, '--status', status];

    if (options.note) {
      args.push('--add-note', options.note);
    }

    if (options.json !== false) {
      args.push('--json');
    }

    const result = await executeCommand(bd, args, { silent: true });

    if (result.exitCode !== 0) {
      return {
        success: false,
        error: result.stderr || `Failed with exit code ${result.exitCode}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Close a bead with a reason
 */
export async function closeBead(
  beadId: string,
  reason: string,
  options: { json?: boolean } = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const bd = await getBdPath();
    const args: string[] = ['close', beadId, '--reason', reason];

    if (options.json !== false) {
      args.push('--json');
    }

    const result = await executeCommand(bd, args, { silent: true });

    if (result.exitCode !== 0) {
      return {
        success: false,
        error: result.stderr || `Failed with exit code ${result.exitCode}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Sync beads to git
 */
export async function syncBeads(
  options: { silent?: boolean } = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const bd = await getBdPath();
    const args: string[] = ['sync'];

    if (options.silent) {
      const result = await executeCommand(bd, args, { silent: true });
      if (result.exitCode !== 0) {
        return {
          success: false,
          error: result.stderr || `Failed with exit code ${result.exitCode}`,
        };
      }
    } else {
      const result = await execCommandWithSpinner(bd, args, {
        spinnerText: 'Syncing beads to git...',
        successText: 'Beads synced',
        failText: 'Failed to sync beads',
      });

      if (result.exitCode !== 0) {
        return {
          success: false,
          error: result.stderr || `Failed with exit code ${result.exitCode}`,
        };
      }
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Show a specific bead
 */
export async function showBead(
  beadId: string,
  options: { json?: boolean } = {}
): Promise<{ success: boolean; bead?: Bead; error?: string }> {
  try {
    const bd = await getBdPath();
    const args: string[] = ['show', beadId];

    if (options.json !== false) {
      args.push('--json');
    }

    const result = await executeCommand(bd, args, { silent: true });

    if (result.exitCode !== 0) {
      return {
        success: false,
        error: result.stderr || `Failed with exit code ${result.exitCode}`,
      };
    }

    if (options.json !== false && result.stdout) {
      try {
        const bead = JSON.parse(result.stdout) as Bead;
        return {
          success: true,
          bead,
        };
      } catch {
        return { success: true };
      }
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Assign an existing bead to an agent by adding the agent tag
 */
export async function assignBead(
  beadId: string,
  agentName: string,
  options: { json?: boolean } = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const bd = await getBdPath();
    const agentTag = createAgentTag(agentName);
    const args: string[] = ['update', beadId, '--add-tag', agentTag];

    if (options.json !== false) {
      args.push('--json');
    }

    const result = await executeCommand(bd, args, { silent: true });

    if (result.exitCode !== 0) {
      return {
        success: false,
        error: result.stderr || `Failed with exit code ${result.exitCode}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Unassign a bead from an agent
 */
export async function unassignBead(
  beadId: string,
  agentName: string,
  options: { json?: boolean } = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const bd = await getBdPath();
    const agentTag = createAgentTag(agentName);
    const args: string[] = ['update', beadId, '--remove-tag', agentTag];

    if (options.json !== false) {
      args.push('--json');
    }

    const result = await executeCommand(bd, args, { silent: true });

    if (result.exitCode !== 0) {
      return {
        success: false,
        error: result.stderr || `Failed with exit code ${result.exitCode}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Re-export utility functions
export { AGENT_TAG_PREFIX, createAgentTag, isAssignedTo, getAssignedAgent };
