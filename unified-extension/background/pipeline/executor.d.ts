/**
 * Executor - Handles DOM context retrieval and action execution
 */
import type { SimplifiedDOM } from '@shared/types/messages';
import type { GeneratedAction, ExecutionResult } from '@shared/types/pipeline';
/**
 * Get DOM context from the content script.
 * Prefers the content script path (enhanced DOM) and falls back
 * to direct script injection if the content script is unavailable.
 */
export declare function getDOMContext(tabId: number): Promise<SimplifiedDOM>;
/**
 * Execute generated action in the page
 * Instead of executing raw code, we interpret structured actions
 */
export declare function executeAction(action: GeneratedAction, tabId: number): Promise<ExecutionResult>;
//# sourceMappingURL=executor.d.ts.map