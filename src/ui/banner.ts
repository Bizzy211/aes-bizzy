/**
 * Welcome banner with gradient styling
 */

import gradient from 'gradient-string';
import chalk from 'chalk';

/**
 * ASCII art logo for A.E.S - Bizzy (Agentic Ecosystem)
 */
const LOGO = `
     _    _____ ____       ____  _
    / \\  | ____/ ___|     | __ )(_)_________ _   _
   / _ \\ |  _| \\___ \\ ___ |  _ \\| |_  /_  / | | | |
  / ___ \\| |___ ___) |___|| |_) | |/ / / /| |_| |
 /_/   \\_\\_____|____/     |____/|_/___/___|\\__, |
                                           |___/
`;

/**
 * Create a gradient for the logo
 */
const logoGradient = gradient(['#9333ea', '#3b82f6', '#06b6d4']);

/**
 * Show the welcome banner
 */
export function showWelcomeBanner(version?: string): void {
  console.log();
  console.log(logoGradient(LOGO));
  console.log();
  console.log(
    chalk.bold.cyan('  A.E.S - Bizzy') +
      (version ? chalk.dim(` v${version}`) : '')
  );
  console.log(chalk.dim('  Agentic Ecosystem - Bootstrap your Claude Code AI environment'));
  console.log();
}

/**
 * Show a section header
 */
export function showSectionHeader(title: string): void {
  const line = '─'.repeat(50);
  console.log();
  console.log(chalk.dim(line));
  console.log(chalk.bold.cyan(`  ${title}`));
  console.log(chalk.dim(line));
  console.log();
}

/**
 * Show a step header
 */
export function showStep(step: number, total: number, title: string): void {
  const stepText = chalk.dim(`[${step}/${total}]`);
  console.log(`${stepText} ${chalk.bold(title)}`);
}

/**
 * Show a compact header
 */
export function showHeader(title: string): void {
  console.log();
  console.log(chalk.bold.cyan(`> ${title}`));
  console.log();
}

/**
 * Show completion message
 */
export function showCompletion(message: string): void {
  console.log();
  console.log(chalk.green.bold('  Setup Complete!'));
  console.log(chalk.dim(`  ${message}`));
  console.log();
}

/**
 * Show a divider line
 */
export function showDivider(): void {
  console.log(chalk.dim('─'.repeat(50)));
}
