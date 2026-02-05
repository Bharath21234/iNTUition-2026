/**
 * Executor - Handles DOM context retrieval and action execution
 */
import type { SimplifiedDOM } from '@shared/types/messages';
import type { GeneratedAction, ExecutionResult, VerificationResult } from '@shared/types/pipeline';
/**
 * Get DOM context from the content script
 */
export declare function getDOMContext(tabId: number): Promise<SimplifiedDOM>;
/**
 * Execute generated action in the page
 * Instead of executing raw code, we interpret structured actions
 */
export declare function executeAction(action: GeneratedAction, tabId: number): Promise<ExecutionResult>;
/**
 * Verify that an action had the expected effect
 * Note: Verification is best-effort and lenient - we trust the action if it executed
 */
export declare function verifyAction(verification: GeneratedAction['verification'], tabId: number): Promise<VerificationResult>;
//# sourceMappingURL=executor.d.ts.map