/**
 * Reusable prompts using @clack/prompts
 */
/**
 * Unicode symbols for consistent styling
 */
export declare const SYMBOLS: {
    readonly success: string;
    readonly error: string;
    readonly warning: string;
    readonly info: string;
    readonly pending: string;
    readonly rocket: "";
    readonly check: string;
    readonly cross: string;
    readonly arrow: string;
    readonly dot: string;
};
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
export declare function confirmAction(message: string, initialValue?: boolean): Promise<boolean | undefined>;
/**
 * Select one option from a list
 */
export declare function selectOne<T extends string>(message: string, choices: Choice<T>[], initialValue?: T): Promise<T | undefined>;
/**
 * Select multiple options from a list
 */
export declare function selectMultiple<T extends string>(message: string, choices: Choice<T>[], initialValues?: T[], required?: boolean): Promise<T[] | undefined>;
/**
 * Input text from the user
 */
export declare function inputText(message: string, options?: {
    placeholder?: string;
    defaultValue?: string;
    validate?: (value: string) => string | void;
}): Promise<string | undefined>;
/**
 * Input secret/password from the user
 */
export declare function inputSecret(message: string, options?: {
    validate?: (value: string) => string | void;
}): Promise<string | undefined>;
/**
 * Show a note/message
 */
export declare function showNote(title: string, message: string): void;
/**
 * Show intro message
 */
export declare function showIntro(message: string): void;
/**
 * Show outro message
 */
export declare function showOutro(message: string): void;
/**
 * Show a cancel message
 */
export declare function showCancel(message?: string): void;
/**
 * Check if a result was cancelled
 */
export declare function isCancelled<T>(value: T | symbol): value is symbol;
/**
 * Start a group of prompts
 */
export declare function promptGroup<T extends Record<string, unknown>>(prompts: () => Promise<T>): Promise<T | undefined>;
//# sourceMappingURL=prompts.d.ts.map