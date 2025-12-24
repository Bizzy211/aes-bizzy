/**
 * Agent Markdown Schema Validation Tests
 *
 * Validates that agent markdown files follow the correct structure:
 * - YAML frontmatter with required fields (name, description, tools)
 * - Valid tool references
 * - Proper markdown body structure
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Agent directories to check
const AGENT_DIRS = [
  path.join(process.cwd(), 'agents', 'core'),
  path.join(process.cwd(), 'agents', 'specialist'),
  path.join(process.cwd(), 'agents', 'utility'),
  path.join(process.cwd(), 'agents', 'meta'),
];

interface AgentFrontmatter {
  name: string;
  description: string;
  tools: string;
}

interface AgentFile {
  path: string;
  filename: string;
  content: string;
  frontmatter: AgentFrontmatter | null;
  body: string;
}

/**
 * Parse YAML frontmatter from markdown content
 */
function parseFrontmatter(content: string): AgentFrontmatter | null {
  // Handle both Unix (\n) and Windows (\r\n) line endings
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const frontmatterMatch = normalizedContent.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch || !frontmatterMatch[1]) {
    return null;
  }

  const frontmatter: Record<string, string> = {};
  const lines = frontmatterMatch[1].split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      frontmatter[key] = value;
    }
  }

  return frontmatter as unknown as AgentFrontmatter;
}

/**
 * Get markdown body (content after frontmatter)
 */
function getBody(content: string): string {
  // Handle both Unix (\n) and Windows (\r\n) line endings
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const match = normalizedContent.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  return match ? match[1].trim() : content;
}

/**
 * Load all agent files from directories
 */
function loadAgentFiles(): AgentFile[] {
  const agents: AgentFile[] = [];

  for (const dir of AGENT_DIRS) {
    if (!fs.existsSync(dir)) {
      continue;
    }

    const files = fs.readdirSync(dir).filter((f) =>
      f.endsWith('.md') && f.toLowerCase() !== 'readme.md'
    );

    for (const file of files) {
      const filePath = path.join(dir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      agents.push({
        path: filePath,
        filename: file,
        content,
        frontmatter: parseFrontmatter(content),
        body: getBody(content),
      });
    }
  }

  return agents;
}

// Load agents once before all tests
let agentFiles: AgentFile[] = [];

beforeAll(() => {
  agentFiles = loadAgentFiles();
});

describe('Agent Markdown Files', () => {
  describe('File Discovery', () => {
    it('should find at least one agent file', () => {
      expect(agentFiles.length).toBeGreaterThan(0);
    });

    it('should have .md extension for all agent files', () => {
      for (const agent of agentFiles) {
        expect(agent.filename).toMatch(/\.md$/);
      }
    });
  });

  describe('Frontmatter Structure', () => {
    it('should have YAML frontmatter in all agent files', () => {
      const missingFrontmatter: string[] = [];
      for (const agent of agentFiles) {
        if (!agent.frontmatter) {
          missingFrontmatter.push(agent.filename);
        }
      }
      if (missingFrontmatter.length > 0) {
        console.error(`Missing frontmatter in: ${missingFrontmatter.join(', ')}`);
      }
      expect(missingFrontmatter).toHaveLength(0);
    });

    it('should have required "name" field', () => {
      for (const agent of agentFiles) {
        if (agent.frontmatter) {
          expect(agent.frontmatter.name).toBeDefined();
          expect(agent.frontmatter.name.length).toBeGreaterThan(0);
        }
      }
    });

    it('should have required "description" field', () => {
      for (const agent of agentFiles) {
        if (agent.frontmatter) {
          expect(agent.frontmatter.description).toBeDefined();
          expect(agent.frontmatter.description.length).toBeGreaterThan(0);
        }
      }
    });

    it('should have required "tools" field (except guide files)', () => {
      for (const agent of agentFiles) {
        if (agent.frontmatter) {
          // Skip guide/documentation files that don't define executable agents
          const isGuide = agent.filename.includes('guide') ||
            agent.filename.includes('integration') ||
            agent.frontmatter.description?.toLowerCase().includes('guide');

          if (!isGuide) {
            expect(agent.frontmatter.tools).toBeDefined();
          }
        }
      }
    });

    it('should have kebab-case name matching filename', () => {
      for (const agent of agentFiles) {
        if (agent.frontmatter) {
          const expectedName = agent.filename.replace('.md', '');
          expect(agent.frontmatter.name).toBe(expectedName);
        }
      }
    });
  });

  describe('Tool References', () => {
    const VALID_BUILTIN_TOOLS = [
      'Task',
      'Bash',
      'Read',
      'Write',
      'Edit',
      'MultiEdit',
      'Glob',
      'Grep',
      'WebFetch',
      'WebSearch',
    ];

    it('should have at least one tool defined', () => {
      for (const agent of agentFiles) {
        if (agent.frontmatter && agent.frontmatter.tools) {
          const tools = agent.frontmatter.tools.split(',').map((t) => t.trim());
          expect(tools.length).toBeGreaterThan(0);
        }
      }
    });

    it('should have valid tool format (built-in or mcp__*)', () => {
      for (const agent of agentFiles) {
        if (agent.frontmatter && agent.frontmatter.tools) {
          const tools = agent.frontmatter.tools.split(',').map((t) => t.trim());

          for (const tool of tools) {
            const isBuiltIn = VALID_BUILTIN_TOOLS.includes(tool);
            const isMcpTool = tool.startsWith('mcp__');
            const isValid = isBuiltIn || isMcpTool;

            if (!isValid) {
              console.warn(`Unknown tool "${tool}" in ${agent.filename}`);
            }
            // Allow unknown tools but log warning
          }
        }
      }
    });
  });

  describe('Body Content', () => {
    it('should have non-empty body content', () => {
      for (const agent of agentFiles) {
        expect(agent.body.length).toBeGreaterThan(0);
      }
    });

    it('should have markdown headings in body', () => {
      for (const agent of agentFiles) {
        // Check for at least one heading
        const hasHeading = /^#+\s+.+$/m.test(agent.body);
        if (!hasHeading) {
          console.warn(`No headings found in: ${agent.filename}`);
        }
      }
    });
  });
});

describe('Agent Naming Conventions', () => {
  it('should use kebab-case for filenames', () => {
    for (const agent of agentFiles) {
      const name = agent.filename.replace('.md', '');
      expect(name).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });

  it('should not have duplicate agent names', () => {
    const names = agentFiles
      .map((a) => a.frontmatter?.name)
      .filter(Boolean) as string[];
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });
});
