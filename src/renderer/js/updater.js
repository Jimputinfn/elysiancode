// ── Update Checker ───────────────────────────────────────────────────────────────

const Updater = {
  state: {
    lastCheck: null,
    updateAvailable: false,
    updateInfo: null,
  },

  async init() {
    // Check for updates on app start (after a short delay to not block startup)
    setTimeout(() => this.checkForUpdates(), 5000);
    
    // Set up periodic checks (every 24 hours)
    setInterval(() => this.checkForUpdates(), 24 * 60 * 60 * 1000);
  },

  async checkForUpdates(force = false) {
    try {
      const result = force 
        ? await window.electronAPI.updater.forceCheck()
        : await window.electronAPI.updater.check();
      
      this.state.lastCheck = new Date();
      
      if (result.error) {
        console.error('Update check failed:', result.error);
        return;
      }

      if (result.shouldUpdate) {
        this.state.updateAvailable = true;
        this.state.updateInfo = result;
        this.showUpdateNotification(result);
      } else if (force) {
        this.showNoUpdateMessage(result);
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      if (force) {
        this.showToast('Failed to check for updates', 'error');
      }
    }
  },

  showUpdateNotification(updateInfo) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width: 500px;">
        <div class="modal-header">
          <h3>🚀 Update Available</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <p><strong>Elysian Code ${updateInfo.latestVersion}</strong> is now available!</p>
          <p>You're currently running version <strong>${updateInfo.currentVersion}</strong>.</p>
          
          ${updateInfo.releaseNotes ? `
            <div style="margin: 15px 0;">
              <h4>What's new:</h4>
              <div style="background: #2a2a2a; padding: 10px; border-radius: 4px; max-height: 200px; overflow-y: auto; font-size: 0.9em;">
                ${updateInfo.releaseNotes.replace(/\n/g, '<br>')}
              </div>
            </div>
          ` : ''}
          
          <div style="margin-top: 15px; display: flex; gap: 10px;">
            <button id="download-update" class="btn btn-primary">
              📥 Download Update
            </button>
            <button id="remind-later" class="btn btn-secondary">
              ⏰ Remind Later
            </button>
            <button id="skip-version" class="btn btn-secondary">
              ⏭️ Skip This Version
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    modal.querySelector('.modal-close').addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    modal.querySelector('#download-update').addEventListener('click', () => {
      if (updateInfo.downloadUrl) {
        window.open(updateInfo.downloadUrl, '_blank');
      } else {
        window.open('https://github.com/elysiannodes/elysian-code/releases', '_blank');
      }
      document.body.removeChild(modal);
    });

    modal.querySelector('#remind-later').addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    modal.querySelector('#skip-version').addEventListener('click', () => {
      localStorage.setItem('elysian_skip_version', updateInfo.latestVersion);
      document.body.removeChild(modal);
    });

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  },

  showNoUpdateMessage(result) {
    this.showToast(`You're running the latest version (${result.currentVersion})`, 'success');
  },

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Position toast in bottom-right
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : '#2196f3'};
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // Fade in
    setTimeout(() => toast.style.opacity = '1', 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  },

  async getCurrentVersion() {
    try {
      return await window.electronAPI.updater.getCurrentVersion();
    } catch (error) {
      console.error('Error getting current version:', error);
      return null;
    }
  }
};
