/**
 * Performance Optimization Utilities for Band Sync Calendar
 */

class PerformanceOptimizer {
    constructor() {
        this.metrics = {};
        this.observers = [];
    }
    
    /**
     * Initialize performance monitoring
     */
    initialize() {
        this.setupPerformanceObserver();
        this.monitorMemoryUsage();
        this.optimizeEventListeners();
        console.log('[Performance] Optimizer initialized');
    }
    
    /**
     * Setup performance observer
     */
    setupPerformanceObserver() {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.recordMetric(entry.name, entry.duration);
                }
            });
            
            observer.observe({ entryTypes: ['measure', 'navigation'] });
            this.observers.push(observer);
        }
    }
    
    /**
     * Monitor memory usage
     */
    monitorMemoryUsage() {
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                this.metrics.memory = {
                    used: memory.usedJSHeapSize,
                    total: memory.totalJSHeapSize,
                    limit: memory.jsHeapSizeLimit,
                    timestamp: Date.now()
                };
                
                // Warn if memory usage is high
                const usage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
                if (usage > 0.8) {
                    console.warn('[Performance] High memory usage detected:', usage);
                }
            }, 30000); // Check every 30 seconds
        }
    }
    
    /**
     * Optimize event listeners with debouncing
     */
    optimizeEventListeners() {
        // Debounce resize events
        let resizeTimeout;
        const originalResize = window.addEventListener;
        
        window.addEventListener = function(type, listener, options) {
            if (type === 'resize') {
                const debouncedListener = function(event) {
                    clearTimeout(resizeTimeout);
                    resizeTimeout = setTimeout(() => listener(event), 250);
                };
                return originalResize.call(this, type, debouncedListener, options);
            }
            return originalResize.call(this, type, listener, options);
        };
    }
    
    /**
     * Record performance metric
     */
    recordMetric(name, value) {
        if (!this.metrics[name]) {
            this.metrics[name] = [];
        }
        
        this.metrics[name].push({
            value,
            timestamp: Date.now()
        });
        
        // Keep only last 100 entries
        if (this.metrics[name].length > 100) {
            this.metrics[name] = this.metrics[name].slice(-100);
        }
    }
    
    /**
     * Measure function execution time
     */
    measure(name, fn) {
        return async function(...args) {
            const start = performance.now();
            try {
                const result = await fn.apply(this, args);
                const duration = performance.now() - start;
                this.recordMetric(name, duration);
                return result;
            } catch (error) {
                const duration = performance.now() - start;
                this.recordMetric(`${name}_error`, duration);
                throw error;
            }
        }.bind(this);
    }
    
    /**
     * Optimize images with lazy loading
     */
    optimizeImages() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            imageObserver.unobserve(img);
                        }
                    }
                });
            });
            
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }
    
    /**
     * Preload critical resources
     */
    preloadCriticalResources() {
        const criticalResources = [
            'js/config.js',
            'js/storage.js',
            'js/api.js'
        ];
        
        criticalResources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'script';
            link.href = resource;
            document.head.appendChild(link);
        });
    }
    
    /**
     * Get performance report
     */
    getPerformanceReport() {
        const report = {
            metrics: this.metrics,
            memory: this.metrics.memory,
            timing: performance.timing,
            navigation: performance.navigation
        };
        
        // Calculate averages
        Object.keys(this.metrics).forEach(key => {
            if (Array.isArray(this.metrics[key])) {
                const values = this.metrics[key].map(m => m.value);
                report[`${key}_avg`] = values.reduce((a, b) => a + b, 0) / values.length;
                report[`${key}_max`] = Math.max(...values);
                report[`${key}_min`] = Math.min(...values);
            }
        });
        
        return report;
    }
    
    /**
     * Cleanup observers
     */
    cleanup() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
    }
}

// Utility functions for performance optimization
const PerformanceUtils = {
    /**
     * Debounce function calls
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    /**
     * Throttle function calls
     */
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    /**
     * Request idle callback with fallback
     */
    requestIdleCallback(callback, options = {}) {
        if ('requestIdleCallback' in window) {
            return window.requestIdleCallback(callback, options);
        } else {
            return setTimeout(callback, 1);
        }
    },
    
    /**
     * Batch DOM operations
     */
    batchDOMOperations(operations) {
        return new Promise(resolve => {
            this.requestIdleCallback(() => {
                const fragment = document.createDocumentFragment();
                operations.forEach(op => op(fragment));
                resolve(fragment);
            });
        });
    }
};

// Create global instance
const performanceOptimizer = new PerformanceOptimizer();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    performanceOptimizer.initialize();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PerformanceOptimizer, PerformanceUtils, performanceOptimizer };
}