/**
 * Beads installation utilities
 *
 * Supports multiple installation methods:
 * - Windows: binary (preferred - winget doesn't have beads, npm has file locking issues)
 * - macOS: brew (preferred), npm, cargo
 * - Linux: cargo (preferred), npm, binary download
 */

import type {
  InstallMethod,
  InstallResult,
  InstallMethodConfig,
  BeadsConfig,
  InstallerOptions,
} from '../types/installer.js';
import { getPlatform, isWindows, isMacOS } from '../utils/platform.js';
import {
  executeCommand,
  execCommandWithSpinner,
  checkCommandExists,
} from '../utils/shell.js';

// GitHub API for fetching latest release info
const BEADS_GITHUB_API = 'https://api.github.com/repos/steveyegge/beads/releases/latest';

/**
 * Get available installation methods for the current platform
 */
export async function getAvailableMethods(): Promise<InstallMethodConfig[]> {
  const methods: InstallMethodConfig[] = [];

  if (isWindows()) {
    // Windows: binary (preferred - winget doesn't have beads, npm has file locking issues)
    // Binary download is always available as we use PowerShell
    methods.push({
      method: 'binary',
      command: 'powershell.exe',
      args: [], // Will be determined during installation
      available: true,
      preferred: true,
    });

    // npm as fallback (has file locking issues on Windows during postinstall)
    const hasNpm = await checkCommandExists('npm');
    methods.push({
      method: 'npm',
      command: 'npm',
      args: ['install', '-g', '@beads/bd'],
      available: hasNpm,
      preferred: false,
    });

    const hasCargo = await checkCommandExists('cargo');
    methods.push({
      method: 'cargo',
      command: 'cargo',
      args: ['install', 'beads-cli'],
      available: hasCargo,
      preferred: false,
    });
  } else if (isMacOS()) {
    // macOS: brew > npm > cargo
    const hasBrew = await checkCommandExists('brew');
    methods.push({
      method: 'brew',
      command: 'brew',
      args: ['install', 'beads'],
      available: hasBrew,
      preferred: true,
    });

    const hasNpm = await checkCommandExists('npm');
    methods.push({
      method: 'npm',
      command: 'npm',
      args: ['install', '-g', '@beads/bd'],
      available: hasNpm,
      preferred: false,
    });

    const hasCargo = await checkCommandExists('cargo');
    methods.push({
      method: 'cargo',
      command: 'cargo',
      args: ['install', 'beads-cli'],
      available: hasCargo,
      preferred: false,
    });
  } else {
    // Linux: cargo > npm > binary
    const hasCargo = await checkCommandExists('cargo');
    methods.push({
      method: 'cargo',
      command: 'cargo',
      args: ['install', 'beads-cli'],
      available: hasCargo,
      preferred: true,
    });

    const hasNpm = await checkCommandExists('npm');
    methods.push({
      method: 'npm',
      command: 'npm',
      args: ['install', '-g', '@beads/bd'],
      available: hasNpm,
      preferred: false,
    });

    // Binary download is always available as fallback
    methods.push({
      method: 'binary',
      command: 'curl',
      args: [], // Will be determined during installation
      available: true,
      preferred: false,
    });
  }

  return methods;
}

/**
 * Get the preferred available installation method
 */
export async function getPreferredMethod(): Promise<InstallMethodConfig | null> {
  const methods = await getAvailableMethods();

  // First try to find preferred and available
  const preferred = methods.find((m) => m.preferred && m.available);
  if (preferred) return preferred;

  // Otherwise return first available
  return methods.find((m) => m.available) ?? null;
}

/**
 * Install Beads using a specific method
 */
export async function installBeadsWithMethod(
  method: InstallMethodConfig,
  options: InstallerOptions = {}
): Promise<InstallResult> {
  const { silent = false } = options;

  try {
    let result;

    if (method.method === 'binary') {
      // Special handling for binary download
      result = await installBeadsBinary(silent);
    } else {
      // Standard package manager installation
      if (silent) {
        result = await executeCommand(method.command, method.args, { silent: true });
      } else {
        result = await execCommandWithSpinner(method.command, method.args, {
          spinnerText: `Installing Beads via ${method.method}...`,
          successText: `Beads installed via ${method.method}`,
          failText: `Failed to install Beads via ${method.method}`,
        });
      }
    }

    if (result.exitCode !== 0) {
      return {
        success: false,
        method: method.method,
        error: result.stderr || `Installation failed with exit code ${result.exitCode}`,
      };
    }

    // Verify installation
    const version = await getBeadsVersion();
    if (!version) {
      return {
        success: false,
        method: method.method,
        error: 'Installation completed but bd command not found',
      };
    }

    return {
      success: true,
      method: method.method,
      version,
    };
  } catch (error) {
    return {
      success: false,
      method: method.method,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Fetch the latest Beads release info from GitHub
 */
interface GitHubAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name: string;
  assets: GitHubAsset[];
}

async function fetchLatestReleaseInfo(): Promise<GitHubRelease | null> {
  try {
    const result = await executeCommand('curl', ['-sL', BEADS_GITHUB_API], { silent: true });
    if (result.exitCode === 0 && result.stdout) {
      return JSON.parse(result.stdout) as GitHubRelease;
    }
  } catch {
    // Fallback to known version if API fails
  }
  return null;
}

/**
 * Install Beads via binary download (Windows preferred, Linux fallback)
 */
async function installBeadsBinary(silent: boolean): Promise<{ exitCode: number; stderr: string; stdout: string }> {
  const platform = getPlatform();

  if (isWindows()) {
    return installBeadsBinaryWindows(silent);
  }

  // Linux/macOS binary installation
  const arch = platform.arch === 'arm64' ? 'aarch64' : 'x86_64';
  const os = platform.os === 'linux' ? 'unknown-linux-gnu' : 'apple-darwin';

  const downloadUrl = `https://github.com/steveyegge/beads/releases/latest/download/beads-${arch}-${os}.tar.gz`;
  const installDir = '/usr/local/bin';

  // Download and extract
  const script = `
    curl -sL "${downloadUrl}" -o /tmp/beads.tar.gz && \
    tar -xzf /tmp/beads.tar.gz -C /tmp && \
    sudo mv /tmp/bd "${installDir}/bd" && \
    sudo chmod +x "${installDir}/bd" && \
    rm /tmp/beads.tar.gz
  `;

  if (silent) {
    return executeCommand('bash', ['-c', script], { silent: true });
  }

  return execCommandWithSpinner('bash', ['-c', script], {
    spinnerText: 'Downloading and installing Beads binary...',
    successText: 'Beads binary installed',
    failText: 'Failed to install Beads binary',
  });
}

/**
 * Install Beads via binary download on Windows using PowerShell
 */
async function installBeadsBinaryWindows(silent: boolean): Promise<{ exitCode: number; stderr: string; stdout: string }> {
  // First, try to get the latest release info from GitHub
  let downloadUrl = '';
  const release = await fetchLatestReleaseInfo();

  if (release) {
    // Find the Windows amd64 zip asset
    const windowsAsset = release.assets.find(a =>
      a.name.includes('windows') && a.name.includes('amd64') && a.name.endsWith('.zip')
    );
    if (windowsAsset) {
      downloadUrl = windowsAsset.browser_download_url;
    }
  }

  // Fallback to hardcoded URL if API fails
  if (!downloadUrl) {
    downloadUrl = 'https://github.com/steveyegge/beads/releases/download/v0.34.0/beads_0.34.0_windows_amd64.zip';
  }

  // PowerShell script to download and install Beads
  const psScript = `
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$url = '${downloadUrl}'
$zipPath = "$env:TEMP\\beads.zip"
$extractPath = "$env:TEMP\\beads_extract"
$targetDir = "$env:LOCALAPPDATA\\Programs\\beads"

Write-Host 'Downloading Beads binary...'
Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing

Write-Host 'Extracting...'
if (Test-Path $extractPath) { Remove-Item -Recurse -Force $extractPath }
Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force

Write-Host "Installing to $targetDir"
if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Path $targetDir -Force | Out-Null }
Get-ChildItem -Path $extractPath -Recurse -Filter '*.exe' | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $targetDir -Force
}

Write-Host 'Cleaning up...'
Remove-Item $zipPath -Force
Remove-Item $extractPath -Recurse -Force

# Add to PATH if not already there
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if ($userPath -notlike "*$targetDir*") {
    [Environment]::SetEnvironmentVariable('Path', "$userPath;$targetDir", 'User')
    Write-Host "Added $targetDir to user PATH"
}

Write-Host "Done! Beads installed to: $targetDir"
& "$targetDir\\bd.exe" --version
`;

  if (silent) {
    return executeCommand('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-Command', psScript], { silent: true });
  }

  return execCommandWithSpinner('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-Command', psScript], {
    spinnerText: 'Downloading and installing Beads binary...',
    successText: 'Beads binary installed',
    failText: 'Failed to install Beads binary',
  });
}

/**
 * Install Beads with automatic method selection and fallback
 */
export async function installBeads(options: InstallerOptions = {}): Promise<InstallResult> {
  const { preferredMethod, silent = false } = options;

  // Get available methods
  const methods = await getAvailableMethods();
  const availableMethods = methods.filter((m) => m.available);

  if (availableMethods.length === 0) {
    return {
      success: false,
      method: 'npm', // Default fallback
      error: 'No installation methods available. Please install npm, cargo, or your platform package manager.',
    };
  }

  // If a preferred method is specified, try it first
  if (preferredMethod) {
    const method = availableMethods.find((m) => m.method === preferredMethod);
    if (method) {
      const result = await installBeadsWithMethod(method, { silent });
      if (result.success) return result;
    }
  }

  // Try methods in order of preference
  const sortedMethods = [...availableMethods].sort((a, b) => {
    if (a.preferred && !b.preferred) return -1;
    if (!a.preferred && b.preferred) return 1;
    return 0;
  });

  for (const method of sortedMethods) {
    const result = await installBeadsWithMethod(method, { silent });
    if (result.success) return result;

    if (!silent) {
      console.log(`Failed to install via ${method.method}, trying next method...`);
    }
  }

  return {
    success: false,
    method: sortedMethods[0]?.method ?? 'npm',
    error: 'All installation methods failed',
  };
}

/**
 * Get the installed Beads version
 */
export async function getBeadsVersion(): Promise<string | null> {
  // First try the standard 'bd' command in PATH
  let result = await executeCommand('bd', ['version'], { silent: true });

  // On Windows, also check the binary installation path
  if (result.exitCode !== 0 && isWindows()) {
    const beadsPath = `${process.env['LOCALAPPDATA']}\\Programs\\beads\\bd.exe`;
    result = await executeCommand(beadsPath, ['--version'], { silent: true });
  }

  if (result.exitCode === 0 && result.stdout) {
    // Parse version from output (e.g., "bd version 0.34.0" or just "0.34.0")
    const match = result.stdout.match(/(\d+\.\d+\.\d+)/);
    return match?.[1] ?? result.stdout.trim();
  }

  return null;
}

/**
 * Check if Beads is installed
 */
export async function isBeadsInstalled(): Promise<boolean> {
  // Check if 'bd' is in PATH
  const inPath = await checkCommandExists('bd');
  if (inPath) return true;

  // On Windows, also check the binary installation path
  if (isWindows()) {
    const beadsPath = `${process.env['LOCALAPPDATA']}\\Programs\\beads\\bd.exe`;
    const result = await executeCommand(beadsPath, ['--version'], { silent: true });
    return result.exitCode === 0;
  }

  return false;
}

/**
 * Install Beads MCP server for MCP-only environments
 */
export async function installBeadsMCP(silent = false): Promise<InstallResult> {
  const hasNpm = await checkCommandExists('npm');

  if (!hasNpm) {
    return {
      success: false,
      method: 'npm',
      error: 'npm is required to install beads-mcp',
    };
  }

  try {
    let result;

    if (silent) {
      result = await executeCommand('npm', ['install', '-g', 'beads-mcp'], { silent: true });
    } else {
      result = await execCommandWithSpinner('npm', ['install', '-g', 'beads-mcp'], {
        spinnerText: 'Installing Beads MCP server...',
        successText: 'Beads MCP server installed',
        failText: 'Failed to install Beads MCP server',
      });
    }

    if (result.exitCode !== 0) {
      return {
        success: false,
        method: 'npm',
        error: result.stderr || 'Installation failed',
      };
    }

    return {
      success: true,
      method: 'npm',
    };
  } catch (error) {
    return {
      success: false,
      method: 'npm',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get Beads configuration for ecosystem.json
 */
export async function getBeadsConfig(): Promise<BeadsConfig> {
  const installed = await isBeadsInstalled();

  if (!installed) {
    return { installed: false };
  }

  const version = await getBeadsVersion();

  // Try to detect installation method
  let method: InstallMethod | undefined;

  if (isWindows()) {
    // Check if installed via binary download (our preferred method)
    const beadsPath = `${process.env['LOCALAPPDATA']}\\Programs\\beads\\bd.exe`;
    const binaryResult = await executeCommand(beadsPath, ['--version'], { silent: true });
    if (binaryResult.exitCode === 0) {
      method = 'binary';
    }
  } else if (isMacOS()) {
    // Check if installed via brew
    const brewResult = await executeCommand('brew', ['list', 'beads'], { silent: true });
    if (brewResult.exitCode === 0) {
      method = 'brew';
    }
  }

  // Check npm global packages
  if (!method) {
    const npmResult = await executeCommand('npm', ['list', '-g', '@beads/bd'], { silent: true });
    if (npmResult.exitCode === 0 && npmResult.stdout.includes('@beads/bd')) {
      method = 'npm';
    }
  }

  // Check cargo
  if (!method) {
    const cargoResult = await executeCommand('cargo', ['install', '--list'], { silent: true });
    if (cargoResult.exitCode === 0 && cargoResult.stdout.includes('beads-cli')) {
      method = 'cargo';
    }
  }

  return {
    installed: true,
    method,
    version: version ?? undefined,
  };
}
