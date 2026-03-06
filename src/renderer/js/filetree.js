// ── File Tree ─────────────────────────────────────────────────────────────────

const FileTree = {
  rootPath: null,
  expandedDirs: new Set(),

  async openFolder(folderPath) {
    if (!folderPath) {
      folderPath = await window.electronAPI.fs.openFolder();
    }
    if (!folderPath) return;
    this.rootPath = folderPath;
    this.expandedDirs.clear();
    this.expandedDirs.add(folderPath);
    
    // Save last project to localStorage
    localStorage.setItem('elysian_last_project', folderPath);
    
    // Clear any previous saved state for different projects
    if (folderPath !== localStorage.getItem('elysian_last_project')) {
      localStorage.removeItem('elysian_expanded_folders');
      localStorage.removeItem('elysian_open_files');
    }
    
    document.getElementById('no-folder-open').classList.add('hidden');
    const tree = document.getElementById('file-tree');
    tree.classList.remove('hidden');
    App.state.openFolder = folderPath;
    await this.render();
    
    // Restore expanded folders and open files after rendering
    this.restoreState();
    
    Terminal.updateCwd(folderPath);
  },

  saveState() {
    // Only save state if remember workspace is enabled
    if (localStorage.getItem('elysian_remember_workspace') === 'false') {
      return;
    }
    
    // Save expanded folders
    const expandedArray = Array.from(this.expandedDirs);
    localStorage.setItem('elysian_expanded_folders', JSON.stringify(expandedArray));
    
    // Save open file paths
    const openFilePaths = Tabs.tabs.map(tab => tab.path).filter(path => path);
    localStorage.setItem('elysian_open_files', JSON.stringify(openFilePaths));
  },

  async restoreState() {
    // Restore expanded folders
    const expandedSaved = localStorage.getItem('elysian_expanded_folders');
    if (expandedSaved) {
      try {
        const expandedArray = JSON.parse(expandedSaved);
        expandedArray.forEach(path => this.expandedDirs.add(path));
        
        // Re-render to show expanded folders
        await this.render();
      } catch (e) {
        console.warn('Failed to restore expanded folders:', e);
      }
    }
    
    // Restore open files
    const openFilesSaved = localStorage.getItem('elysian_open_files');
    if (openFilesSaved) {
      try {
        const openFilePaths = JSON.parse(openFilesSaved);
        // Open files with a small delay to avoid overwhelming the system
        openFilePaths.forEach((filePath, index) => {
          if (filePath) {
            setTimeout(() => {
              Tabs.openFile(filePath);
            }, index * 100); // Stagger file opening
          }
        });
      } catch (e) {
        console.warn('Failed to restore open files:', e);
      }
    }
  },

  async render() {
    const tree = document.getElementById('file-tree');
    tree.innerHTML = '';
    if (!this.rootPath) return;
    const rootLabel = document.createElement('div');
    rootLabel.className = 'tree-root-label';
    rootLabel.innerHTML = `<span>${path.basename(this.rootPath).toUpperCase()}</span>`;
    rootLabel.title = this.rootPath;
    tree.appendChild(rootLabel);
    await this.renderDir(tree, this.rootPath, 0);
  },

  async renderDir(container, dirPath, depth) {
    const result = await window.electronAPI.fs.readDir(dirPath);
    if (!result || result.error) return;
    for (const entry of result) {
      const item = this.createItem(entry, depth);
      container.appendChild(item);
      if (entry.isDirectory && this.expandedDirs.has(entry.path)) {
        const children = document.createElement('div');
        children.className = 'tree-children';
        children.dataset.path = entry.path;
        container.appendChild(children);
        await this.renderDir(children, entry.path, depth + 1);
      }
    }
  },

  createItem(entry, depth) {
    const item = document.createElement('div');
    item.className = 'tree-item';
    item.dataset.path = entry.path;
    item.dataset.isDir = entry.isDirectory;
    item.style.paddingLeft = `${12 + depth * 16}px`;

    const arrow = document.createElement('span');
    arrow.className = 'tree-item-arrow';
    if (entry.isDirectory) {
      arrow.innerHTML = '›';
      if (this.expandedDirs.has(entry.path)) arrow.classList.add('open');
    } else {
      arrow.classList.add('hidden-arrow');
    }

    const icon = document.createElement('span');
    icon.className = 'tree-item-icon';
    icon.innerHTML = FileIcons.getIcon(entry.name, entry.isDirectory, this.expandedDirs.has(entry.path));

    const name = document.createElement('span');
    name.className = 'tree-item-name';
    name.textContent = entry.name;

    item.appendChild(arrow);
    item.appendChild(icon);
    item.appendChild(name);

    // Click: open file or toggle dir
    item.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (entry.isDirectory) {
        await this.toggleDir(item, entry, depth);
      } else {
        Tabs.openFile(entry.path);
        document.querySelectorAll('.tree-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      }
    });

    // Right click context menu
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      ContextMenu.show(e.clientX, e.clientY, this.getContextMenu(entry, item));
    });

    return item;
  },

  async toggleDir(item, entry, depth) {
    const arrow = item.querySelector('.tree-item-arrow');
    const icon  = item.querySelector('.tree-item-icon');
    const nextSibling = item.nextElementSibling;

    if (this.expandedDirs.has(entry.path)) {
      this.expandedDirs.delete(entry.path);
      arrow.classList.remove('open');
      icon.innerHTML = FileIcons.getIcon(entry.name, true, false);
      if (nextSibling?.dataset?.path === entry.path) {
        nextSibling.remove();
      }
    } else {
      this.expandedDirs.add(entry.path);
      arrow.classList.add('open');
      icon.innerHTML = FileIcons.getIcon(entry.name, true, true);
      const children = document.createElement('div');
      children.className = 'tree-children';
      children.dataset.path = entry.path;
      item.insertAdjacentElement('afterend', children);
      await this.renderDir(children, entry.path, depth + 1);
    }
    
    // Save state after toggling
    this.saveState();
  },

  getContextMenu(entry, item) {
    const items = [];
    if (!entry.isDirectory) {
      items.push({ label: 'Open', action: () => Tabs.openFile(entry.path) });
      items.push({ separator: true });
    }
    items.push({
      label: 'New File',
      action: async () => {
        const dir = entry.isDirectory ? entry.path : path.dirname(entry.path);
        const result = await window.electronAPI.fs.newFile(dir);
        if (result?.success) { await this.render(); Tabs.openFile(result.path); }
      }
    });
    items.push({
      label: 'New Folder',
      action: async () => {
        const dir = entry.isDirectory ? entry.path : path.dirname(entry.path);
        const result = await window.electronAPI.fs.mkdir(dir);
        if (result?.success) await this.render();
      }
    });
    items.push({ separator: true });
    items.push({
      label: 'Rename',
      action: () => this.startRename(item, entry)
    });
    items.push({
      label: 'Delete', danger: true,
      action: async () => {
        const result = await window.electronAPI.fs.delete(entry.path);
        if (result?.success) {
          Tabs.closeByPath(entry.path);
          await this.render();
        }
      }
    });
    return items;
  },

  startRename(item, entry) {
    const nameEl = item.querySelector('.tree-item-name');
    const oldName = entry.name;
    const input = document.createElement('input');
    input.className = 'tree-rename-input';
    input.value = oldName;
    nameEl.replaceWith(input);
    input.focus();
    input.select();
    const finish = async () => {
      const newName = input.value.trim();
      if (newName && newName !== oldName) {
        const result = await window.electronAPI.fs.rename(entry.path, newName);
        if (result?.success) {
          Tabs.renameTab(entry.path, result.newPath);
          await this.render();
          return;
        }
      }
      const span = document.createElement('span');
      span.className = 'tree-item-name';
      span.textContent = oldName;
      input.replaceWith(span);
    };
    input.addEventListener('blur', finish);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); finish(); }
      if (e.key === 'Escape') {
        const span = document.createElement('span');
        span.className = 'tree-item-name';
        span.textContent = oldName;
        input.replaceWith(span);
      }
    });
  },

  highlightFile(filePath) {
    document.querySelectorAll('.tree-item').forEach(i => i.classList.remove('active'));
    const item = document.querySelector(`.tree-item[data-path="${CSS.escape(filePath)}"]`);
    if (item) item.classList.add('active');
  }
};
