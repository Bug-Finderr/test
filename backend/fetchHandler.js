const puppeteerManager = require("./puppeteerManager");
const { sendToSlack, formatTimestamp } = require("./utils");

/**
 * Performs the fetch operation with retries and sends Slack notifications upon multiple failures.
 * @param {string} fetchSnippet - The fetch snippet to execute.
 * @param {string} slackWebhook - The Slack webhook URL for notifications.
 * @param {number} maxRetries - Maximum number of retry attempts.
 * @param {number} retryDelay - Delay between retries in milliseconds.
 * @returns {number|null} The fetched credit balance or null on failure.
 */
const performFetch = async (
  fetchSnippet,
  slackWebhook,
  maxRetries = 3,
  retryDelay = 5000
) => {
  let attempts = 0;
  let balance = null;

  // Initialize Puppeteer if not already initialized
  if (!puppeteerManager.browser) {
    await puppeteerManager.initialize();
    await puppeteerManager.setupSession(fetchSnippet);
  }

  while (attempts < maxRetries) {
    try {
      console.log(`Fetch attempt ${attempts + 1} of ${maxRetries}`);
      balance = await puppeteerManager.fetchBalance(fetchSnippet);

      if (balance !== null && !isNaN(balance)) {
        console.log(`Successfully fetched credit balance: $${balance}`);
        return balance;
      } else {
        // If fetch fails, reinitialize the session
        await puppeteerManager.cleanup();
        await puppeteerManager.initialize();
        await puppeteerManager.setupSession(fetchSnippet);
        throw new Error("Invalid balance fetched.");
      }
    } catch (error) {
      console.error(`Fetch attempt ${++attempts} failed:`, error);
      if (attempts < maxRetries) {
        console.log(`Retrying in ${retryDelay / 1000} seconds...\n`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  // After maxRetries failed, send Slack notification
  await sendToSlack(
    slackWebhook,
    `:warning: *Anthropic Credit Monitor Error*\n\n` +
      `Failed to fetch or parse credit balance after ${maxRetries} attempts.\n` +
      `• Time: \`${formatTimestamp(Date.now())}\`\n` +
      `• Please check your configuration or network connectivity.`
  );

  return null;
};

/**
 * Handles the fetched credit balance by sending alerts if thresholds are met.
 * @param {object} params - Parameters for handling balance.
 * @param {number|null} params.creditBalance - The fetched credit balance.
 * @param {string} params.slackWebhook - The Slack webhook URL.
 * @param {Array} params.thresholds - Array of threshold objects.
 */
const handleBalance = async ({ creditBalance, slackWebhook, thresholds }) => {
  if (creditBalance === null || isNaN(creditBalance)) {
    await sendToSlack(
      slackWebhook,
      `:warning: *Anthropic Credit Monitor Error*\n\n` +
        `Failed to fetch or parse credit balance.\n` +
        `Raw response: ${creditBalance}\n` +
        `• Time: \`${formatTimestamp(Date.now())}\`\n` +
        `• Please check your configuration.`
    );
    return;
  }

  // Send alert if below any threshold
  for (const threshold of thresholds) {
    if (creditBalance <= threshold.limit) {
      await sendToSlack(
        slackWebhook,
        `:alert: *Anthropic Credit Alert*\n\n` +
          `Your API credit balance has fallen below the threshold.\n\n` +
          `• Current Balance: \`$${creditBalance.toFixed(2)}\`\n` +
          `• Threshold Limit: \`$${threshold.limit.toFixed(2)}\`\n` +
          `• Time: <!date^${Math.floor(
            Date.now() / 1000
          )}^{date_short_pretty} at {time}|${new Date().toISOString()}>\n\n` +
          `_Please consider topping up your credits to avoid service interruptions._`
      );
      break; // Alert once for the first matched threshold
    }
  }
};

module.exports = {
  performFetch,
  handleBalance,
};
