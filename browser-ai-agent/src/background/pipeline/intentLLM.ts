/**
 * Intent Clarification LLM - Analyzes user commands for ambiguity
 * Uses a lightweight model (Claude Haiku) for cost efficiency
 */

import type { ExtensionSettings, IntentAnalysis } from '@shared/types/pipeline';
import type { SimplifiedDOM } from '@shared/types/messages';
import { callAI } from '../aiClient';

const INTENT_SYSTEM_PROMPT = `You are an intent analyzer for a browser automation assistant. Your job is to determine if a user's command is clear enough to execute, or if clarification is needed.

Analyze the user's command against the current page context (DOM elements). Determine:
1. Is the intent clear and unambiguous?
2. Can you identify the exact target element(s)?
3. Are there multiple possible interpretations?

Respond with a JSON object:
{
  "clear": boolean,
  "clarificationQuestion": string | null,  // Question to ask if unclear
  "clarificationOptions": string[] | null, // Options to present to user
  "parsedIntent": {
    "action": "click" | "fill" | "scroll" | "navigate" | "extract" | "modify",
    "target": string,  // Element ID or description
    "value": string | null  // For fill actions
  } | null
}

Examples of when to ask for clarification:
- "Click submit" but there are multiple submit buttons
- "Fill the form" but there are multiple forms
- Ambiguous element references

Examples of clear commands:
- "Click the blue Sign In button" (specific description)
- "Fill the email field with test@example.com" (specific target and value)
- "Scroll down" (simple action)`;

/**
 * Analyze user intent and check for ambiguity
 */
export async function analyzeIntent(
  command: string,
  domContext: SimplifiedDOM,
  settings: ExtensionSettings
): Promise<IntentAnalysis> {
  // Build context about interactive elements
  const interactiveElements = domContext.elements
    .filter((el) => el.isInteractive)
    .map((el) => {
      const attrs = [];
      if (el.attributes.ariaLabel) attrs.push(`aria-label="${el.attributes.ariaLabel}"`);
      if (el.attributes.placeholder) attrs.push(`placeholder="${el.attributes.placeholder}"`);
      if (el.attributes.type) attrs.push(`type="${el.attributes.type}"`);
      if (el.attributes.href) attrs.push(`href="${el.attributes.href.slice(0, 50)}..."`);

      return `[${el.id}] <${el.tagName}${attrs.length ? ' ' + attrs.join(' ') : ''}> "${el.text.slice(0, 50)}"`;
    })
    .join('\n');

  const userMessage = `Page: ${domContext.title}
URL: ${domContext.url}

Interactive elements on page:
${interactiveElements || 'No interactive elements found'}

User command: "${command}"

Analyze if this command is clear and unambiguous. If there are multiple possible targets, ask for clarification.`;

  try {
    const response = await callAI({
      provider: settings.provider,
      apiKey: settings.apiKey,
      model: settings.intentModel,
      systemPrompt: INTENT_SYSTEM_PROMPT,
      userMessage,
      maxTokens: 500,
    });

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[IntentLLM] Failed to parse response:', response);
      // Default to clear intent if parsing fails
      return {
        clear: true,
        parsedIntent: {
          action: 'click',
          target: command,
        },
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      clear: parsed.clear,
      clarificationQuestion: parsed.clarificationQuestion,
      clarificationOptions: parsed.clarificationOptions,
      parsedIntent: parsed.parsedIntent,
    };
  } catch (error) {
    console.error('[IntentLLM] Error:', error);

    // On error, assume intent is clear and let code gen handle it
    return {
      clear: true,
      parsedIntent: {
        action: 'click',
        target: command,
      },
    };
  }
}
