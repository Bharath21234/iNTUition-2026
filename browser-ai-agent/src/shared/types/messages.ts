/**
 * Message types for communication between extension components
 */

export enum MessageType {
  // Pipeline messages
  PROCESS_COMMAND = 'PROCESS_COMMAND',
  COMMAND_RESULT = 'COMMAND_RESULT',

  // DOM operations
  GET_DOM_CONTEXT = 'GET_DOM_CONTEXT',
  DOM_CONTEXT_RESPONSE = 'DOM_CONTEXT_RESPONSE',

  // Action execution
  EXECUTE_ACTION = 'EXECUTE_ACTION',
  ACTION_RESULT = 'ACTION_RESULT',

  // Clarification
  CLARIFICATION_NEEDED = 'CLARIFICATION_NEEDED',
  CLARIFICATION_RESPONSE = 'CLARIFICATION_RESPONSE',

  // Settings
  GET_SETTINGS = 'GET_SETTINGS',
  SETTINGS_RESPONSE = 'SETTINGS_RESPONSE',
  SETTINGS_UPDATED = 'SETTINGS_UPDATED',

  // Status
  STATUS_UPDATE = 'STATUS_UPDATE',
  ERROR = 'ERROR',

  // Ping/pong for connection check
  PING = 'PING',
  PONG = 'PONG',
}

export interface BaseMessage {
  type: MessageType;
  timestamp: number;
  correlationId?: string;
}

export interface ProcessCommandMessage extends BaseMessage {
  type: MessageType.PROCESS_COMMAND;
  payload: {
    command: string;
    tabId?: number;
  };
}

export interface CommandResultMessage extends BaseMessage {
  type: MessageType.COMMAND_RESULT;
  payload: {
    success: boolean;
    message: string;
    error?: string;
  };
}

export interface GetDOMContextMessage extends BaseMessage {
  type: MessageType.GET_DOM_CONTEXT;
}

export interface DOMContextResponseMessage extends BaseMessage {
  type: MessageType.DOM_CONTEXT_RESPONSE;
  payload: {
    success: boolean;
    context?: SimplifiedDOM;
    error?: string;
  };
}

export interface ExecuteActionMessage extends BaseMessage {
  type: MessageType.EXECUTE_ACTION;
  payload: ActionPayload;
}

export interface ActionResultMessage extends BaseMessage {
  type: MessageType.ACTION_RESULT;
  payload: {
    success: boolean;
    message?: string;
    error?: string;
    requiresRetry?: boolean;
  };
}

export interface ClarificationNeededMessage extends BaseMessage {
  type: MessageType.CLARIFICATION_NEEDED;
  payload: {
    question: string;
    options?: string[];
  };
}

export interface ClarificationResponseMessage extends BaseMessage {
  type: MessageType.CLARIFICATION_RESPONSE;
  payload: {
    answer: string;
  };
}

export interface StatusUpdateMessage extends BaseMessage {
  type: MessageType.STATUS_UPDATE;
  payload: {
    status: 'idle' | 'processing' | 'executing' | 'verifying' | 'error';
    message?: string;
  };
}

export interface ErrorMessage extends BaseMessage {
  type: MessageType.ERROR;
  payload: {
    error: string;
    code?: string;
  };
}

export type ExtensionMessage =
  | ProcessCommandMessage
  | CommandResultMessage
  | GetDOMContextMessage
  | DOMContextResponseMessage
  | ExecuteActionMessage
  | ActionResultMessage
  | ClarificationNeededMessage
  | ClarificationResponseMessage
  | StatusUpdateMessage
  | ErrorMessage
  | BaseMessage;

export interface MessageResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

// Helper to create messages with timestamp
export function createMessage<T extends ExtensionMessage>(
  type: T['type'],
  payload?: T extends { payload: infer P } ? P : never
): T {
  return {
    type,
    timestamp: Date.now(),
    correlationId: crypto.randomUUID(),
    ...(payload && { payload }),
  } as T;
}

// DOM types
export interface SimplifiedElement {
  id: string;
  tagName: string;
  role: string | null;
  text: string;
  attributes: {
    id?: string;
    className?: string;
    href?: string;
    type?: string;
    placeholder?: string;
    ariaLabel?: string;
    name?: string;
    value?: string;
  };
  isInteractive: boolean;
  isVisible: boolean;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface SimplifiedDOM {
  url: string;
  title: string;
  timestamp: number;
  elements: SimplifiedElement[];
  pageText: string;
}

// Action types
export interface ActionPayload {
  type: 'click' | 'fill' | 'scroll' | 'navigate' | 'extract' | 'modify';
  target?: string;
  value?: string | Record<string, unknown>;
  description?: string;
  verification?: {
    type: 'domChange' | 'navigation' | 'styleChange';
    expectedResult: string;
  };
}

// Chat message for UI
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  actions?: ActionPayload[];
  isError?: boolean;
}
