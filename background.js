// Create context menu items when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'enhancePrompt',
    title: 'Enhance Prompt with Prompt Perfect',
    contexts: ['editable']
  });

  chrome.contextMenus.create({
    id: 'savePrompt',
    title: 'Save to Prompt Library',
    contexts: ['editable']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'enhancePrompt') {
    // Send message to content script to enhance the selected text
    chrome.tabs.sendMessage(tab.id, {
      action: 'enhancePrompt',
      text: info.selectionText
    });
  } else if (info.menuItemId === 'savePrompt') {
    // Send message to content script to save the selected text
    chrome.tabs.sendMessage(tab.id, {
      action: 'savePrompt',
      text: info.selectionText
    });
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStoredPrompts') {
    // Retrieve prompts from storage
    chrome.storage.local.get(['prompts'], (result) => {
      sendResponse({ prompts: result.prompts || [] });
    });
    return true; // Required for async sendResponse
  }

  if (request.action === 'savePrompt') {
    // Save prompt to storage
    chrome.storage.local.get(['prompts'], (result) => {
      const prompts = result.prompts || [];
      prompts.push({
        id: Date.now().toString(),
        name: request.name || 'Untitled Prompt',
        content: request.content,
        tags: request.tags || [],
        createdAt: new Date().toISOString()
      });

      chrome.storage.local.set({ prompts }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  if (request.action === 'deletePrompt') {
    // Delete prompt from storage
    chrome.storage.local.get(['prompts'], (result) => {
      const prompts = (result.prompts || []).filter(p => p.id !== request.id);
      chrome.storage.local.set({ prompts }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  if (request.action === 'updatePrompt') {
    // Update prompt in storage
    chrome.storage.local.get(['prompts'], (result) => {
      const prompts = result.prompts || [];
      const index = prompts.findIndex(p => p.id === request.id);
      
      if (index !== -1) {
        prompts[index] = {
          ...prompts[index],
          name: request.name,
          content: request.content,
          tags: request.tags,
          updatedAt: new Date().toISOString()
        };
        
        chrome.storage.local.set({ prompts }, () => {
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: false, error: 'Prompt not found' });
      }
    });
    return true;
  }
}); 