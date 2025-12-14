/**
 * Member Selection for Band Sync Calendar
 * Handles user identification from predefined band members
 */

class NicknameManager {
    constructor() {
        this.modal = null;
        this.callback = null;
        this.predefinedMembers = ['COKAI', 'YUSUKE', 'ZEN', 'YAMCHI', 'テスト', 'USER'];
    }
    
    initialize() {
        this.modal = document.getElementById('nickname-modal');
        if (!this.modal) {
            console.error('Nickname modal not found');
            return;
        }
        
        this.setupEventListeners();
        console.log('Nickname manager initialized');
    }
    
    setupEventListeners() {
        const select = document.getElementById('member-select');
        const submitBtn = document.getElementById('nickname-submit');
        
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.saveMemberSelection());
        }
        
        if (select) {
            // Enable submit button when selection is made
            select.addEventListener('change', () => {
                this.validateSelection();
            });
            
            // Submit on Enter key
            select.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && select.value) {
                    this.saveMemberSelection();
                }
            });
        }
        
        // Prevent modal close by clicking outside
        this.modal.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    show(callback = null) {
        if (!this.modal) return;
        
        this.callback = callback;
        this.modal.classList.remove('hidden');
        
        // Focus select and reset
        const select = document.getElementById('member-select');
        if (select) {
            select.value = '';
            select.focus();
        }
        
        this.validateSelection();
    }
    
    hide() {
        if (!this.modal) return;
        
        this.modal.classList.add('hidden');
        this.callback = null;
    }
    
    validateSelection() {
        const select = document.getElementById('member-select');
        const submitBtn = document.getElementById('nickname-submit');
        
        if (!select || !submitBtn) return;
        
        const selectedMember = select.value;
        const isValid = selectedMember && this.predefinedMembers.includes(selectedMember);
        
        submitBtn.disabled = !isValid;
        
        // Update select styling
        select.style.borderColor = selectedMember ? '#27ae60' : '';
    }
    
    saveMemberSelection() {
        const select = document.getElementById('member-select');
        const submitBtn = document.getElementById('nickname-submit');
        
        if (!select) return;
        
        const selectedMember = select.value;
        
        // Validate selection
        if (!selectedMember) {
            this.showError('メンバーを選択してください。');
            return;
        }
        
        if (!this.predefinedMembers.includes(selectedMember)) {
            this.showError('無効なメンバーが選択されています。');
            return;
        }
        
        // Save to storage
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '保存中...';
        }
        
        try {
            const success = storage.setNickname(selectedMember);
            
            if (success) {
                console.log('Member selected:', selectedMember);
                this.hide();
                
                // Execute callback if provided
                if (this.callback && typeof this.callback === 'function') {
                    this.callback();
                }
                
                // Update display
                this.updateNicknameDisplay(selectedMember);
                
                // Show welcome message
                this.showWelcomeMessage(selectedMember);
            } else {
                this.showError('メンバー選択の保存に失敗しました。');
            }
        } catch (error) {
            console.error('Failed to save member selection:', error);
            this.showError('メンバー選択の保存に失敗しました。');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '選択';
            }
        }
    }
    
    showWelcomeMessage(memberName) {
        // Show a brief welcome message
        setTimeout(() => {
            alert(`ようこそ、${memberName}さん！\n\n同じメンバーで新しいデータを保存すると、以前のデータは上書きされます。`);
        }, 500);
    }
    
    updateNicknameDisplay(nickname) {
        const display = document.getElementById('nickname-display');
        if (display) {
            display.textContent = `ユーザー: ${nickname}`;
        }
    }
    
    showError(message) {
        // Simple error display - could be enhanced
        alert(message);
    }
    
    // Check if nickname is set
    hasNickname() {
        return !!storage.getNickname();
    }
    
    // Get current nickname
    getCurrentNickname() {
        return storage.getNickname();
    }
    
    // Clear nickname (for logout functionality)
    clearNickname() {
        const success = storage.clearNickname();
        if (success) {
            const display = document.getElementById('nickname-display');
            if (display) {
                display.textContent = '';
            }
        }
        return success;
    }
    
    // Show change member dialog
    showChangeDialog() {
        const currentMember = this.getCurrentNickname();
        const memberOptions = this.predefinedMembers.map((member, index) => 
            `${index + 1}. ${member}${member === currentMember ? ' (現在)' : ''}`
        ).join('\n');
        
        const message = `現在のメンバー: ${currentMember}\n\n利用可能なメンバー:\n${memberOptions}\n\n新しいメンバー名を入力してください:`;
        const newMember = prompt(message);
        
        if (newMember !== null && newMember.trim() !== currentMember) {
            const trimmed = newMember.trim();
            
            if (!trimmed) {
                this.showError('メンバーを選択してください。');
                return;
            }
            
            if (!this.predefinedMembers.includes(trimmed)) {
                this.showError('無効なメンバー名です。利用可能なメンバー: ' + this.predefinedMembers.join(', '));
                return;
            }
            
            const success = storage.setNickname(trimmed);
            if (success) {
                this.updateNicknameDisplay(trimmed);
                alert(`メンバーを${trimmed}に変更しました。\n\n注意: 同じメンバーで新しいデータを保存すると、以前のデータは上書きされます。`);
            } else {
                this.showError('メンバー変更に失敗しました。');
            }
        }
    }
}

// Create global instance
const nicknameManager = new NicknameManager();

// Global functions for external access
window.showNicknameModal = (callback) => nicknameManager.show(callback);
window.initializeNickname = () => nicknameManager.initialize();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    nicknameManager.initialize();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NicknameManager, nicknameManager };
}