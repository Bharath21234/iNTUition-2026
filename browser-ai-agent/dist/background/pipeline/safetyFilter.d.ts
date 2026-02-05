/**
 * Safety Filter - Guardrails and static analysis for generated code
 * Blocks dangerous patterns and flags sensitive actions
 */
import type { SafetyCheckResult } from '@shared/types/pipeline';
import type { ActionPayload } from '@shared/types/messages';
/**
 * Check if generated code is safe to execute
 */
export declare function checkSafety(code: string, actionType: ActionPayload['type']): SafetyCheckResult;
/**
 * Validate that selectors in the code actually exist in the DOM
 * This is called with the DOM context to verify targets
 */
export declare function validateSelectors(code: string, availableElementIds: string[]): {
    valid: boolean;
    invalidSelectors: string[];
};
/**
 * Sanitize code by removing potentially dangerous constructs
 * This is a last-resort safety measure
 */
export declare function sanitizeCode(code: string): string;
//# sourceMappingURL=safetyFilter.d.ts.map