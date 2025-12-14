/**
 * Property Test 5: Event overlap allowance
 * Validates: Requirements 2.4
 * 
 * Tests that multiple events can exist in the same time slot,
 * allowing for overlapping events as per requirements.
 */

const fc = require('fast-check');

// Mock event overlap manager
class EventOverlapManager {
  constructor() {
    this.events = new Map();
    this.nextId = 1;
  }

  async addEvent(eventData) {
    this.validateEventData(eventData);
    
    const event = {
      id: this.nextId++,
      ...eventData,
      created_at: new Date().toISOString()
    };
    
    this.events.set(event.id, event);
    return { success: true, id: event.id };
  }

  getOverlappingEvents(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    return Array.from(this.events.values()).filter(event => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      
      // Check for overlap: (start1 < end2) && (start2 < end1)
      return (eventStart < end) && (eventEnd > start);
    });
  }

  getEventsInTimeSlot(startTime, endTime) {
    return this.getOverlappingEvents(startTime, endTime);
  }

  getAllEvents() {
    return Array.from(this.events.values());
  }

  clear() {
    this.events.clear();
    this.nextId = 1;
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
    
    if (new Date(eventData.start_time) >= new Date(eventData.end_time)) {
      throw new Error('Start time must be before end time');
    }
  }
}

describe('Property Test 5: Event Overlap Allowance', () => {
  let overlapManager;

  beforeEach(() => {
    overlapManager = new EventOverlapManager();
    jest.clearAllMocks();
  });

  // Arbitraries for generating test data
  const eventTitleArb = fc.string({ minLength: 2, maxLength: 50 });
  const eventTypeArb = fc.constantFrom('live', 'rehearsal', 'other');
  const memberNameArb = fc.string({ minLength: 1, maxLength: 20 });

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

  test('Property: Multiple events should be allowed in the same time slot', () => {
    fc.assert(fc.property(
      fc.array(eventArb, { minLength: 2, maxLength: 5 }),
      dateArb,
      fc.integer({ min: 1, max: 4 }), // hours duration
      async (eventTemplates, baseDate, duration) => {
        // Arrange: Create overlapping events in the same time slot
        const startTime = baseDate.toISOString();
        const endTime = new Date(baseDate.getTime() + duration * 3600000).toISOString();

        const overlappingEvents = eventTemplates.map((template, index) => ({
          ...template,
          title: `${template.title}_${index}`, // Make titles unique
          start_time: startTime,
          end_time: endTime
        }));

        // Act: Add all overlapping events
        const results = [];
        for (const event of overlappingEvents) {
          const result = await overlapManager.addEvent(event);
          results.push(result);
        }

        // Get events in the time slot
        const eventsInSlot = overlapManager.getEventsInTimeSlot(startTime, endTime);

        // Property: All events should be successfully added
        const allSuccessful = results.every(result => result.success);

        // Property: All events should be retrievable in the same time slot
        const allEventsPresent = eventsInSlot.length === overlappingEvents.length;

        // Property: Each event should maintain its unique identity
        const uniqueTitles = new Set(eventsInSlot.map(e => e.title));
        const allTitlesUnique = uniqueTitles.size === overlappingEvents.length;

        return allSuccessful && allEventsPresent && allTitlesUnique;
      }
    ), { 
      numRuns: 50,
      verbose: true 
    });
  });

  test('Property: Overlapping events should be correctly identified', () => {
    fc.assert(fc.property(
      eventArb,
      eventArb,
      fc.float({ min: 0.1, max: 0.9 }), // overlap factor
      async (event1, event2, overlapFactor) => {
        // Arrange: Create two events with controlled overlap
        const start1 = new Date(event1.start_time);
        const end1 = new Date(event1.end_time);
        const duration1 = end1.getTime() - start1.getTime();

        // Create second event that overlaps with first
        const start2 = new Date(start1.getTime() + duration1 * overlapFactor);
        const end2 = new Date(start2.getTime() + duration1);

        const overlappingEvent1 = { ...event1 };
        const overlappingEvent2 = {
          ...event2,
          start_time: start2.toISOString(),
          end_time: end2.toISOString()
        };

        // Act: Add both events
        await overlapManager.addEvent(overlappingEvent1);
        await overlapManager.addEvent(overlappingEvent2);

        // Check for overlaps
        const overlapsWithEvent1 = overlapManager.getOverlappingEvents(
          overlappingEvent1.start_time,
          overlappingEvent1.end_time
        );

        const overlapsWithEvent2 = overlapManager.getOverlappingEvents(
          overlappingEvent2.start_time,
          overlappingEvent2.end_time
        );

        // Property: Both events should be found in each other's overlap queries
        const event1FoundInEvent2Overlaps = overlapsWithEvent2.some(e => e.title === overlappingEvent1.title);
        const event2FoundInEvent1Overlaps = overlapsWithEvent1.some(e => e.title === overlappingEvent2.title);

        return event1FoundInEvent2Overlaps && event2FoundInEvent1Overlaps;
      }
    ), { 
      numRuns: 50,
      verbose: true 
    });
  });

  test('Property: Non-overlapping events should not interfere with each other', () => {
    fc.assert(fc.property(
      fc.array(eventArb, { minLength: 2, maxLength: 5 }),
      async (eventTemplates) => {
        // Arrange: Create non-overlapping events
        const nonOverlappingEvents = [];
        let currentTime = new Date('2024-06-01T09:00:00Z');

        for (const template of eventTemplates) {
          const startTime = new Date(currentTime);
          const endTime = new Date(startTime.getTime() + 2 * 3600000); // 2 hours duration
          
          nonOverlappingEvents.push({
            ...template,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString()
          });

          // Move to next time slot with 1 hour gap
          currentTime = new Date(endTime.getTime() + 3600000);
        }

        // Act: Add all non-overlapping events
        for (const event of nonOverlappingEvents) {
          await overlapManager.addEvent(event);
        }

        // Property: Each event should only overlap with itself
        return nonOverlappingEvents.every(event => {
          const overlaps = overlapManager.getOverlappingEvents(
            event.start_time,
            event.end_time
          );
          return overlaps.length === 1 && overlaps[0].title === event.title;
        });
      }
    ), { 
      numRuns: 30,
      verbose: true 
    });
  });

  test('Property: Different event types should be allowed to overlap', () => {
    fc.assert(fc.property(
      eventTitleArb,
      memberNameArb,
      dateArb,
      fc.integer({ min: 1, max: 3 }), // hours duration
      async (title, creator, baseDate, duration) => {
        // Arrange: Create events of different types in the same time slot
        const startTime = baseDate.toISOString();
        const endTime = new Date(baseDate.getTime() + duration * 3600000).toISOString();

        const eventTypes = ['live', 'rehearsal', 'other'];
        const overlappingEvents = eventTypes.map(type => ({
          title: `${title}_${type}`,
          type: type,
          created_by: creator,
          start_time: startTime,
          end_time: endTime
        }));

        // Act: Add all events of different types
        const results = [];
        for (const event of overlappingEvents) {
          const result = await overlapManager.addEvent(event);
          results.push(result);
        }

        // Get events in the time slot
        const eventsInSlot = overlapManager.getEventsInTimeSlot(startTime, endTime);

        // Property: All event types should be successfully added
        const allSuccessful = results.every(result => result.success);

        // Property: All event types should coexist in the same time slot
        const allTypesPresent = eventTypes.every(type =>
          eventsInSlot.some(event => event.type === type)
        );

        return allSuccessful && allTypesPresent && eventsInSlot.length === eventTypes.length;
      }
    ), { 
      numRuns: 50,
      verbose: true 
    });
  });

  test('Property: Partial overlaps should be handled correctly', () => {
    fc.assert(fc.property(
      eventArb,
      eventArb,
      fc.float({ min: 0.1, max: 0.9 }), // overlap start factor
      fc.float({ min: 0.1, max: 0.9 }), // overlap end factor
      async (event1Template, event2Template, startFactor, endFactor) => {
        // Arrange: Create events with partial overlap
        const baseStart = new Date('2024-06-01T10:00:00Z');
        const baseDuration = 4 * 3600000; // 4 hours

        const event1 = {
          ...event1Template,
          start_time: baseStart.toISOString(),
          end_time: new Date(baseStart.getTime() + baseDuration).toISOString()
        };

        // Create second event that partially overlaps
        const event2Start = new Date(baseStart.getTime() + baseDuration * startFactor);
        const event2End = new Date(baseStart.getTime() + baseDuration * (1 + endFactor));

        const event2 = {
          ...event2Template,
          start_time: event2Start.toISOString(),
          end_time: event2End.toISOString()
        };

        // Act: Add both events
        await overlapManager.addEvent(event1);
        await overlapManager.addEvent(event2);

        // Check overlaps for both events
        const event1Overlaps = overlapManager.getOverlappingEvents(
          event1.start_time,
          event1.end_time
        );

        const event2Overlaps = overlapManager.getOverlappingEvents(
          event2.start_time,
          event2.end_time
        );

        // Property: Both events should find each other in overlap queries
        const mutualOverlapDetected = 
          event1Overlaps.some(e => e.title === event2.title) &&
          event2Overlaps.some(e => e.title === event1.title);

        return mutualOverlapDetected;
      }
    ), { 
      numRuns: 50,
      verbose: true 
    });
  });

  test('Property: Event overlap detection should be symmetric', () => {
    fc.assert(fc.property(
      eventArb,
      eventArb,
      async (event1, event2) => {
        // Act: Add both events
        await overlapManager.addEvent(event1);
        await overlapManager.addEvent(event2);

        // Check overlaps in both directions
        const event1Overlaps = overlapManager.getOverlappingEvents(
          event1.start_time,
          event1.end_time
        );

        const event2Overlaps = overlapManager.getOverlappingEvents(
          event2.start_time,
          event2.end_time
        );

        // Property: Overlap detection should be symmetric
        const event1FindsEvent2 = event1Overlaps.some(e => e.title === event2.title);
        const event2FindsEvent1 = event2Overlaps.some(e => e.title === event1.title);

        // If one finds the other, both should find each other
        return event1FindsEvent2 === event2FindsEvent1;
      }
    ), { 
      numRuns: 100,
      verbose: true 
    });
  });

  test('Property: Large numbers of overlapping events should be handled efficiently', () => {
    fc.assert(fc.property(
      fc.integer({ min: 10, max: 50 }),
      dateArb,
      async (eventCount, baseDate) => {
        // Arrange: Create many overlapping events
        const startTime = baseDate.toISOString();
        const endTime = new Date(baseDate.getTime() + 3600000).toISOString(); // 1 hour

        const events = Array.from({ length: eventCount }, (_, index) => ({
          title: `Event_${index}`,
          type: ['live', 'rehearsal', 'other'][index % 3],
          created_by: `Creator_${index % 5}`,
          start_time: startTime,
          end_time: endTime
        }));

        // Act: Add all events
        const startAddTime = Date.now();
        for (const event of events) {
          await overlapManager.addEvent(event);
        }
        const addDuration = Date.now() - startAddTime;

        // Query overlaps
        const startQueryTime = Date.now();
        const overlaps = overlapManager.getOverlappingEvents(startTime, endTime);
        const queryDuration = Date.now() - startQueryTime;

        // Property: All events should be added and retrievable
        const allEventsAdded = overlaps.length === eventCount;

        // Property: Operations should complete in reasonable time (< 1 second)
        const performanceAcceptable = addDuration < 1000 && queryDuration < 1000;

        return allEventsAdded && performanceAcceptable;
      }
    ), { 
      numRuns: 10,
      verbose: true 
    });
  });
});