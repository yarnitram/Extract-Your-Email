// content.js

// Set to store unique emails found
// Refined regex for email extraction
const emailRegex = /(?:^|\s)([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?:$|\s)/g;

// List of words to exclude from the local part of emails
const excludedWords = [
    "example", "test", "info", "noreply", "no-reply", "support",
    "contact", "webmaster", "postmaster", "abuse", "sales", "marketing"
];

// List of file extensions to exclude from email validation
const fileExtensions = [
    'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg',
    'ico', 'tiff', 'pdf', 'doc', 'docx', 'xls', 'xlsx',
    'zip', 'rar', '7z', 'tar', 'gz', 'mp3', 'mp4', 'avi',
    'mov', 'wmv', 'css', 'js', 'json', 'xml', 'txt'
];

/**
 * Enhanced email validation function.
 * @param {string} email - The email string to validate.
 * @returns {boolean} - True if the email is considered valid, false otherwise.
 */
function isValidEmail(email) {
    // Basic format check
    if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        return false;
    }

    // Get local part and domain
    const [localPart, domain] = email.toLowerCase().split('@');

    // Check for file extensions in local part or domain
    if (fileExtensions.some(ext =>
        domain.endsWith(`.${ext}`) ||
        localPart.endsWith(`.${ext}`)
    )) {
        return false;
    }

    // Additional checks for suspicious patterns or lengths
    if (
        // Too long parts
        localPart.length > 64 ||
        domain.length > 255 ||

        // Invalid characters at start or end of local part
        localPart.startsWith('.') ||
        localPart.endsWith('.') ||

        // Multiple dots
        localPart.includes('..') ||
        domain.includes('..') ||

        // Too many digits in local part (potential spam/temp address)
        (localPart.match(/\d/g) || []).length > 8 ||

        // Suspicious patterns
        localPart.includes('temp') ||
        localPart.includes('spam') ||

        // Check for hex-strings (often in filenames)
        /^[a-f0-9]{8,}$/i.test(localPart)
    ) {
        return false;
    }

    // Check against excluded words
    if (excludedWords.includes(localPart)) {
        return false;
    }

    return true;
}


/**
 * Scans a given document (main document or iframe) for email addresses.
 * @param {Document} doc - The document object to scan.
 */
function scanDocument(doc) {
  try {
    if (doc && doc.body) {
      const textContent = doc.body.innerText; // Use innerText instead of textContent
      if (textContent) {
        let match;
        const foundEmails = []; // Collect emails found in this scan
        // Use exec in a loop to get all matches with capturing groups
        while ((match = emailRegex.exec(textContent)) !== null) {
          // match[1] is the content of the first capturing group (the email address)
          const email = match[1];
          if (email && isValidEmail(email)) { // Validate the extracted email
             foundEmails.push(email); // Add valid email to the list
          }
        }
        // Return the emails found in this specific document scan
        return foundEmails;
      }
      return []; // Return empty array if no text content
    }
    return []; // Return empty array if doc or doc.body is null
  } catch (error) {
    console.error("Email Extractor: Error scanning document:", error);
    return []; // Return empty array on error
  }
}

/**
 * Performs a full scan of the main document and all accessible iframes.
 * Sends the results to the popup.
 */
/**
 * Performs a full scan of the main document and all accessible iframes.
 * Sends the results to the service worker and the popup (for current page display).
 */
function performScan() {
  try {
    let currentScanEmails = [];

    // Scan the main document
    currentScanEmails = currentScanEmails.concat(scanDocument(document));

    // Scan iframes
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      try {
        const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
        if (iframeDocument) {
          currentScanEmails = currentScanEmails.concat(scanDocument(iframeDocument));
        }
      } catch (securityError) {
        // Catch SecurityError for cross-origin iframes
        console.warn("Email Extractor: Cannot access iframe content due to same-origin policy.", securityError);
      }
    });

    // Remove duplicates from the current scan results before sending
    const uniqueCurrentScanEmails = Array.from(new Set(currentScanEmails));

    // Send found emails to the service worker for persistent storage
    if (uniqueCurrentScanEmails.length > 0) {
        chrome.runtime.sendMessage({ action: 'addEmails', emails: uniqueCurrentScanEmails });
    }

    // Send the unique emails found in this scan to the popup for current page display
    chrome.runtime.sendMessage({
      action: "currentEmailsFound",
      emails: uniqueCurrentScanEmails
    });

  } catch (error) {
    console.error("Email Extractor: Error during scan:", error);
    // Send error status to popup if needed
    chrome.runtime.sendMessage({
      status: "error",
      errorMessage: "An error occurred during scanning."
    });
  }
}

// --- Message Listener ---
// Listen for messages from the service worker or the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scanEmails" || request.action === "getInitialCurrentEmails") {
    // Perform a scan when requested by the service worker (scanEmails)
    // or by the popup (getInitialCurrentEmails)
    performScan();
  } else if (request.action === "clear") {
    // Send clear action to service worker
    chrome.runtime.sendMessage({ action: "clearAllEmails" });
    // Popup will be updated by service worker's storedEmailsUpdated message
  }
  // Add other message handlers as needed
});

// Note: Automatic scanning via MutationObserver and setInterval has been removed.
// Scanning is now triggered by the service worker based on settings and tab events,
// or manually by the user via the popup.