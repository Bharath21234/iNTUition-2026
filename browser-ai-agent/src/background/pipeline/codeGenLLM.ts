/**
 * Code Generation LLM - Generates JavaScript/CSS code to execute actions
 * Uses a powerful model (Claude Sonnet) for complex reasoning
 */

import type {
  ExtensionSettings,
  CodeGenResult,
  GeneratedAction,
  IntentAnalysis,
} from '@shared/types/pipeline';
import type { SimplifiedDOM, ChatMessage } from '@shared/types/messages';
import { callAI } from '../aiClient';

const CODEGEN_SYSTEM_PROMPT = `You are a browser automation assistant. Generate structured actions to accomplish user tasks on web pages.

You receive:
1. The user's command and parsed intent
2. A simplified DOM context with interactive elements (each has an ID like "el-5")
3. Recent conversation history for context

Response format (JSON):
{
  "success": true,
  "explanation": "Brief explanation of what the action does",
  "actions": [
    {
      "actionType": "click" | "fill" | "scroll" | "navigate" | "extract" | "modify",
      "selector": "element ID (e.g., 'el-5') or CSS selector",
      "code": "action-specific value (see below)",
      "description": "Human-readable description",
      "verification": {
        "type": "domChange" | "navigation" | "styleChange" | "none",
        "expectedResult": "What to check for success"
      }
    }
  ]
}

Action types and their fields:

1. "click" - Click an element
   - selector: Element ID (e.g., "el-5") or CSS selector or text to match
   - code: Not used (can be empty string)

2. "fill" - Fill a text input or textarea
   - selector: Element ID or CSS selector for the input
   - code: The value to fill in

3. "scroll" - Scroll the page
   - selector: Not used
   - code: Direction - one of: "up", "down", "top", "bottom"

4. "navigate" - Navigate to a URL
   - selector: Not used
   - code: The URL to navigate to (e.g., "youtube.com" or "https://google.com")

5. "extract" - Extract text content from an element
   - selector: CSS selector for the element to extract from
   - code: Not used

6. "modify" - Apply CSS style modifications
   - selector: Not used
   - code: JSON config like {"type": "enlarge-text", "scale": 1.5} or raw CSS string

Important:
- Use element IDs from the DOM context when available (e.g., "el-5")
- For clicks, prefer element IDs, then CSS selectors, then text content matching
- Return success: false if the task cannot be accomplished
- Do NOT generate JavaScript code - only structured actions`;

/**
 * Generate executable code for the user's intent
 */
export async function generateCode(
  command: string,
  parsedIntent: NonNullable<IntentAnalysis['parsedIntent']>,
  domContext: SimplifiedDOM,
  settings: ExtensionSettings,
  conversationHistory: ChatMessage[]
): Promise<CodeGenResult> {
  // Build DOM context string
  const elementsContext = domContext.elements
    .map((el) => {
      const attrs = [];
      if (el.attributes.id) attrs.push(`id="${el.attributes.id}"`);
      if (el.attributes.className)
        attrs.push(`class="${el.attributes.className.slice(0, 50)}"`);
      if (el.attributes.ariaLabel) attrs.push(`aria-label="${el.attributes.ariaLabel}"`);
      if (el.attributes.placeholder)
        attrs.push(`placeholder="${el.attributes.placeholder}"`);
      if (el.attributes.type) attrs.push(`type="${el.attributes.type}"`);
      if (el.attributes.name) attrs.push(`name="${el.attributes.name}"`);
      if (el.attributes.href)
        attrs.push(`href="${el.attributes.href.slice(0, 80)}"`);

      const box = `(${el.boundingBox.x},${el.boundingBox.y} ${el.boundingBox.width}x${el.boundingBox.height})`;

      return `[${el.id}] <${el.tagName} ${attrs.join(' ')}> "${el.text.slice(0, 80)}" ${el.isInteractive ? '(interactive)' : ''} ${box}`;
    })
    .join('\n');

  // Build conversation context
  const recentMessages = conversationHistory
    .slice(-5)
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join('\n');

  const userMessage = `Page: ${domContext.title}
URL: ${domContext.url}

Page text summary:
${domContext.pageText.slice(0, 500)}...

DOM Elements:
${elementsContext}

Recent conversation:
${recentMessages || 'None'}

User command: "${command}"
Parsed intent: ${JSON.stringify(parsedIntent)}

Generate the JavaScript code to accomplish this task. Use the element IDs (like "el-5") to reference elements when possible.`;

  try {
    const response = await callAI({
      provider: settings.provider,
      apiKey: settings.apiKey,
      model: settings.codeGenModel,
      systemPrompt: CODEGEN_SYSTEM_PROMPT,
      userMessage,
      maxTokens: 2000,
    });

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[CodeGenLLM] Failed to parse response:', response);
      return {
        success: false,
        actions: [],
        explanation: 'Failed to parse code generation response',
        error: 'Invalid response format',
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.success) {
      return {
        success: false,
        actions: [],
        explanation: parsed.explanation || 'Code generation failed',
        error: parsed.error || 'Unknown error',
      };
    }

    // Validate actions
    const validActions: GeneratedAction[] = [];
    for (const action of parsed.actions || []) {
      if (!action.actionType) {
        console.warn('[CodeGenLLM] Invalid action (missing actionType):', action);
        continue;
      }

      validActions.push({
        code: action.code,
        selector: action.selector || null,
        actionType: action.actionType,
        description: action.description || 'Action',
        verification: action.verification || {
          type: 'none',
          expectedResult: '',
        },
      });
    }

    return {
      success: validActions.length > 0,
      actions: validActions,
      explanation: parsed.explanation || 'Generated actions',
    };
  } catch (error) {
    console.error('[CodeGenLLM] Error:', error);
    return {
      success: false,
      actions: [],
      explanation: 'Code generation failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
