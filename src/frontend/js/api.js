// API client for Band Sync Calendar backend communication

class APIError extends Error {
    constructor(status, statusText, message, endpoint) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.statusText = statusText;
        this.endpoint = endpoint;
    }
    
    toString() {
        return `APIError: ${this.status} ${this.statusText} - ${this.message} (${this.endpoint})`;
    }
}

class APIClient {
    constructor(baseURL = CONFIG.API_BASE_URL) {
        this.baseURL = baseURL;
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
        this.requestQueue = [];
        this.isOnline = navigator.onLine;
        this.setupNetworkListeners();
    }
    
    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processQueue();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }
    
    async request(endpoint, options = {}) {
        // Check if offline and handle accordingly
        if (!this.isOnline && options.method !== 'GET') {
            return this.queueRequest(endpoint, options);
        }
        
        const url = `${this.baseURL}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            timeout: 30000, // 30 second timeout
        };
        
        const requestOptions = { ...defaultOptions, ...options };
        
        // Add request ID for tracking
        const requestId = this.generateRequestId();
        console.log(`[API] ${requestOptions.method || 'GET'} ${endpoint} (${requestId})`);
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), requestOptions.timeout);
                
                const response = await fetch(url, {
                    ...requestOptions,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new APIError(
                        response.status,
                        response.statusText,
                        errorData.error || 'Unknown error',
                        endpoint
                    );
                }
                
                const data = await response.json();
                console.log(`[API] ✅ ${endpoint} (${requestId})`, data);
                
                // Dispatch success event for network status
                if (options.method && options.method !== 'GET') {
                    document.dispatchEvent(new CustomEvent('api-sync-success'));
                }
                
                return data;
                
            } catch (error) {
                console.warn(`[API] ❌ Attempt ${attempt}/${this.retryAttempts} failed for ${endpoint}:`, error);
                
                // Don't retry on client errors (4xx)
                if (error instanceof APIError && error.status >= 400 && error.status < 500) {
                    throw error;
                }
                
                if (attempt === this.retryAttempts) {
                    // Dispatch error event for network status
                    if (options.method && options.method !== 'GET') {
                        document.dispatchEvent(new CustomEvent('api-sync-error', {
                            detail: { message: error.message }
                        }));
                    }
                    
                    throw new APIError(
                        0,
                        'Network Error',
                        `Request failed after ${this.retryAttempts} attempts: ${error.message}`,
                        endpoint
                    );
                }
                
                // Exponential backoff
                const delay = this.retryDelay * Math.pow(2, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    queueRequest(endpoint, options) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({
                endpoint,
                options,
                resolve,
                reject,
                timestamp: Date.now()
            });
            
            console.log(`[API] 📤 Queued request: ${options.method || 'GET'} ${endpoint}`);
        });
    }
    
    async processQueue() {
        if (this.requestQueue.length === 0) return;
        
        console.log(`[API] 🔄 Processing ${this.requestQueue.length} queued requests`);
        
        const queue = [...this.requestQueue];
        this.requestQueue = [];
        
        for (const queuedRequest of queue) {
            try {
                const result = await this.request(queuedRequest.endpoint, queuedRequest.options);
                queuedRequest.resolve(result);
            } catch (error) {
                queuedRequest.reject(error);
            }
        }
    }
    
    generateRequestId() {
        return Math.random().toString(36).substr(2, 9);
    }
    
    // Events API
    async getEvents(startDate, endDate) {
        try {
            const params = new URLSearchParams({
                start: startDate,
                end: endDate
            });
            
            const cacheKey = `events_${startDate}_${endDate}`;
            
            // Try cache first for GET requests
            if (this.isOnline) {
                const cached = storage.getCache(cacheKey);
                if (cached && Date.now() - cached.timestamp < 30000) { // 30 second cache
                    console.log('[API] 📋 Using cached events');
                    return cached.data;
                }
            }
            
            const events = await this.request(`/events?${params}`);
            
            // Cache successful response
            if (this.isOnline) {
                storage.setCache(cacheKey, { data: events, timestamp: Date.now() }, 5); // 5 minute cache
            }
            
            return events;
        } catch (error) {
            // Return cached data if available during network errors
            const cacheKey = `events_${startDate}_${endDate}`;
            const cached = storage.getCache(cacheKey);
            if (cached) {
                console.log('[API] 📋 Using stale cached events due to network error');
                return cached.data;
            }
            throw error;
        }
    }
    
    async createEvent(eventData) {
        try {
            // Validate event data
            this.validateEventData(eventData);
            
            const result = await this.request('/events', {
                method: 'POST',
                body: JSON.stringify(eventData)
            });
            
            // Clear events cache after successful creation
            this.clearEventsCache();
            
            return result;
        } catch (error) {
            console.error('[API] Failed to create event:', error);
            throw error;
        }
    }
    
    async deleteEvent(eventId) {
        try {
            if (!eventId) {
                throw new Error('Event ID is required');
            }
            
            const result = await this.request(`/events/${eventId}`, {
                method: 'DELETE'
            });
            
            // Clear events cache after successful deletion
            this.clearEventsCache();
            
            return result;
        } catch (error) {
            console.error('[API] Failed to delete event:', error);
            throw error;
        }
    }
    
    // Availability API
    async getAvailability(startDate, endDate) {
        try {
            const params = new URLSearchParams({
                start: startDate,
                end: endDate
            });
            
            const cacheKey = `availability_${startDate}_${endDate}`;
            
            // Try cache first for GET requests
            if (this.isOnline) {
                const cached = storage.getCache(cacheKey);
                if (cached && Date.now() - cached.timestamp < 30000) { // 30 second cache
                    console.log('[API] 📋 Using cached availability');
                    return cached.data;
                }
            }
            
            const availability = await this.request(`/availability?${params}`);
            
            // Cache successful response
            if (this.isOnline) {
                storage.setCache(cacheKey, { data: availability, timestamp: Date.now() }, 5); // 5 minute cache
            }
            
            return availability;
        } catch (error) {
            // Return cached data if available during network errors
            const cacheKey = `availability_${startDate}_${endDate}`;
            const cached = storage.getCache(cacheKey);
            if (cached) {
                console.log('[API] 📋 Using stale cached availability due to network error');
                return cached.data;
            }
            throw error;
        }
    }
    
    async saveAvailability(availabilityData) {
        try {
            // Validate availability data
            this.validateAvailabilityData(availabilityData);
            
            const result = await this.request('/availability', {
                method: 'POST',
                body: JSON.stringify(availabilityData)
            });
            
            // Clear availability cache after successful save
            this.clearAvailabilityCache();
            
            return result;
        } catch (error) {
            console.error('[API] Failed to save availability:', error);
            throw error;
        }
    }
    
    // Holiday API (external)
    async getJapaneseHolidays() {
        try {
            const cacheKey = 'japanese_holidays';
            
            // Check cache first (holidays don't change often)
            const cached = storage.getCache(cacheKey);
            if (cached) {
                console.log('[API] 📋 Using cached holidays');
                return cached;
            }
            
            console.log('[API] 🎌 Fetching Japanese holidays');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch(CONFIG.HOLIDAY_API_URL, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`Holiday API failed: ${response.status}`);
            }
            
            const holidays = await response.json();
            
            // Cache holidays for 24 hours
            storage.setCache(cacheKey, holidays, 24 * 60);
            
            return holidays;
        } catch (error) {
            console.warn('[API] Failed to fetch holidays:', error);
            
            // Return cached data if available
            const cached = storage.getCache('japanese_holidays');
            if (cached) {
                console.log('[API] 📋 Using stale cached holidays due to error');
                return cached;
            }
            
            return {}; // Return empty object as fallback
        }
    }
    
    // Validation methods
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
        
        if (new Date(eventData.start_time) >= new Date(eventData.end_time)) {
            throw new Error('Start time must be before end time');
        }
    }
    
    validateAvailabilityData(availabilityData) {
        const required = ['member_name', 'start_time', 'end_time', 'status'];
        const missing = required.filter(field => !availabilityData[field]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }
        
        if (!['good', 'ok', 'bad'].includes(availabilityData.status)) {
            throw new Error('Invalid availability status');
        }
        
        if (availabilityData.member_name.length < 1 || availabilityData.member_name.length > 50) {
            throw new Error('Member name must be between 1 and 50 characters');
        }
        
        if (new Date(availabilityData.start_time) >= new Date(availabilityData.end_time)) {
            throw new Error('Start time must be before end time');
        }
    }
    
    // Cache management
    clearEventsCache() {
        const keys = Object.keys(localStorage).filter(key => key.includes('events_'));
        keys.forEach(key => storage.clearCache(key.replace('band_sync_cache_', '')));
    }
    
    clearAvailabilityCache() {
        const keys = Object.keys(localStorage).filter(key => key.includes('availability_'));
        keys.forEach(key => storage.clearCache(key.replace('band_sync_cache_', '')));
    }
    
    // Network status
    isNetworkAvailable() {
        return this.isOnline;
    }
    
    // Get queue status
    getQueueStatus() {
        return {
            queueLength: this.requestQueue.length,
            isOnline: this.isOnline,
            oldestRequest: this.requestQueue.length > 0 ? 
                new Date(this.requestQueue[0].timestamp) : null
        };
    }
}

// Data transformation utilities
class DataTransformer {
    static toFullCalendarEvent(event) {
        return {
            id: event.id,
            title: event.title,
            start: event.start_time,
            end: event.end_time,
            extendedProps: {
                type: event.type,
                createdBy: event.created_by,
                createdAt: event.created_at
            },
            classNames: [`event-${event.type}`]
        };
    }
    
    static toFullCalendarAvailability(availability) {
        const symbol = CONFIG.STATUS_SYMBOLS[availability.status];
        return {
            id: `availability-${availability.id}`,
            title: `${availability.member_name}: ${symbol}`,
            start: availability.start_time,
            end: availability.end_time,
            display: 'background',
            classNames: [`availability-${availability.status}`],
            extendedProps: {
                type: 'availability',
                memberName: availability.member_name,
                status: availability.status
            }
        };
    }
    
    static toFullCalendarHoliday(date, name) {
        return {
            id: `holiday-${date}`,
            title: name,
            start: date,
            allDay: true,
            display: 'background',
            classNames: ['holiday'],
            extendedProps: {
                type: 'holiday'
            }
        };
    }
}

// Create global instance
const apiClient = new APIClient();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APIClient, DataTransformer, apiClient };
}