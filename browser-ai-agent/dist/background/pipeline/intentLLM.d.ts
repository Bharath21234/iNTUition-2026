/**
 * Intent Clarification LLM - Analyzes user commands for ambiguity
 * Uses a lightweight model (Claude Haiku) for cost efficiency
 */
import type { ExtensionSettings, IntentAnalysis } from '@shared/types/pipeline';
import type { SimplifiedDOM } from '@shared/types/messages';
/**
 * Analyze user intent and check for ambiguity
 */
export declare function analyzeIntent(command: string, domContext: SimplifiedDOM, settings: ExtensionSettings): Promise<IntentAnalysis>;
//# sourceMappingURL=intentLLM.d.ts.map