// popup.js

document.addEventListener('DOMContentLoaded', async () => {
  // Get references to tab buttons and content areas
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  // Get references to elements in the 'Current Emails' tab
  const currentEmailsTab = document.getElementById('currentEmailsTab');
  const manualScanButton = document.getElementById('manualScanButton');
  const copyCurrentEmailsButton = document.getElementById('copyCurrentEmailsButton');
  const downloadCurrentEmailsButton = document.getElementById('downloadCurrentEmailsButton');
  const emailList = document.getElementById('emailList');
  const statusMessage = document.getElementById('statusMessage');

  // Get references to elements in the 'All Emails' tab
  const allEmailsTab = document.getElementById('allEmailsTab');
  const allEmailsStatusMessage = document.getElementById('allEmailsStatusMessage');
  const allEmailsListDisplay = document.getElementById('allEmailsListDisplay');
  const copyAllEmailsButton = document.getElementById('copyAllEmailsButton');
  const clearAllEmailsButton = document.getElementById('clearAllEmailsButton');
  const downloadAllEmailsButton = document.getElementById('downloadAllEmailsButton');
  const exportAllEmailsButton = document.getElementById('exportAllEmailsButton'); // Get reference to the new button
  const exportGmailButton = document.getElementById('exportGmailButton'); // Get reference to the new button
  const exportYahooButton = document.getElementById('exportYahooButton'); // Get reference to the new button
  const exportOtherButton = document.getElementById('exportOtherButton'); // Get reference to the new button

  // Get references to elements in the 'Settings' tab
  const settingsTab = document.getElementById('settingsTab');
  const settingsContent = document.getElementById('settingsContent'); // Placeholder for settings

  let currentEmails = []; // To store emails from the current page scan
  let allStoredEmails = []; // To store all emails from storage

  // Get references to settings inputs
  const collectFromAllTabsCheckbox = document.getElementById('collectFromAllTabs');
  const automaticScanToggle = document.getElementById('automaticScanToggle');

  // Function to display emails in the 'Current Emails' tab
  function displayCurrentEmails(emails) {
    currentEmails = emails; // Store for copy/download
    emailList.innerHTML = ''; // Clear previous list
    if (emails && emails.length > 0) {
      emails.forEach(email => {
        const li = document.createElement('li');
        li.textContent = email;
        emailList.appendChild(li);
      });
      statusMessage.textContent = `Found ${emails.length} email(s) on this page.`;
    } else {
      statusMessage.textContent = 'No emails found on this page yet.';
    }
  }

  // Function to display emails in the 'All Emails' tab
  function displayAllEmails(emails) {
    allStoredEmails = emails; // Store for copy/download
    if (emails && emails.length > 0) {
      allEmailsListDisplay.value = emails.join('\n');
      allEmailsStatusMessage.textContent = `Total stored emails: ${emails.length}`;
    } else {
      allEmailsListDisplay.value = '';
      allEmailsStatusMessage.textContent = 'No emails stored yet.';
    }
  }

  // Function to switch tabs
  function switchTab(tabId) {
    tabContents.forEach(content => {
      content.classList.remove('active');
    });
    tabButtons.forEach(button => {
      button.classList.remove('active');
    });

    document.getElementById(tabId).classList.add('active');
    document.querySelector(`.tab-button[data-tab="${tabId}"]`).classList.add('active');

    // Fetch data when switching to specific tabs
    if (tabId === 'allEmailsTab') {
      fetchAndDisplayAllEmails();
    } else if (tabId === 'settingsTab') {
      fetchAndDisplaySettings(); // Implement this function later
    }
  }

  // Fetch and display all stored emails
  async function fetchAndDisplayAllEmails() {
     allEmailsStatusMessage.textContent = 'Loading stored emails...';
     chrome.runtime.sendMessage({ action: "getStoredEmails" }, (response) => {
        if (response && response.emails) {
          displayAllEmails(response.emails);
        } else if (response && response.error) {
          allEmailsStatusMessage.textContent = `Error loading emails: ${response.error}`;
        } else {
           allEmailsStatusMessage.textContent = 'No emails stored yet.';
        }
     });
  }

   // Fetch and display settings (Placeholder)
  // Fetch and display settings
 async function fetchAndDisplaySettings() {
     // Fetch settings from storage
     const settings = await chrome.storage.local.get(['collectFromAllTabs', 'automaticScanEnabled']);
     // Populate the checkboxes
     collectFromAllTabsCheckbox.checked = settings.collectFromAllTabs ?? true; // Default to true
     automaticScanToggle.checked = settings.automaticScanEnabled ?? false; // Default to false
  }

  // Save settings to storage and inform service worker
  async function saveSettings() {
     const collectFromAllTabs = collectFromAllTabsCheckbox.checked;
     const automaticScanEnabled = automaticScanToggle.checked;
     await chrome.storage.local.set({
       collectFromAllTabs: collectFromAllTabs,
       automaticScanEnabled: automaticScanEnabled
     });
     console.log('Email Extractor Popup: Settings saved:', { collectFromAllTabs, automaticScanEnabled });
     // Inform service worker about the setting change
     chrome.runtime.sendMessage({ action: 'settingChanged', setting: 'collectFromAllTabs', value: collectFromAllTabs });
     chrome.runtime.sendMessage({ action: 'settingChanged', setting: 'automaticScanEnabled', value: automaticScanEnabled });
 }


 // Listen for messages from the service worker or content script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "storedEmailsUpdated") {
      // Service worker sent updated list of stored emails
      // Update both current and all emails display in case the user is on either tab
      // Note: content script now sends emails directly to service worker,
      // so currentEmails needs to be updated by a separate message if needed,
      // or we rely solely on stored emails for display.
      // For simplicity now, we'll update all emails display.
      fetchAndDisplayAllEmails(); // Re-fetch and display all emails
    } else if (request.status === "error") {
      // Handle errors from content script or service worker
      statusMessage.textContent = `Error: ${request.errorMessage}`;
      allEmailsStatusMessage.textContent = `Error: ${request.errorMessage}`;
    } else if (request.action === "currentEmailsFound") {
        // Message from content script with emails found on the current page
        displayCurrentEmails(request.emails);
    }
    // Add other message handlers as needed
  });

  // --- Button Event Listeners ---

  // Tab Button Event Listeners
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      switchTab(button.dataset.tab);
    });
  });

  // Manual Scan Button (Current Emails Tab)
  manualScanButton.addEventListener('click', () => {
    statusMessage.textContent = 'Scanning...';
    emailList.innerHTML = ''; // Clear previous list
    // Send message to content script to trigger a scan
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "manualScan" });
      } else {
        statusMessage.textContent = 'Error: Could not find active tab.';
      }
    });
    // Emails will be sent back via 'currentEmailsFound' message
  });

  // Copy Current Emails Button (Current Emails Tab)
  copyCurrentEmailsButton.addEventListener('click', () => {
    if (currentEmails.length > 0) {
      const emailsString = currentEmails.join('\n');
      navigator.clipboard.writeText(emailsString).then(() => {
        statusMessage.textContent = 'Current emails copied to clipboard!';
        setTimeout(() => {
          statusMessage.textContent = `Found ${currentEmails.length} email(s) on this page.`;
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy emails:', err);
        statusMessage.textContent = 'Failed to copy current emails.';
      });
    } else {
      statusMessage.textContent = 'No current emails to copy.';
    }
  });

  // Download Current Emails Button (Current Emails Tab)
  downloadCurrentEmailsButton.addEventListener('click', () => {
    if (currentEmails.length > 0) {
      const emailsString = currentEmails.join('\n');
      const blob = new Blob([emailsString], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'current_page_emails.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      statusMessage.textContent = 'Current emails downloaded.';
       setTimeout(() => {
          statusMessage.textContent = `Found ${currentEmails.length} email(s) on this page.`;
        }, 2000);
    } else {
      statusMessage.textContent = 'No current emails to download.';
    }
  });

  // Copy All Emails Button (All Emails Tab)
  copyAllEmailsButton.addEventListener('click', () => {
    if (allStoredEmails.length > 0) {
      const emailsString = allStoredEmails.join('\n');
      navigator.clipboard.writeText(emailsString).then(() => {
        allEmailsStatusMessage.textContent = 'All emails copied to clipboard!';
        setTimeout(() => {
          allEmailsStatusMessage.textContent = `Total stored emails: ${allStoredEmails.length}`;
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy all emails:', err);
        allEmailsStatusMessage.textContent = 'Failed to copy all emails.';
      });
    } else {
      allEmailsStatusMessage.textContent = 'No emails to copy.';
    }
  });

  // Clear All Emails Button (All Emails Tab)
  clearAllEmailsButton.addEventListener('click', () => {
    // Send a message to the service worker to clear stored emails
    chrome.runtime.sendMessage({ action: "clearAllEmails" });
    // Display will be updated by service worker's storedEmailsUpdated message
    allEmailsStatusMessage.textContent = 'Clearing all emails...'; // Provide immediate feedback
  });

  // Download All Emails Button (All Emails Tab)
  downloadAllEmailsButton.addEventListener('click', () => {
    if (allStoredEmails.length > 0) {
      const emailsString = allStoredEmails.join('\n');
      const blob = new Blob([emailsString], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'all_collected_emails.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      allEmailsStatusMessage.textContent = 'All emails downloaded.';
       setTimeout(() => {
          allEmailsStatusMessage.textContent = `Total stored emails: ${allStoredEmails.length}`;
        }, 2000);
    } else {
      allEmailsStatusMessage.textContent = 'No emails to download.';
    }
  });


  // Export All Emails Button (All Emails Tab)
  exportAllEmailsButton.addEventListener('click', () => {
    if (allStoredEmails.length > 0) {
      // Create CSV content with header
      const csvContent = "Email\n" + allStoredEmails.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'all_collected_emails.csv'; // CSV filename
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      allEmailsStatusMessage.textContent = 'All emails exported to CSV.';
       setTimeout(() => {
          allEmailsStatusMessage.textContent = `Total stored emails: ${allStoredEmails.length}`;
        }, 2000);
    } else {
      allEmailsStatusMessage.textContent = 'No emails to export.';
    }
  });

  // Export @gmail.com Emails Button (All Emails Tab)
  exportGmailButton.addEventListener('click', () => {
    const gmailEmails = allStoredEmails.filter(email => email.endsWith('@gmail.com'));
    if (gmailEmails.length > 0) {
      const csvContent = "Email\n" + gmailEmails.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gmail_emails.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      allEmailsStatusMessage.textContent = `Exported ${gmailEmails.length} @gmail.com email(s).`;
       setTimeout(() => {
          allEmailsStatusMessage.textContent = `Total stored emails: ${allStoredEmails.length}`;
        }, 2000);
    } else {
      allEmailsStatusMessage.textContent = 'No @gmail.com emails to export.';
    }
  });

  // Export @yahoo.com Emails Button (All Emails Tab)
  exportYahooButton.addEventListener('click', () => {
    const yahooEmails = allStoredEmails.filter(email => email.endsWith('@yahoo.com'));
    if (yahooEmails.length > 0) {
      const csvContent = "Email\n" + yahooEmails.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'yahoo_emails.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      allEmailsStatusMessage.textContent = `Exported ${yahooEmails.length} @yahoo.com email(s).`;
       setTimeout(() => {
          allEmailsStatusMessage.textContent = `Total stored emails: ${allStoredEmails.length}`;
        }, 2000);
    } else {
      allEmailsStatusMessage.textContent = 'No @yahoo.com emails to export.';
    }
  });

  // Export Other Emails Button (All Emails Tab)
  exportOtherButton.addEventListener('click', () => {
    const otherEmails = allStoredEmails.filter(email => !email.endsWith('@gmail.com') && !email.endsWith('@yahoo.com'));
    if (otherEmails.length > 0) {
      const csvContent = "Email\n" + otherEmails.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'other_emails.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      allEmailsStatusMessage.textContent = `Exported ${otherEmails.length} other email(s).`;
       setTimeout(() => {
          allEmailsStatusMessage.textContent = `Total stored emails: ${allStoredEmails.length}`;
        }, 2000);
    } else {
      allEmailsStatusMessage.textContent = 'No other emails to export.';
    }
  });


  // Initial state: Activate the first tab and trigger initial scan
  // Initial state: Activate the first tab and trigger initial scan
  switchTab('currentEmailsTab');
  // Request initial emails from content script (for current page)
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "getInitialCurrentEmails" });
      }
  });
  // Also fetch all stored emails in the background
  fetchAndDisplayAllEmails();
  // Fetch and display settings on initial load
  fetchAndDisplaySettings();

  // Add event listener for the automatic scan toggle
  automaticScanToggle.addEventListener('change', saveSettings);
});