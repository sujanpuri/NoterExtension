// Background service worker for handling extension icon clicks
chrome.action.onClicked.addListener(async (tab) => {
    // Open the side panel when the extension icon is clicked
    try {
        await chrome.sidePanel.open({ windowId: tab.windowId });
    } catch (error) {
        console.error('Error opening side panel:', error);
    }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'saveHighlight') {
        // Save highlight to storage
        chrome.storage.local.get(['highlights'], (result) => {
            const highlights = result.highlights || [];
            highlights.unshift(request.highlight); // Add to beginning
            
            chrome.storage.local.set({ highlights: highlights }, () => {
                sendResponse({ success: true });
            });
        });
        
        // Return true to indicate we'll send response asynchronously
        return true;
    }
});
