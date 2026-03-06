// ── Git Integration ───────────────────────────────────────────────────────────

const Git = {
  state: {
    currentBranch: null,
    status: null,
    isRepo: false
  },

  async init() {
    await this.checkRepo();
    this.updateUI();
  },

  async checkRepo() {
    if (!FileTree.rootPath) return;
    
    const result = await window.electronAPI.git.branch(FileTree.rootPath);
    this.state.isRepo = !result.error;
    this.state.currentBranch = result.stdout || null;
  },

  async getStatus() {
    if (!this.state.isRepo) return null;
    
    const result = await window.electronAPI.git.status(FileTree.rootPath);
    if (result.error) return null;
    
    this.state.status = this.parseStatus(result.stdout);
    return this.state.status;
  },

  parseStatus(output) {
    const files = {
      staged: [],
      modified: [],
      untracked: [],
      deleted: []
    };

    output.split('\n').forEach(line => {
      if (!line) return;
      
      const index = line[0];
      const worktree = line[1];
      const filepath = line.slice(3);
      
      if (index === ' ' && worktree === ' ') return;
      if (index === '?' && worktree === '?') {
        files.untracked.push(filepath);
      } else if (worktree === 'M') {
        files.modified.push(filepath);
      } else if (worktree === 'D') {
        files.deleted.push(filepath);
      } else if (index !== ' ' && index !== '?') {
        files.staged.push(filepath);
      }
    });

    return files;
  },

  async add(files) {
    if (!this.state.isRepo) return;
    
    const filesToAdd = Array.isArray(files) ? files : [files];
    await window.electronAPI.git.add(filesToAdd, FileTree.rootPath);
    await this.getStatus();
    this.updateUI();
  },

  async commit(message) {
    if (!this.state.isRepo || !message.trim()) return;
    
    await window.electronAPI.git.commit(message.trim(), FileTree.rootPath);
    await this.getStatus();
    this.updateUI();
  },

  async push() {
    if (!this.state.isRepo) return;
    
    const result = await window.electronAPI.git.push('origin', this.state.currentBranch, FileTree.rootPath);
    if (result.error) {
      showToast(`Push failed: ${result.error}`);
    } else {
      showToast('Pushed successfully');
      await this.getStatus();
      this.updateUI();
    }
  },

  async pull() {
    if (!this.state.isRepo) return;
    
    const result = await window.electronAPI.git.pull('origin', this.state.currentBranch, FileTree.rootPath);
    if (result.error) {
      showToast(`Pull failed: ${result.error}`);
    } else {
      showToast('Pulled successfully');
      await this.getStatus();
      await FileTree.render(); // Refresh file tree
      this.updateUI();
    }
  },

  async init() {
    if (!FileTree.rootPath) return;
    
    await window.electronAPI.git.init(FileTree.rootPath);
    await this.checkRepo();
    this.updateUI();
    showToast('Git repository initialized');
  },

  updateUI() {
    const panel = document.getElementById('panel-git');
    if (!panel) return;

    if (!this.state.isRepo) {
      panel.innerHTML = `
        <div class="git-panel-content">
          <div class="git-no-repo">
            <p>No Git repository found</p>
            <button class="btn-primary" onclick="Git.init()">Initialize Git Repo</button>
          </div>
        </div>
      `;
      return;
    }

    const status = this.state.status;
    let statusHtml = '';

    if (status) {
      statusHtml = `
        <div class="git-section">
          <h4>Changes</h4>
          ${status.staged.length > 0 ? `
            <div class="git-group">
              <strong>Staged (${status.staged.length})</strong>
              ${status.staged.map(file => `
                <div class="git-file staged">
                  <span>${file}</span>
                  <button class="btn-small" onclick="Git.unstage('${file}')">×</button>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          ${status.modified.length > 0 ? `
            <div class="git-group">
              <strong>Modified (${status.modified.length})</strong>
              ${status.modified.map(file => `
                <div class="git-file modified">
                  <span>${file}</span>
                  <button class="btn-small" onclick="Git.add('${file}')">+</button>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          ${status.untracked.length > 0 ? `
            <div class="git-group">
              <strong>Untracked (${status.untracked.length})</strong>
              ${status.untracked.map(file => `
                <div class="git-file untracked">
                  <span>${file}</span>
                  <button class="btn-small" onclick="Git.add('${file}')">+</button>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }

    panel.innerHTML = `
      <div class="git-panel-content">
        <div class="git-header">
          <span class="git-branch">📍 ${this.state.currentBranch || 'main'}</span>
          <div class="git-actions">
            <button class="btn-small" onclick="Git.pull()">Pull</button>
            <button class="btn-small" onclick="Git.push()">Push</button>
          </div>
        </div>
        
        ${statusHtml}
        
        <div class="git-section">
          <h4>Commit</h4>
          <textarea id="commit-message" placeholder="Commit message..." rows="3"></textarea>
          <button class="btn-primary" onclick="Git.commitFromUI()">Commit</button>
        </div>
      </div>
    `;
  },

  async commitFromUI() {
    const message = document.getElementById('commit-message').value;
    if (!message.trim()) {
      showToast('Please enter a commit message');
      return;
    }
    
    await this.commit(message);
    document.getElementById('commit-message').value = '';
  },

  getFileStatus(filePath) {
    if (!this.state.status) return null;
    
    if (this.state.status.staged.includes(filePath)) return 'staged';
    if (this.state.status.modified.includes(filePath)) return 'modified';
    if (this.state.status.untracked.includes(filePath)) return 'untracked';
    if (this.state.status.deleted.includes(filePath)) return 'deleted';
    
    return null;
  }
};
