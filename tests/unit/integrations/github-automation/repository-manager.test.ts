/**
 * Unit Tests for Repository Manager Module
 *
 * Tests GitHub repository creation, initialization, labels, and milestones.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createRepository,
  initializeRepo,
  createDefaultLabels,
  createMilestones,
  pushProjectFiles,
  setupRepository,
  deleteRepository,
  repositoryExists,
  getRepository,
  DEFAULT_AGENT_LABELS,
  WORKFLOW_LABELS,
  DEFAULT_MILESTONE_PHASES,
  GitHubAPIError,
} from '../../../../src/integrations/github-automation/repository-manager.js';
import type {
  RepoConfig,
  InitOptions,
  MilestonePhase,
  FileUpload,
  CompleteRepoConfig,
} from '../../../../src/types/github-automation.js';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create mock response
function createMockResponse(data: unknown, status = 200, ok = true) {
  return {
    ok,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: vi.fn().mockResolvedValue(data),
    headers: new Map([['X-RateLimit-Remaining', '4999']]),
  };
}

describe('Repository Manager - Constants', () => {
  it('should have correct number of default agent labels', () => {
    expect(DEFAULT_AGENT_LABELS).toHaveLength(10);
  });

  it('should have correct agent label structure', () => {
    for (const label of DEFAULT_AGENT_LABELS) {
      expect(label).toHaveProperty('name');
      expect(label).toHaveProperty('description');
      expect(label).toHaveProperty('color');
      expect(label.color).toMatch(/^[0-9A-Fa-f]{6}$/);
    }
  });

  it('should have workflow labels', () => {
    expect(WORKFLOW_LABELS.length).toBeGreaterThan(0);
    expect(WORKFLOW_LABELS.map((l) => l.name)).toContain('in-progress');
    expect(WORKFLOW_LABELS.map((l) => l.name)).toContain('needs-review');
    expect(WORKFLOW_LABELS.map((l) => l.name)).toContain('blocked');
  });

  it('should have default milestone phases', () => {
    expect(DEFAULT_MILESTONE_PHASES).toHaveLength(4);
    expect(DEFAULT_MILESTONE_PHASES[0]?.title).toBe('Foundation & Setup');
    expect(DEFAULT_MILESTONE_PHASES[1]?.title).toBe('Core Development');
    expect(DEFAULT_MILESTONE_PHASES[2]?.title).toBe('Testing & QA');
    expect(DEFAULT_MILESTONE_PHASES[3]?.title).toBe('Deployment & Polish');
  });
});

describe('Repository Manager - GitHubAPIError', () => {
  it('should create error with status code', () => {
    const error = new GitHubAPIError('Not found', 404, { message: 'Repo not found' });

    expect(error.name).toBe('GitHubAPIError');
    expect(error.message).toBe('Not found');
    expect(error.statusCode).toBe(404);
    expect(error.response).toEqual({ message: 'Repo not found' });
  });
});

describe('Repository Manager - createRepository', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should create repository successfully', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        html_url: 'https://github.com/testuser/test-repo',
        clone_url: 'https://github.com/testuser/test-repo.git',
        name: 'test-repo',
      })
    );

    const config: RepoConfig = {
      name: 'test-repo',
      description: 'Test repository',
      private: true,
    };

    const result = await createRepository(config, 'fake-token');

    expect(result.success).toBe(true);
    expect(result.repoUrl).toBe('https://github.com/testuser/test-repo');
    expect(result.cloneUrl).toBe('https://github.com/testuser/test-repo.git');
  });

  it('should create organization repository', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        html_url: 'https://github.com/testorg/test-repo',
        clone_url: 'https://github.com/testorg/test-repo.git',
        name: 'test-repo',
      })
    );

    const config: RepoConfig = {
      name: 'test-repo',
      private: false,
      org: 'testorg',
    };

    const result = await createRepository(config, 'fake-token');

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.github.com/orgs/testorg/repos',
      expect.any(Object)
    );
  });

  it('should handle name conflict error', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({ message: 'name already exists' }, 422, false)
    );

    const result = await createRepository({ name: 'existing-repo', private: true }, 'fake-token');

    expect(result.success).toBe(false);
    expect(result.error).toContain('already exists');
  });

  it('should handle invalid token error', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({ message: 'Bad credentials' }, 401, false)
    );

    const result = await createRepository({ name: 'test-repo', private: true }, 'bad-token');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid or expired');
  });

  it('should handle permission denied error', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({ message: 'Forbidden' }, 403, false)
    );

    const result = await createRepository({ name: 'test-repo', private: true }, 'limited-token');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Permission denied');
  });
});

describe('Repository Manager - initializeRepo', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should create README file', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        commit: { sha: 'abc123' },
      })
    );

    const options: InitOptions = {
      readme: true,
      gitignore: false,
      license: false,
    };

    const result = await initializeRepo('testuser', 'test-repo', options, 'fake-token');

    expect(result.success).toBe(true);
    expect(result.filesCreated).toContain('README.md');
    expect(result.initialCommit).toBe('abc123');
  });

  it('should create custom README content', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({ commit: { sha: 'def456' } })
    );

    const options: InitOptions = {
      readme: '# Custom README\n\nThis is custom content.',
      gitignore: false,
      license: false,
    };

    const result = await initializeRepo('testuser', 'test-repo', options, 'fake-token');

    expect(result.success).toBe(true);
    expect(result.filesCreated).toContain('README.md');
  });

  it('should create .gitignore from template', async () => {
    // First call: get gitignore template
    mockFetch.mockResolvedValueOnce(
      createMockResponse({ source: 'node_modules/\ndist/' })
    );
    // Second call: create file
    mockFetch.mockResolvedValueOnce(
      createMockResponse({ commit: { sha: 'ghi789' } })
    );

    const options: InitOptions = {
      readme: false,
      gitignore: 'Node',
      license: false,
    };

    const result = await initializeRepo('testuser', 'test-repo', options, 'fake-token');

    expect(result.success).toBe(true);
    expect(result.filesCreated).toContain('.gitignore');
  });

  it('should create LICENSE file', async () => {
    // First call: get license template
    mockFetch.mockResolvedValueOnce(
      createMockResponse({ body: 'MIT License...' })
    );
    // Second call: create file
    mockFetch.mockResolvedValueOnce(
      createMockResponse({ commit: { sha: 'jkl012' } })
    );

    const options: InitOptions = {
      readme: false,
      gitignore: false,
      license: 'MIT',
    };

    const result = await initializeRepo('testuser', 'test-repo', options, 'fake-token');

    expect(result.success).toBe(true);
    expect(result.filesCreated).toContain('LICENSE');
  });

  it('should create all files', async () => {
    mockFetch
      // README
      .mockResolvedValueOnce(createMockResponse({ commit: { sha: 'sha1' } }))
      // Gitignore template
      .mockResolvedValueOnce(createMockResponse({ source: 'node_modules/' }))
      // Gitignore file
      .mockResolvedValueOnce(createMockResponse({ commit: { sha: 'sha2' } }))
      // License template
      .mockResolvedValueOnce(createMockResponse({ body: 'MIT...' }))
      // License file
      .mockResolvedValueOnce(createMockResponse({ commit: { sha: 'sha3' } }));

    const options: InitOptions = {
      readme: true,
      gitignore: 'Node',
      license: 'MIT',
    };

    const result = await initializeRepo('testuser', 'test-repo', options, 'fake-token');

    expect(result.success).toBe(true);
    expect(result.filesCreated).toHaveLength(3);
    expect(result.filesCreated).toContain('README.md');
    expect(result.filesCreated).toContain('.gitignore');
    expect(result.filesCreated).toContain('LICENSE');
  });
});

describe('Repository Manager - createDefaultLabels', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should create all default labels', async () => {
    const totalLabels = DEFAULT_AGENT_LABELS.length + WORKFLOW_LABELS.length;

    // Mock successful creation for all labels
    for (let i = 0; i < totalLabels; i++) {
      mockFetch.mockResolvedValueOnce(createMockResponse({ id: i + 1 }));
    }

    const result = await createDefaultLabels('testuser', 'test-repo', 'fake-token');

    expect(result.success).toBe(true);
    expect(result.labelsCreated.length).toBe(totalLabels);
    expect(result.skipped).toHaveLength(0);
  });

  it('should skip existing labels', async () => {
    // First label already exists
    mockFetch.mockResolvedValueOnce(
      createMockResponse({ message: 'Label already exists' }, 422, false)
    );

    // Rest succeed
    const totalLabels = DEFAULT_AGENT_LABELS.length + WORKFLOW_LABELS.length;
    for (let i = 1; i < totalLabels; i++) {
      mockFetch.mockResolvedValueOnce(createMockResponse({ id: i + 1 }));
    }

    const result = await createDefaultLabels('testuser', 'test-repo', 'fake-token');

    expect(result.success).toBe(true);
    expect(result.skipped).toHaveLength(1);
    expect(result.labelsCreated.length).toBe(totalLabels - 1);
  });

  it('should include frontend label', async () => {
    const totalLabels = DEFAULT_AGENT_LABELS.length + WORKFLOW_LABELS.length;
    for (let i = 0; i < totalLabels; i++) {
      mockFetch.mockResolvedValueOnce(createMockResponse({ id: i + 1 }));
    }

    const result = await createDefaultLabels('testuser', 'test-repo', 'fake-token');

    expect(result.labelsCreated).toContain('frontend');
  });
});

describe('Repository Manager - createMilestones', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should create milestones', async () => {
    const phases: MilestonePhase[] = [
      { title: 'Phase 1', description: 'Initial phase', priority: 'high' },
      { title: 'Phase 2', description: 'Second phase', priority: 'medium' },
    ];

    mockFetch
      .mockResolvedValueOnce(createMockResponse({ number: 1, html_url: 'https://github.com/.../milestone/1' }))
      .mockResolvedValueOnce(createMockResponse({ number: 2, html_url: 'https://github.com/.../milestone/2' }));

    const result = await createMilestones('testuser', 'test-repo', phases, 'fake-token');

    expect(result.success).toBe(true);
    expect(result.milestonesCreated).toHaveLength(2);
    expect(result.milestonesCreated[0]?.title).toBe('Phase 1');
    expect(result.milestonesCreated[1]?.title).toBe('Phase 2');
  });

  it('should use default phases', async () => {
    for (let i = 0; i < DEFAULT_MILESTONE_PHASES.length; i++) {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ number: i + 1, html_url: `https://github.com/.../milestone/${i + 1}` })
      );
    }

    const result = await createMilestones(
      'testuser',
      'test-repo',
      DEFAULT_MILESTONE_PHASES,
      'fake-token'
    );

    expect(result.success).toBe(true);
    expect(result.milestonesCreated).toHaveLength(4);
  });

  it('should handle empty phases array', async () => {
    const result = await createMilestones('testuser', 'test-repo', [], 'fake-token');

    expect(result.success).toBe(true);
    expect(result.milestonesCreated).toHaveLength(0);
  });
});

describe('Repository Manager - pushProjectFiles', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should push single file', async () => {
    // Check if file exists (404)
    mockFetch.mockResolvedValueOnce(
      createMockResponse({ message: 'Not Found' }, 404, false)
    );
    // Create file
    mockFetch.mockResolvedValueOnce(
      createMockResponse({ commit: { sha: 'commit123' } })
    );

    const files: FileUpload[] = [
      { path: 'package.json', content: '{"name": "test"}' },
    ];

    const result = await pushProjectFiles('testuser', 'test-repo', files, 'fake-token');

    expect(result.success).toBe(true);
    expect(result.filesUploaded).toContain('package.json');
    expect(result.commit).toBe('commit123');
  });

  it('should push multiple files', async () => {
    const files: FileUpload[] = [
      { path: 'package.json', content: '{"name": "test"}' },
      { path: 'tsconfig.json', content: '{"compilerOptions": {}}' },
      { path: 'src/index.ts', content: 'export {}' },
    ];

    for (const file of files) {
      // Check if file exists
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ message: 'Not Found' }, 404, false)
      );
      // Create file
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ commit: { sha: `sha-${file.path}` } })
      );
    }

    const result = await pushProjectFiles('testuser', 'test-repo', files, 'fake-token');

    expect(result.success).toBe(true);
    expect(result.filesUploaded).toHaveLength(3);
  });

  it('should update existing file', async () => {
    // File exists
    mockFetch.mockResolvedValueOnce(
      createMockResponse({ sha: 'existing-sha' })
    );
    // Update file
    mockFetch.mockResolvedValueOnce(
      createMockResponse({ commit: { sha: 'new-commit' } })
    );

    const files: FileUpload[] = [
      { path: 'README.md', content: 'Updated content' },
    ];

    const result = await pushProjectFiles('testuser', 'test-repo', files, 'fake-token');

    expect(result.success).toBe(true);
    expect(result.filesUploaded).toContain('README.md');
  });

  it('should use custom commit message', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({ message: 'Not Found' }, 404, false)
    );
    mockFetch.mockResolvedValueOnce(
      createMockResponse({ commit: { sha: 'custom-sha' } })
    );

    const files: FileUpload[] = [
      { path: 'config.json', content: '{}', message: 'Add configuration file' },
    ];

    const result = await pushProjectFiles('testuser', 'test-repo', files, 'fake-token');

    expect(result.success).toBe(true);
    // Verify the message was used (check call arguments)
    const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
    expect(lastCall).toBeDefined();
    if (lastCall) {
      const body = JSON.parse(lastCall[1]?.body as string);
      expect(body.message).toBe('Add configuration file');
    }
  });
});

describe('Repository Manager - setupRepository', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should setup complete repository', async () => {
    const config: CompleteRepoConfig = {
      name: 'test-project',
      description: 'A test project',
      private: true,
      labels: true,
      milestones: DEFAULT_MILESTONE_PHASES,
    };

    // Create repo
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        html_url: 'https://github.com/testuser/test-project',
        clone_url: 'https://github.com/testuser/test-project.git',
        name: 'test-project',
      })
    );

    // Initialize: README
    mockFetch.mockResolvedValueOnce(createMockResponse({ commit: { sha: 'init1' } }));
    // Gitignore template
    mockFetch.mockResolvedValueOnce(createMockResponse({ source: 'node_modules/' }));
    // Gitignore file
    mockFetch.mockResolvedValueOnce(createMockResponse({ commit: { sha: 'init2' } }));
    // License template
    mockFetch.mockResolvedValueOnce(createMockResponse({ body: 'MIT...' }));
    // License file
    mockFetch.mockResolvedValueOnce(createMockResponse({ commit: { sha: 'init3' } }));

    // Labels
    const totalLabels = DEFAULT_AGENT_LABELS.length + WORKFLOW_LABELS.length;
    for (let i = 0; i < totalLabels; i++) {
      mockFetch.mockResolvedValueOnce(createMockResponse({ id: i + 1 }));
    }

    // Milestones
    for (let i = 0; i < DEFAULT_MILESTONE_PHASES.length; i++) {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ number: i + 1, html_url: `https://github.com/.../milestone/${i + 1}` })
      );
    }

    const result = await setupRepository(config, 'fake-token');

    expect(result.success).toBe(true);
    expect(result.repoUrl).toBe('https://github.com/testuser/test-project');
    expect(result.summary.labels).toBe(totalLabels);
    expect(result.summary.milestones).toBe(4);
    expect(result.summary.files).toBe(3); // README, .gitignore, LICENSE
  });

  it('should handle repo creation failure', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({ message: 'Forbidden' }, 403, false)
    );

    const config: CompleteRepoConfig = {
      name: 'forbidden-repo',
      private: true,
    };

    const result = await setupRepository(config, 'fake-token');

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should continue with partial failures', async () => {
    const config: CompleteRepoConfig = {
      name: 'test-partial',
      private: true,
      labels: true,
    };

    // Create repo succeeds
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        html_url: 'https://github.com/testuser/test-partial',
        clone_url: 'https://github.com/testuser/test-partial.git',
        name: 'test-partial',
      })
    );

    // Init fails
    mockFetch.mockResolvedValueOnce(
      createMockResponse({ message: 'Error' }, 500, false)
    );

    // Labels succeed
    const totalLabels = DEFAULT_AGENT_LABELS.length + WORKFLOW_LABELS.length;
    for (let i = 0; i < totalLabels; i++) {
      mockFetch.mockResolvedValueOnce(createMockResponse({ id: i + 1 }));
    }

    const result = await setupRepository(config, 'fake-token');

    // Should have repo URL even with partial failures
    expect(result.repoUrl).toBe('https://github.com/testuser/test-partial');
    // Labels should have been created (most or all)
    expect(result.summary.labels).toBeGreaterThan(0);
  });
});

describe('Repository Manager - deleteRepository', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should delete repository', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: vi.fn().mockResolvedValue({}),
      headers: new Map(),
    });

    const result = await deleteRepository('testuser', 'test-repo', 'fake-token');

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/testuser/test-repo',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('should handle deletion failure', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({ message: 'Not Found' }, 404, false)
    );

    const result = await deleteRepository('testuser', 'nonexistent', 'fake-token');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('Repository Manager - repositoryExists', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should return true for existing repo', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({ name: 'test-repo' })
    );

    const exists = await repositoryExists('testuser', 'test-repo', 'fake-token');

    expect(exists).toBe(true);
  });

  it('should return false for non-existing repo', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({ message: 'Not Found' }, 404, false)
    );

    const exists = await repositoryExists('testuser', 'nonexistent', 'fake-token');

    expect(exists).toBe(false);
  });
});

describe('Repository Manager - getRepository', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should return repository info', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        name: 'test-repo',
        full_name: 'testuser/test-repo',
        html_url: 'https://github.com/testuser/test-repo',
        private: true,
        description: 'A test repository',
      })
    );

    const repo = await getRepository('testuser', 'test-repo', 'fake-token');

    expect(repo).not.toBeNull();
    expect(repo?.name).toBe('test-repo');
    expect(repo?.fullName).toBe('testuser/test-repo');
    expect(repo?.private).toBe(true);
    expect(repo?.description).toBe('A test repository');
  });

  it('should return null for non-existing repo', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse({ message: 'Not Found' }, 404, false)
    );

    const repo = await getRepository('testuser', 'nonexistent', 'fake-token');

    expect(repo).toBeNull();
  });
});
