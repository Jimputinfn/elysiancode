// ── App ───────────────────────────────────────────────────────────────────────

const App = {
  state: {
    openFolder: null,
    aiPanelOpen: false,
    sidebarVisible: true,
  },

  async init() {
    // Init sub-modules
    await Editor.init();
    Terminal.init();
    Search.init();
    AppMenus.init();
    this.initResizers();
    this.initActivityBar();
    this.initKeybindings();
    this.initWelcome();
    this.initLoginModal();
    this.initAIPanel();
    this.initStatusBar();
    Git.init(); // Initialize Git integration

    // Check first-launch login prompt
    this.checkFirstLaunch();
    
    // Check for last worked project
    this.checkLastProject();
  },

  // ── Login Modal ─────────────────────────────────────────────────────────────

  checkFirstLaunch() {
    const seen = localStorage.getItem('elysian_login_seen');
    if (!seen) {
      document.getElementById('login-modal').classList.remove('hidden');
    }
  },

  checkLastProject() {
    const autoOpenEnabled = localStorage.getItem('elysian_auto_open_project') !== 'false';
    const rememberWorkspace = localStorage.getItem('elysian_remember_workspace') !== 'false';
    const lastProject = localStorage.getItem('elysian_last_project');
    
    // Update checkbox states
    document.getElementById('auto-open-project').checked = autoOpenEnabled;
    document.getElementById('remember-workspace').checked = rememberWorkspace;
    
    if (autoOpenEnabled && lastProject && FileTree.rootPath !== lastProject) {
      // Auto-open last project after a short delay to ensure UI is ready
      setTimeout(() => {
        FileTree.openFolder(lastProject);
      }, 100);
    }
  },

  initLoginModal() {
    const modal    = document.getElementById('login-modal');
    const btnLogin = document.getElementById('btn-login');
    const btnSkip  = document.getElementById('btn-skip');
    const btnClose = document.getElementById('modal-close');
    const webviewContainer = document.getElementById('login-webview-container');
    const modalBody = document.querySelector('.modal-body');
    const btnBack   = document.getElementById('webview-back');

    const dismiss = () => {
      modal.classList.add('hidden');
      localStorage.setItem('elysian_login_seen', '1');
    };

    btnLogin.addEventListener('click', () => {
      dismiss();
      this.toggleAI();
    });

    btnBack.addEventListener('click', () => {
      webviewContainer.classList.add('hidden');
      modalBody.classList.remove('hidden');
      modal.querySelector('.modal').classList.remove('webview-expanded');
    });

    btnSkip.addEventListener('click', dismiss);
    btnClose.addEventListener('click', dismiss);

    // Detect successful login (URL change away from /login)
    const webview = document.getElementById('login-webview');
    
    // Add error handling for webview
    webview.addEventListener('did-fail-load', (e) => {
      console.error('Webview failed to load:', e);
    });
    
    webview.addEventListener('dom-ready', () => {
      console.log('Webview DOM ready');
    });
    
    webview.addEventListener('did-navigate', (e) => {
      console.log('Webview navigated to:', e.url);
      if (e.url && !e.url.includes('/login') && !e.url.includes('/register')) {
        setTimeout(dismiss, 800);
      }
    });
  },

  // ── AI Panel ────────────────────────────────────────────────────────────────

  initAIPanel() {
    document.getElementById('btn-close-ai').addEventListener('click', () => this.toggleAI());
    document.getElementById('btn-ai-toggle').addEventListener('click', () => this.toggleAI());
  },

  toggleAI() {
    this.state.aiPanelOpen = !this.state.aiPanelOpen;
    const panel = document.getElementById('ai-panel');
    const btn   = document.getElementById('btn-ai-toggle');
    panel.style.display = this.state.aiPanelOpen ? 'flex' : 'none';
    btn.classList.toggle('active', this.state.aiPanelOpen);
    if (this.state.aiPanelOpen) {
      panel.classList.remove('hidden');
    } else {
      panel.classList.add('hidden');
    }
    Editor.instance?.layout();
  },

  // ── Activity Bar ────────────────────────────────────────────────────────────

  initActivityBar() {
    document.querySelectorAll('.activity-btn[data-panel]').forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = btn.dataset.panel;
        const isActive = btn.classList.contains('active');
        if (isActive) {
          this.toggleSidebar();
        } else {
          if (!this.state.sidebarVisible) this.showSidebar();
          this.showSidebarPanel(panel);
        }
      });
    });

    document.getElementById('btn-open-folder').addEventListener('click', () => FileTree.openFolder());
    document.getElementById('btn-open-folder-2').addEventListener('click', () => FileTree.openFolder());
    document.getElementById('btn-new-file').addEventListener('click', async () => {
      if (FileTree.rootPath) {
        const result = await window.electronAPI.fs.newFile(FileTree.rootPath);
        if (result?.success) {
          await FileTree.render();
          Tabs.openFile(result.path);
        }
      } else {
        Tabs.openUntitled();
      }
    });
    document.getElementById('btn-new-folder').addEventListener('click', () => {
      window.electronAPI.fs.mkdir(FileTree.rootPath).then(r => { if (r?.success) FileTree.render(); });
    });
    document.getElementById('btn-refresh').addEventListener('click', () => FileTree.render());
    document.getElementById('btn-settings').addEventListener('click', () => this.showSidebarPanel('settings'));
    this.initSettings();
  },

  initSettings() {
    // Retrigger login button
    document.getElementById('btn-relogin').addEventListener('click', () => {
      this.toggleAI();
    });

    // Panel webview navigation
    const panelWebview = document.getElementById('login-webview-panel');
    const panelBackBtn = document.getElementById('webview-back-panel');
    const panelUrlSpan = document.getElementById('webview-url-panel');

    panelWebview.addEventListener('did-navigate', (e) => {
      panelUrlSpan.textContent = e.url;
      panelBackBtn.style.display = panelWebview.canGoBack() ? 'block' : 'none';
    });

    panelBackBtn.addEventListener('click', () => {
      if (panelWebview.canGoBack()) {
        panelWebview.goBack();
      }
    });

    // Auto-open project toggle
    document.getElementById('auto-open-project').addEventListener('change', (e) => {
      localStorage.setItem('elysian_auto_open_project', e.target.checked ? 'true' : 'false');
    });

    // Remember workspace toggle
    document.getElementById('remember-workspace').addEventListener('change', (e) => {
      localStorage.setItem('elysian_remember_workspace', e.target.checked ? 'true' : 'false');
    });

    // Font size slider
    const fontSizeSlider = document.getElementById('font-size-slider');
    const fontSizeValue = document.getElementById('font-size-value');
    fontSizeSlider.addEventListener('input', (e) => {
      const size = e.target.value;
      fontSizeValue.textContent = `${size}px`;
      Editor.instance?.updateOptions({ fontSize: parseInt(size) });
    });

    // Theme selector
    document.getElementById('theme-select').addEventListener('change', (e) => {
      this.switchTheme(e.target.value);
    });

    // Load saved theme
    const savedTheme = localStorage.getItem('elysian_theme') || 'dark';
    document.getElementById('theme-select').value = savedTheme;
    this.switchTheme(savedTheme);

    // Load app version
    this.loadAppVersion();
  },

  switchTheme(theme) {
    localStorage.setItem('elysian_theme', theme);
    document.body.setAttribute('data-theme', theme);
    
    // Update Monaco editor theme
    if (Editor.instance) {
      const monacoTheme = theme === 'light' ? 'vs' : 'vs-dark';
      monaco.editor.setTheme(monacoTheme);
    }
  },

  async loadAppVersion() {
    try {
      const version = await window.electronAPI.app.getVersion();
      document.getElementById('app-version').textContent = version;
    } catch (err) {
      document.getElementById('app-version').textContent = 'Unknown';
    }
  },

  showSidebarPanel(name) {
    document.querySelectorAll('.sidebar-panel').forEach(p => {
      p.classList.toggle('active', p.id === `panel-${name}`);
      p.classList.toggle('hidden', p.id !== `panel-${name}`);
    });
    document.querySelectorAll('.activity-btn[data-panel]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.panel === name);
    });
    if (name === 'search') {
      setTimeout(() => document.getElementById('search-input').focus(), 50);
    }
  },

  toggleSidebar() {
    if (this.state.sidebarVisible) this.hideSidebar();
    else this.showSidebar();
  },

  showSidebar() {
    this.state.sidebarVisible = true;
    document.getElementById('sidebar').style.display = '';
    document.getElementById('sidebar-resizer').style.display = '';
  },

  hideSidebar() {
    this.state.sidebarVisible = false;
    document.getElementById('sidebar').style.display = 'none';
    document.getElementById('sidebar-resizer').style.display = 'none';
    document.querySelectorAll('.activity-btn[data-panel]').forEach(b => b.classList.remove('active'));
  },

  // ── Welcome screen links ────────────────────────────────────────────────────

  initWelcome() {
    document.getElementById('wc-open-folder')?.addEventListener('click', (e) => {
      e.preventDefault();
      FileTree.openFolder();
    });
    document.getElementById('wc-new-file')?.addEventListener('click', (e) => {
      e.preventDefault();
      Tabs.openUntitled();
    });
    document.getElementById('wc-open-ai')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleAI();
    });
  },

  // ── Status Bar ──────────────────────────────────────────────────────────────

  initStatusBar() {
    document.getElementById('status-lang').addEventListener('click', () => {
      if (!Editor.instance) return;
      const lang = prompt('Enter language (e.g., javascript, python, html):');
      if (lang) Editor.updateLanguage(lang);
    });
    document.getElementById('status-eol').addEventListener('click', () => {
      showToast('EOL: LF (default)');
    });
    document.getElementById('status-encoding').addEventListener('click', () => {
      showToast('Encoding: UTF-8');
    });
  },

  // ── Keybindings ─────────────────────────────────────────────────────────────

  initKeybindings() {
    document.addEventListener('keydown', (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'k') {
        e.preventDefault();
        this.toggleAI();
      }
      if (ctrl && e.key === 'n') {
        e.preventDefault();
        Tabs.openUntitled();
      }
      if (ctrl && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        this.showSidebarPanel('explorer');
      }
      if (ctrl && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        this.showSidebarPanel('search');
      }
      if (ctrl && e.key === 'b') {
        e.preventDefault();
        this.toggleSidebar();
      }
      if (ctrl && e.key === '`') {
        e.preventDefault();
        Terminal.toggle();
      }
      if (ctrl && e.key === 's' && !e.shiftKey) {
        e.preventDefault();
        Tabs.save();
      }
      if (ctrl && e.shiftKey && e.key === 's') {
        e.preventDefault();
        Tabs.saveAs();
      }
      if (ctrl && e.key === 'w') {
        e.preventDefault();
        Tabs.close(Tabs.activeId);
      }
      if (ctrl && e.key === '+' || (ctrl && e.key === '=')) {
        e.preventDefault();
        Editor.increaseFontSize();
      }
      if (ctrl && e.key === '-') {
        e.preventDefault();
        Editor.decreaseFontSize();
      }
      if (ctrl && e.key === '0') {
        e.preventDefault();
        Editor.resetFontSize();
      }
      // Tab cycling
      if (ctrl && e.key === 'Tab') {
        e.preventDefault();
        const idx = Tabs.tabs.findIndex(t => t.id === Tabs.activeId);
        const next = Tabs.tabs[(idx + 1) % Tabs.tabs.length];
        if (next) Tabs.activate(next.id);
      }
    });
  },

  // ── Resizers ─────────────────────────────────────────────────────────────────

  initResizers() {
    // Sidebar resizer (horizontal drag)
    const sidebarResizer = document.getElementById('sidebar-resizer');
    const sidebar = document.getElementById('sidebar');
    let isDraggingSidebar = false;
    let sidebarStartX, sidebarStartWidth;

    sidebarResizer.addEventListener('mousedown', (e) => {
      isDraggingSidebar = true;
      sidebarStartX = e.clientX;
      sidebarStartWidth = sidebar.offsetWidth;
      sidebarResizer.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDraggingSidebar) return;
      const dx = e.clientX - sidebarStartX;
      const newW = Math.max(150, Math.min(600, sidebarStartWidth + dx));
      sidebar.style.width = newW + 'px';
      document.documentElement.style.setProperty('--sidebar-width', newW + 'px');
    });

    document.addEventListener('mouseup', () => {
      if (isDraggingSidebar) {
        isDraggingSidebar = false;
        sidebarResizer.classList.remove('dragging');
        document.body.style.cursor = '';
      }
      if (isDraggingTerminal) {
        isDraggingTerminal = false;
        terminalResizer.classList.remove('dragging');
        document.body.style.cursor = '';
        Terminal.fitAll();
      }
    });

    // Terminal resizer (vertical drag)
    const terminalResizer = document.getElementById('terminal-resizer');
    const terminalPanel   = document.getElementById('terminal-panel');
    let isDraggingTerminal = false;
    let termStartY, termStartH;

    terminalResizer.addEventListener('mousedown', (e) => {
      isDraggingTerminal = true;
      termStartY = e.clientY;
      termStartH = terminalPanel.offsetHeight;
      terminalResizer.classList.add('dragging');
      document.body.style.cursor = 'row-resize';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDraggingTerminal) return;
      const dy = termStartY - e.clientY;
      const newH = Math.max(80, Math.min(600, termStartH + dy));
      terminalPanel.style.height = newH + 'px';
    });
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
