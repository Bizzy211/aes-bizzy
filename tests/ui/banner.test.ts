/**
 * Tests for UI banner utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  showWelcomeBanner,
  showSectionHeader,
  showStep,
  showHeader,
  showCompletion,
  showDivider,
} from '../../src/ui/banner.js';

describe('UI Banner', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('showWelcomeBanner', () => {
    it('should display welcome banner without version', () => {
      showWelcomeBanner();
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('A.E.S - Bizzy');
    });

    it('should display welcome banner with version', () => {
      showWelcomeBanner('1.0.0');
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('A.E.S - Bizzy');
      expect(output).toContain('v1.0.0');
    });
  });

  describe('showSectionHeader', () => {
    it('should display section header with title', () => {
      showSectionHeader('Test Section');
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('Test Section');
    });
  });

  describe('showStep', () => {
    it('should display step with progress', () => {
      showStep(1, 5, 'First Step');
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('[1/5]');
      expect(output).toContain('First Step');
    });
  });

  describe('showHeader', () => {
    it('should display header with title', () => {
      showHeader('Header Title');
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('Header Title');
    });
  });

  describe('showCompletion', () => {
    it('should display completion message', () => {
      showCompletion('Setup is complete!');
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('Setup Complete!');
      expect(output).toContain('Setup is complete!');
    });
  });

  describe('showDivider', () => {
    it('should display divider line', () => {
      showDivider();
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('─');
    });
  });
});
