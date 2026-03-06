// ── Tabs ──────────────────────────────────────────────────────────────────────

const Tabs = {
  tabs: [],       // { id, path, name, content, dirty, language }
  activeId: null,
  nextId: 1,

  async openFile(filePath) {
    // Check if already open
    const existing = this.tabs.find(t => t.path === filePath);
    if (existing) {
      this.activate(existing.id);
      return;
    }
    const result = await window.electronAPI.fs.readFile(filePath);
    if (result.error) { showToast(`Error: ${result.error}`); return; }

    const name = path.basename(filePath);
    const ext  = path.extname(filePath).slice(1);
    const lang = getLanguageFromExt(ext);

    const tab = {
      id: this.nextId++,
      path: filePath,
      name,
      content: result.content,
      dirty: false,
      language: lang,
    };
    this.tabs.push(tab);
    this.renderTabs();
    this.activate(tab.id);
    FileTree.highlightFile(filePath);
    
    // Save state when a file is opened
    FileTree.saveState();
  },

  openUntitled() {
    const tab = {
      id: this.nextId++,
      path: null,
      name: `Untitled-${this.nextId}`,
      content: '',
      dirty: false,
      language: 'plaintext',
    };
    this.tabs.push(tab);
    this.renderTabs();
    this.activate(tab.id);
  },

  activate(id) {
    this.activeId = id;
    this.renderTabs();
    const tab = this.getActive();
    if (!tab) return;

    // Show editor, hide welcome
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('editor-container').classList.remove('hidden');

    Editor.setContent(tab.content, tab.language, tab.path);
    document.getElementById('title-filename').textContent = tab.name + (tab.dirty ? ' ●' : '');
    document.getElementById('status-lang').textContent = getLangDisplayName(tab.language);
    FileTree.highlightFile(tab.path);
  },

  getActive() {
    return this.tabs.find(t => t.id === this.activeId);
  },

  getById(id) {
    return this.tabs.find(t => t.id === id);
  },

  markDirty(id) {
    const tab = this.getById(id);
    if (!tab || tab.dirty) return;
    tab.dirty = true;
    this.renderTabs();
    document.getElementById('title-filename').textContent = tab.name + ' ●';
  },

  markClean(id) {
    const tab = this.getById(id);
    if (!tab) return;
    tab.dirty = false;
    this.renderTabs();
    document.getElementById('title-filename').textContent = tab.name;
  },

  updateContent(id, content) {
    const tab = this.getById(id);
    if (tab) tab.content = content;
  },

  async save(id) {
    const tab = this.getById(id || this.activeId);
    if (!tab) return;
    if (!tab.path) {
      await this.saveAs(tab.id);
      return;
    }
    const result = await window.electronAPI.fs.saveFile(tab.path, tab.content);
    if (result.success) {
      this.markClean(tab.id);
      showToast(`Saved: ${tab.name}`);
    } else {
      showToast(`Error saving: ${result.error}`);
    }
  },

  async saveAs(id) {
    const tab = this.getById(id || this.activeId);
    if (!tab) return;
    const result = await window.electronAPI.fs.saveFileAs(tab.path || tab.name, tab.content);
    if (result?.success) {
      tab.path = result.path;
      tab.name = path.basename(result.path);
      const ext = path.extname(result.path).slice(1);
      tab.language = getLanguageFromExt(ext);
      this.markClean(tab.id);
      showToast(`Saved: ${tab.name}`);
      this.activate(tab.id);
    }
  },

  close(id, force = false) {
    const tab = this.getById(id);
    if (!tab) return;
    if (tab.dirty && !force) {
      if (!confirm(`"${tab.name}" has unsaved changes. Close without saving?`)) return;
    }
    const idx = this.tabs.indexOf(tab);
    this.tabs.splice(idx, 1);
    if (this.activeId === id) {
      const next = this.tabs[Math.min(idx, this.tabs.length - 1)];
      if (next) {
        this.activate(next.id);
      } else {
        this.activeId = null;
        document.getElementById('welcome-screen').classList.remove('hidden');
        document.getElementById('editor-container').classList.add('hidden');
        document.getElementById('title-filename').textContent = '';
        document.getElementById('status-lang').textContent = 'Plain Text';
        Editor.clear();
      }
    }
    this.renderTabs();
    
    // Save state when a tab is closed
    FileTree.saveState();
  },

  closeByPath(filePath) {
    const tab = this.tabs.find(t => t.path === filePath);
    if (tab) this.close(tab.id, true);
  },

  renameTab(oldPath, newPath) {
    const tab = this.tabs.find(t => t.path === oldPath);
    if (!tab) return;
    tab.path = newPath;
    tab.name = path.basename(newPath);
    const ext = path.extname(newPath).slice(1);
    tab.language = getLanguageFromExt(ext);
    if (this.activeId === tab.id) {
      document.getElementById('title-filename').textContent = tab.name;
      document.getElementById('status-lang').textContent = getLangDisplayName(tab.language);
      Editor.updateLanguage(tab.language);
    }
    this.renderTabs();
  },

  renderTabs() {
    const container = document.getElementById('tabs-container');
    container.innerHTML = '';
    for (const tab of this.tabs) {
      const el = document.createElement('div');
      el.className = 'tab' + (tab.id === this.activeId ? ' active' : '');
      el.dataset.id = tab.id;
      const ext = path.extname(tab.name).slice(1);
      el.innerHTML = `
        <span class="tab-icon">${FileIcons.getIcon(tab.name, false, false)}</span>
        <span class="tab-name">${escapeHtml(tab.name)}</span>
        ${tab.dirty ? '<span class="tab-dirty">•</span>' : ''}
        <button class="tab-close" title="Close">×</button>
      `;
      el.addEventListener('click', (e) => {
        if (e.target.closest('.tab-close')) {
          this.close(tab.id);
        } else {
          this.activate(tab.id);
        }
      });
      el.addEventListener('mousedown', (e) => {
        if (e.button === 1) { e.preventDefault(); this.close(tab.id); }
      });
      container.appendChild(el);
      // Scroll active tab into view
      if (tab.id === this.activeId) {
        requestAnimationFrame(() => el.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
      }
    }
  }
};
