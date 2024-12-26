const vm = require("vm");
const slackNotifier = require("./slackNotifier");

const executeFetch = async (fetchSnippet) => {
  // Remove trailing semicolon
  const sanitizedSnippet = fetchSnippet.trim().replace(/;$/, "");

  return new Promise((resolve, reject) => {
    const sandbox = {
      fetch: global.fetch, // Use the global fetch
      console,
      resolve,
      reject,
    };

    const scriptContent = `
      (async () => {
        try {
          ${sanitizedSnippet}
            .then(response => response.json())
            .then(data => {
              resolve(data.amount / 100); // Assuming amount is in cents
            })
            .catch(error => {
              console.error(error);
              resolve(null);
            });
        } catch (error) {
          console.error(error);
          resolve(null);
        }
      })();
    `;

    try {
      const script = new vm.Script(scriptContent);
      const context = vm.createContext(sandbox);
      script.runInContext(context);
    } catch (error) {
      console.error("Error executing fetch snippet:", error);
      resolve(null);
    }
  });
};

// Function to handle balance and send messages
const handleBalance = async ({
  creditBalance,
  slackWebhook,
  thresholds,
  manual = false,
}) => {
  if (creditBalance === null || isNaN(creditBalance)) {
    await slackNotifier.sendToSlack(
      slackWebhook,
      `:warning: *Anthropic Credit Monitor Error*\n\n` +
        `Failed to fetch or parse credit balance.\n` +
        `• Time: \`${new Date().toLocaleString()}\`\n` +
        `• Please check your configuration.`
    );
    return;
  }

  console.log(`Fetched Credit Balance: ${creditBalance}`);

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
};

module.exports = {
  executeFetch,
  handleBalance,
};
