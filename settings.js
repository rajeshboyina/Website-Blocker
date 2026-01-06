const urlInput = document.getElementById("urlInput");
const addBtn = document.getElementById("addBtn");
const websiteList = document.getElementById("websiteList");
const masterToggle = document.getElementById("masterToggle");
const statusBadge = document.getElementById("statusBadge");

let websites = [];
let enabled = false;

// Initialize
loadData();

// Add website
addBtn.onclick = () => {
    const url = urlInput.value.trim();
    if (url && !websites.includes(url)) {
        websites.push(url);
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

// Remove website
function removeWebsite(url) {
    websites = websites.filter(w => w !== url);
    saveData();
    renderList();
    updateRules();
}

// Render website list
function renderList() {
    if (websites.length === 0) {
        websiteList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🌍</div>
                <p class="empty-state-text">No websites blocked yet. Add one above!</p>
            </div>
        `;
        return;
    }
    
    websiteList.innerHTML = websites.map(url => `
        <div class="website-item">
            <span class="website-url">${url}</span>
            <button class="btn-remove" onclick="removeWebsite('${url}')">Remove</button>
        </div>
    `).join("");
}

// Save data
function saveData() {
    chrome.storage.local.set({ websites, enabled });
}

// Load data
function loadData() {
    chrome.storage.local.get({ websites: [], enabled: false }, (data) => {
        websites = data.websites;
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
    if (!enabled || websites.length === 0) {
        // Remove all rules
        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: Array.from({ length: 100 }, (_, i) => i + 1)
        }, () => {
            refreshBlockedTabs();
        });
        return;
    }
    
    // Create rules for each website
    const rules = websites.map((url, index) => ({
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
    if (websites.length === 0) return;
    
    const patterns = websites.map(url => `*://*${url}*/*`);
    
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

// Make removeWebsite globally accessible
window.removeWebsite = removeWebsite;