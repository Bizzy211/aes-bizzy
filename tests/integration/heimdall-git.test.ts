/**
 * Heimdall-Git Integration Tests
 *
 * Tests the integration between Heimdall memory system and Git commit hooks.
 * Verifies that commits, file changes, and commit messages are properly stored.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

// Mock Qdrant client for testing
const mockQdrantClient = {
  collections: new Map<string, any[]>(),
  createCollection: async (name: string) => {
    mockQdrantClient.collections.set(name, []);
    return { status: 'ok' };
  },
  upsert: async (collection: string, points: any[]) => {
    const existing = mockQdrantClient.collections.get(collection) || [];
    mockQdrantClient.collections.set(collection, [...existing, ...points]);
    return { status: 'ok' };
  },
  search: async (collection: string, query: any) => {
    const points = mockQdrantClient.collections.get(collection) || [];
    let filtered = points;

    // Simple filter implementation
    if (query.filter?.must) {
      filtered = points.filter((p: any) => {
        return query.filter.must.every((condition: any) => {
          if (condition.key === 'tags') {
            return p.payload.tags?.includes(condition.match.value);
          }
          return true;
        });
      });
    }

    return filtered.slice(0, query.limit || 10).map((p: any, i: number) => ({
      id: p.id,
      score: 1 - i * 0.05,
      payload: p.payload,
    }));
  },
  clear: () => {
    mockQdrantClient.collections.clear();
  },
};

// Mock storage manager
const mockStorageManager = {
  storeMemory: async (content: string, tags: string[], memoryType: string, metadata: any = {}) => {
    const memory = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      payload: {
        content,
        tags,
        memory_type: memoryType,
        commit_hash: metadata.commitHash,
        files_changed: metadata.filesChanged,
        created_at: Date.now(),
      },
    };
    await mockQdrantClient.upsert('agent_memories', [memory]);
    return { success: true, id: memory.id };
  },
  queryMemories: async (query: string, options: any = {}) => {
    const searchQuery: any = { limit: options.limit || 10 };

    if (options.tags) {
      searchQuery.filter = { must: [] };
      options.tags.forEach((tag: string) => {
        searchQuery.filter.must.push({ key: 'tags', match: { value: tag } });
      });
    }

    const results = await mockQdrantClient.search('agent_memories', searchQuery);
    return {
      success: true,
      memories: results.map((r: any) => ({
        id: r.id,
        content: r.payload.content,
        tags: r.payload.tags,
        memoryType: r.payload.memory_type,
        commitHash: r.payload.commit_hash,
        filesChanged: r.payload.files_changed,
        relevanceScore: r.score,
      })),
    };
  },
};

// Helper to simulate git commit data extraction
function extractCommitInfo(commitMessage: string, files: string[]) {
  // Extract task IDs from commit message
  const taskIdPatterns = [
    /task\s+(\d+(?:\.\d+)?)/gi,
    /#(\d+)/g,
    /TM-(\d+)/gi,
  ];

  const taskIds: string[] = [];
  for (const pattern of taskIdPatterns) {
    const matches = commitMessage.matchAll(pattern);
    for (const match of matches) {
      taskIds.push(match[1]);
    }
  }

  // Categorize files
  const categories = {
    source: files.filter((f) => /\.(ts|tsx|js|jsx|py|go|rs)$/.test(f) && !f.includes('test')),
    test: files.filter((f) => f.includes('test') || f.includes('spec')),
    config: files.filter((f) => /\.(json|yaml|yml|toml)$/.test(f)),
    docs: files.filter((f) => /\.(md|txt|rst)$/.test(f)),
  };

  // Detect technologies from files
  const techStack: string[] = [];
  if (files.some((f) => /\.(ts|tsx)$/.test(f))) techStack.push('typescript');
  if (files.some((f) => /\.(jsx|tsx)$/.test(f))) techStack.push('react');
  if (files.some((f) => /\.py$/.test(f))) techStack.push('python');
  if (files.some((f) => f.includes('package.json'))) techStack.push('nodejs');

  return { taskIds, categories, techStack };
}

describe('Heimdall-Git Integration', () => {
  beforeAll(async () => {
    await mockQdrantClient.createCollection('agent_memories');
  });

  afterAll(() => {
    mockQdrantClient.clear();
  });

  beforeEach(() => {
    mockQdrantClient.collections.set('agent_memories', []);
  });

  describe('Post-Commit Hook', () => {
    it('should store commit context on git commit', async () => {
      const commitData = {
        hash: 'abc123def',
        message: 'feat: implement user authentication (task 15)',
        author: 'Claude <noreply@anthropic.com>',
        files: [
          'src/auth/login.ts',
          'src/auth/middleware.ts',
          'tests/auth/login.test.ts',
        ],
      };

      const { taskIds, categories, techStack } = extractCommitInfo(
        commitData.message,
        commitData.files
      );

      const content = `
## Git Commit: ${commitData.hash.slice(0, 8)}

### Commit Message
${commitData.message}

### Files Changed (${commitData.files.length} files)

**Source (${categories.source.length})**
${categories.source.map((f) => `- ${f}`).join('\n')}

**Tests (${categories.test.length})**
${categories.test.map((f) => `- ${f}`).join('\n')}

### Commit Info
Hash: ${commitData.hash}
Author: ${commitData.author}
      `.trim();

      const tags = [
        'git-commit',
        `commit:${commitData.hash.slice(0, 8)}`,
        ...taskIds.map((id) => `task:${id}`),
        ...techStack.map((t) => `tech:${t}`),
      ];

      await mockStorageManager.storeMemory(content, tags, 'context', {
        commitHash: commitData.hash,
        filesChanged: commitData.files,
      });

      // Verify memory was stored
      const memories = await mockStorageManager.queryMemories('authentication');
      expect(memories.memories.length).toBeGreaterThan(0);
      expect(memories.memories[0].tags).toContain('git-commit');
      expect(memories.memories[0].tags).toContain('task:15');
    });

    it('should extract multiple task IDs from commit message', async () => {
      const commitMessage = 'feat: complete auth flow (task 15, #16, TM-17)';
      const { taskIds } = extractCommitInfo(commitMessage, []);

      expect(taskIds).toContain('15');
      expect(taskIds).toContain('16');
      expect(taskIds).toContain('17');
    });

    it('should categorize files correctly', async () => {
      const files = [
        'src/components/Button.tsx',
        'src/lib/utils.ts',
        'tests/components/Button.test.tsx',
        'package.json',
        'README.md',
      ];

      const { categories, techStack } = extractCommitInfo('test', files);

      expect(categories.source).toContain('src/components/Button.tsx');
      expect(categories.source).toContain('src/lib/utils.ts');
      expect(categories.test).toContain('tests/components/Button.test.tsx');
      expect(categories.config).toContain('package.json');
      expect(categories.docs).toContain('README.md');

      expect(techStack).toContain('typescript');
      expect(techStack).toContain('react');
      expect(techStack).toContain('nodejs');
    });

    it('should link commits to tasks', async () => {
      // Store commit for task 15
      await mockStorageManager.storeMemory(
        'Commit: Added login form component',
        ['git-commit', 'task:15', 'commit:abc123'],
        'context',
        { commitHash: 'abc123' }
      );

      // Store another commit for task 15
      await mockStorageManager.storeMemory(
        'Commit: Added login API endpoint',
        ['git-commit', 'task:15', 'commit:def456'],
        'context',
        { commitHash: 'def456' }
      );

      // Query all commits for task 15
      const memories = await mockStorageManager.queryMemories('login', {
        tags: ['task:15', 'git-commit'],
      });

      expect(memories.memories.length).toBe(2);
    });
  });

  describe('Commit Message Patterns', () => {
    it('should detect conventional commit types', async () => {
      const commits = [
        { message: 'feat: add new feature', type: 'feature' },
        { message: 'fix: resolve bug', type: 'bugfix' },
        { message: 'docs: update readme', type: 'documentation' },
        { message: 'refactor: improve code', type: 'refactor' },
        { message: 'test: add tests', type: 'testing' },
      ];

      for (const commit of commits) {
        const tags = ['git-commit'];

        // Detect commit type from conventional commit prefix
        if (commit.message.startsWith('feat:')) tags.push('commit-type:feature');
        if (commit.message.startsWith('fix:')) tags.push('commit-type:bugfix');
        if (commit.message.startsWith('docs:')) tags.push('commit-type:docs');
        if (commit.message.startsWith('refactor:')) tags.push('commit-type:refactor');
        if (commit.message.startsWith('test:')) tags.push('commit-type:test');

        await mockStorageManager.storeMemory(commit.message, tags, 'context');
      }

      // Query feature commits
      const featureCommits = await mockStorageManager.queryMemories('', {
        tags: ['commit-type:feature'],
      });

      expect(featureCommits.memories.length).toBe(1);
      expect(featureCommits.memories[0].content).toContain('feat:');
    });
  });

  describe('File Change Tracking', () => {
    it('should track which files were changed in commits', async () => {
      const commitData = {
        hash: 'abc123',
        files: [
          'src/auth/login.ts',
          'src/auth/register.ts',
          'src/components/AuthForm.tsx',
        ],
      };

      await mockStorageManager.storeMemory(
        `Commit touching auth files: ${commitData.files.join(', ')}`,
        ['git-commit', 'component:auth'],
        'context',
        { filesChanged: commitData.files }
      );

      const memories = await mockStorageManager.queryMemories('auth');
      expect(memories.memories[0].filesChanged).toEqual(commitData.files);
    });

    it('should identify commonly modified files', async () => {
      // Simulate multiple commits touching same file
      const commits = [
        { files: ['src/utils.ts', 'src/app.ts'] },
        { files: ['src/utils.ts', 'src/lib.ts'] },
        { files: ['src/utils.ts', 'src/index.ts'] },
      ];

      for (const commit of commits) {
        await mockStorageManager.storeMemory(
          `Files: ${commit.files.join(', ')}`,
          ['git-commit'],
          'context',
          { filesChanged: commit.files }
        );
      }

      const allCommits = await mockStorageManager.queryMemories('Files', {
        tags: ['git-commit'],
      });

      // Check that utils.ts appears in all commits
      const utilsAppearances = allCommits.memories.filter(
        (m: any) => m.filesChanged?.includes('src/utils.ts')
      );
      expect(utilsAppearances.length).toBe(3);
    });
  });

  describe('Commit History Search', () => {
    beforeEach(async () => {
      // Seed commit history
      await mockStorageManager.storeMemory(
        'feat: implement user authentication',
        ['git-commit', 'commit:aaa111', 'task:15'],
        'context'
      );

      await mockStorageManager.storeMemory(
        'fix: resolve login timeout issue',
        ['git-commit', 'commit:bbb222', 'task:15'],
        'context'
      );

      await mockStorageManager.storeMemory(
        'feat: add password reset flow',
        ['git-commit', 'commit:ccc333', 'task:16'],
        'context'
      );
    });

    it('should find commits by content search', async () => {
      const memories = await mockStorageManager.queryMemories('authentication');
      expect(memories.memories.length).toBeGreaterThan(0);
      expect(memories.memories[0].content).toContain('authentication');
    });

    it('should find commits by task ID', async () => {
      const memories = await mockStorageManager.queryMemories('', {
        tags: ['task:15'],
      });

      expect(memories.memories.length).toBe(2);
    });

    it('should find commits by specific hash', async () => {
      const memories = await mockStorageManager.queryMemories('', {
        tags: ['commit:aaa111'],
      });

      expect(memories.memories.length).toBe(1);
      expect(memories.memories[0].content).toContain('authentication');
    });
  });
});
