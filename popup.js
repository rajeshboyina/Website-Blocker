const toggleBtn = document.getElementById("toggleBtn");
const settingsBtn = document.getElementById("settingsBtn");
const statusText = document.getElementById("statusText");

let enabled = false;
let websitesData = {};

// Initialize
loadData();

// Toggle blocking on/off
toggleBtn.onclick = () => {
    enabled = !enabled;
    chrome.storage.local.set({ enabled }, () => {
        updateUI();
        updateRules();
    });
};

// Open settings page
settingsBtn.onclick = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("settings.html") });
};

// Load data
function loadData() {
    chrome.storage.local.get({ enabled: false, websitesData: {} }, (data) => {
        enabled = data.enabled;
        websitesData = data.websitesData;
        updateUI();
    });
}

// Update UI
function updateUI() {
    const websiteCount = Object.keys(websitesData).filter(url => websitesData[url]).length;
    
    if (enabled) {
        toggleBtn.textContent = "🔴 Blocking ON";
        toggleBtn.className = "blocking";
        statusText.textContent = `${websiteCount} website(s) blocked`;
    } else {
        toggleBtn.textContent = "🟢 Blocking OFF";
        toggleBtn.className = "";
        statusText.textContent = `${websiteCount} website(s) in list`;
    }
}

// Update blocking rules
function updateRules() {
    const enabledWebsites = Object.keys(websitesData).filter(url => websitesData[url]);
    
    if (!enabled || enabledWebsites.length === 0) {
        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: Array.from({ length: 100 }, (_, i) => i + 1)
        }, () => {
            refreshBlockedTabs();
        });
        return;
    }
    
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
    
    chrome.declarativeNetRequest.updateDynamicRules({
        addRules: rules,
        removeRuleIds: Array.from({ length: 100 }, (_, i) => i + 1)
    }, () => {
        refreshBlockedTabs();
    });
}

// Refresh blocked tabs
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