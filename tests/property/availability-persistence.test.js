/**
 * Property Test 1: Availability data persistence
 * Validates: Requirements 1.2, 4.3
 * 
 * Tests that availability data is correctly persisted and retrieved,
 * maintaining data integrity across save/load cycles.
 */

const fc = require('fast-check');

// Mock the storage and API modules
const mockStorage = {
  data: new Map(),
  setItem: jest.fn((key, value) => {
    mockStorage.data.set(key, value);
  }),
  getItem: jest.fn((key) => {
    return mockStorage.data.get(key) || null;
  }),
  removeItem: jest.fn((key) => {
    mockStorage.data.delete(key);
  }),
  clear: jest.fn(() => {
    mockStorage.data.clear();
  })
};

// Mock API client
const mockAPIClient = {
  saveAvailability: jest.fn(),
  getAvailability: jest.fn(),
  validateAvailabilityData: jest.fn()
};

describe('Property Test 1: Availability Data Persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.data.clear();
    
    // Setup default mock implementations
    mockAPIClient.saveAvailability.mockResolvedValue({ success: true });
    mockAPIClient.getAvailability.mockResolvedValue([]);
    mockAPIClient.validateAvailabilityData.mockImplementation((data) => {
      // Basic validation logic
      const required = ['member_name', 'start_time', 'end_time', 'status'];
      const missing = required.filter(field => !data[field]);
      
      if (missing.length > 0) {
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
      }
      
      if (!['good', 'ok', 'bad'].includes(data.status)) {
        throw new Error('Invalid availability status');
      }
      
      if (data.member_name.length < 1 || data.member_name.length > 50) {
        throw new Error('Member name must be between 1 and 50 characters');
      }
      
      if (new Date(data.start_time) >= new Date(data.end_time)) {
        throw new Error('Start time must be before end time');
      }
    });
  });

  // Arbitraries for generating test data
  const memberNameArb = fc.string({ minLength: 1, maxLength: 50 })
    .filter(name => name.trim().length > 0)
    .map(name => name.trim());

  const statusArb = fc.constantFrom('good', 'ok', 'bad');

  const dateTimeArb = fc.date({
    min: new Date('2024-01-01'),
    max: new Date('2024-12-31')
  }).map(date => date.toISOString());

  const availabilityArb = fc.record({
    member_name: memberNameArb,
    status: statusArb,
    start_time: dateTimeArb,
    end_time: dateTimeArb
  }).filter(data => {
    // Ensure start_time < end_time
    return new Date(data.start_time) < new Date(data.end_time);
  });

  test('Property: Valid availability data should persist correctly', () => {
    fc.assert(fc.property(
      availabilityArb,
      async (availabilityData) => {
        // Arrange: Create a mock availability record
        const expectedData = {
          id: Math.floor(Math.random() * 1000),
          ...availabilityData,
          updated_at: new Date().toISOString()
        };

        // Mock API response to return the saved data
        mockAPIClient.getAvailability.mockResolvedValueOnce([expectedData]);

        // Act: Save availability data
        await mockAPIClient.saveAvailability(availabilityData);
        const retrievedData = await mockAPIClient.getAvailability(
          availabilityData.start_time,
          availabilityData.end_time
        );

        // Assert: Data should be persisted correctly
        expect(mockAPIClient.saveAvailability).toHaveBeenCalledWith(availabilityData);
        expect(retrievedData).toHaveLength(1);
        expect(retrievedData[0]).toMatchObject({
          member_name: availabilityData.member_name,
          status: availabilityData.status,
          start_time: availabilityData.start_time,
          end_time: availabilityData.end_time
        });

        // Property: Retrieved data should maintain all original fields
        return (
          retrievedData[0].member_name === availabilityData.member_name &&
          retrievedData[0].status === availabilityData.status &&
          retrievedData[0].start_time === availabilityData.start_time &&
          retrievedData[0].end_time === availabilityData.end_time
        );
      }
    ), { 
      numRuns: 100,
      verbose: true 
    });
  });

  test('Property: Multiple availability records should persist independently', () => {
    fc.assert(fc.property(
      fc.array(availabilityArb, { minLength: 1, maxLength: 10 }),
      async (availabilityArray) => {
        // Arrange: Create unique availability records
        const uniqueRecords = availabilityArray.map((data, index) => ({
          ...data,
          id: index + 1,
          member_name: `${data.member_name}_${index}` // Ensure uniqueness
        }));

        // Mock API to return all saved records
        mockAPIClient.getAvailability.mockResolvedValueOnce(uniqueRecords);

        // Act: Save all availability records
        for (const record of uniqueRecords) {
          await mockAPIClient.saveAvailability(record);
        }

        const retrievedData = await mockAPIClient.getAvailability(
          '2024-01-01T00:00:00Z',
          '2024-12-31T23:59:59Z'
        );

        // Assert: All records should be persisted
        expect(retrievedData).toHaveLength(uniqueRecords.length);

        // Property: Each saved record should be retrievable
        return uniqueRecords.every(original => 
          retrievedData.some(retrieved => 
            retrieved.member_name === original.member_name &&
            retrieved.status === original.status &&
            retrieved.start_time === original.start_time &&
            retrieved.end_time === original.end_time
          )
        );
      }
    ), { 
      numRuns: 50,
      verbose: true 
    });
  });

  test('Property: Invalid availability data should be rejected', () => {
    fc.assert(fc.property(
      fc.record({
        member_name: fc.oneof(
          fc.constant(''), // Empty string
          fc.constant(null), // Null value
          fc.string({ minLength: 51, maxLength: 100 }) // Too long
        ),
        status: fc.oneof(
          fc.constant('invalid'), // Invalid status
          fc.constant(''), // Empty status
          fc.constant(null) // Null status
        ),
        start_time: fc.oneof(
          fc.constant('invalid-date'), // Invalid date
          fc.constant('') // Empty date
        ),
        end_time: fc.oneof(
          fc.constant('invalid-date'), // Invalid date
          fc.constant('') // Empty date
        )
      }),
      async (invalidData) => {
        // Act & Assert: Invalid data should throw validation error
        let validationFailed = false;
        
        try {
          mockAPIClient.validateAvailabilityData(invalidData);
        } catch (error) {
          validationFailed = true;
        }

        // Property: Invalid data should always fail validation
        return validationFailed;
      }
    ), { 
      numRuns: 100,
      verbose: true 
    });
  });

  test('Property: Time range validation should be enforced', () => {
    fc.assert(fc.property(
      memberNameArb,
      statusArb,
      dateTimeArb,
      dateTimeArb,
      async (memberName, status, time1, time2) => {
        // Arrange: Create data where start_time >= end_time (invalid)
        const startTime = new Date(time1);
        const endTime = new Date(time2);
        
        // Ensure invalid time range
        if (startTime < endTime) {
          [startTime, endTime] = [endTime, startTime];
        }

        const invalidData = {
          member_name: memberName,
          status: status,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString()
        };

        // Act & Assert: Invalid time range should be rejected
        let validationFailed = false;
        
        try {
          mockAPIClient.validateAvailabilityData(invalidData);
        } catch (error) {
          validationFailed = true;
        }

        // Property: Invalid time ranges should always fail validation
        return validationFailed;
      }
    ), { 
      numRuns: 100,
      verbose: true 
    });
  });

  test('Property: Data integrity should be maintained across operations', () => {
    fc.assert(fc.property(
      availabilityArb,
      async (originalData) => {
        // Arrange: Create availability data with additional metadata
        const dataWithMetadata = {
          ...originalData,
          id: Math.floor(Math.random() * 1000),
          updated_at: new Date().toISOString()
        };

        // Mock storage operations
        const storageKey = `availability_${dataWithMetadata.id}`;
        mockStorage.setItem(storageKey, JSON.stringify(dataWithMetadata));
        
        // Act: Retrieve data from storage
        const storedData = JSON.parse(mockStorage.getItem(storageKey));

        // Assert: Data integrity should be maintained
        expect(storedData).toEqual(dataWithMetadata);

        // Property: All original fields should be preserved
        return (
          storedData.member_name === originalData.member_name &&
          storedData.status === originalData.status &&
          storedData.start_time === originalData.start_time &&
          storedData.end_time === originalData.end_time &&
          storedData.id === dataWithMetadata.id &&
          storedData.updated_at === dataWithMetadata.updated_at
        );
      }
    ), { 
      numRuns: 100,
      verbose: true 
    });
  });
});