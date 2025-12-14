// Jest setup file for Band Sync Calendar tests

// Import testing utilities
import '@testing-library/jest-dom';

// Mock localStorage for testing
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock fetch for API testing
global.fetch = jest.fn();

// Mock FullCalendar for frontend tests
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

// Reset mocks before each test
beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
    fetch.mockClear();
});

// Global test utilities
global.testUtils = {
    createMockEvent: (overrides = {}) => ({
        id: 'test-event-1',
        title: 'Test Event',
        type: 'rehearsal',
        start_time: '2024-01-15T10:00:00',
        end_time: '2024-01-15T12:00:00',
        created_by: 'TestUser',
        created_at: '2024-01-01T00:00:00',
        ...overrides
    }),
    
    createMockAvailability: (overrides = {}) => ({
        id: 'test-availability-1',
        member_name: 'TestUser',
        start_time: '2024-01-15T10:00:00',
        end_time: '2024-01-15T12:00:00',
        status: 'good',
        updated_at: '2024-01-01T00:00:00',
        ...overrides
    }),
    
    mockFetchResponse: (data, ok = true, status = 200) => {
        fetch.mockResolvedValueOnce({
            ok,
            status,
            json: async () => data,
            text: async () => JSON.stringify(data)
        });
    },
    
    mockFetchError: (error = new Error('Network error')) => {
        fetch.mockRejectedValueOnce(error);
    }
};