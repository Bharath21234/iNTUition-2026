/**
 * Dashboard Integration Orchestrator
 * Connects all features: TTS, STT, DOM Description, Voice Workflow, Accessibility Toggles
 * Does NOT modify the Browser AI Agent - only communicates via message passing.
 */
(function () {
  'use strict';

  // =============================================
  // SECTION 1: TAB NAVIGATION
  // =============================================

  const navTabs = document.querySelectorAll('.nav-tab');
  const tabPanels = document.querySelectorAll('.tab-panel');
  const navBar = document.getElementById('dashboard-nav');
  const onboardingPanel = document.getElementById('tab-gettoknowyou');
  const gtkyCategoryView = document.getElementById('gtky-category-view');
  const gtkyDetailView = document.getElementById('gtky-detail-view');
  const gtkyDetailTitle = document.getElementById('gtky-detail-title');
  const gtkyDetailOptions = document.getElementById('gtky-detail-options');
  const gtkyBackBtn = document.getElementById('gtky-back-btn');

  function switchTab(targetTab) {
    navTabs.forEach(function (t) { t.classList.remove('active'); });
    tabPanels.forEach(function (p) {
      p.style.display = 'none';
      p.classList.remove('active');
    });

    var activeTab = Array.from(navTabs).find(function (t) {
      return t.dataset.tab === targetTab;
    });
    if (activeTab) {
      activeTab.classList.add('active');
    }

    var panel = document.getElementById('tab-' + targetTab);
    if (panel) {
      panel.style.display = 'block';
      panel.classList.add('active');
    }
  }

  function showOnboarding() {
    if (navBar) navBar.style.display = 'none';
    tabPanels.forEach(function (p) {
      p.style.display = 'none';
      p.classList.remove('active');
    });
    if (onboardingPanel) {
      onboardingPanel.style.display = 'block';
      onboardingPanel.classList.add('active');
    }
  }

  function showAgentTab() {
    if (navBar) navBar.style.display = 'flex';
    switchTab('agent');
  }

  function showVoiceTab() {
    if (navBar) navBar.style.display = 'flex';
    switchTab('voice');
  }

  navTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var targetTab = tab.dataset.tab;
      switchTab(targetTab);
    });
  });

  // =============================================
  // SECTION 1.5: GET TO KNOW YOU (ONBOARDING)
  // Flow: API Key Setup -> Impairment Category -> Detail -> Completed
  // Stores preferences in chrome.storage.sync
  // =============================================

  var BASE_PREFERENCES = {
    'mode-adhd': false,
    'mode-calm': false,
    'mode-cognitive': false,
    'mode-contrast': false,
    'mode-dyslexia': false,
    'mode-large-text': false,
    'mode-neon': false,
    'mode-neuro': false,
    'mode-seizure': false,
    // Color blindness modes (mutually exclusive)
    'mode-deuteranopia': false,
    'mode-protanopia': false,
    'mode-tritanopia': false,
    'mode-achromatopsia': false
  };

  var GTKY_OPTIONS = {
    visual: {
      title: 'Visual impairment',
      options: [
        {
          id: 'blindness-complete',
          label: 'Blindness (complete)',
          prefs: { 'mode-contrast': false, 'mode-large-text': false, 'mode-neon': false }
        },
        {
          id: 'low-vision',
          label: 'Low vision',
          prefs: { 'mode-large-text': true, 'mode-contrast': true }
        },
        {
          id: 'deuteranopia',
          label: 'Deuteranopia (red-green)',
          prefs: { 'mode-deuteranopia': true }
        },
        {
          id: 'protanopia',
          label: 'Protanopia (red-cone)',
          prefs: { 'mode-protanopia': true }
        },
        {
          id: 'tritanopia',
          label: 'Tritanopia (blue-yellow)',
          prefs: { 'mode-tritanopia': true }
        },
        {
          id: 'achromatopsia',
          label: 'Achromatopsia (grayscale)',
          prefs: { 'mode-achromatopsia': true }
        },
        {
          id: 'light-sensitivity',
          label: 'Sensitivity to light',
          prefs: { 'mode-calm': true, 'mode-seizure': true }
        }
      ]
    },
    auditory: {
      title: 'Auditory impairment',
      options: [
        {
          id: 'deafness',
          label: 'Deafness',
          prefs: { 'mode-neon': true }
        },
        {
          id: 'auditory-difficulty',
          label: 'Auditory difficulty',
          prefs: { 'mode-neon': true }
        }
      ]
    },
    motor: {
      title: 'Motor impairment',
      options: [
        {
          id: 'limited-hand-mobility',
          label: 'Limited hand mobility',
          prefs: { 'mode-neon': true, 'mode-contrast': true }
        }
      ]
    },
    cognitive: {
      title: 'Cognitive impairment',
      options: [
        {
          id: 'dyslexia',
          label: 'Dyslexia',
          prefs: { 'mode-dyslexia': true, 'mode-neuro': true }
        },
        {
          id: 'adhd',
          label: 'ADHD',
          prefs: { 'mode-adhd': true, 'mode-calm': true }
        }
      ]
    }
  };

  function buildPreferences(prefsOverride) {
    var prefs = Object.assign({}, BASE_PREFERENCES);
    Object.keys(prefsOverride || {}).forEach(function (key) {
      prefs[key] = prefsOverride[key];
    });
    return prefs;
  }

  function updateAccessibilityTogglesFromPrefs(prefs) {
    if (!accessibilityToggles || !accessibilityToggles.forEach) return;
    accessibilityToggles.forEach(function (item) {
      var toggle = document.getElementById(item.dashId);
      if (toggle) {
        toggle.checked = !!prefs[item.storageKey];
      }
    });
  }

  function enableVoiceWorkflow() {
    if (!voiceWorkflowToggle) return;
    if (!voiceWorkflowToggle.checked) {
      voiceWorkflowToggle.checked = true;
      voiceWorkflowToggle.dispatchEvent(new Event('change'));
    }
  }

  function enableVoiceCommands() {
    if (!voiceCommandsToggle) return;
    if (!voiceCommandsToggle.checked) {
      voiceCommandsToggle.checked = true;
      voiceCommandsToggle.dispatchEvent(new Event('change'));
    }
  }

  function saveOnboardingPreferences(prefs, options) {
    chrome.storage.sync.set({ preferences: prefs }, function () {
      updateAccessibilityTogglesFromPrefs(prefs);
      applyAccessibilityToActiveTab();
      if (options && (options.enableWorkflow || options.enableCommands)) {
        showVoiceTab();
        if (options.enableWorkflow) {
          enableVoiceWorkflow();
        } else if (options.enableCommands) {
          enableVoiceCommands();
        }
      } else {
        showAgentTab();
      }
    });
  }

  // --- Onboarding Elements ---
  var gtkyApiKeyView = document.getElementById('gtky-apikey-view');
  var onboardingGrokKey = document.getElementById('onboarding-grok-key');
  var onboardingClaudeKey = document.getElementById('onboarding-claude-key');
  var onboardingNextBtn = document.getElementById('onboarding-next-btn');
  var onboardingSkipLink = document.getElementById('onboarding-skip-link');

  function showApiKeyView() {
    if (gtkyApiKeyView) gtkyApiKeyView.style.display = 'block';
    if (gtkyCategoryView) gtkyCategoryView.style.display = 'none';
    if (gtkyDetailView) gtkyDetailView.style.display = 'none';
  }

  function showCategoryView() {
    if (gtkyApiKeyView) gtkyApiKeyView.style.display = 'none';
    if (gtkyCategoryView) gtkyCategoryView.style.display = 'block';
    if (gtkyDetailView) gtkyDetailView.style.display = 'none';
  }

  function showDetailView(categoryKey) {
    if (!GTKY_OPTIONS[categoryKey]) return;
    var data = GTKY_OPTIONS[categoryKey];
    if (gtkyDetailTitle) gtkyDetailTitle.textContent = data.title;
    if (gtkyDetailOptions) {
      gtkyDetailOptions.innerHTML = '';
      data.options.forEach(function (option) {
        var btn = document.createElement('button');
        btn.className = 'gtky-option';
        btn.textContent = option.label;
        btn.addEventListener('click', function () {
          var isBlindnessComplete = option.id === 'blindness-complete';
          var isMotorImpairment = categoryKey === 'motor';
          var prefs = buildPreferences((isBlindnessComplete || isMotorImpairment) ? {} : option.prefs);
          saveOnboardingPreferences(prefs, {
            enableWorkflow: isBlindnessComplete,
            enableCommands: isMotorImpairment
          });
        });
        gtkyDetailOptions.appendChild(btn);
      });
    }

    if (gtkyApiKeyView) gtkyApiKeyView.style.display = 'none';
    if (gtkyCategoryView) gtkyCategoryView.style.display = 'none';
    if (gtkyDetailView) gtkyDetailView.style.display = 'block';
  }

  if (gtkyBackBtn) {
    gtkyBackBtn.addEventListener('click', function () {
      showCategoryView();
    });
  }

  var gtkyCategoryButtons = document.querySelectorAll('[data-gtky-category]');
  gtkyCategoryButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      var categoryKey = button.dataset.gtkyCategory;
      showDetailView(categoryKey);
    });
  });

  // --- API Key Setup Logic ---
  if (onboardingNextBtn) {
    onboardingNextBtn.addEventListener('click', function () {
      var grokKey = onboardingGrokKey.value.trim();
      var claudeKey = onboardingClaudeKey.value.trim();

      var updates = {};
      if (grokKey) updates.grokApiKey = grokKey;
      if (claudeKey) updates.apiKey = claudeKey; // 'apiKey' corresponds to Claude/Provider key

      // Save keys if provided
      if (Object.keys(updates).length > 0) {
        chrome.storage.local.set(updates, function () {
          // Reload settings in background/UI to reflect changes
          if (typeof loadSettings === 'function') {
            loadSettings();
          }
          showCategoryView();
        });
      } else {
        // Just proceed if no keys (user implicitly skipping by clicking Next with empty fields)
        showCategoryView();
      }
    });
  }

  if (onboardingSkipLink) {
    onboardingSkipLink.addEventListener('click', function (e) {
      e.preventDefault();
      showCategoryView();
    });
  }

  // --- Main Logic ---
  chrome.storage.sync.get(['preferences'], function (result) {
    var prefs = result.preferences;
    if (prefs && Object.keys(prefs).length > 0) {
      showAgentTab();
    } else {
      showOnboarding();
      showApiKeyView(); // START HERE
    }
  });

  // =============================================
  // SECTION 2: TEXT TO SPEECH
  // Reuses exact logic from text-to-speech/sidepanel.js
  // API: window.speechSynthesis + SpeechSynthesisUtterance
  // =============================================

  var ttsSpeakBtn = document.getElementById('tts-speak-btn');
  var ttsStopBtn = document.getElementById('tts-stop-btn');
  var ttsTextArea = document.getElementById('tts-text-input');
  var ttsRateInput = document.getElementById('tts-rate-input');
  var ttsRateValue = document.getElementById('tts-rate-value');
  var ttsVoiceSelect = document.getElementById('tts-voice-select');

  var synth = window.speechSynthesis;
  var ttsVoices = [];
  var currentUtterance = null;

  // Populate voice list - filters for Microsoft George, fallback to all
  // (Same logic as text-to-speech/sidepanel.js populateVoices)
  function populateVoices() {
    var allVoices = synth.getVoices();
    ttsVoices = allVoices.filter(function (voice) {
      return voice.name.toLowerCase().includes('george');
    });

    ttsVoiceSelect.innerHTML = '';

    if (ttsVoices.length === 0) {
      ttsVoices = allVoices;
    }

    ttsVoices.forEach(function (voice, index) {
      var option = document.createElement('option');
      option.value = index;
      option.textContent = voice.name + ' (' + voice.lang + ')';
      ttsVoiceSelect.appendChild(option);
    });
  }

  if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = populateVoices;
  }
  populateVoices();

  // Update speed display (same as original)
  ttsRateInput.addEventListener('input', function (e) {
    ttsRateValue.textContent = e.target.value;
  });

  /**
   * speakText - Core TTS function
   * Same logic as text-to-speech/sidepanel.js speak handler
   * Added onEndCallback param for voice workflow integration
   */
  function speakText(text, onEndCallback) {
    if (!text) {
      if (onEndCallback) onEndCallback();
      return;
    }

    if (synth.speaking) {
      synth.cancel();
    }

    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.rate = parseFloat(ttsRateInput.value);
    currentUtterance.pitch = 1.0;

    var selectedVoiceIndex = ttsVoiceSelect.value;
    if (ttsVoices[selectedVoiceIndex]) {
      currentUtterance.voice = ttsVoices[selectedVoiceIndex];
    }

    currentUtterance.onstart = function () {
      ttsSpeakBtn.disabled = true;
      ttsStopBtn.disabled = false;
    };

    currentUtterance.onend = function () {
      ttsSpeakBtn.disabled = false;
      ttsStopBtn.disabled = true;
      if (onEndCallback) onEndCallback();
    };

    currentUtterance.onerror = function (event) {
      // Ignore "interrupted" or "canceled" errors as they are expected when stopping/interrupting
      if (event.error === 'interrupted' || event.error === 'canceled') {
        console.log('TTS Interrupted/Canceled');
      } else {
        console.error('Speech synthesis error:', event.error);
      }

      ttsSpeakBtn.disabled = false;
      ttsStopBtn.disabled = true;
      if (onEndCallback) onEndCallback();
    };

    synth.speak(currentUtterance);
  }

  // Speak button click (same as original)
  ttsSpeakBtn.addEventListener('click', function () {
    speakText(ttsTextArea.value.trim());
  });

  // Stop button click (same as original)
  ttsStopBtn.addEventListener('click', function () {
    if (synth.speaking) {
      synth.cancel();
    }
    ttsSpeakBtn.disabled = false;
    ttsStopBtn.disabled = true;
  });

  // =============================================
  // SECTION 3: SPEECH TO TEXT
  // Reuses exact logic from system_mic/sidepanel.js
  // API: webkitSpeechRecognition + AudioContext + Canvas
  // =============================================

  var sttToggleBtn = document.getElementById('stt-toggle-btn');
  var sttBtnText = document.getElementById('stt-btn-text');
  var sttMicIcon = document.getElementById('stt-mic-icon');
  var sttSubtitlesContainer = document.getElementById('stt-subtitles-container');
  var sttEmptyState = document.getElementById('stt-empty-state');

  var sttPermissionModal = document.getElementById('stt-permission-modal');
  var sttFixPermissionBtn = document.getElementById('stt-fix-permission-btn');

  var sttIsListening = false;
  var sttRecognition = null;

  var sttCurrentInterimBubble = null;

  // =============================================
  // =============================================
  // SECTION 3.5: WAKE WORD + TTS LEAKAGE FILTERING
  // Track what TTS is saying and filter it from STT results
  // to isolate user speech from TTS echo in microphone
  // =============================================

  var wakeWordInterrupted = false; // Flag to track if TTS was interrupted by wake word
  var isTTSSpeaking = false; // Track if TTS is currently speaking
  var currentTTSText = ''; // What the TTS is currently saying (for filtering)
  var ttsTextWords = []; // Words from TTS text for matching

  /**
   * Set the current TTS text for leakage filtering
   * Call this before speaking to track what's being said
   */
  function setTTSContext(text) {
    currentTTSText = text.toLowerCase();
    // Extract words for matching (remove punctuation, split)
    ttsTextWords = currentTTSText
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(function (w) { return w.length > 2; }); // Only words > 2 chars
    console.log('[TTS Filter] Tracking TTS words:', ttsTextWords.slice(0, 10).join(', ') + '...');
  }

  /**
   * Clear TTS context when speech ends
   */
  function clearTTSContext() {
    currentTTSText = '';
    ttsTextWords = [];
  }

  /**
   * Filter TTS leakage from speech recognition results
   * Returns the filtered text (what the user actually said, not TTS echo)
   */
  function filterTTSLeakage(transcript) {
    if (!isTTSSpeaking || ttsTextWords.length === 0) {
      return transcript; // No filtering needed
    }

    var words = transcript.toLowerCase().split(/\s+/);
    var filteredWords = [];

    for (var i = 0; i < words.length; i++) {
      var word = words[i].replace(/[^\w]/g, '');
      // Keep the word if it's NOT in the TTS text OR if it's a wake word
      if (word === 'buddy' || !ttsTextWords.includes(word)) {
        filteredWords.push(words[i]);
      }
    }

    var filtered = filteredWords.join(' ').trim();
    if (filtered !== transcript.trim()) {
      console.log('[TTS Filter] Filtered: "' + transcript + '" → "' + filtered + '"');
    }
    return filtered;
  }

  /**
   * Check if transcript contains wake word after filtering TTS leakage
   */
  function containsWakeWord(transcript) {
    var filtered = filterTTSLeakage(transcript);
    return filtered.toLowerCase().includes('buddy');
  }

  /**
   * Handle wake word detection - interrupt TTS and wait for command
   */
  function handleWakeWordDetected() {
    console.log('[WakeWord] "Buddy" detected! Interrupting TTS...');
    wakeWordInterrupted = true;
    isTTSSpeaking = false;
    clearTTSContext();

    // Stop TTS immediately
    if (synth.speaking) {
      synth.cancel();
    }

    // IMPORTANT: Stop current STT to clear the "Buddy" word buffer
    // so it doesn't get processed as a command
    stopSTT();

    updateStepIndicator('Yes? Listening for your command...');

    // Say "Yes?" briefly
    speakText('Yes?', function () {
      // Restart STT to listen for the ACTUAL command
      startSTT();
    });
  }

  // Speech Recognition Setup (same as system_mic/sidepanel.js setupRecognition)
  function setupRecognition() {
    if (!('webkitSpeechRecognition' in window)) {
      showSTTSystemMessage('Your browser does not support speech recognition.', 'error');
      return null;
    }

    var r = new webkitSpeechRecognition();
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'en-US';

    r.onstart = function () {
      sttIsListening = true;
      updateSTTUI(true);
      sttEmptyState.style.display = 'none';
    };

    r.onend = function () {
      if (sttIsListening) {
        try {
          r.start();
        } catch (e) {
          console.warn('Restart exception', e);
        }
      } else {
        updateSTTUI(false);
      }
    };

    r.onresult = function (event) {
      // Guard: If we stopped listening (e.g. interruption triggered), ignore further results
      // This prevents processing the wake word as a command
      if (!sttIsListening) return;

      var finalTranscript = '';
      var interimTranscript = '';

      for (var i = event.resultIndex; i < event.results.length; ++i) {
        var transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      updateSubtitles(finalTranscript, interimTranscript);

      // Check for "Vector" wake word during TTS playback (voice workflow)
      // Use TTS leakage filtering to isolate user speech from TTS echo
      if (voiceWorkflowActive && isTTSSpeaking) {
        var allText = interimTranscript + ' ' + finalTranscript;
        if (containsWakeWord(allText)) {
          handleWakeWordDetected();
          return; // Don't process as normal command
        }
      }

      // Voice workflow hook: when active and final transcript received, send to agent
      // Only process if NOT during TTS (or TTS was interrupted)
      if (finalTranscript && voiceWorkflowActive && !isTTSSpeaking) {
        stopSTT();
        voiceWorkflowSendCommand(finalTranscript.trim());
      }

      // Voice commands mode: simple speak → execute → speak result
      if (finalTranscript && voiceCommandsActive) {
        voiceCommandsSendCommand(finalTranscript.trim());
      }
    };

    r.onerror = function (event) {
      console.warn('Speech error:', event.error);
      if (event.error === 'not-allowed') {
        sttIsListening = false;
        updateSTTUI(false);
        showSTTPermissionModal();
      } else if (event.error === 'no-speech') {
        // Ignore silence
      } else {
        showSTTSystemMessage('Error: ' + event.error, 'error');
      }
    };

    return r;
  }





  // Update STT UI (same as system_mic/sidepanel.js updateUI)
  function updateSTTUI(active) {
    if (active) {
      sttBtnText.textContent = 'Pause Listening';
      sttToggleBtn.classList.add('active-state');
      sttMicIcon.innerHTML = '&#x23F8;&#xFE0F;';
    } else {
      sttBtnText.textContent = 'Start Listening';
      sttToggleBtn.classList.remove('active-state');
      sttMicIcon.innerHTML = '&#x1F3A4;';
    }
  }

  // Update Subtitles (same as system_mic/sidepanel.js updateSubtitles)
  function updateSubtitles(finalText, interimText) {
    if (finalText) {
      addSTTBubble(finalText, 'final');
      if (sttCurrentInterimBubble) {
        sttCurrentInterimBubble.remove();
        sttCurrentInterimBubble = null;
      }
    }

    if (interimText) {
      if (!sttCurrentInterimBubble) {
        sttCurrentInterimBubble = document.createElement('div');
        sttCurrentInterimBubble.className = 'bubble interim';
        sttSubtitlesContainer.appendChild(sttCurrentInterimBubble);
      }
      sttCurrentInterimBubble.textContent = interimText + '...';
      sttSubtitlesContainer.scrollTop = sttSubtitlesContainer.scrollHeight;
    } else {
      if (sttCurrentInterimBubble && !finalText) {
        sttCurrentInterimBubble.remove();
        sttCurrentInterimBubble = null;
      }
    }
  }

  function addSTTBubble(text, type) {
    var div = document.createElement('div');
    div.className = 'bubble ' + type;
    div.textContent = text;
    sttSubtitlesContainer.appendChild(div);
    sttSubtitlesContainer.scrollTop = sttSubtitlesContainer.scrollHeight;
  }

  function showSTTSystemMessage(msg, type) {
    var div = document.createElement('div');
    div.className = 'system-message ' + (type || 'info');
    div.textContent = msg;
    sttSubtitlesContainer.appendChild(div);
    sttSubtitlesContainer.scrollTop = sttSubtitlesContainer.scrollHeight;
  }

  function showSTTPermissionModal() {
    sttPermissionModal.classList.add('visible');
  }

  sttFixPermissionBtn.addEventListener('click', function () {
    chrome.tabs.create({ url: chrome.runtime.getURL('permission.html') });
    sttPermissionModal.classList.remove('visible');
  });

  // STT start/stop helpers
  /**
   * Request microphone permission explicitly
   * This triggers the browser's permission dialog
   */
  async function requestMicrophonePermission() {
    try {
      // Check current permission state first
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' });

      if (permissionStatus.state === 'granted') {
        return true; // Already have permission
      }

      if (permissionStatus.state === 'denied') {
        // Permission was previously denied, show the modal
        showSTTPermissionModal();
        return false;
      }

      // Permission state is 'prompt' - request it explicitly
      // This MUST be called to trigger the browser permission dialog
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately - we just needed to trigger the permission
      stream.getTracks().forEach(track => track.stop());
      return true;

    } catch (err) {
      console.error('Microphone permission request failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        showSTTPermissionModal();
      } else {
        showSTTSystemMessage('Microphone error: ' + err.message, 'error');
      }
      return false;
    }
  }

  async function startSTT() {
    if (sttRecognition && !sttIsListening) {
      // Request microphone permission FIRST - this triggers the browser dialog
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        return; // Don't start if we don't have permission
      }

      sttRecognition.start();
    }
  }

  function stopSTT() {
    if (sttIsListening) {
      sttIsListening = false;
      if (sttRecognition) sttRecognition.stop();
      updateSTTUI(false);
    }
  }

  // Canvas sizing (same as system_mic/sidepanel.js)


  // Initialize recognition
  sttRecognition = setupRecognition();

  // Toggle button (same as system_mic/sidepanel.js)
  sttToggleBtn.addEventListener('click', function () {
    if (sttIsListening) {
      stopSTT();
    } else {
      startSTT();
    }
  });

  // =============================================
  // SECTION 4: DOM DESCRIPTION
  // Uses dom-extractor content script for extraction,
  // then calls Claude/OpenAI API directly using stored API key
  // (replaces the Flask server proxy from dom/server.py)
  // Prompt derived from dom/sidepanel.js
  // =============================================

  var describePageBtn = document.getElementById('describe-page-btn');
  var pageDescriptionOutput = document.getElementById('page-description-output');

  /**
   * Get AI settings from chrome.storage.local
   * Same keys the agent uses: provider, apiKey, codeGenModel
   */
  function getAISettings() {
    return new Promise(function (resolve) {
      chrome.storage.local.get(['provider', 'apiKey', 'codeGenModel'], function (result) {
        resolve({
          provider: result.provider || 'claude',
          apiKey: result.apiKey || '',
          model: result.codeGenModel || 'claude-sonnet-4-20250514'
        });
      });
    });
  }

  /**
   * Call AI API directly from the sidepanel
   * Supports Claude, OpenAI, and Grok providers
   * Same API structure as the agent's background.js aiClient
   */
  async function callAI(provider, apiKey, model, systemPrompt, userMessage) {
    if (provider === 'claude') {
      var response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 500,
          temperature: 0.3,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }]
        })
      });
      if (!response.ok) throw new Error('Claude API error: ' + response.status);
      var data = await response.json();
      return data.content[0].text;
    } else if (provider === 'openai') {
      var resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 500,
          temperature: 0.3,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ]
        })
      });
      if (!resp.ok) throw new Error('OpenAI API error: ' + resp.status);
      var oData = await resp.json();
      return oData.choices[0].message.content;
    } else if (provider === 'grok') {
      // Fix for legacy default model name that causes 404
      var actualModel = model;
      if (model === 'grok-2-latest') {
        actualModel = 'grok-beta';
      }

      // Grok uses OpenAI-compatible API at api.x.ai
      var grokResp = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        },
        body: JSON.stringify({
          model: actualModel,
          max_tokens: 500,
          temperature: 0.3,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ]
        })
      });
      if (!grokResp.ok) throw new Error('Grok API error: ' + grokResp.status);
      var grokData = await grokResp.json();
      return grokData.choices[0].message.content;
    }
    throw new Error('Unknown provider: ' + provider);
  }

  /**
   * Extract DOM from active tab using the dom-extractor content script
   * Sends {action: 'extractDOM'} - handled by dom-extractor-content.js
   */
  async function extractDOMFromTab() {
    var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    var tab = tabs[0];
    if (!tab || !tab.id) throw new Error('No active tab');

    try {
      return await chrome.tabs.sendMessage(tab.id, {
        action: 'extractDOM',
        options: { includeHidden: false }
      });
    } catch (err) {
      // Content script may not be injected yet, try manual injection
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['dom-extractor-content.js']
      });
      await new Promise(function (r) { setTimeout(r, 200); });
      return await chrome.tabs.sendMessage(tab.id, {
        action: 'extractDOM',
        options: { includeHidden: false }
      });
    }
  }

  /**
   * Generate a page description using AI
   * Prompt derived from dom/sidepanel.js (lines 324-347)
   */
  async function describePageWithAI(extractedData) {
    var settings = await getAISettings();
    if (!settings.apiKey) {
      throw new Error('API key not configured. Set it in Extension Settings (options page).');
    }

    // Prepare compact version (same logic as dom/sidepanel.js lines 309-322)
    var pageContext = {
      title: extractedData.title,
      url: extractedData.url,
      structuredText: (extractedData.formats.structuredText || '').substring(0, 8000),
      interactiveElements: (extractedData.formats.interactiveElements || []).slice(0, 30).map(function (el) {
        return {
          type: el.type,
          text: (el.text || '').substring(0, 100)
        };
      }),
      semanticRegions: (extractedData.formats.semanticRegions || []).map(function (r) {
        return {
          type: r.type,
          label: r.label,
          preview: r.textPreview
        };
      })
    };

    // Same prompt structure as dom/sidepanel.js (lines 324-347)
    var systemPrompt = 'You are a screen reader assistant. Describe web pages concisely for users who cannot see the screen.';

    var userMessage = 'Based on the extracted DOM information below, provide a clear, concise description of what\'s displayed on this webpage.\n\n' +
      'The description should:\n' +
      '1. Start with what type of page/application this is\n' +
      '2. Describe the main content and purpose\n' +
      '3. List key sections and what they contain\n' +
      '4. Mention important interactive elements (buttons, links, forms)\n' +
      '5. Be easy to understand without seeing the actual page\n\n' +
      'Keep the description under 200 words. Use plain language.\n\n' +
      'PAGE TITLE: ' + pageContext.title + '\n' +
      'URL: ' + pageContext.url + '\n\n' +
      'SEMANTIC REGIONS:\n' + JSON.stringify(pageContext.semanticRegions, null, 2) + '\n\n' +
      'KEY INTERACTIVE ELEMENTS:\n' + JSON.stringify(pageContext.interactiveElements, null, 2) + '\n\n' +
      'STRUCTURED CONTENT (truncated):\n' + pageContext.structuredText.substring(0, 4000) + '\n\n' +
      'Provide a clean, human-readable description:';

    return await callAI(settings.provider, settings.apiKey, settings.model, systemPrompt, userMessage);
  }

  /**
   * Get Grok settings from chrome.storage.local
   * Used specifically for voice workflow
   */
  function getGrokSettings() {
    return new Promise(function (resolve) {
      chrome.storage.local.get(['grokApiKey', 'grokModel'], function (result) {
        resolve({
          apiKey: result.grokApiKey || '',
          model: result.grokModel || 'grok-2-latest'
        });
      });
    });
  }

  /**
   * Generate a page description for Voice Workflow
   * Uses Grok as primary, falls back to Claude if Grok fails
   */
  async function describePageForVoiceWorkflow(extractedData) {
    // Prepare the page context (same as describePageWithAI)
    var pageContext = {
      title: extractedData.title,
      url: extractedData.url,
      structuredText: (extractedData.formats.structuredText || '').substring(0, 8000),
      interactiveElements: (extractedData.formats.interactiveElements || []).slice(0, 30).map(function (el) {
        return {
          type: el.type,
          text: (el.text || '').substring(0, 100)
        };
      }),
      semanticRegions: (extractedData.formats.semanticRegions || []).map(function (r) {
        return {
          type: r.type,
          label: r.label,
          preview: r.textPreview
        };
      })
    };

    var systemPrompt = 'You are Buddy, a friendly and warm AI assistant helping a visually impaired user browse the web. ' +
      'Speak naturally and conversationally, like a helpful friend describing what you see. ' +
      'Use a warm, casual tone - not robotic or list-like. Keep responses brief (2-4 sentences max).';

    var userMessage = 'Describe this webpage naturally, as if you\'re a helpful friend. ' +
      'Use conversational phrases like "You\'re on...", "I can see...", "Looks like...", "The main thing here is...". ' +
      'Mention 1-2 key actions available. Be warm and brief - no lists or bullet points.\n\n' +
      'Page: ' + pageContext.title + ' (' + pageContext.url.split('/')[2] + ')\n' +
      'Main content: ' + pageContext.structuredText.substring(0, 1500) + '\n' +
      'Key elements: ' + pageContext.interactiveElements.slice(0, 10).map(function (el) { return el.text; }).join(', ') + '\n\n' +
      'Give a friendly, natural description:';

    // Try Grok first
    var grokSettings = await getGrokSettings();
    if (grokSettings.apiKey) {
      try {
        console.log('[VoiceWorkflow] Trying Grok API...');
        var result = await callAI('grok', grokSettings.apiKey, grokSettings.model, systemPrompt, userMessage);
        console.log('[VoiceWorkflow] Grok succeeded');
        return result;
      } catch (grokError) {
        console.warn('[VoiceWorkflow] Grok failed, falling back to Claude:', grokError.message);
      }
    } else {
      console.log('[VoiceWorkflow] No Grok API key, using Claude directly');
    }

    // Fallback to Claude
    var settings = await getAISettings();
    if (!settings.apiKey) {
      throw new Error('No API key configured. Please set up Grok or Claude API key in Settings.');
    }

    console.log('[VoiceWorkflow] Using Claude as fallback');
    return await callAI(settings.provider, settings.apiKey, settings.model, systemPrompt, userMessage);
  }

  // Describe Page button click
  describePageBtn.addEventListener('click', async function () {
    describePageBtn.disabled = true;
    describePageBtn.textContent = 'Analyzing...';
    pageDescriptionOutput.textContent = 'Extracting page DOM and generating description...';

    try {
      var domData = await extractDOMFromTab();
      var description = await describePageWithAI(domData);
      pageDescriptionOutput.textContent = description;
    } catch (err) {
      pageDescriptionOutput.textContent = 'Error: ' + err.message;
    } finally {
      describePageBtn.disabled = false;
      describePageBtn.innerHTML = '<span>&#x1F50D;</span> Describe Current Page';
    }
  });

  // =============================================
  // SECTION 5.5: VOICE COMMANDS MODE (Simple)
  // Just speak → send to agent → speak result
  // No automatic page description cycle
  // =============================================

  var voiceCommandsActive = false;
  var voiceCommandsToggle = document.getElementById('voice-commands-toggle');
  var voiceCommandsStatus = document.getElementById('voice-commands-status');
  var voiceCommandsFeedback = document.getElementById('voice-commands-feedback');

  if (voiceCommandsToggle) {
    voiceCommandsToggle.addEventListener('change', function () {
      if (voiceCommandsToggle.checked) {
        // Turn off voice workflow if it's on
        if (voiceWorkflowActive && voiceWorkflowToggle) {
          voiceWorkflowToggle.checked = false;
          voiceWorkflowActive = false;
          workflowStatusEl.textContent = 'Off';
          workflowStatusEl.classList.remove('active');
        }

        voiceCommandsActive = true;
        voiceCommandsStatus.textContent = 'Listening';
        voiceCommandsStatus.classList.add('active');
        updateVoiceCommandsFeedback('Listening for your command...');
        startSTT();
      } else {
        voiceCommandsActive = false;
        voiceCommandsStatus.textContent = 'Off';
        voiceCommandsStatus.classList.remove('active');
        updateVoiceCommandsFeedback('');
        stopSTT();
        if (synth.speaking) synth.cancel();
      }
    });
  }

  function updateVoiceCommandsFeedback(text) {
    if (voiceCommandsFeedback) {
      voiceCommandsFeedback.textContent = text;
    }
  }

  /**
   * Handle voice command: send to agent and speak result
   * Uses Grok → Claude fallback for command processing
   */
  async function voiceCommandsSendCommand(command) {
    if (!voiceCommandsActive) return;

    try {
      updateVoiceCommandsFeedback('Processing: "' + command + '" (Grok → Claude)...');

      var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      var tabId = tabs[0] ? tabs[0].id : undefined;

      // Try Grok first
      var grokSettings = await getGrokSettings();
      var resultMessage = null;

      if (grokSettings.apiKey) {
        try {
          console.log('[VoiceCommands] Trying Grok for command...');

          var domData = await extractDOMFromTab();
          var elements = (domData.formats.interactiveElements || []).slice(0, 15).map(function (el) {
            return el.type + ': "' + (el.text || '').substring(0, 40) + '"';
          }).join('\n');

          var systemPrompt = 'You are a browser assistant. Respond briefly to confirm the action. Keep under 20 words.';
          var userMessage = 'Page: ' + domData.title + '\nElements:\n' + elements + '\n\nCommand: "' + command + '"';

          var grokResponse = await callAI('grok', grokSettings.apiKey, grokSettings.model, systemPrompt, userMessage);
          console.log('[VoiceCommands] Grok response:', grokResponse);

          // Execute via background.js
          var response = await chrome.runtime.sendMessage({
            type: 'PROCESS_COMMAND',
            payload: { command: command, tabId: tabId },
            timestamp: Date.now()
          });

          if (response && response.data && response.data.message) {
            resultMessage = response.data.message;
          } else if (response && response.error) {
            resultMessage = 'Error: ' + response.error;
          } else {
            resultMessage = grokResponse.substring(0, 80);
          }

        } catch (grokError) {
          console.warn('[VoiceCommands] Grok failed, using Claude:', grokError.message);
        }
      }

      // Fallback to just background.js
      if (!resultMessage) {
        console.log('[VoiceCommands] Using Claude/background agent');
        var response = await chrome.runtime.sendMessage({
          type: 'PROCESS_COMMAND',
          payload: { command: command, tabId: tabId },
          timestamp: Date.now()
        });

        resultMessage = 'Done.';
        if (response && response.data && response.data.message) {
          resultMessage = response.data.message;
        } else if (response && response.error) {
          resultMessage = 'Error: ' + response.error;
        } else if (response && response.message) {
          resultMessage = response.message;
        }
      }

      if (!voiceCommandsActive) return;

      updateVoiceCommandsFeedback('Agent: ' + resultMessage);

      // Speak the result
      speakText(resultMessage, function () {
        if (voiceCommandsActive) {
          updateVoiceCommandsFeedback('Listening for your command...');
        }
      });

    } catch (err) {
      updateVoiceCommandsFeedback('Error: ' + err.message);
      if (voiceCommandsActive) {
        setTimeout(function () {
          updateVoiceCommandsFeedback('Listening for your command...');
        }, 2000);
      }
    }
  }

  // =============================================
  // SECTION 6: VOICE WORKFLOW ORCHESTRATION
  // Cycle: Extract DOM -> AI describe -> TTS -> STT listen -> PROCESS_COMMAND -> repeat
  // =============================================

  var voiceWorkflowActive = false;
  var voiceWorkflowToggle = document.getElementById('voice-workflow-toggle');
  var workflowStatusEl = document.getElementById('workflow-status');
  var stepIndicator = document.getElementById('workflow-step-indicator');

  voiceWorkflowToggle.addEventListener('change', function () {
    if (voiceWorkflowToggle.checked) {
      // Turn off voice commands if it's on
      if (voiceCommandsActive && voiceCommandsToggle) {
        voiceCommandsToggle.checked = false;
        voiceCommandsActive = false;
        voiceCommandsStatus.textContent = 'Off';
        voiceCommandsStatus.classList.remove('active');
        updateVoiceCommandsFeedback('');
      }

      voiceWorkflowActive = true;
      workflowStatusEl.textContent = 'Active';
      workflowStatusEl.classList.add('active');
      startVoiceWorkflowCycle();
    } else {
      voiceWorkflowActive = false;
      workflowStatusEl.textContent = 'Off';
      workflowStatusEl.classList.remove('active');
      stopSTT();
      if (synth.speaking) synth.cancel();
      updateStepIndicator('');
    }
  });

  async function startVoiceWorkflowCycle() {
    if (!voiceWorkflowActive) return;

    // Reset flags at start of cycle
    wakeWordInterrupted = false;
    isTTSSpeaking = false;

    try {
      // Step 0: Check for restricted URL (e.g. chrome://)
      var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      var activeTab = tabs[0];

      // If we are on a restricted page (not http/https) and it's NOT our own dashboard
      if (activeTab && !activeTab.url.startsWith('http') && !activeTab.url.includes(chrome.runtime.id)) {
        updateStepIndicator('Waiting for a valid webpage...');
        // Don't disable the toggle, just wait.
        // The user might be on the dashboard or a chrome:// page.
        return;
      }

      // Step 1: Extract DOM (only needed if describing page)
      var domData = null;
      var description = null;

      // Step 2: Try to get AI description
      try {
        updateStepIndicator('Extracting page information...');
        domData = await extractDOMFromTab();
        if (!voiceWorkflowActive) return;

        updateStepIndicator('Buddy is analyzing the page...');
        description = await describePageForVoiceWorkflow(domData);
        pageDescriptionOutput.textContent = description;
        if (!voiceWorkflowActive) return;

        // Step 3: Start STT FIRST (so it can hear "Vector" during TTS)
        updateStepIndicator('Speaking... (say "Vector" to interrupt)');

        startSTT();
        isTTSSpeaking = true;
        setTTSContext(description);

        await new Promise(function (resolve) {
          speakText(description, function () {
            isTTSSpeaking = false;
            clearTTSContext();
            resolve();
          });
        });

        if (wakeWordInterrupted || !voiceWorkflowActive) return;

      } catch (descErr) {
        // If page description fails, skip to listening but STAY ACTIVE
        console.warn('[VoiceWorkflow] Page description failed, skipping to listen:', descErr.message);
        updateStepIndicator('Buddy is ready for your command.');

        await new Promise(function (resolve) {
          speakText('Ready for your command.', resolve);
        });
        if (!voiceWorkflowActive) return;
      }

      // Step 4: STT is already running from Step 3 or if desc failed
      updateStepIndicator('Listening for your command...');
      if (!sttIsListening) {
        startSTT();
      }

    } catch (err) {
      console.error('[VoiceWorkflow] Error in cycle:', err);
      updateStepIndicator('Waiting for valid page or command...');
      // Keep voiceWorkflowActive = true so it doesn't just die
      // The next interaction or page load can pick it up
    }
  }

  /**
   * Voice workflow send command with Grok → Claude fallback.
   * Called by STT onresult when voice workflow is active and final transcript received.
   * Tries Grok for intent analysis first, then falls back to PROCESS_COMMAND.
   */
  async function voiceWorkflowSendCommand(command) {
    if (!voiceWorkflowActive) return;

    var lowerCommand = command.toLowerCase().trim();

    // Check for "continue" command - resume the workflow cycle
    if (lowerCommand === 'continue' || lowerCommand === 'go on' ||
      lowerCommand === 'never mind' || lowerCommand === 'nevermind' ||
      lowerCommand === 'nothing' || lowerCommand === 'cancel') {
      console.log('[VoiceWorkflow] Continue/cancel command detected, resuming cycle');
      updateStepIndicator('Okay, continuing...');
      await new Promise(function (resolve) {
        speakText('Okay.', resolve);
      });
      if (voiceWorkflowActive) {
        startVoiceWorkflowCycle();
      }
      return;
    }

    try {
      updateStepIndicator('Processing: "' + command + '"...');

      var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      var tabId = tabs[0] ? tabs[0].id : undefined;

      // Try Grok first for natural language understanding
      var grokSettings = await getGrokSettings();
      var resultMessage = null;

      if (grokSettings.apiKey) {
        try {
          console.log('[VoiceWorkflow] Trying Grok for command processing...');

          // Get DOM context for command processing
          var domData = await extractDOMFromTab();
          var elements = (domData.formats.interactiveElements || []).slice(0, 20).map(function (el) {
            return el.type + ': "' + (el.text || '').substring(0, 50) + '"';
          }).join('\n');

          var systemPrompt = 'You are a browser assistant. Based on the user command and page context, respond with a brief action confirmation. If the command is a scroll/click/navigate action, confirm what you would do. Keep responses under 30 words.';

          var userMessage = 'Page: ' + domData.title + '\nURL: ' + domData.url +
            '\n\nInteractive elements:\n' + elements +
            '\n\nUser command: "' + command + '"\n\nBriefly confirm what action to take:';

          var grokResponse = await callAI('grok', grokSettings.apiKey, grokSettings.model, systemPrompt, userMessage);
          console.log('[VoiceWorkflow] Grok response:', grokResponse);

          // Now still send to background.js for actual execution
          var response = await chrome.runtime.sendMessage({
            type: 'PROCESS_COMMAND',
            payload: {
              command: command,
              tabId: tabId
            },
            timestamp: Date.now()
          });

          if (response && response.data && response.data.message) {
            resultMessage = response.data.message;
          } else if (response && response.error) {
            resultMessage = 'Error: ' + response.error;
          } else {
            resultMessage = grokResponse.substring(0, 100); // Use Grok response as fallback
          }

        } catch (grokError) {
          console.warn('[VoiceWorkflow] Grok failed for command, using background agent only:', grokError.message);
        }
      }

      // Fallback to just PROCESS_COMMAND if Grok wasn't available or failed
      if (!resultMessage) {
        console.log('[VoiceWorkflow] Using Claude/background agent for command');
        var response = await chrome.runtime.sendMessage({
          type: 'PROCESS_COMMAND',
          payload: {
            command: command,
            tabId: tabId
          },
          timestamp: Date.now()
        });

        resultMessage = 'Action completed.';
        if (response && response.payload && response.payload.message) {
          resultMessage = response.payload.message;
        } else if (response && response.data && response.data.message) {
          resultMessage = response.data.message;
        } else if (response && response.error) {
          resultMessage = 'Error: ' + response.error;
        } else if (response && response.message) {
          resultMessage = response.message;
        }
      }

      if (!voiceWorkflowActive) return;

      updateStepIndicator('Agent: ' + resultMessage);

      // Speak the result
      await new Promise(function (resolve) {
        speakText(resultMessage, resolve);
      });

      if (!voiceWorkflowActive) return;

      // Brief pause then repeat cycle
      await new Promise(function (r) { setTimeout(r, 500); });
      startVoiceWorkflowCycle();

    } catch (err) {
      updateStepIndicator('Error: ' + err.message);
      // Try to continue the cycle despite errors
      if (voiceWorkflowActive) {
        await new Promise(function (r) { setTimeout(r, 2000); });
        startVoiceWorkflowCycle();
      }
    }
  }

  // Also listen for COMMAND_RESULT messages from background
  // (in case the agent responds via separate message instead of sendResponse)
  chrome.runtime.onMessage.addListener(function (message) {
    if (message && message.type === 'COMMAND_RESULT' && voiceWorkflowActive) {
      // The sendMessage response handler already handles this,
      // but this serves as a backup listener
      var msg = (message.payload && message.payload.message) || '';
      if (msg) {
        updateStepIndicator('Agent: ' + msg);
      }
    }
  });

  function updateStepIndicator(text) {
    if (stepIndicator) stepIndicator.textContent = text;
  }

  // =============================================
  // SECTION 6: ACCESSIBILITY TOGGLES
  // Reuses exact logic from UI editing/popup/popup.js
  // Storage: chrome.storage.sync with key 'preferences'
  // Message: {action: 'updateSettings', settings: {...}}
  // =============================================

  var accessibilityToggles = [
    { dashId: 'dash-mode-dyslexia', storageKey: 'mode-dyslexia' },
    { dashId: 'dash-mode-adhd', storageKey: 'mode-adhd' },
    { dashId: 'dash-mode-contrast', storageKey: 'mode-contrast' },
    { dashId: 'dash-mode-cognitive', storageKey: 'mode-cognitive' },
    { dashId: 'dash-mode-large-text', storageKey: 'mode-large-text' },
    { dashId: 'dash-mode-calm', storageKey: 'mode-calm' },
    { dashId: 'dash-mode-neuro', storageKey: 'mode-neuro' },
    { dashId: 'dash-mode-seizure', storageKey: 'mode-seizure' },
    { dashId: 'dash-mode-neon', storageKey: 'mode-neon' },
    // Color blindness modes (mutually exclusive)
    { dashId: 'dash-mode-deuteranopia', storageKey: 'mode-deuteranopia', colorBlind: true },
    { dashId: 'dash-mode-protanopia', storageKey: 'mode-protanopia', colorBlind: true },
    { dashId: 'dash-mode-tritanopia', storageKey: 'mode-tritanopia', colorBlind: true },
    { dashId: 'dash-mode-achromatopsia', storageKey: 'mode-achromatopsia', colorBlind: true }
  ];

  // Color blindness toggle IDs for mutual exclusivity
  var colorBlindToggleIds = [
    'dash-mode-deuteranopia',
    'dash-mode-protanopia',
    'dash-mode-tritanopia',
    'dash-mode-achromatopsia'
  ];

  // Enforce mutual exclusivity: only one color blindness mode at a time
  function handleColorBlindMutualExclusivity(activatedId) {
    colorBlindToggleIds.forEach(function (id) {
      if (id !== activatedId) {
        var toggle = document.getElementById(id);
        if (toggle) toggle.checked = false;
      }
    });
  }

  // Load saved settings (same as UI editing/popup/popup.js)
  chrome.storage.sync.get(['preferences'], function (result) {
    var prefs = result.preferences || {};
    accessibilityToggles.forEach(function (item) {
      var toggle = document.getElementById(item.dashId);
      if (toggle) {
        toggle.checked = prefs[item.storageKey] || false;
        toggle.addEventListener('change', function () {
          // Enforce mutual exclusivity for color blindness modes
          if (item.colorBlind && toggle.checked) {
            handleColorBlindMutualExclusivity(item.dashId);
          }
          saveAccessibilityPreferences();
          applyAccessibilityToActiveTab();
        });
      }
    });
  });

  // Display current site (same as UI editing/popup/popup.js)
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs[0] && tabs[0].url) {
      try {
        var url = new URL(tabs[0].url);
        document.getElementById('dash-current-site').textContent = url.hostname;
      } catch (e) {
        document.getElementById('dash-current-site').textContent = 'Extension Page';
      }
    }
  });

  // Get current toggle settings (same as UI editing/popup/popup.js getCurrentSettings)
  function getAccessibilitySettings() {
    var prefs = {};
    accessibilityToggles.forEach(function (item) {
      var toggle = document.getElementById(item.dashId);
      if (toggle) prefs[item.storageKey] = toggle.checked;
    });
    return prefs;
  }

  // Save to chrome.storage.sync (same as UI editing/popup/popup.js savePreferences)
  function saveAccessibilityPreferences() {
    var prefs = getAccessibilitySettings();
    chrome.storage.sync.set({ preferences: prefs }, function () {
      console.log('Accessibility settings saved');
    });
  }

  // Send updateSettings to content script (same as UI editing/popup/popup.js applySettingsToActiveTab)
  function applyAccessibilityToActiveTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'updateSettings',
          settings: getAccessibilitySettings()
        });
      }
    });
  }

  // =============================================
  // SECTION 7: SETTINGS MANAGEMENT
  // Allows users to configure API key, provider, and models
  // Saves to chrome.storage.local (same storage as background.js)
  // =============================================

  var settingsProvider = document.getElementById('settings-provider');
  var settingsApiKey = document.getElementById('settings-api-key');
  var settingsToggleKey = document.getElementById('settings-toggle-key');
  var settingsIntentModel = document.getElementById('settings-intent-model');
  var settingsCodegenModel = document.getElementById('settings-codegen-model');
  var settingsSaveBtn = document.getElementById('settings-save-btn');
  var settingsStatus = document.getElementById('settings-status');

  // Grok settings for voice workflow
  var settingsGrokKey = document.getElementById('settings-grok-key');
  var settingsToggleGrokKey = document.getElementById('settings-toggle-grok-key');
  var settingsGrokModel = document.getElementById('settings-grok-model');

  // Default model names for each provider
  var defaultModels = {
    claude: {
      intent: 'claude-3-5-haiku-20241022',
      codegen: 'claude-sonnet-4-20250514'
    },
    openai: {
      intent: 'gpt-4o-mini',
      codegen: 'gpt-4o'
    }
  };

  // Load saved settings on panel open
  function loadSettings() {
    chrome.storage.local.get(['provider', 'apiKey', 'intentModel', 'codeGenModel', 'grokApiKey', 'grokModel'], function (result) {
      if (settingsProvider) {
        settingsProvider.value = result.provider || 'claude';
      }
      if (settingsApiKey) {
        settingsApiKey.value = result.apiKey || '';
      }
      if (settingsIntentModel) {
        settingsIntentModel.value = result.intentModel || '';
        settingsIntentModel.placeholder = defaultModels[result.provider || 'claude'].intent;
      }
      if (settingsCodegenModel) {
        settingsCodegenModel.value = result.codeGenModel || '';
        settingsCodegenModel.placeholder = defaultModels[result.provider || 'claude'].codegen;
      }
      // Load Grok settings
      if (settingsGrokKey) {
        settingsGrokKey.value = result.grokApiKey || '';
      }
      if (settingsGrokModel) {
        settingsGrokModel.value = result.grokModel || '';
      }
    });
  }

  // Update placeholder models when provider changes
  if (settingsProvider) {
    settingsProvider.addEventListener('change', function () {
      var provider = settingsProvider.value;
      if (settingsIntentModel) {
        settingsIntentModel.placeholder = defaultModels[provider].intent;
      }
      if (settingsCodegenModel) {
        settingsCodegenModel.placeholder = defaultModels[provider].codegen;
      }
    });
  }

  // Toggle API key visibility
  if (settingsToggleKey && settingsApiKey) {
    settingsToggleKey.addEventListener('click', function () {
      if (settingsApiKey.type === 'password') {
        settingsApiKey.type = 'text';
        settingsToggleKey.innerHTML = '&#x1F512;'; // Lock icon
      } else {
        settingsApiKey.type = 'password';
        settingsToggleKey.innerHTML = '&#x1F441;'; // Eye icon
      }
    });
  }

  // Toggle Grok API key visibility
  if (settingsToggleGrokKey && settingsGrokKey) {
    settingsToggleGrokKey.addEventListener('click', function () {
      if (settingsGrokKey.type === 'password') {
        settingsGrokKey.type = 'text';
        settingsToggleGrokKey.innerHTML = '&#x1F512;'; // Lock icon
      } else {
        settingsGrokKey.type = 'password';
        settingsToggleGrokKey.innerHTML = '&#x1F441;'; // Eye icon
      }
    });
  }

  // Show status message
  function showSettingsStatus(message, isError) {
    if (settingsStatus) {
      settingsStatus.textContent = message;
      settingsStatus.className = 'settings-status ' + (isError ? 'error' : 'success');
      // Clear after 3 seconds
      setTimeout(function () {
        settingsStatus.textContent = '';
        settingsStatus.className = 'settings-status';
      }, 3000);
    }
  }

  // Save settings
  if (settingsSaveBtn) {
    settingsSaveBtn.addEventListener('click', function () {
      var provider = settingsProvider ? settingsProvider.value : 'claude';
      var apiKey = settingsApiKey ? settingsApiKey.value.trim() : '';
      var intentModel = settingsIntentModel ? settingsIntentModel.value.trim() : '';
      var codeGenModel = settingsCodegenModel ? settingsCodegenModel.value.trim() : '';

      // Grok settings
      var grokApiKey = settingsGrokKey ? settingsGrokKey.value.trim() : '';
      var grokModel = settingsGrokModel ? settingsGrokModel.value.trim() : '';

      // Use defaults if not specified
      if (!intentModel) {
        intentModel = defaultModels[provider].intent;
      }
      if (!codeGenModel) {
        codeGenModel = defaultModels[provider].codegen;
      }
      if (!grokModel) {
        grokModel = 'grok-beta';
      }

      // Validate - need at least one API key
      if (!apiKey && !grokApiKey) {
        showSettingsStatus('Please enter at least one API key (Grok or Claude/OpenAI)', true);
        return;
      }

      // Save to chrome.storage.local
      chrome.storage.local.set({
        provider: provider,
        apiKey: apiKey,
        intentModel: intentModel,
        codeGenModel: codeGenModel,
        grokApiKey: grokApiKey,
        grokModel: grokModel
      }, function () {
        if (chrome.runtime.lastError) {
          showSettingsStatus('Error saving settings: ' + chrome.runtime.lastError.message, true);
        } else {
          showSettingsStatus('Settings saved successfully!', false);

          // Notify background script that settings were updated
          chrome.runtime.sendMessage({
            type: 'SETTINGS_UPDATED',
            timestamp: Date.now()
          });
        }
      });
    });
  }

  // Load settings when panel opens
  loadSettings();

})();

