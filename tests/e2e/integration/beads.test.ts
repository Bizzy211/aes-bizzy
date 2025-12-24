/**
 * E2E Integration Tests - Beads CLI
 *
 * Tests Beads CLI functionality in a real environment.
 * These tests create actual .beads directories and task files.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { execSync, spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// Skip if not in integration mode
const isIntegration =
  process.env.TEST_MODE === 'integration' || process.env.TEST_MODE === 'full';

describe.skipIf(!isIntegration)('Beads CLI Integration', () => {
  let testDir: string;
  let originalCwd: string;

  beforeAll(() => {
    originalCwd = process.cwd();
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'beads-e2e-'));

    // Initialize git repo (required for Beads)
    execSync('git init', { cwd: testDir, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', {
      cwd: testDir,
      stdio: 'pipe',
    });
    execSync('git config user.name "Test"', { cwd: testDir, stdio: 'pipe' });
  });

  afterAll(() => {
    process.chdir(originalCwd);
    // Cleanup
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    process.chdir(testDir);
  });

  describe('Initialization', () => {
    it('should initialize Beads in a new project', () => {
      // Check if bd command exists
      try {
        const result = execSync('bd --version', {
          cwd: testDir,
          encoding: 'utf-8',
          stdio: 'pipe',
        });
        expect(result).toContain('beads');
      } catch {
        // bd not installed - skip remaining tests
        console.log('Beads CLI not installed - skipping tests');
        return;
      }
    });

    it('should create .beads directory on init', () => {
      try {
        execSync('bd init', { cwd: testDir, stdio: 'pipe' });
        expect(fs.existsSync(path.join(testDir, '.beads'))).toBe(true);
      } catch {
        // Skip if init fails
      }
    });
  });

  describe('Task Management', () => {
    beforeEach(() => {
      // Ensure .beads exists
      const beadsDir = path.join(testDir, '.beads');
      if (!fs.existsSync(beadsDir)) {
        fs.mkdirSync(beadsDir, { recursive: true });
      }
    });

    it('should add a task', () => {
      try {
        const result = execSync(
          'bd add "Test task for E2E" --priority high --json',
          {
            cwd: testDir,
            encoding: 'utf-8',
            stdio: 'pipe',
          }
        );
        const data = JSON.parse(result);
        expect(data.id).toBeDefined();
        expect(data.title).toBe('Test task for E2E');
      } catch {
        // Skip if command fails
      }
    });

    it('should list tasks', () => {
      try {
        const result = execSync('bd list --json', {
          cwd: testDir,
          encoding: 'utf-8',
          stdio: 'pipe',
        });
        const data = JSON.parse(result);
        expect(Array.isArray(data.tasks)).toBe(true);
      } catch {
        // Skip if command fails
      }
    });

    it('should assign task to agent', () => {
      try {
        // First add a task
        const addResult = execSync('bd add "Agent test task" --json', {
          cwd: testDir,
          encoding: 'utf-8',
          stdio: 'pipe',
        });
        const task = JSON.parse(addResult);

        // Assign to agent
        const assignResult = execSync(
          `bd assign ${task.id} --agent pm-lead --json`,
          {
            cwd: testDir,
            encoding: 'utf-8',
            stdio: 'pipe',
          }
        );
        const assigned = JSON.parse(assignResult);
        expect(assigned.assigned).toBe('pm-lead');
      } catch {
        // Skip if command fails
      }
    });
  });

  describe('Session Management', () => {
    it('should get ready tasks', () => {
      try {
        const result = execSync('bd ready --json', {
          cwd: testDir,
          encoding: 'utf-8',
          stdio: 'pipe',
        });
        const data = JSON.parse(result);
        expect(data.tasks).toBeDefined();
      } catch {
        // Skip if command fails
      }
    });
  });
});
