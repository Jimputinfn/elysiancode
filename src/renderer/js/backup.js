// ── Backup Manager ───────────────────────────────────────────────────────────────

const Backup = {
  state: {
    backups: [],
    selectedBackup: null,
    isLoading: false,
    stats: null
  },

  // Helper function to get basename from path
  getBasename(filePath) {
    return filePath.split('/').pop().split('\\').pop();
  },

  async init() {
    // Add a small delay to ensure the DOM is ready
    setTimeout(() => {
      this.loadBackups();
      this.loadStats();
    }, 100);
  },

  async loadBackups() {
    try {
      console.log('Starting to load backups...');
      this.state.isLoading = true;
      this.updateLoadingState();
      
      // Check if the API is available
      if (!window.electronAPI || !window.electronAPI.backup) {
        console.error('Backup API not available');
        this.state.isLoading = false;
        this.updateLoadingState();
        this.renderBackups(); // Render empty state
        this.showToast('Backup API not available', 'error');
        return;
      }
      
      console.log('Calling backup.list()...');
      const backups = await window.electronAPI.backup.list();
      console.log('Raw backups response:', backups);
      
      this.state.backups = Array.isArray(backups) ? backups : [];
      console.log('Processed backups:', this.state.backups.length, 'items');
      
      this.state.isLoading = false;
      this.updateLoadingState();
      this.renderBackups();
      this.updateStats();
    } catch (error) {
      console.error('Failed to load backups:', error);
      this.state.isLoading = false;
      this.updateLoadingState();
      this.renderBackups(); // Render empty state
      this.showToast('Failed to load backups', 'error');
    }
  },

  async loadStats() {
    try {
      console.log('Loading backup stats...');
      if (!window.electronAPI || !window.electronAPI.backup) {
        console.error('Backup API not available for stats');
        return;
      }
      
      const stats = await window.electronAPI.backup.getStats();
      console.log('Stats loaded:', stats);
      this.state.stats = stats;
      this.updateStatsDisplay();
    } catch (error) {
      console.error('Failed to load backup stats:', error);
    }
  },

  // Add a manual refresh method
  async refreshBackups() {
    console.log('Manual refresh triggered');
    await this.loadBackups();
    await this.loadStats();
  },

  async createBackup(options = {}) {
    if (!App.state.openFolder) {
      this.showToast('Please open a folder first', 'warning');
      return;
    }

    try {
      this.state.isLoading = true;
      this.updateLoadingState();

      const result = await window.electronAPI.backup.create(App.state.openFolder, options);
      
      this.state.isLoading = false;
      this.updateLoadingState();

      if (result.success) {
        this.showToast('Backup created successfully!', 'success');
        // Refresh the backup list to show the new backup
        await this.loadBackups();
        await this.loadStats(); // Also refresh stats
      } else {
        this.showToast(`Backup failed: ${result.error}`, 'error');
        // Still try to load existing backups
        await this.loadBackups();
      }
    } catch (error) {
      console.error('Backup creation failed:', error);
      this.state.isLoading = false;
      this.updateLoadingState();
      this.showToast('Backup creation failed', 'error');
      // Still try to load existing backups
      await this.loadBackups();
    }
  },

  async restoreBackup(backupId) {
    try {
      // Let user select restore location
      const targetPath = await window.electronAPI.backup.selectRestoreFolder();
      
      if (!targetPath) {
        return; // User cancelled
      }

      this.state.isLoading = true;
      this.updateLoadingState();

      const result = await window.electronAPI.backup.restore(backupId, targetPath);
      
      this.state.isLoading = false;

      if (result.success) {
        this.showToast(`Backup restored to: ${targetPath}`, 'success');
        
        // Ask if user wants to open the restored folder
        if (confirm('Backup restored successfully! Would you like to open the restored folder?')) {
          FileTree.openFolder(targetPath);
        }
      } else {
        this.showToast(`Restore failed: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Backup restore failed:', error);
      this.state.isLoading = false;
      this.showToast('Backup restore failed', 'error');
    }
  },

  async deleteBackup(backupId) {
    const backup = this.state.backups.find(b => b.id === backupId);
    if (!backup) return;

    if (!confirm(`Are you sure you want to delete the backup "${backup.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      this.state.isLoading = true;
      this.updateLoadingState();

      const result = await window.electronAPI.backup.delete(backupId);
      
      this.state.isLoading = false;

      if (result.success) {
        this.showToast('Backup deleted successfully', 'success');
        await this.loadBackups(); // Refresh the list
      } else {
        this.showToast(`Delete failed: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Backup delete failed:', error);
      this.state.isLoading = false;
      this.showToast('Backup delete failed', 'error');
    }
  },

  showCreateBackupDialog() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width: 500px;">
        <div class="modal-header">
          <h3>Create Backup</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="backup-name">Backup Name</label>
            <input type="text" id="backup-name" placeholder="My Project Backup" style="width: 100%; padding: 8px; background: var(--bg-input); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--fg-primary);">
          </div>
          <div class="form-group">
            <label for="backup-description">Description (optional)</label>
            <textarea id="backup-description" placeholder="Add notes about this backup..." style="width: 100%; padding: 8px; background: var(--bg-input); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--fg-primary); resize: vertical; min-height: 80px;"></textarea>
          </div>
          <div class="form-group">
            <label for="backup-type">Backup Type</label>
            <select id="backup-type" style="width: 100%; padding: 8px; background: var(--bg-input); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--fg-primary);">
              <option value="manual">Manual Backup</option>
              <option value="auto">Automatic Backup</option>
              <option value="before_save">Before Save</option>
            </select>
          </div>
          <div class="form-group">
            <label for="backup-tags">Tags (comma separated)</label>
            <input type="text" id="backup-tags" placeholder="important, release, milestone" style="width: 100%; padding: 8px; background: var(--bg-input); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--fg-primary);">
          </div>
          <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            <button class="btn btn-primary" id="create-backup-btn">Create Backup</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    modal.querySelector('.modal-close').addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    modal.querySelector('#create-backup-btn').addEventListener('click', () => {
      const name = document.getElementById('backup-name').value.trim();
      const description = document.getElementById('backup-description').value.trim();
      const type = document.getElementById('backup-type').value;
      const tagsInput = document.getElementById('backup-tags').value.trim();
      const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

      const options = {
        name: name || `Backup of ${this.getBasename(App.state.openFolder)}`,
        description,
        type,
        tags
      };

      document.body.removeChild(modal);
      this.createBackup(options);
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });

    // Focus on name input
    setTimeout(() => {
      document.getElementById('backup-name').focus();
    }, 100);
  },

  renderBackups() {
    const container = document.getElementById('backup-list');
    if (!container) {
      console.error('Backup list container not found!');
      return;
    }

    console.log('Rendering backups:', this.state.backups.length, 'backups');

    if (this.state.backups.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: var(--spacing-2xl); color: var(--fg-secondary);">
          <div style="font-size: 48px; margin-bottom: var(--spacing-lg); opacity: 0.5;">📦</div>
          <h3 style="margin-bottom: var(--spacing-sm);">No backups yet</h3>
          <p>Create your first backup to get started!</p>
        </div>
      `;
      return;
    }

    const backupsHtml = this.state.backups.map(backup => `
      <div class="backup-item" data-backup-id="${backup.id}">
        <div class="backup-header">
          <div class="backup-title">
            <h4>${escapeHtml(backup.name)}</h4>
            <div class="backup-meta">
              <span class="backup-date">${this.formatDate(backup.timestamp)}</span>
            </div>
          </div>
          <div class="backup-actions">
            <button class="btn btn-sm btn-secondary" onclick="Backup.restoreBackup('${backup.id}')" title="Restore">
              ↺ Restore
            </button>
            <button class="btn btn-sm btn-danger" onclick="Backup.deleteBackup('${backup.id}')" title="Delete">
              🗑 Delete
            </button>
          </div>
        </div>
        ${backup.description ? `<p class="backup-description">${escapeHtml(backup.description)}</p>` : ''}
        ${backup.tags.length > 0 ? `
          <div class="backup-tags">
            ${backup.tags.map(tag => `<span class="backup-tag">${escapeHtml(tag)}</span>`).join('')}
          </div>
        ` : ''}
        <div class="backup-info">
          <span class="backup-size">${this.formatFileSize(backup.size)}</span>
          <span class="backup-path">${escapeHtml(this.getBasename(backup.originalPath))}</span>
        </div>
      </div>
    `).join('');

    container.innerHTML = backupsHtml;
  },

  updateStats() {
    this.updateStatsDisplay();
  },

  updateStatsDisplay() {
    const statsContainer = document.getElementById('backup-stats');
    if (!statsContainer || !this.state.stats) return;

    const stats = this.state.stats;
    statsContainer.innerHTML = `
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">${stats.totalBackups}</div>
          <div class="stat-label">Total</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.totalSize}</div>
          <div class="stat-label">Size</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.typeBreakdown.auto || 0}</div>
          <div class="stat-label">Auto</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.newestBackup ? this.formatDate(stats.newestBackup) : 'Never'}</div>
          <div class="stat-label">Latest</div>
        </div>
      </div>
    `;
  },

  updateLoadingState() {
    const panelContent = document.querySelector('.backup-panel-content');
    const loadingElement = document.querySelector('.backup-loading');
    const statsElement = document.getElementById('backup-stats');
    const listElement = document.getElementById('backup-list');
    
    if (this.state.isLoading) {
      // Show loading state
      panelContent?.classList.add('loading');
      loadingElement.style.display = 'flex';
      statsElement.style.display = 'none';
      listElement.style.display = 'none';
    } else {
      // Show content
      panelContent?.classList.remove('loading');
      loadingElement.style.display = 'none';
      statsElement.style.display = 'block';
      listElement.style.display = 'block';
    }
  },

  formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  },

  formatFileSize(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  },

  showToast(message, type = 'info') {
    // Reuse the toast function from updater.js or create a simple one
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    toast.style.cssText = `
      position: fixed; bottom: 20px; right: 20px;
      background: ${type === 'error' ? 'var(--fg-error)' : type === 'success' ? 'var(--fg-success)' : type === 'warning' ? 'var(--fg-warning)' : 'var(--fg-info)'};
      color: white; padding: 12px 20px; border-radius: var(--radius-md);
      z-index: 10000; opacity: 0; transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.style.opacity = '1', 10);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  }
};
