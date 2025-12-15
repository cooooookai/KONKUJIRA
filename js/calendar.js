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
                // Initialize member status grids after calendar renders
                this.initializeMemberStatusGrids();
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
        
        // Show date details modal first (if there's data to show)
        this.showDateDetails(clickedDate).then(hasData => {
            // If no data exists and user has nickname, open drawer for input
            if (!hasData && storage.getNickname()) {
                if (typeof window.openDrawer === 'function') {
                    window.openDrawer(clickedDate);
                } else {
                    console.warn('Drawer function not available');
                }
            } else if (!hasData && !storage.getNickname()) {
                this.showError(CONFIG.ERROR_MESSAGES.NICKNAME_REQUIRED);
            }
        });
    }
    
    /**
     * Show detailed information for a specific date
     */
    async showDateDetails(dateStr) {
        try {
            // Get all members' availability for this date
            const allMembersData = await this.getAllMembersAvailabilityForDate(dateStr);
            
            // Get events for this date
            const eventsData = await this.getEventsForDate(dateStr);
            
            // If no data exists, return false
            if (allMembersData.length === 0 && eventsData.length === 0) {
                return false;
            }
            
            // Show the date details modal
            this.displayDateDetailsModal(dateStr, allMembersData, eventsData);
            return true;
            
        } catch (error) {
            console.error('Error loading date details:', error);
            return false;
        }
    }
    
    /**
     * Initialize member status grids for all calendar days
     */
    async initializeMemberStatusGrids() {
        console.log('Initializing member status grids...');
        
        // Get all day cells
        const dayCells = document.querySelectorAll('.fc-daygrid-day');
        
        dayCells.forEach(dayCell => {
            // Skip if already has grid
            if (dayCell.querySelector('.member-status-grid')) return;
            
            // Get date from cell
            const dateStr = dayCell.getAttribute('data-date');
            if (!dateStr) return;
            
            // Create member status grid
            this.createMemberStatusGrid(dayCell, dateStr);
        });
        
        // Load and display member data
        await this.loadAllMemberData();
    }
    
    /**
     * Create member status grid for a day cell
     */
    createMemberStatusGrid(dayCell, dateStr) {
        const grid = document.createElement('div');
        grid.className = 'member-status-grid';
        
        const members = [
            { name: 'COKAI', class: 'member-cokai', icon: '🎸' },
            { name: 'YUSUKE', class: 'member-yusuke', icon: '🥁' },
            { name: 'ZEN', class: 'member-zen', icon: '🎹' },
            { name: 'YAMCHI', class: 'member-yamchi', icon: '🎤' }
        ];
        
        members.forEach(member => {
            const cell = document.createElement('div');
            cell.className = `member-status-cell ${member.class} status-none`;
            cell.setAttribute('data-member', member.name);
            cell.setAttribute('data-date', dateStr);
            cell.title = `${member.name} - クリックして詳細表示`;
            
            // Add click handler
            cell.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showMemberDetails(member.name, dateStr);
            });
            
            grid.appendChild(cell);
        });
        
        dayCell.appendChild(grid);
    }
    
    /**
     * Load all member data and update status grids
     */
    async loadAllMemberData() {
        const members = ['COKAI', 'YUSUKE', 'ZEN', 'YAMCHI'];
        const originalNickname = storage.getNickname();
        
        try {
            for (const memberName of members) {
                // Temporarily set nickname to fetch member's data
                storage.setNickname(memberName);
                
                try {
                    const { start, end } = getSyncPeriod();
                    const memberData = await apiClient.getAvailability(start, end);
                    
                    if (memberData && memberData.data) {
                        this.updateMemberStatusInGrid(memberName, memberData.data);
                    }
                } catch (error) {
                    console.warn(`Failed to load data for ${memberName}:`, error);
                }
            }
        } finally {
            // Restore original nickname
            if (originalNickname) {
                storage.setNickname(originalNickname);
            }
        }
    }
    
    /**
     * Update member status in grid based on availability data
     */
    updateMemberStatusInGrid(memberName, availabilityData) {
        availabilityData.forEach(item => {
            const itemDate = new Date(item.start_time).toISOString().split('T')[0];
            const cell = document.querySelector(
                `.member-status-cell[data-member="${memberName}"][data-date="${itemDate}"]`
            );
            
            if (cell) {
                // Remove existing status classes
                cell.classList.remove('status-none', 'status-available', 'status-flexible', 'status-busy');
                
                // Add new status class
                const statusClass = item.status === 'good' ? 'status-available' :
                                  item.status === 'ok' ? 'status-flexible' : 'status-busy';
                cell.classList.add(statusClass);
                
                // Store data for details view
                cell.setAttribute('data-status', item.status);
                cell.setAttribute('data-description', item.description || '');
                cell.setAttribute('data-start-time', item.start_time);
                cell.setAttribute('data-end-time', item.end_time);
            }
        });
    }
    
    /**
     * Show member details for a specific date
     */
    showMemberDetails(memberName, dateStr) {
        const cell = document.querySelector(
            `.member-status-cell[data-member="${memberName}"][data-date="${dateStr}"]`
        );
        
        if (!cell) return;
        
        const status = cell.getAttribute('data-status');
        const description = cell.getAttribute('data-description');
        const startTime = cell.getAttribute('data-start-time');
        const endTime = cell.getAttribute('data-end-time');
        
        if (!status) {
            // No data - open drawer for input
            if (storage.getNickname() === memberName) {
                if (typeof window.openDrawer === 'function') {
                    window.openDrawer(dateStr);
                }
            } else {
                this.showMemberInfo(memberName, dateStr, null);
            }
            return;
        }
        
        this.showMemberInfo(memberName, dateStr, {
            status,
            description,
            startTime,
            endTime
        });
    }
    
    /**
     * Show member information modal
     */
    showMemberInfo(memberName, dateStr, data) {
        const modal = document.createElement('div');
        modal.className = 'member-info-modal';
        
        const date = new Date(dateStr);
        const formattedDate = date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });
        
        const memberColors = {
            'COKAI': { color: 'var(--cokai-blue)', icon: '🎸' },
            'YUSUKE': { color: 'var(--yusuke-green)', icon: '🥁' },
            'ZEN': { color: 'var(--zen-yellow)', icon: '🎹' },
            'YAMCHI': { color: 'var(--yamchi-pink)', icon: '🎤' }
        };
        
        const memberInfo = memberColors[memberName];
        
        let content = `
            <div class="member-info-backdrop"></div>
            <div class="member-info-content">
                <div class="member-info-header" style="background: linear-gradient(135deg, ${memberInfo.color}, ${memberInfo.color}dd);">
                    <h3>${memberInfo.icon} ${memberName}</h3>
                    <button class="member-info-close">&times;</button>
                </div>
                <div class="member-info-body">
                    <div class="date-info">${formattedDate}</div>
        `;
        
        if (data) {
            const statusText = data.status === 'good' ? '空いている' :
                            data.status === 'ok' ? '調整可能' : '空いていない';
            const statusIcon = data.status === 'good' ? '○' :
                             data.status === 'ok' ? '△' : '×';
            
            const startTime = new Date(data.startTime).toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit'
            });
            const endTime = new Date(data.endTime).toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            content += `
                <div class="status-info">
                    <div class="status-display">
                        <span class="status-icon">${statusIcon}</span>
                        <span class="status-text">${statusText}</span>
                    </div>
                    <div class="time-info">${startTime} - ${endTime}</div>
                    ${data.description ? `<div class="description-info">${data.description}</div>` : ''}
                </div>
            `;
        } else {
            content += `
                <div class="no-data-info">
                    <p>この日の空き状況は登録されていません。</p>
                </div>
            `;
        }
        
        if (storage.getNickname() === memberName) {
            content += `
                <div class="member-actions">
                    <button class="edit-availability-btn" data-date="${dateStr}">
                        ✏️ 空き状況を${data ? '編集' : '登録'}
                    </button>
                </div>
            `;
        }
        
        content += `
                </div>
            </div>
        `;
        
        modal.innerHTML = content;
        document.body.appendChild(modal);
        
        // Add event listeners
        modal.querySelector('.member-info-close').addEventListener('click', () => {
            modal.classList.add('closing');
            setTimeout(() => modal.remove(), 300);
        });
        
        modal.querySelector('.member-info-backdrop').addEventListener('click', () => {
            modal.classList.add('closing');
            setTimeout(() => modal.remove(), 300);
        });
        
        const editBtn = modal.querySelector('.edit-availability-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                modal.remove();
                if (typeof window.openDrawer === 'function') {
                    window.openDrawer(dateStr);
                }
            });
        }
        
        // Show modal
        setTimeout(() => modal.classList.add('show'), 10);
    }
    
    /**
     * Get all members' availability for a specific date
     */
    async getAllMembersAvailabilityForDate(dateStr) {
        const memberNames = ['COKAI', 'YUSUKE', 'ZEN', 'YAMCHI'];
        const allData = [];
        const originalNickname = storage.getNickname();
        
        for (const memberName of memberNames) {
            try {
                // Temporarily set nickname to fetch each member's data
                storage.setNickname(memberName);
                
                const memberData = await apiClient.getAvailability(dateStr, dateStr);
                
                if (memberData && memberData.data && memberData.data.length > 0) {
                    memberData.data.forEach(item => {
                        const itemDate = new Date(item.start_time).toISOString().split('T')[0];
                        if (itemDate === dateStr) {
                            allData.push({
                                ...item,
                                member_name: memberName
                            });
                        }
                    });
                }
            } catch (error) {
                console.warn(`Failed to load data for ${memberName}:`, error);
            }
        }
        
        // Restore original nickname
        if (originalNickname) {
            storage.setNickname(originalNickname);
        }
        
        return allData;
    }
    
    /**
     * Get events for a specific date
     */
    async getEventsForDate(dateStr) {
        try {
            const eventsData = await apiClient.getEvents(dateStr, dateStr);
            if (eventsData && eventsData.data) {
                return eventsData.data.filter(event => {
                    const eventDate = new Date(event.start_time).toISOString().split('T')[0];
                    return eventDate === dateStr;
                });
            }
            return [];
        } catch (error) {
            console.warn('Failed to load events:', error);
            return [];
        }
    }
    
    /**
     * Display the date details modal
     */
    displayDateDetailsModal(dateStr, availabilityData, eventsData) {
        // Create modal HTML
        const modal = document.createElement('div');
        modal.className = 'date-details-modal';
        modal.innerHTML = this.createDateDetailsHTML(dateStr, availabilityData, eventsData);
        
        // Add to document
        document.body.appendChild(modal);
        
        // Add event listeners
        this.setupDateDetailsModalEvents(modal);
        
        // Show modal with animation
        setTimeout(() => modal.classList.add('show'), 10);
    }
    
    /**
     * Create HTML for date details modal
     */
    createDateDetailsHTML(dateStr, availabilityData, eventsData) {
        const date = new Date(dateStr);
        const formattedDate = date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });
        
        let html = `
            <div class="date-details-backdrop"></div>
            <div class="date-details-content">
                <div class="date-details-header">
                    <h3>📅 ${formattedDate}</h3>
                    <button class="date-details-close" aria-label="閉じる">&times;</button>
                </div>
                <div class="date-details-body">
        `;
        
        // Events section
        if (eventsData.length > 0) {
            html += `
                <div class="details-section">
                    <h4>🎵 イベント</h4>
                    <div class="events-list">
            `;
            
            eventsData.forEach(event => {
                const startTime = new Date(event.start_time).toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                const endTime = new Date(event.end_time).toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                const typeIcon = event.type === 'live' ? '🎤' : 
                               event.type === 'rehearsal' ? '🎼' : '📝';
                
                html += `
                    <div class="event-item">
                        <div class="event-icon">${typeIcon}</div>
                        <div class="event-info">
                            <div class="event-title">${event.title}</div>
                            <div class="event-time">${startTime} - ${endTime}</div>
                            <div class="event-creator">作成者: ${event.created_by}</div>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        // Availability section
        if (availabilityData.length > 0) {
            html += `
                <div class="details-section">
                    <h4>👥 メンバー空き状況</h4>
                    <div class="availability-list">
            `;
            
            // Group by member
            const memberGroups = {};
            availabilityData.forEach(item => {
                if (!memberGroups[item.member_name]) {
                    memberGroups[item.member_name] = [];
                }
                memberGroups[item.member_name].push(item);
            });
            
            Object.entries(memberGroups).forEach(([memberName, items]) => {
                html += `
                    <div class="member-availability">
                        <div class="member-name-header">${memberName}</div>
                        <div class="member-slots">
                `;
                
                items.forEach(item => {
                    const startTime = new Date(item.start_time).toLocaleTimeString('ja-JP', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    const endTime = new Date(item.end_time).toLocaleTimeString('ja-JP', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    
                    const statusIcon = item.status === 'good' ? '○' :
                                     item.status === 'ok' ? '△' : '×';
                    const statusText = item.status === 'good' ? '空いている' :
                                     item.status === 'ok' ? '調整可能' : '空いていない';
                    const statusClass = `status-${item.status}`;
                    
                    html += `
                        <div class="availability-slot ${statusClass}">
                            <div class="slot-status">
                                <span class="status-icon">${statusIcon}</span>
                                <span class="status-text">${statusText}</span>
                            </div>
                            <div class="slot-time">${startTime} - ${endTime}</div>
                            ${item.description ? `<div class="slot-description">${item.description}</div>` : ''}
                        </div>
                    `;
                });
                
                html += `
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        // Add input button if user has nickname
        if (storage.getNickname()) {
            html += `
                <div class="details-actions">
                    <button class="add-availability-btn" data-date="${dateStr}">
                        ➕ 空き状況を追加
                    </button>
                </div>
            `;
        }
        
        html += `
                </div>
            </div>
        `;
        
        return html;
    }
    
    /**
     * Setup event listeners for date details modal
     */
    setupDateDetailsModalEvents(modal) {
        // Close button
        const closeBtn = modal.querySelector('.date-details-close');
        closeBtn.addEventListener('click', () => this.closeDateDetailsModal(modal));
        
        // Backdrop click
        const backdrop = modal.querySelector('.date-details-backdrop');
        backdrop.addEventListener('click', () => this.closeDateDetailsModal(modal));
        
        // Add availability button
        const addBtn = modal.querySelector('.add-availability-btn');
        if (addBtn) {
            addBtn.addEventListener('click', (e) => {
                const dateStr = e.target.dataset.date;
                this.closeDateDetailsModal(modal);
                if (typeof window.openDrawer === 'function') {
                    window.openDrawer(dateStr);
                }
            });
        }
        
        // Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                this.closeDateDetailsModal(modal);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }
    
    /**
     * Close date details modal
     */
    closeDateDetailsModal(modal) {
        modal.classList.add('closing');
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
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
            
            // Reload member status grids after data update
            setTimeout(() => {
                this.initializeMemberStatusGrids();
            }, 200);
            
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
     * Show event details with delete option
     */
    showEventDetails(event) {
        const props = event.extendedProps;
        const typeLabel = CONFIG.EVENT_TYPES[props.type] || props.type;
        const currentUser = storage.getNickname();
        
        // Create event details modal
        this.showEventModal(event, {
            title: event.title,
            type: typeLabel,
            startTime: event.start.toLocaleString('ja-JP'),
            endTime: event.end.toLocaleString('ja-JP'),
            createdBy: props.createdBy,
            canDelete: currentUser === props.createdBy || currentUser === 'COKAI' // COKAI can delete any event
        });
    }
    
    /**
     * Show event modal with delete option
     */
    showEventModal(event, details) {
        // Create modal HTML
        const modalHTML = `
            <div id="event-modal" class="modal" style="display: block;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>📅 イベント詳細</h3>
                        <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="event-detail">
                            <strong>タイトル:</strong> ${details.title}
                        </div>
                        <div class="event-detail">
                            <strong>種類:</strong> ${details.type}
                        </div>
                        <div class="event-detail">
                            <strong>開始時間:</strong> ${details.startTime}
                        </div>
                        <div class="event-detail">
                            <strong>終了時間:</strong> ${details.endTime}
                        </div>
                        <div class="event-detail">
                            <strong>作成者:</strong> ${details.createdBy}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">閉じる</button>
                        ${details.canDelete ? `
                            <button class="btn btn-danger" onclick="calendarManager.deleteEvent('${event.id}')">
                                🗑️ 削除
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    /**
     * Delete event
     */
    async deleteEvent(eventId) {
        // Confirm deletion
        const confirmed = confirm('このイベントを削除しますか？\nこの操作は取り消せません。');
        if (!confirmed) return;
        
        try {
            // Show loading
            const modal = document.getElementById('event-modal');
            if (modal) {
                modal.querySelector('.modal-body').innerHTML = '<div class="loading">削除中...</div>';
            }
            
            // Delete via API
            await apiClient.deleteEvent(eventId);
            
            // Close modal
            if (modal) modal.remove();
            
            // Refresh calendar
            await this.loadData();
            
            // Show success message
            this.showSuccess('イベントが削除されました');
            
        } catch (error) {
            console.error('Failed to delete event:', error);
            this.showError('イベントの削除に失敗しました: ' + error.message);
            
            // Close modal on error
            const modal = document.getElementById('event-modal');
            if (modal) modal.remove();
        }
    }
    
    /**
     * Show success message
     */
    showSuccess(message) {
        // Simple success notification - could be enhanced
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 10000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
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