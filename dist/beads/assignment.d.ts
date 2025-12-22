/**
 * Beads CLI assignment wrapper
 *
 * Provides agent assignment functionality for Beads:
 * - bd create --assign <agent-name> to assign tasks during creation
 * - bd ready --assigned <agent-name> to filter tasks by assigned agent
 *
 * Agent assignments are stored as tags in the format: agent:<agent-name>
 */
import type { Bead, BeadStatus, CreateBeadOptions, CreateBeadResult, ReadyBeadsOptions, ListBeadsResult } from '../types/beads.js';
import { AGENT_TAG_PREFIX, createAgentTag, isAssignedTo, getAssignedAgent } from '../types/beads.js';
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
export declare function createBead(options: CreateBeadOptions): Promise<CreateBeadResult>;
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
export declare function getReadyBeads(options?: ReadyBeadsOptions): Promise<ListBeadsResult>;
/**
 * Get all beads (not just ready) filtered by assignment
 */
export declare function listBeads(options?: ReadyBeadsOptions): Promise<ListBeadsResult>;
/**
 * Update a bead's status
 */
export declare function updateBeadStatus(beadId: string, status: BeadStatus, options?: {
    note?: string;
    json?: boolean;
}): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * Close a bead with a reason
 */
export declare function closeBead(beadId: string, reason: string, options?: {
    json?: boolean;
}): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * Sync beads to git
 */
export declare function syncBeads(options?: {
    silent?: boolean;
}): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * Show a specific bead
 */
export declare function showBead(beadId: string, options?: {
    json?: boolean;
}): Promise<{
    success: boolean;
    bead?: Bead;
    error?: string;
}>;
/**
 * Assign an existing bead to an agent by adding the agent tag
 */
export declare function assignBead(beadId: string, agentName: string, options?: {
    json?: boolean;
}): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * Unassign a bead from an agent
 */
export declare function unassignBead(beadId: string, agentName: string, options?: {
    json?: boolean;
}): Promise<{
    success: boolean;
    error?: string;
}>;
export { AGENT_TAG_PREFIX, createAgentTag, isAssignedTo, getAssignedAgent };
//# sourceMappingURL=assignment.d.ts.map