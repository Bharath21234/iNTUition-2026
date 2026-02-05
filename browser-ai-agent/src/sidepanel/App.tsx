/**
 * Main App Component for the Sidebar Panel
 */

import React, { useState, useRef, useEffect } from 'react';
import { MessageType, ChatMessage, createMessage } from '@shared/types/messages';

export function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>('Ready');
  const [isConnected, setIsConnected] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check connection on mount
  useEffect(() => {
    checkConnection();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function checkConnection() {
    try {
      await chrome.runtime.sendMessage({ type: MessageType.PING });
      setIsConnected(true);
    } catch {
      setIsConnected(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);
    setStatus('Processing...');

    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      const response = await chrome.runtime.sendMessage({
        type: MessageType.PROCESS_COMMAND,
        payload: {
          command: userMessage.content,
          tabId: tab?.id,
        },
        timestamp: Date.now(),
      });

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.data?.message || response.error || 'No response',
        timestamp: Date.now(),
        isError: !response.success,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Handle clarification if needed
      if (response.data?.requiresClarification) {
        setStatus('Waiting for clarification...');
      } else {
        setStatus('Ready');
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
      setStatus('Error');
    } finally {
      setIsProcessing(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function openSettings() {
    chrome.runtime.openOptionsPage();
  }

  return (
    <div className="app">
      <header className="header">
        <h1>AI Browser Agent</h1>
        <button className="settings-btn" onClick={openSettings} title="Settings">
          ⚙️
        </button>
      </header>

      <div className="status-bar">
        <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
        <span className="status-text">{status}</span>
      </div>

      <div className="messages">
        {messages.length === 0 && (
          <div className="welcome">
            <p>Hi! I can help you interact with this webpage.</p>
            <p className="examples">Try:</p>
            <ul>
              <li>"scroll down"</li>
              <li>"click the login button"</li>
              <li>"fill the email field with test@example.com"</li>
              <li>"make text larger"</li>
            </ul>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role} ${msg.isError ? 'error' : ''}`}>
            <div className="message-content">{msg.content}</div>
            <div className="message-time">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      <form className="input-area" onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What would you like me to do?"
          disabled={isProcessing}
          rows={2}
        />
        <button type="submit" disabled={isProcessing || !input.trim()}>
          {isProcessing ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
