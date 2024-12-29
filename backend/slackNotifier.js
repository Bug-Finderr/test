const axios = require("axios");

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
  sendToSlack,
};
