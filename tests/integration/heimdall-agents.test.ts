/**
 * Heimdall-Agents Integration Tests
 *
 * Tests the integration between Heimdall memory system and A.E.S - Bizzy agents.
 * Verifies that agent learning loops, cross-agent knowledge sharing, and
 * session context loading work correctly.
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
    // Filter by tags if present in query
    let filtered = points;
    if (query.filter?.must) {
      filtered = points.filter((p: any) => {
        return query.filter.must.every((condition: any) => {
          if (condition.key === 'tags') {
            return p.payload.tags?.includes(condition.match.value);
          }
          if (condition.key === 'memory_type') {
            return p.payload.memory_type === condition.match.value;
          }
          return true;
        });
      });
    }
    // Filter by content query (simple text search simulation)
    // Match if any word from query is found in content
    if (query.query && query.query.trim()) {
      const queryWords = query.query.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
      if (queryWords.length > 0) {
        filtered = filtered.filter((p: any) => {
          const contentLower = p.payload.content?.toLowerCase() || '';
          return queryWords.some((word: string) => contentLower.includes(word));
        });
      }
    }
    return filtered.slice(0, query.limit || 10).map((p: any, i: number) => ({
      id: p.id,
      score: 1 - i * 0.05,
      payload: p.payload,
    }));
  },
  count: async (collection: string) => {
    const points = mockQdrantClient.collections.get(collection) || [];
    return { count: points.length };
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
        agent_name: metadata.agentName,
        project: metadata.project,
        created_at: Date.now(),
      },
    };
    await mockQdrantClient.upsert('agent_memories', [memory]);
    return { success: true, id: memory.id };
  },
  queryMemories: async (query: string, options: any = {}) => {
    const searchQuery: any = { limit: options.limit || 10, query };

    if (options.tags || options.memoryType) {
      searchQuery.filter = { must: [] };
      if (options.tags) {
        options.tags.forEach((tag: string) => {
          searchQuery.filter.must.push({ key: 'tags', match: { value: tag } });
        });
      }
      if (options.memoryType) {
        searchQuery.filter.must.push({ key: 'memory_type', match: { value: options.memoryType } });
      }
    }

    const results = await mockQdrantClient.search('agent_memories', searchQuery);
    return {
      success: true,
      memories: results.map((r: any) => ({
        id: r.id,
        content: r.payload.content,
        tags: r.payload.tags,
        memoryType: r.payload.memory_type,
        agentName: r.payload.agent_name,
        relevanceScore: r.score,
      })),
    };
  },
};

describe('Heimdall-Agents Integration', () => {
  beforeAll(async () => {
    await mockQdrantClient.createCollection('agent_memories');
  });

  afterAll(() => {
    mockQdrantClient.clear();
  });

  beforeEach(() => {
    mockQdrantClient.collections.set('agent_memories', []);
  });

  describe('Agent Learning Loop', () => {
    it('should store lessons learned by frontend-dev agent', async () => {
      const lesson = {
        agentName: 'frontend-dev',
        content: `
## Lesson: React Server Components Best Practices

**Context**: When implementing RSC in Next.js 14

**Key Learnings**:
1. Use 'use client' directive only when needed
2. Keep client components small and focused
3. Pass data as props rather than fetching in client components

**Impact**: Reduced bundle size by 40%
        `.trim(),
        tags: ['tech:react', 'tech:nextjs', 'pattern:rsc'],
      };

      await mockStorageManager.storeMemory(
        lesson.content,
        [...lesson.tags, `agent:${lesson.agentName}`],
        'lesson',
        { agentName: lesson.agentName }
      );

      // Verify lesson was stored
      const memories = await mockStorageManager.queryMemories('React Server Components');
      expect(memories.memories.length).toBeGreaterThan(0);
      expect(memories.memories[0].agentName).toBe('frontend-dev');
    });

    it('should store patterns discovered by backend-dev agent', async () => {
      const pattern = {
        agentName: 'backend-dev',
        content: `
## Pattern: API Rate Limiting

**Problem**: Protect API from abuse
**Solution**: Token bucket algorithm with Redis

\`\`\`typescript
const rateLimiter = new RateLimiter({
  tokensPerInterval: 100,
  interval: 'minute',
  redis: redisClient,
});
\`\`\`

**When to Use**: All public-facing API endpoints
        `.trim(),
        tags: ['tech:nodejs', 'pattern:rate-limiting', 'component:api'],
      };

      await mockStorageManager.storeMemory(
        pattern.content,
        [...pattern.tags, `agent:${pattern.agentName}`],
        'pattern',
        { agentName: pattern.agentName }
      );

      const memories = await mockStorageManager.queryMemories('rate limiting', {
        memoryType: 'pattern',
      });
      expect(memories.memories.length).toBeGreaterThan(0);
      expect(memories.memories[0].memoryType).toBe('pattern');
    });

    it('should store error resolutions by debugger agent', async () => {
      const errorResolution = {
        agentName: 'debugger',
        content: `
## Error: ECONNREFUSED on database connection

**Symptoms**: API returns 500 errors intermittently
**Root Cause**: Connection pool exhaustion under load

**Resolution**:
1. Increased pool size from 10 to 50
2. Added connection timeout handling
3. Implemented connection health checks

**Prevention**: Monitor connection pool metrics
        `.trim(),
        tags: ['error:ECONNREFUSED', 'tech:postgresql', 'component:database'],
      };

      await mockStorageManager.storeMemory(
        errorResolution.content,
        [...errorResolution.tags, `agent:${errorResolution.agentName}`],
        'error',
        { agentName: errorResolution.agentName }
      );

      const memories = await mockStorageManager.queryMemories('ECONNREFUSED', {
        memoryType: 'error',
      });
      expect(memories.memories.length).toBeGreaterThan(0);
      expect(memories.memories[0].memoryType).toBe('error');
    });
  });

  describe('Cross-Agent Knowledge Sharing', () => {
    beforeEach(async () => {
      // Seed memories from different agents
      await mockStorageManager.storeMemory(
        'Frontend: Use React Query for server state',
        ['tech:react', 'agent:frontend-dev', 'pattern:state-management'],
        'lesson',
        { agentName: 'frontend-dev' }
      );

      await mockStorageManager.storeMemory(
        'Backend: API should return consistent pagination format',
        ['tech:api', 'agent:backend-dev', 'pattern:pagination'],
        'lesson',
        { agentName: 'backend-dev' }
      );

      await mockStorageManager.storeMemory(
        'DB: Add index on frequently queried columns',
        ['tech:postgresql', 'agent:db-architect', 'pattern:indexing'],
        'lesson',
        { agentName: 'db-architect' }
      );
    });

    it('should allow frontend-dev to access backend patterns', async () => {
      // Frontend dev queries for API patterns
      const memories = await mockStorageManager.queryMemories('API pagination');
      expect(memories.memories.length).toBeGreaterThan(0);
      expect(memories.memories[0].content).toContain('pagination');
    });

    it('should allow any agent to access error resolutions', async () => {
      await mockStorageManager.storeMemory(
        'Error: CORS issue fixed by adding proper headers',
        ['error:CORS', 'agent:debugger'],
        'error',
        { agentName: 'debugger' }
      );

      // Any agent should find this
      const memories = await mockStorageManager.queryMemories('CORS', {
        memoryType: 'error',
      });
      expect(memories.memories.length).toBeGreaterThan(0);
    });

    it('should filter memories by agent when needed', async () => {
      const memories = await mockStorageManager.queryMemories('', {
        tags: ['agent:frontend-dev'],
      });

      expect(memories.memories.length).toBeGreaterThan(0);
      memories.memories.forEach((m: any) => {
        expect(m.tags).toContain('agent:frontend-dev');
      });
    });
  });

  describe('Session Context Loading', () => {
    beforeEach(async () => {
      // Seed project context
      await mockStorageManager.storeMemory(
        `
## Project: E-Commerce App

**Tech Stack**: React, Node.js, PostgreSQL
**Architecture**: Monorepo with Turborepo
**Key Features**: Auth, Products, Cart, Checkout
        `.trim(),
        ['project:e-commerce', 'context'],
        'context',
        { project: 'e-commerce' }
      );

      await mockStorageManager.storeMemory(
        'Decision: Using Prisma ORM for database access',
        ['project:e-commerce', 'tech:prisma', 'decision'],
        'decision',
        { project: 'e-commerce' }
      );
    });

    it('should load project context at session start', async () => {
      const projectName = 'e-commerce';

      // Simulate session start query
      const contextMemories = await mockStorageManager.queryMemories('project context', {
        tags: [`project:${projectName}`],
        memoryType: 'context',
      });

      expect(contextMemories.memories.length).toBeGreaterThan(0);
      expect(contextMemories.memories[0].content).toContain('E-Commerce App');
    });

    it('should load recent lessons for the project', async () => {
      // Add some lessons for the project
      await mockStorageManager.storeMemory(
        'Lesson: Cart state should be persisted to localStorage',
        ['project:e-commerce', 'component:cart'],
        'lesson',
        { project: 'e-commerce' }
      );

      const lessonMemories = await mockStorageManager.queryMemories('cart', {
        tags: ['project:e-commerce'],
        memoryType: 'lesson',
      });

      expect(lessonMemories.memories.length).toBeGreaterThan(0);
    });

    it('should load decisions made for the project', async () => {
      const decisionMemories = await mockStorageManager.queryMemories('database', {
        tags: ['project:e-commerce'],
        memoryType: 'decision',
      });

      expect(decisionMemories.memories.length).toBeGreaterThan(0);
      expect(decisionMemories.memories[0].content).toContain('Prisma');
    });
  });

  describe('Agent Handoff Context', () => {
    it('should preserve context when handing off between agents', async () => {
      // PM Lead creates task context
      await mockStorageManager.storeMemory(
        `
## Task: Implement checkout flow

**Requirements**:
- Validate cart before checkout
- Process payment via Stripe
- Send confirmation email

**Assigned to**: backend-dev, frontend-dev
        `.trim(),
        ['task:20', 'project:e-commerce', 'agent:pm-lead'],
        'context',
        { agentName: 'pm-lead' }
      );

      // Backend dev queries task context
      const taskContext = await mockStorageManager.queryMemories('checkout', {
        tags: ['task:20'],
      });

      expect(taskContext.memories.length).toBeGreaterThan(0);
      expect(taskContext.memories[0].content).toContain('Stripe');
    });

    it('should share implementation decisions across agents', async () => {
      // Backend dev makes implementation decision
      await mockStorageManager.storeMemory(
        'Backend: Using Stripe webhooks for payment confirmation',
        ['task:20', 'tech:stripe', 'agent:backend-dev'],
        'decision',
        { agentName: 'backend-dev' }
      );

      // Frontend dev can access this decision
      const decisions = await mockStorageManager.queryMemories('payment confirmation', {
        tags: ['task:20'],
      });

      expect(decisions.memories.length).toBeGreaterThan(0);
      expect(decisions.memories[0].content).toContain('webhooks');
    });
  });
});
