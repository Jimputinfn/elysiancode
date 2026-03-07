const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class BackupManager {
  constructor() {
    this.backupDir = path.join(app.getPath('userData'), 'backups');
    this.maxBackups = 50; // Maximum number of backups to keep
    this.autoBackupInterval = null;
    this.ensureBackupDirectory();
  }

  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  generateBackupId() {
    return crypto.randomBytes(16).toString('hex');
  }

  async createBackup(folderPath, options = {}) {
    try {
      if (!folderPath || !fs.existsSync(folderPath)) {
        throw new Error('Invalid folder path');
      }

      const backupId = this.generateBackupId();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const folderName = path.basename(folderPath);
      const backupName = `${folderName}_${timestamp}_${backupId}`;
      const backupPath = path.join(this.backupDir, backupName);

      // Create backup metadata
      const metadata = {
        id: backupId,
        name: options.name || `Backup of ${folderName}`,
        description: options.description || '',
        originalPath: folderPath,
        backupPath: backupPath,
        timestamp: new Date().toISOString(),
        type: options.type || 'manual', // 'manual', 'auto', 'before_save'
        tags: options.tags || [],
        size: 0
      };

      // Copy files
      await this.copyDirectory(folderPath, backupPath);
      
      // Calculate total size
      metadata.size = await this.calculateDirectorySize(backupPath);

      // Save metadata
      const metadataPath = path.join(backupPath, '.backup-metadata.json');
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

      // Clean up old backups if needed
      await this.cleanupOldBackups();

      return {
        success: true,
        backup: metadata
      };

    } catch (error) {
      console.error('Backup creation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      try {
        if (entry.isDirectory()) {
          await this.copyDirectory(srcPath, destPath);
        } else {
          // Skip certain files/folders
          if (this.shouldSkipFile(entry.name, srcPath)) {
            continue;
          }
          
          // Check if source file exists before copying
          if (fs.existsSync(srcPath)) {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      } catch (error) {
        console.warn(`Warning: Could not copy ${srcPath}: ${error.message}`);
        // Continue with other files instead of failing the entire backup
      }
    }
  }

  shouldSkipFile(fileName, filePath) {
    const skipPatterns = [
      'node_modules',
      '.git',
      'dist',
      'build',
      '.vscode',
      '.idea',
      '*.log',
      '.DS_Store',
      'Thumbs.db',
      '.env',
      '.env.local',
      '.env.development',
      '.env.test',
      '.env.production',
      'coverage',
      '.nyc_output',
      '.cache',
      'tmp',
      'temp'
    ];

    const importantConfigFiles = [
      '.gitignore',
      '.eslintrc',
      '.prettierrc',
      '.babelrc',
      '.editorconfig',
      'package.json',
      'package-lock.json',
      'yarn.lock',
      '.env.example'
    ];

    // Check exact matches
    if (skipPatterns.includes(fileName)) {
      return true;
    }

    // Check pattern matches
    for (const pattern of skipPatterns) {
      if (pattern.includes('*')) {
        const basePattern = pattern.replace('*', '');
        if (fileName.endsWith(basePattern)) {
          return true;
        }
      }
    }

    // Skip hidden files (starting with .) except important config files
    if (fileName.startsWith('.') && !importantConfigFiles.includes(fileName)) {
      return true;
    }

    // Skip very large files (over 100MB) to prevent backup bloat
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > 100 * 1024 * 1024) { // 100MB
          console.warn(`Skipping large file: ${fileName} (${stats.size} bytes)`);
          return true;
        }
      }
    } catch (error) {
      // If we can't stat the file, skip it
      return true;
    }

    return false;
  }

  async calculateDirectorySize(dirPath) {
    let totalSize = 0;

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        totalSize += await this.calculateDirectorySize(fullPath);
      } else {
        const stats = fs.statSync(fullPath);
        totalSize += stats.size;
      }
    }

    return totalSize;
  }

  async listBackups() {
    try {
      const backups = [];

      if (!fs.existsSync(this.backupDir)) {
        return backups;
      }

      const entries = fs.readdirSync(this.backupDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const backupPath = path.join(this.backupDir, entry.name);
          const metadataPath = path.join(backupPath, '.backup-metadata.json');

          if (fs.existsSync(metadataPath)) {
            try {
              const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
              
              // Check if backup still exists and is valid
              if (fs.existsSync(backupPath)) {
                backups.push(metadata);
              }
            } catch (error) {
              console.warn(`Invalid backup metadata for ${entry.name}:`, error);
            }
          }
        }
      }

      // Sort by timestamp (newest first)
      backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return backups;

    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }

  async restoreBackup(backupId, targetPath) {
    try {
      const backups = await this.listBackups();
      const backup = backups.find(b => b.id === backupId);

      if (!backup) {
        throw new Error('Backup not found');
      }

      if (!fs.existsSync(backup.backupPath)) {
        throw new Error('Backup files not found');
      }

      // Ensure target directory exists
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }

      // Copy backup files to target
      await this.copyDirectory(backup.backupPath, targetPath);

      // Remove metadata file from restored folder
      const metadataPath = path.join(targetPath, '.backup-metadata.json');
      if (fs.existsSync(metadataPath)) {
        fs.unlinkSync(metadataPath);
      }

      return {
        success: true,
        restoredTo: targetPath,
        originalBackup: backup
      };

    } catch (error) {
      console.error('Restore failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteBackup(backupId) {
    try {
      const backups = await this.listBackups();
      const backup = backups.find(b => b.id === backupId);

      if (!backup) {
        throw new Error('Backup not found');
      }

      // Remove backup directory
      if (fs.existsSync(backup.backupPath)) {
        this.removeDirectory(backup.backupPath);
      }

      return {
        success: true,
        deletedBackup: backup
      };

    } catch (error) {
      console.error('Delete backup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  removeDirectory(dirPath) {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  }

  async cleanupOldBackups() {
    try {
      const backups = await this.listBackups();
      
      // Keep only the most recent backups
      if (backups.length > this.maxBackups) {
        const backupsToDelete = backups.slice(this.maxBackups);
        
        for (const backup of backupsToDelete) {
          await this.deleteBackup(backup.id);
        }
      }

      // Remove any corrupted backups
      const entries = fs.readdirSync(this.backupDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const backupPath = path.join(this.backupDir, entry.name);
          const metadataPath = path.join(backupPath, '.backup-metadata.json');
          
          if (!fs.existsSync(metadataPath)) {
            this.removeDirectory(backupPath);
          }
        }
      }

    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  formatFileSize(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  startAutoBackup(intervalMinutes = 30) {
    this.stopAutoBackup(); // Stop any existing interval
    
    this.autoBackupInterval = setInterval(async () => {
      // This would need to be connected to the current open folder
      // For now, it's a placeholder for the auto-backup functionality
      console.log('Auto backup check...');
    }, intervalMinutes * 60 * 1000);
  }

  stopAutoBackup() {
    if (this.autoBackupInterval) {
      clearInterval(this.autoBackupInterval);
      this.autoBackupInterval = null;
    }
  }

  async getBackupStats() {
    const backups = await this.listBackups();
    const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
    
    const typeCounts = backups.reduce((counts, backup) => {
      counts[backup.type] = (counts[backup.type] || 0) + 1;
      return counts;
    }, {});

    return {
      totalBackups: backups.length,
      totalSize: this.formatFileSize(totalSize),
      typeBreakdown: typeCounts,
      oldestBackup: backups.length > 0 ? backups[backups.length - 1].timestamp : null,
      newestBackup: backups.length > 0 ? backups[0].timestamp : null
    };
  }
}

module.exports = BackupManager;
