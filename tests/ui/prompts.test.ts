/**
 * Tests for UI prompts utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as clackPrompts from '@clack/prompts';
import {
  SYMBOLS,
  confirmAction,
  selectOne,
  selectMultiple,
  inputText,
  inputSecret,
  showNote,
  showIntro,
  showOutro,
  showCancel,
  isCancelled,
} from '../../src/ui/prompts.js';

vi.mock('@clack/prompts', () => ({
  confirm: vi.fn(),
  select: vi.fn(),
  multiselect: vi.fn(),
  text: vi.fn(),
  password: vi.fn(),
  note: vi.fn(),
  intro: vi.fn(),
  outro: vi.fn(),
  cancel: vi.fn(),
  isCancel: vi.fn(),
}));

describe('UI Prompts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('SYMBOLS', () => {
    it('should have all required symbols', () => {
      expect(SYMBOLS.success).toBeDefined();
      expect(SYMBOLS.error).toBeDefined();
      expect(SYMBOLS.warning).toBeDefined();
      expect(SYMBOLS.info).toBeDefined();
      expect(SYMBOLS.pending).toBeDefined();
      expect(SYMBOLS.rocket).toBeDefined();
      expect(SYMBOLS.check).toBeDefined();
      expect(SYMBOLS.cross).toBeDefined();
      expect(SYMBOLS.arrow).toBeDefined();
      expect(SYMBOLS.dot).toBeDefined();
    });
  });

  describe('confirmAction', () => {
    it('should return true when confirmed', async () => {
      vi.mocked(clackPrompts.confirm).mockResolvedValue(true);
      vi.mocked(clackPrompts.isCancel).mockReturnValue(false);

      const result = await confirmAction('Confirm?');
      expect(result).toBe(true);
      expect(clackPrompts.confirm).toHaveBeenCalledWith({
        message: 'Confirm?',
        initialValue: false,
      });
    });

    it('should return false when declined', async () => {
      vi.mocked(clackPrompts.confirm).mockResolvedValue(false);
      vi.mocked(clackPrompts.isCancel).mockReturnValue(false);

      const result = await confirmAction('Confirm?');
      expect(result).toBe(false);
    });

    it('should return undefined when cancelled', async () => {
      vi.mocked(clackPrompts.confirm).mockResolvedValue(Symbol('cancel'));
      vi.mocked(clackPrompts.isCancel).mockReturnValue(true);

      const result = await confirmAction('Confirm?');
      expect(result).toBeUndefined();
    });

    it('should use initial value when provided', async () => {
      vi.mocked(clackPrompts.confirm).mockResolvedValue(true);
      vi.mocked(clackPrompts.isCancel).mockReturnValue(false);

      await confirmAction('Confirm?', true);
      expect(clackPrompts.confirm).toHaveBeenCalledWith({
        message: 'Confirm?',
        initialValue: true,
      });
    });
  });

  describe('selectOne', () => {
    const choices = [
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B', hint: 'This is B' },
    ];

    it('should return selected value', async () => {
      vi.mocked(clackPrompts.select).mockResolvedValue('a');
      vi.mocked(clackPrompts.isCancel).mockReturnValue(false);

      const result = await selectOne('Choose:', choices);
      expect(result).toBe('a');
    });

    it('should return undefined when cancelled', async () => {
      vi.mocked(clackPrompts.select).mockResolvedValue(Symbol('cancel'));
      vi.mocked(clackPrompts.isCancel).mockReturnValue(true);

      const result = await selectOne('Choose:', choices);
      expect(result).toBeUndefined();
    });

    it('should pass initial value', async () => {
      vi.mocked(clackPrompts.select).mockResolvedValue('b');
      vi.mocked(clackPrompts.isCancel).mockReturnValue(false);

      await selectOne('Choose:', choices, 'b');
      expect(clackPrompts.select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Choose:',
          initialValue: 'b',
        })
      );
    });
  });

  describe('selectMultiple', () => {
    const choices = [
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B' },
      { value: 'c', label: 'Option C' },
    ];

    it('should return selected values', async () => {
      vi.mocked(clackPrompts.multiselect).mockResolvedValue(['a', 'c']);
      vi.mocked(clackPrompts.isCancel).mockReturnValue(false);

      const result = await selectMultiple('Choose:', choices);
      expect(result).toEqual(['a', 'c']);
    });

    it('should return undefined when cancelled', async () => {
      vi.mocked(clackPrompts.multiselect).mockResolvedValue(Symbol('cancel'));
      vi.mocked(clackPrompts.isCancel).mockReturnValue(true);

      const result = await selectMultiple('Choose:', choices);
      expect(result).toBeUndefined();
    });

    it('should pass initial values and required flag', async () => {
      vi.mocked(clackPrompts.multiselect).mockResolvedValue(['a']);
      vi.mocked(clackPrompts.isCancel).mockReturnValue(false);

      await selectMultiple('Choose:', choices, ['a'], true);
      expect(clackPrompts.multiselect).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Choose:',
          initialValues: ['a'],
          required: true,
        })
      );
    });
  });

  describe('inputText', () => {
    it('should return input value', async () => {
      vi.mocked(clackPrompts.text).mockResolvedValue('user input');
      vi.mocked(clackPrompts.isCancel).mockReturnValue(false);

      const result = await inputText('Enter:');
      expect(result).toBe('user input');
    });

    it('should return undefined when cancelled', async () => {
      vi.mocked(clackPrompts.text).mockResolvedValue(Symbol('cancel'));
      vi.mocked(clackPrompts.isCancel).mockReturnValue(true);

      const result = await inputText('Enter:');
      expect(result).toBeUndefined();
    });

    it('should pass options', async () => {
      vi.mocked(clackPrompts.text).mockResolvedValue('value');
      vi.mocked(clackPrompts.isCancel).mockReturnValue(false);

      const validate = (v: string) => (v.length < 3 ? 'Too short' : undefined);
      await inputText('Enter:', {
        placeholder: 'Type here',
        defaultValue: 'default',
        validate,
      });

      expect(clackPrompts.text).toHaveBeenCalledWith({
        message: 'Enter:',
        placeholder: 'Type here',
        defaultValue: 'default',
        validate,
      });
    });
  });

  describe('inputSecret', () => {
    it('should return secret value', async () => {
      vi.mocked(clackPrompts.password).mockResolvedValue('secret123');
      vi.mocked(clackPrompts.isCancel).mockReturnValue(false);

      const result = await inputSecret('Password:');
      expect(result).toBe('secret123');
    });

    it('should return undefined when cancelled', async () => {
      vi.mocked(clackPrompts.password).mockResolvedValue(Symbol('cancel'));
      vi.mocked(clackPrompts.isCancel).mockReturnValue(true);

      const result = await inputSecret('Password:');
      expect(result).toBeUndefined();
    });
  });

  describe('showNote', () => {
    it('should call note with title and message', () => {
      showNote('Title', 'Message');
      expect(clackPrompts.note).toHaveBeenCalledWith('Message', 'Title');
    });
  });

  describe('showIntro', () => {
    it('should call intro with message', () => {
      showIntro('Welcome!');
      expect(clackPrompts.intro).toHaveBeenCalled();
    });
  });

  describe('showOutro', () => {
    it('should call outro with message', () => {
      showOutro('Goodbye!');
      expect(clackPrompts.outro).toHaveBeenCalled();
    });
  });

  describe('showCancel', () => {
    it('should call cancel with default message', () => {
      showCancel();
      expect(clackPrompts.cancel).toHaveBeenCalledWith('Operation cancelled');
    });

    it('should call cancel with custom message', () => {
      showCancel('User aborted');
      expect(clackPrompts.cancel).toHaveBeenCalledWith('User aborted');
    });
  });

  describe('isCancelled', () => {
    it('should return true for cancel symbol', () => {
      vi.mocked(clackPrompts.isCancel).mockReturnValue(true);
      expect(isCancelled(Symbol('cancel'))).toBe(true);
    });

    it('should return false for regular values', () => {
      vi.mocked(clackPrompts.isCancel).mockReturnValue(false);
      expect(isCancelled('value')).toBe(false);
    });
  });
});
