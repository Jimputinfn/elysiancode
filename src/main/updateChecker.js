const { app, net } = require('electron');
const fs = require('fs');
const path = require('path');
const { version } = require('../../package.json');

class UpdateChecker {
  constructor() {
    // Update URL for the actual Elysian Code repository
    this.updateUrl = 'https://api.github.com/repos/Jimputinfn/elysiancode/releases/latest';
    this.currentVersion = version;
    this.lastCheckFile = path.join(app.getPath('userData'), 'last-update-check.json');
    this.checkInterval = 24 * 60 * 60 * 1000; // 24 hours
    this.isDevelopment = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
  }

  async shouldCheckForUpdates() {
    try {
      if (!fs.existsSync(this.lastCheckFile)) {
        return true;
      }

      const lastCheckData = JSON.parse(fs.readFileSync(this.lastCheckFile, 'utf8'));
      const now = Date.now();
      return (now - lastCheckData.timestamp) > this.checkInterval;
    } catch (error) {
      console.error('Error checking update interval:', error);
      return true; // Check anyway if there's an error
    }
  }

  async checkForUpdates() {
    try {
      // Skip update checks in development mode unless forced
      if (this.isDevelopment && !(await this.shouldCheckForUpdates())) {
        return { 
          shouldUpdate: false, 
          reason: 'development_mode',
          currentVersion: this.currentVersion,
          note: 'Update checks are disabled in development mode'
        };
      }

      if (!(await this.shouldCheckForUpdates())) {
        return { shouldUpdate: false, reason: 'recently_checked' };
      }

      const response = await new Promise((resolve, reject) => {
        const request = net.request({
          method: 'GET',
          url: this.updateUrl,
          headers: {
            'User-Agent': 'Elysian-Code-UpdateChecker'
          }
        });

        request.on('response', (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            if (res.statusCode === 200) {
              resolve(data);
            } else {
              reject(new Error(`HTTP ${res.statusCode}`));
            }
          });
        });

        request.on('error', reject);
        request.end();
      });

      const releaseInfo = JSON.parse(response);
      const latestVersion = releaseInfo.tag_name.replace(/^v/, '');
      
      // Save last check time
      this.saveLastCheck();

      // For demo purposes, we'll simulate an update available in development
      // In production, this will be the actual version comparison
      const updateAvailable = this.isDevelopment ? false : this.compareVersions(latestVersion, this.currentVersion) > 0;
      
      return {
        shouldUpdate: updateAvailable,
        currentVersion: this.currentVersion,
        latestVersion: latestVersion,
        releaseNotes: this.isDevelopment ? 'Development mode - update checks simulated' : releaseInfo.body,
        downloadUrl: this.isDevelopment ? '#' : this.getDownloadUrl(releaseInfo),
        releaseDate: releaseInfo.published_at
      };

    } catch (error) {
      console.error('Error checking for updates:', error);
      return { 
        shouldUpdate: false, 
        error: error.message,
        currentVersion: this.currentVersion,
        note: this.isDevelopment ? 'Development mode - network errors expected' : 'Failed to check for updates'
      };
    }
  }

  compareVersions(version1, version2) {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    const maxLength = Math.max(v1Parts.length, v2Parts.length);
    
    for (let i = 0; i < maxLength; i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }
    
    return 0;
  }

  getDownloadUrl(releaseInfo) {
    const platform = process.platform;
    const assets = releaseInfo.assets || [];
    
    if (platform === 'linux') {
      const debAsset = assets.find(asset => asset.name.endsWith('.deb'));
      if (debAsset) return debAsset.browser_download_url;
      
      const appImageAsset = assets.find(asset => asset.name.endsWith('.AppImage'));
      if (appImageAsset) return appImageAsset.browser_download_url;
    } else if (platform === 'win32') {
      const exeAsset = assets.find(asset => asset.name.endsWith('.exe'));
      if (exeAsset) return exeAsset.browser_download_url;
    }
    
    return releaseInfo.html_url; // Fallback to release page
  }

  saveLastCheck() {
    try {
      const checkData = {
        timestamp: Date.now(),
        version: this.currentVersion
      };
      fs.writeFileSync(this.lastCheckFile, JSON.stringify(checkData, null, 2));
    } catch (error) {
      console.error('Error saving last check time:', error);
    }
  }

  async forceCheckForUpdates() {
    // Delete the last check file to force a new check
    try {
      if (fs.existsSync(this.lastCheckFile)) {
        fs.unlinkSync(this.lastCheckFile);
      }
    } catch (error) {
      console.error('Error deleting last check file:', error);
    }
    
    return await this.checkForUpdates();
  }
}

module.exports = UpdateChecker;
