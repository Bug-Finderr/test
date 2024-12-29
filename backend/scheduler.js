const cron = require("node-cron");
const fetchHandler = require("./fetchHandler");
const db = require("./database");
const { determineNextInterval } = require("./intervalUtils");

let currentTask = null;

/**
 * Schedules the next fetch operation.
 * @param {number} intervalInMinutes - The interval in minutes for the next fetch.
 */
const scheduleFetch = (intervalInMinutes) => {
  // First stop any existing task
  stop();

  // Convert minutes to cron expression
  // Cron format: second minute hour day month weekday
  const cronExpression = `0 */${intervalInMinutes} * * * *`;

  try {
    currentTask = cron.schedule(cronExpression, async () => {
      console.log("Scheduled fetch triggered.");
      await performFetchOperation();
    });

    const nextFetchDate = new Date(Date.now() + intervalInMinutes * 60000);
    console.log(
      `Scheduled next fetch in ${intervalInMinutes} minutes.\nNext fetch at: ${nextFetchDate.toISOString()}\n`
    );
  } catch (error) {
    console.error("Error scheduling fetch:", error);
    currentTask = null;
  }
};

/**
 * Stops the current scheduled fetch operation.
 */
const stop = () => {
  if (currentTask) {
    currentTask.stop();
    currentTask = null;
    console.log("Existing scheduled task stopped.");
  }
};

/**
 * Performs the fetch operation and updates the status.
 */
const performFetchOperation = async () => {
  try {
    const config = await db.getConfig();
    if (!config) {
      console.warn("No configuration found. Skipping fetch.");
      return;
    }

    const { fetchSnippet, slackWebhook, thresholds, defaultDuration } = config;
    const creditBalance = await fetchHandler.performFetch(
      fetchSnippet,
      slackWebhook
    );

    if (creditBalance !== null && !isNaN(creditBalance)) {
      await fetchHandler.handleBalance({
        creditBalance,
        slackWebhook,
        thresholds,
        manual: false,
      });

      // Determine the next interval based on the current balance
      const nextInterval = determineNextInterval(
        creditBalance,
        thresholds,
        defaultDuration
      );

      const nextFetchAtDate = new Date(Date.now() + nextInterval * 60000);
      const nextFetchAt = nextFetchAtDate.toLocaleString();

      // Update status in database
      await db.updateStatus({
        remainingBalance: creditBalance,
        lastFetch: Date.now(),
        nextFetchCountdown: nextInterval,
        nextFetchAt: nextFetchAt,
      });

      // Schedule the next fetch
      scheduleFetch(nextInterval);
    } else {
      // If fetch failed, performFetch already handled Slack notification
      console.warn("Failed to fetch credit balance.");
    }
  } catch (error) {
    console.error("Error during fetch operation:", error);
    // Optionally, send a Slack notification or handle the error as needed
  }
};

/**
 * Initializes the scheduler based on the current configuration.
 * @param {object} config - The current configuration object.
 */
const init = () => {
  stop();
  // Perform an initial fetch
  performFetchOperation();
};

module.exports = {
  init,
  scheduleFetch,
  stop,
};
