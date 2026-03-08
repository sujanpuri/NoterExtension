// Content script for detecting text selection and showing save button
let saveButton = null;

// Create the save button
function createSaveButton() {
    const button = document.createElement('button');
    button.id = 'text-highlight-save-btn';
    button.textContent = '💾 Save';
    button.style.cssText = `
        position: absolute;
        display: none;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        z-index: 999999;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        font-family: 'Segoe UI', system-ui, sans-serif;
    `;
    
    button.addEventListener('mouseenter', () => {
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
    });
    
    button.addEventListener('mouseleave', () => {
        button.style.transform = '';
        button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
    });
    
    button.addEventListener('click', saveSelectedText);
    
    document.body.appendChild(button);
    return button;
}

// Show save button near selected text
function showSaveButton(x, y) {
    if (!saveButton) {
        saveButton = createSaveButton();
    }
    
    saveButton.style.display = 'block';
    saveButton.style.left = x + 'px';
    saveButton.style.top = (y - 40) + 'px';
}

// Hide save button
function hideSaveButton() {
    if (saveButton) {
        saveButton.style.display = 'none';
    }
}

// Handle text selection
document.addEventListener('mouseup', (e) => {
    // Small delay to ensure selection is complete
    setTimeout(() => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (selectedText.length > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            showSaveButton(
                rect.left + (rect.width / 2) - 40,
                rect.top + window.scrollY
            );
        } else {
            hideSaveButton();
        }
    }, 10);
});

// Hide button when clicking elsewhere
document.addEventListener('mousedown', (e) => {
    if (saveButton && e.target !== saveButton) {
        setTimeout(() => {
            const selection = window.getSelection();
            if (selection.toString().trim().length === 0) {
                hideSaveButton();
            }
        }, 100);
    }
});

// Save selected text
function saveSelectedText(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (!selectedText) return;
    
    // Save immediately without category selection
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const containerText = container.textContent || container.parentElement.textContent;
    
    const startOffset = containerText.indexOf(selectedText);
    const contextBefore = containerText.substring(Math.max(0, startOffset - 100), startOffset);
    const contextAfter = containerText.substring(startOffset + selectedText.length, startOffset + selectedText.length + 100);
    
    const highlight = {
        id: Date.now(),
        text: selectedText,
        url: window.location.href,
        title: document.title,
        timestamp: new Date().toISOString(),
        contextBefore: contextBefore,
        contextAfter: contextAfter,
        scrollPosition: window.scrollY,
        xpath: getXPath(range.startContainer),
        categories: [] // No category by default
    };
    
    // Send to background script to save
    chrome.runtime.sendMessage({
        action: 'saveHighlight',
        highlight: highlight
    }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('Error saving highlight:', chrome.runtime.lastError);
            return;
        }
        
        if (response && response.success) {
            showSavedFeedback();
            hideSaveButton();
            selection.removeAllRanges();
        }
    });
}

// Show saved feedback
function showSavedFeedback() {
    const feedback = document.createElement('div');
    feedback.textContent = '✓ Saved to sidebar!';
    feedback.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 12px 24px;
        border-radius: 6px;
        z-index: 999999;
        font-family: 'Segoe UI', system-ui, sans-serif;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(feedback);
    
    setTimeout(() => {
        feedback.style.opacity = '0';
        feedback.style.transition = 'opacity 0.3s';
        setTimeout(() => feedback.remove(), 300);
    }, 2000);
}

// Get XPath for an element (to relocate it later)
function getXPath(element) {
    if (element.id) {
        return `//*[@id="${element.id}"]`;
    }
    
    if (element === document.body) {
        return '/html/body';
    }
    
    let node = element;
    if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentElement;
    }
    
    let path = '';
    while (node && node !== document.body) {
        let index = 0;
        let sibling = node.previousSibling;
        
        while (sibling) {
            if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === node.nodeName) {
                index++;
            }
            sibling = sibling.previousSibling;
        }
        
        const tagName = node.nodeName.toLowerCase();
        path = `/${tagName}[${index + 1}]${path}`;
        node = node.parentElement;
    }
    
    return '/html/body' + path;
}

// Listen for messages to highlight text
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'highlightText') {
        console.log('Received highlight request:', request.highlight);
        highlightTextOnPage(request.highlight);
        sendResponse({ success: true });
    }
    return true;
});

// Highlight text on the page with smooth scroll
function highlightTextOnPage(highlight) {
    console.log('Starting highlight search for text:', highlight.text);
    
    // Wait for page to be fully ready and rendered
    const startSearch = () => {
        // Try multiple strategies in sequence
        let found = findAndHighlightText(highlight.text, highlight.contextBefore, highlight.contextAfter);
        
        if (!found) {
            console.log('Context-based search failed, trying simple search...');
            found = simpleTextSearch(highlight.text);
        }
        
        if (!found) {
            console.log('All searches failed, scrolling to saved position...');
            // Fallback: scroll to approximate position
            window.scrollTo({
                top: highlight.scrollPosition || 0,
                behavior: 'smooth'
            });
        }
    };
    
    // Use requestAnimationFrame to ensure DOM is painted
    if (document.readyState === 'complete') {
        setTimeout(() => {
            requestAnimationFrame(() => {
                startSearch();
            });
        }, 500);
    } else {
        window.addEventListener('load', () => {
            setTimeout(() => {
                requestAnimationFrame(() => {
                    startSearch();
                });
            }, 500);
        });
    }
}

// Simple text search without context matching
function simpleTextSearch(searchText) {
    console.log('Starting simple text search...');
    const bodyText = document.body.innerText.toLowerCase();
    const searchLower = searchText.toLowerCase();
    
    if (!bodyText.includes(searchLower)) {
        console.log('Text not found in body');
        return false;
    }
    
    console.log('Text found in body, searching nodes...');
    
    // Find all text nodes
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                // Skip script and style elements
                if (node.parentElement.tagName === 'SCRIPT' || 
                    node.parentElement.tagName === 'STYLE' ||
                    node.parentElement.tagName === 'NOSCRIPT' ||
                    !node.parentElement.offsetParent) { // Skip hidden elements
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        },
        false
    );
    
    let node;
    let attempts = 0;
    while (node = walker.nextNode()) {
        attempts++;
        const nodeText = node.textContent;
        const index = nodeText.toLowerCase().indexOf(searchLower);
        
        if (index !== -1) {
            console.log('Found match in node ' + attempts + ', attempting to highlight...');
            try {
                // Create the highlight element first
                const highlightSpan = document.createElement('span');
                highlightSpan.className = 'noter-highlight-temp';
                highlightSpan.style.cssText = `
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.6) 0%, rgba(118, 75, 162, 0.6) 100%);
                    padding: 5px 3px;
                    border-radius: 4px;
                    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.4);
                    animation: highlightPulse 2s ease-in-out 4;
                    transition: all 0.3s;
                    display: inline-block;
                `;
                
                // Add animation keyframes if not exists
                if (!document.getElementById('highlight-animation-style')) {
                    const style = document.createElement('style');
                    style.id = 'highlight-animation-style';
                    style.textContent = `
                        @keyframes highlightPulse {
                            0%, 100% { 
                                background: linear-gradient(135deg, rgba(102, 126, 234, 0.6) 0%, rgba(118, 75, 162, 0.6) 100%);
                                box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.4);
                                transform: scale(1);
                            }
                            50% { 
                                background: linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.9) 100%);
                                box-shadow: 0 0 0 8px rgba(102, 126, 234, 0.6);
                                transform: scale(1.01);
                            }
                        }
                    `;
                    document.head.appendChild(style);
                }
                
                // Extract the text and create a range
                const beforeText = nodeText.substring(0, index);
                const matchText = nodeText.substring(index, index + searchText.length);
                const afterText = nodeText.substring(index + searchText.length);
                
                highlightSpan.textContent = matchText;
                
                // Replace the text node with our highlighted version
                const parent = node.parentNode;
                const beforeNode = document.createTextNode(beforeText);
                const afterNode = document.createTextNode(afterText);
                
                parent.replaceChild(afterNode, node);
                parent.insertBefore(highlightSpan, afterNode);
                parent.insertBefore(beforeNode, highlightSpan);
                
                console.log('Highlight created, scrolling...');
                
                // Scroll to highlighted element with better positioning
                setTimeout(() => {
                    // First, scroll the element into view
                    highlightSpan.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                        inline: 'nearest'
                    });
                    
                    console.log('Scrolled to highlight position');
                }, 200);
                
                // Remove highlight after animation
                setTimeout(() => {
                    if (highlightSpan && highlightSpan.parentNode) {
                        const parent = highlightSpan.parentNode;
                        parent.replaceChild(document.createTextNode(matchText), highlightSpan);
                        parent.normalize();
                    }
                }, 8500);
                
                return true;
            } catch (error) {
                console.error('Could not create highlight, trying next node...', error);
                continue;
            }
        }
    }
    
    console.log('Searched', attempts, 'nodes, no match found');
    return false;
}

// Find and highlight text with context matching
function findAndHighlightText(searchText, contextBefore, contextAfter) {
    console.log('Starting context-based search...');
    
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                // Skip script and style elements and hidden elements
                if (node.parentElement.tagName === 'SCRIPT' || 
                    node.parentElement.tagName === 'STYLE' ||
                    node.parentElement.tagName === 'NOSCRIPT' ||
                    !node.parentElement.offsetParent) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        },
        false
    );
    
    let node;
    let bestMatch = null;
    let bestMatchScore = 0;
    let nodeCount = 0;
    
    while (node = walker.nextNode()) {
        nodeCount++;
        const nodeText = node.textContent;
        const index = nodeText.indexOf(searchText);
        
        if (index !== -1) {
            // Calculate match score based on context
            let score = 1;
            
            if (contextBefore && contextAfter) {
                const nodeBefore = nodeText.substring(Math.max(0, index - 120), index);
                const nodeAfter = nodeText.substring(index + searchText.length, Math.min(nodeText.length, index + searchText.length + 120));
                
                // Check context similarity  
                const beforeMatch = contextBefore.slice(-60);
                const afterMatch = contextAfter.slice(0, 60);
                
                if (nodeBefore.includes(beforeMatch) || beforeMatch.includes(nodeBefore)) {
                    score += 3;
                }
                if (nodeAfter.includes(afterMatch) || afterMatch.includes(nodeAfter)) {
                    score += 3;
                }
            }
            
            console.log('Found potential match with score ' + score);
            
            if (score > bestMatchScore) {
                bestMatchScore = score;
                bestMatch = { node, index };
            }
            
            // If perfect context match, use it immediately
            if (score >= 7) {
                console.log('Found perfect match!');
                break;
            }
        }
    }
    
    console.log('Searched ' + nodeCount + ' nodes');
    
    // Use best match found
    if (bestMatch) {
        console.log('Using best match with score ' + bestMatchScore);
        try {
            const node = bestMatch.node;
            const index = bestMatch.index;
            const nodeText = node.textContent;
            
            // Create highlight element
            const highlightSpan = document.createElement('span');
            highlightSpan.className = 'noter-highlight-temp';
            highlightSpan.style.cssText = `
                background: linear-gradient(135deg, rgba(102, 126, 234, 0.6) 0%, rgba(118, 75, 162, 0.6) 100%);
                padding: 5px 3px;
                border-radius: 4px;
                box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.4);
                animation: highlightPulse 2s ease-in-out 4;
                transition: all 0.3s;
                display: inline-block;
            `;
            
            // Extract the text
            const beforeText = nodeText.substring(0, index);
            const matchText = nodeText.substring(index, index + searchText.length);
            const afterText = nodeText.substring(index + searchText.length);
            
            highlightSpan.textContent = matchText;
            
            // Replace the text node
            const parent = node.parentNode;
            const beforeNode = document.createTextNode(beforeText);
            const afterNode = document.createTextNode(afterText);
            
            parent.replaceChild(afterNode, node);
            parent.insertBefore(highlightSpan, afterNode);
            parent.insertBefore(beforeNode, highlightSpan);
            
            // Scroll to highlighted element
            setTimeout(() => {
                // Scroll the element into view
                highlightSpan.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'nearest'
                });
                
                console.log('Scrolled to highlight position');
            }, 200);
            
            // Remove highlight after animation
            setTimeout(() => {
                if (highlightSpan && highlightSpan.parentNode) {
                    const parent = highlightSpan.parentNode;
                    parent.replaceChild(document.createTextNode(matchText), highlightSpan);
                    parent.normalize();
                }
            }, 8500);
            
            return true;
        } catch (error) {
            console.error('Error creating highlight:', error);
            return false;
        }
    }
    
    console.log('No match found with context');
    return false;
}

