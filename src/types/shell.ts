/**
 * Shell execution types
 */

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  command: string;
  args: string[];
}

export interface CommandOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  shell?: boolean | string;
  stdin?: string;
  silent?: boolean;
}

export interface SpinnerOptions extends CommandOptions {
  spinnerText?: string;
  successText?: string;
  failText?: string;
}

export interface ShellScriptOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

export class CommandError extends Error {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly command: string;
  readonly args: string[];
  readonly duration: number;

  constructor(result: CommandResult, message?: string) {
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
