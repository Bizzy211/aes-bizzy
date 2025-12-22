/**
 * Beads CLI command wrapper
 *
 * Provides agent assignment functionality for the A.E.S - Bizzy CLI:
 * - aes-bizzy beads create <title> --assign <agent-name>
 * - aes-bizzy beads ready --assigned <agent-name>
 * - aes-bizzy beads assign <bead-id> <agent-name>
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { createLogger } from '../utils/logger.js';
import { createBead, getReadyBeads, listBeads, assignBead, unassignBead, updateBeadStatus, closeBead, showBead, syncBeads, getAssignedAgent, } from '../beads/assignment.js';
const logger = createLogger({ context: { command: 'beads' } });
/**
 * Create the beads subcommand
 */
export function createBeadsCommand() {
    const beads = new Command('beads')
        .description('Beads task management with agent assignment')
        .option('--json', 'Output as JSON');
    // === CREATE SUBCOMMAND ===
    beads
        .command('create <title>')
        .description('Create a new bead (task) with optional agent assignment')
        .option('-a, --assign <agent>', 'Assign to agent (e.g., frontend-dev, backend-dev)')
        .option('-p, --priority <level>', 'Priority level (1=highest, 5=lowest)', '2')
        .option('-d, --deps <deps...>', 'Dependencies (parent:ID, blocks:ID, discovered-from:ID)')
        .option('-t, --tag <tags...>', 'Additional tags')
        .option('--description <desc>', 'Task description')
        .action(async (title, options) => {
        const result = await createBead({
            title,
            assign: options.assign,
            priority: parseInt(options.priority, 10),
            deps: options.deps,
            tags: options.tag,
            description: options.description,
            json: beads.opts().json,
        });
        if (!result.success) {
            logger.error(`Failed to create bead: ${result.error}`);
            process.exit(1);
        }
        if (beads.opts().json) {
            console.log(JSON.stringify(result, null, 2));
        }
        else {
            console.log(chalk.green(`✓ Created bead: ${chalk.bold(result.id || title)}`));
            if (options.assign) {
                console.log(chalk.cyan(`  Assigned to: ${options.assign}`));
            }
        }
    });
    // === READY SUBCOMMAND ===
    beads
        .command('ready')
        .description('List ready beads, optionally filtered by assigned agent')
        .option('-a, --assigned <agent>', 'Filter by assigned agent')
        .option('-p, --priority <level>', 'Filter by priority level')
        .option('-s, --status <status>', 'Filter by status')
        .action(async (options) => {
        const result = await getReadyBeads({
            assigned: options.assigned,
            priority: options.priority ? parseInt(options.priority, 10) : undefined,
            status: options.status,
            json: beads.opts().json,
        });
        if (!result.success) {
            logger.error(`Failed to get beads: ${result.error}`);
            process.exit(1);
        }
        if (beads.opts().json) {
            console.log(JSON.stringify(result.beads, null, 2));
        }
        else {
            if (result.beads.length === 0) {
                console.log(chalk.yellow('No ready beads found'));
                if (options.assigned) {
                    console.log(chalk.dim(`  (filtered by agent: ${options.assigned})`));
                }
                return;
            }
            console.log(chalk.bold(`\n📋 Ready Beads${options.assigned ? ` (assigned to: ${options.assigned})` : ''}\n`));
            for (const bead of result.beads) {
                const assignedAgent = getAssignedAgent(bead);
                const priority = '★'.repeat(Math.max(0, 6 - bead.priority));
                console.log(`  [${chalk.cyan(bead.id)}] ${bead.title}`, chalk.dim(` (${priority})`));
                if (assignedAgent) {
                    console.log(chalk.dim(`       → ${assignedAgent}`));
                }
            }
            console.log();
        }
    });
    // === LIST SUBCOMMAND ===
    beads
        .command('list')
        .description('List all beads, optionally filtered by assigned agent')
        .option('-a, --assigned <agent>', 'Filter by assigned agent')
        .option('-s, --status <status>', 'Filter by status')
        .action(async (options) => {
        const result = await listBeads({
            assigned: options.assigned,
            status: options.status,
            json: beads.opts().json,
        });
        if (!result.success) {
            logger.error(`Failed to list beads: ${result.error}`);
            process.exit(1);
        }
        if (beads.opts().json) {
            console.log(JSON.stringify(result.beads, null, 2));
        }
        else {
            if (result.beads.length === 0) {
                console.log(chalk.yellow('No beads found'));
                return;
            }
            console.log(chalk.bold('\n📋 All Beads\n'));
            for (const bead of result.beads) {
                const assignedAgent = getAssignedAgent(bead);
                const statusIcon = getStatusIcon(bead.status);
                console.log(`  ${statusIcon} [${chalk.cyan(bead.id)}] ${bead.title}`);
                if (assignedAgent) {
                    console.log(chalk.dim(`       → ${assignedAgent}`));
                }
            }
            console.log();
        }
    });
    // === ASSIGN SUBCOMMAND ===
    beads
        .command('assign <beadId> <agent>')
        .description('Assign an existing bead to an agent')
        .action(async (beadId, agent) => {
        const result = await assignBead(beadId, agent, { json: beads.opts().json });
        if (!result.success) {
            logger.error(`Failed to assign bead: ${result.error}`);
            process.exit(1);
        }
        if (beads.opts().json) {
            console.log(JSON.stringify({ success: true, beadId, agent }));
        }
        else {
            console.log(chalk.green(`✓ Assigned [${beadId}] to ${agent}`));
        }
    });
    // === UNASSIGN SUBCOMMAND ===
    beads
        .command('unassign <beadId> <agent>')
        .description('Remove agent assignment from a bead')
        .action(async (beadId, agent) => {
        const result = await unassignBead(beadId, agent, { json: beads.opts().json });
        if (!result.success) {
            logger.error(`Failed to unassign bead: ${result.error}`);
            process.exit(1);
        }
        if (beads.opts().json) {
            console.log(JSON.stringify({ success: true, beadId, agent }));
        }
        else {
            console.log(chalk.green(`✓ Removed ${agent} from [${beadId}]`));
        }
    });
    // === STATUS SUBCOMMAND ===
    beads
        .command('status <beadId> <status>')
        .description('Update bead status (ready, in_progress, blocked, done, cancelled)')
        .option('-n, --note <note>', 'Add a note with the status update')
        .action(async (beadId, status, options) => {
        const validStatuses = ['ready', 'in_progress', 'blocked', 'done', 'cancelled'];
        if (!validStatuses.includes(status)) {
            logger.error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
            process.exit(1);
        }
        const result = await updateBeadStatus(beadId, status, {
            note: options.note,
            json: beads.opts().json,
        });
        if (!result.success) {
            logger.error(`Failed to update status: ${result.error}`);
            process.exit(1);
        }
        if (beads.opts().json) {
            console.log(JSON.stringify({ success: true, beadId, status }));
        }
        else {
            console.log(chalk.green(`✓ Updated [${beadId}] status to ${status}`));
        }
    });
    // === CLOSE SUBCOMMAND ===
    beads
        .command('close <beadId>')
        .description('Close a bead with a reason')
        .requiredOption('-r, --reason <reason>', 'Reason for closing')
        .action(async (beadId, options) => {
        const result = await closeBead(beadId, options.reason, { json: beads.opts().json });
        if (!result.success) {
            logger.error(`Failed to close bead: ${result.error}`);
            process.exit(1);
        }
        if (beads.opts().json) {
            console.log(JSON.stringify({ success: true, beadId, reason: options.reason }));
        }
        else {
            console.log(chalk.green(`✓ Closed [${beadId}]: ${options.reason}`));
        }
    });
    // === SHOW SUBCOMMAND ===
    beads
        .command('show <beadId>')
        .description('Show details of a specific bead')
        .action(async (beadId) => {
        const result = await showBead(beadId, { json: beads.opts().json });
        if (!result.success) {
            logger.error(`Failed to show bead: ${result.error}`);
            process.exit(1);
        }
        if (beads.opts().json) {
            console.log(JSON.stringify(result.bead, null, 2));
        }
        else if (result.bead) {
            const bead = result.bead;
            const assignedAgent = getAssignedAgent(bead);
            console.log(chalk.bold(`\n📋 Bead: ${bead.title}\n`));
            console.log(`  ID:       ${chalk.cyan(bead.id)}`);
            console.log(`  Status:   ${getStatusIcon(bead.status)} ${bead.status}`);
            console.log(`  Priority: ${'★'.repeat(Math.max(0, 6 - bead.priority))}`);
            if (assignedAgent) {
                console.log(`  Assigned: ${chalk.green(assignedAgent)}`);
            }
            if (bead.tags.length > 0) {
                console.log(`  Tags:     ${bead.tags.join(', ')}`);
            }
            if (bead.description) {
                console.log(`\n  ${chalk.dim(bead.description)}`);
            }
            console.log();
        }
    });
    // === SYNC SUBCOMMAND ===
    beads
        .command('sync')
        .description('Sync beads to git')
        .action(async () => {
        const result = await syncBeads({ silent: beads.opts().json });
        if (!result.success) {
            logger.error(`Failed to sync: ${result.error}`);
            process.exit(1);
        }
        if (beads.opts().json) {
            console.log(JSON.stringify({ success: true }));
        }
    });
    return beads;
}
/**
 * Get status icon for display
 */
function getStatusIcon(status) {
    switch (status) {
        case 'ready':
            return '○';
        case 'in_progress':
            return chalk.yellow('▶');
        case 'blocked':
            return chalk.red('⊘');
        case 'done':
            return chalk.green('✓');
        case 'cancelled':
            return chalk.dim('✕');
        default:
            return '?';
    }
}
//# sourceMappingURL=beads.js.map