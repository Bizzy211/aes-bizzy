/**
 * Prerequisites checker types
 *
 * Types for validating required tool installations.
 */

/**
 * Status of a single prerequisite tool
 */
export interface ToolStatus {
  /** Whether the tool is installed and accessible */
  installed: boolean;
  /** Version string if installed */
  version?: string;
  /** Error message if check failed */
  error?: string;
  /** Path to the tool if found */
  path?: string;
}

/**
 * Result of checking all prerequisites
 */
export interface PrerequisitesResult {
  /** Node.js status */
  node: ToolStatus;
  /** npm status */
  npm: ToolStatus;
  /** Git status */
  git: ToolStatus;
  /** Claude Code CLI status */
  claudeCode: ToolStatus;
  /** Whether all required prerequisites are met */
  allMet: boolean;
  /** Suggestions for missing or outdated tools */
  suggestions: string[];
}

/**
 * Minimum version requirements
 */
export interface VersionRequirements {
  node: string;
  npm?: string;
  git?: string;
  claudeCode?: string;
}

/**
 * Default minimum version requirements
 */
export const DEFAULT_VERSION_REQUIREMENTS: VersionRequirements = {
  node: '18.0.0',
  npm: '8.0.0',
};

/**
 * Installation suggestions for missing tools
 */
export const INSTALL_SUGGESTIONS: Record<string, Record<string, string>> = {
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
