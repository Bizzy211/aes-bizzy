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
    assign?: string;
    deps?: string[];
    tags?: string[];
    description?: string;
    json?: boolean;
}
/**
 * Options for filtering beads by assignment
 */
export interface ReadyBeadsOptions {
    assigned?: string;
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
export declare const AGENT_TAG_PREFIX = "agent:";
/**
 * Extract agent name from agent tag
 */
export declare function extractAgentFromTag(tag: string): string | null;
/**
 * Create agent tag from agent name
 */
export declare function createAgentTag(agentName: string): string;
/**
 * Check if a bead is assigned to a specific agent
 */
export declare function isAssignedTo(bead: Bead, agentName: string): boolean;
/**
 * Get assigned agent from bead tags
 */
export declare function getAssignedAgent(bead: Bead): string | null;
//# sourceMappingURL=beads.d.ts.map