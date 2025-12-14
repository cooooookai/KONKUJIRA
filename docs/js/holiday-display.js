/**
 * Holiday Display Component for Band Sync Calendar
 * Shows upcoming Japanese holidays and holiday information
 */

class HolidayDisplay {
    constructor() {
        this.container = null;
        this.isVisible = false;
    }
    
    /**
     * Initialize holiday display
     */
    initialize() {
        this.createContainer();
        this.setupEventListeners();
        console.log('Holiday display initialized');
    }
    
    /**
     * Create holiday display container
     */
    createContainer() {
        this.container = document.createElement('div');
        this.container.id = 'holiday-display';
        this.container.className = 'holiday-display hidden';
        this.container.innerHTML = `
            <div class="holiday-header">
                <h3>🎌 日本の祝日</h3>
                <button class="holiday-close" aria-label="閉じる">&times;</button>
            </div>
            <div class="holiday-content">
                <div class="holiday-loading">読み込み中...</div>
                <div class="holiday-list"></div>
                <div class="holiday-stats"></div>
            </div>
        `;
        
        // Add to body
        document.body.appendChild(this.container);
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Close button
        const closeBtn = this.container.querySelector('.holiday-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }
        
        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
        
        // Close on backdrop click
        this.container.addEventListener('click', (e) => {
            if (e.target === this.container) {
                this.hide();
            }
        });
    }
    
    /**
     * Show holiday display
     */
    async show() {
        if (this.isVisible) return;
        
        this.isVisible = true;
        this.container.classList.remove('hidden');
        
        // Load and display holidays
        await this.loadAndDisplayHolidays();
        
        // Focus management
        this.container.focus();
    }
    
    /**
     * Hide holiday display
     */
    hide() {
        if (!this.isVisible) return;
        
        this.isVisible = false;
        this.container.classList.add('hidden');
    }
    
    /**
     * Load and display holidays
     */
    async loadAndDisplayHolidays() {
        const loadingEl = this.container.querySelector('.holiday-loading');
        const listEl = this.container.querySelector('.holiday-list');
        const statsEl = this.container.querySelector('.holiday-stats');
        
        try {
            // Show loading
            loadingEl.style.display = 'block';
            listEl.innerHTML = '';
            statsEl.innerHTML = '';
            
            // Get holidays
            let holidays = {};
            if (typeof holidayManager !== 'undefined') {
                holidays = await holidayManager.getHolidays();
            }
            
            // Hide loading
            loadingEl.style.display = 'none';
            
            if (Object.keys(holidays).length === 0) {
                listEl.innerHTML = '<div class="no-holidays">祝日情報が見つかりません</div>';
                return;
            }
            
            // Display holidays
            this.displayHolidayList(holidays, listEl);
            this.displayHolidayStats(holidays, statsEl);
            
        } catch (error) {
            console.error('Failed to load holidays for display:', error);
            loadingEl.style.display = 'none';
            listEl.innerHTML = '<div class="holiday-error">祝日の読み込みに失敗しました</div>';
        }
    }
    
    /**
     * Display holiday list
     */
    displayHolidayList(holidays, container) {
        const today = new Date().toISOString().split('T')[0];
        const sortedHolidays = Object.entries(holidays)
            .sort(([dateA], [dateB]) => dateA.localeCompare(dateB));
        
        const upcomingHolidays = sortedHolidays.filter(([date]) => date >= today);
        const pastHolidays = sortedHolidays.filter(([date]) => date < today);
        
        let html = '';
        
        // Upcoming holidays
        if (upcomingHolidays.length > 0) {
            html += '<div class="holiday-section"><h4>今後の祝日</h4>';
            upcomingHolidays.forEach(([date, name]) => {
                const daysUntil = this.getDaysUntil(date);
                html += `
                    <div class="holiday-item upcoming">
                        <div class="holiday-date">${this.formatDate(date)}</div>
                        <div class="holiday-name">${name}</div>
                        <div class="holiday-countdown">${daysUntil}</div>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        // Past holidays
        if (pastHolidays.length > 0) {
            html += '<div class="holiday-section"><h4>過去の祝日</h4>';
            pastHolidays.slice(-5).forEach(([date, name]) => { // Show last 5
                html += `
                    <div class="holiday-item past">
                        <div class="holiday-date">${this.formatDate(date)}</div>
                        <div class="holiday-name">${name}</div>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        container.innerHTML = html;
    }
    
    /**
     * Display holiday statistics
     */
    displayHolidayStats(holidays, container) {
        const today = new Date().toISOString().split('T')[0];
        const total = Object.keys(holidays).length;
        const upcoming = Object.keys(holidays).filter(date => date >= today).length;
        const thisMonth = Object.keys(holidays).filter(date => 
            date.startsWith(new Date().toISOString().slice(0, 7))
        ).length;
        
        container.innerHTML = `
            <div class="holiday-stats-grid">
                <div class="stat-item">
                    <div class="stat-number">${total}</div>
                    <div class="stat-label">総祝日数</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${upcoming}</div>
                    <div class="stat-label">今後の祝日</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${thisMonth}</div>
                    <div class="stat-label">今月の祝日</div>
                </div>
            </div>
        `;
    }
    
    /**
     * Format date for display
     */
    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ja-JP', {
            month: 'long',
            day: 'numeric',
            weekday: 'short'
        });
    }
    
    /**
     * Get days until a date
     */
    getDaysUntil(dateStr) {
        const today = new Date();
        const targetDate = new Date(dateStr);
        const diffTime = targetDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return '今日';
        if (diffDays === 1) return '明日';
        if (diffDays < 7) return `${diffDays}日後`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間後`;
        return `${Math.floor(diffDays / 30)}ヶ月後`;
    }
    
    /**
     * Toggle display
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
}

// Create global instance
const holidayDisplay = new HolidayDisplay();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    holidayDisplay.initialize();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HolidayDisplay, holidayDisplay };
}