/**
 * Japanese Holiday Management for Band Sync Calendar
 * Integrates with Holidays JP API and provides holiday display functionality
 */

class HolidayManager {
    constructor() {
        this.holidays = {};
        this.lastFetch = null;
        this.isLoading = false;
    }
    
    /**
     * Initialize holiday manager
     */
    initialize() {
        console.log('Holiday manager initialized');
    }
    
    /**
     * Get Japanese holidays for the sync period
     */
    async getHolidays() {
        try {
            // Check cache first
            const cached = storage.getCache('japanese_holidays_filtered');
            if (cached && this.isCacheValid(cached.timestamp)) {
                console.log('[Holidays] 📋 Using cached holidays');
                return cached.data;
            }
            
            if (this.isLoading) {
                // If already loading, wait for completion
                return this.waitForLoad();
            }
            
            this.isLoading = true;
            console.log('[Holidays] 🎌 Fetching Japanese holidays');
            
            // Fetch from API
            const allHolidays = await this.fetchFromAPI();
            
            // Filter to sync period and format
            const filteredHolidays = this.filterAndFormatHolidays(allHolidays);
            
            // Cache the filtered results
            storage.setCache('japanese_holidays_filtered', {
                data: filteredHolidays,
                timestamp: Date.now()
            }, 24 * 60); // Cache for 24 hours
            
            this.holidays = filteredHolidays;
            this.lastFetch = new Date();
            
            console.log(`[Holidays] ✅ Loaded ${Object.keys(filteredHolidays).length} holidays`);
            return filteredHolidays;
            
        } catch (error) {
            console.error('[Holidays] Failed to fetch holidays:', error);
            
            // Return cached data if available
            const cached = storage.getCache('japanese_holidays_filtered');
            if (cached) {
                console.log('[Holidays] 📋 Using stale cached holidays due to error');
                return cached.data;
            }
            
            // Return empty object as fallback
            return {};
        } finally {
            this.isLoading = false;
        }
    }
    
    /**
     * Fetch holidays from the API
     */
    async fetchFromAPI() {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        try {
            const response = await fetch(CONFIG.HOLIDAY_API_URL, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'BandSyncCalendar/1.0'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`Holiday API failed: ${response.status} ${response.statusText}`);
            }
            
            const holidays = await response.json();
            
            // Validate response format
            if (typeof holidays !== 'object' || holidays === null) {
                throw new Error('Invalid holiday data format');
            }
            
            return holidays;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    
    /**
     * Filter holidays to sync period and format for display
     */
    filterAndFormatHolidays(allHolidays) {
        const { start, end } = getSyncPeriod();
        const filtered = {};
        
        Object.entries(allHolidays).forEach(([date, name]) => {
            // Check if date is within sync period
            if (date >= start && date <= end) {
                // Format holiday name with emoji
                filtered[date] = this.formatHolidayName(name, date);
            }
        });
        
        return filtered;
    }
    
    /**
     * Format holiday name with appropriate emoji and styling
     */
    formatHolidayName(name, date) {
        // Add appropriate emoji based on holiday type
        const emojiMap = {
            '元日': '🎍',
            '成人の日': '👘',
            '建国記念の日': '🏛️',
            '天皇誕生日': '👑',
            '春分の日': '🌸',
            '昭和の日': '🌿',
            '憲法記念日': '📜',
            'みどりの日': '🌱',
            'こどもの日': '🎏',
            '海の日': '🌊',
            '山の日': '⛰️',
            '敬老の日': '👴',
            '秋分の日': '🍂',
            'スポーツの日': '🏃',
            '文化の日': '🎨',
            '勤労感謝の日': '💼'
        };
        
        // Find matching emoji
        let emoji = '🎌'; // Default flag emoji
        for (const [keyword, emojiChar] of Object.entries(emojiMap)) {
            if (name.includes(keyword)) {
                emoji = emojiChar;
                break;
            }
        }
        
        return `${emoji} ${name}`;
    }
    
    /**
     * Check if cached data is still valid
     */
    isCacheValid(timestamp) {
        const now = Date.now();
        const cacheAge = now - timestamp;
        const maxAge = 12 * 60 * 60 * 1000; // 12 hours
        
        return cacheAge < maxAge;
    }
    
    /**
     * Wait for ongoing load operation
     */
    async waitForLoad() {
        return new Promise((resolve) => {
            const checkLoading = () => {
                if (!this.isLoading) {
                    resolve(this.holidays);
                } else {
                    setTimeout(checkLoading, 100);
                }
            };
            checkLoading();
        });
    }
    
    /**
     * Convert holidays to FullCalendar format
     */
    toFullCalendarEvents(holidays = null) {
        const holidaysToUse = holidays || this.holidays;
        
        return Object.entries(holidaysToUse).map(([date, name]) => ({
            id: `holiday-${date}`,
            title: name,
            start: date,
            allDay: true,
            display: 'background',
            backgroundColor: 'rgba(52, 152, 219, 0.15)',
            borderColor: 'rgba(52, 152, 219, 0.3)',
            textColor: '#2c3e50',
            classNames: ['holiday'],
            extendedProps: {
                type: 'holiday',
                isJapaneseHoliday: true,
                originalName: name.replace(/^[🎌🎍👘🏛️👑🌸🌿📜🌱🎏🌊⛰️👴🍂🏃🎨💼]\s/, '') // Remove emoji for original name
            }
        }));
    }
    
    /**
     * Check if a specific date is a holiday
     */
    isHoliday(date) {
        const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
        return dateStr in this.holidays;
    }
    
    /**
     * Get holiday name for a specific date
     */
    getHolidayName(date) {
        const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
        return this.holidays[dateStr] || null;
    }
    
    /**
     * Get all holidays in a date range
     */
    getHolidaysInRange(startDate, endDate) {
        const start = typeof startDate === 'string' ? startDate : startDate.toISOString().split('T')[0];
        const end = typeof endDate === 'string' ? endDate : endDate.toISOString().split('T')[0];
        
        const rangeHolidays = {};
        
        Object.entries(this.holidays).forEach(([date, name]) => {
            if (date >= start && date <= end) {
                rangeHolidays[date] = name;
            }
        });
        
        return rangeHolidays;
    }
    
    /**
     * Refresh holiday data
     */
    async refresh() {
        // Clear cache
        storage.clearCache('japanese_holidays_filtered');
        
        // Fetch fresh data
        return this.getHolidays();
    }
    
    /**
     * Get holiday statistics
     */
    getStats() {
        const totalHolidays = Object.keys(this.holidays).length;
        const upcomingHolidays = Object.entries(this.holidays)
            .filter(([date]) => date >= new Date().toISOString().split('T')[0])
            .length;
        
        return {
            total: totalHolidays,
            upcoming: upcomingHolidays,
            lastFetch: this.lastFetch,
            cacheValid: this.lastFetch ? this.isCacheValid(this.lastFetch.getTime()) : false
        };
    }
    
    /**
     * Format holiday for display in UI
     */
    formatForDisplay(date, includeDate = true) {
        const holidayName = this.getHolidayName(date);
        if (!holidayName) return null;
        
        if (includeDate) {
            const formattedDate = formatDateForDisplay(date);
            return `${formattedDate} - ${holidayName}`;
        }
        
        return holidayName;
    }
}

// Create global instance
const holidayManager = new HolidayManager();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HolidayManager, holidayManager };
}