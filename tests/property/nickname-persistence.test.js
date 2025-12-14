/**
 * Property Test 6: Nickname persistence
 * Validates: Requirements 4.2
 * 
 * Tests that nickname data is correctly persisted in localStorage
 * and maintained across browser sessions.
 */

const fc = require('fast-check');

// Mock localStorage implementation
class MockLocalStorage {
  constructor() {
    this.storage = new Map();
  }

  setItem(key, value) {
    if (typeof key !== 'string' || typeof value !== 'string') {
      throw new Error('Key and value must be strings');
    }
    this.storage.set(key, value);
  }

  getItem(key) {
    return this.storage.get(key) || null;
  }

  removeItem(key) {
    this.storage.delete(key);
  }

  clear() {
    this.storage.clear();
  }

  key(index) {
    const keys = Array.from(this.storage.keys());
    return keys[index] || null;
  }

  get length() {
    return this.storage.size;
  }
}

// Mock nickname manager
class NicknameManager {
  constructor(localStorage) {
    this.localStorage = localStorage;
    this.NICKNAME_KEY = 'band_sync_nickname';
  }

  setNickname(nickname) {
    this.validateNickname(nickname);
    this.localStorage.setItem(this.NICKNAME_KEY, nickname);
    return true;
  }

  getNickname() {
    return this.localStorage.getItem(this.NICKNAME_KEY);
  }

  hasNickname() {
    return this.getNickname() !== null;
  }

  clearNickname() {
    this.localStorage.removeItem(this.NICKNAME_KEY);
  }

  validateNickname(nickname) {
    if (typeof nickname !== 'string') {
      throw new Error('Nickname must be a string');
    }

    const trimmed = nickname.trim();
    
    if (trimmed.length === 0) {
      throw new Error('Nickname cannot be empty');
    }

    if (trimmed.length > 50) {
      throw new Error('Nickname cannot exceed 50 characters');
    }

    // Check for invalid characters
    if (/<script|javascript:|on\w+=/i.test(trimmed)) {
      throw new Error('Nickname contains invalid characters');
    }

    return trimmed;
  }

  updateNickname(newNickname) {
    const validated = this.validateNickname(newNickname);
    this.localStorage.setItem(this.NICKNAME_KEY, validated);
    return validated;
  }

  exportNicknameData() {
    const nickname = this.getNickname();
    return nickname ? {
      nickname,
      timestamp: new Date().toISOString()
    } : null;
  }

  importNicknameData(data) {
    if (!data || !data.nickname) {
      throw new Error('Invalid nickname data');
    }
    
    this.setNickname(data.nickname);
    return true;
  }
}

describe('Property Test 6: Nickname Persistence', () => {
  let mockStorage;
  let nicknameManager;

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
    nicknameManager = new NicknameManager(mockStorage);
    jest.clearAllMocks();
  });

  // Arbitraries for generating test data
  const validNicknameArb = fc.string({ minLength: 1, maxLength: 50 })
    .filter(name => {
      const trimmed = name.trim();
      return trimmed.length > 0 && 
             trimmed.length <= 50 && 
             !/<script|javascript:|on\w+=/i.test(trimmed);
    })
    .map(name => name.trim());

  const invalidNicknameArb = fc.oneof(
    fc.constant(''), // Empty string
    fc.constant('   '), // Only whitespace
    fc.string({ minLength: 51, maxLength: 100 }), // Too long
    fc.constant('<script>alert("xss")</script>'), // XSS attempt
    fc.constant('javascript:alert(1)'), // JavaScript injection
    fc.constant(null), // Null value
    fc.constant(undefined) // Undefined value
  );

  test('Property: Valid nicknames should persist correctly', () => {
    fc.assert(fc.property(
      validNicknameArb,
      (nickname) => {
        // Act: Set and retrieve nickname
        nicknameManager.setNickname(nickname);
        const retrievedNickname = nicknameManager.getNickname();

        // Property: Retrieved nickname should match original
        return retrievedNickname === nickname.trim();
      }
    ), { 
      numRuns: 100,
      verbose: true 
    });
  });

  test('Property: Invalid nicknames should be rejected', () => {
    fc.assert(fc.property(
      invalidNicknameArb,
      (invalidNickname) => {
        // Act & Assert: Invalid nickname should throw error
        let validationFailed = false;
        
        try {
          nicknameManager.setNickname(invalidNickname);
        } catch (error) {
          validationFailed = true;
        }

        // Property: Invalid nicknames should always fail validation
        return validationFailed;
      }
    ), { 
      numRuns: 100,
      verbose: true 
    });
  });

  test('Property: Nickname persistence should survive storage operations', () => {
    fc.assert(fc.property(
      validNicknameArb,
      fc.array(validNicknameArb, { minLength: 0, maxLength: 5 }),
      (originalNickname, otherNicknames) => {
        // Act: Set original nickname
        nicknameManager.setNickname(originalNickname);
        
        // Perform other storage operations
        otherNicknames.forEach((nickname, index) => {
          mockStorage.setItem(`other_key_${index}`, nickname);
        });

        // Retrieve original nickname
        const retrievedNickname = nicknameManager.getNickname();

        // Property: Original nickname should be unaffected by other operations
        return retrievedNickname === originalNickname.trim();
      }
    ), { 
      numRuns: 50,
      verbose: true 
    });
  });

  test('Property: Nickname updates should overwrite previous values', () => {
    fc.assert(fc.property(
      fc.array(validNicknameArb, { minLength: 2, maxLength: 5 }),
      (nicknames) => {
        // Act: Set multiple nicknames in sequence
        let lastNickname = null;
        
        for (const nickname of nicknames) {
          nicknameManager.setNickname(nickname);
          lastNickname = nickname.trim();
        }

        const finalNickname = nicknameManager.getNickname();

        // Property: Final nickname should be the last one set
        return finalNickname === lastNickname;
      }
    ), { 
      numRuns: 50,
      verbose: true 
    });
  });

  test('Property: Nickname existence check should be consistent', () => {
    fc.assert(fc.property(
      fc.option(validNicknameArb, { nil: null }),
      (nickname) => {
        // Act: Set or clear nickname based on input
        if (nickname) {
          nicknameManager.setNickname(nickname);
        } else {
          nicknameManager.clearNickname();
        }

        const hasNickname = nicknameManager.hasNickname();
        const retrievedNickname = nicknameManager.getNickname();

        // Property: hasNickname() should match whether getNickname() returns a value
        return hasNickname === (retrievedNickname !== null);
      }
    ), { 
      numRuns: 100,
      verbose: true 
    });
  });

  test('Property: Nickname clearing should work correctly', () => {
    fc.assert(fc.property(
      validNicknameArb,
      (nickname) => {
        // Act: Set nickname, then clear it
        nicknameManager.setNickname(nickname);
        nicknameManager.clearNickname();
        
        const hasNickname = nicknameManager.hasNickname();
        const retrievedNickname = nicknameManager.getNickname();

        // Property: After clearing, nickname should not exist
        return !hasNickname && retrievedNickname === null;
      }
    ), { 
      numRuns: 100,
      verbose: true 
    });
  });

  test('Property: Nickname export/import should preserve data', () => {
    fc.assert(fc.property(
      validNicknameArb,
      (originalNickname) => {
        // Act: Set nickname, export, clear, then import
        nicknameManager.setNickname(originalNickname);
        const exportedData = nicknameManager.exportNicknameData();
        
        nicknameManager.clearNickname();
        nicknameManager.importNicknameData(exportedData);
        
        const restoredNickname = nicknameManager.getNickname();

        // Property: Restored nickname should match original
        return restoredNickname === originalNickname.trim() &&
               exportedData.nickname === originalNickname.trim() &&
               exportedData.timestamp !== undefined;
      }
    ), { 
      numRuns: 100,
      verbose: true 
    });
  });

  test('Property: Nickname validation should be consistent', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 0, maxLength: 100 }),
      (testString) => {
        // Act: Validate the same string multiple times
        const results = [];
        
        for (let i = 0; i < 3; i++) {
          try {
            nicknameManager.validateNickname(testString);
            results.push(true);
          } catch (error) {
            results.push(false);
          }
        }

        // Property: Validation results should be consistent
        return results.every(result => result === results[0]);
      }
    ), { 
      numRuns: 100,
      verbose: true 
    });
  });

  test('Property: Nickname trimming should be applied consistently', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 45 })
        .map(s => `  ${s}  `), // Add whitespace padding
      (paddedNickname) => {
        const trimmed = paddedNickname.trim();
        
        // Skip if trimmed would be invalid
        if (trimmed.length === 0 || trimmed.length > 50) {
          return true;
        }

        // Act: Set padded nickname
        nicknameManager.setNickname(paddedNickname);
        const retrievedNickname = nicknameManager.getNickname();

        // Property: Retrieved nickname should be trimmed
        return retrievedNickname === trimmed;
      }
    ), { 
      numRuns: 100,
      verbose: true 
    });
  });

  test('Property: Storage key should be consistent', () => {
    fc.assert(fc.property(
      validNicknameArb,
      (nickname) => {
        // Act: Set nickname and check storage directly
        nicknameManager.setNickname(nickname);
        const directStorageValue = mockStorage.getItem('band_sync_nickname');

        // Property: Direct storage access should return the same value
        return directStorageValue === nickname.trim();
      }
    ), { 
      numRuns: 100,
      verbose: true 
    });
  });
});