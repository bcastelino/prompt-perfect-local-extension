// Content script for Prompt Perfect Local

// Initialize the extension
function initialize() {
  chrome.runtime.onMessage.addListener(handleMessage);
  setupContextMenuIntegration();
}

function handleMessage(request, sender, sendResponse) {
  if (request.action === 'enhancePrompt') {
    const inputElement = getActiveInputElement();
    if (inputElement) {
      const originalText = inputElement.value;
      showEnhancementUI(originalText, (enhancedText) => {
        inputElement.value = enhancedText;
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }
  } else if (request.action === 'savePrompt') {
    const inputElement = getActiveInputElement();
    if (inputElement && inputElement.value) {
      showSavePromptUI(inputElement.value);
    }
  }
}

function getActiveInputElement() {
  // Try to get the focused element if it's an input or textarea
  const active = document.activeElement;
  if (active && (active.tagName === 'TEXTAREA' || (active.tagName === 'INPUT' && active.type === 'text'))) {
    return active;
  }
  // Otherwise, try to find the first visible textarea or text input
  const textarea = document.querySelector('textarea');
  if (textarea) return textarea;
  const textInput = document.querySelector('input[type="text"]');
  if (textInput) return textInput;
  return null;
}

function showEnhancementUI(originalText, callback) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10001;
    width: 400px;
  `;
  overlay.innerHTML = `
    <h3 style="margin-bottom: 16px;">Enhance Prompt</h3>
    <div style="margin-bottom: 16px;">
      <textarea style="width: 100%; height: 100px; margin-bottom: 8px;">${originalText}</textarea>
      <div style="display: flex; gap: 8px;">
        <button class="enhance-btn" style="flex: 1;">Enhance</button>
        <button class="cancel-btn" style="flex: 1;">Cancel</button>
      </div>
    </div>
  `;
  overlay.querySelector('.enhance-btn').addEventListener('click', () => {
    const enhancedText = overlay.querySelector('textarea').value;
    callback(enhancedText);
    document.body.removeChild(overlay);
  });
  overlay.querySelector('.cancel-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
  document.body.appendChild(overlay);
}

function showSavePromptUI(promptText) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10001;
    width: 400px;
  `;
  overlay.innerHTML = `
    <h3 style="margin-bottom: 16px;">Save Prompt</h3>
    <div style="margin-bottom: 16px;">
      <input type="text" placeholder="Prompt Name" style="width: 100%; margin-bottom: 8px;">
      <textarea style="width: 100%; height: 100px; margin-bottom: 8px;">${promptText}</textarea>
      <input type="text" placeholder="Tags (comma-separated)" style="width: 100%; margin-bottom: 8px;">
      <div style="display: flex; gap: 8px;">
        <button class="save-btn" style="flex: 1;">Save</button>
        <button class="cancel-btn" style="flex: 1;">Cancel</button>
      </div>
    </div>
  `;
  overlay.querySelector('.save-btn').addEventListener('click', () => {
    const name = overlay.querySelector('input[type="text"]').value;
    const content = overlay.querySelector('textarea').value;
    const tags = overlay.querySelector('input[placeholder*="Tags"]').value
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag);
    chrome.runtime.sendMessage({
      action: 'savePrompt',
      name,
      content,
      tags
    }, (response) => {
      if (response.success) {
        document.body.removeChild(overlay);
      }
    });
  });
  overlay.querySelector('.cancel-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
  document.body.appendChild(overlay);
}

function setupContextMenuIntegration() {
  document.addEventListener('contextmenu', (event) => {
    const active = getActiveInputElement();
    if (active) {
      window.selectedText = active.value.substring(
        active.selectionStart,
        active.selectionEnd
      );
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
} 