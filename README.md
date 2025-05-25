# Email Extractor Chrome Extension

A Chrome extension that extracts email addresses from the current web page and stores them.

## Features

*   Extracts email addresses from the current tab.
*   Collects emails from all accessible iframes on the page.
*   Stores collected emails persistently using Chrome's local storage.
*   Displays emails found on the current page in the popup.
*   Displays all collected emails in a separate tab in the popup.
*   Allows copying, downloading (as .txt), and exporting (as .csv) of collected emails.
*   **Automatic Scanning:** Automatically scans the active tab for emails every 10 seconds (can be toggled on/off in settings).
*   **Manual Scan Hotkey:** Trigger a scan manually using a configurable hotkey (default: Ctrl+Shift+S).
*   Basic email validation to filter out common non-email patterns.

## Installation

1.  Download or clone the repository to your local machine.
2.  Open Google Chrome and go to `chrome://extensions/`.
3.  Enable "Developer mode" by toggling the switch in the top right corner.
4.  Click the "Load unpacked" button in the top left corner.
5.  Select the `email-extractor-extension` folder from your local machine.
6.  The extension should now be installed and visible in your Chrome extensions list and toolbar.

## Usage

1.  Navigate to any web page.
2.  Click the Email Extractor extension icon in your Chrome toolbar.
3.  The popup will show the emails found on the current page.
4.  Use the tabs to view "Current Emails" or "All Collected Emails".
5.  In the "Settings" tab, you can enable/disable automatic scanning.
6.  Use the configured hotkey (default: Ctrl+Shift+S) to trigger a manual scan of the current page.
7.  Use the buttons in the popup to copy, download, or export the email lists.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT, Apache 2.0
