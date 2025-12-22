/**
 * Project initialization command
 * Creates new projects with Claude ecosystem integration
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import chalk from 'chalk';
import { createLogger } from '../utils/logger.js';
import { executeCommand } from '../utils/shell.js';
const logger = createLogger({ context: { command: 'project' } });
/**
 * CLAUDE.md template with placeholders
 */
const CLAUDE_MD_TEMPLATE = `# {{PROJECT_NAME}}

## Project Overview
This project was created with JHC Agentic EcoSystem - Bizzy.

## Development Guidelines

### Code Style
- Follow consistent naming conventions
- Write clear, self-documenting code
- Include meaningful comments for complex logic

### Git Workflow
- Write descriptive commit messages
- Create feature branches for new work
- Keep commits focused and atomic

### Testing
- Write tests for new features
- Ensure all tests pass before committing
- Aim for good test coverage

## Commands

\`\`\`bash
# Development
npm run dev       # Start development server
npm run build     # Build for production
npm test          # Run tests

# JHC Agentic EcoSystem - Bizzy
claude            # Start Claude Code session
\`\`\`

## Project Structure

\`\`\`
{{PROJECT_NAME}}/
├── src/              # Source code
├── tests/            # Test files
├── CLAUDE.md         # This file
└── package.json      # Dependencies
\`\`\`

## Notes
- Created: {{CREATED_AT}}
- Template: {{TEMPLATE}}
`;
/**
 * Basic package.json template
 */
const PACKAGE_JSON_TEMPLATE = `{
  "name": "{{PROJECT_NAME}}",
  "version": "0.1.0",
  "description": "A new project created with JHC Agentic EcoSystem - Bizzy",
  "type": "module",
  "scripts": {
    "dev": "echo 'Add your dev script'",
    "build": "echo 'Add your build script'",
    "test": "echo 'Add your test script'"
  },
  "keywords": [],
  "author": "",
  "license": "MIT"
}
`;
/**
 * .gitignore template
 */
const GITIGNORE_TEMPLATE = `# Dependencies
node_modules/

# Build output
dist/
build/
.next/
out/

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Coverage
coverage/

# Misc
*.tmp
*.temp
`;
/**
 * README.md template
 */
const README_TEMPLATE = `# {{PROJECT_NAME}}

A new project created with JHC Agentic EcoSystem - Bizzy.

## Getting Started

\`\`\`bash
cd {{PROJECT_NAME}}
npm install
npm run dev
\`\`\`

## Development with Claude

This project is set up for Claude Code AI assistance:

\`\`\`bash
claude
\`\`\`

## License

MIT
`;
/**
 * Replace template placeholders
 */
function replaceTemplatePlaceholders(content, replacements) {
    let result = content;
    for (const [key, value] of Object.entries(replacements)) {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
}
/**
 * Check if directory is empty or doesn't exist
 */
async function isDirectoryEmpty(dirPath) {
    if (!existsSync(dirPath)) {
        return true;
    }
    const files = await fs.readdir(dirPath);
    return files.length === 0;
}
/**
 * Initialize git repository
 */
async function initGitRepo(projectPath) {
    try {
        const result = await executeCommand('git', ['init'], { cwd: projectPath });
        return result.exitCode === 0;
    }
    catch {
        return false;
    }
}
/**
 * Create GitHub repository
 */
async function createGitHubRepo(projectPath, name, isPrivate) {
    try {
        const visibility = isPrivate ? '--private' : '--public';
        const result = await executeCommand('gh', ['repo', 'create', name, visibility, '--source=.', '--push'], { cwd: projectPath });
        if (result.exitCode === 0) {
            // Extract URL from output
            const urlMatch = result.stdout.match(/https:\/\/github\.com\/[^\s]+/);
            return urlMatch ? urlMatch[0] : `https://github.com/${name}`;
        }
        return null;
    }
    catch {
        return null;
    }
}
/**
 * Initialize Task Master
 */
async function initTaskMaster(projectPath) {
    try {
        const result = await executeCommand('npx', ['task-master', 'init', '--yes'], { cwd: projectPath });
        return result.exitCode === 0;
    }
    catch {
        return false;
    }
}
/**
 * Initialize Beads
 */
async function initBeads(projectPath) {
    try {
        const result = await executeCommand('bd', ['init'], { cwd: projectPath });
        return result.exitCode === 0;
    }
    catch {
        return false;
    }
}
/**
 * Write a file, tracking whether it was created or skipped
 */
async function writeProjectFile(projectPath, relativePath, content, force) {
    const fullPath = path.join(projectPath, relativePath);
    const dir = path.dirname(fullPath);
    // Ensure directory exists
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    if (existsSync(fullPath) && !force) {
        return { path: relativePath, action: 'skipped' };
    }
    const action = existsSync(fullPath) ? 'overwritten' : 'created';
    await fs.writeFile(fullPath, content, 'utf-8');
    return { path: relativePath, action };
}
/**
 * Initialize a new project
 */
export async function initProject(name, options = {}) {
    const result = {
        success: false,
        projectPath: '',
        name,
        files: [],
        errors: [],
        warnings: [],
        nextSteps: [],
    };
    const template = options.template || 'basic';
    const projectPath = path.resolve(process.cwd(), name);
    result.projectPath = projectPath;
    try {
        // Check if directory exists and is not empty
        if (!await isDirectoryEmpty(projectPath)) {
            if (!options.force) {
                result.errors.push(`Directory "${name}" already exists and is not empty. Use --force to overwrite.`);
                return result;
            }
            logger.warn(`Directory "${name}" exists, overwriting files...`);
        }
        if (options.dryRun) {
            logger.info('[Dry Run] Would create project structure:');
            logger.info(`  Directory: ${projectPath}`);
            logger.info(`  Template: ${template}`);
            logger.info('  Files: CLAUDE.md, package.json, .gitignore, README.md, src/');
            if (!options.skipGit)
                logger.info('  Git: initialized');
            if (options.github)
                logger.info('  GitHub: repository created');
            if (options.taskmaster)
                logger.info('  Task Master: initialized');
            if (options.beads)
                logger.info('  Beads: initialized');
            result.success = true;
            return result;
        }
        // Create project directory
        logger.info(`Creating project "${name}"...`);
        mkdirSync(projectPath, { recursive: true });
        // Template replacements
        const now = new Date().toISOString();
        const replacements = {
            PROJECT_NAME: name,
            CREATED_AT: now,
            TEMPLATE: template,
        };
        // Create base files
        const filesToCreate = [
            { path: 'CLAUDE.md', content: CLAUDE_MD_TEMPLATE },
            { path: 'package.json', content: PACKAGE_JSON_TEMPLATE },
            { path: '.gitignore', content: GITIGNORE_TEMPLATE },
            { path: 'README.md', content: README_TEMPLATE },
        ];
        for (const file of filesToCreate) {
            const content = replaceTemplatePlaceholders(file.content, replacements);
            const created = await writeProjectFile(projectPath, file.path, content, options.force || false);
            result.files.push(created);
            if (created.action === 'created') {
                logger.info(`  Created ${file.path}`);
            }
            else if (created.action === 'skipped') {
                logger.warn(`  Skipped ${file.path} (already exists)`);
            }
        }
        // Create src directory
        const srcDir = path.join(projectPath, 'src');
        if (!existsSync(srcDir)) {
            mkdirSync(srcDir, { recursive: true });
            logger.info('  Created src/');
        }
        // Create tests directory
        const testsDir = path.join(projectPath, 'tests');
        if (!existsSync(testsDir)) {
            mkdirSync(testsDir, { recursive: true });
            logger.info('  Created tests/');
        }
        // Create .project-context
        const projectContext = {
            name,
            createdAt: now,
            ecosystem: true,
            template,
            taskmaster: false,
            beads: false,
        };
        // Initialize git repository
        if (!options.skipGit) {
            logger.info('Initializing git repository...');
            const gitInit = await initGitRepo(projectPath);
            if (gitInit) {
                logger.info('  Git repository initialized');
                // Create initial commit
                await executeCommand('git', ['add', '-A'], { cwd: projectPath });
                await executeCommand('git', ['commit', '-m', 'Initial commit - Created with JHC Agentic EcoSystem - Bizzy'], { cwd: projectPath });
            }
            else {
                result.warnings.push('Failed to initialize git repository');
            }
        }
        // Create GitHub repository
        if (options.github) {
            logger.info('Creating GitHub repository...');
            // Default to private repository for security
            const isPrivate = options.public !== true;
            if (!isPrivate) {
                logger.warn('Creating PUBLIC repository - code will be visible to everyone');
            }
            const repoUrl = await createGitHubRepo(projectPath, name, isPrivate);
            if (repoUrl) {
                result.githubUrl = repoUrl;
                projectContext.githubUrl = repoUrl;
                logger.success(`  GitHub repository created: ${repoUrl}`);
            }
            else {
                result.warnings.push('Failed to create GitHub repository. Make sure gh CLI is installed and authenticated.');
            }
        }
        // Initialize Task Master
        if (options.taskmaster) {
            logger.info('Initializing Task Master...');
            const tmInit = await initTaskMaster(projectPath);
            if (tmInit) {
                projectContext.taskmaster = true;
                logger.success('  Task Master initialized');
            }
            else {
                result.warnings.push('Failed to initialize Task Master. You can run "task-master init" manually.');
            }
        }
        // Initialize Beads
        if (options.beads) {
            logger.info('Initializing Beads...');
            const beadsInit = await initBeads(projectPath);
            if (beadsInit) {
                projectContext.beads = true;
                logger.success('  Beads initialized');
            }
            else {
                result.warnings.push('Failed to initialize Beads. You can run "bd init" manually.');
            }
        }
        // Write project context
        await writeProjectFile(projectPath, '.project-context', JSON.stringify(projectContext, null, 2), true);
        // Build next steps
        result.nextSteps = [
            `cd ${name}`,
            'npm install',
        ];
        if (options.taskmaster) {
            result.nextSteps.push('task-master parse-prd .taskmaster/docs/prd.md  # If you have a PRD');
        }
        if (options.beads) {
            result.nextSteps.push('bd create "First task"');
        }
        result.nextSteps.push('claude  # Start coding with Claude');
        result.success = true;
        return result;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result.errors.push(message);
        logger.error(`Failed to create project: ${message}`);
        return result;
    }
}
/**
 * Print project creation result
 */
export function printProjectResult(result) {
    console.log();
    if (result.success) {
        console.log(chalk.green.bold('✅ Project created successfully!\n'));
        console.log(`  ${chalk.bold('Location:')} ${result.projectPath}`);
        if (result.githubUrl) {
            console.log(`  ${chalk.bold('GitHub:')} ${result.githubUrl}`);
        }
        console.log();
        console.log(chalk.bold('Next steps:'));
        for (const step of result.nextSteps) {
            console.log(`  ${chalk.cyan('$')} ${step}`);
        }
    }
    else {
        console.log(chalk.red.bold('❌ Project creation failed\n'));
        for (const error of result.errors) {
            console.log(`  ${chalk.red('•')} ${error}`);
        }
    }
    if (result.warnings.length > 0) {
        console.log();
        console.log(chalk.yellow.bold('Warnings:'));
        for (const warning of result.warnings) {
            console.log(`  ${chalk.yellow('•')} ${warning}`);
        }
    }
    console.log();
}
/**
 * Run the project command
 */
export async function runProject(name, options = {}) {
    const result = await initProject(name, options);
    printProjectResult(result);
    return result;
}
//# sourceMappingURL=project.js.map