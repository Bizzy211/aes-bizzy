/**
 * Tests for UI result display utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatResult,
  displayResult,
  showSummary,
  displayTable,
  displayKeyValue,
  displayList,
  displayError,
  displaySuccess,
  displayWarning,
  displayInfo,
  type ResultItem,
  type TableColumn,
} from '../../src/ui/results.js';

describe('UI Results', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('formatResult', () => {
    it('should format success result', () => {
      const result: ResultItem = {
        label: 'Test passed',
        status: 'success',
      };
      const output = formatResult(result);
      expect(output).toContain('Test passed');
    });

    it('should format error result', () => {
      const result: ResultItem = {
        label: 'Test failed',
        status: 'error',
        message: 'Assertion error',
      };
      const output = formatResult(result);
      expect(output).toContain('Test failed');
      expect(output).toContain('Assertion error');
    });

    it('should format result with details', () => {
      const result: ResultItem = {
        label: 'Config check',
        status: 'warning',
        details: ['Missing key', 'Invalid value'],
      };
      const output = formatResult(result);
      expect(output).toContain('Config check');
      expect(output).toContain('Missing key');
      expect(output).toContain('Invalid value');
    });

    it('should format skipped result', () => {
      const result: ResultItem = {
        label: 'Optional test',
        status: 'skipped',
      };
      const output = formatResult(result);
      expect(output).toContain('Optional test');
    });

    it('should format info result', () => {
      const result: ResultItem = {
        label: 'Information',
        status: 'info',
        message: 'For your information',
      };
      const output = formatResult(result);
      expect(output).toContain('Information');
      expect(output).toContain('For your information');
    });
  });

  describe('displayResult', () => {
    it('should log formatted result', () => {
      const result: ResultItem = {
        label: 'Test',
        status: 'success',
      };
      displayResult(result);
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('showSummary', () => {
    it('should display summary of results', () => {
      const results: ResultItem[] = [
        { label: 'Test 1', status: 'success' },
        { label: 'Test 2', status: 'success' },
        { label: 'Test 3', status: 'error' },
        { label: 'Test 4', status: 'warning' },
        { label: 'Test 5', status: 'skipped' },
      ];

      showSummary(results);

      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('Summary');
      expect(output).toContain('2 succeeded');
      expect(output).toContain('1 failed');
      expect(output).toContain('1 warnings');
      expect(output).toContain('1 skipped');
    });

    it('should handle empty results', () => {
      showSummary([]);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle all success', () => {
      const results: ResultItem[] = [
        { label: 'Test 1', status: 'success' },
        { label: 'Test 2', status: 'success' },
      ];

      showSummary(results);

      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('2 succeeded');
      expect(output).not.toContain('failed');
    });
  });

  describe('displayTable', () => {
    const columns: TableColumn[] = [
      { key: 'name', header: 'Name' },
      { key: 'value', header: 'Value', align: 'right' },
    ];

    it('should display data in table format', () => {
      const data = [
        { name: 'Item 1', value: 100 },
        { name: 'Item 2', value: 200 },
      ];

      displayTable(data, columns);

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('Name');
      expect(output).toContain('Value');
      expect(output).toContain('Item 1');
      expect(output).toContain('Item 2');
    });

    it('should handle empty data', () => {
      displayTable([], columns);

      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('No data to display');
    });

    it('should handle center alignment', () => {
      const columnsWithCenter: TableColumn[] = [
        { key: 'name', header: 'Name', align: 'center' },
      ];
      const data = [{ name: 'Test' }];

      displayTable(data, columnsWithCenter);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should respect custom width', () => {
      const columnsWithWidth: TableColumn[] = [
        { key: 'name', header: 'Name', width: 20 },
      ];
      const data = [{ name: 'Test' }];

      displayTable(data, columnsWithWidth);
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('displayKeyValue', () => {
    it('should display key-value pairs', () => {
      const data = {
        Name: 'Test Project',
        Version: '1.0.0',
        Active: true,
      };

      displayKeyValue(data);

      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('Name');
      expect(output).toContain('Test Project');
      expect(output).toContain('Version');
      expect(output).toContain('1.0.0');
    });
  });

  describe('displayList', () => {
    it('should display list of items', () => {
      const items = ['First item', 'Second item', 'Third item'];

      displayList(items);

      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('First item');
      expect(output).toContain('Second item');
      expect(output).toContain('Third item');
    });

    it('should display list with title', () => {
      const items = ['Item 1', 'Item 2'];

      displayList(items, 'My List');

      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('My List');
      expect(output).toContain('Item 1');
    });
  });

  describe('displayError', () => {
    it('should display error message', () => {
      displayError('Something went wrong');

      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('Error');
      expect(output).toContain('Something went wrong');
    });

    it('should display error with details', () => {
      displayError('Failed', ['Line 1', 'Line 2']);

      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('Failed');
      expect(output).toContain('Line 1');
      expect(output).toContain('Line 2');
    });
  });

  describe('displaySuccess', () => {
    it('should display success message', () => {
      displaySuccess('Operation completed');

      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('Operation completed');
    });
  });

  describe('displayWarning', () => {
    it('should display warning message', () => {
      displayWarning('Be careful');

      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('Be careful');
    });
  });

  describe('displayInfo', () => {
    it('should display info message', () => {
      displayInfo('For your information');

      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('For your information');
    });
  });
});
