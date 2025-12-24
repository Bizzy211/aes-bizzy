/**
 * Test command implementation
 * Runs E2E tests with automatic environment setup and credential validation
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';
import { executeCommand, checkCommandExists } from '../utils/shell.js';
import { API_KEY_DEFS } from '../installers/api-keys.js';

/**
 * Test mode configuration
 */
type TestMode = 'structural' | 'smoke' | 'integration' | 'full';

interface TestOptions {
  structural?: boolean;
  smoke?: boolean;
  integration?: boolean;
  full?: boolean;
  cleanup?: boolean;
  envFile?: string;
  skipValidation?: boolean;
  skipDockerCheck?: boolean;
}

interface CredentialRequirements {
  required: string[];
  optional: string[];
}

/**
 * Get credential requirements based on test mode
 */
function getCredentialRequirements(mode: TestMode): CredentialRequirements {
  switch (mode) {
    case 'structural':
      return { required: [], optional: [] };
    case 'smoke':
      return {
        required: ['ANTHROPIC_API_KEY', 'GITHUB_TOKEN', 'EXA_API_KEY', 'REF_API_KEY', 'SUPABASE_URL', 'SUPABASE_KEY'],
        optional: ['OPENAI_API_KEY'],
      };
    case 'integration':
    case 'full':
      return {
        required: ['ANTHROPIC_API_KEY', 'GITHUB_TOKEN', 'EXA_API_KEY', 'REF_API_KEY', 'SUPABASE_URL', 'SUPABASE_KEY'],
        optional: ['OPENAI_API_KEY', 'PERPLEXITY_API_KEY', 'TAVILY_API_KEY', 'FIRECRAWL_API_KEY', 'API_KEY', 'SUPABASE_ACCESS_TOKEN'],
      };
  }
}

/**
 * Parse environment file and return key-value pairs
 */
function parseEnvFile(filePath: string): Record<string, string> {
  const env: Record<string, string> = {};

  if (!existsSync(filePath)) {
    return env;
  }

  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  }

  return env;
}

/**
 * Validate credentials against requirements
 */
function validateCredentials(
  env: Record<string, string>,
  requirements: CredentialRequirements
): { valid: boolean; missing: string[]; found: string[] } {
  const missing: string[] = [];
  const found: string[] = [];

  for (const key of requirements.required) {
    if (env[key] && env[key].length > 0) {
      found.push(key);
    } else {
      missing.push(key);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    found,
  };
}

/**
 * Get hint for missing credential
 */
function getCredentialHint(key: string): string {
  const def = API_KEY_DEFS.find(d => d.key === key);
  return def?.hint || `Set ${key} in .env.test`;
}

/**
 * Determine test mode from options
 */
function getTestMode(options: TestOptions): TestMode {
  if (options.structural) return 'structural';
  if (options.integration) return 'integration';
  if (options.full) return 'full';
  return 'smoke'; // default
}

/**
 * Check if Docker is available and running
 */
async function checkDocker(): Promise<{ available: boolean; running: boolean; error?: string }> {
  // Check if docker command exists
  const dockerExists = await checkCommandExists('docker');
  if (!dockerExists) {
    return {
      available: false,
      running: false,
      error: 'Docker is not installed. Install from https://docker.com',
    };
  }

  // Check if docker-compose exists (try both commands)
  const composeExists = await checkCommandExists('docker-compose') ||
                        await checkCommandExists('docker');
  if (!composeExists) {
    return {
      available: false,
      running: false,
      error: 'docker-compose is not available',
    };
  }

  // Check if Docker daemon is running
  const result = await executeCommand('docker', ['info'], { silent: true });
  if (result.exitCode !== 0) {
    return {
      available: true,
      running: false,
      error: 'Docker daemon is not running. Start Docker Desktop.',
    };
  }

  return { available: true, running: true };
}

/**
 * Run docker-compose test command
 */
async function runTests(
  mode: TestMode,
  envFile: string,
  cwd: string
): Promise<{ exitCode: number; output: string }> {
  // Build docker-compose command
  const args: string[] = ['-f', 'docker-compose.test.yml'];

  // Add env file for non-structural tests
  if (mode !== 'structural') {
    args.push('--env-file', envFile);
  }

  args.push('run', '--rm', 'test-runner', `--${mode}`);

  console.log(chalk.dim(`\n$ docker-compose ${args.join(' ')}\n`));

  // Execute with streaming output
  const result = await executeCommand('docker-compose', args, {
    cwd,
    silent: false,
  });

  return {
    exitCode: result.exitCode,
    output: result.stdout + result.stderr,
  };
}

/**
 * Run cleanup command
 */
async function runCleanup(cwd: string): Promise<void> {
  const spinner = ora('Cleaning up test containers...').start();

  const result = await executeCommand(
    'docker-compose',
    ['-f', 'docker-compose.test.yml', 'down', '-v'],
    { cwd, silent: true }
  );

  if (result.exitCode === 0) {
    spinner.succeed('Cleanup completed');
  } else {
    spinner.fail('Cleanup failed');
  }
}

/**
 * Create test command
 */
export function createTestCommand(): Command {
  const command = new Command('test');

  command
    .description('Run E2E tests with automatic environment setup')
    .option('--structural', 'No API calls, validate structure only')
    .option('--smoke', 'Minimal API calls (default)')
    .option('--integration', 'Full API integration tests')
    .option('--full', 'Complete test suite')
    .option('--cleanup', 'Remove test containers and volumes after run')
    .option('--env-file <path>', 'Path to .env.test file', '.env.test')
    .option('--skip-validation', 'Skip credential validation')
    .option('--skip-docker-check', 'Skip Docker availability check')
    .action(async (options: TestOptions) => {
      const cwd = process.cwd();
      const mode = getTestMode(options);
      const envFile = options.envFile || '.env.test';
      const envFilePath = path.resolve(cwd, envFile);

      console.log(chalk.cyan('\n=== A.E.S Bizzy E2E Test Runner ===\n'));
      console.log(chalk.dim(`Mode: ${mode}`));
      console.log(chalk.dim(`Working directory: ${cwd}`));
      console.log('');

      // Step 1: Check environment file (except for structural)
      if (mode !== 'structural') {
        if (!existsSync(envFilePath)) {
          console.log(chalk.red(`\n  Error: ${envFile} not found`));
          console.log(chalk.yellow(`\n  Create it from the example:`));
          console.log(chalk.dim(`    cp .env.test.example .env.test`));
          console.log(chalk.dim(`    # Edit .env.test with your credentials\n`));
          process.exit(1);
        }
        console.log(chalk.green(`  Environment file: ${envFile}`));
      }

      // Step 2: Validate credentials
      if (!options.skipValidation && mode !== 'structural') {
        const spinner = ora('Validating credentials...').start();

        const env = parseEnvFile(envFilePath);
        const requirements = getCredentialRequirements(mode);
        const validation = validateCredentials(env, requirements);

        if (!validation.valid) {
          spinner.fail('Credential validation failed');
          console.log(chalk.red('\n  Missing required credentials:\n'));
          for (const key of validation.missing) {
            const hint = getCredentialHint(key);
            console.log(chalk.red(`    ${key}`));
            console.log(chalk.dim(`      ${hint}\n`));
          }
          console.log(chalk.yellow('  See: docs/AUTHENTICATION-CREDENTIALS-TAXONOMY.md\n'));
          process.exit(1);
        }

        spinner.succeed(`Credentials validated (${validation.found.length}/${requirements.required.length} required)`);
      } else if (mode === 'structural') {
        console.log(chalk.dim('  Skipping credential validation (structural mode)'));
      }

      // Step 3: Check Docker availability
      if (!options.skipDockerCheck) {
        const spinner = ora('Checking Docker availability...').start();

        const docker = await checkDocker();

        if (!docker.available || !docker.running) {
          spinner.fail(docker.error || 'Docker check failed');
          process.exit(1);
        }

        spinner.succeed('Docker is available and running');
      }

      // Step 4: Run tests
      console.log(chalk.cyan(`\n  Running ${mode} tests...\n`));

      const testResult = await runTests(mode, envFile, cwd);

      // Step 5: Handle cleanup
      if (options.cleanup || testResult.exitCode !== 0) {
        console.log('');
        await runCleanup(cwd);
      }

      // Step 6: Exit with test result
      console.log('');
      if (testResult.exitCode === 0) {
        console.log(chalk.green('  All tests passed!\n'));
      } else {
        console.log(chalk.red(`  Tests failed (exit code: ${testResult.exitCode})\n`));
      }

      process.exit(testResult.exitCode);
    });

  return command;
}
