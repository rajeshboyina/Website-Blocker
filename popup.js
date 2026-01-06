console.log("popup loaded");
const RULE_ID = 1;
const killYouTube = {
    id: RULE_ID,
    priority: 1,
    action: { type: "block" },
    condition: {
        urlFilter: "youtube",
        resourceTypes: [
            "main_frame",
            "sub_frame",
            "xmlhttprequest",
            "media",
            "image",
            "script"
        ]
    }
};
const btn = document.getElementById("btn");

// INIT - Fixed: added .local
chrome.storage.local.get({ "enabled": false }, data => {
    updateUI(data.enabled);
});

// TOGGLE
btn.onclick = () => {
    chrome.storage.local.get({ "enabled": false }, (data) => {
        const enabled = !data.enabled;
        chrome.storage.local.set({ enabled });
        chrome.declarativeNetRequest.updateDynamicRules({
            addRules: enabled ? [killYouTube] : [],
            removeRuleIds: enabled ? [] : [RULE_ID]
        });
        updateUI(enabled);
    });
};

function updateUI(enabled) {
    btn.textContent = enabled ? "ON: YouTube Internet OFF" : "OFF: YouTube Normal";
}