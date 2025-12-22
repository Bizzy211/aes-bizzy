/**
 * Beads CLI types for agent assignment workflow
 *
 * These types support the --assign flag functionality:
 * - bd create --assign <agent-name> - Assign task to agent during creation
 * - bd ready --assigned <agent-name> - Filter tasks by assigned agent
 */

/**
 * Bead (task) structure from bd list/show --json
 */
export interface Bead {
  id: string;
  title: string;
  status: BeadStatus;
  priority: number;
  tags: string[];
  dependencies: string[];
  createdAt: string;
  updatedAt: string;
  notes?: string[];
  description?: string;
  closedReason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Bead status values
 */
export type BeadStatus = 'ready' | 'in_progress' | 'blocked' | 'done' | 'cancelled';

/**
 * Agent assignment configuration
 */
export interface BeadAssignment {
  agentName: string;
  assignedAt: string;
  assignedBy?: string;
}

/**
 * Options for creating a bead with agent assignment
 */
export interface CreateBeadOptions {
  title: string;
  priority?: number;
  assign?: string; // Agent name to assign to
  deps?: string[]; // Dependencies (parent:ID, blocks:ID, discovered-from:ID)
  tags?: string[];
  description?: string;
  json?: boolean;
}

/**
 * Options for filtering beads by assignment
 */
export interface ReadyBeadsOptions {
  assigned?: string; // Filter by assigned agent
  status?: BeadStatus;
  priority?: number;
  json?: boolean;
}

/**
 * Result from bd create command
 */
export interface CreateBeadResult {
  success: boolean;
  id?: string;
  error?: string;
  bead?: Bead;
}

/**
 * Result from bd ready/list command
 */
export interface ListBeadsResult {
  success: boolean;
  beads: Bead[];
  error?: string;
}

/**
 * Agent tag prefix used for assignment tracking
 * Format: agent:<agent-name>
 */
export const AGENT_TAG_PREFIX = 'agent:';

/**
 * Extract agent name from agent tag
 */
export function extractAgentFromTag(tag: string): string | null {
  if (tag.startsWith(AGENT_TAG_PREFIX)) {
    return tag.slice(AGENT_TAG_PREFIX.length);
  }
  return null;
}

/**
 * Create agent tag from agent name
 */
export function createAgentTag(agentName: string): string {
  return `${AGENT_TAG_PREFIX}${agentName}`;
}

/**
 * Check if a bead is assigned to a specific agent
 */
export function isAssignedTo(bead: Bead, agentName: string): boolean {
  const agentTag = createAgentTag(agentName);
  return bead.tags.includes(agentTag);
}

/**
 * Get assigned agent from bead tags
 */
export function getAssignedAgent(bead: Bead): string | null {
  for (const tag of bead.tags) {
    const agent = extractAgentFromTag(tag);
    if (agent) return agent;
  }
  return null;
}
