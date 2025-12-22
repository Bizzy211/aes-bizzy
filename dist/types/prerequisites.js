/**
 * Prerequisites checker types
 *
 * Types for validating required tool installations.
 */
/**
 * Default minimum version requirements
 */
export const DEFAULT_VERSION_REQUIREMENTS = {
    node: '18.0.0',
    npm: '8.0.0',
};
/**
 * Installation suggestions for missing tools
 */
export const INSTALL_SUGGESTIONS = {
    node: {
        windows: 'Install Node.js from https://nodejs.org or use: winget install OpenJS.NodeJS.LTS',
        macos: 'Install Node.js from https://nodejs.org or use: brew install node',
        linux: 'Install Node.js from https://nodejs.org or use: sudo apt install nodejs npm',
    },
    npm: {
        windows: 'npm comes with Node.js - reinstall Node.js from https://nodejs.org',
        macos: 'npm comes with Node.js - reinstall Node.js from https://nodejs.org',
        linux: 'npm comes with Node.js - run: sudo apt install npm',
    },
    git: {
        windows: 'Install Git from https://git-scm.com/download/win or use: winget install Git.Git',
        macos: 'Install Git with: xcode-select --install or brew install git',
        linux: 'Install Git with: sudo apt install git',
    },
    claudeCode: {
        windows: 'Install Claude Code with: npm install -g @anthropic-ai/claude-code',
        macos: 'Install Claude Code with: npm install -g @anthropic-ai/claude-code',
        linux: 'Install Claude Code with: npm install -g @anthropic-ai/claude-code',
    },
};
//# sourceMappingURL=prerequisites.js.map