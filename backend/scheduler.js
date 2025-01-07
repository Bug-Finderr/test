const fetchHandler = require("./fetchHandler");
const db = require("./database");
const { determineNextInterval, formatTimestamp } = require("./utils");

let scheduledTask = null;

/**
 * Schedules the next fetch operation.
 * @param {number} intervalInMinutes - The interval in minutes for the next fetch.
 */
const scheduleFetch = (intervalInMinutes) => {
  // Convert minutes to milliseconds
  const intervalMs = intervalInMinutes * 60 * 1000;

  try {
    // Schedule next fetch using setTimeout
    scheduledTask = setTimeout(async () => {
      console.log("Scheduled fetch triggered.");
      await performFetchOperation();
    }, intervalMs);

    console.log(
      `Next automated fetch scheduled in ${intervalInMinutes} minutes.\nNext fetch at: ${formatTimestamp(
        Date.now() + intervalMs
      )}\n`
    );
  } catch (error) {
    console.error("Error scheduling fetch:", error);
    scheduledTask = null;
  }
};

/**
 * Clears any existing scheduled tasks.
 */
const clearScheduledTask = () => {
  if (scheduledTask) {
    clearTimeout(scheduledTask);
    scheduledTask = null;
    console.log("Existing scheduled task cleared.");
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
      });

      // Determine the next interval based on the current balance
      const nextInterval = determineNextInterval(
        creditBalance,
        thresholds,
        defaultDuration
      );

      // Update status in database
      await db.updateStatus({
        remainingBalance: creditBalance,
        lastFetch: Date.now(),
        nextFetchCountdown: nextInterval,
        nextFetchAt: formatTimestamp(Date.now() + nextInterval * 60000),
      });

      // Schedule the next automated fetch
      scheduleFetch(nextInterval);
    } else {
      console.warn("Failed to fetch credit balance.");
    }
  } catch (error) {
    console.error("Error during fetch operation:", error);
  }
};

/**
 * Triggers a manual fetch operation.
 */
const manualFetch = async () => {
  console.log("Manual fetch triggered.");
  clearScheduledTask();
  await performFetchOperation();
};

/**
 * Initializes the scheduler based on the current configuration.
 */
const init = async () => {
  console.log("Initializing scheduler...");
  clearScheduledTask();
  await performFetchOperation();
};

module.exports = {
  init,
  scheduleFetch,
  manualFetch,
};
