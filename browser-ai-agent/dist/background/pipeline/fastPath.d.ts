/**
 * Fast-Path Optimizer - Rule-based command matching for trivial commands
 * Skips LLM for simple commands like scroll, navigate, refresh
 */
import type { FastPathResult, FastPathAction, ExecutionResult } from '@shared/types/pipeline';
/**
 * Check if a command matches a fast-path rule
 */
export declare function checkFastPath(command: string): FastPathResult;
/**
 * Execute a fast-path action
 */
export declare function executeFastPathAction(action: FastPathAction, params: Record<string, string>, tabId: number): Promise<ExecutionResult>;
//# sourceMappingURL=fastPath.d.ts.map