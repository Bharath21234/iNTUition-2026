/**
 * AI Client - Abstraction layer for Claude and OpenAI APIs
 */
import type { AIProvider } from '@shared/types/pipeline';
export interface AICallOptions {
    provider: AIProvider;
    apiKey: string;
    model: string;
    systemPrompt: string;
    userMessage: string;
    maxTokens?: number;
    temperature?: number;
}
/**
 * Call the AI API (Claude or OpenAI)
 */
export declare function callAI(options: AICallOptions): Promise<string>;
/**
 * Rate limiter to prevent API abuse
 */
declare class RateLimiter {
    private requests;
    private readonly maxRequests;
    private readonly windowMs;
    constructor(maxRequests?: number, windowMs?: number);
    canProceed(): boolean;
    getWaitTime(): number;
}
export declare const rateLimiter: RateLimiter;
export {};
//# sourceMappingURL=aiClient.d.ts.map