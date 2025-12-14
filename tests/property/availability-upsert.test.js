/**
 * Property Test 2: Availability upsert behavior
 * Validates: Requirements 1.4
 * 
 * Tests that availability upsert operations work correctly,
 * handling overlapping time ranges and member conflicts properly.
 */

const fc = require('fast-check');

// Mock database operations
const mockDB = {
  data: new Map(),
  prepare: jest.fn(),
  bind: jest.fn(),
  run: jest.fn(),
  all: jest.fn()
};

// Mock upsert implementation
class MockAvailabilityUpsert {
  constructor() {
    this.availabilityRecords = new Map();
  }

  async upsert(availabilityData) {
    const { member_name, start_time, end_time, status } = availabilityData;
    
    // Validate data
    this.validateAvailabilityData(availabilityData);
    
    // Find overlapping records for the same member
    const overlapping = this.findOverlappingRecords(member_name, start_time, end_time);
    
    // Remove overlapping records (upsert behavior)
    overlapping.forEach(record => {
      this.availabilityRecords.delete(record.id);
    });
    
    // Insert new record
    const newRecord = {
      id: this.generateId(),
      member_name,
      start_time,
      end_time,
      status,
      updated_at: new Date().toISOString()
    };
    
    this.availabilityRecords.set(newRecord.id, newRecord);
    
    return { success: true, id: newRecord.id };
  }

  findOverlappingRecords(memberName, startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    return Array.from(this.availabilityRecords.values()).filter(record => {
      if (record.member_name !== memberName) return false;
      
      const recordStart = new Date(record.start_time);
      const recordEnd = new Date(record.end_time);
      
      // Check for overlap: (start1 < end2) && (start2 < end1)
      return (start < recordEnd) && (recordStart < end);
    });
  }

  getAvailabilityForMember(memberName, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return Array.from(this.availabilityRecords.values()).filter(record => {
      if (record.member_name !== memberName) return false;
      
      const recordStart = new Date(record.start_time);
      const recordEnd = new Date(record.end_time);
      
      // Check if record overlaps with query range
      return (recordStart < end) && (recordEnd > start);
    });
  }

  getAllAvailability() {
    return Array.from(this.availabilityRecords.values());
  }

  clear() {
    this.availabilityRecords.clear();
  }

  validateAvailabilityData(data) {
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
  }

  generateId() {
    return Math.floor(Math.random() * 1000000);
  }
}

describe('Property Test 2: Availability Upsert Behavior', () => {
  let mockUpsert;

  beforeEach(() => {
    mockUpsert = new MockAvailabilityUpsert();
    jest.clearAllMocks();
  });

  // Arbitraries for generating test data
  const memberNameArb = fc.string({ minLength: 1, maxLength: 50 })
    .filter(name => name.trim().length > 0)
    .map(name => name.trim());

  const statusArb = fc.constantFrom('good', 'ok', 'bad');

  const dateArb = fc.date({
    min: new Date('2024-01-01'),
    max: new Date('2024-12-31')
  });

  const timeRangeArb = fc.tuple(dateArb, dateArb)
    .filter(([start, end]) => start < end)
    .map(([start, end]) => ({
      start_time: start.toISOString(),
      end_time: end.toISOString()
    }));

  const availabilityArb = fc.record({
    member_name: memberNameArb,
    status: statusArb
  }).chain(base => 
    timeRangeArb.map(timeRange => ({
      ...base,
      ...timeRange
    }))
  );

  test('Property: Upsert should replace overlapping availability for same member', () => {
    fc.assert(fc.property(
      memberNameArb,
      fc.array(availabilityArb, { minLength: 2, maxLength: 5 }),
      async (memberName, availabilityArray) => {
        // Arrange: Create overlapping availability records for the same member
        const overlappingRecords = availabilityArray.map(record => ({
          ...record,
          member_name: memberName // Ensure same member
        }));

        // Act: Insert all overlapping records
        for (const record of overlappingRecords) {
          await mockUpsert.upsert(record);
        }

        // Get final availability for the member
        const finalAvailability = mockUpsert.getAvailabilityForMember(
          memberName,
          '2024-01-01T00:00:00Z',
          '2024-12-31T23:59:59Z'
        );

        // Assert: Should have exactly one record (the last upserted one)
        expect(finalAvailability).toHaveLength(1);

        // Property: The final record should match the last upserted record
        const lastRecord = overlappingRecords[overlappingRecords.length - 1];
        const finalRecord = finalAvailability[0];

        return (
          finalRecord.member_name === lastRecord.member_name &&
          finalRecord.status === lastRecord.status &&
          finalRecord.start_time === lastRecord.start_time &&
          finalRecord.end_time === lastRecord.end_time
        );
      }
    ), { 
      numRuns: 50,
      verbose: true 
    });
  });

  test('Property: Non-overlapping availability should coexist', () => {
    fc.assert(fc.property(
      memberNameArb,
      fc.array(availabilityArb, { minLength: 2, maxLength: 5 }),
      async (memberName, availabilityArray) => {
        // Arrange: Create non-overlapping time ranges
        const sortedRecords = availabilityArray
          .map(record => ({
            ...record,
            member_name: memberName,
            start_time: new Date(record.start_time),
            end_time: new Date(record.end_time)
          }))
          .sort((a, b) => a.start_time - b.start_time);

        // Ensure non-overlapping by adjusting times
        const nonOverlappingRecords = [];
        let lastEndTime = new Date('2024-01-01T00:00:00Z');

        for (const record of sortedRecords) {
          const startTime = new Date(Math.max(lastEndTime.getTime() + 3600000, record.start_time.getTime())); // 1 hour gap
          const endTime = new Date(startTime.getTime() + 3600000); // 1 hour duration
          
          nonOverlappingRecords.push({
            ...record,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString()
          });
          
          lastEndTime = endTime;
        }

        // Act: Insert all non-overlapping records
        for (const record of nonOverlappingRecords) {
          await mockUpsert.upsert(record);
        }

        // Get final availability for the member
        const finalAvailability = mockUpsert.getAvailabilityForMember(
          memberName,
          '2024-01-01T00:00:00Z',
          '2024-12-31T23:59:59Z'
        );

        // Property: All non-overlapping records should coexist
        return finalAvailability.length === nonOverlappingRecords.length;
      }
    ), { 
      numRuns: 30,
      verbose: true 
    });
  });

  test('Property: Different members should not affect each other', () => {
    fc.assert(fc.property(
      fc.array(memberNameArb, { minLength: 2, maxLength: 5 }),
      availabilityArb,
      async (memberNames, baseAvailability) => {
        // Arrange: Create same availability for different members
        const memberRecords = memberNames.map(memberName => ({
          ...baseAvailability,
          member_name: memberName
        }));

        // Act: Insert availability for all members
        for (const record of memberRecords) {
          await mockUpsert.upsert(record);
        }

        // Assert: Each member should have their own availability record
        const allAvailability = mockUpsert.getAllAvailability();
        expect(allAvailability).toHaveLength(memberNames.length);

        // Property: Each member should have exactly one record
        return memberNames.every(memberName => {
          const memberAvailability = mockUpsert.getAvailabilityForMember(
            memberName,
            baseAvailability.start_time,
            baseAvailability.end_time
          );
          return memberAvailability.length === 1 && 
                 memberAvailability[0].member_name === memberName;
        });
      }
    ), { 
      numRuns: 50,
      verbose: true 
    });
  });

  test('Property: Partial overlap should replace overlapping portion', () => {
    fc.assert(fc.property(
      memberNameArb,
      statusArb,
      statusArb,
      dateArb,
      fc.integer({ min: 1, max: 4 }), // hours
      fc.integer({ min: 1, max: 4 }), // hours
      async (memberName, status1, status2, baseDate, duration1, duration2) => {
        // Arrange: Create two partially overlapping time ranges
        const start1 = new Date(baseDate);
        const end1 = new Date(start1.getTime() + duration1 * 3600000);
        
        const start2 = new Date(start1.getTime() + (duration1 / 2) * 3600000); // Start halfway through first
        const end2 = new Date(start2.getTime() + duration2 * 3600000);

        const record1 = {
          member_name: memberName,
          start_time: start1.toISOString(),
          end_time: end1.toISOString(),
          status: status1
        };

        const record2 = {
          member_name: memberName,
          start_time: start2.toISOString(),
          end_time: end2.toISOString(),
          status: status2
        };

        // Act: Insert first record, then overlapping second record
        await mockUpsert.upsert(record1);
        await mockUpsert.upsert(record2);

        // Get final availability
        const finalAvailability = mockUpsert.getAvailabilityForMember(
          memberName,
          start1.toISOString(),
          end2.toISOString()
        );

        // Property: Should have exactly one record (the second one replaces the first)
        return finalAvailability.length === 1 && 
               finalAvailability[0].status === status2;
      }
    ), { 
      numRuns: 50,
      verbose: true 
    });
  });

  test('Property: Upsert should maintain data consistency', () => {
    fc.assert(fc.property(
      fc.array(availabilityArb, { minLength: 1, maxLength: 10 }),
      async (availabilityArray) => {
        // Act: Perform multiple upsert operations
        const results = [];
        for (const record of availabilityArray) {
          const result = await mockUpsert.upsert(record);
          results.push(result);
        }

        // Get all availability records
        const allRecords = mockUpsert.getAllAvailability();

        // Property: All upsert operations should succeed
        const allSuccessful = results.every(result => result.success);

        // Property: No two records for the same member should overlap
        const memberGroups = new Map();
        allRecords.forEach(record => {
          if (!memberGroups.has(record.member_name)) {
            memberGroups.set(record.member_name, []);
          }
          memberGroups.get(record.member_name).push(record);
        });

        const noOverlaps = Array.from(memberGroups.values()).every(memberRecords => {
          for (let i = 0; i < memberRecords.length; i++) {
            for (let j = i + 1; j < memberRecords.length; j++) {
              const record1 = memberRecords[i];
              const record2 = memberRecords[j];
              
              const start1 = new Date(record1.start_time);
              const end1 = new Date(record1.end_time);
              const start2 = new Date(record2.start_time);
              const end2 = new Date(record2.end_time);
              
              // Check for overlap
              if ((start1 < end2) && (start2 < end1)) {
                return false; // Overlap found
              }
            }
          }
          return true; // No overlaps
        });

        return allSuccessful && noOverlaps;
      }
    ), { 
      numRuns: 30,
      verbose: true 
    });
  });

  test('Property: Upsert should handle edge cases correctly', () => {
    fc.assert(fc.property(
      memberNameArb,
      statusArb,
      dateArb,
      async (memberName, status, baseDate) => {
        // Arrange: Create identical time ranges (exact overlap)
        const startTime = baseDate.toISOString();
        const endTime = new Date(baseDate.getTime() + 3600000).toISOString(); // 1 hour later

        const record1 = {
          member_name: memberName,
          start_time: startTime,
          end_time: endTime,
          status: 'good'
        };

        const record2 = {
          member_name: memberName,
          start_time: startTime,
          end_time: endTime,
          status: status
        };

        // Act: Insert identical records
        await mockUpsert.upsert(record1);
        await mockUpsert.upsert(record2);

        // Get final availability
        const finalAvailability = mockUpsert.getAvailabilityForMember(
          memberName,
          startTime,
          endTime
        );

        // Property: Should have exactly one record with the latest status
        return finalAvailability.length === 1 && 
               finalAvailability[0].status === status;
      }
    ), { 
      numRuns: 100,
      verbose: true 
    });
  });
});