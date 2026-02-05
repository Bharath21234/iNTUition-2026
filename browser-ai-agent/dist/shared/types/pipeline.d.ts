/**
 * Types for the AI pipeline stages
 */
import type { ActionPayload, SimplifiedDOM } from './messages';
export interface FastPathRule {
    pattern: RegExp;
    action: FastPathAction;
    extractParams?: (match: RegExpMatchArray) => Record<string, string>;
}
export type FastPathAction = 'scroll' | 'navigate' | 'reload' | 'clickByText' | 'goBack' | 'goForward';
export interface FastPathResult {
    matched: boolean;
    action?: FastPathAction;
    params?: Record<string, string>;
}
export interface IntentAnalysis {
    clear: boolean;
    clarificationQuestion?: string;
    clarificationOptions?: string[];
    parsedIntent?: {
        action: string;
        target?: string;
        value?: string;
    };
}
export interface GeneratedAction {
    code: string;
    selector?: string;
    actionType: ActionPayload['type'];
    description: string;
    verification: {
        type: 'domChange' | 'navigation' | 'styleChange' | 'none';
        expectedResult: string;
    };
}
export interface CodeGenResult {
    success: boolean;
    actions: GeneratedAction[];
    explanation: string;
    error?: string;
}
export interface SafetyCheckResult {
    safe: boolean;
    blocked?: string;
    blockedReason?: string;
    requiresConfirmation?: boolean;
    confirmationMessage?: string;
    flaggedPatterns?: string[];
}
export interface ExecutionResult {
    success: boolean;
    message?: string;
    error?: string;
    actualResult?: string;
}
export interface VerificationResult {
    success: boolean;
    expectedResult: string;
    actualResult: string;
    details?: string;
}
export interface RetryContext {
    attempt: number;
    maxAttempts: number;
    previousErrors: string[];
    originalAction: GeneratedAction;
    alternativeSelectors?: string[];
}
export interface PipelineState {
    stage: 'idle' | 'fast-path' | 'intent' | 'clarification' | 'codegen' | 'safety' | 'execution' | 'verification' | 'complete' | 'error';
    command: string;
    domContext?: SimplifiedDOM;
    intentResult?: IntentAnalysis;
    codeGenResult?: CodeGenResult;
    safetyResult?: SafetyCheckResult;
    executionResult?: ExecutionResult;
    retryContext?: RetryContext;
    error?: string;
}
export type AIProvider = 'claude' | 'openai';
export interface AIProviderConfig {
    provider: AIProvider;
    apiKey: string;
    intentModel: string;
    codeGenModel: string;
}
export interface ExtensionSettings {
    provider: AIProvider;
    apiKey: string;
    intentModel: string;
    codeGenModel: string;
    maxRetries: number;
    confirmDestructive: boolean;
    audioFeedback: boolean;
    theme: 'light' | 'dark' | 'system';
}
export declare const DEFAULT_SETTINGS: ExtensionSettings;
//# sourceMappingURL=pipeline.d.ts.map