const urlInput = document.getElementById("urlInput");
const addBtn = document.getElementById("addBtn");
const websiteList = document.getElementById("websiteList");
const masterToggle = document.getElementById("masterToggle");
const statusBadge = document.getElementById("statusBadge");

let websitesData = {}; // Changed to object: { "youtube.com": true, "facebook.com": false }
let enabled = false;

// Initialize
loadData();

// Add website
addBtn.onclick = () => {
    const url = urlInput.value.trim();
    if (url && !websitesData[url]) {
        websitesData[url] = true; // Add as enabled by default
        saveData();
        urlInput.value = "";
        renderList();
        updateRules();
    }
};

// Enter key to add
urlInput.onkeypress = (e) => {
    if (e.key === "Enter") {
        addBtn.click();
    }
};

// Master toggle
masterToggle.onchange = () => {
    enabled = masterToggle.checked;
    saveData();
    updateRules();
    updateStatusBadge();
};

// Toggle individual website
function toggleWebsite(url) {
    websitesData[url] = !websitesData[url];
    saveData();
    renderList();
    updateRules();
}

// Remove website
function removeWebsite(url) {
    delete websitesData[url];
    saveData();
    renderList();
    updateRules();
}

// Render website list
function renderList() {
    const websites = Object.keys(websitesData);
    
    if (websites.length === 0) {
        websiteList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🌍</div>
                <p class="empty-state-text">No websites blocked yet. Add one above!</p>
            </div>
        `;
        return;
    }
    
    websiteList.innerHTML = websites.map(url => {
        const isEnabled = websitesData[url];
        return `
            <div class="website-item ${!isEnabled ? 'disabled' : ''}">
                <div class="website-left">
                    <input 
                        type="checkbox" 
                        class="website-checkbox" 
                        ${isEnabled ? 'checked' : ''} 
                        onchange="toggleWebsite('${url}')"
                    >
                    <span class="website-url">${url}</span>
                </div>
                <button class="btn-remove" onclick="removeWebsite('${url}')">Remove</button>
            </div>
        `;
    }).join("");
}

// Save data
function saveData() {
    chrome.storage.local.set({ websitesData, enabled });
}

// Load data
function loadData() {
    chrome.storage.local.get({ websitesData: {}, enabled: false }, (data) => {
        websitesData = data.websitesData;
        enabled = data.enabled;
        masterToggle.checked = enabled;
        renderList();
        updateStatusBadge();
    });
}

// Update status badge
function updateStatusBadge() {
    if (enabled) {
        statusBadge.textContent = "ON";
        statusBadge.className = "status active";
    } else {
        statusBadge.textContent = "OFF";
        statusBadge.className = "status inactive";
    }
}

// Update blocking rules
function updateRules() {
    // Get only enabled websites
    const enabledWebsites = Object.keys(websitesData).filter(url => websitesData[url]);
    
    if (!enabled || enabledWebsites.length === 0) {
        // Remove all rules
        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: Array.from({ length: 100 }, (_, i) => i + 1)
        }, () => {
            refreshBlockedTabs();
        });
        return;
    }
    
    // Create rules for each enabled website
    const rules = enabledWebsites.map((url, index) => ({
        id: index + 1,
        priority: 1,
        action: { type: "block" },
        condition: {
            urlFilter: url,
            resourceTypes: [
                "main_frame",
                "sub_frame",
                "xmlhttprequest",
                "media",
                "image",
                "script"
            ]
        }
    }));
    
    // Update rules
    chrome.declarativeNetRequest.updateDynamicRules({
        addRules: rules,
        removeRuleIds: Array.from({ length: 100 }, (_, i) => i + 1)
    }, () => {
        refreshBlockedTabs();
    });
}

// Refresh all tabs matching blocked websites
function refreshBlockedTabs() {
    const allWebsites = Object.keys(websitesData);
    if (allWebsites.length === 0) return;
    
    const patterns = allWebsites.map(url => `*://*${url}*/*`);
    
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            const matches = patterns.some(pattern => {
                const regex = new RegExp(pattern.replace(/\*/g, ".*"));
                return regex.test(tab.url);
            });
            if (matches) {
                chrome.tabs.reload(tab.id);
            }
        });
    });
}

// Make functions globally accessible
window.toggleWebsite = toggleWebsite;
window.removeWebsite = removeWebsite;