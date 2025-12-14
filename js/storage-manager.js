/**
 * Storage Management UI for Band Sync Calendar
 * Provides interface for managing local storage, cache, and data
 */

class StorageManagerUI {
    constructor() {
        this.modal = null;
        this.isVisible = false;
    }
    
    /**
     * Initialize storage manager UI
     */
    initialize() {
        this.createModal();
        this.setupEventListeners();
        console.log('Storage manager UI initialized');
    }
    
    /**
     * Create storage management modal
     */
    createModal() {
        this.modal = document.createElement('div');
        this.modal.id = 'storage-manager';
        this.modal.className = 'storage-modal hidden';
        this.modal.innerHTML = `
            <div class="storage-modal-content">
                <div class="storage-header">
                    <h3>💾 ストレージ管理</h3>
                    <button class="storage-close" aria-label="閉じる">&times;</button>
                </div>
                
                <div class="storage-content">
                    <div class="storage-section">
                        <h4>使用状況</h4>
                        <div class="storage-usage">
                            <div class="usage-bar">
                                <div class="usage-fill"></div>
                            </div>
                            <div class="usage-text"></div>
                        </div>
                        <div class="storage-stats"></div>
                    </div>
                    
                    <div class="storage-section">
                        <h4>データ管理</h4>
                        <div class="storage-actions">
                            <button class="storage-btn" id="clear-cache-btn">
                                🗑️ キャッシュをクリア
                            </button>
                            <button class="storage-btn" id="export-data-btn">
                                📤 データをエクスポート
                            </button>
                            <button class="storage-btn" id="import-data-btn">
                                📥 データをインポート
                            </button>
                            <button class="storage-btn danger" id="clear-all-btn">
                                ⚠️ すべてのデータを削除
                            </button>
                        </div>
                    </div>
                    
                    <div class="storage-section">
                        <h4>詳細情報</h4>
                        <div class="storage-details"></div>
                    </div>
                </div>
                
                <input type="file" id="import-file-input" accept=".json" style="display: none;">
            </div>
        `;
        
        document.body.appendChild(this.modal);
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Close button
        const closeBtn = this.modal.querySelector('.storage-close');
        closeBtn.addEventListener('click', () => this.hide());
        
        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
        
        // Close on backdrop click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });
        
        // Action buttons
        document.getElementById('clear-cache-btn').addEventListener('click', () => {
            this.clearCache();
        });
        
        document.getElementById('export-data-btn').addEventListener('click', () => {
            this.exportData();
        });
        
        document.getElementById('import-data-btn').addEventListener('click', () => {
            this.importData();
        });
        
        document.getElementById('clear-all-btn').addEventListener('click', () => {
            this.clearAllData();
        });
        
        // File input for import
        document.getElementById('import-file-input').addEventListener('change', (e) => {
            this.handleFileImport(e);
        });
    }
    
    /**
     * Show storage manager
     */
    show() {
        if (this.isVisible) return;
        
        this.isVisible = true;
        this.modal.classList.remove('hidden');
        this.updateDisplay();
        
        // Focus management
        this.modal.focus();
    }
    
    /**
     * Hide storage manager
     */
    hide() {
        if (!this.isVisible) return;
        
        this.isVisible = false;
        this.modal.classList.add('hidden');
    }
    
    /**
     * Update display with current storage info
     */
    updateDisplay() {
        this.updateUsageDisplay();
        this.updateStatsDisplay();
        this.updateDetailsDisplay();
    }
    
    /**
     * Update usage bar and text
     */
    updateUsageDisplay() {
        const info = storage.getStorageInfo();
        if (!info) return;
        
        const usageFill = this.modal.querySelector('.usage-fill');
        const usageText = this.modal.querySelector('.usage-text');
        
        // Update progress bar
        usageFill.style.width = `${info.percentage}%`;
        
        // Color based on usage
        if (info.percentage < 50) {
            usageFill.style.background = '#27ae60';
        } else if (info.percentage < 80) {
            usageFill.style.background = '#f39c12';
        } else {
            usageFill.style.background = '#e74c3c';
        }
        
        // Update text
        usageText.textContent = `${storage.formatBytes(info.used)} / ${storage.formatBytes(info.quota)} (${info.percentage}%)`;
    }
    
    /**
     * Update statistics display
     */
    updateStatsDisplay() {
        const info = storage.getStorageInfo();
        if (!info) return;
        
        const statsContainer = this.modal.querySelector('.storage-stats');
        const health = storage.getHealthStatus();
        
        const healthEmoji = {
            'good': '✅',
            'warning': '⚠️',
            'critical': '🔴',
            'unknown': '❓'
        };
        
        statsContainer.innerHTML = `
            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">アイテム数</span>
                    <span class="stat-value">${info.itemCount}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">キャッシュ数</span>
                    <span class="stat-value">${info.cacheItems}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">ヘルス状態</span>
                    <span class="stat-value">${healthEmoji[health]} ${health}</span>
                </div>
            </div>
        `;
    }
    
    /**
     * Update details display
     */
    updateDetailsDisplay() {
        const detailsContainer = this.modal.querySelector('.storage-details');
        
        const nickname = storage.getNickname();
        const preferences = storage.getPreferences();
        const version = localStorage.getItem('band_sync_version');
        
        detailsContainer.innerHTML = `
            <div class="detail-item">
                <strong>ニックネーム:</strong> ${nickname || '未設定'}
            </div>
            <div class="detail-item">
                <strong>バージョン:</strong> ${version || '不明'}
            </div>
            <div class="detail-item">
                <strong>デフォルトビュー:</strong> ${preferences.defaultView || '未設定'}
            </div>
            <div class="detail-item">
                <strong>自動更新:</strong> ${preferences.autoRefresh ? '有効' : '無効'}
            </div>
        `;
    }
    
    /**
     * Clear cache
     */
    clearCache() {
        if (confirm('キャッシュをクリアしますか？\n（ニックネームや設定は保持されます）')) {
            try {
                storage.clearCache();
                this.updateDisplay();
                this.showMessage('キャッシュをクリアしました', 'success');
            } catch (error) {
                this.showMessage('キャッシュのクリアに失敗しました', 'error');
            }
        }
    }
    
    /**
     * Export data
     */
    exportData() {
        try {
            const data = storage.exportData();
            if (!data) {
                this.showMessage('エクスポートに失敗しました', 'error');
                return;
            }
            
            // Create download
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `band-sync-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showMessage('データをエクスポートしました', 'success');
        } catch (error) {
            this.showMessage('エクスポートに失敗しました', 'error');
        }
    }
    
    /**
     * Import data
     */
    importData() {
        document.getElementById('import-file-input').click();
    }
    
    /**
     * Handle file import
     */
    handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const success = storage.importData(e.target.result);
                if (success) {
                    this.updateDisplay();
                    this.showMessage('データをインポートしました', 'success');
                    
                    // Refresh the app
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                } else {
                    this.showMessage('インポートに失敗しました', 'error');
                }
            } catch (error) {
                this.showMessage('ファイルの読み込みに失敗しました', 'error');
            }
        };
        
        reader.readAsText(file);
        
        // Reset file input
        event.target.value = '';
    }
    
    /**
     * Clear all data
     */
    clearAllData() {
        const confirmation = prompt(
            'すべてのデータを削除します。\n' +
            'この操作は取り消せません。\n\n' +
            '続行するには "DELETE" と入力してください:'
        );
        
        if (confirmation === 'DELETE') {
            try {
                storage.clearAll();
                this.updateDisplay();
                this.showMessage('すべてのデータを削除しました', 'success');
                
                // Reload page after delay
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } catch (error) {
                this.showMessage('削除に失敗しました', 'error');
            }
        }
    }
    
    /**
     * Show message
     */
    showMessage(message, type = 'info') {
        // Use network status manager if available
        if (typeof networkStatusManager !== 'undefined') {
            networkStatusManager.showMessage(message, type);
        } else {
            alert(message);
        }
    }
    
    /**
     * Toggle display
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
}

// Create global instance
const storageManagerUI = new StorageManagerUI();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    storageManagerUI.initialize();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StorageManagerUI, storageManagerUI };
}