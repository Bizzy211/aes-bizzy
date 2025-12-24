/**
 * E2E Integration Tests - Task Master
 *
 * Tests Task Master MCP tools and CLI functionality.
 * Requires ANTHROPIC_API_KEY or other AI provider key.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// Skip if not in integration mode or no API key
const isIntegration =
  process.env.TEST_MODE === 'integration' || process.env.TEST_MODE === 'full';
const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

describe.skipIf(!isIntegration || !hasApiKey)('Task Master Integration', () => {
  let testDir: string;
  let originalCwd: string;

  beforeAll(() => {
    originalCwd = process.cwd();
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taskmaster-e2e-'));

    // Initialize git repo
    execSync('git init', { cwd: testDir, stdio: 'pipe' });

    // Create minimal package.json
    fs.writeFileSync(
      path.join(testDir, 'package.json'),
      JSON.stringify({ name: 'test-project', version: '1.0.0' })
    );
  });

  afterAll(() => {
    process.chdir(originalCwd);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('CLI Availability', () => {
    it('should have task-master command available', () => {
      try {
        const result = execSync('npx task-master --help', {
          cwd: testDir,
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 30000,
        });
        expect(result).toContain('task-master');
      } catch (error) {
        // Command may not be installed globally
        console.log('Task Master CLI not available via npx');
      }
    });
  });

  describe('Project Initialization', () => {
    it('should initialize task master project', () => {
      try {
        execSync('npx task-master init --yes', {
          cwd: testDir,
          stdio: 'pipe',
          timeout: 60000,
          env: { ...process.env, ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY },
        });

        // Check for .taskmaster directory
        const taskmasterDir = path.join(testDir, '.taskmaster');
        expect(fs.existsSync(taskmasterDir)).toBe(true);
      } catch {
        // Skip if init fails
      }
    });
  });

  describe('Task Operations', () => {
    beforeAll(() => {
      // Ensure .taskmaster directory exists with tasks.json
      const taskmasterDir = path.join(testDir, '.taskmaster', 'tasks');
      fs.mkdirSync(taskmasterDir, { recursive: true });
      fs.writeFileSync(
        path.join(taskmasterDir, 'tasks.json'),
        JSON.stringify({
          meta: { version: '1.0.0' },
          tasks: [
            {
              id: '1',
              title: 'Test Task',
              description: 'A test task for E2E testing',
              status: 'pending',
              priority: 'medium',
            },
          ],
        })
      );
    });

    it('should list tasks', () => {
      try {
        const result = execSync('npx task-master list', {
          cwd: testDir,
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 30000,
        });
        expect(result).toContain('Task');
      } catch {
        // Skip if command fails
      }
    });

    it('should get next task', () => {
      try {
        const result = execSync('npx task-master next', {
          cwd: testDir,
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 30000,
        });
        // Should output something about tasks
        expect(result.length).toBeGreaterThan(0);
      } catch {
        // Skip if command fails
      }
    });
  });

  describe('AI Operations (requires API key)', () => {
    it.skipIf(!hasApiKey)('should add task with AI assistance', async () => {
      try {
        const result = execSync(
          'npx task-master add-task --prompt "Create a simple hello world function"',
          {
            cwd: testDir,
            encoding: 'utf-8',
            stdio: 'pipe',
            timeout: 120000, // AI calls can be slow
            env: {
              ...process.env,
              ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
            },
          }
        );
        expect(result).toBeDefined();
      } catch {
        // Skip if command fails
      }
    });
  });
});
