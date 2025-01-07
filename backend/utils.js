const axios = require("axios");

/**
 * Formats a timestamp to an ISO string.
 * @param {number} timestamp - The timestamp in milliseconds.
 * @returns {string} Formatted date string.
 */
const formatTimestamp = (timestamp) => {
  return new Date(timestamp).toISOString();
};

/**
 * Determines the next interval based on thresholds.
 * @param {number} balance - The current credit balance.
 * @param {Array} thresholds - Array of threshold objects.
 * @param {number} defaultDuration - The default fetch interval in minutes.
 * @returns {number} The next fetch interval in minutes.
 */
const determineNextInterval = (balance, thresholds, defaultDuration) => {
  for (const threshold of thresholds) {
    if (balance <= threshold.limit) {
      return threshold.interval;
    }
  }
  return defaultDuration;
};

/**
 * Sends a message to a specified Slack webhook URL.
 * @param {string} webhookUrl - The Slack Incoming Webhook URL.
 * @param {string} message - The message to send.
 */
const sendToSlack = async (webhookUrl, message) => {
  try {
    await axios.post(webhookUrl, { text: message });
    console.log("Message sent to Slack successfully.");
  } catch (error) {
    console.error("Error sending message to Slack:", error);
  }
};

module.exports = {
  formatTimestamp,
  determineNextInterval,
  sendToSlack,
};
