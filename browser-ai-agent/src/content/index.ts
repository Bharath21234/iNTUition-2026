/**
 * Content Script - Injected into web pages
 * Handles DOM parsing, action execution, and UI modifications
 */

import { MessageType, ExtensionMessage, MessageResponse } from '@shared/types/messages';

// Listen for messages from the background script
chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ): boolean => {
    handleMessage(message)
      .then(sendResponse)
      .catch((error) => {
        console.error('[Content] Message handling error:', error);
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });

    return true; // Async response
  }
);

/**
 * Handle incoming messages
 */
async function handleMessage(message: ExtensionMessage): Promise<MessageResponse> {
  console.log('[Content] Received message:', message.type);

  switch (message.type) {
    case MessageType.PING:
      return { success: true, data: 'pong' };

    case MessageType.GET_DOM_CONTEXT:
      return getDOMContext();

    case MessageType.EXECUTE_ACTION:
      return executeAction((message as any).payload);

    default:
      return { success: false, error: `Unknown message type: ${message.type}` };
  }
}

/**
 * Get simplified DOM context for AI processing
 */
function getDOMContext(): MessageResponse {
  try {
    const context = parseDOMForContext();
    return { success: true, data: context };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse DOM',
    };
  }
}

/**
 * Execute an action on the page
 */
async function executeAction(payload: any): Promise<MessageResponse> {
  try {
    const { type, target, value } = payload;

    switch (type) {
      case 'click':
        return clickElement(target);
      case 'fill':
        return fillElement(target, value);
      case 'scroll':
        return scrollPage(value);
      case 'modify':
        return applyModification(value);
      default:
        return { success: false, error: `Unknown action type: ${type}` };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Action execution failed',
    };
  }
}

/**
 * Parse DOM and create simplified context
 */
function parseDOMForContext() {
  const INTERACTIVE_SELECTORS = [
    'a[href]', 'button', 'input', 'select', 'textarea',
    '[role="button"]', '[role="link"]', '[role="checkbox"]',
    '[onclick]', '[tabindex]:not([tabindex="-1"])',
  ];

  const elements: any[] = [];
  let idCounter = 0;
  const elementMap = new Map<string, Element>();

  const interactiveElements = document.querySelectorAll(INTERACTIVE_SELECTORS.join(','));

  interactiveElements.forEach((el) => {
    if (isElementVisible(el)) {
      const id = `el-${idCounter++}`;
      elementMap.set(id, el);
      elements.push(createElementData(el, id, true));
    }
  });

  // Store mapping for later use
  (window as any).__aiAgentElementMap = elementMap;

  return {
    url: window.location.href,
    title: document.title,
    timestamp: Date.now(),
    elements,
    pageText: extractMainContent(),
  };
}

function isElementVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    rect.top < window.innerHeight &&
    rect.bottom > 0
  );
}

function createElementData(el: Element, id: string, isInteractive: boolean) {
  const rect = el.getBoundingClientRect();
  return {
    id,
    tagName: el.tagName.toLowerCase(),
    role: el.getAttribute('role'),
    text: (el.textContent || '').trim().slice(0, 100),
    attributes: {
      id: el.id || undefined,
      className: el.className || undefined,
      href: el.getAttribute('href') || undefined,
      type: el.getAttribute('type') || undefined,
      placeholder: el.getAttribute('placeholder') || undefined,
      ariaLabel: el.getAttribute('aria-label') || undefined,
      name: el.getAttribute('name') || undefined,
    },
    isInteractive,
    isVisible: true,
    boundingBox: {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    },
  };
}

function extractMainContent(): string {
  const main = document.querySelector('main, article, [role="main"]') || document.body;
  return ((main as HTMLElement).innerText || '').slice(0, 2000);
}

/**
 * Click an element by ID or selector
 */
function clickElement(target: string): MessageResponse {
  const elementMap = (window as any).__aiAgentElementMap as Map<string, Element>;
  let element = elementMap?.get(target);

  if (!element) {
    element = document.querySelector(target) as Element;
  }

  if (!element) {
    return { success: false, error: `Element not found: ${target}` };
  }

  // Scroll into view
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Highlight briefly
  const htmlEl = element as HTMLElement;
  const originalOutline = htmlEl.style.outline;
  htmlEl.style.outline = '3px solid #4CAF50';

  setTimeout(() => {
    htmlEl.style.outline = originalOutline;
    htmlEl.click();
  }, 300);

  return { success: true, data: { clicked: target } };
}

/**
 * Fill a form element
 */
function fillElement(target: string, value: string): MessageResponse {
  const elementMap = (window as any).__aiAgentElementMap as Map<string, Element>;
  let element = elementMap?.get(target) || document.querySelector(target);

  if (!element) {
    return { success: false, error: `Element not found: ${target}` };
  }

  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
    return { success: false, error: 'Element is not a form field' };
  }

  element.focus();
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));

  return { success: true, data: { filled: target, value } };
}

/**
 * Scroll the page
 */
function scrollPage(value: any): MessageResponse {
  const direction = typeof value === 'string' ? value : value?.direction;
  const amount = value?.amount || 400;

  switch (direction) {
    case 'down':
      window.scrollBy({ top: amount, behavior: 'smooth' });
      break;
    case 'up':
      window.scrollBy({ top: -amount, behavior: 'smooth' });
      break;
    case 'top':
      window.scrollTo({ top: 0, behavior: 'smooth' });
      break;
    case 'bottom':
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      break;
    default:
      return { success: false, error: `Unknown scroll direction: ${direction}` };
  }

  return { success: true, data: { scrolled: direction } };
}

/**
 * Apply UI modification
 */
function applyModification(value: any): MessageResponse {
  const { type, selector, scale, enabled } = value;

  switch (type) {
    case 'enlarge-text':
      return injectStyle('ai-agent-enlarge', `
        ${selector || 'body'} { font-size: ${scale || 1.5}em !important; }
      `);

    case 'bold-text':
      return injectStyle('ai-agent-bold', `
        ${selector || 'body'} p, ${selector || 'body'} span { font-weight: 600 !important; }
      `);

    case 'high-contrast':
      if (enabled !== false) {
        return injectStyle('ai-agent-contrast', `
          body { filter: contrast(1.2) !important; }
          a { color: #0000EE !important; text-decoration: underline !important; }
        `);
      } else {
        removeStyle('ai-agent-contrast');
        return { success: true };
      }

    case 'highlight-links':
      if (enabled !== false) {
        return injectStyle('ai-agent-links', `
          a[href] { background-color: rgba(255,255,0,0.3) !important; padding: 2px 4px !important; }
        `);
      } else {
        removeStyle('ai-agent-links');
        return { success: true };
      }

    case 'reset':
      document.querySelectorAll('style[id^="ai-agent-"]').forEach(el => el.remove());
      return { success: true, data: { reset: true } };

    default:
      return { success: false, error: `Unknown modification type: ${type}` };
  }
}

function injectStyle(id: string, css: string): MessageResponse {
  removeStyle(id);
  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
  return { success: true, data: { styleId: id } };
}

function removeStyle(id: string): void {
  document.getElementById(id)?.remove();
}

console.log('[AI Browser Agent] Content script loaded');
