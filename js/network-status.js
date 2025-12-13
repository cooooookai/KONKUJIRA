/**
 * Network Status Manager for Band Sync Calendar
 * Provides visual feedback about network connectivity and sync status
 */

class NetworkStatusManager {
    constructor() {
        this.indicator = null;
        this.isOnline = navigator.onLine;
        this.lastSyncTime = null;
        this.syncStatus = 'idle'; // idle, syncing, error, success
    }
    
    initialize() {
        this.createIndicator();
        this.setupEventListeners();
        this.updateStatus();
        console.log('Network status manager initialized');
    }
    
    createIndicator() {
        // Create network status indicator
        this.indicator = document.createElement('div');
        this.indicator.id = 'network-status';
        this.indicator.className = 'network-status';
        this.indicator.innerHTML = `
            <div class="status-icon"></div>
            <div class="status-text"></div>
            <div class="sync-info"></div>
        `;
        
        // Add to header
        const header = document.querySelector('header');
        if (header) {
            header.appendChild(this.indicator);
        }
    }
    
    setupEventListeners() {
        // Network status changes
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateStatus();
            this.showMessage('接続が復旧しました', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateStatus();
            this.showMessage('オフラインモードです', 'warning');
        });
        
        // Listen for API events
        document.addEventListener('api-sync-start', () => {
            this.setSyncStatus('syncing');
        });
        
        document.addEventListener('api-sync-success', () => {
            this.setSyncStatus('success');
            this.lastSyncTime = new Date();
            this.updateStatus();
        });
        
        document.addEventListener('api-sync-error', (event) => {
            this.setSyncStatus('error');
            this.showMessage(`同期エラー: ${event.detail.message}`, 'error');
        });
    }
    
    updateStatus() {
        if (!this.indicator) return;
        
        const icon = this.indicator.querySelector('.status-icon');
        const text = this.indicator.querySelector('.status-text');
        const syncInfo = this.indicator.querySelector('.sync-info');
        
        // Update connection status
        if (this.isOnline) {
            this.indicator.className = 'network-status online';
            icon.textContent = '🟢';
            text.textContent = 'オンライン';
        } else {
            this.indicator.className = 'network-status offline';
            icon.textContent = '🔴';
            text.textContent = 'オフライン';
        }
        
        // Update sync status
        if (this.syncStatus === 'syncing') {
            this.indicator.classList.add('syncing');
            syncInfo.textContent = '同期中...';
        } else if (this.lastSyncTime) {
            this.indicator.classList.remove('syncing');
            const timeAgo = this.getTimeAgo(this.lastSyncTime);
            syncInfo.textContent = `最終同期: ${timeAgo}`;
        } else {
            syncInfo.textContent = '';
        }
        
        // Show queue status if offline
        if (!this.isOnline && apiClient) {
            const queueStatus = apiClient.getQueueStatus();
            if (queueStatus.queueLength > 0) {
                syncInfo.textContent = `待機中: ${queueStatus.queueLength}件`;
            }
        }
    }
    
    setSyncStatus(status) {
        this.syncStatus = status;
        this.updateStatus();
        
        // Auto-clear success/error status after delay
        if (status === 'success' || status === 'error') {
            setTimeout(() => {
                if (this.syncStatus === status) {
                    this.syncStatus = 'idle';
                    this.updateStatus();
                }
            }, 3000);
        }
    }
    
    showMessage(message, type = 'info') {
        // Create temporary message
        const messageEl = document.createElement('div');
        messageEl.className = `network-message ${type}`;
        messageEl.textContent = message;
        
        // Add to body
        document.body.appendChild(messageEl);
        
        // Animate in
        setTimeout(() => messageEl.classList.add('show'), 100);
        
        // Remove after delay
        setTimeout(() => {
            messageEl.classList.remove('show');
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }, 3000);
    }
    
    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return '今';
        if (diffMins < 60) return `${diffMins}分前`;
        
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}時間前`;
        
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}日前`;
    }
    
    // Manual sync trigger
    async triggerSync() {
        if (!this.isOnline) {
            this.showMessage('オフライン中は同期できません', 'warning');
            return;
        }
        
        try {
            this.setSyncStatus('syncing');
            
            // Trigger calendar refresh
            if (window.bandSyncCalendar) {
                await window.bandSyncCalendar.refreshCalendarData();
            }
            
            this.setSyncStatus('success');
            this.lastSyncTime = new Date();
            this.showMessage('同期が完了しました', 'success');
        } catch (error) {
            this.setSyncStatus('error');
            this.showMessage('同期に失敗しました', 'error');
        }
    }
}

// Create global instance
const networkStatusManager = new NetworkStatusManager();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    networkStatusManager.initialize();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NetworkStatusManager, networkStatusManager };
}