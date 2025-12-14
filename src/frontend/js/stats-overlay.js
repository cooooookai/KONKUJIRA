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
            } else {
                headerButtons.appendChild(statsBtn);
            }
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
        this.isEnabled = !this.isEnabled;
        const statsBtn = document.getElementById('stats-toggle');
        
        if (this.isEnabled) {
            statsBtn.classList.add('active');
            statsBtn.innerHTML = '📊 統計 ON';
            await this.loadAndDisplayStats();
        } else {
            statsBtn.classList.remove('active');
            statsBtn.innerHTML = '📊 統計';
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
        
        for (const memberName of this.memberNames) {
            try {
                // Temporarily switch user to get their data
                storage.setNickname(memberName);
                
                // Get current calendar view dates
                const calendar = window.bandSyncCalendar?.calendar;
                if (calendar) {
                    const view = calendar.view;
                    const start = view.activeStart.toISOString().split('T')[0];
                    const end = view.activeEnd.toISOString().split('T')[0];
                    
                    const response = await apiClient.getAvailability(start, end);
                    
                    if (response && response.data) {
                        response.data.forEach(item => {
                            const date = item.date.split('T')[0];
                            if (!this.statsData.has(date)) {
                                this.statsData.set(date, { good: 0, ok: 0, bad: 0 });
                            }
                            const dayStats = this.statsData.get(date);
                            dayStats[item.status]++;
                        });
                    }
                }
            } catch (error) {
                console.warn(`Failed to load data for ${memberName}:`, error);
            }
        }
        
        // Restore original user
        if (currentUser) {
            storage.setNickname(currentUser);
        }
        
        console.log('Stats data loaded:', this.statsData);
    }
    
    updateStatsDisplay() {
        if (!this.isEnabled) return;
        
        // Find all calendar day cells
        const dayCells = document.querySelectorAll('.fc-daygrid-day');
        
        dayCells.forEach(cell => {
            const dateAttr = cell.getAttribute('data-date');
            if (dateAttr && this.statsData.has(dateAttr)) {
                const stats = this.statsData.get(dateAttr);
                this.addStatsToCell(cell, stats);
            }
        });
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
    }
}

// Create global instance
const statsOverlay = new StatsOverlay();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    statsOverlay.initialize();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StatsOverlay, statsOverlay };
}