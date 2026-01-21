
// This is the endpoint for the Google Apps Script that logs data to your Google Sheet.
// STEP 1: Paste the "Web App URL" you copied from Google Apps Script below.
// It should look like: 'https://script.google.com/macros/s/LONG_STRING_OF_CHARACTERS/exec'
export const GOOGLE_SHEET_LOGGER_URL = 'https://script.google.com/macros/s/AKfycbx3R86adXQtiEz3e5u_7UbnqlRjAUOxiqQxENAua80hHIW5hbA8HbG3RfiufPX_4aModg/exec';

/**
 * Logs a conversation turn or event to a Google Sheet via a deployed Google Apps Script.
 */
export const logToGoogleSheet = async (
    type: string,
    userInput: string,
    aiResponse: string
): Promise<void> => {
    // Safety check to remind you to paste the URL
    if (!GOOGLE_SHEET_LOGGER_URL || GOOGLE_SHEET_LOGGER_URL.includes('PASTE_YOUR')) {
        console.error("Please paste your Google Apps Script URL in utils/logger.ts");
        return;
    }

    const payload = {
        type,
        userInput,
        aiResponse,
    };

    try {
        await fetch(GOOGLE_SHEET_LOGGER_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(payload),
        });
    } catch (error) {
        console.error('[Logger] Network error:', error);
    }
};

/**
 * Specifically log a presence heart event.
 */
export const logHeart = async (sender: string, count: number): Promise<void> => {
    await logToGoogleSheet('Heart Sent', `Count: ${count}`, `Sender: ${sender}`);
};

/**
 * Fetch logs to calculate daily counts.
 */
export const fetchLogs = async () => {
  if (!GOOGLE_SHEET_LOGGER_URL || GOOGLE_SHEET_LOGGER_URL.includes('PASTE_YOUR')) {
      return [];
  }
  try {
    const res = await fetch(GOOGLE_SHEET_LOGGER_URL);
    const result = await res.json();
    return result.status === 'success' ? result.data : [];
  } catch (e) {
    return [];
  }
};
