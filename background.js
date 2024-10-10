let blockList = [];
let cookieBlockList = [];
let adBlockList = [];
let phishingBlockList = [];
let customBlockList = [];
let enableTrackerBlocking = true;
let enableCookieManagement = true;
let enableHTTPS = true;

// Function to load block lists
async function loadBlockLists() {
  try {
    blockList = await loadFile('blocklists/trackers.txt');
    cookieBlockList = await loadFile('blocklists/cookies.txt');
    adBlockList = await loadFile('blocklists/ads.txt');
    phishingBlockList = await loadFile('blocklists/phishing.txt');

    // Load custom block list from storage
    chrome.storage.sync.get({ customBlockList: [] }, (items) => {
      customBlockList = items.customBlockList;
      updateDynamicRules();
    });

    console.log('Block lists loaded');
  } catch (error) {
    console.error('Error loading block lists:', error);
  }
}

// Helper function to load a file and return its contents as an array of lines
async function loadFile(filePath) {
  const response = await fetch(chrome.runtime.getURL(filePath));
  const text = await response.text();
  return text.split('\n').map(line => line.trim()).filter(line => line);
}

// Function to update dynamic rules
function updateDynamicRules() {
  const allBlockedDomains = [...blockList, ...cookieBlockList, ...adBlockList, ...phishingBlockList, ...customBlockList];
  const rules = allBlockedDomains.map((domain, index) => ({
    id: index + 1,
    priority: 1,
    action: { type: 'block' },
    condition: { urlFilter: `*://*.${domain}/*` }
  }));

  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: rules.map(rule => rule.id),
    addRules: rules
  });
}

loadBlockLists();

chrome.runtime.onInstalled.addListener(loadBlockLists);
chrome.runtime.onStartup.addListener(loadBlockLists);

chrome.storage.onChanged.addListener((changes) => {
  if (changes.enableTrackerBlocking) enableTrackerBlocking = changes.enableTrackerBlocking.newValue;
  if (changes.enableCookieManagement) enableCookieManagement = changes.enableCookieManagement.newValue;
  if (changes.enableHTTPS) enableHTTPS = changes.enableHTTPS.newValue;
  if (changes.customBlockList) {
    customBlockList = changes.customBlockList.newValue;
    updateDynamicRules();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getTrackerDetails') {
    sendResponse({ blockList });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'deleteCurrentSiteCookies') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            chrome.cookies.getAll({ url: tab.url }, (cookies) => {
                cookies.forEach(cookie => {
                    chrome.cookies.remove({ url: tab.url, name: cookie.name });
                });
                sendResponse({ message: `Cookies for ${tab.url} have been deleted.` });
            });
        });
        return true; // To indicate asynchronous response
    } else if (message.action === 'deleteAllCookies') {
        chrome.cookies.getAll({}, (cookies) => {
            cookies.forEach(cookie => {
                chrome.cookies.remove({ url: `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`, name: cookie.name });
            });
            sendResponse({ message: 'All cookies have been deleted.' });
        });
        return true; // To indicate asynchronous response
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateDynamicRules') {
        updateDynamicRules();
        sendResponse({ message: 'Dynamic rules updated.' });
    }
});



