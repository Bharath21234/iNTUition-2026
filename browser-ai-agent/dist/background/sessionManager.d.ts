/**
 * Session Manager - Manages conversation state per tab
 */
import type { ChatMessage, SimplifiedDOM, ActionPayload } from '@shared/types/messages';
export interface Session {
    id: string;
    tabId: number;
    messages: ChatMessage[];
    domContext: SimplifiedDOM | null;
    actionHistory: Array<{
        action: ActionPayload;
        success: boolean;
        timestamp: number;
    }>;
    pendingClarification: string | null;
    createdAt: number;
    lastActivityAt: number;
}
export declare class SessionManager {
    private sessions;
    private readonly maxSessions;
    private readonly sessionTimeout;
    /**
     * Get or create a session for a tab
     */
    getOrCreateSession(tabId: number): SessionWrapper;
    /**
     * Get an existing session
     */
    getSession(tabId: number): SessionWrapper | null;
    /**
     * Remove a session
     */
    removeSession(tabId: number): void;
    /**
     * Clean up old sessions to prevent memory leaks
     */
    private cleanupOldSessions;
}
/**
 * Wrapper class for easier session manipulation
 */
export declare class SessionWrapper {
    private session;
    constructor(session: Session);
    get id(): string;
    get tabId(): number;
    get messages(): ChatMessage[];
    get domContext(): SimplifiedDOM | null;
    get pendingClarification(): string | null;
    /**
     * Add a message to the session
     */
    addMessage(message: ChatMessage): void;
    /**
     * Update DOM context
     */
    setDOMContext(context: SimplifiedDOM): void;
    /**
     * Record an action execution
     */
    recordAction(action: ActionPayload, success: boolean): void;
    /**
     * Set pending clarification response
     */
    setClarification(answer: string): void;
    /**
     * Clear pending clarification
     */
    clearClarification(): void;
    /**
     * Get recent action history for context
     */
    getRecentActions(count?: number): Session['actionHistory'];
    /**
     * Get conversation history for AI context
     */
    getConversationContext(maxMessages?: number): ChatMessage[];
}
//# sourceMappingURL=sessionManager.d.ts.map