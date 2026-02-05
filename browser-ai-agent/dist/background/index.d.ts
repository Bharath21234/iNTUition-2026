/**
 * Service Worker - Background script for the AI Browser Agent extension
 * Orchestrates the pipeline and handles message routing
 */
import { ExtensionMessage, MessageResponse } from '@shared/types/messages';
/**
 * Load settings from storage
 */
declare function loadSettings(): Promise<void>;
/**
 * Process incoming messages
 */
declare function handleMessage(message: ExtensionMessage, sender: chrome.runtime.MessageSender): Promise<MessageResponse>;
export { handleMessage, loadSettings };
//# sourceMappingURL=index.d.ts.map