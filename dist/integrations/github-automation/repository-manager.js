/**
 * GitHub Repository Manager Module
 *
 * Manages GitHub repository creation, initialization, labels, and milestones
 * for the A.E.S (Agentic EcoSystem).
 */
// ============================================================================
// Constants
// ============================================================================
const GITHUB_API_BASE = 'https://api.github.com';
/**
 * Default agent labels with colors matching A.E.S agent specializations
 */
export const DEFAULT_AGENT_LABELS = [
    { name: 'frontend', description: 'Frontend development tasks', color: '00D9FF' },
    { name: 'backend', description: 'Backend/API development tasks', color: '0075CA' },
    { name: 'security', description: 'Security-related tasks', color: 'D93F0B' },
    { name: 'devops', description: 'DevOps and infrastructure tasks', color: '0E8A16' },
    { name: 'documentation', description: 'Documentation tasks', color: 'FEF2C0' },
    { name: 'testing', description: 'Testing and QA tasks', color: 'FBCA04' },
    { name: 'ux-design', description: 'UX/UI design tasks', color: 'F9D0C4' },
    { name: 'database', description: 'Database tasks', color: '5319E7' },
    { name: 'integration', description: 'Integration tasks', color: 'C5DEF5' },
    { name: 'mobile', description: 'Mobile development tasks', color: 'BFD4F2' },
];
/**
 * Workflow labels for tracking task status
 */
export const WORKFLOW_LABELS = [
    { name: 'in-progress', description: 'Currently being worked on', color: '1D76DB' },
    { name: 'needs-review', description: 'Needs code review', color: 'E4E669' },
    { name: 'blocked', description: 'Blocked by dependencies', color: 'B60205' },
    { name: 'ready-for-pm', description: 'Ready for PM review', color: 'BFDADC' },
    { name: 'assigned-to-agent', description: 'Assigned to AI agent', color: '7057FF' },
];
/**
 * Default milestone phases
 */
export const DEFAULT_MILESTONE_PHASES = [
    {
        title: 'Foundation & Setup',
        description: 'Initial project setup, architecture decisions, and core infrastructure',
        priority: 'high',
    },
    {
        title: 'Core Development',
        description: 'Main feature implementation, API development, and core functionality',
        priority: 'high',
    },
    {
        title: 'Testing & QA',
        description: 'Comprehensive testing, bug fixes, and quality assurance',
        priority: 'medium',
    },
    {
        title: 'Deployment & Polish',
        description: 'Deployment preparation, documentation, and final polish',
        priority: 'medium',
    },
];
// ============================================================================
// Error Classes
// ============================================================================
export class GitHubAPIError extends Error {
    statusCode;
    response;
    constructor(message, statusCode, response) {
        super(message);
        this.statusCode = statusCode;
        this.response = response;
        this.name = 'GitHubAPIError';
    }
}
// ============================================================================
// Utility Functions
// ============================================================================
/**
 * Make authenticated request to GitHub API
 */
async function githubRequest(endpoint, token, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${GITHUB_API_BASE}${endpoint}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    // Check for rate limiting
    const remaining = response.headers.get('X-RateLimit-Remaining');
    if (remaining && parseInt(remaining, 10) < 10) {
        console.warn(`GitHub API rate limit low: ${remaining} requests remaining`);
    }
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new GitHubAPIError(`GitHub API error: ${response.status} ${response.statusText}`, response.status, errorBody);
    }
    // Handle 204 No Content
    if (response.status === 204) {
        return {};
    }
    return response.json();
}
/**
 * Retry a function with exponential backoff
 */
async function withRetry(fn, maxAttempts = 3, baseDelayMs = 1000) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            // Don't retry on 4xx errors (except 429 rate limit)
            if (error instanceof GitHubAPIError) {
                if (error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
                    throw error;
                }
            }
            if (attempt < maxAttempts) {
                const delay = baseDelayMs * Math.pow(2, attempt - 1);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}
/**
 * Encode content to base64
 */
function toBase64(content) {
    return Buffer.from(content, 'utf-8').toString('base64');
}
/**
 * Calculate due date for milestone phases
 */
function calculateDueDate(phaseIndex) {
    const now = new Date();
    const weeksToAdd = [2, 6, 10, 12][phaseIndex] || (phaseIndex + 1) * 3;
    return new Date(now.getTime() + weeksToAdd * 7 * 24 * 60 * 60 * 1000);
}
// ============================================================================
// Core Functions
// ============================================================================
/**
 * Create a new GitHub repository
 *
 * @param config - Repository configuration
 * @param token - GitHub personal access token
 * @returns Repository creation result
 */
export async function createRepository(config, token) {
    try {
        const endpoint = config.org
            ? `/orgs/${config.org}/repos`
            : '/user/repos';
        const response = await withRetry(() => githubRequest(endpoint, token, {
            method: 'POST',
            body: JSON.stringify({
                name: config.name,
                description: config.description || '',
                private: config.private,
                auto_init: config.autoInit || false,
            }),
        }));
        return {
            success: true,
            repoUrl: response.html_url,
            cloneUrl: response.clone_url,
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // Handle specific error cases
        if (error instanceof GitHubAPIError) {
            if (error.statusCode === 422) {
                return {
                    success: false,
                    repoUrl: '',
                    cloneUrl: '',
                    error: `Repository name '${config.name}' already exists or is invalid`,
                };
            }
            if (error.statusCode === 401) {
                return {
                    success: false,
                    repoUrl: '',
                    cloneUrl: '',
                    error: 'Invalid or expired GitHub token',
                };
            }
            if (error.statusCode === 403) {
                return {
                    success: false,
                    repoUrl: '',
                    cloneUrl: '',
                    error: 'Permission denied - check token scopes',
                };
            }
        }
        return {
            success: false,
            repoUrl: '',
            cloneUrl: '',
            error: message,
        };
    }
}
/**
 * Initialize repository with README, .gitignore, and LICENSE
 *
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param options - Initialization options
 * @param token - GitHub personal access token
 * @returns Initialization result
 */
export async function initializeRepo(owner, repo, options, token) {
    const filesCreated = [];
    let lastCommit = '';
    try {
        // Create README
        if (options.readme) {
            const readmeContent = typeof options.readme === 'string'
                ? options.readme
                : `# ${repo}\n\nGenerated by A.E.S (Agentic EcoSystem)`;
            const response = await withRetry(() => githubRequest(`/repos/${owner}/${repo}/contents/README.md`, token, {
                method: 'PUT',
                body: JSON.stringify({
                    message: 'Initial commit: Add README.md',
                    content: toBase64(readmeContent),
                }),
            }));
            filesCreated.push('README.md');
            lastCommit = response.commit.sha;
        }
        // Create .gitignore
        if (options.gitignore) {
            let gitignoreContent;
            if (typeof options.gitignore === 'string') {
                // Fetch template from GitHub
                try {
                    const template = await githubRequest(`/gitignore/templates/${options.gitignore}`, token);
                    gitignoreContent = template.source;
                }
                catch {
                    // Fallback to basic Node.js gitignore
                    gitignoreContent = `# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
build/
*.tgz

# Environment files
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
`;
                }
            }
            else {
                gitignoreContent = `node_modules/\ndist/\n.env\n`;
            }
            const response = await withRetry(() => githubRequest(`/repos/${owner}/${repo}/contents/.gitignore`, token, {
                method: 'PUT',
                body: JSON.stringify({
                    message: 'Add .gitignore',
                    content: toBase64(gitignoreContent),
                }),
            }));
            filesCreated.push('.gitignore');
            lastCommit = response.commit.sha;
        }
        // Create LICENSE
        if (options.license) {
            try {
                const licenseResponse = await githubRequest(`/licenses/${options.license.toLowerCase()}`, token);
                const response = await withRetry(() => githubRequest(`/repos/${owner}/${repo}/contents/LICENSE`, token, {
                    method: 'PUT',
                    body: JSON.stringify({
                        message: `Add ${options.license} license`,
                        content: toBase64(licenseResponse.body),
                    }),
                }));
                filesCreated.push('LICENSE');
                lastCommit = response.commit.sha;
            }
            catch {
                // License fetch failed, continue without it
                console.warn(`Could not fetch license template: ${options.license}`);
            }
        }
        return {
            success: true,
            filesCreated,
            initialCommit: lastCommit,
        };
    }
    catch (error) {
        return {
            success: false,
            filesCreated,
            initialCommit: lastCommit,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
/**
 * Create default labels for agent-based workflow
 *
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param token - GitHub personal access token
 * @returns Label creation result
 */
export async function createDefaultLabels(owner, repo, token) {
    const labelsCreated = [];
    const skipped = [];
    const allLabels = [...DEFAULT_AGENT_LABELS, ...WORKFLOW_LABELS];
    try {
        for (const label of allLabels) {
            try {
                await githubRequest(`/repos/${owner}/${repo}/labels`, token, {
                    method: 'POST',
                    body: JSON.stringify({
                        name: label.name,
                        description: label.description,
                        color: label.color,
                    }),
                });
                labelsCreated.push(label.name);
            }
            catch (error) {
                // Label already exists (422)
                if (error instanceof GitHubAPIError && error.statusCode === 422) {
                    skipped.push(label.name);
                }
                else {
                    throw error;
                }
            }
        }
        return {
            success: true,
            labelsCreated,
            skipped,
        };
    }
    catch (error) {
        return {
            success: false,
            labelsCreated,
            skipped,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
/**
 * Create milestones for project phases
 *
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param phases - Milestone phases (defaults to standard phases)
 * @param token - GitHub personal access token
 * @returns Milestone creation result
 */
export async function createMilestones(owner, repo, phases, token) {
    const milestonesCreated = [];
    try {
        for (let i = 0; i < phases.length; i++) {
            const phase = phases[i];
            if (!phase)
                continue;
            const dueDate = phase.dueDate || calculateDueDate(i);
            const response = await withRetry(() => githubRequest(`/repos/${owner}/${repo}/milestones`, token, {
                method: 'POST',
                body: JSON.stringify({
                    title: phase.title,
                    description: phase.description,
                    due_on: dueDate.toISOString(),
                    state: 'open',
                }),
            }));
            milestonesCreated.push({
                title: phase.title,
                number: response.number,
                url: response.html_url,
            });
        }
        return {
            success: true,
            milestonesCreated,
        };
    }
    catch (error) {
        return {
            success: false,
            milestonesCreated,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
/**
 * Push project files to repository
 *
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param files - Files to upload
 * @param token - GitHub personal access token
 * @returns Upload result
 */
export async function pushProjectFiles(owner, repo, files, token) {
    const filesUploaded = [];
    let lastCommit = '';
    try {
        for (const file of files) {
            const content = file.encoding === 'base64' ? file.content : toBase64(file.content);
            const message = file.message || `Add ${file.path}`;
            // Check if file exists first
            let existingSha;
            try {
                const existing = await githubRequest(`/repos/${owner}/${repo}/contents/${file.path}`, token);
                existingSha = existing.sha;
            }
            catch {
                // File doesn't exist, that's fine
            }
            const response = await withRetry(() => githubRequest(`/repos/${owner}/${repo}/contents/${file.path}`, token, {
                method: 'PUT',
                body: JSON.stringify({
                    message,
                    content,
                    ...(existingSha ? { sha: existingSha } : {}),
                }),
            }));
            filesUploaded.push(file.path);
            lastCommit = response.commit.sha;
        }
        return {
            success: true,
            filesUploaded,
            commit: lastCommit,
        };
    }
    catch (error) {
        return {
            success: false,
            filesUploaded,
            commit: lastCommit,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
/**
 * Complete repository setup with all features
 *
 * @param config - Complete repository configuration
 * @param token - GitHub personal access token
 * @returns Setup result
 */
export async function setupRepository(config, token) {
    const errors = [];
    let repoUrl = '';
    const summary = { labels: 0, milestones: 0, files: 0 };
    try {
        // Step 1: Create repository
        const repoResult = await createRepository(config, token);
        if (!repoResult.success) {
            return {
                success: false,
                repoUrl: '',
                summary,
                errors: [repoResult.error || 'Failed to create repository'],
            };
        }
        repoUrl = repoResult.repoUrl;
        // Extract owner from URL
        const urlParts = repoUrl.split('/');
        const owner = urlParts[urlParts.length - 2] || '';
        const repo = urlParts[urlParts.length - 1] || config.name;
        // Step 2: Initialize with README, gitignore, license
        const initResult = await initializeRepo(owner, repo, {
            readme: true,
            gitignore: 'Node',
            license: 'MIT',
        }, token);
        if (!initResult.success && initResult.error) {
            errors.push(`Init: ${initResult.error}`);
        }
        summary.files += initResult.filesCreated.length;
        // Step 3: Create labels if requested
        if (config.labels !== false) {
            const labelResult = await createDefaultLabels(owner, repo, token);
            if (!labelResult.success && labelResult.error) {
                errors.push(`Labels: ${labelResult.error}`);
            }
            summary.labels = labelResult.labelsCreated.length;
        }
        // Step 4: Create milestones if provided
        if (config.milestones && config.milestones.length > 0) {
            const milestoneResult = await createMilestones(owner, repo, config.milestones, token);
            if (!milestoneResult.success && milestoneResult.error) {
                errors.push(`Milestones: ${milestoneResult.error}`);
            }
            summary.milestones = milestoneResult.milestonesCreated.length;
        }
        // Step 5: Push initial files if provided
        if (config.initialFiles && config.initialFiles.length > 0) {
            const uploadResult = await pushProjectFiles(owner, repo, config.initialFiles, token);
            if (!uploadResult.success && uploadResult.error) {
                errors.push(`Files: ${uploadResult.error}`);
            }
            summary.files += uploadResult.filesUploaded.length;
        }
        // Step 6: Enable branch protection if requested
        if (config.protectMain) {
            try {
                await githubRequest(`/repos/${owner}/${repo}/branches/main/protection`, token, {
                    method: 'PUT',
                    body: JSON.stringify({
                        required_status_checks: null,
                        enforce_admins: false,
                        required_pull_request_reviews: {
                            dismiss_stale_reviews: true,
                            require_code_owner_reviews: false,
                            required_approving_review_count: 1,
                        },
                        restrictions: null,
                    }),
                });
            }
            catch (error) {
                // Branch protection might fail if main branch doesn't exist yet
                errors.push(`Branch protection: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        return {
            success: errors.length === 0,
            repoUrl,
            summary,
            errors,
        };
    }
    catch (error) {
        return {
            success: false,
            repoUrl,
            summary,
            errors: [error instanceof Error ? error.message : String(error)],
        };
    }
}
/**
 * Delete a repository (for testing/cleanup)
 *
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param token - GitHub personal access token
 * @returns Success status
 */
export async function deleteRepository(owner, repo, token) {
    try {
        await githubRequest(`/repos/${owner}/${repo}`, token, { method: 'DELETE' });
        return { success: true };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
/**
 * Check if repository exists
 *
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param token - GitHub personal access token
 * @returns True if repository exists
 */
export async function repositoryExists(owner, repo, token) {
    try {
        await githubRequest(`/repos/${owner}/${repo}`, token);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Get repository information
 *
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param token - GitHub personal access token
 * @returns Repository info or null
 */
export async function getRepository(owner, repo, token) {
    try {
        const response = await githubRequest(`/repos/${owner}/${repo}`, token);
        return {
            name: response.name,
            fullName: response.full_name,
            url: response.html_url,
            private: response.private,
            description: response.description || '',
        };
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=repository-manager.js.map