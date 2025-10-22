// ============================================
// BACKGROUND SERVICE WORKER
// ============================================

let totalProcessed = 0;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
    console.log('[Metadata Shield] Extension installed');
    
    // Set default settings
    chrome.storage.sync.set({
        enabled: true,
        autoClean: true,
        showNotifications: true
    });
    
    // Set initial badge
    chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateBadge') {
        totalProcessed += request.count || 1;
        updateBadge(totalProcessed);
    }
    
    if (request.action === 'getTotal') {
        sendResponse({ total: totalProcessed });
    }
});

// Update badge
function updateBadge(count) {
    if (count > 0) {
        chrome.action.setBadgeText({ text: count.toString() });
        chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
    } else {
        chrome.action.setBadgeText({ text: '' });
    }
}

// Reset badge on new day
setInterval(() => {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
        totalProcessed = 0;
        updateBadge(0);
    }
}, 60000); // Check every minute
