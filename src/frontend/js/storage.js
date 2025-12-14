/**
 * Local Storage Management for Band Sync Calendar
 */

class LocalStorage {
    constructor() {
        this.keys = {
            NICKNAME: 'band_sync_nickname',
            PREFERENCES: 'band_sync_preferences',
            CACHE: 'band_sync_cache',
            VERSION: 'band_sync_version',
            BACKUP: 'band_sync_backup'
        };
        this.currentVersion = '1.0.0';
        this.maxCacheSize = 5 * 1024 * 1024; // 5MB
        this.initialized = false;
    }
    
    /**
     * Initialize storage system
     */
    async initialize() {
        if (this.initialized) return;
        
        try {
            // Check if localStorage is available
            if (!this.isAvailable()) {
                console.warn('[Storage] localStorage not available');
                return false;
            }
            
            // Check version and migrate if needed
            await this.checkVersionAndMigrate();
            
            // Clean up old cache entries
            this.cleanupCache();
            
            // Monitor storage usage
            this.monitorStorageUsage();
            
            this.initialized = true;
            console.log('[Storage] Storage system initialized');
            return true;
        } catch (error) {
            console.error('[Storage] Failed to initialize:', error);
            return false;
        }
    }
    
    /**
     * Check version and perform migration if needed
     */
    async checkVersionAndMigrate() {
        const storedVersion = localStorage.getItem(this.keys.VERSION);
        
        if (!storedVersion) {
            // First time setup
            localStorage.setItem(this.keys.VERSION, this.currentVersion);
            console.log('[Storage] First time setup completed');
            return;
        }
        
        if (storedVersion !== this.currentVersion) {
            console.log(`[Storage] Migrating from ${storedVersion} to ${this.currentVersion}`);
            await this.performMigration(storedVersion, this.currentVersion);
            localStorage.setItem(this.keys.VERSION, this.currentVersion);
        }
    }
    
    /**
     * Perform data migration between versions
     */
    async performMigration(fromVersion, toVersion) {
        try {
            // Create backup before migration
            this.createBackup();
            
            // Version-specific migrations
            if (fromVersion === '0.9.0' && toVersion === '1.0.0') {
                // Example migration: rename old cache keys
                this.migrateCacheKeys();
            }
            
            console.log('[Storage] Migration completed successfully');
        } catch (error) {
            console.error('[Storage] Migration failed:', error);
            // Restore from backup if migration fails
            this.restoreFromBackup();
        }
    }
    
    /**
     * Create backup of current data
     */
    createBackup() {
        try {
            const backup = {
                timestamp: Date.now(),
                version: this.currentVersion,
                data: {}
            };
            
            // Backup all app data
            Object.values(this.keys).forEach(key => {
                if (key !== this.keys.BACKUP) {
                    const value = localStorage.getItem(key);
                    if (value) {
                        backup.data[key] = value;
                    }
                }
            });
            
            localStorage.setItem(this.keys.BACKUP, JSON.stringify(backup));
            console.log('[Storage] Backup created');
        } catch (error) {
            console.error('[Storage] Failed to create backup:', error);
        }
    }
    
    /**
     * Restore from backup
     */
    restoreFromBackup() {
        try {
            const backupStr = localStorage.getItem(this.keys.BACKUP);
            if (!backupStr) return false;
            
            const backup = JSON.parse(backupStr);
            
            // Restore data
            Object.entries(backup.data).forEach(([key, value]) => {
                localStorage.setItem(key, value);
            });
            
            console.log('[Storage] Restored from backup');
            return true;
        } catch (error) {
            console.error('[Storage] Failed to restore from backup:', error);
            return false;
        }
    }
    
    // Nickname Management
    getNickname() {
        try {
            return localStorage.getItem(this.keys.NICKNAME);
        } catch (error) {
            console.warn('Failed to get nickname from localStorage:', error);
            return null;
        }
    }
    
    setNickname(nickname) {
        try {
            if (!nickname || typeof nickname !== 'string') {
                throw new Error('Invalid nickname');
            }
            
            const trimmed = nickname.trim();
            if (trimmed.length === 0 || trimmed.length > CONFIG.MAX_NICKNAME_LENGTH) {
                throw new Error('Nickname length invalid');
            }
            
            localStorage.setItem(this.keys.NICKNAME, trimmed);
            return true;
        } catch (error) {
            console.error('Failed to set nickname:', error);
            return false;
        }
    }
    
    clearNickname() {
        try {
            localStorage.removeItem(this.keys.NICKNAME);
            return true;
        } catch (error) {
            console.error('Failed to clear nickname:', error);
            return false;
        }
    }
    
    // Preferences Management
    getPreferences() {
        try {
            const prefs = localStorage.getItem(this.keys.PREFERENCES);
            return prefs ? JSON.parse(prefs) : this.getDefaultPreferences();
        } catch (error) {
            console.warn('Failed to get preferences, using defaults:', error);
            return this.getDefaultPreferences();
        }
    }
    
    setPreferences(preferences) {
        try {
            const current = this.getPreferences();
            const updated = { ...current, ...preferences };
            localStorage.setItem(this.keys.PREFERENCES, JSON.stringify(updated));
            return true;
        } catch (error) {
            console.error('Failed to set preferences:', error);
            return false;
        }
    }
    
    getDefaultPreferences() {
        return {
            defaultView: isMobileDevice() ? CONFIG.CALENDAR_VIEWS.MOBILE : CONFIG.CALENDAR_VIEWS.DESKTOP,
            autoRefresh: true,
            notifications: true,
            theme: 'light'
        };
    }
    
    // Cache Management
    getCache(key) {
        try {
            const cache = localStorage.getItem(this.keys.CACHE);
            const cacheData = cache ? JSON.parse(cache) : {};
            
            const item = cacheData[key];
            if (!item) return null;
            
            // Check if cache item has expired
            if (item.expires && Date.now() > item.expires) {
                this.clearCache(key);
                return null;
            }
            
            return item.data;
        } catch (error) {
            console.warn('Failed to get cache:', error);
            return null;
        }
    }
    
    setCache(key, data, ttlMinutes = 60) {
        try {
            const cache = localStorage.getItem(this.keys.CACHE);
            const cacheData = cache ? JSON.parse(cache) : {};
            
            cacheData[key] = {
                data: data,
                expires: Date.now() + (ttlMinutes * 60 * 1000),
                created: Date.now()
            };
            
            localStorage.setItem(this.keys.CACHE, JSON.stringify(cacheData));
            return true;
        } catch (error) {
            console.error('Failed to set cache:', error);
            return false;
        }
    }
    
    clearCache(key = null) {
        try {
            if (key) {
                const cache = localStorage.getItem(this.keys.CACHE);
                const cacheData = cache ? JSON.parse(cache) : {};
                delete cacheData[key];
                localStorage.setItem(this.keys.CACHE, JSON.stringify(cacheData));
            } else {
                localStorage.removeItem(this.keys.CACHE);
            }
            return true;
        } catch (error) {
            console.error('Failed to clear cache:', error);
            return false;
        }
    }
    
    // Storage Info and Management
    getStorageInfo() {
        try {
            const used = new Blob(Object.values(localStorage)).size;
            const quota = this.maxCacheSize;
            
            return {
                used: used,
                quota: quota,
                available: quota - used,
                percentage: Math.round((used / quota) * 100),
                itemCount: localStorage.length,
                cacheItems: this.getCacheItemCount()
            };
        } catch (error) {
            console.warn('[Storage] Failed to get storage info:', error);
            return null;
        }
    }
    
    /**
     * Get cache item count
     */
    getCacheItemCount() {
        try {
            const cache = localStorage.getItem(this.keys.CACHE);
            if (!cache) return 0;
            
            const cacheData = JSON.parse(cache);
            return Object.keys(cacheData).length;
        } catch (error) {
            return 0;
        }
    }
    
    /**
     * Monitor storage usage and clean up if needed
     */
    monitorStorageUsage() {
        const info = this.getStorageInfo();
        if (!info) return;
        
        console.log(`[Storage] Usage: ${info.percentage}% (${this.formatBytes(info.used)}/${this.formatBytes(info.quota)})`);
        
        // Clean up if usage is high
        if (info.percentage > 80) {
            console.log('[Storage] High usage detected, cleaning up...');
            this.performCleanup();
        }
    }
    
    /**
     * Perform storage cleanup
     */
    performCleanup() {
        try {
            // Clean expired cache entries
            this.cleanupCache();
            
            // Remove old backup if exists
            const backup = localStorage.getItem(this.keys.BACKUP);
            if (backup) {
                const backupData = JSON.parse(backup);
                const backupAge = Date.now() - backupData.timestamp;
                
                // Remove backup older than 7 days
                if (backupAge > 7 * 24 * 60 * 60 * 1000) {
                    localStorage.removeItem(this.keys.BACKUP);
                    console.log('[Storage] Removed old backup');
                }
            }
            
            // Check usage after cleanup
            const newInfo = this.getStorageInfo();
            if (newInfo) {
                console.log(`[Storage] After cleanup: ${newInfo.percentage}% usage`);
            }
        } catch (error) {
            console.error('[Storage] Cleanup failed:', error);
        }
    }
    
    /**
     * Clean up expired cache entries
     */
    cleanupCache() {
        try {
            const cache = localStorage.getItem(this.keys.CACHE);
            if (!cache) return;
            
            const cacheData = JSON.parse(cache);
            const now = Date.now();
            let cleanedCount = 0;
            
            Object.keys(cacheData).forEach(key => {
                const item = cacheData[key];
                if (item.expires && now > item.expires) {
                    delete cacheData[key];
                    cleanedCount++;
                }
            });
            
            if (cleanedCount > 0) {
                localStorage.setItem(this.keys.CACHE, JSON.stringify(cacheData));
                console.log(`[Storage] Cleaned ${cleanedCount} expired cache entries`);
            }
        } catch (error) {
            console.error('[Storage] Cache cleanup failed:', error);
        }
    }
    
    /**
     * Format bytes for display
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * Export all data for backup
     */
    exportData() {
        try {
            const exportData = {
                timestamp: Date.now(),
                version: this.currentVersion,
                nickname: this.getNickname(),
                preferences: this.getPreferences(),
                cache: this.getAllCache()
            };
            
            return JSON.stringify(exportData, null, 2);
        } catch (error) {
            console.error('[Storage] Export failed:', error);
            return null;
        }
    }
    
    /**
     * Import data from backup
     */
    importData(dataStr) {
        try {
            const data = JSON.parse(dataStr);
            
            // Validate data structure
            if (!data.timestamp || !data.version) {
                throw new Error('Invalid backup format');
            }
            
            // Create backup before import
            this.createBackup();
            
            // Import data
            if (data.nickname) {
                this.setNickname(data.nickname);
            }
            
            if (data.preferences) {
                this.setPreferences(data.preferences);
            }
            
            if (data.cache) {
                // Import cache selectively (only non-expired items)
                const now = Date.now();
                Object.entries(data.cache).forEach(([key, item]) => {
                    if (!item.expires || item.expires > now) {
                        this.setCache(key, item.data, Math.floor((item.expires - now) / 60000));
                    }
                });
            }
            
            console.log('[Storage] Data imported successfully');
            return true;
        } catch (error) {
            console.error('[Storage] Import failed:', error);
            return false;
        }
    }
    
    /**
     * Get all cache data
     */
    getAllCache() {
        try {
            const cache = localStorage.getItem(this.keys.CACHE);
            return cache ? JSON.parse(cache) : {};
        } catch (error) {
            return {};
        }
    }
    
    /**
     * Migrate old cache keys (example migration)
     */
    migrateCacheKeys() {
        // Example: rename old cache keys to new format
        const oldKeys = ['old_events_cache', 'old_availability_cache'];
        
        oldKeys.forEach(oldKey => {
            const value = localStorage.getItem(oldKey);
            if (value) {
                // Convert to new cache format
                const newKey = oldKey.replace('old_', '').replace('_cache', '');
                this.setCache(newKey, JSON.parse(value), 60);
                
                // Remove old key
                localStorage.removeItem(oldKey);
            }
        });
    }
    
    /**
     * Get storage health status
     */
    getHealthStatus() {
        const info = this.getStorageInfo();
        if (!info) return 'unknown';
        
        if (info.percentage < 50) return 'good';
        if (info.percentage < 80) return 'warning';
        return 'critical';
    }
    
    /**
     * Schedule periodic cleanup
     */
    scheduleCleanup() {
        // Clean up every hour
        setInterval(() => {
            this.cleanupCache();
        }, 60 * 60 * 1000);
        
        // Monitor usage every 10 minutes
        setInterval(() => {
            this.monitorStorageUsage();
        }, 10 * 60 * 1000);
    }
    
    // Clear all app data
    clearAll() {
        try {
            Object.values(this.keys).forEach(key => {
                localStorage.removeItem(key);
            });
            return true;
        } catch (error) {
            console.error('Failed to clear all data:', error);
            return false;
        }
    }
    
    // Check if localStorage is available
    isAvailable() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, 'test');
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }
}

// Create global instance
const storage = new LocalStorage();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LocalStorage, storage };
}