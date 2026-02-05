/**
 * Pipeline Orchestrator - Coordinates the AI processing pipeline
 */

import type { ExtensionSettings, PipelineState } from '@shared/types/pipeline';
import type { ActionPayload, SimplifiedDOM } from '@shared/types/messages';
import type { SessionWrapper } from '../sessionManager';
import { checkFastPath, executeFastPathAction } from './fastPath';
import { analyzeIntent } from './intentLLM';
import { generateCode } from './codeGenLLM';
import { checkSafety } from './safetyFilter';
import { getDOMContext, executeAction, verifyAction } from './executor';

export interface PipelineResult {
  success: boolean;
  message: string;
  actions?: ActionPayload[];
  requiresClarification?: boolean;
  clarificationQuestion?: string;
  clarificationOptions?: string[];
}

/**
 * Check if URL is valid for script execution
 */
function isValidPageUrl(url: string | undefined): boolean {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Main pipeline processing function
 */
export async function processPipeline(
  command: string,
  tabId: number,
  settings: ExtensionSettings,
  session: SessionWrapper
): Promise<PipelineResult> {
  const state: PipelineState = {
    stage: 'idle',
    command,
  };

  try {
    // Check if we're on a valid page
    const tab = await chrome.tabs.get(tabId);
    if (!isValidPageUrl(tab.url)) {
      // Auto-navigate to google.com if on an invalid page (like chrome-extension://)
      await chrome.tabs.update(tabId, { url: 'https://www.google.com' });
      return {
        success: true,
        message: 'Navigated to Google. You can now give me commands to interact with the page.',
      };
    }

    // Stage 1: Fast-path check
    state.stage = 'fast-path';
    const fastPathResult = checkFastPath(command);

    if (fastPathResult.matched) {
      console.log('[Pipeline] Fast-path matched:', fastPathResult.action);

      // Execute fast-path action directly
      const result = await executeFastPathAction(
        fastPathResult.action!,
        fastPathResult.params || {},
        tabId
      );

      return {
        success: result.success,
        message: result.message || 'Action completed',
      };
    }

    // Get DOM context for complex commands
    state.stage = 'intent';
    const domContext = await getDOMContext(tabId);
    state.domContext = domContext;
    session.setDOMContext(domContext);

    // Stage 2: Intent analysis
    const intentResult = await analyzeIntent(command, domContext, settings);
    state.intentResult = intentResult;

    if (!intentResult.clear) {
      // Need clarification from user
      state.stage = 'clarification';
      return {
        success: true,
        message: intentResult.clarificationQuestion || 'Could you please clarify your request?',
        requiresClarification: true,
        clarificationQuestion: intentResult.clarificationQuestion,
        clarificationOptions: intentResult.clarificationOptions,
      };
    }

    // Stage 3: Code generation
    state.stage = 'codegen';
    const codeGenResult = await generateCode(
      command,
      intentResult.parsedIntent!,
      domContext,
      settings,
      session.getConversationContext()
    );
    state.codeGenResult = codeGenResult;

    if (!codeGenResult.success) {
      return {
        success: false,
        message: codeGenResult.error || 'Failed to generate action code',
      };
    }

    // Stage 4: Safety filter
    state.stage = 'safety';
    for (const action of codeGenResult.actions) {
      const safetyResult = checkSafety(action.code, action.actionType);
      state.safetyResult = safetyResult;

      if (!safetyResult.safe) {
        if (safetyResult.blocked) {
          return {
            success: false,
            message: `Action blocked for safety: ${safetyResult.blockedReason}`,
          };
        }

        if (safetyResult.requiresConfirmation) {
          // TODO: Implement confirmation flow
          console.log('[Pipeline] Action requires confirmation:', safetyResult.confirmationMessage);
        }
      }
    }

    // Stage 5: Execution with verification and retry
    state.stage = 'execution';
    const executedActions: ActionPayload[] = [];
    let overallSuccess = true;
    const messages: string[] = [];

    for (const action of codeGenResult.actions) {
      let attempt = 0;
      const maxAttempts = settings.maxRetries;
      let lastError: string | undefined;

      while (attempt < maxAttempts) {
        attempt++;

        const execResult = await executeAction(action, tabId);

        if (execResult.success) {
          // Verify the action worked
          state.stage = 'verification';
          const verifyResult = await verifyAction(action.verification, tabId);

          if (verifyResult.success) {
            executedActions.push({
              type: action.actionType,
              target: action.selector,
              description: action.description,
            });
            messages.push(action.description);
            session.recordAction(
              { type: action.actionType, description: action.description },
              true
            );
            break;
          } else {
            lastError = `Verification failed: ${verifyResult.details}`;
          }
        } else {
          lastError = execResult.error;
        }

        // Retry logic
        if (attempt < maxAttempts) {
          console.log(`[Pipeline] Retry ${attempt}/${maxAttempts}: ${lastError}`);
          // Could implement alternative selector strategies here
          await new Promise((resolve) => setTimeout(resolve, 500)); // Brief delay before retry
        }
      }

      if (attempt >= maxAttempts && lastError) {
        overallSuccess = false;
        messages.push(`Failed: ${action.description} (${lastError})`);
        session.recordAction({ type: action.actionType, description: action.description }, false);
      }
    }

    state.stage = 'complete';

    return {
      success: overallSuccess,
      message: messages.join('. ') || 'Actions completed',
      actions: executedActions,
    };
  } catch (error) {
    state.stage = 'error';
    state.error = error instanceof Error ? error.message : 'Unknown error';

    console.error('[Pipeline] Error:', error);

    return {
      success: false,
      message: `Pipeline error: ${state.error}`,
    };
  }
}
