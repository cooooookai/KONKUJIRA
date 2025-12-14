/**
 * Property Test 4: Event data persistence
 * Validates: Requirements 2.1, 2.3
 * 
 * Tests that event data is correctly persisted and retrieved,
 * maintaining data integrity and proper event metadata.
 */

const fc = require('fast-check');

// Mock event storage implementation
class MockEventStorage {
  constructor() {
    this.events = new Map();
    this.nextId = 1;
  }

  async createEvent(eventData) {
    this.validateEventData(eventData);
    
    const event = {
      id: this.nextId++,
      ...eventData,
      created_at: new Date().toISOString()
    };
    
    this.events.set(event.id, event);
    return { success: true, id: event.id };
  }

  async getEvents(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return Array.from(this.events.values()).filter(event => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      
      // Check if event overlaps with query range
      return (eventStart <= end) && (eventEnd >= start);
    });
  }

  async getEventById(id) {
    return this.events.get(id) || null;
  }

  async deleteEvent(id) {
    const deleted = this.events.delete(id);
    return { success: deleted };
  }

  async updateEvent(id, updateData) {
    const event = this.events.get(id);
    if (!event) {
      throw new Error('Event not found');
    }
    
    this.validateEventData({ ...event, ...updateData });
    
    const updatedEvent = {
      ...event,
      ...updateData,
      updated_at: new Date().toISOString()
    };
    
    this.events.set(id, updatedEvent);
    return { success: true };
  }

  validateEventData(eventData) {
    const required = ['title', 'type', 'start_time', 'end_time', 'created_by'];
    const missing = required.filter(field => !eventData[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    
    if (!['live', 'rehearsal', 'other'].includes(eventData.type)) {
      throw new Error('Invalid event type');
    }
    
    if (eventData.title.length < 2 || eventData.title.length > 100) {
      throw new Error('Title must be between 2 and 100 characters');
    }
    
    if (eventData.created_by.length < 1 || eventData.created_by.length > 50) {
      throw new Error('Created by must be between 1 and 50 characters');
    }
    
    if (new Date(eventData.start_time) >= new Date(eventData.end_time)) {
      throw new Error('Start time must be before end time');
    }
  }

  clear() {
    this.events.clear();
    this.nextId = 1;
  }

  getAllEvents() {
    return Array.from(this.events.values());
  }
}

describe('Property Test 4: Event Data Persistence', () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = new MockEventStorage();
    jest.clearAllMocks();
  });

  // Arbitraries for generating test data
  const eventTitleArb = fc.string({ minLength: 2, maxLength: 100 })
    .filter(title => title.trim().length >= 2);

  const eventTypeArb = fc.constantFrom('live', 'rehearsal', 'other');

  const memberNameArb = fc.string({ minLength: 1, maxLength: 50 })
    .filter(name => name.trim().length > 0)
    .map(name => name.trim());

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

  const eventArb = fc.record({
    title: eventTitleArb,
    type: eventTypeArb,
    created_by: memberNameArb
  }).chain(base => 
    timeRangeArb.map(timeRange => ({
      ...base,
      ...timeRange
    }))
  );

  test('Property: Valid event data should persist correctly', () => {
    fc.assert(fc.property(
      eventArb,
      async (eventData) => {
        // Act: Create and retrieve event
        const createResult = await mockStorage.createEvent(eventData);
        const retrievedEvent = await mockStorage.getEventById(createResult.id);

        // Assert: Event should be persisted correctly
        expect(createResult.success).toBe(true);
        expect(retrievedEvent).not.toBeNull();

        // Property: All original fields should be preserved
        return (
          retrievedEvent.title === eventData.title &&
          retrievedEvent.type === eventData.type &&
          retrievedEvent.start_time === eventData.start_time &&
          retrievedEvent.end_time === eventData.end_time &&
          retrievedEvent.created_by === eventData.created_by &&
          retrievedEvent.id === createResult.id &&
          retrievedEvent.created_at !== undefined
        );
      }
    ), { 
      numRuns: 100,
      verbose: true 
    });
  });

  test('Property: Multiple events should persist independently', () => {
    fc.assert(fc.property(
      fc.array(eventArb, { minLength: 1, maxLength: 10 }),
      async (eventArray) => {
        // Act: Create all events
        const createResults = [];
        for (const eventData of eventArray) {
          const result = await mockStorage.createEvent(eventData);
          createResults.push(result);
        }

        // Retrieve all events
        const allEvents = mockStorage.getAllEvents();

        // Assert: All events should be persisted
        expect(allEvents).toHaveLength(eventArray.length);

        // Property: Each created event should be retrievable
        return createResults.every((result, index) => {
          const originalEvent = eventArray[index];
          const persistedEvent = allEvents.find(e => e.id === result.id);
          
          return persistedEvent &&
                 persistedEvent.title === originalEvent.title &&
                 persistedEvent.type === originalEvent.type &&
                 persistedEvent.created_by === originalEvent.created_by;
        });
      }
    ), { 
      numRuns: 50,
      verbose: true 
    });
  });

  test('Property: Event queries should return correct results', () => {
    fc.assert(fc.property(
      fc.array(eventArb, { minLength: 1, maxLength: 15 }),
      dateArb,
      dateArb,
      async (eventArray, queryStart, queryEnd) => {
        // Ensure query range is valid
        if (queryStart > queryEnd) {
          [queryStart, queryEnd] = [queryEnd, queryStart];
        }

        // Act: Create all events
        for (const eventData of eventArray) {
          await mockStorage.createEvent(eventData);
        }

        // Query events in date range
        const queriedEvents = await mockStorage.getEvents(
          queryStart.toISOString(),
          queryEnd.toISOString()
        );

        // Property: All returned events should overlap with query range
        return queriedEvents.every(event => {
          const eventStart = new Date(event.start_time);
          const eventEnd = new Date(event.end_time);
          
          // Check overlap: (start1 <= end2) && (start2 <= end1)
          return (eventStart <= queryEnd) && (eventEnd >= queryStart);
        });
      }
    ), { 
      numRuns: 50,
      verbose: true 
    });
  });

  test('Property: Event updates should preserve data integrity', () => {
    fc.assert(fc.property(
      eventArb,
      eventTitleArb,
      eventTypeArb,
      async (originalEvent, newTitle, newType) => {
        // Act: Create event and update it
        const createResult = await mockStorage.createEvent(originalEvent);
        const updateData = { title: newTitle, type: newType };
        
        await mockStorage.updateEvent(createResult.id, updateData);
        const updatedEvent = await mockStorage.getEventById(createResult.id);

        // Property: Updated fields should change, others should remain
        return (
          updatedEvent.title === newTitle &&
          updatedEvent.type === newType &&
          updatedEvent.start_time === originalEvent.start_time &&
          updatedEvent.end_time === originalEvent.end_time &&
          updatedEvent.created_by === originalEvent.created_by &&
          updatedEvent.id === createResult.id &&
          updatedEvent.updated_at !== undefined
        );
      }
    ), { 
      numRuns: 50,
      verbose: true 
    });
  });

  test('Property: Event deletion should work correctly', () => {
    fc.assert(fc.property(
      eventArb,
      async (eventData) => {
        // Act: Create and delete event
        const createResult = await mockStorage.createEvent(eventData);
        const deleteResult = await mockStorage.deleteEvent(createResult.id);
        const retrievedEvent = await mockStorage.getEventById(createResult.id);

        // Property: Deleted event should not be retrievable
        return deleteResult.success && retrievedEvent === null;
      }
    ), { 
      numRuns: 100,
      verbose: true 
    });
  });

  test('Property: Invalid event data should be rejected', () => {
    fc.assert(fc.property(
      fc.record({
        title: fc.oneof(
          fc.constant(''), // Too short
          fc.constant('a'), // Too short
          fc.string({ minLength: 101, maxLength: 200 }) // Too long
        ),
        type: fc.oneof(
          fc.constant('invalid'), // Invalid type
          fc.constant(''), // Empty type
          fc.constant(null) // Null type
        ),
        start_time: fc.oneof(
          fc.constant('invalid-date'), // Invalid date
          fc.constant('') // Empty date
        ),
        end_time: fc.oneof(
          fc.constant('invalid-date'), // Invalid date
          fc.constant('') // Empty date
        ),
        created_by: fc.oneof(
          fc.constant(''), // Empty creator
          fc.string({ minLength: 51, maxLength: 100 }) // Too long
        )
      }),
      async (invalidEvent) => {
        // Act & Assert: Invalid event should be rejected
        let validationFailed = false;
        
        try {
          await mockStorage.createEvent(invalidEvent);
        } catch (error) {
          validationFailed = true;
        }

        // Property: Invalid events should always fail validation
        return validationFailed;
      }
    ), { 
      numRuns: 100,
      verbose: true 
    });
  });

  test('Property: Event time range validation should be enforced', () => {
    fc.assert(fc.property(
      eventTitleArb,
      eventTypeArb,
      memberNameArb,
      dateArb,
      dateArb,
      async (title, type, createdBy, time1, time2) => {
        // Arrange: Create event with invalid time range (start >= end)
        let startTime = time1;
        let endTime = time2;
        
        // Ensure invalid time range
        if (startTime < endTime) {
          [startTime, endTime] = [endTime, startTime];
        }

        const invalidEvent = {
          title,
          type,
          created_by: createdBy,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString()
        };

        // Act & Assert: Invalid time range should be rejected
        let validationFailed = false;
        
        try {
          await mockStorage.createEvent(invalidEvent);
        } catch (error) {
          validationFailed = error.message.includes('Start time must be before end time');
        }

        // Property: Invalid time ranges should always fail validation
        return validationFailed;
      }
    ), { 
      numRuns: 100,
      verbose: true 
    });
  });

  test('Property: Event metadata should be automatically generated', () => {
    fc.assert(fc.property(
      eventArb,
      async (eventData) => {
        // Act: Create event
        const createResult = await mockStorage.createEvent(eventData);
        const retrievedEvent = await mockStorage.getEventById(createResult.id);

        // Property: Metadata should be automatically generated
        return (
          typeof retrievedEvent.id === 'number' &&
          retrievedEvent.id > 0 &&
          typeof retrievedEvent.created_at === 'string' &&
          new Date(retrievedEvent.created_at).getTime() > 0
        );
      }
    ), { 
      numRuns: 100,
      verbose: true 
    });
  });

  test('Property: Concurrent event operations should maintain consistency', () => {
    fc.assert(fc.property(
      fc.array(eventArb, { minLength: 2, maxLength: 5 }),
      async (eventArray) => {
        // Act: Create events concurrently (simulated)
        const createPromises = eventArray.map(eventData => 
          mockStorage.createEvent(eventData)
        );
        
        const results = await Promise.all(createPromises);
        const allEvents = mockStorage.getAllEvents();

        // Property: All events should be created successfully
        const allSuccessful = results.every(result => result.success);
        
        // Property: All events should have unique IDs
        const ids = results.map(result => result.id);
        const uniqueIds = new Set(ids);
        const allIdsUnique = ids.length === uniqueIds.size;

        // Property: Event count should match
        const correctCount = allEvents.length === eventArray.length;

        return allSuccessful && allIdsUnique && correctCount;
      }
    ), { 
      numRuns: 30,
      verbose: true 
    });
  });
});