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

export class SessionManager {
  private sessions: Map<number, Session> = new Map();
  private readonly maxSessions = 50;
  private readonly sessionTimeout = 30 * 60 * 1000; // 30 minutes

  /**
   * Get or create a session for a tab
   */
  getOrCreateSession(tabId: number): SessionWrapper {
    let session = this.sessions.get(tabId);

    if (!session) {
      session = {
        id: crypto.randomUUID(),
        tabId,
        messages: [],
        domContext: null,
        actionHistory: [],
        pendingClarification: null,
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
      };
      this.sessions.set(tabId, session);
      this.cleanupOldSessions();
    } else {
      session.lastActivityAt = Date.now();
    }

    return new SessionWrapper(session);
  }

  /**
   * Get an existing session
   */
  getSession(tabId: number): SessionWrapper | null {
    const session = this.sessions.get(tabId);
    if (!session) return null;

    session.lastActivityAt = Date.now();
    return new SessionWrapper(session);
  }

  /**
   * Remove a session
   */
  removeSession(tabId: number): void {
    this.sessions.delete(tabId);
  }

  /**
   * Clean up old sessions to prevent memory leaks
   */
  private cleanupOldSessions(): void {
    const now = Date.now();

    // Remove expired sessions
    for (const [tabId, session] of this.sessions) {
      if (now - session.lastActivityAt > this.sessionTimeout) {
        this.sessions.delete(tabId);
      }
    }

    // If still too many sessions, remove oldest
    if (this.sessions.size > this.maxSessions) {
      const sortedSessions = [...this.sessions.entries()].sort(
        (a, b) => a[1].lastActivityAt - b[1].lastActivityAt
      );

      const toRemove = sortedSessions.slice(0, this.sessions.size - this.maxSessions);
      for (const [tabId] of toRemove) {
        this.sessions.delete(tabId);
      }
    }
  }
}

/**
 * Wrapper class for easier session manipulation
 */
export class SessionWrapper {
  constructor(private session: Session) {}

  get id(): string {
    return this.session.id;
  }

  get tabId(): number {
    return this.session.tabId;
  }

  get messages(): ChatMessage[] {
    return this.session.messages;
  }

  get domContext(): SimplifiedDOM | null {
    return this.session.domContext;
  }

  get pendingClarification(): string | null {
    return this.session.pendingClarification;
  }

  /**
   * Add a message to the session
   */
  addMessage(message: ChatMessage): void {
    this.session.messages.push(message);

    // Limit message history to prevent context overflow
    if (this.session.messages.length > 100) {
      this.session.messages = this.session.messages.slice(-50);
    }
  }

  /**
   * Update DOM context
   */
  setDOMContext(context: SimplifiedDOM): void {
    this.session.domContext = context;
  }

  /**
   * Record an action execution
   */
  recordAction(action: ActionPayload, success: boolean): void {
    this.session.actionHistory.push({
      action,
      success,
      timestamp: Date.now(),
    });

    // Limit action history
    if (this.session.actionHistory.length > 50) {
      this.session.actionHistory = this.session.actionHistory.slice(-30);
    }
  }

  /**
   * Set pending clarification response
   */
  setClarification(answer: string): void {
    this.session.pendingClarification = answer;
  }

  /**
   * Clear pending clarification
   */
  clearClarification(): void {
    this.session.pendingClarification = null;
  }

  /**
   * Get recent action history for context
   */
  getRecentActions(count: number = 5): Session['actionHistory'] {
    return this.session.actionHistory.slice(-count);
  }

  /**
   * Get conversation history for AI context
   */
  getConversationContext(maxMessages: number = 10): ChatMessage[] {
    return this.session.messages.slice(-maxMessages);
  }
}
