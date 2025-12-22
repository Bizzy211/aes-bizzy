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
};
/**
 * Confirm an action with the user
 */
export async function confirmAction(message, initialValue = false) {
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
export async function selectOne(message, choices, initialValue) {
    const options = choices.map((choice) => ({
        value: choice.value,
        label: choice.label,
        ...(choice.hint && { hint: choice.hint }),
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await prompts.select({
        message,
        options,
        initialValue,
    });
    if (prompts.isCancel(result)) {
        return undefined;
    }
    return result;
}
/**
 * Select multiple options from a list
 */
export async function selectMultiple(message, choices, initialValues, required = false) {
    const options = choices.map((choice) => ({
        value: choice.value,
        label: choice.label,
        ...(choice.hint && { hint: choice.hint }),
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await prompts.multiselect({
        message,
        options,
        initialValues,
        required,
    });
    if (prompts.isCancel(result)) {
        return undefined;
    }
    return result;
}
/**
 * Input text from the user
 */
export async function inputText(message, options) {
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
export async function inputSecret(message, options) {
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
export function showNote(title, message) {
    prompts.note(message, title);
}
/**
 * Show intro message
 */
export function showIntro(message) {
    prompts.intro(chalk.cyan(message));
}
/**
 * Show outro message
 */
export function showOutro(message) {
    prompts.outro(chalk.green(message));
}
/**
 * Show a cancel message
 */
export function showCancel(message = 'Operation cancelled') {
    prompts.cancel(message);
}
/**
 * Check if a result was cancelled
 */
export function isCancelled(value) {
    return prompts.isCancel(value);
}
/**
 * Start a group of prompts
 */
export async function promptGroup(prompts) {
    try {
        return await prompts();
    }
    catch {
        return undefined;
    }
}
//# sourceMappingURL=prompts.js.map