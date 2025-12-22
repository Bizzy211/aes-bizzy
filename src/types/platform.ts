/**
 * Platform detection and path types
 */

export type OperatingSystem = 'windows' | 'macos' | 'linux';
export type Architecture = 'x64' | 'arm64';

export interface Platform {
  os: OperatingSystem;
  arch: Architecture;
  claudeDir: string;
  tempDir: string;
  shell: string;
}

export interface ClaudePaths {
  claudeDir: string;
  agentsDir: string;
  hooksDir: string;
  skillsDir: string;
  settingsPath: string;
  ecosystemConfigPath: string;
  mcpConfigPath: string;
}
