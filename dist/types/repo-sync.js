/**
 * Types for private repository sync functionality
 */
/**
 * All available component types
 */
export const COMPONENT_TYPES = ['agents', 'hooks', 'skills', 'scripts', 'slash-commands'];
/**
 * Mapping of component types to directories
 */
export const COMPONENT_DIRS = {
    agents: 'agents',
    hooks: 'hooks',
    skills: 'skills',
    scripts: 'scripts',
    'slash-commands': 'commands',
};
/**
 * Default repository URL
 */
export const DEFAULT_REPO_URL = 'https://github.com/bizzy211/claude-subagents';
/**
 * Default repository owner
 */
export const DEFAULT_REPO_OWNER = 'bizzy211';
/**
 * Default repository name
 */
export const DEFAULT_REPO_NAME = 'claude-subagents';
/**
 * Default branch
 */
export const DEFAULT_BRANCH = 'main';
/**
 * Default manifest paths
 */
export const MANIFEST_PATHS = {
    essential: 'manifests/essential.json',
    recommended: 'manifests/recommended.json',
    full: 'manifests/full.json',
    custom: 'manifests/custom.json',
};
//# sourceMappingURL=repo-sync.js.map