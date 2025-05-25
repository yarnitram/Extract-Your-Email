// sw.js (Service Worker)

// Global variables for settings and automatic scanning
let collectFromAllTabs = true; // Default value
let automaticScanEnabled = false; // Default value
const automaticScanInterval = 10 * 1000; // 10 seconds in milliseconds
let automaticScanTimerId = null;

// Function to load settings from storage
async function loadSettings() {
  try {
    const settings = await chrome.storage.local.get(['collectFromAllTabs', 'automaticScanEnabled']);
    collectFromAllTabs = settings.collectFromAllTabs ?? true; // Default to true if not set
    automaticScanEnabled = settings.automaticScanEnabled ?? false; // Default to false if not set
    console.log("Email Extractor Service Worker: Loaded settings:", { collectFromAllTabs, automaticScanEnabled });
    // Start or stop automatic scan based on loaded setting
    if (automaticScanEnabled) {
      startAutomaticScan();
    } else {
      stopAutomaticScan();
    }
  } catch (error) {
    console.error("Email Extractor Service Worker: Error loading settings:", error);
  }
}

// Function to save settings to storage
async function saveSetting(settingName, value) {
  try {
    await chrome.storage.local.set({ [settingName]: value });
    console.log(`Email Extractor Service Worker: Setting '${settingName}' saved:`, value);
    // Update the global variable and take action if needed
    if (settingName === 'collectFromAllTabs') {
      collectFromAllTabs = value;
      // Re-inject content script into all tabs if the setting is now true
      if (collectFromAllTabs) {
        injectContentScriptIntoAllTabs();
      }
    } else if (settingName === 'automaticScanEnabled') {
      automaticScanEnabled = value;
      if (automaticScanEnabled) {
        startAutomaticScan();
      } else {
        stopAutomaticScan();
      }
    }
  } catch (error) {
    console.error(`Email Extractor Service Worker: Error saving setting '${settingName}':`, error);
  }
}

// Function to inject content script into a specific tab
async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });
    console.log(`Email Extractor Service Worker: Injected content.js into tab ${tabId}`);
  } catch (error) {
    console.error(`Email Extractor Service Worker: Failed to inject content.js into tab ${tabId}:`, error);
  }
}

// Function to inject content script into all currently open tabs
async function injectContentScriptIntoAllTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      // Avoid injecting into special Chrome pages or pages where scripting is not allowed
      if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
         // Check if content script is already injected to avoid duplicates
         // This is a basic check, a more robust solution might involve messaging the content script
         // For simplicity, we'll just inject, relying on content script's internal logic to handle re-injection.
         // A better approach would be to check if the content script is already running and message it.
         // However, for this task, simple injection is sufficient.
         injectContentScript(tab.id);
      }
    }
    console.log("Email Extractor Service Worker: Attempted to inject content.js into all tabs.");
  } catch (error) {
    console.error("Email Extractor Service Worker: Error querying tabs for injection:", error);
  }
}


// Listen for the extension being installed or updated
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Initialize storage on first install
    await chrome.storage.local.set({ allEmailsList: [], collectFromAllTabs: true, automaticScanEnabled: false }); // Initialize settings with defaults
    console.log("Email Extractor Service Worker: Initialized storage and settings.");
  }
  // Load settings on install or update
  await loadSettings();
  // Inject content script into existing tabs based on the setting
  if (collectFromAllTabs) {
      injectContentScriptIntoAllTabs();
  }
  // Update the badge on install/update
  updateBadge();
});

// Function to start automatic scanning
function startAutomaticScan() {
  if (automaticScanTimerId === null) {
    console.log("Email Extractor Service Worker: Starting automatic scan timer.");
    automaticScanTimerId = setInterval(async () => {
      console.log("Email Extractor Service Worker: Performing automatic scan.");
      // Query for the active tab and send a message to the content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "scanEmails" }); // Use a generic scan action
        }
      });
    }, automaticScanInterval);
  }
}

// Function to stop automatic scanning
function stopAutomaticScan() {
  if (automaticScanTimerId !== null) {
    console.log("Email Extractor Service Worker: Stopping automatic scan timer.");
    clearInterval(automaticScanTimerId);
    automaticScanTimerId = null;
  }
}


// Listen for messages from content scripts or the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle messages related to email data or actions
  switch (request.action) {
    case 'addEmails':
      addEmailsToStorage(request.emails);
      break;
    case 'getStoredEmails':
      getStoredEmails(sendResponse);
      return true; // Indicates that sendResponse will be called asynchronously
    case 'clearAllEmails':
      clearAllEmails();
      break;
    case 'settingChanged':
        // Handle setting changes from the popup
        if (request.setting === 'collectFromAllTabs') {
            saveSetting('collectFromAllTabs', request.value);
        } else if (request.setting === 'automaticScanEnabled') {
            saveSetting('automaticScanEnabled', request.value);
        }
        break;
    // Add other message handlers as needed
  }
});

// Listen for tab updates to inject content script if needed
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only inject if the tab has finished loading and the setting is true
  if (changeInfo.status === 'complete' && collectFromAllTabs) {
     // Avoid injecting into special Chrome pages or pages where scripting is not allowed
     if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
        injectContentScript(tabId);
     }
  }
});

// Listen for tab activation to inject content script if needed (useful if setting is changed while tabs are open)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    // Only inject if the setting is true
    if (collectFromAllTabs) {
        const tab = await chrome.tabs.get(activeInfo.tabId);
         // Avoid injecting into special Chrome pages or pages where scripting is not allowed
        if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
            injectContentScript(activeInfo.tabId);
        }
    }
});

// Load settings when the service worker starts
loadSettings();

// Listen for commands (hotkeys)
chrome.commands.onCommand.addListener((command) => {
  if (command === "manual_scan") {
    console.log("Email Extractor Service Worker: Manual scan command received.");
    // Query for the active tab and send a message to the content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "scanEmails" }); // Use the same generic scan action
      }
    });
  }
});

/**
 * Adds a list of emails to persistent storage, ensuring uniqueness.
 * @param {string[]} emails - Array of email strings to add.
 */
async function addEmailsToStorage(emails) {
  try {
    const result = await chrome.storage.local.get('allEmailsList');
    const storedEmails = new Set(result.allEmailsList || []);
    let emailsAddedCount = 0;

    emails.forEach(email => {
      if (!storedEmails.has(email)) {
        storedEmails.add(email);
        emailsAddedCount++;
      }
    });

    if (emailsAddedCount > 0) {
      await chrome.storage.local.set({ allEmailsList: Array.from(storedEmails) });
      console.log(`Email Extractor Service Worker: Added ${emailsAddedCount} new email(s) to storage.`);
      // Update the badge text
      updateBadge();
      // Optionally, send a message back to the popup to update the display
      chrome.runtime.sendMessage({ action: 'storedEmailsUpdated', emails: Array.from(storedEmails) });
    }
  } catch (error) {
    console.error("Email Extractor Service Worker: Error adding emails to storage:", error);
  }
}

/**
 * Retrieves all stored emails from persistent storage.
 * @param {function} sendResponse - Function to send the response back.
 */
async function getStoredEmails(sendResponse) {
  try {
    const result = await chrome.storage.local.get('allEmailsList');
    const storedEmails = result.allEmailsList || [];
    sendResponse({ emails: storedEmails });
  } catch (error) {
    console.error("Email Extractor Service Worker: Error retrieving emails from storage:", error);
    sendResponse({ emails: [], error: "Failed to retrieve emails." });
  }
}

/**
 * Clears all stored emails from persistent storage.
 */
async function clearAllEmails() {
  try {
    await chrome.storage.local.set({ allEmailsList: [] });
    console.log("Email Extractor Service Worker: All emails cleared from storage.");
    // Update the badge text
    updateBadge();
    // Optionally, send a message back to the popup to update the display
    chrome.runtime.sendMessage({ action: 'storedEmailsUpdated', emails: [] });
  } catch (error) {
    console.error("Email Extractor Service Worker: Error clearing emails from storage:", error);
  }
}

/**
 * Updates the browser action badge with the current number of stored emails.
 * @param {number} [count] - Optional count to set the badge to. If not provided, it fetches from storage.
 */
async function updateBadge(count) {
  try {
    const emailCount = count !== undefined ? count : (await chrome.storage.local.get('allEmailsList')).allEmailsList?.length || 0;
    const badgeText = emailCount > 0 ? emailCount.toString() : ''; // Display count if > 0, otherwise empty
    await chrome.action.setBadgeText({ text: badgeText });
    await chrome.action.setBadgeBackgroundColor({ color: '#007bff' }); // Optional: Set a background color
    console.log(`Email Extractor Service Worker: Badge updated with count: ${emailCount}`);
  } catch (error) {
    console.error("Email Extractor Service Worker: Error updating badge:", error);
  }
}

// Listen for storage changes to update the badge (as a fallback/sync mechanism)
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.allEmailsList) {
    updateBadge();
  }
});

// Update the badge when the service worker starts
updateBadge();