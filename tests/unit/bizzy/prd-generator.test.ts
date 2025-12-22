/**
 * Unit Tests for PRD Generator Module
 *
 * Tests the PRD generation functions including project type detection,
 * requirement extraction, and template filling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  detectProjectType,
  extractProjectName,
  extractRequirements,
  extractTechStack,
  loadTemplate,
  fillTemplate,
  generatePRD,
  generatePRDContent,
  PRDGenerationError,
  type ProjectType,
  type DetectedRequirement,
  type PRDGenerationOptions,
  type GeneratedPRD,
} from '../../../src/bizzy/prd-generator.js';

// ============================================================================
// Project Type Detection Tests
// ============================================================================

describe('PRD Generator - detectProjectType', () => {
  it('should detect dashboard projects', () => {
    expect(detectProjectType('Build a dashboard for analytics')).toBe('dashboard');
    expect(detectProjectType('Create an admin panel with metrics')).toBe('dashboard');
    expect(detectProjectType('Monitoring dashboard with charts')).toBe('dashboard');
    expect(detectProjectType('Splunk visualization dashboard')).toBe('dashboard');
  });

  it('should detect API service projects', () => {
    expect(detectProjectType('Build a REST API for users')).toBe('api-service');
    expect(detectProjectType('Create a GraphQL backend')).toBe('api-service');
    expect(detectProjectType('Microservice for authentication')).toBe('api-service');
    expect(detectProjectType('Backend server with endpoints')).toBe('api-service');
  });

  it('should detect mobile app projects', () => {
    expect(detectProjectType('Build a mobile app for iOS')).toBe('mobile-app');
    expect(detectProjectType('React Native application')).toBe('mobile-app');
    expect(detectProjectType('Flutter app for Android')).toBe('mobile-app');
    expect(detectProjectType('Cross-platform mobile with Expo')).toBe('mobile-app');
  });

  it('should detect web app projects', () => {
    expect(detectProjectType('Build a React web application')).toBe('web-app');
    expect(detectProjectType('Next.js website with authentication')).toBe('web-app');
    expect(detectProjectType('Vue frontend application')).toBe('web-app');
    expect(detectProjectType('Angular web app')).toBe('web-app');
  });

  it('should detect fullstack projects', () => {
    expect(detectProjectType('Build a fullstack application')).toBe('fullstack');
    expect(detectProjectType('Full-stack project with frontend and backend')).toBe('fullstack');
    expect(detectProjectType('End-to-end web solution')).toBe('fullstack');
  });

  it('should detect CLI tool projects', () => {
    expect(detectProjectType('Build a CLI tool')).toBe('cli-tool');
    expect(detectProjectType('Command line application')).toBe('cli-tool');
    expect(detectProjectType('Terminal utility')).toBe('cli-tool');
  });

  it('should default to web-app for general web terms', () => {
    expect(detectProjectType('Build a website')).toBe('web-app');
    expect(detectProjectType('Create a web page')).toBe('web-app');
  });

  it('should return unknown for ambiguous prompts', () => {
    expect(detectProjectType('Build something cool')).toBe('unknown');
    expect(detectProjectType('Create a project')).toBe('unknown');
  });

  it('should handle case insensitivity', () => {
    expect(detectProjectType('BUILD A DASHBOARD')).toBe('dashboard');
    expect(detectProjectType('Create A MOBILE APP')).toBe('mobile-app');
  });
});

// ============================================================================
// Project Name Extraction Tests
// ============================================================================

describe('PRD Generator - extractProjectName', () => {
  it('should extract quoted project names', () => {
    expect(extractProjectName('Build a project called "My App"')).toBe('My App');
    expect(extractProjectName("Create 'Project X' for testing")).toBe('Project X');
  });

  it('should extract names after "called" or "named"', () => {
    expect(extractProjectName('Build a dashboard called Analytics Pro')).toBe('Analytics Pro');
    expect(extractProjectName('Create an app named User Tracker')).toBe('User Tracker');
  });

  it('should extract capitalized phrases', () => {
    expect(extractProjectName('Build the Awesome Dashboard Project')).toBe('Awesome Dashboard Project');
  });

  it('should generate name from key words', () => {
    const name = extractProjectName('build a dashboard for tracking analytics');
    expect(name.length).toBeGreaterThan(0);
    expect(name).not.toBe('New Project');
  });

  it('should return default for empty prompts', () => {
    expect(extractProjectName('')).toBe('New Project');
    expect(extractProjectName('   ')).toBe('New Project');
  });
});

// ============================================================================
// Requirement Extraction Tests
// ============================================================================

describe('PRD Generator - extractRequirements', () => {
  it('should extract requirements from sentences', () => {
    const prompt = 'The app must have user authentication. It should support dark mode. Nice to have analytics.';
    const requirements = extractRequirements(prompt, 'web-app');

    expect(requirements.length).toBe(3);
  });

  it('should detect critical priority', () => {
    const prompt = 'The system must handle 1000 concurrent users. Authentication is required.';
    const requirements = extractRequirements(prompt, 'web-app');

    const critical = requirements.filter((r) => r.priority === 'critical');
    expect(critical.length).toBeGreaterThan(0);
  });

  it('should detect high priority', () => {
    const prompt = 'The dashboard should display real-time data. This is an important feature.';
    const requirements = extractRequirements(prompt, 'dashboard');

    const high = requirements.filter((r) => r.priority === 'high');
    expect(high.length).toBeGreaterThan(0);
  });

  it('should detect medium priority', () => {
    const prompt = 'We would like to have export functionality. Consider adding filters.';
    const requirements = extractRequirements(prompt, 'web-app');

    const medium = requirements.filter((r) => r.priority === 'medium');
    expect(medium.length).toBeGreaterThan(0);
  });

  it('should detect low priority', () => {
    const prompt = 'Maybe add gamification. Optional: social sharing. Future enhancement: AI recommendations.';
    const requirements = extractRequirements(prompt, 'web-app');

    const low = requirements.filter((r) => r.priority === 'low');
    expect(low.length).toBeGreaterThan(0);
  });

  it('should categorize functional requirements', () => {
    const prompt = 'Users can create posts. Enable sharing functionality.';
    const requirements = extractRequirements(prompt, 'web-app');

    const functional = requirements.filter((r) => r.category === 'functional');
    expect(functional.length).toBeGreaterThan(0);
  });

  it('should categorize non-functional requirements', () => {
    const prompt = 'The system must be scalable. Performance is critical with low latency.';
    const requirements = extractRequirements(prompt, 'api-service');

    const nonFunctional = requirements.filter((r) => r.category === 'non-functional');
    expect(nonFunctional.length).toBeGreaterThan(0);
  });

  it('should categorize technical requirements', () => {
    const prompt = 'Use PostgreSQL database. Integrate with Stripe API.';
    const requirements = extractRequirements(prompt, 'fullstack');

    const technical = requirements.filter((r) => r.category === 'technical');
    expect(technical.length).toBeGreaterThan(0);
  });

  it('should categorize design requirements', () => {
    const prompt = 'The UI should be modern and responsive. Focus on mobile UX.';
    const requirements = extractRequirements(prompt, 'web-app');

    const design = requirements.filter((r) => r.category === 'design');
    expect(design.length).toBeGreaterThan(0);
  });

  it('should extract keywords from requirements', () => {
    const prompt = 'Build authentication with OAuth and social login.';
    const requirements = extractRequirements(prompt, 'web-app');

    expect(requirements[0]?.keywords.length).toBeGreaterThan(0);
  });

  it('should sort requirements by priority', () => {
    const prompt = 'Nice to have: dark mode. The system must have auth. Should support export.';
    const requirements = extractRequirements(prompt, 'web-app');

    // Critical/high should come before medium/low
    const priorityOrder = ['critical', 'high', 'medium', 'low'];
    let lastPriorityIndex = -1;

    for (const req of requirements) {
      const currentIndex = priorityOrder.indexOf(req.priority);
      expect(currentIndex).toBeGreaterThanOrEqual(lastPriorityIndex);
      lastPriorityIndex = currentIndex;
    }
  });

  it('should handle empty prompt', () => {
    const requirements = extractRequirements('', 'web-app');
    expect(requirements).toEqual([]);
  });
});

// ============================================================================
// Tech Stack Extraction Tests
// ============================================================================

describe('PRD Generator - extractTechStack', () => {
  it('should extract frontend frameworks', () => {
    const stack = extractTechStack('Build with React and Next.js');
    expect(stack).toContain('react');
    expect(stack).toContain('nextjs');
  });

  it('should extract backend technologies', () => {
    const stack = extractTechStack('Use Express and PostgreSQL');
    expect(stack).toContain('express');
    expect(stack).toContain('postgresql');
  });

  it('should extract styling libraries', () => {
    const stack = extractTechStack('Style with Tailwind CSS');
    expect(stack.some((t) => t.includes('tailwind'))).toBe(true);
  });

  it('should extract mobile technologies', () => {
    const stack = extractTechStack('Build with React Native and Expo');
    expect(stack).toContain('react-native'); // Normalized from 'react native'
    expect(stack).toContain('expo');
  });

  it('should extract languages', () => {
    const stack = extractTechStack('Use TypeScript for type safety');
    expect(stack).toContain('typescript');
  });

  it('should add libraries from research data', () => {
    const stack = extractTechStack('Build something', {
      codeContext: {
        examples: [],
        patterns: [],
        bestPractices: [],
        libraries: ['lodash', 'axios', 'zod'],
      },
    });

    expect(stack).toContain('lodash');
    expect(stack).toContain('axios');
    expect(stack).toContain('zod');
  });

  it('should deduplicate technologies', () => {
    const stack = extractTechStack('Use React with React and more React');
    const reactCount = stack.filter((t) => t === 'react').length;
    expect(reactCount).toBe(1);
  });

  it('should handle empty prompt', () => {
    const stack = extractTechStack('');
    expect(stack).toEqual([]);
  });
});

// ============================================================================
// Template Loading Tests
// ============================================================================

describe('PRD Generator - loadTemplate', () => {
  it('should return default template for unknown type', async () => {
    const template = await loadTemplate('unknown');
    expect(template).toContain('{{PROJECT_NAME}}');
    expect(template).toContain('{{PROJECT_TYPE}}');
  });

  it('should return default template when file not found', async () => {
    const template = await loadTemplate('web-app');
    expect(template).toContain('{{PROJECT_NAME}}');
  });

  it('should throw for invalid custom template path', async () => {
    await expect(loadTemplate('web-app', '/nonexistent/path.md')).rejects.toThrow(
      PRDGenerationError
    );
  });
});

// ============================================================================
// Template Filling Tests
// ============================================================================

describe('PRD Generator - fillTemplate', () => {
  const mockTemplate = `
# {{PROJECT_NAME}}
Type: {{PROJECT_TYPE}}
Prompt: {{USER_PROMPT}}
Stack: {{TECH_STACK}}
Critical: {{REQUIREMENTS_CRITICAL}}
High: {{REQUIREMENTS_HIGH}}
Medium: {{REQUIREMENTS_MEDIUM}}
Low: {{REQUIREMENTS_LOW}}
Branding: {{BRANDING_GUIDELINES}}
Docs: {{TECHNICAL_DOCS}}
Code: {{CODE_EXAMPLES}}
Generated: {{TIMESTAMP}}
  `;

  it('should replace all placeholders', () => {
    const options: PRDGenerationOptions = {
      userPrompt: 'Build a dashboard',
      projectName: 'My Dashboard',
      projectType: 'dashboard',
    };

    const requirements: DetectedRequirement[] = [
      { description: 'Must have auth', priority: 'critical', category: 'functional', keywords: [] },
      { description: 'Should have charts', priority: 'high', category: 'design', keywords: [] },
    ];

    const techStack = ['react', 'typescript'];

    const filled = fillTemplate(mockTemplate, options, requirements, techStack);

    expect(filled).toContain('My Dashboard');
    expect(filled).toContain('dashboard');
    expect(filled).toContain('Build a dashboard');
    expect(filled).toContain('react');
    expect(filled).toContain('Must have auth');
    expect(filled).toContain('Should have charts');
    expect(filled).not.toContain('{{');
    expect(filled).not.toContain('}}');
  });

  it('should format requirements by priority', () => {
    const options: PRDGenerationOptions = {
      userPrompt: 'Test',
      projectType: 'web-app',
    };

    const requirements: DetectedRequirement[] = [
      { description: 'Critical req', priority: 'critical', category: 'functional', keywords: [] },
      { description: 'High req', priority: 'high', category: 'technical', keywords: [] },
      { description: 'Medium req', priority: 'medium', category: 'design', keywords: [] },
      { description: 'Low req', priority: 'low', category: 'non-functional', keywords: [] },
    ];

    const filled = fillTemplate(mockTemplate, options, requirements, []);

    expect(filled).toContain('Critical req');
    expect(filled).toContain('High req');
    expect(filled).toContain('Medium req');
    expect(filled).toContain('Low req');
  });

  it('should handle empty requirements', () => {
    const options: PRDGenerationOptions = {
      userPrompt: 'Test',
      projectType: 'web-app',
    };

    const filled = fillTemplate(mockTemplate, options, [], []);

    expect(filled).toContain('None specified');
  });

  it('should format branding guidelines from research', () => {
    const options: PRDGenerationOptions = {
      userPrompt: 'Test',
      projectType: 'web-app',
      researchData: {
        branding: {
          brandGuidelines: [{ title: 'Style Guide', url: 'https://example.com', content: '' }],
          colorSchemes: ['#FF6600', '#003366'],
          typographyGuidelines: ['Inter', 'Roboto'],
          logoGuidelines: [],
          visualExamples: [],
        },
      },
    };

    const filled = fillTemplate(mockTemplate, options, [], []);

    expect(filled).toContain('#FF6600');
    expect(filled).toContain('Inter');
    expect(filled).toContain('Style Guide');
  });

  it('should format technical docs from research', () => {
    const options: PRDGenerationOptions = {
      userPrompt: 'Test',
      projectType: 'web-app',
      researchData: {
        technicalDocs: {
          officialDocs: [{ title: 'React Docs', url: 'https://react.dev', content: '' }],
          apiReferences: [{ name: 'useState', url: '', description: 'State hook' }],
          migrationGuides: [],
          configurationExamples: ['const config = {}'],
        },
      },
    };

    const filled = fillTemplate(mockTemplate, options, [], []);

    expect(filled).toContain('React Docs');
    expect(filled).toContain('useState');
  });

  it('should format code context from research', () => {
    const options: PRDGenerationOptions = {
      userPrompt: 'Test',
      projectType: 'web-app',
      researchData: {
        codeContext: {
          examples: [{ description: 'Example', code: 'const x = 1', language: 'ts' }],
          patterns: ['Repository pattern', 'Factory pattern'],
          bestPractices: ['Use TypeScript', 'Write tests'],
          libraries: ['axios', 'zod'],
        },
      },
    };

    const filled = fillTemplate(mockTemplate, options, [], []);

    expect(filled).toContain('1 relevant code examples');
    expect(filled).toContain('Repository pattern');
    expect(filled).toContain('Use TypeScript');
    expect(filled).toContain('axios');
  });

  it('should include timestamp', () => {
    const options: PRDGenerationOptions = {
      userPrompt: 'Test',
      projectType: 'web-app',
    };

    const filled = fillTemplate(mockTemplate, options, [], []);

    // Should have ISO timestamp format
    expect(filled).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

// ============================================================================
// PRD Generation Tests
// ============================================================================

describe('PRD Generator - generatePRDContent', () => {
  it('should generate complete PRD content', () => {
    const result = generatePRDContent({
      userPrompt: 'Build a React dashboard with authentication and charts',
    });

    expect(result.content).toBeDefined();
    expect(result.projectType).toBe('dashboard');
    expect(result.requirements.length).toBeGreaterThan(0);
    expect(result.techStack).toContain('react');
  });

  it('should respect provided project type', () => {
    const result = generatePRDContent({
      userPrompt: 'Build something',
      projectType: 'api-service',
    });

    expect(result.projectType).toBe('api-service');
    expect(result.content).toContain('api-service');
  });

  it('should respect provided project name', () => {
    const result = generatePRDContent({
      userPrompt: 'Build something',
      projectName: 'Custom Name',
    });

    expect(result.projectName).toBe('Custom Name');
    expect(result.content).toContain('Custom Name');
  });

  it('should include research data in output', () => {
    const result = generatePRDContent({
      userPrompt: 'Build a web app',
      researchData: {
        branding: {
          brandGuidelines: [],
          colorSchemes: ['#FF0000'],
          typographyGuidelines: [],
          logoGuidelines: [],
          visualExamples: [],
        },
      },
    });

    expect(result.content).toContain('#FF0000');
  });
});

describe('PRD Generator - generatePRD', () => {
  const testOutputDir = '.taskmaster/docs';

  beforeEach(async () => {
    // Ensure test directory exists
    try {
      await fs.mkdir(testOutputDir, { recursive: true });
    } catch {
      // Directory may already exist
    }
  });

  afterEach(async () => {
    // Clean up test files
    try {
      const files = await fs.readdir(testOutputDir);
      for (const file of files) {
        if (file.startsWith('prd-test-')) {
          await fs.unlink(path.join(testOutputDir, file));
        }
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should generate and save PRD file', async () => {
    const outputPath = path.join(testOutputDir, `prd-test-${Date.now()}.md`);

    const result = await generatePRD({
      userPrompt: 'Build a test application',
      outputPath,
    });

    expect(result.filePath).toBe(outputPath);
    expect(result.content.length).toBeGreaterThan(0);

    // Verify file was created
    const fileContent = await fs.readFile(outputPath, 'utf-8');
    expect(fileContent).toBe(result.content);
  });

  it('should return GeneratedPRD structure', async () => {
    const outputPath = path.join(testOutputDir, `prd-test-${Date.now()}.md`);

    const result: GeneratedPRD = await generatePRD({
      userPrompt: 'Build a React dashboard with TypeScript',
      outputPath,
    });

    expect(result).toHaveProperty('content');
    expect(result).toHaveProperty('projectType');
    expect(result).toHaveProperty('projectName');
    expect(result).toHaveProperty('requirements');
    expect(result).toHaveProperty('techStack');
    expect(result).toHaveProperty('filePath');

    expect(typeof result.content).toBe('string');
    expect(result.projectType).toBe('dashboard');
    expect(Array.isArray(result.requirements)).toBe(true);
    expect(Array.isArray(result.techStack)).toBe(true);
  });

  it('should generate unique file path if not provided', async () => {
    const result = await generatePRD({
      userPrompt: 'Build something unique',
      projectName: 'Test Project',
    });

    expect(result.filePath).toContain('prd-');
    expect(result.filePath).toContain('test-project');
    expect(result.filePath).toMatch(/\.md$/);

    // Clean up
    try {
      await fs.unlink(result.filePath);
    } catch {
      // Ignore
    }
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('PRD Generator - Error Handling', () => {
  it('should throw PRDGenerationError for invalid custom template', async () => {
    await expect(
      generatePRD({
        userPrompt: 'Test',
        templatePath: '/nonexistent/template.md',
      })
    ).rejects.toThrow(PRDGenerationError);
  });

  it('should handle very long prompts', () => {
    const longPrompt = 'Build a project. '.repeat(1000);
    const result = generatePRDContent({ userPrompt: longPrompt });

    expect(result.content.length).toBeGreaterThan(0);
    expect(result.requirements.length).toBeGreaterThan(0);
  });

  it('should handle special characters in prompt', () => {
    const prompt = 'Build a project with <special> & "characters" + symbols!';
    const result = generatePRDContent({ userPrompt: prompt });

    expect(result.content).toBeDefined();
  });

  it('should handle Unicode characters', () => {
    const prompt = 'Build a project for 日本語 users with emoji support 🚀';
    const result = generatePRDContent({ userPrompt: prompt });

    expect(result.content).toBeDefined();
  });
});

// ============================================================================
// Integration Scenarios
// ============================================================================

describe('PRD Generator - Integration Scenarios', () => {
  it('should generate NY Knicks website PRD', () => {
    const result = generatePRDContent({
      userPrompt:
        'Build a modern NY Knicks fan website with live scores, team roster, game schedules, and news. Must support mobile responsive design. Should have user authentication for fan accounts.',
    });

    expect(result.projectType).toBe('web-app');
    expect(result.requirements.length).toBeGreaterThan(0);

    // Should have critical/high priority requirements
    const highPriority = result.requirements.filter(
      (r) => r.priority === 'critical' || r.priority === 'high'
    );
    expect(highPriority.length).toBeGreaterThan(0);
  });

  it('should generate analytics dashboard PRD', () => {
    const result = generatePRDContent({
      userPrompt:
        'Create an analytics dashboard using React and D3.js. Must have real-time data updates. Should support multiple chart types including line, bar, and pie charts. Consider dark mode support.',
      researchData: {
        codeContext: {
          examples: [],
          patterns: ['Observer pattern for real-time'],
          bestPractices: ['Use memoization for performance'],
          libraries: ['d3', 'recharts', 'victory'],
        },
      },
    });

    expect(result.projectType).toBe('dashboard');
    expect(result.techStack).toContain('react');
    expect(result.content).toContain('Observer pattern');
  });

  it('should generate REST API PRD', () => {
    const result = generatePRDContent({
      userPrompt:
        'Build a REST API for user management with authentication. Use Express and PostgreSQL. Must support OAuth 2.0. Should have rate limiting and request validation.',
    });

    expect(result.projectType).toBe('api-service');
    expect(result.techStack).toContain('express');
    expect(result.techStack).toContain('postgresql');

    // Should detect security requirements
    const security = result.requirements.filter((r) => r.category === 'non-functional');
    expect(security.length).toBeGreaterThan(0);
  });
});
