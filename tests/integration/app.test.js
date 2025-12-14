/**
 * Integration tests for Band Sync Calendar
 */

describe('Band Sync Calendar Integration Tests', () => {
    let app;
    
    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = `
            <div id="app">
                <header>
                    <div class="header-content">
                        <h1>バンド同期カレンダー</h1>
                        <div class="header-buttons">
                            <button id="holiday-button" class="holiday-button">🎌 祝日</button>
                            <button id="settings-button" class="settings-button">⚙️ 設定</button>
                        </div>
                    </div>
                    <div id="nickname-display"></div>
                </header>
                <main>
                    <div id="calendar"></div>
                </main>
                <div id="drawer" class="drawer">
                    <div class="drawer-content">
                        <div class="drawer-header">
                            <h2 id="drawer-title">スケジュール入力</h2>
                            <button id="drawer-close" class="close-btn">&times;</button>
                        </div>
                        <div class="drawer-tabs">
                            <button id="availability-tab" class="tab-btn active">空き状況</button>
                            <button id="event-tab" class="tab-btn">イベント</button>
                        </div>
                        <div id="availability-form" class="form-content"></div>
                        <div id="event-form" class="form-content hidden"></div>
                    </div>
                </div>
                <div id="nickname-modal" class="modal hidden">
                    <div class="modal-content">
                        <h2>ニックネームを入力してください</h2>
                        <input type="text" id="nickname-input" placeholder="ニックネーム" maxlength="20">
                        <button id="nickname-submit">設定</button>
                    </div>
                </div>
                <div id="loading" class="loading hidden">
                    <div class="spinner"></div>
                </div>
            </div>
        `;
        
        // Mock localStorage
        global.localStorage = {
            data: {},
            getItem: jest.fn(key => global.localStorage.data[key] || null),
            setItem: jest.fn((key, value) => { global.localStorage.data[key] = value; }),
            removeItem: jest.fn(key => { delete global.localStorage.data[key]; }),
            clear: jest.fn(() => { global.localStorage.data = {}; })
        };
        
        // Mock fetch
        global.fetch = jest.fn();
        
        // Mock FullCalendar
        global.FullCalendar = {
            Calendar: jest.fn().mockImplementation(() => ({
                render: jest.fn(),
                destroy: jest.fn(),
                removeAllEvents: jest.fn(),
                addEventSource: jest.fn(),
                changeView: jest.fn(),
                view: { type: 'dayGridMonth' }
            }))
        };
    });
    
    afterEach(() => {
        jest.clearAllMocks();
        if (app) {
            app.destroy();
        }
    });
    
    test('should initialize app with nickname', async () => {
        // Set up nickname in storage
        localStorage.setItem('band_sync_nickname', 'テストユーザー');
        
        const { BandSyncCalendar } = require('../../src/frontend/js/app.js');
        app = new BandSyncCalendar();
        
        await app.init();
        
        expect(app.isInitialized).toBe(true);
        expect(FullCalendar.Calendar).toHaveBeenCalled();
    });
    
    test('should show nickname modal when no nickname', async () => {
        const { BandSyncCalendar } = require('../../src/frontend/js/app.js');
        app = new BandSyncCalendar();
        
        // Mock showNicknameModal
        app.showNicknameModal = jest.fn();
        
        await app.init();
        
        expect(app.showNicknameModal).toHaveBeenCalled();
        expect(app.isInitialized).toBe(false);
    });
    
    test('should handle network errors gracefully', async () => {
        localStorage.setItem('band_sync_nickname', 'テストユーザー');
        
        // Mock fetch to reject
        fetch.mockRejectedValue(new Error('Network error'));
        
        const { BandSyncCalendar } = require('../../src/frontend/js/app.js');
        app = new BandSyncCalendar();
        
        // Should not throw
        await expect(app.init()).resolves.not.toThrow();
    });
});

describe('API Client Tests', () => {
    let apiClient;
    
    beforeEach(() => {
        global.fetch = jest.fn();
        const { APIClient } = require('../../src/frontend/js/api.js');
        apiClient = new APIClient('https://test-api.com');
    });
    
    test('should retry failed requests', async () => {
        fetch
            .mockRejectedValueOnce(new Error('Network error'))
            .mockRejectedValueOnce(new Error('Network error'))
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });
        
        const result = await apiClient.request('/test');
        
        expect(fetch).toHaveBeenCalledTimes(3);
        expect(result).toEqual({ success: true });
    });
    
    test('should handle API errors properly', async () => {
        fetch.mockResolvedValue({
            ok: false,
            status: 400,
            statusText: 'Bad Request',
            json: () => Promise.resolve({ error: 'Invalid data' })
        });
        
        await expect(apiClient.request('/test')).rejects.toThrow();
    });
    
    test('should validate event data', () => {
        const validEvent = {
            title: 'Test Event',
            type: 'live',
            start_time: '2024-01-01T10:00:00Z',
            end_time: '2024-01-01T12:00:00Z',
            created_by: 'Test User'
        };
        
        expect(() => apiClient.validateEventData(validEvent)).not.toThrow();
        
        const invalidEvent = { ...validEvent, type: 'invalid' };
        expect(() => apiClient.validateEventData(invalidEvent)).toThrow();
    });
});

describe('Storage Tests', () => {
    let storage;
    
    beforeEach(() => {
        global.localStorage = {
            data: {},
            getItem: jest.fn(key => global.localStorage.data[key] || null),
            setItem: jest.fn((key, value) => { global.localStorage.data[key] = value; }),
            removeItem: jest.fn(key => { delete global.localStorage.data[key]; }),
            clear: jest.fn(() => { global.localStorage.data = {}; })
        };
        
        const { LocalStorage } = require('../../src/frontend/js/storage.js');
        storage = new LocalStorage();
    });
    
    test('should store and retrieve nickname', () => {
        const nickname = 'テストユーザー';
        
        expect(storage.setNickname(nickname)).toBe(true);
        expect(storage.getNickname()).toBe(nickname);
    });
    
    test('should validate nickname length', () => {
        expect(storage.setNickname('')).toBe(false);
        expect(storage.setNickname('a'.repeat(25))).toBe(false);
        expect(storage.setNickname('ValidName')).toBe(true);
    });
    
    test('should manage cache with TTL', () => {
        const testData = { test: 'data' };
        
        storage.setCache('test-key', testData, 1); // 1 minute TTL
        expect(storage.getCache('test-key')).toEqual(testData);
        
        // Mock expired cache
        const expiredTime = Date.now() - 2 * 60 * 1000; // 2 minutes ago
        localStorage.data['band_sync_cache'] = JSON.stringify({
            'expired-key': {
                data: testData,
                expires: expiredTime
            }
        });
        
        expect(storage.getCache('expired-key')).toBeNull();
    });
});