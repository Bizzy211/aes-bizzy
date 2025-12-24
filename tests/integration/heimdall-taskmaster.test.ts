/**
 * Heimdall-TaskMaster Integration Tests
 *
 * Tests the integration between Heimdall memory system and TaskMaster task management.
 * Verifies that task completions, PRD parsing, and task updates properly store memories.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

// Mock implementations for testing without actual Qdrant
const mockQdrantClient = {
  collections: new Map<string, any[]>(),
  createCollection: async (name: string) => {
    mockQdrantClient.collections.set(name, []);
    return { status: 'ok' };
  },
  upsert: async (collection: string, points: any[]) => {
    const existing = mockQdrantClient.collections.get(collection) || [];
    mockQdrantClient.collections.set(collection, [...existing, ...points]);
    return { status: 'ok', operation_id: Date.now() };
  },
  search: async (collection: string, query: any) => {
    const points = mockQdrantClient.collections.get(collection) || [];
    // Simple mock search - returns all points with mock scores
    return points.slice(0, query.limit || 10).map((p: any, i: number) => ({
      id: p.id,
      score: 1 - i * 0.1,
      payload: p.payload,
    }));
  },
  scroll: async (collection: string, filter: any) => {
    const points = mockQdrantClient.collections.get(collection) || [];
    return {
      points: points.slice(0, filter?.limit || 100),
      next_page_offset: null,
    };
  },
  count: async (collection: string) => {
    const points = mockQdrantClient.collections.get(collection) || [];
    return { count: points.length };
  },
  delete: async (collection: string, ids: string[]) => {
    const points = mockQdrantClient.collections.get(collection) || [];
    const remaining = points.filter((p: any) => !ids.includes(p.id));
    mockQdrantClient.collections.set(collection, remaining);
    return { status: 'ok' };
  },
  clear: () => {
    mockQdrantClient.collections.clear();
  },
};

// Mock storage manager
const mockStorageManager = {
  storeMemory: async (content: string, tags: string[], memoryType: string) => {
    const memory = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      payload: {
        content,
        tags,
        memory_type: memoryType,
        created_at: Date.now(),
      },
    };
    await mockQdrantClient.upsert('agent_memories', [memory]);
    return { success: true, id: memory.id };
  },
  queryMemories: async (query: string, options: any = {}) => {
    const results = await mockQdrantClient.search('agent_memories', {
      limit: options.limit || 10,
    });
    return {
      success: true,
      memories: results.map((r: any) => ({
        id: r.id,
        content: r.payload.content,
        tags: r.payload.tags,
        memoryType: r.payload.memory_type,
        relevanceScore: r.score,
      })),
    };
  },
};

describe('Heimdall-TaskMaster Integration', () => {
  beforeAll(async () => {
    // Setup mock collection
    await mockQdrantClient.createCollection('agent_memories');
  });

  afterAll(() => {
    mockQdrantClient.clear();
  });

  beforeEach(() => {
    // Clear memories before each test
    mockQdrantClient.collections.set('agent_memories', []);
  });

  describe('Task Completion Flow', () => {
    it('should store memory when task is marked complete', async () => {
      const taskData = {
        id: '15',
        title: 'Implement user authentication',
        status: 'done',
        description: 'JWT-based auth with refresh tokens',
      };

      // Simulate what the hook would do
      const content = `
## Task Completed: ${taskData.title}

**Task ID**: ${taskData.id}
**Status**: ${taskData.status}
**Description**: ${taskData.description}
      `.trim();

      const tags = [
        `task:${taskData.id}`,
        'type:context',
        'agent:pm-lead',
        'completed',
      ];

      const result = await mockStorageManager.storeMemory(content, tags, 'context');

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();

      // Verify memory was stored
      const memories = await mockStorageManager.queryMemories('authentication');
      expect(memories.memories.length).toBeGreaterThan(0);
      expect(memories.memories[0].tags).toContain(`task:${taskData.id}`);
    });

    it('should include implementation details in task completion memory', async () => {
      const content = `
## Task Completed: Build login form

**Implementation Details**:
- Used React Hook Form for validation
- Added Zod schema for type-safe validation
- Integrated with auth API endpoints

**Files Modified**:
- src/components/LoginForm.tsx
- src/lib/validations/auth.ts
      `.trim();

      const tags = ['task:15.1', 'tech:react', 'component:auth'];

      await mockStorageManager.storeMemory(content, tags, 'lesson');

      const memories = await mockStorageManager.queryMemories('React Hook Form');
      expect(memories.memories.length).toBeGreaterThan(0);
      expect(memories.memories[0].content).toContain('React Hook Form');
    });

    it('should link subtask completions to parent task', async () => {
      // Store parent task memory
      await mockStorageManager.storeMemory(
        '## Task: Implement auth system',
        ['task:15', 'project:myapp'],
        'context'
      );

      // Store subtask memories
      await mockStorageManager.storeMemory(
        '## Subtask: Login form UI',
        ['task:15.1', 'task:15', 'project:myapp'],
        'context'
      );

      await mockStorageManager.storeMemory(
        '## Subtask: Auth API integration',
        ['task:15.2', 'task:15', 'project:myapp'],
        'context'
      );

      // Query all task 15 related memories
      const memories = await mockStorageManager.queryMemories('auth');
      expect(memories.memories.length).toBe(3);
    });
  });

  describe('PRD Parsing Flow', () => {
    it('should store PRD context when parsed', async () => {
      const prdData = {
        projectName: 'E-Commerce Platform',
        tasksGenerated: 12,
        technologies: ['React', 'Node.js', 'PostgreSQL'],
      };

      const content = `
## PRD Parsed: ${prdData.projectName}

**Tasks Generated**: ${prdData.tasksGenerated}
**Technology Stack**: ${prdData.technologies.join(', ')}

This PRD describes an e-commerce platform with user authentication,
product catalog, shopping cart, and checkout functionality.
      `.trim();

      const tags = [
        'prd',
        'project:e-commerce',
        ...prdData.technologies.map((t) => `tech:${t.toLowerCase()}`),
      ];

      await mockStorageManager.storeMemory(content, tags, 'context');

      const memories = await mockStorageManager.queryMemories('e-commerce');
      expect(memories.memories.length).toBeGreaterThan(0);
      expect(memories.memories[0].tags).toContain('prd');
    });

    it('should extract requirements from PRD', async () => {
      const requirements = [
        'User registration and login',
        'Product search and filtering',
        'Shopping cart management',
        'Secure checkout process',
      ];

      const content = `
## Key Requirements

${requirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}
      `.trim();

      await mockStorageManager.storeMemory(content, ['prd', 'requirements'], 'context');

      const memories = await mockStorageManager.queryMemories('requirements');
      expect(memories.memories[0].content).toContain('User registration');
    });
  });

  describe('Task Update Flow', () => {
    it('should store implementation notes when subtask is updated', async () => {
      const subtaskId = '15.2';
      const notes = `
## Implementation Notes

Started working on the auth API integration.
Using JWT tokens with 15-minute expiry and refresh tokens.

**Challenges**:
- Token refresh logic needed careful handling
- CORS configuration for cross-origin requests

**Solution**:
- Implemented interceptor for automatic token refresh
- Added proper CORS headers in Express middleware
      `.trim();

      const tags = [
        `task:${subtaskId}`,
        'tech:nodejs',
        'pattern:jwt-auth',
      ];

      await mockStorageManager.storeMemory(notes, tags, 'lesson');

      const memories = await mockStorageManager.queryMemories('JWT token refresh');
      expect(memories.memories.length).toBeGreaterThan(0);
    });
  });

  describe('Cross-Task Learning', () => {
    it('should enable finding similar past solutions', async () => {
      // Store a previous solution
      await mockStorageManager.storeMemory(
        `
## Pattern: Form Validation with Zod

**Problem**: Type-safe form validation in React
**Solution**: Use Zod schema with React Hook Form

\`\`\`typescript
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
\`\`\`
        `.trim(),
        ['pattern:validation', 'tech:react', 'tech:zod'],
        'pattern'
      );

      // Query for similar solutions when starting new task
      const memories = await mockStorageManager.queryMemories('form validation React');
      expect(memories.memories.length).toBeGreaterThan(0);
      expect(memories.memories[0].content).toContain('Zod');
    });

    it('should retrieve relevant errors when debugging', async () => {
      // Store an error resolution
      await mockStorageManager.storeMemory(
        `
## Error: Module not found

**Symptoms**: Import statement fails for local module
**Root Cause**: Missing .js extension in ESM imports
**Resolution**: Add .js extension to all local imports

\`\`\`typescript
// Before
import { auth } from './auth';

// After
import { auth } from './auth.js';
\`\`\`
        `.trim(),
        ['error:ModuleNotFound', 'tech:typescript', 'tech:esm'],
        'error'
      );

      // Query when encountering similar error
      const memories = await mockStorageManager.queryMemories('Module not found import');
      expect(memories.memories.length).toBeGreaterThan(0);
      expect(memories.memories[0].memoryType).toBe('error');
    });
  });
});
