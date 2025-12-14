/**
 * Property Test 3: Sync period validation
 * Validates: Requirements 1.5
 * 
 * Tests that the sync period (today to +2 months) is correctly enforced
 * for all date-related operations.
 */

const fc = require('fast-check');

// Mock date utilities
class SyncPeriodValidator {
  constructor(currentDate = new Date()) {
    this.currentDate = currentDate;
  }

  validateSyncPeriod(dateTime) {
    const date = new Date(dateTime);
    const today = new Date(this.currentDate);
    today.setHours(0, 0, 0, 0); // Start of today
    
    const twoMonthsFromNow = new Date(this.currentDate);
    twoMonthsFromNow.setMonth(today.getMonth() + 2);
    twoMonthsFromNow.setHours(23, 59, 59, 999); // End of day
    
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }
    
    if (date < today) {
      throw new Error('Date cannot be in the past');
    }
    
    if (date > twoMonthsFromNow) {
      throw new Error('Date cannot be more than 2 months in the future');
    }
    
    return true;
  }

  getSyncPeriodRange() {
    const today = new Date(this.currentDate);
    today.setHours(0, 0, 0, 0);
    
    const twoMonthsFromNow = new Date(this.currentDate);
    twoMonthsFromNow.setMonth(today.getMonth() + 2);
    twoMonthsFromNow.setHours(23, 59, 59, 999);
    
    return {
      start: today,
      end: twoMonthsFromNow
    };
  }

  isWithinSyncPeriod(dateTime) {
    try {
      this.validateSyncPeriod(dateTime);
      return true;
    } catch (error) {
      return false;
    }
  }

  filterEventsInSyncPeriod(events) {
    return events.filter(event => {
      try {
        this.validateSyncPeriod(event.start_time);
        return true;
      } catch (error) {
        return false;
      }
    });
  }
}

describe('Property Test 3: Sync Period Validation', () => {
  let validator;
  const fixedDate = new Date('2024-06-15T12:00:00Z'); // Fixed date for consistent testing

  beforeEach(() => {
    validator = new SyncPeriodValidator(fixedDate);
    jest.clearAllMocks();
  });

  // Arbitraries for generating test data
  const validDateArb = fc.date({
    min: new Date('2024-06-15T00:00:00Z'), // Today
    max: new Date('2024-08-15T23:59:59Z')  // 2 months from today
  });

  const pastDateArb = fc.date({
    min: new Date('2020-01-01T00:00:00Z'),
    max: new Date('2024-06-14T23:59:59Z') // Before today
  });

  const futureDateArb = fc.date({
    min: new Date('2024-08-16T00:00:00Z'), // More than 2 months from today
    max: new Date('2025-12-31T23:59:59Z')
  });

  const eventArb = fc.record({
    id: fc.integer({ min: 1, max: 1000 }),
    title: fc.string({ minLength: 1, maxLength: 50 }),
    type: fc.constantFrom('live', 'rehearsal', 'other'),
    start_time: fc.date().map(d => d.toISOString()),
    end_time: fc.date().map(d => d.toISOString()),
    created_by: fc.string({ minLength: 1, maxLength: 20 })
  });

  test('Property: Valid dates within sync period should pass validation', () => {
    fc.assert(fc.property(
      validDateArb,
      (validDate) => {
        // Act & Assert: Valid dates should pass validation
        let validationPassed = false;
        
        try {
          validator.validateSyncPeriod(validDate.toISOString());
          validationPassed = true;
        } catch (error) {
          validationPassed = false;
        }

        // Property: All dates within sync period should be valid
        return validationPassed;
      }
    ), { 
      numRuns: 100,
      verbose: true 
    });
  });

  test('Property: Past dates should be rejected', () => {
    fc.assert(fc.property(
      pastDateArb,
      (pastDate) => {
        // Act & Assert: Past dates should fail validation
        let validationFailed = false;
        
        try {
          validator.validateSyncPeriod(pastDate.toISOString());
        } catch (error) {
          validationFailed = error.message.includes('past');
        }

        // Property: All past dates should be rejected
        return validationFailed;
      }
    ), { 
      numRuns: 100,
      verbose: true 
    });
  });

  test('Property: Far future dates should be rejected', () => {
    fc.assert(fc.property(
      futureDateArb,
      (futureDate) => {
        // Act & Assert: Far future dates should fail validation
        let validationFailed = false;
        
        try {
          validator.validateSyncPeriod(futureDate.toISOString());
        } catch (error) {
          validationFailed = error.message.includes('2 months');
        }

        // Property: All dates beyond 2 months should be rejected
        return validationFailed;
      }
    ), { 
      numRuns: 100,
      verbose: true 
    });
  });

  test('Property: Sync period range should be consistent', () => {
    fc.assert(fc.property(
      fc.constant(null), // No input needed
      () => {
        // Act: Get sync period range
        const range = validator.getSyncPeriodRange();

        // Assert: Range should be valid
        expect(range.start).toBeInstanceOf(Date);
        expect(range.end).toBeInstanceOf(Date);
        expect(range.start).toBeLessThan(range.end);

        // Property: Range should span exactly 2 months
        const diffInMs = range.end.getTime() - range.start.getTime();
        const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
        
        // 2 months should be approximately 60-62 days (accounting for different month lengths)
        return diffInDays >= 59 && diffInDays <= 63;
      }
    ), { 
      numRuns: 10,
      verbose: true 
    });
  });

  test('Property: Event filtering should preserve valid events only', () => {
    fc.assert(fc.property(
      fc.array(eventArb, { minLength: 1, maxLength: 20 }),
      (events) => {
        // Act: Filter events within sync period
        const filteredEvents = validator.filterEventsInSyncPeriod(events);

        // Assert: All filtered events should be within sync period
        const allValidAfterFilter = filteredEvents.every(event => 
          validator.isWithinSyncPeriod(event.start_time)
        );

        // Property: Filtered events should be a subset of original events
        const isSubset = filteredEvents.length <= events.length;

        // Property: All filtered events should be valid
        return allValidAfterFilter && isSubset;
      }
    ), { 
      numRuns: 50,
      verbose: true 
    });
  });

  test('Property: Boundary dates should be handled correctly', () => {
    fc.assert(fc.property(
      fc.constantFrom(
        '2024-06-15T00:00:00Z', // Start of today
        '2024-06-15T23:59:59Z', // End of today
        '2024-08-15T00:00:00Z', // Start of last valid day
        '2024-08-15T23:59:59Z'  // End of last valid day
      ),
      (boundaryDate) => {
        // Act & Assert: Boundary dates should be valid
        let validationPassed = false;
        
        try {
          validator.validateSyncPeriod(boundaryDate);
          validationPassed = true;
        } catch (error) {
          validationPassed = false;
        }

        // Property: All boundary dates should be valid
        return validationPassed;
      }
    ), { 
      numRuns: 20,
      verbose: true 
    });
  });

  test('Property: Invalid date formats should be rejected', () => {
    fc.assert(fc.property(
      fc.oneof(
        fc.constant('invalid-date'),
        fc.constant(''),
        fc.constant('2024-13-45'), // Invalid month/day
        fc.constant('not-a-date'),
        fc.constant('2024/06/15'), // Wrong format
        fc.constant(null),
        fc.constant(undefined)
      ),
      (invalidDate) => {
        // Act & Assert: Invalid date formats should fail validation
        let validationFailed = false;
        
        try {
          validator.validateSyncPeriod(invalidDate);
        } catch (error) {
          validationFailed = error.message.includes('Invalid date');
        }

        // Property: All invalid date formats should be rejected
        return validationFailed;
      }
    ), { 
      numRuns: 50,
      verbose: true 
    });
  });

  test('Property: Sync period should be relative to current date', () => {
    fc.assert(fc.property(
      fc.date({
        min: new Date('2024-01-01'),
        max: new Date('2024-12-31')
      }),
      (currentDate) => {
        // Arrange: Create validator with different current date
        const customValidator = new SyncPeriodValidator(currentDate);
        
        // Act: Get sync period range
        const range = customValidator.getSyncPeriodRange();
        
        // Assert: Range should be relative to the current date
        const expectedStart = new Date(currentDate);
        expectedStart.setHours(0, 0, 0, 0);
        
        const expectedEnd = new Date(currentDate);
        expectedEnd.setMonth(expectedStart.getMonth() + 2);
        expectedEnd.setHours(23, 59, 59, 999);

        // Property: Range should match expected dates
        return (
          Math.abs(range.start.getTime() - expectedStart.getTime()) < 1000 && // Within 1 second
          Math.abs(range.end.getTime() - expectedEnd.getTime()) < 1000
        );
      }
    ), { 
      numRuns: 50,
      verbose: true 
    });
  });

  test('Property: Validation should be consistent across multiple calls', () => {
    fc.assert(fc.property(
      fc.date().map(d => d.toISOString()),
      (dateString) => {
        // Act: Validate the same date multiple times
        const results = [];
        
        for (let i = 0; i < 5; i++) {
          try {
            validator.validateSyncPeriod(dateString);
            results.push(true);
          } catch (error) {
            results.push(false);
          }
        }

        // Property: All validation results should be identical
        return results.every(result => result === results[0]);
      }
    ), { 
      numRuns: 100,
      verbose: true 
    });
  });
});