// Main application entry point for Band Sync Calendar

class BandSyncCalendar {
    constructor() {
        this.calendar = null;
        this.syncInterval = null;
        this.isInitialized = false;
    }
    
    async init() {
        if (this.isInitialized) return;
        
        try {
            // Initialize storage system
            await storage.initialize();
            
            // Schedule periodic cleanup
            storage.scheduleCleanup();
            
            // Check for nickname first
            if (!storage.getNickname()) {
                this.showNicknameModal();
                return;
            }
            
            // Initialize components
            await this.initializeCalendar();
            this.initializeDrawer();
            this.initializeNicknameDisplay();
            this.initializeStatsOverlay();
            this.setupEventListeners();
            this.initializeSyncManager();
            this.startSynchronization();
            
            this.isInitialized = true;
            console.log('Band Sync Calendar initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showError('アプリケーションの初期化に失敗しました。');
        }
    }
    
    async initializeCalendar() {
        const calendarEl = document.getElementById('calendar');
        if (!calendarEl) throw new Error('Calendar element not found');
        
        // Initialize calendar using CalendarManager
        this.calendar = await calendarManager.initialize(calendarEl);
        await this.loadCalendarData();
    }
    
    initializeDrawer() {
        // Drawer initialization will be handled by drawer.js
        if (typeof window.initializeDrawer === 'function') {
            window.initializeDrawer();
        }
    }
    
    initializeNicknameDisplay() {
        const nickname = storage.getNickname();
        const display = document.getElementById('nickname-display');
        if (display && nickname) {
            display.textContent = `ユーザー: ${nickname}`;
        }
    }
    
    initializeStatsOverlay() {
        // Initialize stats overlay if available
        if (typeof statsOverlay !== 'undefined') {
            console.log('🚀 Initializing stats overlay from app...');
            statsOverlay.initialize();
        } else {
            console.warn('⚠️ Stats overlay not available');
        }
    }
    
    initializeSyncManager() {
        if (typeof syncManager !== 'undefined') {
            syncManager.initialize();
            
            // Add sync event listeners
            syncManager.addSyncListener((event, data) => {
                console.log(`[App] Sync event: ${event}`, data);
                
                switch (event) {
                    case 'sync-start':
                        this.showLoading(true);
                        break;
                    case 'sync-success':
                        this.showLoading(false);
                        break;
                    case 'sync-error':
                        this.showLoading(false);
                        this.showError(`同期エラー: ${data.error}`);
                        break;
                }
            });
            
            // Start sync manager
            syncManager.start();
        }
    }
    
    setupEventListeners() {
        // Window focus event for refresh
        window.addEventListener('focus', () => {
            this.refreshCalendarData();
        });
        
        // Window resize is handled by CalendarManager
        
        // Visibility change for background sync
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.refreshCalendarData();
            }
        });
        
        // Overview button
        const overviewButton = document.getElementById('overview-button');
        if (overviewButton) {
            overviewButton.addEventListener('click', () => {
                if (typeof showMemberOverview !== 'undefined') {
                    showMemberOverview();
                }
            });
        }
        
        // Holiday button
        const holidayButton = document.getElementById('holiday-button');
        if (holidayButton) {
            holidayButton.addEventListener('click', () => {
                if (typeof holidayDisplay !== 'undefined') {
                    holidayDisplay.toggle();
                }
            });
        }
        
        // Settings button
        const settingsButton = document.getElementById('settings-button');
        if (settingsButton) {
            settingsButton.addEventListener('click', () => {
                if (typeof storageManagerUI !== 'undefined') {
                    storageManagerUI.toggle();
                }
            });
        }
    }
    
    startSynchronization() {
        // Clear any existing interval
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        // Set up intelligent polling for updates
        this.syncInterval = setInterval(() => {
            this.intelligentSync();
        }, CONFIG.POLLING_INTERVAL);
        
        // Set up additional sync triggers
        this.setupSyncTriggers();
        
        console.log('Real-time synchronization started');
    }
    
    setupSyncTriggers() {
        // Sync when app regains focus
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isInitialized) {
                console.log('App regained focus - triggering sync');
                this.intelligentSync();
            }
        });
        
        // Sync when network comes back online
        window.addEventListener('online', () => {
            if (this.isInitialized) {
                console.log('Network restored - triggering sync');
                setTimeout(() => this.intelligentSync(), 1000); // Small delay to ensure connection is stable
            }
        });
        
        // Sync after successful data operations
        document.addEventListener('data-changed', () => {
            if (this.isInitialized) {
                console.log('Data changed - triggering sync');
                this.intelligentSync();
            }
        });
        
        // Page unload - process any queued requests
        window.addEventListener('beforeunload', () => {
            if (apiClient && apiClient.getQueueStatus().queueLength > 0) {
                // Try to process queue before page unloads
                apiClient.processQueue();
            }
        });
    }
    
    async intelligentSync() {
        if (!this.isInitialized || !navigator.onLine) {
            return;
        }
        
        try {
            // Check if we need to sync based on last sync time
            const lastSync = storage.getCache('last_sync_time');
            const now = Date.now();
            
            if (lastSync && (now - lastSync) < 30000) {
                // Skip sync if last sync was less than 30 seconds ago
                return;
            }
            
            // Dispatch sync start event
            document.dispatchEvent(new CustomEvent('api-sync-start'));
            
            // Perform sync
            await this.refreshCalendarData();
            
            // Update last sync time
            storage.setCache('last_sync_time', now, 60); // Cache for 1 hour
            
            console.log('Intelligent sync completed');
        } catch (error) {
            console.error('Intelligent sync failed:', error);
            // Don't throw - let the app continue working
        }
    }
    
    async loadCalendarData() {
        try {
            this.showLoading(true);
            await calendarManager.loadData();
        } catch (error) {
            console.error('Failed to load calendar data:', error);
            this.showError('カレンダーデータの読み込みに失敗しました。');
        } finally {
            this.showLoading(false);
        }
    }
    
    async refreshCalendarData() {
        if (!this.isInitialized) return;
        await calendarManager.refresh();
    }
    
    // Date and event click handling is now managed by CalendarManager
    
    showNicknameModal() {
        if (typeof window.showNicknameModal === 'function') {
            window.showNicknameModal(() => {
                this.init(); // Retry initialization after nickname is set
            });
        }
    }
    
    showLoading(show) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.toggle('hidden', !show);
        }
    }
    
    showError(message) {
        // Simple error display - could be enhanced with a proper modal
        alert(message);
    }
    
    destroy() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        // Stop sync manager
        if (typeof syncManager !== 'undefined') {
            syncManager.stop();
        }
        
        calendarManager.destroy();
        
        this.isInitialized = false;
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.bandSyncCalendar = new BandSyncCalendar();
    window.bandSyncCalendar.init();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BandSyncCalendar };
}