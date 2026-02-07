/**
 * Types for the AI pipeline stages
 */
import type { SimplifiedDOM } from './messages';
export interface FastPathRule {
    pattern: RegExp;
    action: FastPathAction;
    extractParams?: (match: RegExpMatchArray) => Record<string, string>;
}
export type FastPathAction = 'scroll' | 'navigate' | 'reload' | 'clickByText' | 'goBack' | 'goForward' | 'newTab' | 'closeTab' | 'duplicateTab' | 'reopenTab' | 'muteTab' | 'pinTab' | 'newWindow' | 'newIncognito' | 'closeWindow' | 'minimize' | 'maximize' | 'fullscreen' | 'zoomIn' | 'zoomOut' | 'zoomReset' | 'print' | 'findInPage' | 'savePage' | 'openDevTools' | 'openHistory' | 'openDownloads' | 'openSettings' | 'clearField' | 'selectAll' | 'submit' | 'mediaPlay' | 'mediaPause' | 'mediaFullscreen';
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
    actionType: 'click' | 'fill' | 'scroll' | 'navigate' | 'extract' | 'modify' | 'tab' | 'keyboard' | 'browser';
    description: string;
    value?: string | Record<string, unknown>;
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
export interface PipelineState {
    stage: 'idle' | 'fast-path' | 'intent' | 'clarification' | 'codegen' | 'safety' | 'execution' | 'complete' | 'error';
    command: string;
    domContext?: SimplifiedDOM;
    intentResult?: IntentAnalysis;
    codeGenResult?: CodeGenResult;
    safetyResult?: SafetyCheckResult;
    executionResult?: ExecutionResult;
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