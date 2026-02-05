/**
 * Service Worker - Background script for the AI Browser Agent extension
 * Orchestrates the pipeline and handles message routing
 */

import {
  MessageType,
  ExtensionMessage,
  MessageResponse,
  createMessage,
} from '@shared/types/messages';
import { ExtensionSettings, DEFAULT_SETTINGS } from '@shared/types/pipeline';
import { processPipeline } from './pipeline';
import { SessionManager } from './sessionManager';

// Initialize session manager
const sessionManager = new SessionManager();

// Current settings (loaded on startup)
let settings: ExtensionSettings = DEFAULT_SETTINGS;

/**
 * Load settings from storage
 */
async function loadSettings(): Promise<void> {
  try {
    const stored = await chrome.storage.local.get([
      'provider',
      'apiKey',
      'intentModel',
      'codeGenModel',
      'maxRetries',
      'confirmDestructive',
      'audioFeedback',
      'theme',
    ]);

    settings = {
      ...DEFAULT_SETTINGS,
      ...stored,
    };

    console.log('[Background] Settings loaded');
  } catch (error) {
    console.error('[Background] Failed to load settings:', error);
  }
}

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Background] Extension installed');
  await loadSettings();

  // Set up side panel behavior
  if (chrome.sidePanel) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }
});

/**
 * Handle extension startup
 */
chrome.runtime.onStartup.addListener(async () => {
  console.log('[Background] Extension started');
  await loadSettings();
});

/**
 * Handle messages from content scripts and UI
 */
chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ): boolean => {
    // Handle the message asynchronously
    handleMessage(message, sender)
      .then(sendResponse)
      .catch((error) => {
        console.error('[Background] Message handling error:', error);
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });

    // Return true to indicate async response
    return true;
  }
);

/**
 * Process incoming messages
 */
async function handleMessage(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender
): Promise<MessageResponse> {
  const tabId = sender.tab?.id;

  console.log('[Background] Received message:', message.type);

  switch (message.type) {
    case MessageType.PING:
      return { success: true, data: 'pong' };

    case MessageType.PROCESS_COMMAND:
      return handleProcessCommand(message as any, tabId);

    case MessageType.CLARIFICATION_RESPONSE:
      return handleClarificationResponse(message as any, tabId);

    case MessageType.GET_SETTINGS:
      return { success: true, data: settings };

    case MessageType.SETTINGS_UPDATED:
      await loadSettings();
      return { success: true };

    default:
      return { success: false, error: `Unknown message type: ${message.type}` };
  }
}

/**
 * Handle a user command through the pipeline
 */
async function handleProcessCommand(
  message: ExtensionMessage & { payload: { command: string; tabId?: number } },
  tabId?: number
): Promise<MessageResponse> {
  const { command } = message.payload;
  const effectiveTabId = message.payload.tabId || tabId;

  if (!effectiveTabId) {
    return { success: false, error: 'No tab ID available' };
  }

  // Ensure settings are loaded (service worker may have restarted)
  if (!settings.apiKey) {
    await loadSettings();
  }

  if (!settings.apiKey) {
    return {
      success: false,
      error: 'API key not configured. Please set up your API key in the extension settings.',
    };
  }

  try {
    // Get or create session for this tab
    const session = sessionManager.getOrCreateSession(effectiveTabId);

    // Add user message to session
    session.addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: command,
      timestamp: Date.now(),
    });

    // Process through the pipeline
    const result = await processPipeline(command, effectiveTabId, settings, session);

    // Add assistant response to session
    session.addMessage({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: result.message,
      timestamp: Date.now(),
      actions: result.actions,
      isError: !result.success,
    });

    return {
      success: result.success,
      data: {
        message: result.message,
        actions: result.actions,
        requiresClarification: result.requiresClarification,
        clarificationQuestion: result.clarificationQuestion,
      },
    };
  } catch (error) {
    console.error('[Background] Pipeline error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Pipeline processing failed',
    };
  }
}

/**
 * Handle clarification response from user
 */
async function handleClarificationResponse(
  message: ExtensionMessage & { payload: { answer: string } },
  tabId?: number
): Promise<MessageResponse> {
  if (!tabId) {
    return { success: false, error: 'No tab ID available' };
  }

  const session = sessionManager.getSession(tabId);
  if (!session) {
    return { success: false, error: 'No active session found' };
  }

  // Store clarification and resume pipeline
  session.setClarification(message.payload.answer);

  // Continue processing would be handled by the pipeline
  // For now, return success
  return { success: true };
}

// Export for testing
export { handleMessage, loadSettings };
