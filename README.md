# Chrome Sidebar Extension

A Chrome extension that opens in the right sidebar - **100% JavaScript, no Python needed!**

## Features

- 📝 **Quick Notes**: Write and save notes that persist across sessions
- 🔗 **Quick Links**: Add and manage your favorite links
- 🎨 **Modern UI**: Beautiful gradient design with smooth animations
- 💾 **Auto-save**: Notes are automatically saved as you type
- ⚡ **Pure JavaScript**: No build tools or additional dependencies required

## Installation

### Load the Extension in Chrome

1. Open Google Chrome
2. Navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the folder containing this extension (`d:\Coding\Noter`)
6. Done! The extension is now installed

**Note:** The extension will work immediately, even without custom icons. Chrome will use a default icon if none is provided.

### Open the Sidebar

1. Click the extension icon in the Chrome toolbar (or the puzzle icon if it's hidden)
2. The sidebar will open on the right side of your browser!

## Usage

### Taking Notes
- Type your notes in the text area
- Notes are auto-saved after 1 second of inactivity
- Click "Save Note" to manually save
- Your notes persist across Chrome sessions

### Managing Links
- Default links (Google, GitHub) are provided
- Type a URL in the input field and click "Add Link"
- URLs are automatically formatted with https:// if needed
- Click the "×" button next to any link to remove it

## File Structure

```
d:\Coding\Noter\
├── manifest.json       # Extension configuration (Manifest V3)
├── sidebar.html        # Sidebar HTML structure
├── sidebar.css         # Styling and design
├── sidebar.js          # All functionality (pure JavaScript)
└── README.md           # This file
```

## Technology Stack

- **HTML5** - Structure
- **CSS3** - Styling with gradients and animations
- **Vanilla JavaScript** - All functionality
- **Chrome Storage API** - Data persistence
- **Chrome Side Panel API** - Sidebar integration

**No frameworks, no build tools, no Python required!**

## Customization

### Change Colors
Edit `sidebar.css` and modify the gradient:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Modify Content
Edit `sidebar.html` to add/remove sections or change text.

### Add Features
Edit `sidebar.js` to add new functionality. The extension uses:
- `chrome.storage.local` for data persistence
- Standard DOM APIs for UI manipulation

## Browser Requirements

- **Minimum Chrome version**: 114
- **API used**: Side Panel API (Manifest V3)

## Troubleshooting

### Sidebar doesn't open
- Ensure Chrome version 114 or higher
- Try reloading the extension in `chrome://extensions/`
- Check that the extension is enabled

### Notes won't save
- Open browser console (F12) in the sidebar to check for errors
- Verify the extension has storage permissions
- Try removing and reinstalling the extension

## Permissions

This extension requires:
- `sidePanel`: Display content in Chrome's side panel

All data is stored locally in your browser. Nothing is sent to external servers.

---

**Pure JavaScript. Zero dependencies. Just works.** ✨
