document.addEventListener('DOMContentLoaded', function () {
    const blockCountElement = document.getElementById('block-count');
    const currentSiteElement = document.getElementById('current-site');
    const trackerDetailsElement = document.getElementById('tracker-details');
    const removePopupsButton = document.getElementById('remove-popups');
    const addBlockDomainButton = document.getElementById('add-block-domain');
    const blockDomainInput = document.getElementById('block-domain-input');
    const customBlockListElement = document.getElementById('custom-block-list');
    const toggleDarkModeButton = document.getElementById('toggle-dark-mode');
    const toggleTrackerDetailsButton = document.getElementById('toggle-tracker-details');
    const deleteCurrentCookiesButton = document.getElementById('delete-current-cookies');
    const deleteAllCookiesButton = document.getElementById('delete-all-cookies');
    const statusMessageElement = document.getElementById('status-message');
    const popupBody = document.body;
    const searchQueryInput = document.getElementById('search-query');
    const searchButton = document.getElementById('search-button');

    let trackerDetailsVisible = false;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab.url.startsWith('chrome://')) {
            blockCountElement.textContent = 'N/A';
            currentSiteElement.textContent = 'chrome:// pages are not processed';
            return; 
        }

        chrome.runtime.sendMessage({ action: 'getTrackerDetails', tabId: tab.id }, (response) => {
            blockCountElement.textContent = response.blockList.length;
            currentSiteElement.textContent = new URL(tab.url).hostname;
        });
    });

    toggleTrackerDetailsButton.addEventListener('click', () => {
        if (trackerDetailsVisible) {
            // Hide tracker details
            trackerDetailsElement.innerHTML = '';
            toggleTrackerDetailsButton.textContent = 'Show Tracker Details';
        } else {
            // Show tracker details
            chrome.runtime.sendMessage({ action: 'getTrackerDetails' }, (response) => {
                trackerDetailsElement.innerHTML = '';
                response.blockList.forEach(tracker => {
                    const trackerElement = document.createElement('div');
                    trackerElement.textContent = `Blocked: ${tracker}`;
                    trackerDetailsElement.appendChild(trackerElement);
                });
            });
            toggleTrackerDetailsButton.textContent = 'Hide Tracker Details';
        }
        trackerDetailsVisible = !trackerDetailsVisible;
    });

    deleteCurrentCookiesButton.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            chrome.cookies.getAll({ url: tab.url }, (cookies) => {
                cookies.forEach(cookie => {
                    chrome.cookies.remove({ url: tab.url, name: cookie.name });
                });
                statusMessageElement.textContent = `Cookies for ${tab.url} have been deleted.`;
                setTimeout(() => {
                    statusMessageElement.textContent = '';
                }, 3000); // Clear status message after 3 seconds
            });
        });
    });

    deleteAllCookiesButton.addEventListener('click', () => {
        chrome.cookies.getAll({}, (cookies) => {
            cookies.forEach(cookie => {
                chrome.cookies.remove({ url: `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`, name: cookie.name });
            });
            statusMessageElement.textContent = 'All cookies have been deleted.';
            setTimeout(() => {
                statusMessageElement.textContent = '';
            }, 3000); // Clear status message after 3 seconds
        });
    });

    removePopupsButton.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                function: removePopups
            });
        });
    });

    addBlockDomainButton.addEventListener('click', () => {
        const domain = blockDomainInput.value.trim();
        if (domain) {
            chrome.storage.sync.get({ customBlockList: [] }, (items) => {
                const customBlockList = items.customBlockList;
                customBlockList.push(domain);
                chrome.storage.sync.set({ customBlockList }, () => {
                    const li = document.createElement('li');
                    li.textContent = domain;
                    customBlockListElement.appendChild(li);
                    // Update dynamic rules
                    chrome.runtime.sendMessage({ action: 'updateDynamicRules' });
                });
            });
        }
    });

    chrome.storage.sync.get({ customBlockList: [] }, (items) => {
        items.customBlockList.forEach(domain => {
            const li = document.createElement('li');
            li.textContent = domain;
            customBlockListElement.appendChild(li);
        });
    });

    toggleDarkModeButton.addEventListener('click', () => {
        popupBody.classList.toggle('dark-mode');
    });

    searchButton.addEventListener('click', () => {
        const query = searchQueryInput.value.trim();
        if (query) {
            const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
            chrome.tabs.create({ url });
        }
    });

    function removePopups() {
        const popups = document.querySelectorAll('[role="dialog"], .popup, .modal, .overlay');
        popups.forEach(popup => popup.remove());
    }
});
