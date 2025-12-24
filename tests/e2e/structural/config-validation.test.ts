/**
 * E2E Structural Tests - Configuration Validation
 *
 * Validates project configuration files and structure.
 * These tests run without API keys and validate structure only.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// These tests always run regardless of TEST_MODE
describe('Structural Configuration Validation', () => {
  const projectRoot = process.cwd();

  describe('Package Configuration', () => {
    it('should have valid package.json', () => {
      const pkgPath = path.join(projectRoot, 'package.json');
      expect(fs.existsSync(pkgPath)).toBe(true);

      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      expect(pkg.name).toBeDefined();
      expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
      expect(pkg.scripts).toBeDefined();
    });

    it('should have required npm scripts', () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8')
      );

      const requiredScripts = ['build', 'test', 'lint'];
      for (const script of requiredScripts) {
        expect(pkg.scripts[script]).toBeDefined();
      }
    });

    it('should have test:ecosystem scripts', () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8')
      );

      // E2E test scripts
      expect(pkg.scripts['test:e2e:structural']).toBeDefined();
      expect(pkg.scripts['test:e2e:smoke']).toBeDefined();
    });
  });

  describe('TypeScript Configuration', () => {
    it('should have tsconfig.json', () => {
      const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
      expect(fs.existsSync(tsconfigPath)).toBe(true);

      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
      expect(tsconfig.compilerOptions).toBeDefined();
    });
  });

  describe('Directory Structure', () => {
    const requiredDirs = [
      'agents',
      'commands',
      'hooks',
      'skills',
      'scripts',
      'src',
      'tests',
    ];

    for (const dir of requiredDirs) {
      it(`should have ${dir}/ directory`, () => {
        expect(fs.existsSync(path.join(projectRoot, dir))).toBe(true);
      });
    }
  });

  describe('Agent Configuration', () => {
    // Helper to recursively find all .md files
    function findMdFiles(dir: string): string[] {
      const results: string[] = [];
      if (!fs.existsSync(dir)) return results;

      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          results.push(...findMdFiles(fullPath));
        } else if (
          item.name.endsWith('.md') &&
          item.name.toLowerCase() !== 'readme.md'
        ) {
          results.push(fullPath);
        }
      }
      return results;
    }

    it('should have agent markdown files', () => {
      const agentsDir = path.join(projectRoot, 'agents');
      const mdFiles = findMdFiles(agentsDir);
      expect(mdFiles.length).toBeGreaterThan(0);
    });

    it('should have valid agent frontmatter', () => {
      const agentsDir = path.join(projectRoot, 'agents');
      const mdFiles = findMdFiles(agentsDir);

      for (const file of mdFiles.slice(0, 5)) {
        // Check first 5 agents
        const content = fs.readFileSync(file, 'utf-8');
        const normalizedContent = content.replace(/\r\n/g, '\n');

        // Should have frontmatter
        expect(normalizedContent.startsWith('---')).toBe(true);

        // Should have name field (agent identifier)
        expect(normalizedContent).toMatch(/name:\s*\S+/);
      }
    });
  });

  describe('Hook Configuration', () => {
    // Helper to recursively find all .py files
    function findPyFiles(dir: string): string[] {
      const results: string[] = [];
      if (!fs.existsSync(dir)) return results;

      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          results.push(...findPyFiles(fullPath));
        } else if (item.name.endsWith('.py')) {
          results.push(fullPath);
        }
      }
      return results;
    }

    it('should have Python hook files', () => {
      const hooksDir = path.join(projectRoot, 'hooks');
      const pyFiles = findPyFiles(hooksDir);
      expect(pyFiles.length).toBeGreaterThan(0);
    });

    it('should have session_start.py hook in essential or recommended', () => {
      const essentialPath = path.join(
        projectRoot,
        'hooks',
        'essential',
        'session_start.py'
      );
      const recommendedPath = path.join(
        projectRoot,
        'hooks',
        'recommended',
        'session_start.py'
      );
      expect(
        fs.existsSync(essentialPath) || fs.existsSync(recommendedPath)
      ).toBe(true);
    });
  });

  describe('Skill Configuration', () => {
    it('should have skill markdown files', () => {
      const skillsDir = path.join(projectRoot, 'skills');
      if (fs.existsSync(skillsDir)) {
        const files = fs.readdirSync(skillsDir);
        const mdFiles = files.filter((f) => f.endsWith('.md'));
        expect(mdFiles.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Docker Configuration', () => {
    it('should have Dockerfile.test for E2E testing', () => {
      expect(fs.existsSync(path.join(projectRoot, 'Dockerfile.test'))).toBe(
        true
      );
    });

    it('should have docker-compose.test.yml', () => {
      expect(
        fs.existsSync(path.join(projectRoot, 'docker-compose.test.yml'))
      ).toBe(true);
    });
  });

  describe('Environment Configuration', () => {
    it('should have .env.test.example template', () => {
      expect(fs.existsSync(path.join(projectRoot, '.env.test.example'))).toBe(
        true
      );
    });

    it('should NOT have .env.test committed', () => {
      // .env.test should be gitignored
      const gitignorePath = path.join(projectRoot, '.gitignore');
      if (fs.existsSync(gitignorePath)) {
        const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
        // Either the file doesn't exist or it's in gitignore
        const envTestPath = path.join(projectRoot, '.env.test');
        if (fs.existsSync(envTestPath)) {
          expect(gitignore).toMatch(/\.env\.test/);
        }
      }
    });
  });

  describe('CI/CD Configuration', () => {
    it('should have GitHub Actions workflow for E2E tests', () => {
      const workflowPath = path.join(
        projectRoot,
        '.github',
        'workflows',
        'e2e-tests.yml'
      );
      expect(fs.existsSync(workflowPath)).toBe(true);
    });
  });
});
