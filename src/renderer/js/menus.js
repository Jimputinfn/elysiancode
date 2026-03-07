// ── Context Menu ──────────────────────────────────────────────────────────────

const ContextMenu = {
  show(x, y, items) {
    const menu = document.getElementById('context-menu');
    const itemsEl = document.getElementById('context-menu-items');
    itemsEl.innerHTML = '';
    for (const item of items) {
      if (item.separator) {
        const sep = document.createElement('div');
        sep.className = 'ctx-separator';
        itemsEl.appendChild(sep);
      } else {
        const el = document.createElement('div');
        el.className = 'ctx-item' + (item.danger ? ' danger' : '');
        el.innerHTML = `<span>${escapeHtml(item.label)}</span>${item.shortcut ? `<span class="shortcut">${item.shortcut}</span>` : ''}`;
        el.addEventListener('click', () => { this.hide(); item.action?.(); });
        itemsEl.appendChild(el);
      }
    }
    menu.style.left = x + 'px';
    menu.style.top  = y + 'px';
    menu.classList.remove('hidden');
    // Adjust if out of viewport
    requestAnimationFrame(() => {
      const r = menu.getBoundingClientRect();
      if (r.right  > window.innerWidth)  menu.style.left = (x - r.width) + 'px';
      if (r.bottom > window.innerHeight) menu.style.top  = (y - r.height) + 'px';
    });
  },
  hide() {
    document.getElementById('context-menu').classList.add('hidden');
  }
};

document.addEventListener('click',      () => ContextMenu.hide());
document.addEventListener('contextmenu', (e) => { if (!e.target.closest('#file-tree')) ContextMenu.hide(); });

// ── App Menus ─────────────────────────────────────────────────────────────────

const AppMenus = {
  activeMenu: null,

  menus: {
    file: [
      { label: 'New File',         shortcut: 'Ctrl+N',         action: () => Tabs.openUntitled() },
      { label: 'Open Folder...',   shortcut: 'Ctrl+K Ctrl+O',  action: () => FileTree.openFolder() },
      { separator: true },
      { label: 'Save',             shortcut: 'Ctrl+S',         action: () => Tabs.save() },
      { label: 'Save As...',       shortcut: 'Ctrl+Shift+S',   action: () => Tabs.saveAs() },
      { separator: true },
      { label: 'Close File',       shortcut: 'Ctrl+W',         action: () => Tabs.close(Tabs.activeId) },
    ],
    edit: [
      { label: 'Find',             shortcut: 'Ctrl+F',         action: () => Editor.find() },
      { label: 'Replace',          shortcut: 'Ctrl+H',         action: () => Editor.replace() },
      { separator: true },
      { label: 'Format Document',  shortcut: 'Shift+Alt+F',    action: () => Editor.format() },
      { label: 'Toggle Word Wrap', shortcut: 'Alt+Z',          action: () => Editor.toggleWordWrap() },
    ],
    view: [
      { label: 'Explorer',         shortcut: 'Ctrl+Shift+E',   action: () => App.showSidebarPanel('explorer') },
      { label: 'Search',           shortcut: 'Ctrl+Shift+F',   action: () => App.showSidebarPanel('search') },
      { label: 'Terminal',         shortcut: 'Ctrl+`',         action: () => Terminal.toggle() },
      { label: 'ElysianAI Panel',  shortcut: 'Ctrl+K',        action: () => App.toggleAI() },
      { separator: true },
      { label: 'Increase Font Size', shortcut: 'Ctrl++',       action: () => Editor.increaseFontSize() },
      { label: 'Decrease Font Size', shortcut: 'Ctrl+-',       action: () => Editor.decreaseFontSize() },
      { label: 'Reset Font Size',  shortcut: 'Ctrl+0',         action: () => Editor.resetFontSize() },
    ],
    terminal: [
      { label: 'New Terminal',     shortcut: '',               action: () => Terminal.create() },
      { label: 'Kill Terminal',    shortcut: '',               action: () => Terminal.killActive() },
      { label: 'Toggle Terminal',  shortcut: 'Ctrl+`',         action: () => Terminal.toggle() },
    ],
    help: [
      { label: 'Check for Updates...', shortcut: '', action: () => Updater.checkForUpdates(true) },
      { separator: true },
      { label: 'About Elysian Code', shortcut: '', action: () => this.showAbout() },
    ],
  },

  init() {
    document.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const menuName = item.dataset.menu;
        if (this.activeMenu === menuName) {
          this.close();
        } else {
          this.open(item, menuName);
        }
      });
    });
    document.addEventListener('click', () => this.close());
  },

  open(triggerEl, menuName) {
    this.activeMenu = menuName;
    const items = this.menus[menuName];
    if (!items) return;
    const dropdown = document.getElementById('menu-dropdown');
    const itemsEl  = document.getElementById('menu-items');
    itemsEl.innerHTML = '';
    for (const item of items) {
      if (item.separator) {
        const sep = document.createElement('div');
        sep.className = 'menu-separator';
        itemsEl.appendChild(sep);
      } else {
        const el = document.createElement('div');
        el.className = 'menu-item-entry';
        el.innerHTML = `<span>${escapeHtml(item.label)}</span>${item.shortcut ? `<span class="shortcut">${item.shortcut}</span>` : ''}`;
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          this.close();
          item.action?.();
        });
        itemsEl.appendChild(el);
      }
    }
    const rect = triggerEl.getBoundingClientRect();
    dropdown.style.left = rect.left + 'px';
    dropdown.classList.remove('hidden');
  },

  close() {
    this.activeMenu = null;
    document.getElementById('menu-dropdown').classList.add('hidden');
  },

  showAbout() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width: 400px;">
        <div class="modal-header">
          <h3>About Elysian Code</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div style="text-align: center; margin-bottom: 20px;">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="margin-bottom: 10px;">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#4fc3f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <h2>Elysian Code</h2>
            <p style="color: #999; margin: 5px 0;">Version: <span id="about-version">Loading...</span></p>
          </div>
          <p>A modern, cross-platform desktop IDE by ElysianNodes, powered by Electron + Monaco Editor.</p>
          <div style="margin-top: 15px; font-size: 0.9em; color: #999;">
            <p>© 2025 ElysianNodes</p>
            <p>License: MIT</p>
            <p><a href="https://github.com/elysiannodes/elysian-code" target="_blank" style="color: #4fc3f7;">GitHub Repository</a></p>
          </div>
          <div style="margin-top: 20px;">
            <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">OK</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Load version info
    Updater.getCurrentVersion().then(version => {
      const versionEl = document.getElementById('about-version');
      if (versionEl && version) {
        versionEl.textContent = `v${version}`;
      }
    });

    // Event listeners
    modal.querySelector('.modal-close').addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }
};
