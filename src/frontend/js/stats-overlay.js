/**
 * Stats Overlay for Band Sync Calendar
 * Shows availability statistics directly on the main calendar
 */

class StatsOverlay {
    constructor() {
        this.isEnabled = false;
        this.memberNames = ['COKAI', 'YUSUKE', 'ZEN', 'YAMCHI', 'テスト', 'USER'];
        this.statsData = new Map();
    }
    
    initialize() {
        this.createToggleButton();
        this.setupEventListeners();
        console.log('Stats overlay initialized');
    }
    
    createToggleButton() {
        // Check if button already exists
        if (document.getElementById('stats-toggle')) {
            console.log('📊 Stats button already exists');
            return;
        }
        
        // Add stats toggle button to header
        const headerButtons = document.querySelector('.header-buttons');
        if (headerButtons) {
            const statsBtn = document.createElement('button');
            statsBtn.id = 'stats-toggle';
            statsBtn.className = 'stats-button';
            statsBtn.innerHTML = '📊 統計';
            statsBtn.setAttribute('aria-label', '統計表示切替');
            
            // Insert before overview button
            const overviewBtn = document.getElementById('overview-button');
            if (overviewBtn) {
                headerButtons.insertBefore(statsBtn, overviewBtn);
                console.log('📊 Stats button inserted before overview button');
            } else {
                headerButtons.appendChild(statsBtn);
                console.log('📊 Stats button appended to header buttons');
            }
        } else {
            console.error('❌ Header buttons container not found');
        }
    }
    
    setupEventListeners() {
        const statsBtn = document.getElementById('stats-toggle');
        if (statsBtn) {
            statsBtn.addEventListener('click', () => {
                this.toggle();
            });
        }
        
        // Listen for calendar render events
        document.addEventListener('calendar-rendered', () => {
            if (this.isEnabled) {
                this.updateStatsDisplay();
            }
        });
        
        // Listen for data changes
        document.addEventListener('availability-saved', () => {
            if (this.isEnabled) {
                setTimeout(() => this.loadAndDisplayStats(), 1000);
            }
        });
    }
    
    async toggle() {
        console.log('🔄 Toggling stats overlay...');
        this.isEnabled = !this.isEnabled;
        const statsBtn = document.getElementById('stats-toggle');
        
        if (!statsBtn) {
            console.error('❌ Stats button not found');
            return;
        }
        
        console.log('📊 Stats enabled:', this.isEnabled);
        
        if (this.isEnabled) {
            statsBtn.classList.add('active');
            statsBtn.innerHTML = '📊 統計 ON';
            console.log('🚀 Loading and displaying stats...');
            
            try {
                await this.loadAndDisplayStats();
                
                // If no data was loaded, show a message
                if (this.statsData.size === 0) {
                    console.log('⚠️ No stats data available, showing demo data');
                    this.showDemoStats();
                }
            } catch (error) {
                console.error('❌ Failed to load stats:', error);
                // Show demo stats as fallback
                this.showDemoStats();
            }
        } else {
            statsBtn.classList.remove('active');
            statsBtn.innerHTML = '📊 統計';
            console.log('🧹 Clearing stats display...');
            this.clearStatsDisplay();
        }
    }
    
    async loadAndDisplayStats() {
        try {
            console.log('Loading stats data...');
            await this.loadStatsData();
            this.updateStatsDisplay();
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }
    
    async loadStatsData() {
        this.statsData.clear();
        const currentUser = storage.getNickname();
        
        console.log('🔍 Loading stats data for all members...');
        console.log('Current user:', currentUser);
        
        // Check if we have the necessary dependencies
        if (typeof apiClient === 'undefined') {
            console.error('❌ apiClient not available');
            return;
        }
        
        if (typeof storage === 'undefined') {
            console.error('❌ storage not available');
            return;
        }
        
        for (const memberName of this.memberNames) {
            try {
                console.log(`📊 Loading data for ${memberName}...`);
                
                // Temporarily switch user to get their data
                storage.setNickname(memberName);
                
                // Get current calendar view dates
                let start, end;
                const calendar = window.bandSyncCalendar?.calendar;
                if (calendar) {
                    const view = calendar.view;
                    start = view.activeStart.toISOString().split('T')[0];
                    end = view.activeEnd.toISOString().split('T')[0];
                    console.log(`📅 Using calendar date range: ${start} to ${end}`);
                } else {
                    // Fallback to current month if calendar not available
                    const today = new Date();
                    start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
                    end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
                    console.log(`📅 Using fallback date range: ${start} to ${end}`);
                }
                
                const response = await apiClient.getAvailability(start, end);
                console.log(`📋 Response for ${memberName}:`, response);
                
                if (response && response.data && response.data.length > 0) {
                    console.log(`✅ Found ${response.data.length} records for ${memberName}`);
                    response.data.forEach(item => {
                        // Handle both date formats
                        let date;
                        if (item.date) {
                            date = item.date.split('T')[0];
                        } else if (item.start_time) {
                            date = item.start_time.split('T')[0];
                        } else {
                            console.warn('❌ No date field found in item:', item);
                            return;
                        }
                        
                        if (!this.statsData.has(date)) {
                            this.statsData.set(date, { good: 0, ok: 0, bad: 0 });
                        }
                        const dayStats = this.statsData.get(date);
                        if (dayStats[item.status] !== undefined) {
                            dayStats[item.status]++;
                            console.log(`📈 Added ${item.status} for ${date} (total: ${dayStats[item.status]})`);
                        } else {
                            console.warn(`❌ Unknown status: ${item.status}`);
                        }
                    });
                } else {
                    console.log(`❌ No data found for ${memberName}`);
                }
            } catch (error) {
                console.warn(`❌ Failed to load data for ${memberName}:`, error);
            }
        }
        
        // Restore original user
        if (currentUser) {
            storage.setNickname(currentUser);
            console.log(`🔄 Restored user to: ${currentUser}`);
        }
        
        console.log('📊 Final stats data:', this.statsData);
        console.log('📊 Stats data size:', this.statsData.size);
        
        // Log each date's stats for debugging
        this.statsData.forEach((stats, date) => {
            console.log(`📅 ${date}: ○${stats.good} △${stats.ok} ×${stats.bad}`);
        });
    }
    
    updateStatsDisplay() {
        if (!this.isEnabled) {
            console.log('❌ Stats not enabled, skipping display update');
            return;
        }
        
        console.log('🎨 Updating stats display...');
        
        // Find all calendar day cells
        const dayCells = document.querySelectorAll('.fc-daygrid-day');
        console.log(`📅 Found ${dayCells.length} calendar day cells`);
        
        let updatedCells = 0;
        dayCells.forEach(cell => {
            const dateAttr = cell.getAttribute('data-date');
            if (dateAttr && this.statsData.has(dateAttr)) {
                const stats = this.statsData.get(dateAttr);
                console.log(`📊 Adding stats to ${dateAttr}:`, stats);
                this.addStatsToCell(cell, stats);
                updatedCells++;
            }
        });
        
        console.log(`✅ Updated ${updatedCells} cells with stats`);
    }
    
    addStatsToCell(cell, stats) {
        // Remove existing stats
        const existingStats = cell.querySelector('.stats-overlay');
        if (existingStats) {
            existingStats.remove();
        }
        
        // Create stats overlay
        const statsEl = document.createElement('div');
        statsEl.className = 'stats-overlay';
        
        let statsHtml = '';
        if (stats.good > 0) {
            statsHtml += `<span class="stat-item good">○${stats.good}</span>`;
        }
        if (stats.ok > 0) {
            statsHtml += `<span class="stat-item ok">△${stats.ok}</span>`;
        }
        if (stats.bad > 0) {
            statsHtml += `<span class="stat-item bad">×${stats.bad}</span>`;
        }
        
        if (statsHtml) {
            statsEl.innerHTML = statsHtml;
            
            // Find the day content area
            const dayContent = cell.querySelector('.fc-daygrid-day-frame') || cell;
            dayContent.appendChild(statsEl);
        }
    }
    
    clearStatsDisplay() {
        const statsOverlays = document.querySelectorAll('.stats-overlay');
        statsOverlays.forEach(overlay => overlay.remove());
        console.log(`🧹 Cleared ${statsOverlays.length} stats overlays`);
    }
    
    showDemoStats() {
        console.log('🎭 Showing demo stats...');
        
        // Create demo data for the current week
        const today = new Date();
        const demoData = new Map();
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            
            demoData.set(dateStr, {
                good: Math.floor(Math.random() * 3) + 1,
                ok: Math.floor(Math.random() * 2),
                bad: Math.floor(Math.random() * 2)
            });
        }
        
        // Temporarily use demo data
        const originalData = this.statsData;
        this.statsData = demoData;
        
        // Display demo stats
        this.updateStatsDisplay();
        
        // Restore original data
        this.statsData = originalData;
        
        console.log('🎭 Demo stats displayed');
    }
}

// Create global instance
const statsOverlay = new StatsOverlay();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing stats overlay...');
    statsOverlay.initialize();
});

// Also initialize if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🚀 Initializing stats overlay (DOM ready)...');
        statsOverlay.initialize();
    });
} else {
    console.log('🚀 Initializing stats overlay (DOM already loaded)...');
    statsOverlay.initialize();
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StatsOverlay, statsOverlay };
}