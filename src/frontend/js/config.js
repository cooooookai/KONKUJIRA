/**
 * Configuration settings for Band Sync Calendar
 */

const CONFIG = {
    // API Configuration
    API_BASE_URL: 'https://band-sync-calendar-production.cooooookai.workers.dev',
    
    // Calendar Views
    CALENDAR_VIEWS: {
        MOBILE: 'listMonth',
        DESKTOP: 'dayGridMonth'
    },
    
    // Sync Settings
    POLLING_INTERVAL: 60000, // 60 seconds
    SYNC_PERIOD_MONTHS: 2,
    
    // Status Symbols
    STATUS_SYMBOLS: {
        'good': '○',
        'ok': '△',
        'bad': '×'
    },
    
    // Event Types
    EVENT_TYPES: {
        'live': 'LIVE',
        'rehearsal': 'リハーサル',
        'other': 'その他'
    },
    
    // Holiday API
    HOLIDAY_API_URL: 'https://holidays-jp.github.io/api/v1/date.json',
    
    // UI Settings
    MOBILE_BREAKPOINT: 768,
    DRAWER_ANIMATION_DURATION: 300,
    
    // Validation
    MAX_NICKNAME_LENGTH: 20,
    MAX_TITLE_LENGTH: 100,
    
    // Date Format
    DATE_FORMAT: 'YYYY-MM-DD',
    DATETIME_FORMAT: 'YYYY-MM-DDTHH:mm:ss',
    
    // Error Messages (Japanese)
    ERROR_MESSAGES: {
        NETWORK_ERROR: 'ネットワークエラーが発生しました。',
        INVALID_DATE_RANGE: '開始時刻は終了時刻より前である必要があります。',
        NICKNAME_REQUIRED: 'ニックネームを入力してください。',
        TITLE_REQUIRED: 'タイトルを入力してください。',
        SYNC_PERIOD_ERROR: '入力可能期間外です（今日から2ヶ月以内）。',
        SAVE_ERROR: '保存に失敗しました。もう一度お試しください。'
    }
};

// Utility Functions
function isMobileDevice() {
    return window.innerWidth <= CONFIG.MOBILE_BREAKPOINT;
}

function getSyncPeriod() {
    const today = new Date();
    const start = today.toISOString().split('T')[0]; // Today in YYYY-MM-DD format
    
    const endDate = new Date(today);
    endDate.setMonth(today.getMonth() + CONFIG.SYNC_PERIOD_MONTHS);
    const end = endDate.toISOString().split('T')[0];
    
    return { start, end };
}

function formatDateTime(date) {
    if (typeof date === 'string') {
        date = new Date(date);
    }
    return date.toISOString();
}

function formatDateForDisplay(date) {
    if (typeof date === 'string') {
        date = new Date(date);
    }
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });
}

function formatTimeForInput(date) {
    if (typeof date === 'string') {
        date = new Date(date);
    }
    return date.toTimeString().slice(0, 5); // HH:MM format
}

function isWithinSyncPeriod(date) {
    const { start, end } = getSyncPeriod();
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    return dateStr >= start && dateStr <= end;
}

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CONFIG,
        isMobileDevice,
        getSyncPeriod,
        formatDateTime,
        formatDateForDisplay,
        formatTimeForInput,
        isWithinSyncPeriod
    };
}