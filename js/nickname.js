/**
 * Nickname Management for Band Sync Calendar
 * Handles user identification without formal authentication
 */

class NicknameManager {
    constructor() {
        this.modal = null;
        this.callback = null;
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
        const input = document.getElementById('nickname-input');
        const submitBtn = document.getElementById('nickname-submit');
        
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.saveNickname());
        }
        
        if (input) {
            // Submit on Enter key
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.saveNickname();
                }
            });
            
            // Real-time validation
            input.addEventListener('input', () => {
                this.validateInput();
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
        
        // Focus input
        const input = document.getElementById('nickname-input');
        if (input) {
            input.value = '';
            input.focus();
        }
        
        this.validateInput();
    }
    
    hide() {
        if (!this.modal) return;
        
        this.modal.classList.add('hidden');
        this.callback = null;
    }
    
    validateInput() {
        const input = document.getElementById('nickname-input');
        const submitBtn = document.getElementById('nickname-submit');
        
        if (!input || !submitBtn) return;
        
        const value = input.value.trim();
        const isValid = value.length > 0 && value.length <= CONFIG.MAX_NICKNAME_LENGTH;
        
        submitBtn.disabled = !isValid;
        
        // Update input styling
        input.style.borderColor = value.length === 0 ? '' : (isValid ? '#27ae60' : '#e74c3c');
        
        // Show character count
        this.updateCharacterCount(value.length);
    }
    
    updateCharacterCount(count) {
        let counter = document.getElementById('char-counter');
        
        if (!counter) {
            counter = document.createElement('div');
            counter.id = 'char-counter';
            counter.style.cssText = 'font-size: 0.8rem; color: #666; margin-top: 0.5rem; text-align: right;';
            
            const input = document.getElementById('nickname-input');
            if (input && input.parentNode) {
                input.parentNode.insertBefore(counter, input.nextSibling);
            }
        }
        
        counter.textContent = `${count}/${CONFIG.MAX_NICKNAME_LENGTH}`;
        counter.style.color = count > CONFIG.MAX_NICKNAME_LENGTH ? '#e74c3c' : '#666';
    }
    
    saveNickname() {
        const input = document.getElementById('nickname-input');
        const submitBtn = document.getElementById('nickname-submit');
        
        if (!input) return;
        
        const nickname = input.value.trim();
        
        // Validate nickname
        if (!nickname) {
            this.showError('ニックネームを入力してください。');
            return;
        }
        
        if (nickname.length > CONFIG.MAX_NICKNAME_LENGTH) {
            this.showError(`ニックネームは${CONFIG.MAX_NICKNAME_LENGTH}文字以内で入力してください。`);
            return;
        }
        
        // Check for invalid characters
        if (this.containsInvalidCharacters(nickname)) {
            this.showError('使用できない文字が含まれています。');
            return;
        }
        
        // Save to storage
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '保存中...';
        }
        
        try {
            const success = storage.setNickname(nickname);
            
            if (success) {
                console.log('Nickname saved:', nickname);
                this.hide();
                
                // Execute callback if provided
                if (this.callback && typeof this.callback === 'function') {
                    this.callback();
                }
                
                // Update display
                this.updateNicknameDisplay(nickname);
            } else {
                this.showError('ニックネームの保存に失敗しました。');
            }
        } catch (error) {
            console.error('Failed to save nickname:', error);
            this.showError('ニックネームの保存に失敗しました。');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '設定';
            }
        }
    }
    
    containsInvalidCharacters(nickname) {
        // Check for potentially problematic characters
        const invalidChars = /[<>\"'&]/;
        return invalidChars.test(nickname);
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
    
    // Show change nickname dialog
    showChangeDialog() {
        const currentNickname = this.getCurrentNickname();
        const newNickname = prompt(`現在のニックネーム: ${currentNickname}\n\n新しいニックネームを入力してください:`, currentNickname);
        
        if (newNickname !== null && newNickname.trim() !== currentNickname) {
            const trimmed = newNickname.trim();
            
            if (trimmed.length === 0) {
                this.showError('ニックネームを入力してください。');
                return;
            }
            
            if (trimmed.length > CONFIG.MAX_NICKNAME_LENGTH) {
                this.showError(`ニックネームは${CONFIG.MAX_NICKNAME_LENGTH}文字以内で入力してください。`);
                return;
            }
            
            if (this.containsInvalidCharacters(trimmed)) {
                this.showError('使用できない文字が含まれています。');
                return;
            }
            
            const success = storage.setNickname(trimmed);
            if (success) {
                this.updateNicknameDisplay(trimmed);
                alert('ニックネームを変更しました。');
            } else {
                this.showError('ニックネームの変更に失敗しました。');
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