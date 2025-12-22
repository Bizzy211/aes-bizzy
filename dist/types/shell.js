/**
 * Shell execution types
 */
export class CommandError extends Error {
    exitCode;
    stdout;
    stderr;
    command;
    args;
    duration;
    constructor(result, message) {
        super(message ?? `Command failed with exit code ${result.exitCode}: ${result.command} ${result.args.join(' ')}`);
        this.name = 'CommandError';
        this.exitCode = result.exitCode;
        this.stdout = result.stdout;
        this.stderr = result.stderr;
        this.command = result.command;
        this.args = result.args;
        this.duration = result.duration;
    }
}
//# sourceMappingURL=shell.js.map