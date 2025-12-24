/**
 * Tests for manifest validation and structure
 *
 * NOTE: These tests validate manifest files in the development directory.
 * They are skipped if the development files are not present (e.g., in npm package).
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Get the project root - check both possible locations
const PROJECT_ROOT = path.resolve(process.cwd());
const MANIFESTS_DIR = fs.existsSync(path.join(PROJECT_ROOT, '.development', 'manifests'))
  ? path.join(PROJECT_ROOT, '.development', 'manifests')
  : path.join(PROJECT_ROOT, 'claude-subagents', 'manifests');

// Skip all tests if manifests directory doesn't exist (e.g., in npm package)
const MANIFESTS_AVAILABLE = fs.existsSync(MANIFESTS_DIR);

interface ManifestComponent {
  path?: string;
  files?: string[];
  count?: number;
  description?: string;
  totalCount?: number;
  [key: string]: unknown;
}

interface Manifest {
  name: string;
  version: string;
  description: string;
  totalFiles: number;
  extends: string | null;
  components: Record<string, ManifestComponent>;
  categories: string[];
  requiredTools: string[];
  requiredMcpServers: string[];
  optionalMcpServers: string[];
  installOrder: string[];
  postInstall: string[];
  metadata: {
    created: string;
    tier: string;
    targetUsers: string;
    estimatedSetupTime: string;
    features?: string[];
  };
}

describe.skipIf(!MANIFESTS_AVAILABLE)('Installation Manifests', () => {
  const manifestFiles = ['essential.json', 'recommended.json', 'full.json'];

  describe.each(manifestFiles)('%s manifest', (manifestFile) => {
    let manifest: Manifest;
    const manifestPath = path.join(MANIFESTS_DIR, manifestFile);

    // Skip tests if manifest doesn't exist
    const manifestExists = fs.existsSync(manifestPath);

    it('should exist', () => {
      expect(manifestExists).toBe(true);
    });

    if (manifestExists) {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Manifest;

      it('should have valid JSON structure', () => {
        expect(manifest).toBeDefined();
        expect(typeof manifest).toBe('object');
      });

      it('should have required top-level fields', () => {
        expect(manifest.name).toBeDefined();
        expect(manifest.version).toBeDefined();
        expect(manifest.description).toBeDefined();
        expect(manifest.totalFiles).toBeDefined();
        expect(manifest.components).toBeDefined();
      });

      it('should have valid name matching filename', () => {
        const expectedName = manifestFile.replace('.json', '');
        expect(manifest.name).toBe(expectedName);
      });

      it('should have valid version format', () => {
        expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
      });

      it('should have non-empty description', () => {
        expect(manifest.description.length).toBeGreaterThan(10);
      });

      it('should have positive totalFiles count', () => {
        expect(manifest.totalFiles).toBeGreaterThan(0);
      });

      it('should have valid components object', () => {
        expect(typeof manifest.components).toBe('object');
        expect(Object.keys(manifest.components).length).toBeGreaterThan(0);
      });

      it('should have categories array', () => {
        expect(Array.isArray(manifest.categories)).toBe(true);
        expect(manifest.categories.length).toBeGreaterThan(0);
      });

      it('should have requiredTools array', () => {
        expect(Array.isArray(manifest.requiredTools)).toBe(true);
      });

      it('should have requiredMcpServers array', () => {
        expect(Array.isArray(manifest.requiredMcpServers)).toBe(true);
      });

      it('should have optionalMcpServers array', () => {
        expect(Array.isArray(manifest.optionalMcpServers)).toBe(true);
      });

      it('should have installOrder array', () => {
        expect(Array.isArray(manifest.installOrder)).toBe(true);
        expect(manifest.installOrder.length).toBeGreaterThan(0);
      });

      it('should have postInstall array', () => {
        expect(Array.isArray(manifest.postInstall)).toBe(true);
      });

      it('should have valid metadata', () => {
        expect(manifest.metadata).toBeDefined();
        expect(manifest.metadata.created).toBeDefined();
        expect(manifest.metadata.tier).toBeDefined();
        expect(manifest.metadata.targetUsers).toBeDefined();
        expect(manifest.metadata.estimatedSetupTime).toBeDefined();
      });

      it('should have metadata.tier matching manifest name', () => {
        expect(manifest.metadata.tier).toBe(manifest.name);
      });
    }
  });

  describe('Manifest Hierarchy', () => {
    it('essential.json should have extends: null', () => {
      const essentialPath = path.join(MANIFESTS_DIR, 'essential.json');
      if (fs.existsSync(essentialPath)) {
        const essential = JSON.parse(fs.readFileSync(essentialPath, 'utf-8')) as Manifest;
        expect(essential.extends).toBeNull();
      }
    });

    it('recommended.json should extend essential', () => {
      const recommendedPath = path.join(MANIFESTS_DIR, 'recommended.json');
      if (fs.existsSync(recommendedPath)) {
        const recommended = JSON.parse(fs.readFileSync(recommendedPath, 'utf-8')) as Manifest;
        expect(recommended.extends).toBe('essential');
      }
    });

    it('full.json should extend recommended', () => {
      const fullPath = path.join(MANIFESTS_DIR, 'full.json');
      if (fs.existsSync(fullPath)) {
        const full = JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as Manifest;
        expect(full.extends).toBe('recommended');
      }
    });

    it('totalFiles should increase through hierarchy', () => {
      const essentialPath = path.join(MANIFESTS_DIR, 'essential.json');
      const recommendedPath = path.join(MANIFESTS_DIR, 'recommended.json');
      const fullPath = path.join(MANIFESTS_DIR, 'full.json');

      if (fs.existsSync(essentialPath) && fs.existsSync(recommendedPath) && fs.existsSync(fullPath)) {
        const essential = JSON.parse(fs.readFileSync(essentialPath, 'utf-8')) as Manifest;
        const recommended = JSON.parse(fs.readFileSync(recommendedPath, 'utf-8')) as Manifest;
        const full = JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as Manifest;

        expect(recommended.totalFiles).toBeGreaterThanOrEqual(essential.totalFiles);
        expect(full.totalFiles).toBeGreaterThanOrEqual(recommended.totalFiles);
      }
    });
  });

  describe('Component Validation', () => {
    describe('agents component', () => {
      it('should have agents in all manifests', () => {
        for (const manifestFile of manifestFiles) {
          const manifestPath = path.join(MANIFESTS_DIR, manifestFile);
          if (fs.existsSync(manifestPath)) {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Manifest;
            expect(manifest.components.agents).toBeDefined();
          }
        }
      });

      it('essential should have core agents only', () => {
        const essentialPath = path.join(MANIFESTS_DIR, 'essential.json');
        if (fs.existsSync(essentialPath)) {
          const manifest = JSON.parse(fs.readFileSync(essentialPath, 'utf-8')) as Manifest;
          const agents = manifest.components.agents;

          expect(agents.count).toBe(4);
          expect(agents.files).toContain('pm-lead.md');
          expect(agents.files).toContain('frontend-dev.md');
          expect(agents.files).toContain('backend-dev.md');
          expect(agents.files).toContain('debugger.md');
        }
      });

      it('full should include meta-agent', () => {
        const fullPath = path.join(MANIFESTS_DIR, 'full.json');
        if (fs.existsSync(fullPath)) {
          const manifest = JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as Manifest;
          const agents = manifest.components.agents;

          // Check for meta agent in nested structure
          if (agents.meta) {
            const meta = agents.meta as { files?: string[] };
            expect(meta.files).toContain('agent-creator.md');
          }
        }
      });
    });

    describe('hooks component', () => {
      it('essential should have security hooks', () => {
        const essentialPath = path.join(MANIFESTS_DIR, 'essential.json');
        if (fs.existsSync(essentialPath)) {
          const manifest = JSON.parse(fs.readFileSync(essentialPath, 'utf-8')) as Manifest;
          const hooks = manifest.components.hooks;

          expect(hooks.files).toContain('secret_scanner.py');
          expect(hooks.files).toContain('session_start.py');
        }
      });

      it('recommended should have validation hooks', () => {
        const recommendedPath = path.join(MANIFESTS_DIR, 'recommended.json');
        if (fs.existsSync(recommendedPath)) {
          const manifest = JSON.parse(fs.readFileSync(recommendedPath, 'utf-8')) as Manifest;
          const hooks = manifest.components.hooks;

          // Check for recommended hooks in nested structure
          if (hooks.recommended) {
            const recommended = hooks.recommended as { files?: string[] };
            expect(recommended.files).toContain('pre_commit_validator.py');
          }
        }
      });
    });

    describe('skills component', () => {
      it('should have beads skill in essential', () => {
        const essentialPath = path.join(MANIFESTS_DIR, 'essential.json');
        if (fs.existsSync(essentialPath)) {
          const manifest = JSON.parse(fs.readFileSync(essentialPath, 'utf-8')) as Manifest;
          const skills = manifest.components.skills;

          expect(skills.files).toContain('beads.md');
        }
      });

      it('should have task-master skill in essential', () => {
        const essentialPath = path.join(MANIFESTS_DIR, 'essential.json');
        if (fs.existsSync(essentialPath)) {
          const manifest = JSON.parse(fs.readFileSync(essentialPath, 'utf-8')) as Manifest;
          const skills = manifest.components.skills;

          expect(skills.files).toContain('task-master.md');
        }
      });
    });

    describe('commands component', () => {
      it('should have prime command in essential', () => {
        const essentialPath = path.join(MANIFESTS_DIR, 'essential.json');
        if (fs.existsSync(essentialPath)) {
          const manifest = JSON.parse(fs.readFileSync(essentialPath, 'utf-8')) as Manifest;
          const commands = manifest.components.commands;

          expect(commands.files).toContain('prime.md');
        }
      });
    });
  });

  describe('Required Tools Validation', () => {
    it('all manifests should require bd (Beads)', () => {
      for (const manifestFile of manifestFiles) {
        const manifestPath = path.join(MANIFESTS_DIR, manifestFile);
        if (fs.existsSync(manifestPath)) {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Manifest;
          expect(manifest.requiredTools).toContain('bd');
        }
      }
    });

    it('all manifests should require task-master', () => {
      for (const manifestFile of manifestFiles) {
        const manifestPath = path.join(MANIFESTS_DIR, manifestFile);
        if (fs.existsSync(manifestPath)) {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Manifest;
          expect(manifest.requiredTools).toContain('task-master');
        }
      }
    });

    it('all manifests should require gh (GitHub CLI)', () => {
      for (const manifestFile of manifestFiles) {
        const manifestPath = path.join(MANIFESTS_DIR, manifestFile);
        if (fs.existsSync(manifestPath)) {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Manifest;
          expect(manifest.requiredTools).toContain('gh');
        }
      }
    });
  });

  describe('MCP Server Requirements', () => {
    it('all manifests should require task-master-ai MCP server', () => {
      for (const manifestFile of manifestFiles) {
        const manifestPath = path.join(MANIFESTS_DIR, manifestFile);
        if (fs.existsSync(manifestPath)) {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Manifest;
          expect(manifest.requiredMcpServers).toContain('task-master-ai');
        }
      }
    });

    it('full manifest should require research MCP servers', () => {
      const fullPath = path.join(MANIFESTS_DIR, 'full.json');
      if (fs.existsSync(fullPath)) {
        const manifest = JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as Manifest;
        expect(manifest.requiredMcpServers).toContain('exa');
        expect(manifest.requiredMcpServers).toContain('ref');
      }
    });
  });

  describe('Post-Install Steps', () => {
    it('all manifests should include bd init', () => {
      for (const manifestFile of manifestFiles) {
        const manifestPath = path.join(MANIFESTS_DIR, manifestFile);
        if (fs.existsSync(manifestPath)) {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Manifest;
          expect(manifest.postInstall).toContain('bd init');
        }
      }
    });

    it('all manifests should include task-master init', () => {
      for (const manifestFile of manifestFiles) {
        const manifestPath = path.join(MANIFESTS_DIR, manifestFile);
        if (fs.existsSync(manifestPath)) {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Manifest;
          expect(manifest.postInstall).toContain('task-master init');
        }
      }
    });

    it('full manifest should include validation step', () => {
      const fullPath = path.join(MANIFESTS_DIR, 'full.json');
      if (fs.existsSync(fullPath)) {
        const manifest = JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as Manifest;
        expect(manifest.postInstall).toContain('aes-bizzy validate');
      }
    });
  });
});

describe.skipIf(!MANIFESTS_AVAILABLE)('Agent Index', () => {
  const agentIndexPath = path.join(MANIFESTS_DIR, 'agent-index.json');

  interface AgentIndex {
    version: string;
    coreAgents: Array<{
      id: string;
      name: string;
      path: string;
      capabilities: string[];
    }>;
    metaAgent?: {
      id: string;
      name: string;
      path: string;
    };
    generatedAgents: unknown[];
    stats: {
      totalAgents: number;
    };
  }

  it('should exist', () => {
    expect(fs.existsSync(agentIndexPath)).toBe(true);
  });

  if (fs.existsSync(agentIndexPath)) {
    const agentIndex = JSON.parse(fs.readFileSync(agentIndexPath, 'utf-8')) as AgentIndex;

    it('should have valid structure', () => {
      expect(agentIndex.version).toBeDefined();
      expect(agentIndex.coreAgents).toBeDefined();
      expect(Array.isArray(agentIndex.coreAgents)).toBe(true);
    });

    it('should have correct agent count in stats', () => {
      const coreCount = agentIndex.coreAgents.length;
      const metaCount = agentIndex.metaAgent ? 1 : 0;
      const generatedCount = agentIndex.generatedAgents?.length || 0;

      expect(agentIndex.stats.totalAgents).toBe(coreCount + metaCount + generatedCount);
    });

    it('core agents should have required fields', () => {
      for (const agent of agentIndex.coreAgents) {
        expect(agent.id).toBeDefined();
        expect(agent.name).toBeDefined();
        expect(agent.path).toBeDefined();
        expect(Array.isArray(agent.capabilities)).toBe(true);
      }
    });

    it('should include pm-lead as first agent', () => {
      expect(agentIndex.coreAgents[0].id).toBe('pm-lead');
    });
  }
});
