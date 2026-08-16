export interface FieldError {
    message: string;
    /** 'error' shows red, 'warn' shows amber */
    type: 'error' | 'warn';
}

export interface FieldValidationCondition {
    /** Returns true when the condition is violated (should show the message) */
    check: (value: string) => boolean;
    message: string;
    type: 'error' | 'warn';
}

export interface FieldValidationConfig {
    isRequired?: boolean;
    requiredMessage?: string;
    /** Additional conditions that are checked live as the user types */
    conditions?: FieldValidationCondition[];
}

/**
 * Returns a FieldError if the value fails validation, or undefined if valid.
 * - Required errors only show when the field has been touched or submitted.
 * - Condition errors/warns show live as soon as the value triggers them.
 */
export function validateField(
    config: FieldValidationConfig,
    value: string,
    isTouched: boolean,
): FieldError | undefined {
    // Check live conditions first (show regardless of touch)
    for (const cond of config.conditions ?? []) {
        if (cond.check(value)) {
            return { message: cond.message, type: cond.type };
        }
    }
    // Required check — only show after touched
    if (config.isRequired && !value && isTouched) {
        return {
            message: config.requiredMessage ?? 'This field is required',
            type: 'error',
        };
    }
    return undefined;
}
