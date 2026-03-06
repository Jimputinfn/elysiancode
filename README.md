# Elysian Code

A modern, cross-platform desktop IDE by [ElysianNodes](https://elysiannodes.uk), powered by Electron + Monaco Editor.

![Elysian Code](assets/icons/icon.png)

## ✨ Features

### Core Editor
- **🎨 VS Code-inspired dark UI** — familiar layout, clean aesthetic
- **⚡ Monaco Editor** — full syntax highlighting, IntelliSense, bracket pairing, minimap
- **📁 File Explorer** — open folders, navigate the tree, create/rename/delete files and folders
- **📑 Tabbed editing** — multi-file tabs, dirty indicators, middle-click to close
- **🔍 Search panel** — search across all files in the open folder
- **⌨️ Rich keybindings** — VS Code-like shortcuts for productivity

### Integrated Tools
- **🖥️ Integrated terminal** — xterm.js + node-pty, multi-terminal support, resize handle
- **🤖 ElysianAI panel** — Ctrl+L toggles a right-side panel with the ElysianAI chat interface
- **⚙️ Settings panel** — configure font size, theme, and account settings
- **🔐 Account integration** — seamless ElysianNodes login with re-authentication option

### Security & Architecture
- **🔒 Secure by design** — contextIsolation enabled, no nodeIntegration
- **🌐 Monaco from CDN** — fast loading, no local bundling required
- **📦 Cross-platform builds** — .deb, .AppImage (Linux) and .exe/.msi (Windows)

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+
- **npm** 8+
- **Linux**: `libgtk-3-dev`, `libwebkit2gtk-4.0-dev` (for AppImage builds)
- **Windows**: No extra deps needed

### Quick Start

```bash
# Clone and install
git clone <repository-url>
cd elysian-code
npm install

# Run in development mode
npm start

# Or with DevTools for debugging
npm run dev
```

## 🏗️ Project Structure

```
elysian-code/
├── src/
│   ├── main/
│   │   └── main.js          # Electron main process (BrowserWindow, IPC handlers, pty)
│   ├── preload/
│   │   └── preload.js       # contextBridge — safely exposes IPC to renderer
│   └── renderer/
│       ├── index.html       # App shell
│       ├── css/
│       │   └── main.css     # All styles (VS Code dark theme)
│       └── js/
│           ├── utils.js     # Shared helpers (path, toast, debounce, lang map)
│           ├── fileicons.js # SVG icon map per file extension
│           ├── filetree.js  # File explorer sidebar
│           ├── tabs.js      # Tab management
│           ├── editor.js    # Monaco editor wrapper (CDN loading)
│           ├── terminal.js  # xterm.js terminal panel
│           ├── search.js    # Folder-wide search
│           ├── menus.js     # Top menu bar + context menus
│           └── app.js       # Boot, keybindings, resizers, AI panel, login modal
├── assets/
│   └── icons/
│       ├── icon.png
│       └── icon.ico
├── package.json
└── README.md
```

## 📦 Building

### Linux (.deb + AppImage)

```bash
npm run build:linux
```

Output: `dist/`

### Windows (.exe NSIS installer + .msi)

```bash
npm run build:win
```

> To cross-compile for Windows from Linux, install Wine: `sudo apt install wine`

### All platforms

```bash
npm run build:all
```

## ⌨️ Keybindings

| Action               | Shortcut         |
|----------------------|------------------|
| **File Operations**  |                  |
| New File             | `Ctrl+N`         |
| Open Folder          | `Ctrl+K Ctrl+O`  |
| Save                 | `Ctrl+S`         |
| Save As              | `Ctrl+Shift+S`   |
| Close Tab            | `Ctrl+W`         |
| **Navigation**        |                  |
| Cycle Tabs           | `Ctrl+Tab`       |
| Toggle Sidebar       | `Ctrl+B`         |
| Explorer Panel       | `Ctrl+Shift+E`   |
| Search Panel         | `Ctrl+Shift+F`   |
| Settings Panel       | `Ctrl+,`         |
| **Editor**           |                  |
| Find in File         | `Ctrl+F`         |
| Replace in File      | `Ctrl+H`         |
| Format Document      | `Shift+Alt+F`    |
| Toggle Word Wrap     | `Alt+Z`          |
| Increase Font Size   | `Ctrl++`         |
| Decrease Font Size   | `Ctrl+-`         |
| Reset Font Size      | `Ctrl+0`         |
| **Panels**           |                  |
| Toggle Terminal      | `Ctrl+\``        |
| Toggle AI Panel      | `Ctrl+K`         |

## 🏛️ Architecture

### Security Model
All Node.js/OS access goes through a strict contextBridge boundary:

```
Renderer (renderer process)
    ↓ window.electronAPI.*
Preload (contextBridge)
    ↓ ipcRenderer.invoke()
Main process (ipcMain.handle())
    ↓ fs, node-pty, dialog
```

- **No `nodeIntegration`** — renderer cannot access Node APIs directly
- **`contextIsolation: true`** — prevents prototype pollution
- **CSP enforced** — content security policy for additional protection

### Monaco Editor Integration
Monaco is loaded from CDN using script tags to work with contextIsolation:
```javascript
// Monaco loads via require.js from CDN
// Works with contextIsolation: true
require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' }});
```

## 🛠️ Tech Stack

| Component     | Library/Version            |
|---------------|----------------------------|
| Shell         | Electron 28                |
| Editor        | Monaco Editor 0.44 (CDN)   |
| Terminal      | xterm.js 5.3 + node-pty 1  |
| Packaging     | electron-builder 24        |
| Styling       | Vanilla CSS (VS Code theme) |
| IPC           | contextBridge + ipcMain     |
| Module Loader | RequireJS 2.3.6            |

## 🔧 Configuration

### Settings Panel
Access via Settings button in activity bar or `Ctrl+,`:

- **Account**: Re-trigger ElysianNodes login
- **Application**: Font size slider, theme selector
- **Editor**: Monaco-specific settings

### Login Integration
- First-launch prompts for ElysianNodes sign-in
- Login state persisted in localStorage
- Settings panel allows re-authentication
- Webview isolation for secure login flow

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [ElysianNodes](https://elysiannodes.uk) — Hosting & Services
- [Electron Documentation](https://www.electronjs.org/docs)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [xterm.js](https://xtermjs.org/)
