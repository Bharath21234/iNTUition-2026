/**
 * Safety Filter - Guardrails and static analysis for generated code
 * Blocks dangerous patterns and flags sensitive actions
 */

import type { SafetyCheckResult } from '@shared/types/pipeline';
import type { ActionPayload } from '@shared/types/messages';

/**
 * Patterns that are always blocked (security risks)
 */
const BLOCKED_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  // Network requests to external URLs
  {
    pattern: /fetch\s*\(/gi,
    reason: 'Network requests are not allowed',
  },
  {
    pattern: /XMLHttpRequest/gi,
    reason: 'Network requests are not allowed',
  },
  {
    pattern: /\.ajax\s*\(/gi,
    reason: 'Network requests are not allowed',
  },
  {
    pattern: /axios\./gi,
    reason: 'Network requests are not allowed',
  },
  {
    pattern: /navigator\.sendBeacon/gi,
    reason: 'Network requests are not allowed',
  },
  {
    pattern: /WebSocket/gi,
    reason: 'WebSocket connections are not allowed',
  },

  // Data exfiltration vectors
  {
    pattern: /document\.cookie/gi,
    reason: 'Cookie access is not allowed',
  },
  {
    pattern: /localStorage/gi,
    reason: 'localStorage access is not allowed',
  },
  {
    pattern: /sessionStorage/gi,
    reason: 'sessionStorage access is not allowed',
  },
  {
    pattern: /indexedDB/gi,
    reason: 'IndexedDB access is not allowed',
  },
  {
    pattern: /caches\./gi,
    reason: 'Cache API access is not allowed',
  },

  // Code execution
  {
    pattern: /eval\s*\(/gi,
    reason: 'eval() is not allowed',
  },
  {
    pattern: /Function\s*\(/gi,
    reason: 'Function constructor is not allowed',
  },
  {
    pattern: /setTimeout\s*\(\s*['"`]/gi,
    reason: 'setTimeout with string argument is not allowed',
  },
  {
    pattern: /setInterval\s*\(\s*['"`]/gi,
    reason: 'setInterval with string argument is not allowed',
  },

  // Script injection
  {
    pattern: /<script/gi,
    reason: 'Script injection is not allowed',
  },
  {
    pattern: /javascript:/gi,
    reason: 'javascript: URLs are not allowed',
  },
  {
    pattern: /data:text\/html/gi,
    reason: 'data: HTML URLs are not allowed',
  },

  // Chrome extension APIs
  {
    pattern: /chrome\.\w+/gi,
    reason: 'Chrome extension APIs are not allowed in injected code',
  },
  {
    pattern: /browser\.\w+/gi,
    reason: 'Browser APIs are not allowed in injected code',
  },
];

/**
 * Patterns that require user confirmation
 */
const FLAGGED_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  // Payment/purchase actions
  {
    pattern: /\b(pay|purchase|buy|checkout|order|subscribe|billing)\b/gi,
    message: 'This action involves a payment or purchase',
  },

  // Destructive actions
  {
    pattern: /\b(delete|remove|cancel|unsubscribe|close\s*account|deactivate)\b/gi,
    message: 'This action may delete or remove data',
  },

  // Sensitive data
  {
    pattern: /\b(password|credit\s*card|ssn|social\s*security)\b/gi,
    message: 'This action involves sensitive data',
  },

  // Form submission
  {
    pattern: /\.submit\s*\(\s*\)/gi,
    message: 'This action will submit a form',
  },
];

/**
 * Check if generated code is safe to execute
 */
export function checkSafety(
  code: string,
  actionType: ActionPayload['type']
): SafetyCheckResult {
  // Check for blocked patterns
  for (const { pattern, reason } of BLOCKED_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;

    if (pattern.test(code)) {
      return {
        safe: false,
        blocked: code.match(pattern)?.[0] || 'unknown',
        blockedReason: reason,
      };
    }
  }

  // Check for flagged patterns
  const flagged: string[] = [];
  for (const { pattern, message } of FLAGGED_PATTERNS) {
    pattern.lastIndex = 0;

    if (pattern.test(code)) {
      flagged.push(message);
    }
  }

  if (flagged.length > 0) {
    return {
      safe: true,
      requiresConfirmation: true,
      confirmationMessage: `This action has been flagged for review:\n- ${flagged.join('\n- ')}\n\nDo you want to proceed?`,
      flaggedPatterns: flagged,
    };
  }

  return { safe: true };
}

/**
 * Validate that selectors in the code actually exist in the DOM
 * This is called with the DOM context to verify targets
 */
export function validateSelectors(
  code: string,
  availableElementIds: string[]
): { valid: boolean; invalidSelectors: string[] } {
  const invalidSelectors: string[] = [];

  // Check for element ID references like 'el-5'
  const elementIdPattern = /['"]el-(\d+)['"]/g;
  let match;

  while ((match = elementIdPattern.exec(code)) !== null) {
    const elementId = `el-${match[1]}`;
    if (!availableElementIds.includes(elementId)) {
      invalidSelectors.push(elementId);
    }
  }

  return {
    valid: invalidSelectors.length === 0,
    invalidSelectors,
  };
}

/**
 * Sanitize code by removing potentially dangerous constructs
 * This is a last-resort safety measure
 */
export function sanitizeCode(code: string): string {
  let sanitized = code;

  // Remove any chrome.* or browser.* API calls
  sanitized = sanitized.replace(/chrome\.\w+[^;]*/gi, '/* blocked */');
  sanitized = sanitized.replace(/browser\.\w+[^;]*/gi, '/* blocked */');

  // Remove fetch/XMLHttpRequest
  sanitized = sanitized.replace(/fetch\s*\([^)]*\)/gi, '/* blocked */');
  sanitized = sanitized.replace(/new\s+XMLHttpRequest[^;]*/gi, '/* blocked */');

  return sanitized;
}
