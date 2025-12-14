/**
 * Member Overview - 成员概览功能
 * 显示所有成员的空闲状况和统计信息
 */

class MemberOverview {
    constructor() {
        this.members = new Map();
        this.isVisible = false;
        this.currentPeriod = this.getDefaultPeriod();
    }

    initialize() {
        this.createOverviewPanel();
        this.setupEventListeners();
        console.log('Member Overview initialized');
    }

    getDefaultPeriod() {
        const today = new Date();
        const start = today.toISOString().split('T')[0];
        const end = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 2 weeks
        return { start, end };
    }

    createOverviewPanel() {
        const panel = document.createElement('div');
        panel.id = 'member-overview-panel';
        panel.className = 'member-overview-panel hidden';
        
        panel.innerHTML = `
            <div class="overview-backdrop"></div>
            <div class="overview-content">
                <div class="overview-header">
                    <h2>🎵 メンバー概览</h2>
                    <button id="overview-close" class="close-btn" aria-label="閉じる">&times;</button>
                </div>
                
                <div class="overview-controls">
                    <div class="period-selector">
                        <label for="overview-start">期間:</label>
                        <input type="date" id="overview-start" value="${this.currentPeriod.start}">
                        <span>〜</span>
                        <input type="date" id="overview-end" value="${this.currentPeriod.end}">
                        <button id="refresh-overview" class="refresh-btn">更新</button>
                    </div>
                </div>
                
                <div class="overview-stats">
                    <div class="stat-card">
                        <div class="stat-number" id="total-members">0</div>
                        <div class="stat-label">メンバー数</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" id="total-availability">0</div>
                        <div class="stat-label">空き時間登録</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" id="common-free-slots">0</div>
                        <div class="stat-label">共通空き時間</div>
                    </div>
                </div>
                
                <div class="overview-tabs">
                    <button class="tab-btn active" data-tab="members">メンバー別</button>
                    <button class="tab-btn" data-tab="timeline">タイムライン</button>
                    <button class="tab-btn" data-tab="summary">サマリー</button>
                </div>
                
                <div class="overview-body">
                    <div id="members-view" class="tab-content active">
                        <div id="members-list" class="members-list">
                            <div class="loading">データを読み込み中...</div>
                        </div>
                    </div>
                    
                    <div id="timeline-view" class="tab-content">
                        <div id="timeline-chart" class="timeline-chart">
                            <div class="loading">タイムラインを生成中...</div>
                        </div>
                    </div>
                    
                    <div id="summary-view" class="tab-content">
                        <div id="summary-content" class="summary-content">
                            <div class="loading">サマリーを作成中...</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
    }

    setupEventListeners() {
        // Close button
        document.getElementById('overview-close').addEventListener('click', () => {
            this.hide();
        });

        // Backdrop click
        document.querySelector('.overview-backdrop').addEventListener('click', () => {
            this.hide();
        });

        // Refresh button
        document.getElementById('refresh-overview').addEventListener('click', () => {
            this.updatePeriod();
            this.loadData();
        });

        // Tab switching
        document.querySelectorAll('.overview-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.dataset.tab);
            });
        });

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }

    async show() {
        this.isVisible = true;
        document.getElementById('member-overview-panel').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        await this.loadData();
    }

    hide() {
        this.isVisible = false;
        document.getElementById('member-overview-panel').classList.add('hidden');
        document.body.style.overflow = '';
    }

    updatePeriod() {
        const start = document.getElementById('overview-start').value;
        const end = document.getElementById('overview-end').value;
        
        if (start && end && start <= end) {
            this.currentPeriod = { start, end };
        }
    }

    async loadData() {
        try {
            // Load availability data
            const availabilityData = await apiClient.getAvailability(
                this.currentPeriod.start + 'T00:00:00',
                this.currentPeriod.end + 'T23:59:59'
            );

            // Load events data
            const eventsData = await apiClient.getEvents(
                this.currentPeriod.start + 'T00:00:00',
                this.currentPeriod.end + 'T23:59:59'
            );

            this.processData(availabilityData, eventsData);
            this.updateViews();
        } catch (error) {
            console.error('Failed to load overview data:', error);
            this.showError('データの読み込みに失敗しました');
        }
    }

    processData(availabilityData, eventsData) {
        this.members.clear();
        
        // Process availability data
        availabilityData.forEach(item => {
            if (!this.members.has(item.member_name)) {
                this.members.set(item.member_name, {
                    name: item.member_name,
                    availability: [],
                    stats: { good: 0, ok: 0, bad: 0, total: 0 }
                });
            }
            
            const member = this.members.get(item.member_name);
            member.availability.push(item);
            member.stats[item.status]++;
            member.stats.total++;
        });

        // Store events for reference
        this.events = eventsData;
    }

    updateViews() {
        this.updateStats();
        this.updateMembersView();
        this.updateTimelineView();
        this.updateSummaryView();
    }

    updateStats() {
        document.getElementById('total-members').textContent = this.members.size;
        
        const totalAvailability = Array.from(this.members.values())
            .reduce((sum, member) => sum + member.stats.total, 0);
        document.getElementById('total-availability').textContent = totalAvailability;
        
        // Calculate common free slots (simplified)
        const commonSlots = this.calculateCommonFreeSlots();
        document.getElementById('common-free-slots').textContent = commonSlots;
    }

    updateMembersView() {
        const container = document.getElementById('members-list');
        
        if (this.members.size === 0) {
            container.innerHTML = '<div class="no-data">この期間にデータがありません</div>';
            return;
        }

        const membersHtml = Array.from(this.members.entries()).map(([name, data]) => {
            const goodPercent = data.stats.total > 0 ? (data.stats.good / data.stats.total * 100).toFixed(1) : 0;
            const okPercent = data.stats.total > 0 ? (data.stats.ok / data.stats.total * 100).toFixed(1) : 0;
            const badPercent = data.stats.total > 0 ? (data.stats.bad / data.stats.total * 100).toFixed(1) : 0;

            return `
                <div class="member-card">
                    <div class="member-header">
                        <h3 class="member-name">${name}</h3>
                        <div class="member-total">${data.stats.total}件の登録</div>
                    </div>
                    <div class="member-stats">
                        <div class="stat-bar">
                            <div class="stat-segment good" style="width: ${goodPercent}%"></div>
                            <div class="stat-segment ok" style="width: ${okPercent}%"></div>
                            <div class="stat-segment bad" style="width: ${badPercent}%"></div>
                        </div>
                        <div class="stat-labels">
                            <span class="stat-item">
                                <span class="stat-dot good"></span>
                                空き: ${data.stats.good} (${goodPercent}%)
                            </span>
                            <span class="stat-item">
                                <span class="stat-dot ok"></span>
                                調整可: ${data.stats.ok} (${okPercent}%)
                            </span>
                            <span class="stat-item">
                                <span class="stat-dot bad"></span>
                                忙しい: ${data.stats.bad} (${badPercent}%)
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = membersHtml;
    }

    updateTimelineView() {
        const container = document.getElementById('timeline-chart');
        
        if (this.members.size === 0) {
            container.innerHTML = '<div class="no-data">この期間にデータがありません</div>';
            return;
        }

        // Create calendar-style statistics view
        const calendarHtml = this.createStatsCalendar();
        container.innerHTML = calendarHtml;
    }

    createStatsCalendar() {
        const days = this.getDaysInPeriod();
        const dailyStats = this.calculateDailyStats(days);

        let html = `
            <div class="stats-calendar">
                <div class="calendar-legend">
                    <span class="legend-item"><span class="symbol good">○</span> 空いている</span>
                    <span class="legend-item"><span class="symbol ok">△</span> 条件付き</span>
                    <span class="legend-item"><span class="symbol bad">×</span> 空いていない</span>
                </div>
                <div class="calendar-grid">
        `;
        
        // Create calendar grid
        const startDate = new Date(this.currentPeriod.start);
        const endDate = new Date(this.currentPeriod.end);
        
        // Get first day of the month and calculate grid
        const firstDay = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        const lastDay = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);
        
        // Add day headers
        html += '<div class="calendar-header">';
        ['日', '月', '火', '水', '木', '金', '土'].forEach(day => {
            html += `<div class="day-header">${day}</div>`;
        });
        html += '</div>';
        
        // Add calendar days
        const startOfWeek = new Date(firstDay);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        
        let currentDate = new Date(startOfWeek);
        
        while (currentDate <= lastDay || currentDate.getDay() !== 0) {
            html += '<div class="calendar-week">';
            
            for (let i = 0; i < 7; i++) {
                const dateStr = currentDate.toISOString().split('T')[0];
                const isInPeriod = currentDate >= startDate && currentDate <= endDate;
                const stats = dailyStats[dateStr] || { good: 0, ok: 0, bad: 0, total: 0 };
                
                let cellClass = 'calendar-day';
                if (!isInPeriod) cellClass += ' outside-period';
                if (currentDate.toDateString() === new Date().toDateString()) cellClass += ' today';
                
                html += `
                    <div class="${cellClass}" data-date="${dateStr}">
                        <div class="day-number">${currentDate.getDate()}</div>
                        ${isInPeriod && stats.total > 0 ? `
                            <div class="day-stats">
                                ${stats.good > 0 ? `<span class="stat-count good">○${stats.good}</span>` : ''}
                                ${stats.ok > 0 ? `<span class="stat-count ok">△${stats.ok}</span>` : ''}
                                ${stats.bad > 0 ? `<span class="stat-count bad">×${stats.bad}</span>` : ''}
                            </div>
                        ` : ''}
                    </div>
                `;
                
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            html += '</div>';
            
            if (currentDate > lastDay && currentDate.getDay() === 0) break;
        }
        
        html += '</div></div>';
        return html;
    }

    calculateDailyStats(days) {
        const dailyStats = {};
        
        days.forEach(day => {
            const stats = { good: 0, ok: 0, bad: 0, total: 0 };
            
            Array.from(this.members.keys()).forEach(memberName => {
                const dayAvailability = this.getMemberDayAvailability(memberName, day);
                dayAvailability.forEach(item => {
                    stats[item.status]++;
                    stats.total++;
                });
            });
            
            if (stats.total > 0) {
                dailyStats[day] = stats;
            }
        });
        
        return dailyStats;
    }

    updateSummaryView() {
        const container = document.getElementById('summary-content');
        
        const bestDays = this.findBestAvailableDays();
        const recommendations = this.generateRecommendations();

        const summaryHtml = `
            <div class="summary-section">
                <h3>📅 おすすめの日程</h3>
                <div class="best-days">
                    ${bestDays.map(day => `
                        <div class="day-recommendation">
                            <div class="day-date">${day.date}</div>
                            <div class="day-score">${day.availableMembers}/${this.members.size} メンバーが空き</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="summary-section">
                <h3>💡 提案</h3>
                <div class="recommendations">
                    ${recommendations.map(rec => `
                        <div class="recommendation-item">
                            <div class="rec-icon">${rec.icon}</div>
                            <div class="rec-text">${rec.text}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        container.innerHTML = summaryHtml;
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.overview-tabs .tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-view`);
        });
    }

    // Helper methods
    getDaysInPeriod() {
        const days = [];
        const start = new Date(this.currentPeriod.start);
        const end = new Date(this.currentPeriod.end);
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            days.push(d.toISOString().split('T')[0]);
        }
        
        return days;
    }

    getMemberDayAvailability(memberName, day) {
        const member = this.members.get(memberName);
        if (!member) return [];
        
        return member.availability.filter(item => {
            const itemDate = new Date(item.start_time).toISOString().split('T')[0];
            return itemDate === day;
        });
    }

    getDominantStatus(availability) {
        if (availability.length === 0) return 'no-data';
        
        const counts = { good: 0, ok: 0, bad: 0 };
        availability.forEach(item => counts[item.status]++);
        
        const max = Math.max(counts.good, counts.ok, counts.bad);
        if (counts.good === max) return 'good';
        if (counts.ok === max) return 'ok';
        return 'bad';
    }

    calculateCommonFreeSlots() {
        // Simplified calculation - count days where all members have some availability
        const days = this.getDaysInPeriod();
        let commonDays = 0;
        
        days.forEach(day => {
            const membersWithAvailability = Array.from(this.members.keys()).filter(memberName => {
                const dayAvailability = this.getMemberDayAvailability(memberName, day);
                return dayAvailability.some(item => item.status === 'good' || item.status === 'ok');
            });
            
            if (membersWithAvailability.length === this.members.size) {
                commonDays++;
            }
        });
        
        return commonDays;
    }

    findBestAvailableDays() {
        const days = this.getDaysInPeriod();
        const dayScores = [];
        
        days.forEach(day => {
            const availableMembers = Array.from(this.members.keys()).filter(memberName => {
                const dayAvailability = this.getMemberDayAvailability(memberName, day);
                return dayAvailability.some(item => item.status === 'good');
            }).length;
            
            if (availableMembers > 0) {
                dayScores.push({
                    date: new Date(day).toLocaleDateString('ja-JP', { 
                        month: 'short', 
                        day: 'numeric',
                        weekday: 'short'
                    }),
                    availableMembers
                });
            }
        });
        
        return dayScores
            .sort((a, b) => b.availableMembers - a.availableMembers)
            .slice(0, 5);
    }

    generateRecommendations() {
        const recommendations = [];
        
        if (this.members.size === 0) {
            recommendations.push({
                icon: '📝',
                text: 'まずはメンバーに空き時間を入力してもらいましょう'
            });
        } else {
            const totalAvailability = Array.from(this.members.values())
                .reduce((sum, member) => sum + member.stats.total, 0);
            
            if (totalAvailability < this.members.size * 3) {
                recommendations.push({
                    icon: '⏰',
                    text: 'より多くの時間帯を登録すると、調整しやすくなります'
                });
            }
            
            const commonSlots = this.calculateCommonFreeSlots();
            if (commonSlots === 0) {
                recommendations.push({
                    icon: '🤝',
                    text: '全員が空いている時間がありません。調整可能な時間も検討してみてください'
                });
            } else {
                recommendations.push({
                    icon: '✨',
                    text: `${commonSlots}日間、全員が空いている可能性があります`
                });
            }
        }
        
        return recommendations;
    }

    showError(message) {
        const containers = [
            document.getElementById('members-list'),
            document.getElementById('timeline-chart'),
            document.getElementById('summary-content')
        ];
        
        containers.forEach(container => {
            if (container) {
                container.innerHTML = `<div class="error-message">${message}</div>`;
            }
        });
    }
}

// Create global instance
const memberOverview = new MemberOverview();

// Export for external access
window.showMemberOverview = () => memberOverview.show();
window.hideMemberOverview = () => memberOverview.hide();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => memberOverview.initialize());
} else {
    memberOverview.initialize();
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MemberOverview, memberOverview };
}