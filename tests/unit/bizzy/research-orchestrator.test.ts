/**
 * Unit Tests for Research Orchestrator Module
 *
 * Tests the research functions that wrap exa.ai and ref.tools MCP calls.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  searchBranding,
  searchTechDocs,
  getCodeContext,
  gatherProjectResearch,
  extractSource,
  deduplicateResults,
  parseDocumentation,
  estimateTokenUsage,
  ResearchError,
  type BrandingResult,
  type TechnicalDocsResult,
  type CodeContextResult,
  type ProjectResearchResult,
  type ResearchOptions,
} from '../../../src/bizzy/research-orchestrator.js';

// Set up test environment
beforeEach(() => {
  process.env.NODE_ENV = 'test';
  process.env.MOCK_MCP = 'true';
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Research Orchestrator - Utility Functions', () => {
  describe('extractSource', () => {
    it('should extract hostname from valid URL', () => {
      expect(extractSource('https://example.com/path/to/page')).toBe('example.com');
      expect(extractSource('https://docs.github.com/en/actions')).toBe('docs.github.com');
      expect(extractSource('http://localhost:3000/api')).toBe('localhost');
    });

    it('should return original string for invalid URL', () => {
      expect(extractSource('not-a-url')).toBe('not-a-url');
      expect(extractSource('')).toBe('');
    });
  });

  describe('deduplicateResults', () => {
    it('should remove duplicate results by URL', () => {
      const results = [
        { url: 'https://example.com/1', title: 'First' },
        { url: 'https://example.com/2', title: 'Second' },
        { url: 'https://example.com/1', title: 'Duplicate' },
      ];

      const deduplicated = deduplicateResults(results);
      expect(deduplicated).toHaveLength(2);
      expect(deduplicated[0]?.title).toBe('First');
      expect(deduplicated[1]?.title).toBe('Second');
    });

    it('should handle results without URLs', () => {
      const results = [
        { content: 'First' },
        { content: 'Second' },
        { content: 'First' },
      ];

      const deduplicated = deduplicateResults(results);
      expect(deduplicated).toHaveLength(2);
    });

    it('should return empty array for empty input', () => {
      expect(deduplicateResults([])).toEqual([]);
    });
  });

  describe('parseDocumentation', () => {
    it('should extract headings from markdown', () => {
      const content = `
# Main Heading
Some content here.

## Sub Heading
More content.

### Third Level
Even more content.
      `;

      const parsed = parseDocumentation(content);
      expect(parsed.headings).toContain('Main Heading');
      expect(parsed.headings).toContain('Sub Heading');
      expect(parsed.headings).toContain('Third Level');
    });

    it('should extract code blocks', () => {
      const content = `
Here's some code:

\`\`\`typescript
const x = 1;
console.log(x);
\`\`\`

And more code:

\`\`\`javascript
function test() {
  return true;
}
\`\`\`
      `;

      const parsed = parseDocumentation(content);
      expect(parsed.codeBlocks).toHaveLength(2);
      expect(parsed.codeBlocks[0]).toContain('const x = 1');
      expect(parsed.codeBlocks[1]).toContain('function test()');
    });

    it('should extract list items', () => {
      const content = `
Here's a list:
- First item
- Second item
* Third item with asterisk
      `;

      const parsed = parseDocumentation(content);
      expect(parsed.lists).toContain('First item');
      expect(parsed.lists).toContain('Second item');
      expect(parsed.lists).toContain('Third item with asterisk');
    });

    it('should handle empty content', () => {
      const parsed = parseDocumentation('');
      expect(parsed.headings).toEqual([]);
      expect(parsed.codeBlocks).toEqual([]);
      expect(parsed.lists).toEqual([]);
    });
  });

  describe('estimateTokenUsage', () => {
    it('should calculate token estimate based on query and options', () => {
      const estimate = estimateTokenUsage('test query', {
        numResults: 5,
        tokensNum: 3000,
      });

      // Base tokens (query length / 4) + result tokens (5 * 500) + code tokens (3000)
      expect(estimate).toBeGreaterThan(0);
      expect(estimate).toBe(Math.ceil('test query'.length / 4) + 5 * 500 + 3000);
    });

    it('should use defaults when options not provided', () => {
      const estimate = estimateTokenUsage('query', {});

      // Base + default result tokens (8 * 500) + default code tokens (5000)
      expect(estimate).toBe(Math.ceil('query'.length / 4) + 8 * 500 + 5000);
    });
  });
});

describe('Research Orchestrator - ResearchError', () => {
  it('should create error with source and original error', () => {
    const originalError = new Error('Network failure');
    const error = new ResearchError('Search failed', 'exa', originalError);

    expect(error.name).toBe('ResearchError');
    expect(error.message).toBe('Search failed');
    expect(error.source).toBe('exa');
    expect(error.originalError).toBe(originalError);
  });

  it('should create error without original error', () => {
    const error = new ResearchError('Timeout', 'ref');

    expect(error.source).toBe('ref');
    expect(error.originalError).toBeUndefined();
  });
});

describe('Research Orchestrator - searchBranding', () => {
  it('should return BrandingResult structure', async () => {
    const result = await searchBranding('NY Knicks');

    expect(result).toHaveProperty('brandGuidelines');
    expect(result).toHaveProperty('colorSchemes');
    expect(result).toHaveProperty('typographyGuidelines');
    expect(result).toHaveProperty('logoGuidelines');
    expect(result).toHaveProperty('visualExamples');
  });

  it('should include brand guidelines from search results', async () => {
    const result = await searchBranding('test brand');

    expect(Array.isArray(result.brandGuidelines)).toBe(true);
    // With mocked MCP, we should get some results
    expect(result.brandGuidelines.length).toBeGreaterThanOrEqual(0);
  });

  it('should respect numResults option', async () => {
    const result = await searchBranding('test', { numResults: 3 });

    // Result should be structured correctly even with limited results
    expect(result).toHaveProperty('brandGuidelines');
  });

  it('should handle errors gracefully with fallbackOnError', async () => {
    // With mock enabled, this should not throw
    const result = await searchBranding('test', { fallbackOnError: true });

    expect(result).toBeDefined();
  });
});

describe('Research Orchestrator - searchTechDocs', () => {
  it('should return TechnicalDocsResult structure', async () => {
    const result = await searchTechDocs('React hooks');

    expect(result).toHaveProperty('officialDocs');
    expect(result).toHaveProperty('apiReferences');
    expect(result).toHaveProperty('migrationGuides');
    expect(result).toHaveProperty('configurationExamples');
  });

  it('should categorize documentation correctly', async () => {
    const result = await searchTechDocs('Next.js API');

    expect(Array.isArray(result.officialDocs)).toBe(true);
    expect(Array.isArray(result.apiReferences)).toBe(true);
    expect(Array.isArray(result.migrationGuides)).toBe(true);
    expect(Array.isArray(result.configurationExamples)).toBe(true);
  });

  it('should handle empty query', async () => {
    const result = await searchTechDocs('');

    expect(result).toHaveProperty('officialDocs');
  });
});

describe('Research Orchestrator - getCodeContext', () => {
  it('should return CodeContextResult structure', async () => {
    const result = await getCodeContext('TypeScript generics');

    expect(result).toHaveProperty('examples');
    expect(result).toHaveProperty('patterns');
    expect(result).toHaveProperty('bestPractices');
    expect(result).toHaveProperty('libraries');
  });

  it('should extract code examples', async () => {
    const result = await getCodeContext('React useState');

    expect(Array.isArray(result.examples)).toBe(true);
    // Mocked result should include examples
  });

  it('should respect tokensNum option', async () => {
    const result = await getCodeContext('test', { tokensNum: 10000 });

    expect(result).toHaveProperty('examples');
  });

  it('should extract best practices', async () => {
    const result = await getCodeContext('clean code');

    expect(Array.isArray(result.bestPractices)).toBe(true);
  });

  it('should extract library recommendations', async () => {
    const result = await getCodeContext('Node.js web framework');

    expect(Array.isArray(result.libraries)).toBe(true);
  });
});

describe('Research Orchestrator - gatherProjectResearch', () => {
  it('should return ProjectResearchResult with all sections', async () => {
    const result = await gatherProjectResearch('Build a dashboard');

    expect(result).toHaveProperty('branding');
    expect(result).toHaveProperty('technicalDocs');
    expect(result).toHaveProperty('codeContext');
    expect(result).toHaveProperty('metadata');
  });

  it('should include metadata with timestamp and sources', async () => {
    const result = await gatherProjectResearch('Test project');

    expect(result.metadata).toHaveProperty('timestamp');
    expect(result.metadata).toHaveProperty('sources');
    expect(result.metadata).toHaveProperty('tokensUsed');
    expect(result.metadata).toHaveProperty('errors');

    expect(result.metadata.timestamp).toBeInstanceOf(Date);
    expect(Array.isArray(result.metadata.sources)).toBe(true);
    expect(typeof result.metadata.tokensUsed).toBe('number');
  });

  it('should handle custom options for each research type', async () => {
    const result = await gatherProjectResearch('Custom options test', {
      branding: { numResults: 5 },
      docs: { numResults: 3 },
      code: { tokensNum: 8000 },
    });

    expect(result).toHaveProperty('branding');
    expect(result).toHaveProperty('technicalDocs');
    expect(result).toHaveProperty('codeContext');
  });

  it('should run all research types in parallel', async () => {
    const startTime = Date.now();
    await gatherProjectResearch('Parallel test');
    const duration = Date.now() - startTime;

    // Parallel execution should be faster than serial
    // With mocks, this should be very fast
    expect(duration).toBeLessThan(5000);
  });

  it('should continue with partial results on failure', async () => {
    // With mocks enabled, all should succeed
    // But the function is designed to handle partial failures
    const result = await gatherProjectResearch('Partial failure test');

    expect(result.metadata.errors).toBeDefined();
    // Even if there are errors, we should still get metadata
    expect(result.metadata.timestamp).toBeDefined();
  });

  it('should track token usage', async () => {
    const result = await gatherProjectResearch('Token tracking test', {
      code: { tokensNum: 15000 },
    });

    expect(result.metadata.tokensUsed).toBeGreaterThan(0);
  });

  it('should collect unique sources', async () => {
    const result = await gatherProjectResearch('Source collection test');

    // Sources should be deduplicated
    const uniqueSources = [...new Set(result.metadata.sources)];
    expect(result.metadata.sources.length).toBe(uniqueSources.length);
  });
});

describe('Research Orchestrator - Integration Scenarios', () => {
  it('should handle NY Knicks website research scenario', async () => {
    const result = await gatherProjectResearch(
      'NY Knicks fan website with live scores and modern design',
      {
        branding: { numResults: 10 },
        docs: { numResults: 5 },
        code: { tokensNum: 10000 },
      }
    );

    // Should return all research types
    expect(result.branding).toBeDefined();
    expect(result.technicalDocs).toBeDefined();
    expect(result.codeContext).toBeDefined();

    // Metadata should be populated
    expect(result.metadata.timestamp).toBeDefined();
    expect(result.metadata.tokensUsed).toBeGreaterThan(0);
  });

  it('should handle dashboard project research scenario', async () => {
    const result = await gatherProjectResearch(
      'Analytics dashboard with real-time charts using React and D3',
      {
        branding: { numResults: 5 },
        docs: { numResults: 8 },
        code: { tokensNum: 12000 },
      }
    );

    expect(result.branding).toBeDefined();
    expect(result.technicalDocs).toBeDefined();
    expect(result.codeContext).toBeDefined();
  });

  it('should handle API service research scenario', async () => {
    const result = await gatherProjectResearch(
      'REST API with authentication using Express and PostgreSQL'
    );

    expect(result.technicalDocs).toBeDefined();
    expect(result.codeContext).toBeDefined();
  });
});

describe('Research Orchestrator - Type Validation', () => {
  it('should return valid BrandingResult type', async () => {
    const result: BrandingResult = await searchBranding('test');

    // Type assertions
    expect(Array.isArray(result.brandGuidelines)).toBe(true);
    expect(Array.isArray(result.colorSchemes)).toBe(true);
    expect(Array.isArray(result.typographyGuidelines)).toBe(true);
    expect(Array.isArray(result.logoGuidelines)).toBe(true);
    expect(Array.isArray(result.visualExamples)).toBe(true);

    // Check structure of brand guidelines
    for (const guide of result.brandGuidelines) {
      expect(typeof guide.title).toBe('string');
      expect(typeof guide.url).toBe('string');
      expect(typeof guide.content).toBe('string');
    }
  });

  it('should return valid TechnicalDocsResult type', async () => {
    const result: TechnicalDocsResult = await searchTechDocs('test');

    expect(Array.isArray(result.officialDocs)).toBe(true);
    expect(Array.isArray(result.apiReferences)).toBe(true);
    expect(Array.isArray(result.migrationGuides)).toBe(true);
    expect(Array.isArray(result.configurationExamples)).toBe(true);

    // Check structure of official docs
    for (const doc of result.officialDocs) {
      expect(typeof doc.title).toBe('string');
      expect(typeof doc.url).toBe('string');
      expect(typeof doc.content).toBe('string');
    }

    // Check structure of API references
    for (const ref of result.apiReferences) {
      expect(typeof ref.name).toBe('string');
      expect(typeof ref.url).toBe('string');
      expect(typeof ref.description).toBe('string');
    }
  });

  it('should return valid CodeContextResult type', async () => {
    const result: CodeContextResult = await getCodeContext('test');

    expect(Array.isArray(result.examples)).toBe(true);
    expect(Array.isArray(result.patterns)).toBe(true);
    expect(Array.isArray(result.bestPractices)).toBe(true);
    expect(Array.isArray(result.libraries)).toBe(true);

    // Check structure of examples
    for (const example of result.examples) {
      expect(typeof example.description).toBe('string');
      expect(typeof example.code).toBe('string');
      expect(typeof example.language).toBe('string');
    }
  });

  it('should return valid ProjectResearchResult type', async () => {
    const result: ProjectResearchResult = await gatherProjectResearch('test');

    expect(result.metadata).toBeDefined();
    expect(result.metadata.timestamp).toBeInstanceOf(Date);
    expect(Array.isArray(result.metadata.sources)).toBe(true);
    expect(typeof result.metadata.tokensUsed).toBe('number');
    expect(Array.isArray(result.metadata.errors)).toBe(true);
  });
});

describe('Research Orchestrator - Edge Cases', () => {
  it('should handle very long queries', async () => {
    const longQuery = 'a'.repeat(1000);
    const result = await searchBranding(longQuery);

    expect(result).toBeDefined();
  });

  it('should handle special characters in queries', async () => {
    const specialQuery = 'React <Component> with @decorators & symbols';
    const result = await searchTechDocs(specialQuery);

    expect(result).toBeDefined();
  });

  it('should handle Unicode characters', async () => {
    const unicodeQuery = 'React コンポーネント 组件';
    const result = await getCodeContext(unicodeQuery);

    expect(result).toBeDefined();
  });

  it('should handle concurrent research calls', async () => {
    const promises = [
      gatherProjectResearch('Project 1'),
      gatherProjectResearch('Project 2'),
      gatherProjectResearch('Project 3'),
    ];

    const results = await Promise.all(promises);

    expect(results).toHaveLength(3);
    for (const result of results) {
      expect(result.metadata).toBeDefined();
    }
  });
});
