/**
 * Calendar Management for Band Sync Calendar
 * Handles FullCalendar initialization, configuration, and event management
 */

class CalendarManager {
    constructor() {
        this.calendar = null;
        this.currentEvents = [];
        this.isInitialized = false;
    }
    
    /**
     * Initialize FullCalendar with mobile/desktop responsive configuration
     */
    async initialize(containerElement) {
        if (this.isInitialized) {
            console.warn('Calendar already initialized');
            return this.calendar;
        }
        
        try {
            const { start, end } = getSyncPeriod();
            const isMobile = isMobileDevice();
            
            // FullCalendar configuration
            const calendarConfig = {
                // View Configuration
                initialView: isMobile ? CONFIG.CALENDAR_VIEWS.MOBILE : CONFIG.CALENDAR_VIEWS.DESKTOP,
                
                // Header Toolbar
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: isMobile ? 'listMonth,dayGridMonth' : 'dayGridMonth,listMonth'
                },
                
                // Localization
                locale: 'ja',
                firstDay: 1, // Monday
                
                // Date Range Restrictions
                validRange: {
                    start: start,
                    end: end
                },
                
                // Event Handling
                dateClick: this.handleDateClick.bind(this),
                eventClick: this.handleEventClick.bind(this),
                eventDidMount: this.handleEventMount.bind(this),
                
                // Display Settings
                height: 'auto',
                aspectRatio: isMobile ? 1.0 : 1.35,
                eventDisplay: 'block',
                dayMaxEvents: isMobile ? 3 : 5,
                moreLinkClick: 'popover',
                
                // Event Sources (will be populated later)
                events: [],
                
                // Mobile Optimizations
                ...(isMobile && {
                    dayHeaderFormat: { weekday: 'short' },
                    eventTimeFormat: {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    }
                }),
                
                // Desktop Optimizations
                ...(!isMobile && {
                    dayHeaderFormat: { weekday: 'long' },
                    eventTimeFormat: {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    }
                })
            };
            
            // Create calendar instance
            this.calendar = new FullCalendar.Calendar(containerElement, calendarConfig);
            
            // Render calendar
            this.calendar.render();
            
            // Trigger calendar rendered event for stats overlay
            setTimeout(() => {
                document.dispatchEvent(new CustomEvent('calendar-rendered'));
            }, 100);
            
            // Set up responsive handling
            this.setupResponsiveHandling();
            
            this.isInitialized = true;
            console.log('Calendar initialized successfully');
            
            return this.calendar;
        } catch (error) {
            console.error('Failed to initialize calendar:', error);
            throw error;
        }
    }
    
    /**
     * Handle date click events
     */
    handleDateClick(info) {
        const clickedDate = info.dateStr;
        
        // Check if date is within sync period
        if (!isWithinSyncPeriod(clickedDate)) {
            this.showError(CONFIG.ERROR_MESSAGES.SYNC_PERIOD_ERROR);
            return;
        }
        
        // Check if user has nickname set
        if (!storage.getNickname()) {
            this.showError(CONFIG.ERROR_MESSAGES.NICKNAME_REQUIRED);
            return;
        }
        
        // Open drawer for date input
        if (typeof window.openDrawer === 'function') {
            window.openDrawer(clickedDate);
        } else {
            console.warn('Drawer function not available');
        }
    }
    
    /**
     * Handle event click events
     */
    handleEventClick(info) {
        const event = info.event;
        const eventType = event.extendedProps?.type;
        
        // Prevent default for background events (availability, holidays)
        if (event.display === 'background') {
            info.jsEvent.preventDefault();
            
            // Show availability details for availability events
            if (eventType === 'availability') {
                this.showAvailabilityDetails(event);
            }
            return;
        }
        
        // Handle regular events (performances, rehearsals)
        if (eventType && ['live', 'rehearsal', 'other'].includes(eventType)) {
            this.showEventDetails(event);
        }
    }
    
    /**
     * Handle event mounting (for custom styling)
     */
    handleEventMount(info) {
        const event = info.event;
        const eventType = event.extendedProps?.type;
        
        // Add custom styling based on event type
        if (eventType === 'availability') {
            const status = event.extendedProps.status;
            info.el.style.opacity = '0.6';
            info.el.title = `${event.extendedProps.memberName}: ${CONFIG.STATUS_SYMBOLS[status]}`;
        } else if (eventType === 'holiday') {
            info.el.style.opacity = '0.3';
            info.el.style.fontStyle = 'italic';
        } else if (['live', 'rehearsal', 'other'].includes(eventType)) {
            info.el.style.fontWeight = 'bold';
            info.el.title = `${event.title} (${event.extendedProps.createdBy})`;
        }
    }
    
    /**
     * Load and display calendar data
     */
    async loadData() {
        if (!this.calendar) {
            console.warn('Calendar not initialized');
            return;
        }
        
        try {
            const { start, end } = getSyncPeriod();
            
            // Load data from API
            const [events, availability, holidays] = await Promise.all([
                apiClient.getEvents(start, end).catch(err => {
                    console.warn('Failed to load events:', err);
                    return [];
                }),
                apiClient.getAvailability(start, end).catch(err => {
                    console.warn('Failed to load availability:', err);
                    return [];
                }),
                this.loadHolidays().catch(err => {
                    console.warn('Failed to load holidays:', err);
                    return {};
                })
            ]);
            
            // Transform data to FullCalendar format
            // Note: Backend already returns FullCalendar format for availability
            const calendarEvents = [
                ...events, // Events are already in FullCalendar format from backend
                ...availability // Availability is already in FullCalendar format from backend
            ];
            
            // Add holidays using holiday manager if available
            if (typeof holidayManager !== 'undefined' && Object.keys(holidays).length > 0) {
                calendarEvents.push(...holidayManager.toFullCalendarEvents(holidays));
            } else {
                // Fallback to simple holiday transformation
                calendarEvents.push(...Object.entries(holidays).map(([date, name]) => 
                    DataTransformer.toFullCalendarHoliday(date, name)
                ));
            }
            
            // Update calendar
            this.calendar.removeAllEvents();
            this.calendar.addEventSource(calendarEvents);
            this.currentEvents = calendarEvents;
            
            console.log(`Loaded ${calendarEvents.length} calendar items`);
        } catch (error) {
            console.error('Failed to load calendar data:', error);
            this.showError(CONFIG.ERROR_MESSAGES.NETWORK_ERROR);
        }
    }
    
    /**
     * Load Japanese holidays using holiday manager
     */
    async loadHolidays() {
        try {
            if (typeof holidayManager !== 'undefined') {
                return await holidayManager.getHolidays();
            } else {
                // Fallback to API client if holiday manager not available
                return await apiClient.getJapaneseHolidays();
            }
        } catch (error) {
            console.warn('Failed to load holidays:', error);
            return {};
        }
    }
    
    /**
     * Refresh calendar data
     */
    async refresh() {
        // Clear holiday cache to get fresh data
        storage.clearCache('holidays');
        await this.loadData();
    }
    
    /**
     * Setup responsive handling for view changes
     */
    setupResponsiveHandling() {
        let resizeTimeout;
        
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (this.calendar) {
                    const isMobile = isMobileDevice();
                    const currentView = this.calendar.view.type;
                    const targetView = isMobile ? CONFIG.CALENDAR_VIEWS.MOBILE : CONFIG.CALENDAR_VIEWS.DESKTOP;
                    
                    if (currentView !== targetView) {
                        this.calendar.changeView(targetView);
                    }
                }
            }, 250);
        });
    }
    
    /**
     * Show availability details
     */
    showAvailabilityDetails(event) {
        const props = event.extendedProps;
        const symbol = CONFIG.STATUS_SYMBOLS[props.status];
        const message = `${props.memberName}の空き状況\n時間: ${event.start.toLocaleTimeString()} - ${event.end.toLocaleTimeString()}\n状態: ${symbol}`;
        alert(message);
    }
    
    /**
     * Show event details
     */
    showEventDetails(event) {
        const props = event.extendedProps;
        const typeLabel = CONFIG.EVENT_TYPES[props.type] || props.type;
        const message = `${event.title}\n種類: ${typeLabel}\n時間: ${event.start.toLocaleTimeString()} - ${event.end.toLocaleTimeString()}\n作成者: ${props.createdBy}`;
        alert(message);
    }
    
    /**
     * Show error message
     */
    showError(message) {
        // Simple alert for now - could be enhanced with a proper notification system
        alert(message);
    }
    
    /**
     * Destroy calendar instance
     */
    destroy() {
        if (this.calendar) {
            this.calendar.destroy();
            this.calendar = null;
        }
        this.isInitialized = false;
        this.currentEvents = [];
    }
    
    /**
     * Get calendar instance
     */
    getCalendar() {
        return this.calendar;
    }
    
    /**
     * Check if calendar is initialized
     */
    isReady() {
        return this.isInitialized && this.calendar !== null;
    }
}

// Create global instance
const calendarManager = new CalendarManager();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CalendarManager, calendarManager };
}