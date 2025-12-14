/**
 * Synchronization Manager for Band Sync Calendar
 * Handles real-time data synchronization with conflict resolution
 */

class SyncManager {
    constructor() {
        this.isActive = false;
        this.syncInterval = null;
        this.lastSyncTime = null;
        this.syncInProgress = false;
        this.conflictQueue = [];
        this.syncListeners = [];
    }
    
    initialize() {
        this.setupEventListeners();
        console.log('Sync manager initialized');
    }
    
    setupEventListeners() {
        // Listen for data changes
        document.addEventListener('availability-saved', (event) => {
            this.handleDataChange('availability', event.detail);
        });
        
        document.addEventListener('event-created', (event) => {
            this.handleDataChange('event', event.detail);
        });
        
        // Listen for network status changes
        window.addEventListener('online', () => {
            this.handleNetworkRestore();
        });
        
        // Listen for focus changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.handleAppFocus();
            }
        });
    }
    
    start() {
        if (this.isActive) return;
        
        this.isActive = true;
        this.startPolling();
        console.log('Synchronization started');
    }
    
    stop() {
        if (!this.isActive) return;
        
        this.isActive = false;
        this.stopPolling();
        console.log('Synchronization stopped');
    }
    
    startPolling() {
        this.stopPolling(); // Clear any existing interval
        
        this.syncInterval = setInterval(() => {
            this.performSync('polling');
        }, CONFIG.POLLING_INTERVAL);
    }
    
    stopPolling() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }
    
    async performSync(trigger = 'manual') {
        if (this.syncInProgress || !navigator.onLine) {
            return;
        }
        
        try {
            this.syncInProgress = true;
            console.log(`[Sync] Starting sync (trigger: ${trigger})`);
            
            // Notify listeners
            this.notifyListeners('sync-start', { trigger });
            
            // Get current data state
            const { start, end } = getSyncPeriod();
            
            // Fetch latest data
            const [events, availability] = await Promise.all([
                apiClient.getEvents(start, end),
                apiClient.getAvailability(start, end)
            ]);
            
            // Check for conflicts and resolve them
            const conflicts = this.detectConflicts(events, availability);
            if (conflicts.length > 0) {
                await this.resolveConflicts(conflicts);
            }
            
            // Update calendar
            if (window.calendarManager) {
                await window.calendarManager.loadData();
            }
            
            this.lastSyncTime = new Date();
            
            // Notify listeners
            this.notifyListeners('sync-success', { 
                trigger, 
                timestamp: this.lastSyncTime,
                eventsCount: events.length,
                availabilityCount: availability.length
            });
            
            console.log(`[Sync] Sync completed (${events.length} events, ${availability.length} availability)`);
            
        } catch (error) {
            console.error('[Sync] Sync failed:', error);
            
            // Notify listeners
            this.notifyListeners('sync-error', { 
                trigger, 
                error: error.message 
            });
            
        } finally {
            this.syncInProgress = false;
        }
    }
    
    detectConflicts(events, availability) {
        const conflicts = [];
        
        // Check for overlapping events from different users
        const userEvents = events.filter(event => 
            event.extendedProps && event.extendedProps.createdBy === storage.getNickname()
        );
        
        const otherEvents = events.filter(event => 
            event.extendedProps && event.extendedProps.createdBy !== storage.getNickname()
        );
        
        userEvents.forEach(userEvent => {
            otherEvents.forEach(otherEvent => {
                if (this.eventsOverlap(userEvent, otherEvent)) {
                    conflicts.push({
                        type: 'event_overlap',
                        userEvent,
                        otherEvent,
                        severity: 'warning'
                    });
                }
            });
        });
        
        return conflicts;
    }
    
    eventsOverlap(event1, event2) {
        const start1 = new Date(event1.start);
        const end1 = new Date(event1.end);
        const start2 = new Date(event2.start);
        const end2 = new Date(event2.end);
        
        return start1 < end2 && start2 < end1;
    }
    
    async resolveConflicts(conflicts) {
        for (const conflict of conflicts) {
            switch (conflict.type) {
                case 'event_overlap':
                    await this.handleEventOverlap(conflict);
                    break;
                default:
                    console.warn('[Sync] Unknown conflict type:', conflict.type);
            }
        }
    }
    
    async handleEventOverlap(conflict) {
        // For now, just log the conflict
        // In a more advanced implementation, we could show a UI to resolve conflicts
        console.warn('[Sync] Event overlap detected:', {
            userEvent: conflict.userEvent.title,
            otherEvent: conflict.otherEvent.title,
            otherUser: conflict.otherEvent.extendedProps.createdBy
        });
        
        // Optionally show notification to user
        if (window.networkStatusManager) {
            window.networkStatusManager.showMessage(
                `イベントの重複: ${conflict.otherEvent.title} (${conflict.otherEvent.extendedProps.createdBy})`,
                'warning'
            );
        }
    }
    
    handleDataChange(type, data) {
        console.log(`[Sync] Data changed: ${type}`, data);
        
        // Trigger immediate sync after data change
        setTimeout(() => {
            this.performSync('data-change');
        }, 1000); // Small delay to allow API to process
    }
    
    handleNetworkRestore() {
        console.log('[Sync] Network restored - triggering sync');
        
        // Process any queued requests
        if (apiClient) {
            apiClient.processQueue();
        }
        
        // Perform full sync
        setTimeout(() => {
            this.performSync('network-restore');
        }, 2000); // Longer delay to ensure network is stable
    }
    
    handleAppFocus() {
        console.log('[Sync] App focused - checking for updates');
        
        // Only sync if it's been a while since last sync
        if (!this.lastSyncTime || (Date.now() - this.lastSyncTime.getTime()) > 30000) {
            this.performSync('app-focus');
        }
    }
    
    // Event listener management
    addSyncListener(callback) {
        this.syncListeners.push(callback);
    }
    
    removeSyncListener(callback) {
        const index = this.syncListeners.indexOf(callback);
        if (index > -1) {
            this.syncListeners.splice(index, 1);
        }
    }
    
    notifyListeners(event, data) {
        this.syncListeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('[Sync] Listener error:', error);
            }
        });
        
        // Also dispatch DOM events
        document.dispatchEvent(new CustomEvent(`sync-${event}`, { detail: data }));
    }
    
    // Public API
    getStatus() {
        return {
            isActive: this.isActive,
            syncInProgress: this.syncInProgress,
            lastSyncTime: this.lastSyncTime,
            conflictCount: this.conflictQueue.length,
            isOnline: navigator.onLine
        };
    }
    
    async forcSync() {
        return this.performSync('manual');
    }
    
    // Optimistic updates
    async optimisticUpdate(type, data, apiCall) {
        try {
            // Apply update immediately to UI
            this.applyOptimisticUpdate(type, data);
            
            // Make API call
            const result = await apiCall();
            
            // Confirm update was successful
            this.confirmOptimisticUpdate(type, data, result);
            
            return result;
        } catch (error) {
            // Rollback optimistic update
            this.rollbackOptimisticUpdate(type, data);
            throw error;
        }
    }
    
    applyOptimisticUpdate(type, data) {
        // Apply update to calendar immediately
        console.log(`[Sync] Applying optimistic update: ${type}`, data);
        
        // This would update the calendar display immediately
        // Implementation depends on the specific update type
    }
    
    confirmOptimisticUpdate(type, data, result) {
        console.log(`[Sync] Confirmed optimistic update: ${type}`, result);
        
        // Trigger data change event
        document.dispatchEvent(new CustomEvent(`${type}-confirmed`, { 
            detail: { original: data, result } 
        }));
    }
    
    rollbackOptimisticUpdate(type, data) {
        console.log(`[Sync] Rolling back optimistic update: ${type}`, data);
        
        // Remove the optimistic update from UI
        // Implementation depends on the specific update type
        
        // Trigger rollback event
        document.dispatchEvent(new CustomEvent(`${type}-rollback`, { 
            detail: data 
        }));
    }
}

// Create global instance
const syncManager = new SyncManager();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SyncManager, syncManager };
}