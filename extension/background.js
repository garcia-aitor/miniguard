// Keep track of blocked requests count and domains
let blockedCount = 0;
let blockedDomains = [];

// Restore state from storage when service worker wakes up
// This is critical in MV3 because the service worker can be killed at any time
(async () => {
  const stored = await chrome.storage.session.get([
    "blockedCount",
    "blockedDomains",
  ]);
  if (stored.blockedCount) blockedCount = stored.blockedCount;
  if (stored.blockedDomains) blockedDomains = stored.blockedDomains;
})();

// Listen for blocked requests
// onRuleMatchedDebug fires every time a DNR rule blocks a request
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
  blockedCount++;

  const hostname = new URL(info.request.url).hostname;
  if (!blockedDomains.includes(hostname)) {
    blockedDomains.unshift(hostname);
    blockedDomains = blockedDomains.slice(0, 5); // keep last 5
  }

  // Save state to storage so it survives service worker restarts
  chrome.storage.session.set({ blockedCount, blockedDomains });
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_STATS") {
    sendResponse({ blockedCount, blockedDomains });
  }
});
