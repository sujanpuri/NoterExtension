// Global state
let currentFilter = 'all';
let lastUsedCategory = null;
let categories = [];

// Load on startup
document.addEventListener('DOMContentLoaded', function() {
    loadCategories();
    loadHighlights();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // App title - click to open new tab
    document.querySelector('.app-title').addEventListener('click', function() {
        chrome.tabs.create({ url: 'https://www.sujanpuri.com.np/' });
    });
    
    // Quick Note button
    document.getElementById('quickNoteBtn').addEventListener('click', openQuickNoteModal);
    
    // Close modals
    document.getElementById('closeModalBtn').addEventListener('click', closeQuickNoteModal);
    document.getElementById('closeCategoryModalBtn').addEventListener('click', closeCategoryModal);
    
    // Save quick note
    document.getElementById('saveQuickNoteBtn').addEventListener('click', saveQuickNote);
    
    // Manage categories
    document.getElementById('manageCategoriesBtn').addEventListener('click', openCategoryModal);
    
    // Add category
    document.getElementById('addCategoryBtn').addEventListener('click', addCategory);
    
    // Category filter - all
    document.querySelector('[data-category="all"]').addEventListener('click', function() {
        filterByCategory('all');
    });
    
    // Close modal on background click
    document.getElementById('quickNoteModal').addEventListener('click', function(e) {
        if (e.target === this) closeQuickNoteModal();
    });
    
    document.getElementById('categoryModal').addEventListener('click', function(e) {
        if (e.target === this) closeCategoryModal();
    });
}

// Load categories from storage
function loadCategories() {
    chrome.storage.local.get(['categories', 'lastUsedCategory'], function(result) {
        categories = result.categories || [
            { id: 'work', name: 'Work', color: '#667eea' },
            { id: 'personal', name: 'Personal', color: '#764ba2' },
            { id: 'study', name: 'Study', color: '#f093fb' }
        ];
        lastUsedCategory = result.lastUsedCategory || categories[0].id;
        
        renderCategoryChips();
        renderCategoryList();
    });
}

// Render category filter chips
function renderCategoryChips() {
    const container = document.getElementById('categoryChips');
    container.innerHTML = '';
    
    categories.forEach(category => {
        const chip = document.createElement('button');
        chip.className = 'category-chip';
        chip.dataset.category = category.id;
        chip.textContent = category.name;
        chip.style.borderColor = category.color;
        
        if (currentFilter === category.id) {
            chip.classList.add('active');
            chip.style.background = category.color;
            chip.style.color = 'white';
        }
        
        chip.addEventListener('click', () => filterByCategory(category.id));
        container.appendChild(chip);
    });
}

// Render category management list
function renderCategoryList() {
    const container = document.getElementById('categoryList');
    container.innerHTML = '';
    
    categories.forEach(category => {
        const item = document.createElement('div');
        item.className = 'category-item';
        
        const info = document.createElement('div');
        info.className = 'category-info';
        
        const colorDot = document.createElement('div');
        colorDot.className = 'color-dot';
        colorDot.style.background = category.color;
        
        const name = document.createElement('span');
        name.className = 'category-name';
        name.textContent = category.name;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-category-btn';
        deleteBtn.textContent = '×';
        deleteBtn.onclick = () => deleteCategory(category.id);
        
        info.appendChild(colorDot);
        info.appendChild(name);
        item.appendChild(info);
        item.appendChild(deleteBtn);
        container.appendChild(item);
    });
}

// Filter highlights by category
function filterByCategory(categoryId) {
    currentFilter = categoryId;
    
    // Update active chip
    document.querySelectorAll('.category-chip').forEach(chip => {
        chip.classList.remove('active');
        const cat = categories.find(c => c.id === chip.dataset.category);
        if (chip.dataset.category === categoryId) {
            chip.classList.add('active');
            if (cat) {
                chip.style.background = cat.color;
                chip.style.color = 'white';
            } else if (categoryId === 'all') {
                chip.style.background = '#667eea';
                chip.style.color = 'white';
            }
        } else {
            chip.style.background = 'white';
            chip.style.color = '#666';
            if (cat) {
                chip.style.borderColor = cat.color;
            }
        }
    });
    
    loadHighlights();
}

// Load highlights from storage
function loadHighlights() {
    chrome.storage.local.get(['highlights'], function(result) {
        const highlightsList = document.getElementById('highlightsList');
        let highlights = result.highlights || [];
        
        // Filter by category
        if (currentFilter !== 'all') {
            highlights = highlights.filter(h => 
                h.categories && h.categories.includes(currentFilter)
            );
        }
        
        if (highlights.length === 0) {
            highlightsList.innerHTML = '<p class="empty-message">No notes yet. Select text on any webpage and click "Save"!</p>';
            return;
        }
        
        highlightsList.innerHTML = '';
        
        highlights.forEach(function(highlight) {
            const item = createHighlightElement(highlight);
            highlightsList.appendChild(item);
        });
    });
}

// Create highlight element
function createHighlightElement(highlight) {
    const item = document.createElement('div');
    item.className = 'highlight-item';
    
    // Get category color for border
    if (highlight.categories && highlight.categories.length > 0) {
        const category = categories.find(c => c.id === highlight.categories[0]);
        if (category) {
            item.style.borderLeftColor = category.color;
        }
    }
    
    // Category badges
    if (highlight.categories && highlight.categories.length > 0) {
        const categoriesDiv = document.createElement('div');
        categoriesDiv.className = 'highlight-categories';
        
        highlight.categories.forEach(catId => {
            const category = categories.find(c => c.id === catId);
            if (category) {
                const badge = document.createElement('span');
                badge.className = 'category-badge';
                badge.textContent = category.name;
                badge.style.background = category.color;
                categoriesDiv.appendChild(badge);
            }
        });
        
        item.appendChild(categoriesDiv);
    }
    
    // Actions
    const actions = document.createElement('div');
    actions.className = 'highlight-actions';
    
    const editBtn = document.createElement('button');
    editBtn.className = 'action-btn';
    editBtn.textContent = '🏷️';
    editBtn.title = 'Edit categories';
    editBtn.onclick = (e) => {
        e.stopPropagation();
        editHighlightCategories(highlight);
    };
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn delete';
    deleteBtn.textContent = '×';
    deleteBtn.title = 'Delete';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteHighlight(highlight.id);
    };
    
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    item.appendChild(actions);
    
    // Text
    const text = document.createElement('div');
    text.className = 'highlight-text';
    text.textContent = highlight.text;
    item.appendChild(text);
    
    // Meta - Only show time
    const meta = document.createElement('div');
    meta.className = 'highlight-meta';
    
    const date = document.createElement('span');
    date.textContent = formatDate(highlight.timestamp);
    date.style.fontSize = '11px';
    date.style.color = '#999';
    
    meta.appendChild(date);
    item.appendChild(meta);
    
    // Click to navigate directly
    item.addEventListener('click', function() {
        if (!highlight.isQuickNote) {
            navigateToHighlight(highlight);
        }
    });
    
    return item;
}

// Quick Note Modal
function openQuickNoteModal() {
    document.getElementById('quickNoteModal').classList.remove('hidden');
    document.getElementById('quickNoteText').focus();
}

function closeQuickNoteModal() {
    document.getElementById('quickNoteModal').classList.add('hidden');
    document.getElementById('quickNoteText').value = '';
}

function saveQuickNote() {
    const text = document.getElementById('quickNoteText').value.trim();
    if (!text) return;
    
    const highlight = {
        id: Date.now(),
        text: text,
        url: 'quick-note',
        title: 'Quick Note',
        timestamp: new Date().toISOString(),
        categories: [], // No category by default
        isQuickNote: true
    };
    
    chrome.storage.local.get(['highlights'], (result) => {
        const highlights = result.highlights || [];
        highlights.unshift(highlight);
        
        chrome.storage.local.set({ highlights: highlights }, () => {
            closeQuickNoteModal();
            loadHighlights();
        });
    });
}

// Category Modal
function openCategoryModal() {
    document.getElementById('categoryModal').classList.remove('hidden');
    renderCategoryList();
}

function closeCategoryModal() {
    document.getElementById('categoryModal').classList.add('hidden');
}

function addCategory() {
    const nameInput = document.getElementById('newCategoryName');
    const colorInput = document.getElementById('newCategoryColor');
    
    const name = nameInput.value.trim();
    const color = colorInput.value;
    
    if (!name) return;
    
    const newCategory = {
        id: Date.now().toString(),
        name: name,
        color: color
    };
    
    categories.push(newCategory);
    
    chrome.storage.local.set({ categories: categories }, () => {
        nameInput.value = '';
        colorInput.value = '#667eea';
        renderCategoryList();
        renderCategoryChips();
    });
}

function deleteCategory(categoryId) {
    if (confirm('Delete this category? Notes will keep their other categories.')) {
        categories = categories.filter(c => c.id !== categoryId);
        
        chrome.storage.local.set({ categories: categories }, () => {
            renderCategoryList();
            renderCategoryChips();
            loadHighlights();
        });
    }
}

// Edit highlight categories
function editHighlightCategories(highlight) {
    // Create category selection modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    const content = document.createElement('div');
    content.className = 'modal-content';
    content.style.maxWidth = '400px';
    
    const header = document.createElement('div');
    header.className = 'modal-header';
    
    const title = document.createElement('h3');
    title.textContent = 'Select Categories';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.textContent = '×';
    closeBtn.onclick = () => document.body.removeChild(modal);
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    // Categories checkboxes
    const categoriesContainer = document.createElement('div');
    categoriesContainer.style.cssText = 'padding: 20px; max-height: 300px; overflow-y: auto;';
    
    const selectedCategories = new Set(highlight.categories || []);
    
    categories.forEach(category => {
        const item = document.createElement('label');
        item.style.cssText = `
            display: flex;
            align-items: center;
            padding: 12px;
            margin-bottom: 8px;
            background: #f5f7fa;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.2s;
        `;
        
        item.addEventListener('mouseenter', function() {
            this.style.background = '#e8ecf1';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.background = '#f5f7fa';
        });
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = selectedCategories.has(category.id);
        checkbox.style.cssText = 'margin-right: 12px; width: 18px; height: 18px; cursor: pointer;';
        checkbox.onchange = () => {
            if (checkbox.checked) {
                selectedCategories.add(category.id);
            } else {
                selectedCategories.delete(category.id);
            }
        };
        
        const colorDot = document.createElement('div');
        colorDot.style.cssText = `
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: ${category.color};
            margin-right: 12px;
        `;
        
        const name = document.createElement('span');
        name.textContent = category.name;
        name.style.cssText = 'font-weight: 500; color: #333;';
        
        item.appendChild(checkbox);
        item.appendChild(colorDot);
        item.appendChild(name);
        categoriesContainer.appendChild(item);
    });
    
    // Footer with save button
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'save-btn';
    saveBtn.textContent = 'Save Categories';
    saveBtn.onclick = () => {
        chrome.storage.local.get(['highlights'], (result) => {
            const highlights = result.highlights || [];
            const index = highlights.findIndex(h => h.id === highlight.id);
            
            if (index !== -1) {
                highlights[index].categories = Array.from(selectedCategories);
                
                chrome.storage.local.set({ highlights: highlights }, () => {
                    document.body.removeChild(modal);
                    loadHighlights();
                });
            }
        });
    };
    
    footer.appendChild(saveBtn);
    
    content.appendChild(header);
    content.appendChild(categoriesContainer);
    content.appendChild(footer);
    modal.appendChild(content);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
    
    document.body.appendChild(modal);
}

// Delete highlight
function deleteHighlight(id) {
    if (confirm('Delete this note?')) {
        chrome.storage.local.get(['highlights'], function(result) {
            let highlights = result.highlights || [];
            highlights = highlights.filter(h => h.id !== id);
            
            chrome.storage.local.set({ highlights: highlights }, function() {
                loadHighlights();
            });
        });
    }
}

// Navigate to highlight
async function navigateToHighlight(highlight) {
    if (highlight.isQuickNote) return; // Quick notes don't navigate
    
    try {
        // Get the current active tab
        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Compare URLs (remove query params and hash for comparison)
        const currentURL = currentTab.url.split('?')[0].split('#')[0];
        const highlightURL = highlight.url.split('?')[0].split('#')[0];
        
        // If already on the same page, just scroll to the highlight
        if (currentURL === highlightURL) {
            console.log('Already on the destination page, scrolling to highlight...');
            
            // Send message to highlight and scroll
            chrome.tabs.sendMessage(currentTab.id, {
                action: 'highlightText',
                highlight: highlight
            }).catch(err => {
                console.log('Could not send message to tab:', err);
            });
        } else {
            // Different page - create a new tab
            console.log('Different page, creating new tab...');
            
            const newTab = await chrome.tabs.create({ 
                url: highlight.url,
                active: true // Make the new tab active
            });
            
            // Wait for the tab to fully load, then highlight the text
            chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
                if (tabId === newTab.id && info.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    
                    // Give a bit more time for the page to fully render
                    setTimeout(() => {
                        chrome.tabs.sendMessage(newTab.id, {
                            action: 'highlightText',
                            highlight: highlight
                        }).catch(err => {
                            console.log('Could not send message to tab:', err);
                        });
                    }, 800);
                }
            });
        }
    } catch (error) {
        console.error('Error navigating to highlight:', error);
    }
}

// Format date
function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
}

// Listen for storage changes
chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (changes.highlights) {
        loadHighlights();
    }
    if (changes.categories) {
        loadCategories();
    }
});
