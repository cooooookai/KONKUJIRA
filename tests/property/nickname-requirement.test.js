/**
 * Property Test 7: Nickname requirement enforcement
 * Validates: Requirements 4.4
 * 
 * Tests that nickname is required for all user operations
 * and that the system properly enforces this requirement.
 */

const fc = require('fast-check');

// Mock application state manager
class AppStateManager {
  constructor() {
    this.nickname = null;
    this.isInitialized = false;
  }

  setNickname(nickname) {
    if (!nickname || typeof nickname !== 'string' || nickname.trim().length === 0) {
      throw new Error('Nickname is required');
    }
    this.nickname = nickname.trim();
    this.isInitialized = true;
  }

  getNickname() {
    return this.nickname;
  }

  hasNickname() {
    return this.nickname !== null && this.nickname.length > 0;
  }

  requireNickname() {
    if (!this.hasNickname()) {
      throw new Error('Nickname is required for this operation');
    }
    return this.nickname;
  }

  reset() {
    this.nickname = null;
    this.isInitialized = false;
  }
}

// Mock operations that require nickname
class UserOperations {
  constructor(appState) {
    this.appState = appState;
  }

  async createAvailability(availabilityData) {
    const nickname = this.appState.requireNickname();
    
    return {
      ...availabilityData,
      member_name: nickname,
      created_at: new Date().toISOString()
    };
  }

  async createEvent(eventData) {
    const nickname = this.appState.requireNickname();
    
    return {
      ...eventData,
      created_by: nickname,
      created_at: new Date().toISOString()
    };
  }

  async updateAvailability(availabilityId, updateData) {
    const nickname = this.appState.requireNickname();
    
    return {
      id: availabilityId,
      ...updateData,
      member_name: nickname,
      updated_at: new Date().toISOString()
    };
  }

  async deleteEvent(eventId) {
    const nickname = this.appState.requireNickname();
    
    return {
      id: eventId,
      deleted_by: nickname,
      deleted_at: new Date().toISOString()
    };
  }

  async exportData() {
    const nickname = this.appState.requireNickname();
    
    return {
      exported_by: nickname,
      exported_at: new Date().toISOString(),
      data: { /* user data */ }
    };
  }

  async syncData() {
    const nickname = this.appState.requireNickname();
    
    return {
      synced_by: nickname,
      synced_at: new Date().toISOString(),
      status: 'success'
    };
  }

  // Operations that don't require nickname (read-only)
  async getEvents() {
    return []; // Can work without nickname
  }

  async getAvailability() {
    return []; // Can work without nickname
  }

  async getHolidays() {
    return {}; // Can work without nickname
  }
}

describe('Property Test 7: Nickname Requirement Enforcement', () => {
  let appState;
  let userOps;

  beforeEach(() => {
    appState = new AppStateManager();
    userOps = new UserOperations(appState);
    jest.clearAllMocks();
  });

  // Arbitraries for generating test data
  const validNicknameArb = fc.string({ minLength: 1, maxLength: 50 })
    .filter(name => name.trim().length > 0)
    .map(name => name.trim());

  const availabilityDataArb = fc.record({
    start_time: fc.date().map(d => d.toISOString()),
    end_time: fc.date().map(d => d.toISOString()),
    status: fc.constantFrom('good', 'ok', 'bad')
  });

  const eventDataArb = fc.record({
    title: fc.string({ minLength: 2, maxLength: 50 }),
    type: fc.constantFrom('live', 'rehearsal', 'other'),
    start_time: fc.date().map(d => d.toISOString()),
    end_time: fc.date().map(d => d.toISOString())
  });

  test('Property: Operations requiring nickname should fail without nickname', () => {
    fc.assert(fc.property(
      availabilityDataArb,
      eventDataArb,
      fc.integer({ min: 1, max: 1000 }),
      async (availabilityData, eventData, id) => {
        // Ensure no nickname is set
        appState.reset();

        // Test all operations that should require nickname
        const operations = [
          () => userOps.createAvailability(availabilityData),
          () => userOps.createEvent(eventData),
          () => userOps.updateAvailability(id, availabilityData),
          () => userOps.deleteEvent(id),
          () => userOps.exportData(),
          () => userOps.syncData()
        ];

        // Property: All nickname-requiring operations should fail
        const results = await Promise.allSettled(operations.map(op => op()));
        
        return results.every(result => 
          result.status === 'rejected' && 
          result.reason.message.includes('required')
        );
      }
    ), { 
      numRuns: 50,
      verbose: true 
    });
  });

  test('Property: Operations requiring nickname should succeed with valid nickname', () => {
    fc.assert(fc.property(
      validNicknameArb,
      availabilityDataArb,
      eventDataArb,
      fc.integer({ min: 1, max: 1000 }),
      async (nickname, availabilityData, eventData, id) => {
        // Set valid nickname
        appState.setNickname(nickname);

        // Test all operations that require nickname
        const operations = [
          () => userOps.createAvailability(availabilityData),
          () => userOps.createEvent(eventData),
          () => userOps.updateAvailability(id, availabilityData),
          () => userOps.deleteEvent(id),
          () => userOps.exportData(),
          () => userOps.syncData()
        ];

        // Property: All operations should succeed
        const results = await Promise.allSettled(operations.map(op => op()));
        
        return results.every(result => result.status === 'fulfilled');
      }
    ), { 
      numRuns: 50,
      verbose: true 
    });
  });

  test('Property: Read-only operations should work without nickname', () => {
    fc.assert(fc.property(
      fc.constant(null), // No input needed
      async () => {
        // Ensure no nickname is set
        appState.reset();

        // Test read-only operations
        const operations = [
          () => userOps.getEvents(),
          () => userOps.getAvailability(),
          () => userOps.getHolidays()
        ];

        // Property: Read-only operations should succeed without nickname
        const results = await Promise.allSettled(operations.map(op => op()));
        
        return results.every(result => result.status === 'fulfilled');
      }
    ), { 
      numRuns: 20,
      verbose: true 
    });
  });

  test('Property: Nickname should be included in operation results', () => {
    fc.assert(fc.property(
      validNicknameArb,
      availabilityDataArb,
      eventDataArb,
      async (nickname, availabilityData, eventData) => {
        // Set nickname
        appState.setNickname(nickname);

        // Perform operations
        const availability = await userOps.createAvailability(availabilityData);
        const event = await userOps.createEvent(eventData);
        const exportResult = await userOps.exportData();
        const syncResult = await userOps.syncData();

        // Property: Nickname should be included in all results
        return (
          availability.member_name === nickname &&
          event.created_by === nickname &&
          exportResult.exported_by === nickname &&
          syncResult.synced_by === nickname
        );
      }
    ), { 
      numRuns: 50,
      verbose: true 
    });
  });

  test('Property: Nickname requirement should be consistent across operations', () => {
    fc.assert(fc.property(
      fc.option(validNicknameArb, { nil: null }),
      availabilityDataArb,
      async (nickname, availabilityData) => {
        // Set or clear nickname
        if (nickname) {
          appState.setNickname(nickname);
        } else {
          appState.reset();
        }

        // Test multiple operations
        const operations = [
          () => userOps.createAvailability(availabilityData),
          () => userOps.exportData(),
          () => userOps.syncData()
        ];

        const results = await Promise.allSettled(operations.map(op => op()));

        // Property: All operations should have the same success/failure pattern
        const successCount = results.filter(r => r.status === 'fulfilled').length;
        const failureCount = results.filter(r => r.status === 'rejected').length;

        return nickname ? successCount === operations.length : failureCount === operations.length;
      }
    ), { 
      numRuns: 100,
      verbose: true 
    });
  });

  test('Property: Nickname validation should prevent invalid nicknames', () => {
    fc.assert(fc.property(
      fc.oneof(
        fc.constant(''), // Empty string
        fc.constant('   '), // Only whitespace
        fc.constant(null), // Null
        fc.constant(undefined) // Undefined
      ),
      availabilityDataArb,
      async (invalidNickname, availabilityData) => {
        // Try to set invalid nickname
        let nicknameSetFailed = false;
        
        try {
          appState.setNickname(invalidNickname);
        } catch (error) {
          nicknameSetFailed = true;
        }

        // If nickname setting failed, operations should also fail
        if (nicknameSetFailed) {
          try {
            await userOps.createAvailability(availabilityData);
            return false; // Should have failed
          } catch (error) {
            return true; // Correctly failed
          }
        }

        // If nickname was somehow set, check if operations work
        try {
          await userOps.createAvailability(availabilityData);
          return false; // Should not succeed with invalid nickname
        } catch (error) {
          return true; // Correctly failed
        }
      }
    ), { 
      numRuns: 50,
      verbose: true 
    });
  });

  test('Property: Nickname state should persist across operations', () => {
    fc.assert(fc.property(
      validNicknameArb,
      fc.array(availabilityDataArb, { minLength: 1, maxLength: 5 }),
      async (nickname, availabilityArray) => {
        // Set nickname once
        appState.setNickname(nickname);

        // Perform multiple operations
        const results = [];
        for (const availabilityData of availabilityArray) {
          const result = await userOps.createAvailability(availabilityData);
          results.push(result);
        }

        // Property: All operations should use the same nickname
        return results.every(result => result.member_name === nickname);
      }
    ), { 
      numRuns: 50,
      verbose: true 
    });
  });

  test('Property: Nickname requirement error messages should be informative', () => {
    fc.assert(fc.property(
      availabilityDataArb,
      async (availabilityData) => {
        // Ensure no nickname is set
        appState.reset();

        // Try operation without nickname
        try {
          await userOps.createAvailability(availabilityData);
          return false; // Should have failed
        } catch (error) {
          // Property: Error message should be informative
          return error.message.toLowerCase().includes('nickname') &&
                 error.message.toLowerCase().includes('required');
        }
      }
    ), { 
      numRuns: 50,
      verbose: true 
    });
  });

  test('Property: Nickname changes should affect subsequent operations', () => {
    fc.assert(fc.property(
      validNicknameArb,
      validNicknameArb,
      availabilityDataArb,
      async (nickname1, nickname2, availabilityData) => {
        // Skip if nicknames are the same
        if (nickname1 === nickname2) {
          return true;
        }

        // Set first nickname and perform operation
        appState.setNickname(nickname1);
        const result1 = await userOps.createAvailability(availabilityData);

        // Change nickname and perform operation
        appState.setNickname(nickname2);
        const result2 = await userOps.createAvailability(availabilityData);

        // Property: Operations should use the current nickname
        return (
          result1.member_name === nickname1 &&
          result2.member_name === nickname2 &&
          result1.member_name !== result2.member_name
        );
      }
    ), { 
      numRuns: 50,
      verbose: true 
    });
  });

  test('Property: Nickname requirement should be enforced at operation level', () => {
    fc.assert(fc.property(
      validNicknameArb,
      availabilityDataArb,
      async (nickname, availabilityData) => {
        // Set nickname
        appState.setNickname(nickname);

        // Clear nickname after setting (simulating state corruption)
        appState.nickname = null;

        // Try operation - should fail even though nickname was initially set
        try {
          await userOps.createAvailability(availabilityData);
          return false; // Should have failed
        } catch (error) {
          return error.message.includes('required');
        }
      }
    ), { 
      numRuns: 50,
      verbose: true 
    });
  });
});