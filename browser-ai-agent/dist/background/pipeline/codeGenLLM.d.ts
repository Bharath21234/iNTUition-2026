/**
 * Code Generation LLM - Generates JavaScript/CSS code to execute actions
 * Uses a powerful model (Claude Sonnet) for complex reasoning
 */
import type { ExtensionSettings, CodeGenResult, IntentAnalysis } from '@shared/types/pipeline';
import type { SimplifiedDOM, ChatMessage } from '@shared/types/messages';
/**
 * Generate executable code for the user's intent
 */
export declare function generateCode(command: string, parsedIntent: NonNullable<IntentAnalysis['parsedIntent']>, domContext: SimplifiedDOM, settings: ExtensionSettings, conversationHistory: ChatMessage[]): Promise<CodeGenResult>;
//# sourceMappingURL=codeGenLLM.d.ts.map