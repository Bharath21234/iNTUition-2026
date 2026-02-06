/**
 * Fast-Path Optimizer - Rule-based command matching for trivial commands
 * Skips LLM for simple commands like scroll, navigate, refresh
 */

import type {
  FastPathRule,
  FastPathResult,
  FastPathAction,
  ExecutionResult,
} from '@shared/types/pipeline';
import { MessageType } from '@shared/types/messages';

/**
 * Rules for fast-path matching
 * Order matters - more specific patterns should come first
 */
const FAST_PATH_RULES: FastPathRule[] = [
  // Scroll commands
  {
    pattern: /^scroll\s+(down|up)(?:\s+(\d+))?$/i,
    action: 'scroll',
    extractParams: (match) => ({
      direction: match[1].toLowerCase(),
      amount: match[2] || '400',
    }),
  },
  {
    pattern: /^scroll\s+to\s+(top|bottom)$/i,
    action: 'scroll',
    extractParams: (match) => ({
      direction: match[1].toLowerCase(),
    }),
  },
  {
    pattern: /^page\s+(down|up)$/i,
    action: 'scroll',
    extractParams: (match) => ({
      direction: match[1].toLowerCase(),
      amount: '800',
    }),
  },

  // Navigation commands
  {
    pattern: /^go\s+back$/i,
    action: 'goBack',
  },
  {
    pattern: /^go\s+forward$/i,
    action: 'goForward',
  },
  {
    pattern: /^(refresh|reload)(\s+page)?$/i,
    action: 'reload',
  },

  // Navigate to URL
  {
    pattern: /^(?:.*?\s+)?(?:navigate|go|open)(?:\s+to)?(?:the\s+)?(?:website\s+)?([a-zA-Z0-9][-a-zA-Z0-9]*(?:\.[a-zA-Z0-9][-a-zA-Z0-9]*)+(?:\/\S*)?)$/i,
    action: 'navigate',
    extractParams: (match) => ({
      url: match[1],
    }),
  },
  {
    pattern: /^(?:.*?\s+)?(?:navigate|go|open)(?:\s+to)?(https?:\/\/\S+)$/i,
    action: 'navigate',
    extractParams: (match) => ({
      url: match[1],
    }),
  },

  // Click by exact text (with quotes)
  {
    pattern: /^click\s+["']([^"']+)["']$/i,
    action: 'clickByText',
    extractParams: (match) => ({
      text: match[1],
    }),
  },
  {
    pattern: /^click\s+on\s+["']([^"']+)["']$/i,
    action: 'clickByText',
    extractParams: (match) => ({
      text: match[1],
    }),
  },
];

/**
 * Check if a command matches a fast-path rule
 */
export function checkFastPath(command: string): FastPathResult {
  const trimmedCommand = command.trim();

  for (const rule of FAST_PATH_RULES) {
    const match = trimmedCommand.match(rule.pattern);

    if (match) {
      const params = rule.extractParams ? rule.extractParams(match) : {};

      return {
        matched: true,
        action: rule.action,
        params,
      };
    }
  }

  return { matched: false };
}

/**
 * Execute a fast-path action
 */
export async function executeFastPathAction(
  action: FastPathAction,
  params: Record<string, string>,
  tabId: number
): Promise<ExecutionResult> {
  try {
    switch (action) {
      case 'scroll':
        return executeScroll(params, tabId);

      case 'goBack':
        return executeGoBack(tabId);

      case 'goForward':
        return executeGoForward(tabId);

      case 'reload':
        return executeReload(tabId);

      case 'navigate':
        return executeNavigate(params, tabId);

      case 'clickByText':
        return executeClickByText(params, tabId);

      default:
        return {
          success: false,
          error: `Unknown fast-path action: ${action}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fast-path execution failed',
    };
  }
}

/**
 * Execute scroll action
 */
async function executeScroll(
  params: Record<string, string>,
  tabId: number
): Promise<ExecutionResult> {
  const { direction, amount } = params;
  const scrollAmount = parseInt(amount || '400', 10);

  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: (dir: string, amt: number) => {
      switch (dir) {
        case 'down':
          window.scrollBy({ top: amt, behavior: 'smooth' });
          break;
        case 'up':
          window.scrollBy({ top: -amt, behavior: 'smooth' });
          break;
        case 'top':
          window.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        case 'bottom':
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          break;
      }
      return { success: true };
    },
    args: [direction, scrollAmount],
  });

  return {
    success: true,
    message: `Scrolled ${direction}`,
  };
}

/**
 * Execute go back action
 */
async function executeGoBack(tabId: number): Promise<ExecutionResult> {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      window.history.back();
    },
  });

  return {
    success: true,
    message: 'Navigated back',
  };
}

/**
 * Execute go forward action
 */
async function executeGoForward(tabId: number): Promise<ExecutionResult> {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      window.history.forward();
    },
  });

  return {
    success: true,
    message: 'Navigated forward',
  };
}

/**
 * Execute reload action
 */
async function executeReload(tabId: number): Promise<ExecutionResult> {
  await chrome.tabs.reload(tabId);

  return {
    success: true,
    message: 'Page reloaded',
  };
}

/**
 * Execute navigate to URL action
 */
async function executeNavigate(
  params: Record<string, string>,
  tabId: number
): Promise<ExecutionResult> {
  let { url } = params;

  // Add https:// if no protocol specified
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  await chrome.tabs.update(tabId, { url });

  return {
    success: true,
    message: `Navigating to ${url}`,
  };
}

/**
 * Execute click by text action
 */
async function executeClickByText(
  params: Record<string, string>,
  tabId: number
): Promise<ExecutionResult> {
  const { text } = params;

  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: (searchText: string) => {
      // Find elements containing the exact text
      const elements = document.querySelectorAll(
        'button, a, [role="button"], input[type="submit"], input[type="button"]'
      );

      for (const el of elements) {
        const elText = el.textContent?.trim() || '';
        const ariaLabel = el.getAttribute('aria-label') || '';
        const value = (el as HTMLInputElement).value || '';

        if (
          elText.toLowerCase() === searchText.toLowerCase() ||
          ariaLabel.toLowerCase() === searchText.toLowerCase() ||
          value.toLowerCase() === searchText.toLowerCase()
        ) {
          // Scroll into view and click
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // Brief highlight
          const htmlEl = el as HTMLElement;
          const originalOutline = htmlEl.style.outline;
          htmlEl.style.outline = '3px solid #4CAF50';
          setTimeout(() => {
            htmlEl.style.outline = originalOutline;
          }, 500);

          // Click after scroll animation
          setTimeout(() => {
            (el as HTMLElement).click();
          }, 300);

          return { success: true, found: true };
        }
      }

      return { success: false, found: false, error: `No element found with text "${searchText}"` };
    },
    args: [text],
  });

  const result = results[0]?.result;

  if (result?.found) {
    return {
      success: true,
      message: `Clicked "${text}"`,
    };
  } else {
    return {
      success: false,
      error: result?.error || `Could not find element with text "${text}"`,
    };
  }
}
