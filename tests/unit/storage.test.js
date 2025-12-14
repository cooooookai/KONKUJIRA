// Unit tests for storage functionality

const { StorageManager } = require('../../src/frontend/js/storage');

// Mock CONFIG for testing
global.CONFIG = {
    STORAGE_KEYS: {
        NICKNAME: 'band_calendar_nickname',
        PREFERENCES: 'band_calendar_preferences'
    },
    VALIDATION: {
        NICKNAME_MIN_LENGTH: 1,
        NICKNAME_MAX_LENGTH: 20
    }
};

describe('StorageManager', () => {
    let storageManager;
    
    beforeEach(() => {
        storageManager = new StorageManager();
    });
    
    describe('nickname management', () => {
        test('should save and retrieve nickname', () => {
            const nickname = 'TestUser';
            
            expect(storageManager.setNickname(nickname)).toBe(true);
            expect(localStorage.setItem).toHaveBeenCalledWith(
                CONFIG.STORAGE_KEYS.NICKNAME, 
                nickname
            );
        });
        
        test('should validate nickname length', () => {
            expect(storageManager.validateNickname('')).toBe(false);
            expect(storageManager.validateNickname('a'.repeat(21))).toBe(false);
            expect(storageManager.validateNickname('ValidName')).toBe(true);
        });
        
        test('should trim whitespace from nickname', () => {
            const nickname = '  TestUser  ';
            storageManager.setNickname(nickname);
            
            expect(localStorage.setItem).toHaveBeenCalledWith(
                CONFIG.STORAGE_KEYS.NICKNAME, 
                'TestUser'
            );
        });
    });
    
    describe('preferences management', () => {
        test('should save and retrieve preferences', () => {
            const preferences = { theme: 'dark', language: 'ja' };
            
            expect(storageManager.setPreferences(preferences)).toBe(true);
            expect(localStorage.setItem).toHaveBeenCalledWith(
                CONFIG.STORAGE_KEYS.PREFERENCES,
                JSON.stringify(preferences)
            );
        });
        
        test('should handle invalid JSON in preferences', () => {
            localStorage.getItem.mockReturnValue('invalid json');
            
            const result = storageManager.getPreferences();
            expect(result).toEqual({});
        });
    });
});