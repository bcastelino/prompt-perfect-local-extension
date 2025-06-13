// DOM Elements
const promptInput = document.getElementById('promptInput');
const enhanceBtn = document.getElementById('enhanceBtn');
const saveBtn = document.getElementById('saveBtn');
const enhanced = document.getElementById('enhanced');
const enhancedContent = document.getElementById('enhancedContent');
const copyBtn = document.getElementById('copyBtn');
const recentPrompts = document.getElementById('recentPrompts');

// State
let currentPrompt = '';
let lastGeneratedPrompt = '';
let chatHistory = [];

// Initialize popup
function initialize() {
  // Load recent prompts
  loadRecentPrompts();
  
  // Set up event listeners
  setupEventListeners();
  
  // Load chat history
  loadChatHistory();
}

// Load recent prompts from storage
function loadRecentPrompts() {
  chrome.runtime.sendMessage({ action: 'getStoredPrompts' }, (response) => {
    if (response.prompts) {
      const recent = response.prompts
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
      
      displayRecentPrompts(recent);
    }
  });
}

// Display recent prompts in the UI
function displayRecentPrompts(prompts) {
  recentPrompts.innerHTML = prompts.map(prompt => `
    <div class="prompt-item" data-id="${prompt.id}">
      <div class="prompt-name">${prompt.name}</div>
      <div class="prompt-preview">${prompt.content.substring(0, 50)}${prompt.content.length > 50 ? '...' : ''}</div>
      <div class="tag-list">
        ${prompt.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
      </div>
    </div>
  `).join('');

  // Add click handlers
  recentPrompts.querySelectorAll('.prompt-item').forEach(item => {
    item.addEventListener('click', () => {
      const prompt = prompts.find(p => p.id === item.dataset.id);
      if (prompt) {
        promptInput.value = prompt.content;
        currentPrompt = prompt.content;
      }
    });
  });
}

// Set up event listeners
function setupEventListeners() {
  // Enhance button click
  enhanceBtn.addEventListener('click', handleEnhance);
  
  // Save button click
  saveBtn.addEventListener('click', handleSave);
  
  // Copy buttons
  copyBtn.addEventListener('click', handleCopy);
  
  // Input changes
  promptInput.addEventListener('input', (e) => {
    currentPrompt = e.target.value;
  });
}

// Handle enhance button click
async function handleEnhance() {
  if (!currentPrompt.trim()) return;
  const apiKey = window.OPENROUTER_API_KEY;
  if (!apiKey) {
    showError('OpenRouter API Key is not set. Please add it to openrouter_secrets.js.');
    return;
  }
  showLoading('Generating Enhanced Prompt ⏳...');
  try {
    const enhancedPrompt = await enhancePrompt(currentPrompt);
    lastGeneratedPrompt = enhancedPrompt;
    showEnhancedPrompt(enhancedPrompt);
    saveChatHistory(currentPrompt, lastGeneratedPrompt);
  } catch (error) {
    showError('Failed to enhance prompt. Please try again.');
  }
}

// Handle save button click
function handleSave() {
  if (!lastGeneratedPrompt.trim()) return;
  const name = prompt('Enter a name for this prompt:');
  if (!name) return;
  const tagsInput = prompt('Enter tags (comma-separated):');
  const tags = tagsInput
    ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag)
    : [];
  // Save to storage (save only the generated prompt)
  chrome.runtime.sendMessage({
    action: 'savePrompt',
    name,
    content: lastGeneratedPrompt,
    tags
  }, (response) => {
    if (response.success) {
      showSuccess('Prompt saved successfully ✔');
      loadRecentPrompts();
    } else {
      showError('Failed to save prompt. Please try again.');
    }
  });
}

// Handle copy button click
function handleCopy() {
  const text = lastGeneratedPrompt;
  navigator.clipboard.writeText(text).then(() => {
    showSuccess('Copied to clipboard!');
    showCopyConfirmation();
  }).catch(() => {
    showError('Failed to copy. Please try again.');
  });
}

function showCopyConfirmation() {
  copyBtn.textContent = 'Copied!';
  copyBtn.style.background = '#10b981';
  copyBtn.style.color = '#fff';
  setTimeout(() => {
    copyBtn.textContent = 'Copy to Clipboard';
    copyBtn.style.background = '';
    copyBtn.style.color = '';
  }, 1500);
}

// Show enhanced prompt in a box with dynamic opening/closing
function showEnhancedPrompt(fullText) {
  enhanced.classList.remove('hidden');
  enhancedContent.innerHTML = formatPromptBox(fullText);
}

function formatPromptBox(fullText) {
  const opening = `Here's a rewritten prompt that follows Prompt Engineering best practices with improved clarity, specificity, and effectiveness:`;
  const closing = `Your Enhanced prompt is now generated. Copy it to any AI ChatBot for best results.\n\nMake sure to edit any part of the Prompt for more Personalization`;
  return `
    <div style="margin-bottom:10px;">${opening}</div>
    <div style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:10px;white-space:pre-wrap;font-family:monospace;">${fullText}</div>
    <div>${closing}</div>
  `;
}

// Show loading message
function showLoading(message) {
  enhanced.classList.remove('hidden');
  enhancedContent.innerHTML = `<div style="color:#2563eb;font-weight:600;">${message}</div>`;
}

// Chat history support
function saveChatHistory(userPrompt, aiPrompt) {
  chatHistory.push({ user: userPrompt, ai: aiPrompt });
  if (chatHistory.length > 10) chatHistory.shift();
  localStorage.setItem('pp_chat_history', JSON.stringify(chatHistory));
}
function loadChatHistory() {
  try {
    chatHistory = JSON.parse(localStorage.getItem('pp_chat_history')) || [];
  } catch {
    chatHistory = [];
  }
}

// Show success message
function showSuccess(message) {
  // Implement success notification
  console.log('Success:', message);
}

// Show error message
function showError(message) {
  // Implement error notification
  console.error('Error:', message);
  alert(message);
}

// Enhance prompt using OpenRouter API
async function enhancePrompt(prompt) {
  if (!window.OPENROUTER_API_KEY) {
    showError('OpenRouter API Key is not set in openrouter_secrets.js or could not be loaded. Please check your extension configuration.');
    return '';
  }
  try {
    // Always use only the system and user message as specified
    let messages = [
      {
        role: 'system',
        content: `You are a professional Prompt Engineer.\n\nYour goal is to rewrite and optimize user-submitted prompts to make them clear, specific, and aligned with prompt engineering best practices.\n\nUse the following principles:\n- Assign a clear ROLE to the AI (e.g. "You are a marketing strategist…")\n- Define a clear GOAL or task for the AI to accomplish\n- Provide relevant CONTEXT if the original prompt is vague\n- Include any FORMAT or OUTPUT constraints (e.g. word limit, bullet points, JSON)\n- Use assertive, instructional phrasing\n\nAlways return a single, enhanced prompt — not a list or explanation.\n\nPrefix the result with: "Enhanced Prompt:" and ensure it is ready to copy and paste directly into any AI chatbot.\n\nIf the user's prompt is already good, refine it slightly for better clarity, structure, or tone.`
      },
      {
        role: 'user',
        content: `Write a prompt that asks GPT to: ${prompt}`
      }
    ];
    // Do NOT include chat history for enhancePrompt

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${window.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://promptperfect.local',
        'X-Title': 'Prompt Perfect Local'
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat-v3-0324:free',
        messages
      })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API Error:', errorData);
      throw new Error(`API returned ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
    }
    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
      return data.choices[0].message.content;
    } else {
      return 'Error: No enhanced prompt returned from OpenRouter.';
    }
  } catch (e) {
    console.error('Error enhancing prompt:', e);
    showError(`Error enhancing prompt: ${e.message}`);
    return '';
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initialize);
