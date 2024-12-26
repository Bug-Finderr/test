const axios = require("axios");

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
