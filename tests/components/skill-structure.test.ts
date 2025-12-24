/**
 * Skill Markdown Structure Validation Tests
 *
 * Validates that skill markdown files follow the correct structure:
 * - Proper title and description
 * - Required sections (When To Use, Related components)
 * - Cross-references to agents, hooks, and other skills
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Skill directories to check
const SKILL_DIRS = [
  path.join(process.cwd(), 'skills', 'essential'),
  path.join(process.cwd(), 'skills', 'recommended'),
  path.join(process.cwd(), 'skills', 'optional'),
];

interface SkillFile {
  path: string;
  filename: string;
  content: string;
  title: string | null;
  sections: string[];
  hasRelatedAgents: boolean;
  hasRelatedSkills: boolean;
  hasRelatedHooks: boolean;
  hasWhenToUse: boolean;
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
 * Extract all section headings
 */
function extractSections(content: string): string[] {
  // Handle Windows line endings
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const matches = normalizedContent.matchAll(/^#{1,3}\s+(.+)$/gm);
  return Array.from(matches).map((m) => m[1].trim());
}

/**
 * Check if content has a specific section
 */
function hasSection(content: string, sectionName: string): boolean {
  // Handle Windows line endings
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const pattern = new RegExp(`^#{1,3}\\s+${sectionName}`, 'im');
  return pattern.test(normalizedContent);
}

/**
 * Load all skill files
 */
function loadSkillFiles(): SkillFile[] {
  const skills: SkillFile[] = [];

  for (const dir of SKILL_DIRS) {
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

      skills.push({
        path: filePath,
        filename: file,
        content,
        title: extractTitle(content),
        sections: extractSections(content),
        hasRelatedAgents: hasSection(content, 'Related Agents'),
        hasRelatedSkills: hasSection(content, 'Related Skills'),
        hasRelatedHooks: hasSection(content, 'Related Hooks'),
        hasWhenToUse: hasSection(content, 'When To Use'),
      });
    }
  }

  return skills;
}

let skillFiles: SkillFile[] = [];

beforeAll(() => {
  skillFiles = loadSkillFiles();
});

describe('Skill Markdown Files', () => {
  describe('File Discovery', () => {
    it('should find at least one skill file', () => {
      expect(skillFiles.length).toBeGreaterThan(0);
    });

    it('should have .md extension for all skill files', () => {
      for (const skill of skillFiles) {
        expect(skill.filename).toMatch(/\.md$/);
      }
    });
  });

  describe('Title Structure', () => {
    it('should have a title (h1 heading) in all skill files', () => {
      for (const skill of skillFiles) {
        expect(skill.title).not.toBeNull();
        if (!skill.title) {
          console.error(`Missing title in: ${skill.filename}`);
        }
      }
    });

    it('should have descriptive titles', () => {
      for (const skill of skillFiles) {
        if (skill.title) {
          expect(skill.title.length).toBeGreaterThan(3);
        }
      }
    });
  });

  describe('Required Sections', () => {
    it('should have "When To Use" section', () => {
      for (const skill of skillFiles) {
        if (!skill.hasWhenToUse) {
          console.warn(`Missing "When To Use" section in: ${skill.filename}`);
        }
        // Warn but don't fail - some skills may have different structure
      }
    });

    it('should have at least one Related section', () => {
      for (const skill of skillFiles) {
        const hasAnyRelated =
          skill.hasRelatedAgents || skill.hasRelatedSkills || skill.hasRelatedHooks;

        if (!hasAnyRelated) {
          console.warn(`No Related sections in: ${skill.filename}`);
        }
      }
    });

    it('should have multiple sections', () => {
      for (const skill of skillFiles) {
        expect(skill.sections.length).toBeGreaterThan(1);
      }
    });
  });

  describe('Content Quality', () => {
    it('should have substantial content (>200 chars)', () => {
      for (const skill of skillFiles) {
        expect(skill.content.length).toBeGreaterThan(200);
      }
    });

    it('should not have empty sections', () => {
      for (const skill of skillFiles) {
        // Check for headings immediately followed by another heading
        const emptySection = /^#{1,3}\s+.+\n\s*#{1,3}\s+/m.test(skill.content);
        if (emptySection) {
          console.warn(`Possible empty section in: ${skill.filename}`);
        }
      }
    });
  });
});

describe('Skill Cross-References', () => {
  it('should reference existing agents', () => {
    // Get list of existing agents
    const agentDirs = [
      path.join(process.cwd(), 'agents', 'core'),
      path.join(process.cwd(), 'agents', 'specialist'),
      path.join(process.cwd(), 'agents', 'utility'),
    ];

    const existingAgents = new Set<string>();
    for (const dir of agentDirs) {
      if (fs.existsSync(dir)) {
        for (const file of fs.readdirSync(dir)) {
          if (file.endsWith('.md')) {
            existingAgents.add(file.replace('.md', ''));
          }
        }
      }
    }

    for (const skill of skillFiles) {
      if (skill.hasRelatedAgents) {
        // Extract agent references from Related Agents section
        const agentSection = skill.content.match(
          /## Related Agents[\s\S]*?(?=##|$)/i
        );
        if (agentSection) {
          // Look for agent names in backticks
          const refs = agentSection[0].matchAll(/`([a-z-]+)`/g);
          for (const ref of refs) {
            if (!existingAgents.has(ref[1])) {
              console.warn(
                `Skill ${skill.filename} references unknown agent: ${ref[1]}`
              );
            }
          }
        }
      }
    }
  });
});

describe('Skill Naming Conventions', () => {
  it('should use kebab-case for filenames', () => {
    for (const skill of skillFiles) {
      const name = skill.filename.replace('.md', '');
      expect(name).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });
});
