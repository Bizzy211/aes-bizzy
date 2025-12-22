/**
 * Reusable prompts using @clack/prompts
 */

import * as prompts from '@clack/prompts';
import chalk from 'chalk';

/**
 * Unicode symbols for consistent styling
 */
export const SYMBOLS = {
  success: chalk.green(''),
  error: chalk.red(''),
  warning: chalk.yellow(''),
  info: chalk.blue(''),
  pending: chalk.cyan(''),
  rocket: '',
  check: chalk.green(''),
  cross: chalk.red(''),
  arrow: chalk.cyan(''),
  dot: chalk.dim(''),
} as const;

/**
 * Choice option for select prompts
 */
export interface Choice<T> {
  value: T;
  label: string;
  hint?: string;
}

/**
 * Confirm an action with the user
 */
export async function confirmAction(
  message: string,
  initialValue = false
): Promise<boolean | undefined> {
  const result = await prompts.confirm({
    message,
    initialValue,
  });

  if (prompts.isCancel(result)) {
    return undefined;
  }

  return result;
}

/**
 * Select one option from a list
 */
export async function selectOne<T extends string>(
  message: string,
  choices: Choice<T>[],
  initialValue?: T
): Promise<T | undefined> {
  const options = choices.map((choice) => ({
    value: choice.value,
    label: choice.label,
    ...(choice.hint && { hint: choice.hint }),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await prompts.select<any, T>({
    message,
    options,
    initialValue,
  });

  if (prompts.isCancel(result)) {
    return undefined;
  }

  return result as T;
}

/**
 * Select multiple options from a list
 */
export async function selectMultiple<T extends string>(
  message: string,
  choices: Choice<T>[],
  initialValues?: T[],
  required = false
): Promise<T[] | undefined> {
  const options = choices.map((choice) => ({
    value: choice.value,
    label: choice.label,
    ...(choice.hint && { hint: choice.hint }),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await prompts.multiselect<any, T>({
    message,
    options,
    initialValues,
    required,
  });

  if (prompts.isCancel(result)) {
    return undefined;
  }

  return result as T[];
}

/**
 * Input text from the user
 */
export async function inputText(
  message: string,
  options?: {
    placeholder?: string;
    defaultValue?: string;
    validate?: (value: string) => string | void;
  }
): Promise<string | undefined> {
  const result = await prompts.text({
    message,
    placeholder: options?.placeholder,
    defaultValue: options?.defaultValue,
    validate: options?.validate,
  });

  if (prompts.isCancel(result)) {
    return undefined;
  }

  return result;
}

/**
 * Input secret/password from the user
 */
export async function inputSecret(
  message: string,
  options?: {
    validate?: (value: string) => string | void;
  }
): Promise<string | undefined> {
  const result = await prompts.password({
    message,
    validate: options?.validate,
  });

  if (prompts.isCancel(result)) {
    return undefined;
  }

  return result;
}

/**
 * Show a note/message
 */
export function showNote(title: string, message: string): void {
  prompts.note(message, title);
}

/**
 * Show intro message
 */
export function showIntro(message: string): void {
  prompts.intro(chalk.cyan(message));
}

/**
 * Show outro message
 */
export function showOutro(message: string): void {
  prompts.outro(chalk.green(message));
}

/**
 * Show a cancel message
 */
export function showCancel(message = 'Operation cancelled'): void {
  prompts.cancel(message);
}

/**
 * Check if a result was cancelled
 */
export function isCancelled<T>(value: T | symbol): value is symbol {
  return prompts.isCancel(value);
}

/**
 * Start a group of prompts
 */
export async function promptGroup<T extends Record<string, unknown>>(
  prompts: () => Promise<T>
): Promise<T | undefined> {
  try {
    return await prompts();
  } catch {
    return undefined;
  }
}
