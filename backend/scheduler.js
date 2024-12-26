const cron = require("node-cron");
const fetchHandler = require("./fetchHandler");
const slackNotifier = require("./slackNotifier");
const db = require("./database");
const { determineNextInterval } = require("./intervalUtils");

let currentTask = null;

const scheduleFetch = (intervalInMinutes) => {
  if (currentTask) {
    currentTask.stop();
  }

  // Convert minutes to cron expression
  // Cron expressions in node-cron have the format: second minute hour day month weekday
  // To schedule every 'intervalInMinutes' minutes, use '0 */intervalInMinutes * * * *'
  const cronExpression = `0 */${intervalInMinutes} * * * *`;

  currentTask = cron.schedule(cronExpression, async () => {
    console.log("Scheduled fetch triggered.");
    await performFetch();
  });

  currentTask.start();
  console.log(
    `Scheduled next fetch in ${intervalInMinutes} minutes.\nNext fetch at: ${new Date(
      Date.now() + intervalInMinutes * 60000
    ).toLocaleString()}`
  );
};

const performFetch = async () => {
  try {
    const config = await db.getConfig();
    if (!config) {
      console.warn("No configuration found. Skipping fetch.");
      return;
    }

    const { fetchSnippet, slackWebhook, thresholds, defaultDuration } = config;
    const creditBalance = await fetchHandler.executeFetch(fetchSnippet);

    if (creditBalance === null || isNaN(creditBalance)) {
      await slackNotifier.sendToSlack(
        slackWebhook,
        `:warning: *Anthropic Credit Monitor Error*\n\n` +
          `Failed to fetch or parse credit balance.\n` +
          `• Time: \`${new Date().toLocaleString()}\`\n` +
          `• Please check your configuration.`
      );
      // Schedule next fetch with default interval
      scheduleFetch(defaultDuration);
      return;
    }

    console.log(`Fetched Credit Balance: ${creditBalance}`);

    // Determine next interval
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

    // Send alert if below any threshold
    for (const threshold of thresholds) {
      if (creditBalance <= threshold.limit) {
        await slackNotifier.sendToSlack(
          slackWebhook,
          `:alert: *Anthropic Credit Alert*\n\n` +
            `Your API credit balance has fallen below the threshold.\n\n` +
            `• Current Balance: \`$${creditBalance.toFixed(2)}\`\n` +
            `• Threshold Limit: \`$${threshold.limit.toFixed(2)}\`\n` +
            `• Time: \`${new Date().toLocaleString()}\`\n\n` +
            `_Please consider topping up your credits to avoid service interruptions._`
        );
        break; // Alert once for the first matched threshold
      }
    }

    // Reschedule based on current balance
    scheduleFetch(nextInterval);
  } catch (error) {
    console.error("Error during fetch operation:", error);
  }
};

const init = ({ fetchSnippet, slackWebhook, thresholds, defaultDuration }) => {
  // Initial fetch
  performFetch();
};

module.exports = {
  init,
  scheduleFetch,
};
