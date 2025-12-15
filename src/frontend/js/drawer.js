/**
 * Drawer Interface Management for Band Sync Calendar
 * Handles mobile-optimized input interface for availability and events
 */

class DrawerManager {
    constructor() {
        this.drawer = null;
        this.backdrop = null;
        this.currentDate = null;
        this.currentTab = 'availability';
        this.isOpen = false;
        this.startY = 0;
        this.currentY = 0;
        this.isDragging = false;
        this.threshold = 100; // pixels to swipe to close
    }
    
    initialize() {
        this.drawer = document.getElementById('drawer');
        if (!this.drawer) {
            console.error('Drawer element not found');
            return;
        }
        
        this.createBackdrop();
        this.addDrawerHandle();
        this.setupEventListeners();
        this.setupTouchGestures();
        this.setupForms();
        this.setupAccessibility();
        console.log('Drawer initialized');
    }
    
    createBackdrop() {
        this.backdrop = document.createElement('div');
        this.backdrop.className = 'drawer-backdrop';
        this.backdrop.setAttribute('aria-hidden', 'true');
        document.body.appendChild(this.backdrop);
        
        this.backdrop.addEventListener('click', () => this.close());
    }
    
    addDrawerHandle() {
        const handle = document.createElement('div');
        handle.className = 'drawer-handle';
        handle.setAttribute('aria-label', 'ドラッグしてドロワーを閉じる');
        
        const drawerContent = this.drawer.querySelector('.drawer-content');
        if (drawerContent) {
            drawerContent.insertBefore(handle, drawerContent.firstChild);
        }
    }
    
    setupEventListeners() {
        // Close button
        const closeBtn = document.getElementById('drawer-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        
        // Tab buttons
        const availabilityTab = document.getElementById('availability-tab');
        const eventTab = document.getElementById('event-tab');
        const detailsTab = document.getElementById('details-tab');
        
        if (availabilityTab) {
            availabilityTab.addEventListener('click', () => this.switchTab('availability'));
        }
        
        if (eventTab) {
            eventTab.addEventListener('click', () => this.switchTab('event'));
        }
        
        if (detailsTab) {
            detailsTab.addEventListener('click', () => this.switchTab('details'));
        }
        
        // Prevent drawer content clicks from closing drawer
        const drawerContent = this.drawer.querySelector('.drawer-content');
        if (drawerContent) {
            drawerContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
        
        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }
    
    setupTouchGestures() {
        const drawerContent = this.drawer.querySelector('.drawer-content');
        if (!drawerContent) return;
        
        // Touch start
        drawerContent.addEventListener('touchstart', (e) => {
            this.startY = e.touches[0].clientY;
            this.currentY = this.startY;
            this.isDragging = false;
        }, { passive: true });
        
        // Touch move
        drawerContent.addEventListener('touchmove', (e) => {
            if (!this.isOpen) return;
            
            this.currentY = e.touches[0].clientY;
            const deltaY = this.currentY - this.startY;
            
            // Only allow downward swipes to close
            if (deltaY > 0) {
                this.isDragging = true;
                const progress = Math.min(deltaY / this.threshold, 1);
                const translateY = progress * 100;
                
                this.drawer.style.transform = `translateY(${translateY}%)`;
                this.backdrop.style.opacity = 1 - progress * 0.5;
                
                // Prevent scrolling when dragging
                e.preventDefault();
            }
        }, { passive: false });
        
        // Touch end
        drawerContent.addEventListener('touchend', (e) => {
            if (!this.isDragging) return;
            
            const deltaY = this.currentY - this.startY;
            const shouldClose = deltaY > this.threshold;
            
            if (shouldClose) {
                this.close();
            } else {
                // Snap back to open position
                this.drawer.style.transform = 'translateY(0)';
                this.backdrop.style.opacity = '1';
            }
            
            this.isDragging = false;
        }, { passive: true });
    }
    
    setupAccessibility() {
        // Set ARIA attributes
        this.drawer.setAttribute('role', 'dialog');
        this.drawer.setAttribute('aria-modal', 'true');
        this.drawer.setAttribute('aria-labelledby', 'drawer-title');
        
        // Focus management
        this.drawer.setAttribute('tabindex', '-1');
    }
    
    setupForms() {
        this.setupAvailabilityForm();
        this.setupEventForm();
    }
    
    setupAvailabilityForm() {
        const container = document.getElementById('availability-form');
        if (!container) return;
        
        container.innerHTML = `
            <form id="availability-form-element" novalidate>
                <div class="form-group">
                    <label for="avail-start-time">開始時刻 <span class="optional">(任意)</span></label>
                    <input type="time" id="avail-start-time" 
                           aria-describedby="start-time-help"
                           class="time-input">
                    <small id="start-time-help" class="form-help">空き時間の開始時刻を選択してください</small>
                </div>
                
                <div class="form-group">
                    <label for="avail-end-time">終了時刻 <span class="optional">(任意)</span></label>
                    <input type="time" id="avail-end-time" 
                           aria-describedby="end-time-help"
                           class="time-input">
                    <small id="end-time-help" class="form-help">空き時間の終了時刻を選択してください</small>
                    <div id="time-range-error" class="error-message hidden" role="alert"></div>
                </div>
                
                <div class="form-group">
                    <fieldset>
                        <legend>空き状況 <span class="required">*</span></legend>
                        <div class="status-selection" role="radiogroup" aria-required="true">
                            <button type="button" class="status-btn" data-status="good" 
                                    role="radio" aria-checked="false"
                                    aria-describedby="status-good-desc">
                                <span class="status-symbol">${CONFIG.STATUS_SYMBOLS.good}</span>
                                <span class="status-label">空いている</span>
                            </button>
                            <button type="button" class="status-btn" data-status="ok" 
                                    role="radio" aria-checked="false"
                                    aria-describedby="status-ok-desc">
                                <span class="status-symbol">${CONFIG.STATUS_SYMBOLS.ok}</span>
                                <span class="status-label">調整可能</span>
                            </button>
                            <button type="button" class="status-btn" data-status="bad" 
                                    role="radio" aria-checked="false"
                                    aria-describedby="status-bad-desc">
                                <span class="status-symbol">${CONFIG.STATUS_SYMBOLS.bad}</span>
                                <span class="status-label">忙しい</span>
                            </button>
                        </div>
                        <div class="status-descriptions">
                            <small id="status-good-desc" class="status-desc">完全に空いている時間</small>
                            <small id="status-ok-desc" class="status-desc">調整すれば参加可能</small>
                            <small id="status-bad-desc" class="status-desc">参加が困難な時間</small>
                        </div>
                    </fieldset>
                    <div id="status-error" class="error-message hidden" role="alert"></div>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="submit-btn" id="save-availability" disabled>
                        <span class="btn-text">保存</span>
                        <span class="btn-loading hidden">保存中...</span>
                    </button>
                </div>
            </form>
        `;
        
        this.setupAvailabilityValidation();
        this.setupAvailabilityInteractions();
    }
    
    setupAvailabilityValidation() {
        const form = document.getElementById('availability-form-element');
        const startTimeInput = document.getElementById('avail-start-time');
        const endTimeInput = document.getElementById('avail-end-time');
        const statusButtons = document.querySelectorAll('.status-btn');
        const saveBtn = document.getElementById('save-availability');
        
        // Real-time validation
        const validateForm = () => {
            const startTime = startTimeInput.value;
            const endTime = endTimeInput.value;
            const selectedStatus = document.querySelector('.status-btn[aria-checked="true"]');
            
            let isValid = true;
            
            // Clear previous errors
            this.clearFieldError('time-range-error');
            this.clearFieldError('status-error');
            
            // Validate status selection - this is the only required field
            if (!selectedStatus) {
                this.showFieldError('status-error', '空き状況を選択してください');
                isValid = false;
            } else {
                // If time is provided, validate the range (for all statuses)
                if (startTime && endTime) {
                    if (startTime >= endTime) {
                        this.showFieldError('time-range-error', '終了時刻は開始時刻より後である必要があります');
                        isValid = false;
                    }
                }
                // If only one time field is filled, show error
                else if (startTime && !endTime) {
                    this.showFieldError('time-range-error', '終了時刻も入力してください');
                    isValid = false;
                }
                else if (!startTime && endTime) {
                    this.showFieldError('time-range-error', '開始時刻も入力してください');
                    isValid = false;
                }
            }
            
            saveBtn.disabled = !isValid;
            return isValid;
        };
        
        // Add event listeners
        startTimeInput.addEventListener('input', validateForm);
        endTimeInput.addEventListener('input', validateForm);
        
        // Add validation trigger for status buttons
        statusButtons.forEach(btn => {
            btn.addEventListener('click', validateForm);
        });
        
        // Form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (validateForm()) {
                this.saveAvailability();
            }
        });
    }
    
    setupAvailabilityInteractions() {
        const statusButtons = document.querySelectorAll('.status-btn');
        const saveBtn = document.getElementById('save-availability');
        
        // Status button selection with keyboard support
        statusButtons.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                this.selectStatus(btn);
            });
            
            btn.addEventListener('keydown', (e) => {
                switch (e.key) {
                    case 'Enter':
                    case ' ':
                        e.preventDefault();
                        this.selectStatus(btn);
                        break;
                    case 'ArrowLeft':
                    case 'ArrowUp':
                        e.preventDefault();
                        const prevIndex = index > 0 ? index - 1 : statusButtons.length - 1;
                        statusButtons[prevIndex].focus();
                        break;
                    case 'ArrowRight':
                    case 'ArrowDown':
                        e.preventDefault();
                        const nextIndex = index < statusButtons.length - 1 ? index + 1 : 0;
                        statusButtons[nextIndex].focus();
                        break;
                }
            });
        });
        
        // Auto-fill current time as default
        this.setDefaultTimes();
    }
    
    selectStatus(selectedBtn) {
        const statusButtons = document.querySelectorAll('.status-btn');
        
        // Update ARIA states
        statusButtons.forEach(btn => {
            btn.setAttribute('aria-checked', 'false');
            btn.classList.remove('selected');
        });
        
        selectedBtn.setAttribute('aria-checked', 'true');
        selectedBtn.classList.add('selected');
        
        // All time inputs are optional for all statuses
        const timeInputs = document.querySelectorAll('#avail-start-time, #avail-end-time');
        const timeLabels = document.querySelectorAll('label[for="avail-start-time"], label[for="avail-end-time"]');
        
        // Make all time inputs optional and visually indicate they are optional
        timeInputs.forEach(input => {
            input.required = false;
            input.style.opacity = '0.8';
        });
        
        timeLabels.forEach(label => {
            label.style.opacity = '0.8';
            // Add optional indicator if not already present
            if (!label.textContent.includes('(任意)')) {
                label.innerHTML = label.innerHTML.replace(' <span class="required">*</span>', ' <span class="optional">(任意)</span>');
            }
        });
        
        // Trigger validation event
        const form = document.getElementById('availability-form-element');
        if (form) {
            form.dispatchEvent(new Event('input'));
        }
    }
    
    setDefaultTimes() {
        const now = new Date();
        const startTime = new Date(now);
        startTime.setMinutes(0, 0, 0); // Round to nearest hour
        
        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + 2); // Default 2-hour duration
        
        const startInput = document.getElementById('avail-start-time');
        const endInput = document.getElementById('avail-end-time');
        
        if (startInput && !startInput.value) {
            startInput.value = formatTimeForInput(startTime);
        }
        
        if (endInput && !endInput.value) {
            endInput.value = formatTimeForInput(endTime);
        }
    }
    
    showFieldError(errorId, message) {
        const errorElement = document.getElementById(errorId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
        }
    }
    
    clearFieldError(errorId) {
        const errorElement = document.getElementById(errorId);
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.classList.add('hidden');
        }
    }
    
    setupEventForm() {
        const container = document.getElementById('event-form');
        if (!container) return;
        
        container.innerHTML = `
            <form id="event-form-element" novalidate>
                <div class="form-group">
                    <label for="event-title">イベントタイトル <span class="required">*</span></label>
                    <input type="text" id="event-title" 
                           placeholder="例: 下北沢LIVE、スタジオリハーサル" 
                           maxlength="100" required
                           aria-describedby="title-help title-counter"
                           class="title-input">
                    <small id="title-help" class="form-help">イベントの名前を入力してください</small>
                    <small id="title-counter" class="char-counter">0/100</small>
                    <div id="title-error" class="error-message hidden" role="alert"></div>
                </div>
                
                <div class="form-group">
                    <label for="event-type">イベント種類 <span class="required">*</span></label>
                    <select id="event-type" required aria-describedby="type-help">
                        <option value="">種類を選択してください</option>
                        <option value="live">🎤 LIVE・コンサート</option>
                        <option value="rehearsal">🎵 リハーサル・練習</option>
                        <option value="other">📅 その他のイベント</option>
                    </select>
                    <small id="type-help" class="form-help">イベントの種類を選択してください</small>
                    <div id="type-error" class="error-message hidden" role="alert"></div>
                </div>
                
                <div class="form-group">
                    <label for="event-start-time">開始時刻 <span class="required">*</span></label>
                    <input type="time" id="event-start-time" required 
                           aria-describedby="event-start-help"
                           class="time-input">
                    <small id="event-start-help" class="form-help">イベントの開始時刻を選択してください</small>
                </div>
                
                <div class="form-group">
                    <label for="event-end-time">終了時刻 <span class="required">*</span></label>
                    <input type="time" id="event-end-time" required 
                           aria-describedby="event-end-help"
                           class="time-input">
                    <small id="event-end-help" class="form-help">イベントの終了時刻を選択してください</small>
                    <div id="event-time-error" class="error-message hidden" role="alert"></div>
                </div>
                
                <div class="form-group">
                    <div class="event-preview" id="event-preview" style="display: none;">
                        <h4>プレビュー</h4>
                        <div class="preview-content">
                            <div class="preview-title"></div>
                            <div class="preview-type"></div>
                            <div class="preview-time"></div>
                            <div class="preview-creator"></div>
                        </div>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="submit-btn" id="save-event" disabled>
                        <span class="btn-text">イベントを作成</span>
                        <span class="btn-loading hidden">作成中...</span>
                    </button>
                </div>
            </form>
        `;
        
        this.setupEventValidation();
        this.setupEventInteractions();
    }
    
    setupEventValidation() {
        const form = document.getElementById('event-form-element');
        const titleInput = document.getElementById('event-title');
        const typeSelect = document.getElementById('event-type');
        const startTimeInput = document.getElementById('event-start-time');
        const endTimeInput = document.getElementById('event-end-time');
        const saveBtn = document.getElementById('save-event');
        
        // Real-time validation
        const validateEventForm = () => {
            const title = titleInput.value.trim();
            const type = typeSelect.value;
            const startTime = startTimeInput.value;
            const endTime = endTimeInput.value;
            
            let isValid = true;
            
            // Clear previous errors
            this.clearFieldError('title-error');
            this.clearFieldError('type-error');
            this.clearFieldError('event-time-error');
            
            // Validate title
            if (!title) {
                this.showFieldError('title-error', 'タイトルを入力してください');
                isValid = false;
            } else if (title.length < 2) {
                this.showFieldError('title-error', 'タイトルは2文字以上で入力してください');
                isValid = false;
            }
            
            // Validate type
            if (!type) {
                this.showFieldError('type-error', 'イベント種類を選択してください');
                isValid = false;
            }
            
            // Validate time range
            if (startTime && endTime) {
                if (startTime >= endTime) {
                    this.showFieldError('event-time-error', '終了時刻は開始時刻より後である必要があります');
                    isValid = false;
                } else {
                    // Check minimum duration (15 minutes)
                    const start = new Date(`2000-01-01T${startTime}`);
                    const end = new Date(`2000-01-01T${endTime}`);
                    const diffMinutes = (end - start) / (1000 * 60);
                    
                    if (diffMinutes < 15) {
                        this.showFieldError('event-time-error', 'イベントは最低15分以上の時間を設定してください');
                        isValid = false;
                    }
                }
            }
            
            // Validate required fields
            if (!startTime || !endTime) {
                isValid = false;
            }
            
            saveBtn.disabled = !isValid;
            
            // Update preview
            this.updateEventPreview();
            
            return isValid;
        };
        
        // Add event listeners
        titleInput.addEventListener('input', validateEventForm);
        typeSelect.addEventListener('change', validateEventForm);
        startTimeInput.addEventListener('input', validateEventForm);
        endTimeInput.addEventListener('input', validateEventForm);
        
        // Form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (validateEventForm()) {
                this.saveEvent();
            }
        });
    }
    
    setupEventInteractions() {
        const titleInput = document.getElementById('event-title');
        const typeSelect = document.getElementById('event-type');
        
        // Character counter for title
        titleInput.addEventListener('input', () => {
            const counter = document.getElementById('title-counter');
            if (counter) {
                const length = titleInput.value.length;
                counter.textContent = `${length}/100`;
                counter.style.color = length > 90 ? '#e74c3c' : '#666';
            }
        });
        
        // Auto-suggest titles based on type
        typeSelect.addEventListener('change', () => {
            const titleInput = document.getElementById('event-title');
            if (!titleInput.value && typeSelect.value) {
                const suggestions = {
                    'live': '下北沢LIVE',
                    'rehearsal': 'スタジオリハーサル',
                    'other': 'バンドミーティング'
                };
                
                if (suggestions[typeSelect.value]) {
                    titleInput.placeholder = `例: ${suggestions[typeSelect.value]}`;
                }
            }
        });
        
        // Set default times for events
        this.setDefaultEventTimes();
    }
    
    setDefaultEventTimes() {
        const now = new Date();
        const startTime = new Date(now);
        
        // Default to next even hour
        startTime.setMinutes(0, 0, 0);
        if (now.getMinutes() > 0) {
            startTime.setHours(startTime.getHours() + 1);
        }
        
        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + 2); // Default 2-hour duration
        
        const startInput = document.getElementById('event-start-time');
        const endInput = document.getElementById('event-end-time');
        
        if (startInput && !startInput.value) {
            startInput.value = formatTimeForInput(startTime);
        }
        
        if (endInput && !endInput.value) {
            endInput.value = formatTimeForInput(endTime);
        }
    }
    
    updateEventPreview() {
        const preview = document.getElementById('event-preview');
        const titleInput = document.getElementById('event-title');
        const typeSelect = document.getElementById('event-type');
        const startTimeInput = document.getElementById('event-start-time');
        const endTimeInput = document.getElementById('event-end-time');
        
        if (!preview) return;
        
        const title = titleInput.value.trim();
        const type = typeSelect.value;
        const startTime = startTimeInput.value;
        const endTime = endTimeInput.value;
        const nickname = storage.getNickname();
        
        // Show preview if at least title or type is filled
        if (title || type || startTime || endTime) {
            const typeLabels = {
                'live': '🎤 LIVE・コンサート',
                'rehearsal': '🎵 リハーサル・練習',
                'other': '📅 その他のイベント'
            };
            
            // Update title
            const titleEl = preview.querySelector('.preview-title');
            if (title) {
                titleEl.textContent = title;
                titleEl.classList.remove('preview-placeholder');
            } else {
                titleEl.textContent = 'イベントタイトル未入力';
                titleEl.classList.add('preview-placeholder');
            }
            
            // Update type
            const typeEl = preview.querySelector('.preview-type');
            if (type) {
                typeEl.textContent = typeLabels[type] || type;
                typeEl.classList.remove('preview-placeholder');
            } else {
                typeEl.textContent = '種類未選択';
                typeEl.classList.add('preview-placeholder');
            }
            
            // Update time
            const timeEl = preview.querySelector('.preview-time');
            let timeText = '';
            let hasCompleteTime = false;
            
            if (startTime && endTime) {
                timeText = `${startTime} - ${endTime}`;
                hasCompleteTime = true;
            } else if (startTime) {
                timeText = `${startTime} - 終了時刻未入力`;
            } else if (endTime) {
                timeText = `開始時刻未入力 - ${endTime}`;
            } else {
                timeText = '時刻未入力';
            }
            
            timeEl.textContent = timeText;
            if (hasCompleteTime) {
                timeEl.classList.remove('preview-placeholder');
            } else {
                timeEl.classList.add('preview-placeholder');
            }
            
            // Update creator
            preview.querySelector('.preview-creator').textContent = `作成者: ${nickname || '未設定'}`;
            
            preview.style.display = 'block';
        } else {
            preview.style.display = 'none';
        }
    }
    
    open(date) {
        if (!this.drawer) return;
        
        this.currentDate = date;
        this.isOpen = true;
        
        // Update drawer title
        const title = document.getElementById('drawer-title');
        if (title) {
            title.textContent = `${formatDateForDisplay(date)} - スケジュール入力`;
        }
        
        // Reset forms
        this.resetForms();
        
        // Show backdrop
        if (this.backdrop) {
            this.backdrop.classList.add('show');
        }
        
        // Show drawer with animation
        this.drawer.classList.add('open');
        this.drawer.style.transform = 'translateY(0)';
        
        // Prevent body scroll on mobile
        document.body.style.overflow = 'hidden';
        
        // Focus management for accessibility
        this.trapFocus();
        
        // Focus first input after animation
        setTimeout(() => {
            const firstInput = this.drawer.querySelector('input:not([disabled])');
            if (firstInput) {
                firstInput.focus();
            } else {
                this.drawer.focus();
            }
        }, 300);
    }
    
    close() {
        if (!this.drawer) return;
        
        // Hide drawer
        this.drawer.classList.remove('open');
        this.drawer.style.transform = '';
        
        // Hide backdrop
        if (this.backdrop) {
            this.backdrop.classList.remove('show');
            this.backdrop.style.opacity = '';
        }
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Reset state
        this.isOpen = false;
        this.currentDate = null;
        this.isDragging = false;
        
        // Return focus to the element that opened the drawer
        const calendarEl = document.getElementById('calendar');
        if (calendarEl) {
            calendarEl.focus();
        }
    }
    
    trapFocus() {
        const focusableElements = this.drawer.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        const handleTabKey = (e) => {
            if (e.key !== 'Tab') return;
            
            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };
        
        // Remove existing listener if any
        this.drawer.removeEventListener('keydown', this.tabHandler);
        
        // Add new listener
        this.tabHandler = handleTabKey;
        this.drawer.addEventListener('keydown', this.tabHandler);
    }
    
    switchTab(tab) {
        this.currentTab = tab;
        
        // Update tab buttons
        const availabilityTab = document.getElementById('availability-tab');
        const eventTab = document.getElementById('event-tab');
        const detailsTab = document.getElementById('details-tab');
        
        if (availabilityTab && eventTab && detailsTab) {
            availabilityTab.classList.toggle('active', tab === 'availability');
            eventTab.classList.toggle('active', tab === 'event');
            detailsTab.classList.toggle('active', tab === 'details');
        }
        
        // Update form visibility
        const availabilityForm = document.getElementById('availability-form');
        const eventForm = document.getElementById('event-form');
        const detailsForm = document.getElementById('details-form');
        
        if (availabilityForm && eventForm && detailsForm) {
            availabilityForm.classList.toggle('hidden', tab !== 'availability');
            eventForm.classList.toggle('hidden', tab !== 'event');
            detailsForm.classList.toggle('hidden', tab !== 'details');
        }
        
        // Load details if switching to details tab
        if (tab === 'details' && this.currentDate) {
            this.loadDateDetails(this.currentDate);
        }
    }
    
    async loadDateDetails(dateStr) {
        const detailsForm = document.getElementById('details-form');
        if (!detailsForm) return;
        
        try {
            // Show loading
            detailsForm.innerHTML = '<div class="loading-details">詳細を読み込み中...</div>';
            
            // Get all members' data for this date
            const members = ['COKAI', 'YUSUKE', 'ZEN', 'YAMCHI'];
            const memberColors = {
                'COKAI': 'var(--cokai)',
                'YUSUKE': 'var(--yusuke)', 
                'ZEN': 'var(--zen)',
                'YAMCHI': 'var(--yamchi)'
            };
            
            const originalNickname = storage.getNickname();
            const allMemberData = [];
            
            for (const memberName of members) {
                try {
                    storage.setNickname(memberName);
                    const memberData = await apiClient.getAvailability(dateStr, dateStr);
                    
                    if (memberData && memberData.data && memberData.data.length > 0) {
                        const dayData = memberData.data.filter(item => {
                            const itemDate = new Date(item.start_time).toISOString().split('T')[0];
                            return itemDate === dateStr;
                        });
                        
                        allMemberData.push({
                            name: memberName,
                            color: memberColors[memberName],
                            data: dayData
                        });
                    } else {
                        allMemberData.push({
                            name: memberName,
                            color: memberColors[memberName],
                            data: []
                        });
                    }
                } catch (error) {
                    console.warn(`Failed to load data for ${memberName}:`, error);
                    allMemberData.push({
                        name: memberName,
                        color: memberColors[memberName],
                        data: []
                    });
                }
            }
            
            // Restore original nickname
            if (originalNickname) {
                storage.setNickname(originalNickname);
            }
            
            // Render details
            this.renderDateDetails(detailsForm, dateStr, allMemberData);
            
        } catch (error) {
            console.error('Failed to load date details:', error);
            detailsForm.innerHTML = '<div class="error-details">詳細の読み込みに失敗しました</div>';
        }
    }
    
    renderDateDetails(container, dateStr, memberData) {
        const date = new Date(dateStr);
        const formattedDate = date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long', 
            day: 'numeric',
            weekday: 'long'
        });
        
        let html = `
            <div class="details-header">
                <h3>${formattedDate}</h3>
            </div>
            <div class="details-content">
        `;
        
        memberData.forEach(member => {
            const statusIcon = member.data.length > 0 ? 
                (member.data[0].status === 'good' ? '○' :
                 member.data[0].status === 'ok' ? '△' : '×') : '−';
            
            const statusText = member.data.length > 0 ?
                (member.data[0].status === 'good' ? '空いている' :
                 member.data[0].status === 'ok' ? '調整可能' : '空いていない') : '未登録';
            
            html += `
                <div class="member-detail-card">
                    <div class="member-detail-header">
                        <div class="member-status-icon" style="background: ${member.color}; color: white;">
                            ${statusIcon}
                        </div>
                        <div class="member-detail-info">
                            <div class="member-detail-name">${member.name}</div>
                            <div class="member-detail-status">${statusText}</div>
                        </div>
                    </div>
            `;
            
            if (member.data.length > 0) {
                const item = member.data[0];
                const startTime = new Date(item.start_time).toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                const endTime = new Date(item.end_time).toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                html += `
                    <div class="member-detail-body">
                        <div class="time-range">${startTime} - ${endTime}</div>
                        ${item.description ? `<div class="member-description">${item.description}</div>` : ''}
                    </div>
                `;
            } else {
                html += `
                    <div class="member-detail-body">
                        <div class="no-data">この日の予定は登録されていません</div>
                    </div>
                `;
            }
            
            html += '</div>';
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    resetForms() {
        // Reset availability form
        const availForm = document.getElementById('availability-form');
        if (availForm) {
            const inputs = availForm.querySelectorAll('input');
            inputs.forEach(input => input.value = '');
            
            const statusBtns = availForm.querySelectorAll('.status-btn');
            statusBtns.forEach(btn => btn.classList.remove('selected'));
        }
        
        // Reset event form
        const eventForm = document.getElementById('event-form');
        if (eventForm) {
            const inputs = eventForm.querySelectorAll('input, select');
            inputs.forEach(input => input.value = '');
        }
        
        // Switch to availability tab
        this.switchTab('availability');
    }
    
    async saveAvailability() {
        try {
            const nickname = storage.getNickname();
            if (!nickname) {
                alert(CONFIG.ERROR_MESSAGES.NICKNAME_REQUIRED);
                return;
            }
            
            // Get form data
            const startTime = document.getElementById('avail-start-time').value;
            const endTime = document.getElementById('avail-end-time').value;
            const selectedStatus = document.querySelector('.status-btn.selected');
            
            if (!selectedStatus) {
                alert('空き状況を選択してください。');
                return;
            }
            
            const status = selectedStatus.dataset.status;
            
            let startDateTime, endDateTime;
            
            // Create datetime strings - all statuses can work without time input
            if (startTime && endTime) {
                // If time is provided, use specific time
                startDateTime = `${this.currentDate}T${startTime}:00`;
                endDateTime = `${this.currentDate}T${endTime}:00`;
                
                // Validate time range
                if (startDateTime >= endDateTime) {
                    alert(CONFIG.ERROR_MESSAGES.INVALID_DATE_RANGE);
                    return;
                }
            } else {
                // If no time provided, use full day for all statuses
                startDateTime = `${this.currentDate}T00:00:00`;
                endDateTime = `${this.currentDate}T23:59:59`;
            }
            
            // Update button state
            const saveBtn = document.getElementById('save-availability');
            const btnText = saveBtn.querySelector('.btn-text');
            const btnLoading = saveBtn.querySelector('.btn-loading');
            
            if (saveBtn) {
                saveBtn.disabled = true;
                if (btnText) btnText.style.display = 'none';
                if (btnLoading) btnLoading.classList.remove('hidden');
            }
            
            const availabilityData = {
                member_name: nickname,
                start_time: startDateTime,
                end_time: endDateTime,
                status: status
            };
            
            // Use optimistic update if sync manager is available
            if (window.syncManager) {
                await syncManager.optimisticUpdate(
                    'availability',
                    availabilityData,
                    () => apiClient.saveAvailability(availabilityData)
                );
            } else {
                await apiClient.saveAvailability(availabilityData);
            }
            
            // Dispatch data change event
            document.dispatchEvent(new CustomEvent('availability-saved', {
                detail: availabilityData
            }));
            
            // Show success feedback
            if (saveBtn) {
                saveBtn.style.background = '#27ae60';
                if (btnLoading) btnLoading.textContent = '保存完了！';
            }
            
            // Refresh calendar
            if (window.bandSyncCalendar) {
                await window.bandSyncCalendar.refreshCalendarData();
            }
            
            // Close drawer after short delay
            setTimeout(() => {
                this.close();
            }, 1000);
            
        } catch (error) {
            console.error('Failed to save availability:', error);
            alert(CONFIG.ERROR_MESSAGES.SAVE_ERROR);
        } finally {
            const saveBtn = document.getElementById('save-availability');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = '保存';
            }
        }
    }
    
    async saveEvent() {
        try {
            const nickname = storage.getNickname();
            if (!nickname) {
                alert(CONFIG.ERROR_MESSAGES.NICKNAME_REQUIRED);
                return;
            }
            
            // Get form data
            const title = document.getElementById('event-title').value.trim();
            const type = document.getElementById('event-type').value;
            const startTime = document.getElementById('event-start-time').value;
            const endTime = document.getElementById('event-end-time').value;
            
            // Validate form data (should already be validated by form validation)
            if (!title || !type || !startTime || !endTime) {
                alert('すべての項目を入力してください。');
                return;
            }
            
            // Additional validation
            if (title.length < 2) {
                alert('タイトルは2文字以上で入力してください。');
                return;
            }
            
            // Create datetime strings
            const startDateTime = `${this.currentDate}T${startTime}:00`;
            const endDateTime = `${this.currentDate}T${endTime}:00`;
            
            // Validate time range
            if (startDateTime >= endDateTime) {
                alert(CONFIG.ERROR_MESSAGES.INVALID_DATE_RANGE);
                return;
            }
            
            // Update button state
            const saveBtn = document.getElementById('save-event');
            const btnText = saveBtn.querySelector('.btn-text');
            const btnLoading = saveBtn.querySelector('.btn-loading');
            
            if (saveBtn) {
                saveBtn.disabled = true;
                if (btnText) btnText.style.display = 'none';
                if (btnLoading) btnLoading.classList.remove('hidden');
            }
            
            const eventData = {
                title: title,
                type: type,
                start_time: startDateTime,
                end_time: endDateTime,
                created_by: nickname
            };
            
            // Use optimistic update if sync manager is available
            if (window.syncManager) {
                await syncManager.optimisticUpdate(
                    'event',
                    eventData,
                    () => apiClient.createEvent(eventData)
                );
            } else {
                await apiClient.createEvent(eventData);
            }
            
            // Dispatch data change event
            document.dispatchEvent(new CustomEvent('event-created', {
                detail: eventData
            }));
            
            // Show success feedback
            if (saveBtn) {
                saveBtn.style.background = '#27ae60';
                if (btnLoading) btnLoading.textContent = '作成完了！';
            }
            
            // Refresh calendar
            if (window.bandSyncCalendar) {
                await window.bandSyncCalendar.refreshCalendarData();
            }
            
            // Close drawer after short delay
            setTimeout(() => {
                this.close();
            }, 1000);
            
        } catch (error) {
            console.error('Failed to save event:', error);
            
            // Show specific error message
            let errorMessage = CONFIG.ERROR_MESSAGES.SAVE_ERROR;
            if (error.message.includes('400')) {
                errorMessage = '入力データに問題があります。確認してください。';
            } else if (error.message.includes('network')) {
                errorMessage = 'ネットワークエラーが発生しました。接続を確認してください。';
            }
            
            alert(errorMessage);
        } finally {
            // Reset button state
            const saveBtn = document.getElementById('save-event');
            const btnText = saveBtn.querySelector('.btn-text');
            const btnLoading = saveBtn.querySelector('.btn-loading');
            
            if (saveBtn) {
                setTimeout(() => {
                    saveBtn.disabled = false;
                    saveBtn.style.background = '';
                    if (btnText) btnText.style.display = 'inline';
                    if (btnLoading) {
                        btnLoading.classList.add('hidden');
                        btnLoading.textContent = '作成中...';
                    }
                }, 1500);
            }
        }
    }
}

// Create global instance
const drawerManager = new DrawerManager();

// Global functions for external access
window.initializeDrawer = () => drawerManager.initialize();
window.openDrawer = (date) => drawerManager.open(date);

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DrawerManager, drawerManager };
}