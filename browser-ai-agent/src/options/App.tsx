/**
 * Options Page App Component
 */

import React, { useState, useEffect } from 'react';
import { MessageType } from '@shared/types/messages';
import { ExtensionSettings, DEFAULT_SETTINGS, AIProvider } from '@shared/types/pipeline';

export function App() {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
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
      setSettings({ ...DEFAULT_SETTINGS, ...stored });
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async function saveSettings() {
    setSaveStatus('saving');
    try {
      await chrome.storage.local.set(settings);
      await chrome.runtime.sendMessage({ type: MessageType.SETTINGS_UPDATED });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus('error');
    }
  }

  function updateSetting<K extends keyof ExtensionSettings>(key: K, value: ExtensionSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="options-container">
      <header>
        <h1>AI Browser Agent Settings</h1>
      </header>

      <section className="settings-section">
        <h2>AI Provider</h2>
        <div className="form-group">
          <label>Provider</label>
          <select
            value={settings.provider}
            onChange={(e) => updateSetting('provider', e.target.value as AIProvider)}
          >
            <option value="claude">Claude (Anthropic)</option>
            <option value="openai">OpenAI</option>
          </select>
        </div>
      </section>

      <section className="settings-section">
        <h2>API Key</h2>
        <div className="form-group">
          <label>
            {settings.provider === 'claude' ? 'Anthropic API Key' : 'OpenAI API Key'}
          </label>
          <div className="api-key-input">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={settings.apiKey}
              onChange={(e) => updateSetting('apiKey', e.target.value)}
              placeholder={`Enter your ${settings.provider === 'claude' ? 'Anthropic' : 'OpenAI'} API key`}
            />
            <button
              type="button"
              className="toggle-visibility"
              onClick={() => setShowApiKey(!showApiKey)}
            >
              {showApiKey ? '🙈' : '👁️'}
            </button>
          </div>
          <p className="help-text">
            {settings.provider === 'claude' ? (
              <>Get your API key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">console.anthropic.com</a></>
            ) : (
              <>Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">platform.openai.com</a></>
            )}
          </p>
        </div>
      </section>

      <section className="settings-section">
        <h2>Models</h2>
        <div className="form-group">
          <label>Intent Analysis Model (fast, cheap)</label>
          <select
            value={settings.intentModel}
            onChange={(e) => updateSetting('intentModel', e.target.value)}
          >
            {settings.provider === 'claude' ? (
              <>
                <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
              </>
            ) : (
              <>
                <option value="gpt-4o-mini">GPT-4o Mini</option>
              </>
            )}
          </select>
        </div>

        <div className="form-group">
          <label>Code Generation Model (powerful)</label>
          <select
            value={settings.codeGenModel}
            onChange={(e) => updateSetting('codeGenModel', e.target.value)}
          >
            {settings.provider === 'claude' ? (
              <>
                <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
                <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
              </>
            ) : (
              <>
                <option value="gpt-4o">GPT-4o</option>
              </>
            )}
          </select>
        </div>
      </section>

      <section className="settings-section">
        <h2>Behavior</h2>
        <div className="form-group">
          <label>Max Retry Attempts</label>
          <input
            type="number"
            min="1"
            max="5"
            value={settings.maxRetries}
            onChange={(e) => updateSetting('maxRetries', parseInt(e.target.value, 10))}
          />
        </div>

        <div className="form-group checkbox">
          <label>
            <input
              type="checkbox"
              checked={settings.confirmDestructive}
              onChange={(e) => updateSetting('confirmDestructive', e.target.checked)}
            />
            Confirm before destructive actions (delete, purchase, etc.)
          </label>
        </div>

        <div className="form-group checkbox">
          <label>
            <input
              type="checkbox"
              checked={settings.audioFeedback}
              onChange={(e) => updateSetting('audioFeedback', e.target.checked)}
            />
            Audio feedback on action completion
          </label>
        </div>
      </section>

      <footer className="settings-footer">
        <button onClick={saveSettings} disabled={saveStatus === 'saving'}>
          {saveStatus === 'saving' ? 'Saving...' : 'Save Settings'}
        </button>
        {saveStatus === 'saved' && <span className="success">Settings saved!</span>}
        {saveStatus === 'error' && <span className="error">Failed to save</span>}
      </footer>
    </div>
  );
}
