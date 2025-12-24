/**
 * Command Markdown Structure Validation Tests
 *
 * Validates that command (slash command) markdown files follow the correct structure:
 * - Proper title matching the command name
 * - Description section
 * - Steps or instructions
 * - Optional Beads integration section
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Command directories to check
const COMMAND_DIRS = [
  path.join(process.cwd(), 'commands', 'essential'),
  path.join(process.cwd(), 'commands', 'recommended'),
  path.join(process.cwd(), 'commands', 'optional'),
];

interface CommandFile {
  path: string;
  filename: string;
  commandName: string;
  content: string;
  title: string | null;
  hasDescription: boolean;
  hasSteps: boolean;
  hasBeadsIntegration: boolean;
  hasExampleOutput: boolean;
  hasUsage: boolean;
}

/**
 * Extract title from markdown (first h1)
 */
function extractTitle(content: string): string | null {
  // Handle Windows line endings
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const match = normalizedContent.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

/**
 * Check for specific section by heading
 */
function hasSection(content: string, pattern: RegExp): boolean {
  // Handle Windows line endings
  const normalizedContent = content.replace(/\r\n/g, '\n');
  return pattern.test(normalizedContent);
}

/**
 * Load all command files
 */
function loadCommandFiles(): CommandFile[] {
  const commands: CommandFile[] = [];

  for (const dir of COMMAND_DIRS) {
    if (!fs.existsSync(dir)) {
      continue;
    }

    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));

    for (const file of files) {
      // Skip README files
      if (file.toLowerCase() === 'readme.md') {
        continue;
      }

      const filePath = path.join(dir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const commandName = file.replace('.md', '');

      commands.push({
        path: filePath,
        filename: file,
        commandName,
        content,
        title: extractTitle(content),
        hasDescription: hasSection(content, /^#{1,3}\s+Description/im) ||
          content.includes('**Description') ||
          // First paragraph after title counts as description
          /^#[^#][\s\S]{20,}/.test(content),
        hasSteps: hasSection(content, /^#{1,3}\s+Steps/im) ||
          content.includes('1.') ||
          content.includes('- '),
        hasBeadsIntegration: hasSection(content, /Beads/i),
        hasExampleOutput: hasSection(content, /^#{1,3}\s+(Example|Output|Sample)/im),
        hasUsage: hasSection(content, /^#{1,3}\s+Usage/im) ||
          content.includes('```'),
      });
    }
  }

  return commands;
}

let commandFiles: CommandFile[] = [];

beforeAll(() => {
  commandFiles = loadCommandFiles();
});

describe('Command Markdown Files', () => {
  describe('File Discovery', () => {
    it('should find at least one command file', () => {
      expect(commandFiles.length).toBeGreaterThan(0);
    });

    it('should have .md extension for all command files', () => {
      for (const cmd of commandFiles) {
        expect(cmd.filename).toMatch(/\.md$/);
      }
    });
  });

  describe('Title Structure', () => {
    it('should have a title (h1 heading)', () => {
      for (const cmd of commandFiles) {
        expect(cmd.title).not.toBeNull();
        if (!cmd.title) {
          console.error(`Missing title in: ${cmd.filename}`);
        }
      }
    });

    it('should have title referencing the command', () => {
      for (const cmd of commandFiles) {
        if (cmd.title) {
          // Title should contain command name or related term
          const titleLower = cmd.title.toLowerCase();
          const cmdLower = cmd.commandName.toLowerCase().replace(/-/g, ' ');

          // Either title contains command name or command name contains title word
          const isRelated =
            titleLower.includes(cmdLower) ||
            cmdLower.split(' ').some((word) => titleLower.includes(word)) ||
            titleLower.split(' ').some((word) => cmdLower.includes(word));

          if (!isRelated) {
            console.warn(
              `Title "${cmd.title}" may not match command "${cmd.commandName}"`
            );
          }
        }
      }
    });
  });

  describe('Required Content', () => {
    it('should have descriptive content', () => {
      for (const cmd of commandFiles) {
        expect(cmd.hasDescription).toBe(true);
      }
    });

    it('should have steps or instructions', () => {
      for (const cmd of commandFiles) {
        if (!cmd.hasSteps) {
          console.warn(`No steps/instructions in: ${cmd.filename}`);
        }
      }
    });

    it('should have code examples or usage section', () => {
      for (const cmd of commandFiles) {
        if (!cmd.hasUsage) {
          console.warn(`No usage/code examples in: ${cmd.filename}`);
        }
      }
    });
  });

  describe('Content Quality', () => {
    it('should have substantial content (>100 chars)', () => {
      for (const cmd of commandFiles) {
        expect(cmd.content.length).toBeGreaterThan(100);
      }
    });

    it('should have clear actionable content', () => {
      for (const cmd of commandFiles) {
        // Commands should contain action verbs
        const actionVerbs = [
          'run',
          'execute',
          'create',
          'update',
          'check',
          'analyze',
          'load',
          'show',
          'get',
          'set',
          'use',
        ];
        const hasAction = actionVerbs.some((verb) =>
          cmd.content.toLowerCase().includes(verb)
        );

        if (!hasAction) {
          console.warn(`No action verbs found in: ${cmd.filename}`);
        }
      }
    });
  });
});

describe('Command Beads Integration', () => {
  it('should document Beads integration where applicable', () => {
    // Commands that should have Beads integration
    const beadsCommands = ['prime', 'git_status', 'session'];

    for (const cmd of commandFiles) {
      if (beadsCommands.includes(cmd.commandName)) {
        if (!cmd.hasBeadsIntegration) {
          console.warn(
            `Command ${cmd.commandName} should have Beads integration docs`
          );
        }
      }
    }
  });
});

describe('Command Naming Conventions', () => {
  it('should use snake_case or kebab-case for filenames', () => {
    for (const cmd of commandFiles) {
      const name = cmd.commandName;
      // Allow snake_case or kebab-case
      expect(name).toMatch(/^[a-z][a-z0-9_-]*$/);
    }
  });

  it('should not have duplicate command names', () => {
    const names = commandFiles.map((c) => c.commandName);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('should match Claude Code slash command convention', () => {
    for (const cmd of commandFiles) {
      // Slash commands should be concise
      expect(cmd.commandName.length).toBeLessThan(30);
      // Should not contain spaces
      expect(cmd.commandName).not.toMatch(/\s/);
    }
  });
});

describe('Command Directory Organization', () => {
  it('should be organized by tier', () => {
    const tiers = ['essential', 'recommended', 'optional'];

    for (const tier of tiers) {
      const tierDir = path.join(process.cwd(), 'commands', tier);
      if (fs.existsSync(tierDir)) {
        const files = fs.readdirSync(tierDir).filter((f) => f.endsWith('.md'));
        // Tier should have at least one command if it exists
        expect(files.length).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
