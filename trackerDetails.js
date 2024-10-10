document.addEventListener('DOMContentLoaded', function() {
    const trackerDetailContainer = document.getElementById('tracker-detail-container');
  
    chrome.runtime.sendMessage({ action: 'getTrackerDetails', tabId: null }, (response) => {
      response.forEach(tracker => {
        const trackerElement = document.createElement('div');
        trackerElement.className = 'tracker-detail';
        trackerElement.textContent = `Blocked: ${tracker.url}`;
        trackerDetailContainer.appendChild(trackerElement);
      });
    });
  });
  